-- ============================================================
-- OPEN LIMITS DESIGN — full restore migration
-- Idempotent: safe to run multiple times in the Supabase SQL Editor.
-- Preserves existing data in: services, team_members, projects,
-- project_images, bookings, blocked_times, admin_users,
-- furniture_categories, media_assets, company_profile.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- storage buckets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------- shared trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- media library ----------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text,
  category text not null check (
    category in (
      'Architecture', 'Projects', 'Interior Design', 'Furniture',
      'Materials', 'Team', 'CEO', 'Company'
    )
  ),
  storage_path text not null unique,
  public_url text not null,
  mime_type text,
  width integer,
  height integer,
  size_bytes bigint,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Allow the Materials category on databases created before it existed.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'media_assets'
      and constraint_name = 'media_assets_category_check'
  ) then
    alter table public.media_assets drop constraint media_assets_category_check;
  end if;
  alter table public.media_assets add constraint media_assets_category_check check (
    category in (
      'Architecture', 'Projects', 'Interior Design', 'Furniture',
      'Materials', 'Team', 'CEO', 'Company'
    )
  );
end $$;

-- ---------- company / homepage content ----------
create table if not exists public.company_profile (
  id integer primary key default 1 check (id = 1),
  name text not null default 'Open Limits Design',
  tagline text,
  description text,
  address text,
  phone text,
  email text,
  hero_headline text,
  hero_subheadline text,
  ceo_image_id uuid references public.media_assets(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.company_profile add column if not exists ceo_name text;
alter table public.company_profile add column if not exists ceo_bio text;
alter table public.company_profile add column if not exists about_text text;
alter table public.company_profile add column if not exists map_query text;
alter table public.company_profile add column if not exists phone2 text;

-- ---------- structured site content ----------
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text,
  body text,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_content (
  id integer primary key default 1 check (id = 1),
  hero_title text,
  hero_subtitle text,
  hero_image_id uuid references public.media_assets(id) on delete set null,
  ceo_image_id uuid references public.media_assets(id) on delete set null,
  about_text text,
  updated_at timestamptz not null default now()
);

-- ---------- leads & AI conversation storage ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  project_type text,
  location text,
  preferred_datetime text,
  message text,
  source text default 'contact_form',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_idx on public.chat_messages(conversation_id);
create index if not exists leads_created_at_idx on public.leads(created_at desc);

create table if not exists public.homepage_hero_images (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- ---------- legacy table upgrades (preserve data) ----------
alter table public.services add column if not exists image_id uuid references public.media_assets(id) on delete set null;
alter table public.team_members add column if not exists email text;
alter table public.team_members add column if not exists photo_id uuid references public.media_assets(id) on delete set null;
alter table public.projects add column if not exists featured_image_id uuid references public.media_assets(id) on delete set null;
alter table public.projects add column if not exists category text;
alter table public.project_images add column if not exists media_id uuid references public.media_assets(id) on delete cascade;
alter table public.project_images add column if not exists sort_order integer not null default 0;

create table if not exists public.project_comparisons (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  before_image_id uuid not null references public.media_assets(id) on delete cascade,
  after_image_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- furniture ----------
create table if not exists public.furniture_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.furniture_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  dimensions text,
  materials text,
  category_id uuid not null references public.furniture_categories(id) on delete restrict,
  featured_image_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.furniture_items add column if not exists collection text;
alter table public.furniture_items add column if not exists width text;
alter table public.furniture_items add column if not exists depth text;
alter table public.furniture_items add column if not exists height text;
alter table public.furniture_items add column if not exists finishes text;
alter table public.furniture_items add column if not exists features text;
alter table public.furniture_items add column if not exists availability text;
alter table public.furniture_items add column if not exists upholstery text;

create table if not exists public.furniture_item_images (
  furniture_item_id uuid not null references public.furniture_items(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (furniture_item_id, media_id)
);

-- ---------- materials ----------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text,
  image_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.furniture_item_materials (
  furniture_item_id uuid not null references public.furniture_items(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  primary key (furniture_item_id, material_id)
);

-- ---------- bookings (preserve existing data) ----------
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

-- Double-booking prevention: one active booking per date+slot.
create unique index if not exists bookings_active_slot_idx
on public.bookings (booking_date, start_time)
where status in ('pending', 'confirmed');

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- ---------- triggers ----------
drop trigger if exists set_company_profile_updated_at on public.company_profile;
create trigger set_company_profile_updated_at
before update on public.company_profile
for each row execute function public.set_updated_at();

drop trigger if exists set_furniture_categories_updated_at on public.furniture_categories;
create trigger set_furniture_categories_updated_at
before update on public.furniture_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_furniture_items_updated_at on public.furniture_items;
create trigger set_furniture_items_updated_at
before update on public.furniture_items
for each row execute function public.set_updated_at();

drop trigger if exists set_materials_updated_at on public.materials;
create trigger set_materials_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

-- ---------- seed data (insert only when missing) ----------
insert into public.company_profile (id, name, tagline, description, hero_headline, hero_subheadline)
values (
  1,
  'Open Limits Design',
  'Architecture · Interior Design · Furniture',
  'A luxury design studio for architecture, interiors, custom furniture, and turnkey project delivery.',
  'Design Without Limits',
  'Luxury architecture, interiors, and bespoke furniture — crafted in Qatar, delivered worldwide.'
)
on conflict (id) do nothing;

insert into public.furniture_categories (slug, name, description, sort_order)
values
  ('sofas', 'Sofas', 'Sofas, sectionals, and lounge seating.', 1),
  ('majlis', 'Majlis', 'Majlis seating and custom gathering spaces.', 2),
  ('chairs', 'Chairs', 'Accent, dining, lounge, and task chairs.', 3),
  ('tables', 'Tables', 'Coffee tables, dining tables, consoles, and side tables.', 4),
  ('beds', 'Beds', 'Beds and headboards.', 5),
  ('cabinets', 'Cabinets', 'Cabinets, wardrobes, and storage.', 6),
  ('lighting', 'Lighting', 'Lighting and fixtures.', 7),
  ('decor', 'Decor', 'Decorative pieces and accessories.', 8),
  ('bedrooms', 'Bedrooms', 'Complete bedroom collections (Dema, Raghad, Gahad).', 9),
  ('exterior', 'Exterior', 'Outdoor and exterior furniture, external majlis.', 10),
  ('dining', 'Dining', 'Dining room collections.', 11),
  ('custom-furniture', 'Custom Furniture', 'Bespoke commissions and custom builds.', 12)
on conflict (slug) do nothing;

insert into public.materials (slug, name, description, category, sort_order)
values
  ('oak', 'Oak', 'Solid oak wood.', 'Wood', 1),
  ('walnut', 'Walnut', 'Rich walnut wood.', 'Wood', 2),
  ('solid-wood-frame', 'Solid Wood Frame', 'Structural solid wood framing.', 'Wood', 3),
  ('veneer-finish', 'Veneer Finish', 'Premium wood veneer finish.', 'Wood', 4),
  ('marble', 'Marble', 'Natural marble surfaces.', 'Stone', 5),
  ('leather', 'Leather', 'Full-grain upholstery leather.', 'Upholstery', 6),
  ('fabric', 'Fabric', 'Premium upholstery fabric.', 'Upholstery', 7),
  ('linen', 'Linen', 'Natural linen textile.', 'Upholstery', 8),
  ('high-density-sponge', 'High-Density Sponge', 'High-density foam cushioning.', 'Upholstery', 9),
  ('steel', 'Steel', 'Stainless and powder-coated steel.', 'Metal', 10),
  ('brushed-brass', 'Brushed Brass', 'Brushed brass detailing.', 'Metal', 11)
on conflict (slug) do nothing;

insert into public.admin_users (email)
values ('noodleskywalker@gmail.com')
on conflict (email) do nothing;

-- ---------- row level security ----------
alter table public.media_assets enable row level security;
alter table public.company_profile enable row level security;
alter table public.homepage_hero_images enable row level security;
alter table public.site_settings enable row level security;
alter table public.services enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.project_comparisons enable row level security;
alter table public.furniture_categories enable row level security;
alter table public.furniture_items enable row level security;
alter table public.furniture_item_images enable row level security;
alter table public.materials enable row level security;
alter table public.furniture_item_materials enable row level security;
alter table public.bookings enable row level security;
alter table public.blocked_times enable row level security;
alter table public.admin_users enable row level security;
alter table public.site_content enable row level security;
alter table public.homepage_content enable row level security;
alter table public.leads enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- site content
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage site content" on public.site_content;
create policy "Authenticated users can manage site content"
on public.site_content for all to authenticated using (true) with check (true);

-- homepage content
drop policy if exists "Public can read homepage content" on public.homepage_content;
create policy "Public can read homepage content"
on public.homepage_content for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage homepage content" on public.homepage_content;
create policy "Authenticated users can manage homepage content"
on public.homepage_content for all to authenticated using (true) with check (true);

-- leads: public insert, admin read
drop policy if exists "Anyone can submit a lead" on public.leads;
create policy "Anyone can submit a lead"
on public.leads for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated users can read leads" on public.leads;
create policy "Authenticated users can read leads"
on public.leads for select to authenticated using (true);

-- AI conversations: public insert for chat, admin read
drop policy if exists "Anyone can create ai conversations" on public.ai_conversations;
create policy "Anyone can create ai conversations"
on public.ai_conversations for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated users can read ai conversations" on public.ai_conversations;
create policy "Authenticated users can read ai conversations"
on public.ai_conversations for select to authenticated using (true);

drop policy if exists "Anyone can append chat messages" on public.chat_messages;
create policy "Anyone can append chat messages"
on public.chat_messages for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated users can read chat messages" on public.chat_messages;
create policy "Authenticated users can read chat messages"
on public.chat_messages for select to authenticated using (true);

-- media
drop policy if exists "Public can read media" on public.media_assets;
create policy "Public can read media"
on public.media_assets for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage media" on public.media_assets;
create policy "Authenticated users can manage media"
on public.media_assets for all to authenticated using (true) with check (true);

-- company profile
drop policy if exists "Public can read company profile" on public.company_profile;
create policy "Public can read company profile"
on public.company_profile for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage company profile" on public.company_profile;
create policy "Authenticated users can manage company profile"
on public.company_profile for all to authenticated using (true) with check (true);

-- hero images
drop policy if exists "Public can read homepage hero images" on public.homepage_hero_images;
create policy "Public can read homepage hero images"
on public.homepage_hero_images for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage homepage hero images" on public.homepage_hero_images;
create policy "Authenticated users can manage homepage hero images"
on public.homepage_hero_images for all to authenticated using (true) with check (true);

-- site settings
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage site settings" on public.site_settings;
create policy "Authenticated users can manage site settings"
on public.site_settings for all to authenticated using (true) with check (true);

-- services (legacy column: is_active)
drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services"
on public.services for select to anon, authenticated
using (is_active or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage services" on public.services;
create policy "Authenticated users can manage services"
on public.services for all to authenticated using (true) with check (true);

-- team (legacy column: is_active)
drop policy if exists "Public can read active team members" on public.team_members;
create policy "Public can read active team members"
on public.team_members for select to anon, authenticated
using (is_active or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage team members" on public.team_members;
create policy "Authenticated users can manage team members"
on public.team_members for all to authenticated using (true) with check (true);

-- projects (legacy column: is_published)
drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
on public.projects for select to anon, authenticated
using (is_published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage projects" on public.projects;
create policy "Authenticated users can manage projects"
on public.projects for all to authenticated using (true) with check (true);

drop policy if exists "Public can read images for published projects" on public.project_images;
create policy "Public can read images for published projects"
on public.project_images for select to anon, authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_images.project_id
      and (projects.is_published or auth.role() = 'authenticated')
  )
);

drop policy if exists "Authenticated users can manage project images" on public.project_images;
create policy "Authenticated users can manage project images"
on public.project_images for all to authenticated using (true) with check (true);

drop policy if exists "Public can read comparisons for published projects" on public.project_comparisons;
create policy "Public can read comparisons for published projects"
on public.project_comparisons for select to anon, authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_comparisons.project_id
      and (projects.is_published or auth.role() = 'authenticated')
  )
);

drop policy if exists "Authenticated users can manage project comparisons" on public.project_comparisons;
create policy "Authenticated users can manage project comparisons"
on public.project_comparisons for all to authenticated using (true) with check (true);

-- furniture
drop policy if exists "Public can read published furniture categories" on public.furniture_categories;
create policy "Public can read published furniture categories"
on public.furniture_categories for select to anon, authenticated
using (published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage furniture categories" on public.furniture_categories;
create policy "Authenticated users can manage furniture categories"
on public.furniture_categories for all to authenticated using (true) with check (true);

drop policy if exists "Public can read published furniture items" on public.furniture_items;
create policy "Public can read published furniture items"
on public.furniture_items for select to anon, authenticated
using (published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage furniture items" on public.furniture_items;
create policy "Authenticated users can manage furniture items"
on public.furniture_items for all to authenticated using (true) with check (true);

drop policy if exists "Public can read images for published furniture items" on public.furniture_item_images;
create policy "Public can read images for published furniture items"
on public.furniture_item_images for select to anon, authenticated
using (
  exists (
    select 1 from public.furniture_items
    where furniture_items.id = furniture_item_images.furniture_item_id
      and (furniture_items.published or auth.role() = 'authenticated')
  )
);

drop policy if exists "Authenticated users can manage furniture item images" on public.furniture_item_images;
create policy "Authenticated users can manage furniture item images"
on public.furniture_item_images for all to authenticated using (true) with check (true);

-- materials
drop policy if exists "Public can read published materials" on public.materials;
create policy "Public can read published materials"
on public.materials for select to anon, authenticated
using (published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage materials" on public.materials;
create policy "Authenticated users can manage materials"
on public.materials for all to authenticated using (true) with check (true);

drop policy if exists "Public can read furniture item materials" on public.furniture_item_materials;
create policy "Public can read furniture item materials"
on public.furniture_item_materials for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage furniture item materials" on public.furniture_item_materials;
create policy "Authenticated users can manage furniture item materials"
on public.furniture_item_materials for all to authenticated using (true) with check (true);

-- bookings: public can create requests; only admins read/update.
drop policy if exists "Anyone can create a booking request" on public.bookings;
create policy "Anyone can create a booking request"
on public.bookings for insert to anon, authenticated with check (status = 'pending');

drop policy if exists "Authenticated users can manage bookings" on public.bookings;
create policy "Authenticated users can manage bookings"
on public.bookings for all to authenticated using (true) with check (true);

-- blocked times: public can read (needed to show availability); admins manage.
drop policy if exists "Public can read blocked times" on public.blocked_times;
create policy "Public can read blocked times"
on public.blocked_times for select to anon, authenticated using (true);

drop policy if exists "Authenticated users can manage blocked times" on public.blocked_times;
create policy "Authenticated users can manage blocked times"
on public.blocked_times for all to authenticated using (true) with check (true);

-- admin users: admins only
drop policy if exists "Authenticated users can read admin users" on public.admin_users;
create policy "Authenticated users can read admin users"
on public.admin_users for select to authenticated using (true);

-- ---------- storage policies ----------
drop policy if exists "Public can read site media objects" on storage.objects;
create policy "Public can read site media objects"
on storage.objects for select to anon, authenticated using (bucket_id = 'site-media');

drop policy if exists "Authenticated users can upload site media objects" on storage.objects;
create policy "Authenticated users can upload site media objects"
on storage.objects for insert to authenticated with check (bucket_id = 'site-media');

drop policy if exists "Authenticated users can update site media objects" on storage.objects;
create policy "Authenticated users can update site media objects"
on storage.objects for update to authenticated using (bucket_id = 'site-media') with check (bucket_id = 'site-media');

drop policy if exists "Authenticated users can delete site media objects" on storage.objects;
create policy "Authenticated users can delete site media objects"
on storage.objects for delete to authenticated using (bucket_id = 'site-media');

-- ---------- indexes ----------
create index if not exists media_assets_category_idx on public.media_assets(category);
create index if not exists projects_slug_idx on public.projects(slug);
create index if not exists furniture_items_slug_idx on public.furniture_items(slug);
create index if not exists furniture_items_category_sort_idx on public.furniture_items(category_id, sort_order);
create index if not exists materials_published_sort_idx on public.materials(published, sort_order);
create index if not exists bookings_date_idx on public.bookings(booking_date);
create index if not exists blocked_times_date_idx on public.blocked_times(date);
