-- ============================================================
-- Lead/booking access control, audit trail and retention status.
-- ADDITIVE. Apply AFTER crm_handoff_outbox.sql, only with approval and a
-- verified Supabase backup. Does not delete or rewrite existing rows.
--
-- Model:
--   * Website server routes write with the service role (bypasses RLS).
--   * Leads: NO direct table access for anon/authenticated users. Admins
--     read/export/re-queue only through audited functions called by the
--     server after it has verified the admin (lib/auth/admin.ts).
--   * Bookings / blocked times: only approved admins (admin_users, confirmed
--     email, role admin|owner) may read/manage directly; the public creates
--     bookings only through /api/bookings (service role).
--   * Every lead VIEW / EXPORT / STATUS_CHANGE and booking STATUS_CHANGE is
--     recorded in lead_access_audit (actor id, subject id, action, time; no PII).
-- ============================================================

-- ---------- who is an admin ----------
create or replace function public.is_crm_admin(candidate uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from auth.users u
      join public.admin_users a on lower(a.email) = lower(u.email)
     where u.id = candidate
       -- signed-in users may only ask about themselves (no admin-enumeration oracle);
       -- the server (service role) may check any verified session's user id
       and (candidate = auth.uid() or auth.role() = 'service_role')
       and u.email_confirmed_at is not null
       and a.role in ('admin', 'owner'));
$$;
revoke all on function public.is_crm_admin(uuid) from public;
grant execute on function public.is_crm_admin(uuid) to authenticated, service_role;

-- ---------- audit trail (append-only) ----------
create table if not exists public.lead_access_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null,
  subject_type text not null check (subject_type in ('lead', 'booking')),
  subject_id uuid not null,
  action text not null check (action in ('VIEW', 'EXPORT', 'STATUS_CHANGE')),
  detail text check (detail is null or detail ~ '^[A-Za-z_:-]{1,60}$'),
  created_at timestamptz not null default now()
);
create index if not exists lead_access_audit_subject_idx on public.lead_access_audit(subject_type, subject_id, created_at desc);
create index if not exists lead_access_audit_actor_idx on public.lead_access_audit(actor_user_id, created_at desc);
alter table public.lead_access_audit enable row level security;
drop policy if exists "Admins can read the lead access audit" on public.lead_access_audit;
create policy "Admins can read the lead access audit"
on public.lead_access_audit for select to authenticated using (public.is_crm_admin());

create or replace function public.reject_lead_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'lead_access_audit is append-only';
end;
$$;
drop trigger if exists lead_access_audit_append_only on public.lead_access_audit;
create trigger lead_access_audit_append_only
before update or delete on public.lead_access_audit
for each row execute function public.reject_lead_audit_mutation();

-- ---------- leads: no direct client access ----------
drop policy if exists "Anyone can submit a lead" on public.leads;
drop policy if exists "Authenticated users can read leads" on public.leads;
drop policy if exists "Admins can read leads" on public.leads;
revoke insert, update, delete on public.leads from anon, authenticated;
-- RLS stays enabled with no policies for anon/authenticated → deny by default.

-- Audited admin read: one VIEW row per returned lead, in the same transaction.
create or replace function public.admin_read_leads(actor uuid, max_rows integer default 50, created_before timestamptz default null)
returns setof public.leads
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_crm_admin(actor) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  return query
    with page as (
      select * from public.leads
       where created_before is null or created_at < created_before
       order by created_at desc
       limit least(greatest(max_rows, 1), 200)),
    logged as (
      insert into public.lead_access_audit (actor_user_id, subject_type, subject_id, action)
      select actor, 'lead', id, 'VIEW' from page)
    select * from page;
end;
$$;

create or replace function public.admin_export_leads(actor uuid)
returns setof public.leads
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_crm_admin(actor) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  return query
    with rows as (select * from public.leads order by created_at desc limit 5000),
    logged as (
      insert into public.lead_access_audit (actor_user_id, subject_type, subject_id, action)
      select actor, 'lead', id, 'EXPORT' from rows)
    select * from rows;
end;
$$;

-- Manual review → retry. The only lead status change an admin can make.
create or replace function public.admin_requeue_lead(actor uuid, lead uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare changed integer;
begin
  if not public.is_crm_admin(actor) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  update public.leads
     set crm_status = 'PENDING', crm_attempts = 0, crm_next_attempt_at = now(), crm_lease_until = null, crm_last_error_code = null
   where id = lead and crm_status = 'NEEDS_REVIEW' and consent_at is not null;
  get diagnostics changed = row_count;
  if changed = 1 then
    insert into public.lead_access_audit (actor_user_id, subject_type, subject_id, action, detail)
    values (actor, 'lead', lead, 'STATUS_CHANGE', 'NEEDS_REVIEW:PENDING');
  end if;
  return changed = 1;
end;
$$;

-- Booking accept/reject: status change and audit row are atomic.
create or replace function public.admin_set_booking_status(actor uuid, booking uuid, new_status text)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_crm_admin(actor) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if new_status not in ('confirmed', 'rejected') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  return query
    with changed as (
      update public.bookings set status = new_status where id = booking returning *),
    logged as (
      insert into public.lead_access_audit (actor_user_id, subject_type, subject_id, action, detail)
      select actor, 'booking', id, 'STATUS_CHANGE', new_status from changed)
    select * from changed;
end;
$$;

revoke all on function public.admin_read_leads(uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_export_leads(uuid) from public, anon, authenticated;
revoke all on function public.admin_requeue_lead(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_set_booking_status(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_read_leads(uuid, integer, timestamptz) to service_role;
grant execute on function public.admin_export_leads(uuid) to service_role;
grant execute on function public.admin_requeue_lead(uuid, uuid) to service_role;
grant execute on function public.admin_set_booking_status(uuid, uuid, text) to service_role;

-- ---------- bookings / blocked times: admins only ----------
drop policy if exists "Anyone can create a booking request" on public.bookings;
drop policy if exists "Authenticated users can manage bookings" on public.bookings;
drop policy if exists "Admins can read bookings" on public.bookings;
create policy "Admins can read bookings"
on public.bookings for select to authenticated using (public.is_crm_admin());
revoke insert, update, delete on public.bookings from anon, authenticated;

drop policy if exists "Authenticated users can manage blocked times" on public.blocked_times;
drop policy if exists "Admins can manage blocked times" on public.blocked_times;
create policy "Admins can manage blocked times"
on public.blocked_times for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- ---------- retention status (no automatic deletion until approved) ----------
create table if not exists public.data_retention_policy (
  subject text primary key check (subject in ('leads', 'bookings')),
  status text not null check (status in ('RETENTION_POLICY_PENDING_BUSINESS_APPROVAL', 'APPROVED')),
  retention_days integer check (retention_days is null or retention_days >= 30),
  approved_by text,
  approved_at timestamptz,
  check (status <> 'APPROVED' or (retention_days is not null and approved_by is not null and approved_at is not null))
);
alter table public.data_retention_policy enable row level security;
drop policy if exists "Admins can read retention policy" on public.data_retention_policy;
create policy "Admins can read retention policy"
on public.data_retention_policy for select to authenticated using (public.is_crm_admin());
insert into public.data_retention_policy (subject, status)
values ('leads', 'RETENTION_POLICY_PENDING_BUSINESS_APPROVAL'), ('bookings', 'RETENTION_POLICY_PENDING_BUSINESS_APPROVAL')
on conflict (subject) do nothing;

-- Redaction runs only under an APPROVED policy; while pending it changes nothing.
-- It strips personal fields from leads already in the CRM; it never deletes rows
-- and never touches bookings.
create or replace function public.redact_synced_leads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare days integer; redacted integer;
begin
  select retention_days into days from public.data_retention_policy where subject = 'leads' and status = 'APPROVED';
  if days is null then
    return 0;
  end if;
  update public.leads
     set name = '[redacted]', email = null, phone = null, message = null,
         location = null, preferred_datetime = null, redacted_at = now()
   where crm_status = 'SYNCED'
     and redacted_at is null
     and crm_synced_at < now() - make_interval(days => days);
  get diagnostics redacted = row_count;
  return redacted;
end;
$$;
revoke all on function public.redact_synced_leads() from public, anon, authenticated;
grant execute on function public.redact_synced_leads() to service_role;
