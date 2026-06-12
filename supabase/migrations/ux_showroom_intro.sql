-- OPEN LIMITS DESIGN — UX: intro slideshow, showroom sections, hotspots
-- Idempotent. Safe to run in Supabase SQL Editor.

-- Logo on company profile
alter table public.company_profile add column if not exists logo_image_id uuid references public.media_assets(id) on delete set null;

-- Site settings key-value store
create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Homepage content (single row)
create table if not exists public.homepage_content (
  id integer primary key default 1 check (id = 1),
  hero_title text,
  hero_subtitle text,
  hero_image_id uuid references public.media_assets(id) on delete set null,
  ceo_image_id uuid references public.media_assets(id) on delete set null,
  about_text text,
  updated_at timestamptz not null default now()
);

-- Intro slideshow slides
create table if not exists public.intro_slides (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_assets(id) on delete cascade,
  title text,
  subtitle text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Four main showroom entry boxes
create table if not exists public.showroom_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  image_id uuid references public.media_assets(id) on delete set null,
  link_url text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Interactive room images per showroom section
create table if not exists public.showroom_images (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.showroom_sections(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clickable hotspots on showroom images
create table if not exists public.showroom_hotspots (
  id uuid primary key default gen_random_uuid(),
  showroom_image_id uuid not null references public.showroom_images(id) on delete cascade,
  label text not null,
  x_percent numeric(5,2) not null check (x_percent >= 0 and x_percent <= 100),
  y_percent numeric(5,2) not null check (y_percent >= 0 and y_percent <= 100),
  width_percent numeric(5,2) not null default 8 check (width_percent > 0 and width_percent <= 100),
  height_percent numeric(5,2) not null default 8 check (height_percent > 0 and height_percent <= 100),
  link_type text not null check (link_type in ('furniture', 'material', 'project', 'custom')),
  link_target text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Booking double-booking prevention (if not yet applied)
create unique index if not exists bookings_active_slot_idx
on public.bookings (booking_date, start_time)
where status in ('pending', 'confirmed');

-- Seed default showroom sections
insert into public.showroom_sections (slug, title, description, link_url, sort_order)
values
  ('architecture', 'Architecture', 'Concept to delivery for residential and commercial spaces.', '/showroom/architecture', 1),
  ('projects', 'Projects', 'A curated portfolio of completed work across Qatar.', '/showroom/projects', 2),
  ('furniture', 'Furniture', 'Bespoke collections, majlis, bedrooms, and custom pieces.', '/showroom/furniture', 3),
  ('interior', 'Interior', 'Material palettes, spatial planning, and turnkey interiors.', '/showroom/interior', 4)
on conflict (slug) do nothing;

-- RLS
alter table public.site_settings enable row level security;
alter table public.homepage_content enable row level security;
alter table public.intro_slides enable row level security;
alter table public.showroom_sections enable row level security;
alter table public.showroom_images enable row level security;
alter table public.showroom_hotspots enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Authenticated users can manage site settings" on public.site_settings;
create policy "Authenticated users can manage site settings" on public.site_settings for all to authenticated using (true) with check (true);

drop policy if exists "Public can read homepage content" on public.homepage_content;
create policy "Public can read homepage content" on public.homepage_content for select to anon, authenticated using (true);
drop policy if exists "Authenticated users can manage homepage content" on public.homepage_content;
create policy "Authenticated users can manage homepage content" on public.homepage_content for all to authenticated using (true) with check (true);

drop policy if exists "Public can read published intro slides" on public.intro_slides;
create policy "Public can read published intro slides" on public.intro_slides for select to anon, authenticated using (published or auth.role() = 'authenticated');
drop policy if exists "Authenticated users can manage intro slides" on public.intro_slides;
create policy "Authenticated users can manage intro slides" on public.intro_slides for all to authenticated using (true) with check (true);

drop policy if exists "Public can read published showroom sections" on public.showroom_sections;
create policy "Public can read published showroom sections" on public.showroom_sections for select to anon, authenticated using (published or auth.role() = 'authenticated');
drop policy if exists "Authenticated users can manage showroom sections" on public.showroom_sections;
create policy "Authenticated users can manage showroom sections" on public.showroom_sections for all to authenticated using (true) with check (true);

drop policy if exists "Public can read published showroom images" on public.showroom_images;
create policy "Public can read published showroom images" on public.showroom_images for select to anon, authenticated using (published or auth.role() = 'authenticated');
drop policy if exists "Authenticated users can manage showroom images" on public.showroom_images;
create policy "Authenticated users can manage showroom images" on public.showroom_images for all to authenticated using (true) with check (true);

drop policy if exists "Public can read showroom hotspots" on public.showroom_hotspots;
create policy "Public can read showroom hotspots" on public.showroom_hotspots for select to anon, authenticated using (true);
drop policy if exists "Authenticated users can manage showroom hotspots" on public.showroom_hotspots;
create policy "Authenticated users can manage showroom hotspots" on public.showroom_hotspots for all to authenticated using (true) with check (true);

create index if not exists intro_slides_sort_idx on public.intro_slides(sort_order);
create index if not exists showroom_sections_slug_idx on public.showroom_sections(slug);
create index if not exists showroom_images_section_idx on public.showroom_images(section_id, sort_order);
create index if not exists showroom_hotspots_image_idx on public.showroom_hotspots(showroom_image_id);

notify pgrst, 'reload schema';
