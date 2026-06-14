-- OPEN LIMITS DESIGN — booking calendar tables
-- Idempotent. Safe to run in Supabase SQL Editor if calendar tables are missing.

create extension if not exists "pgcrypto";

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text not null,
  client_phone text,
  notes text,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  title text,
  date date,
  start_time time,
  end_time time,
  repeat_type text not null default 'none' check (repeat_type in ('none', 'daily', 'weekly')),
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_active_slot_idx
on public.bookings (booking_date, start_time)
where status in ('pending', 'confirmed');

create index if not exists bookings_date_idx on public.bookings(booking_date);
create index if not exists blocked_times_date_idx on public.blocked_times(date);

alter table public.bookings enable row level security;
alter table public.blocked_times enable row level security;

drop policy if exists "Anyone can create a booking request" on public.bookings;
create policy "Anyone can create a booking request"
on public.bookings for insert to anon, authenticated with check (status = 'pending');

drop policy if exists "Authenticated users can manage bookings" on public.bookings;
create policy "Authenticated users can manage bookings"
on public.bookings for all to authenticated using (true) with check (true);

drop policy if exists "Public can read blocked times" on public.blocked_times;
create policy "Public can read blocked times"
on public.blocked_times for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage blocked times" on public.blocked_times;
create policy "Authenticated users can manage blocked times"
on public.blocked_times for all to authenticated using (true) with check (true);
