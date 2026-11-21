-- ============================================================
-- CRM prerequisite: align the PRODUCTION public.leads / admin_users shape with the website code.
-- Additive only: no data is changed, dropped or rewritten. Safe to run more than once.
--
-- Why: production (project lwwfoqsutxwzgirsarig) has an older leads table
-- (session_id, notes, status, estimated_budget, ...) without the message/source columns that
-- app/api/contact, app/api/chat and lib/crm write, so those inserts fail. This adds them,
-- plus the remaining columns from restore_open_limits.sql.
--
-- Apply order: crm_leads_schema_alignment.sql -> crm_handoff_outbox.sql -> crm_lead_access_controls.sql
-- ============================================================

alter table public.leads
  add column if not exists message text,
  add column if not exists source text default 'contact_form',
  add column if not exists location text,
  add column if not exists preferred_datetime text;

-- Production leads.session_id is NOT NULL (chat-only origin), which rejects every form enquiry.
-- Relaxing it changes no existing row.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'leads' and column_name = 'session_id' and is_nullable = 'NO') then
    alter table public.leads alter column session_id drop not null;
  end if;
end $$;

-- The owner account (same email restore_open_limits.sql seeds) becomes the first CRM admin.
-- Production admin_users.id references auth.users(id), so the row is taken from auth.users;
-- nothing is inserted if that account does not exist or is already listed.
insert into public.admin_users (id, email, role)
select u.id, u.email, 'owner'
  from auth.users u
 where lower(u.email) = lower('noodleskywalker@gmail.com')
   and u.email_confirmed_at is not null
   and not exists (select 1 from public.admin_users a where lower(a.email) = lower(u.email));
