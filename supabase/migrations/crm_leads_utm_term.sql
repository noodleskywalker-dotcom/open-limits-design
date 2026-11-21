-- Additive: store utm_term alongside the other UTM parameters (nullable, no default, no data change).
-- Apply after crm_handoff_outbox.sql. Idempotent.
alter table public.leads add column if not exists utm_term text;
