# Production deployment checklist — website → GoHighLevel lead handoff

Branch `feature/ghl-lead-handoff`. Vercel project `open-limits-design` (team openlimits) → `open-limits-design.vercel.app`.
`openlimitsdesign.com` is a separate WordPress site; DNS is **not** part of this release.
Status as of 2026-11-22. **Deployed**: production = `open-limits-design-n52kq7ndi` (branch @ 580a855) via CLI from a clean `git archive`; not pushed. Full record: Growth repo `docs/PRODUCTION_ACTIVATION_REPORT.md`.

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

## B. Deploy (done 2026-11-22)

1. [x] Owner authorised the deploy.
2. [ ] Owner signs in to `/admin` once to confirm (not testable without the owner's password).
3. [x] Smoke test on the deployment: TEST enquiry (twice → 1 row, UTMs incl. term), TEST booking, consent rejection 400, slot clash 409, `/privacy` 200. TEST rows deleted.
4. [x] `/api/crm/handoff`, `/api/admin/leads`, `/api/admin/health` return 401 without auth.
5. [x] CMS writes restricted to admins (`cms_admin_write_access.sql`, applied after a fresh verified backup).
6. [ ] **Merge `feature/ghl-lead-handoff` into `main` before anyone pushes to `main`** (the Vercel git integration deploys `main`).

## C. Required before `GHL_HANDOFF_ENABLED=true`

1. [ ] **GHL Private Integration token** created in the GHL UI (scopes: contacts read/write, opportunities read/write, locations/customFields read). Store it only as Vercel sensitive env `GHL_PRIVATE_INTEGRATION_TOKEN`. Never in chat, git or docs.
2. [ ] **Read-only token for Growth** (contacts/opportunities read) and the Growth read-only sync against an isolated test DB.
3. [ ] **GHL UI settings:** location timezone Asia/Qatar, currency QAR, lost reasons. Calendar is **active** (2026-11-22); staff assignment needs a calendar-type change in the UI (NEEDS_USER_CONFIRMATION — CALENDAR STAFF).
4. [ ] **Workflows (6)** built in the GHL UI (API returns `WORKFLOW_API_NOT_ENABLED_FOR_LOCATION`); SMS steps stay off.
5. [ ] **Privacy notice** approved by the business (technically reviewed 2026-11-22). Then set `PRIVACY_NOTICE_STATUS = "APPROVED"` in `lib/crm/enquiry.ts` and redeploy — the gate is in code, so the env flag alone cannot enable the handoff.
6. [ ] **Controlled test** with a test identity: new contact, duplicate email (existing contact must not be modified), booking → Consultation Booked, GHL outage → lead stays PENDING and retries.
7. [ ] Then set `GHL_HANDOFF_ENABLED=true` and redeploy.

## D. Still open / honest limits

- **Retention:** `RETENTION_POLICY_PENDING_BUSINESS_APPROVAL`; redaction is a no-op until the business sets a period.
- **Retry:** `after()` immediately post-response plus a once-daily cron (Vercel Hobby limit). A failed handoff can wait up to ~24 h.
- **Concurrency:** outbox claim (`for update skip locked`) is tested only in PGlite; real-Postgres concurrency is **UNVERIFIED**.
- CMS and storage write policies: **fixed** (admins only, 2026-11-22).
- Diagnostics: `GET /api/admin/health` (admin-only) — outbox backlog, review queue, gate state, SMS flag.
- Full-repo `npm run lint` has 18 pre-existing errors in files this branch does not touch.

## E. Rollback

- **Code:** `vercel promote open-limits-design-894gp9lnn-openlimits.vercel.app` (pre-release production) — instant; flags default off.
- **Database:** every migration is additive (new columns, functions, policies). To revert access rules, recreate the old policies from `catalog.json` in the backup (`policies` section). Data restore, if ever needed: `rebuild_validate.mjs` shows the row JSON loads cleanly via `json_populate_recordset`; restore only the affected table after a fresh backup. Never DROP/TRUNCATE without owner approval.
- **Sign-up:** set `enable_signup = true` in the pulled config and `supabase config push` (or Dashboard → Auth → Providers).
