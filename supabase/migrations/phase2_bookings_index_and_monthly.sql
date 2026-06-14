-- Phase 2: production booking index + monthly blocked times
-- Idempotent. Safe to run in Supabase SQL Editor.

-- Double-booking prevention: one active booking per date+slot.
create unique index if not exists bookings_active_slot_idx
on public.bookings (booking_date, start_time)
where status in ('pending', 'confirmed');

-- Allow monthly recurring blocks
alter table public.blocked_times drop constraint if exists blocked_times_repeat_type_check;
alter table public.blocked_times
  add constraint blocked_times_repeat_type_check
  check (repeat_type in ('none', 'daily', 'weekly', 'monthly'));

notify pgrst, 'reload schema';
