-- ============================================================
-- CRM handoff outbox for website enquiries → GoHighLevel.
-- ADDITIVE. NOT APPLIED. Requires explicit approval and a verified
-- Supabase backup before running against any real project.
--
-- Design: public.leads is the durable outbox. An enquiry is saved here
-- first (one atomic insert); a server-side worker later upserts the GHL
-- contact and creates the opportunity, storing ids after each step, so a
-- GHL outage delays — never loses — an enquiry. Idempotent on
-- idempotency_key (one per form submission, generated in the browser).
-- ============================================================

alter table public.leads
  add column if not exists idempotency_key text,
  add column if not exists locale text,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists tracking_ref text,
  add column if not exists booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists crm_stage text,
  add column if not exists crm_status text not null default 'NOT_QUEUED',
  add column if not exists crm_attempts integer not null default 0,
  add column if not exists crm_next_attempt_at timestamptz,
  add column if not exists crm_lease_until timestamptz,
  add column if not exists crm_last_error_code text,
  add column if not exists crm_synced_at timestamptz,
  add column if not exists ghl_contact_id text,
  add column if not exists ghl_opportunity_id text,
  add column if not exists redacted_at timestamptz;

-- Existing rows stay NOT_QUEUED: they were collected without the new consent
-- wording and are never sent to the CRM automatically.
alter table public.leads drop constraint if exists leads_crm_status_check;
alter table public.leads add constraint leads_crm_status_check
  check (crm_status in ('NOT_QUEUED', 'PENDING', 'SYNCED', 'NEEDS_REVIEW'));
alter table public.leads drop constraint if exists leads_crm_stage_check;
alter table public.leads add constraint leads_crm_stage_check
  check (crm_stage is null or crm_stage in ('NEW_ENQUIRY', 'CONSULTATION_BOOKED'));
alter table public.leads drop constraint if exists leads_crm_consent_check;
alter table public.leads add constraint leads_crm_consent_check
  check (crm_status = 'NOT_QUEUED' or (consent_at is not null and consent_version is not null));
alter table public.leads drop constraint if exists leads_tracking_ref_check;
alter table public.leads add constraint leads_tracking_ref_check
  check (tracking_ref is null or tracking_ref ~ '^[a-f0-9]{32}$');
alter table public.leads drop constraint if exists leads_crm_error_code_check;
alter table public.leads add constraint leads_crm_error_code_check
  check (crm_last_error_code is null or crm_last_error_code ~ '^[A-Z_]{3,40}$');

create unique index if not exists leads_idempotency_key_uidx
  on public.leads(idempotency_key) where idempotency_key is not null;
create index if not exists leads_crm_due_idx
  on public.leads(crm_next_attempt_at) where crm_status = 'PENDING';

-- Atomically lease due rows so concurrent workers (after() + cron) never
-- process the same enquiry at the same time.
create or replace function public.claim_crm_handoff(batch_size integer, lease_seconds integer)
returns setof public.leads
language sql
security definer
set search_path = public
as $$
  update public.leads l
     set crm_lease_until = now() + make_interval(secs => least(greatest(lease_seconds, 30), 900))
   where l.id in (
     select id from public.leads
      where crm_status = 'PENDING'
        and crm_next_attempt_at <= now()
        and (crm_lease_until is null or crm_lease_until < now())
      order by crm_next_attempt_at
      limit least(greatest(batch_size, 1), 50)
      for update skip locked)
  returning l.*;
$$;
revoke all on function public.claim_crm_handoff(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_crm_handoff(integer, integer) to service_role;

-- Retention, redaction and access control live in crm_lead_access_controls.sql
-- (apply it next). Nothing here deletes or redacts data.
