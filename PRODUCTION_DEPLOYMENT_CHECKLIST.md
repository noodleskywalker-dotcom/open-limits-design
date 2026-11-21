# Production deployment checklist — website → GoHighLevel lead handoff

Branch `feature/ghl-lead-handoff`. Vercel project `open-limits-design` (team openlimits) → `open-limits-design.vercel.app`.
`openlimitsdesign.com` is a separate WordPress site; DNS is **not** part of this release.
Status as of 2026-11-21. Nothing here has been deployed.

## A. Done and verified

| Item | Evidence |
|---|---|
| Production DB identified: Supabase `lwwfoqsutxwzgirsarig` | Live bundle anon key == project anon key (hash compare) |
| Backup before any change | `~/open-limits-supabase-backups/lwwfoqsutxwzgirsarig-20261121-183813`, MANIFEST SHA256 `f50d46bb…9028`, rebuilt with 0 failures / 0 row mismatches |
| Migrations applied (one transaction) | `crm_leads_schema_alignment.sql`, `crm_handoff_outbox.sql`, `crm_lead_access_controls.sql`, then `crm_leads_utm_term.sql` |
| Rehearsal on the production schema | `tests/crm/production-shape.test.ts` (applied twice, idempotent) |
| Access control on production | Rolled-back probe: anon + ordinary user denied 26/26 write/admin checks, 0 rows visible; owner reads bookings only; audit rows written and append-only |
| Data preserved | 7 leads, 10 bookings (statuses identical to backup), 270 rows overall |
| Public sign-up disabled | `config push` (1-field diff); sign-up attempt → `422 signup_disabled` |
| Env flags (production) | `GHL_HANDOFF_ENABLED=false`, `BOOKING_SMS_ENABLED=false`, GHL ids, `CRON_SECRET` (sensitive) |
| Tests | `npm run test:crm` 41/41, `tsc`, eslint on all branch files, `npm run build` |

## B. Required before deploying the Next.js branch

1. [ ] Owner authorises the deploy (merge to `main` or a promoted preview).
2. [ ] Owner can sign in to `/admin` with the seeded owner account (CRM admin = `admin_users` role `owner`).
3. [ ] Preview deploy smoke test: contact form saves a lead (`crm_status=NOT_QUEUED/PENDING`), booking saves a pending booking, `/privacy` renders.
4. [ ] Confirm `/api/crm/handoff` cron (daily 04:00 UTC) returns 401 without the bearer token.

The deploy is safe with the handoff off: enquiries are saved to Supabase and queued; nothing is sent to GHL.

## C. Required before `GHL_HANDOFF_ENABLED=true`

1. [ ] **GHL Private Integration token** created in the GHL UI (scopes: contacts read/write, opportunities read/write, locations/customFields read). Store it only as Vercel sensitive env `GHL_PRIVATE_INTEGRATION_TOKEN`. Never in chat, git or docs.
2. [ ] **Read-only token for Growth** (contacts/opportunities read) and the Growth read-only sync against an isolated test DB.
3. [ ] **GHL UI settings:** location timezone Asia/Qatar, currency QAR, lost reasons, calendar staff assignment + activation (NEEDS_USER_CONFIRMATION — CALENDAR STAFF).
4. [ ] **Workflows (6)** built in the GHL UI (API returns `WORKFLOW_API_NOT_ENABLED_FOR_LOCATION`); SMS steps stay off.
5. [ ] **Privacy notice** approved by the business (`PRIVACY_NOTICE_STATUS` is `DRAFT_PENDING_APPROVAL`; the handoff gate refuses to enable until approved).
6. [ ] **Controlled test** with a test identity: new contact, duplicate email (existing contact must not be modified), booking → Consultation Booked, GHL outage → lead stays PENDING and retries.
7. [ ] Then set `GHL_HANDOFF_ENABLED=true` and redeploy.

## D. Still open / honest limits

- **Retention:** `RETENTION_POLICY_PENDING_BUSINESS_APPROVAL`; redaction is a no-op until the business sets a period.
- **Retry:** `after()` immediately post-response plus a once-daily cron (Vercel Hobby limit). A failed handoff can wait up to ~24 h.
- **Concurrency:** outbox claim (`for update skip locked`) is tested only in PGlite; real-Postgres concurrency is **UNVERIFIED**.
- **Other legacy policies:** CMS tables (`furniture_*`, `media_assets`, `company_profile`, …) allow *any authenticated user* to write. With sign-up now disabled the only account is the owner, so this is contained, but those policies should be tightened to `admin_users` in a later migration.
- `appointments`, `callback_requests`, `conversations`, `messages` keep "Service insert" policies open to anon (chat/legacy tables, no lead data read access). Review in the same later migration.
- Full-repo `npm run lint` has 18 pre-existing errors in files this branch does not touch.

## E. Rollback

- **Code:** redeploy the previous production deployment in Vercel (instant rollback); flags default off.
- **Database:** every migration is additive (new columns, functions, policies). To revert access rules, recreate the old policies from `catalog.json` in the backup (`policies` section). Data restore, if ever needed: `rebuild_validate.mjs` shows the row JSON loads cleanly via `json_populate_recordset`; restore only the affected table after a fresh backup. Never DROP/TRUNCATE without owner approval.
- **Sign-up:** set `enable_signup = true` in the pulled config and `supabase config push` (or Dashboard → Auth → Providers).
