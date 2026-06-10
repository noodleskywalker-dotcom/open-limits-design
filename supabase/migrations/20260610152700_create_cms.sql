create extension if not exists "pgcrypto";

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

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text,
  category text not null check (
    category in (
      'Architecture',
      'Projects',
      'Interior Design',
      'Furniture',
      'Team',
      'CEO',
      'Company'
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

create table if not exists public.homepage_hero_images (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  location text,
  completion_date date,
  featured_image_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_images (
  project_id uuid not null references public.projects(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (project_id, media_id)
);

create table if not exists public.project_comparisons (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  before_image_id uuid not null references public.media_assets(id) on delete cascade,
  after_image_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  email text,
  photo_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  icon text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_company_profile_updated_at on public.company_profile;
create trigger set_company_profile_updated_at
before update on public.company_profile
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

insert into public.company_profile (
  id,
  name,
  tagline,
  description,
  hero_headline,
  hero_subheadline
)
values (
  1,
  'Open Limits Design',
  'Architecture, interiors, furniture, and projects',
  'A design studio for architecture, interior design, furniture, and project delivery.',
  'Design without limits',
  'Manage images, projects, team profiles, services, and company content from one Supabase-powered dashboard.'
)
on conflict (id) do nothing;

insert into public.services (title, description, icon, sort_order)
values
  ('Architecture', 'Concept, design development, and delivery for residential and commercial spaces.', 'A', 1),
  ('Interior Design', 'Material palettes, spatial planning, FF&E, and turnkey interior experiences.', 'I', 2),
  ('Furniture', 'Custom furniture direction and curated pieces for complete environments.', 'F', 3)
on conflict do nothing;

alter table public.media_assets enable row level security;
alter table public.company_profile enable row level security;
alter table public.homepage_hero_images enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.project_comparisons enable row level security;
alter table public.team_members enable row level security;
alter table public.services enable row level security;

drop policy if exists "Public can read media" on public.media_assets;
create policy "Public can read media"
on public.media_assets for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can manage media" on public.media_assets;
create policy "Authenticated users can manage media"
on public.media_assets for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read company profile" on public.company_profile;
create policy "Public can read company profile"
on public.company_profile for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can manage company profile" on public.company_profile;
create policy "Authenticated users can manage company profile"
on public.company_profile for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read homepage hero images" on public.homepage_hero_images;
create policy "Public can read homepage hero images"
on public.homepage_hero_images for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can manage homepage hero images" on public.homepage_hero_images;
create policy "Authenticated users can manage homepage hero images"
on public.homepage_hero_images for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
on public.projects for select
to anon, authenticated
using (published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage projects" on public.projects;
create policy "Authenticated users can manage projects"
on public.projects for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read images for published projects" on public.project_images;
create policy "Public can read images for published projects"
on public.project_images for select
to anon, authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_images.project_id
      and (projects.published or auth.role() = 'authenticated')
  )
);

drop policy if exists "Authenticated users can manage project images" on public.project_images;
create policy "Authenticated users can manage project images"
on public.project_images for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read comparisons for published projects" on public.project_comparisons;
create policy "Public can read comparisons for published projects"
on public.project_comparisons for select
to anon, authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_comparisons.project_id
      and (projects.published or auth.role() = 'authenticated')
  )
);

drop policy if exists "Authenticated users can manage project comparisons" on public.project_comparisons;
create policy "Authenticated users can manage project comparisons"
on public.project_comparisons for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read published team members" on public.team_members;
create policy "Public can read published team members"
on public.team_members for select
to anon, authenticated
using (published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage team members" on public.team_members;
create policy "Authenticated users can manage team members"
on public.team_members for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read published services" on public.services;
create policy "Public can read published services"
on public.services for select
to anon, authenticated
using (published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage services" on public.services;
create policy "Authenticated users can manage services"
on public.services for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read site media objects" on storage.objects;
create policy "Public can read site media objects"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'site-media');

drop policy if exists "Authenticated users can upload site media objects" on storage.objects;
create policy "Authenticated users can upload site media objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-media');

drop policy if exists "Authenticated users can update site media objects" on storage.objects;
create policy "Authenticated users can update site media objects"
on storage.objects for update
to authenticated
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');

drop policy if exists "Authenticated users can delete site media objects" on storage.objects;
create policy "Authenticated users can delete site media objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-media');

create index if not exists media_assets_category_idx on public.media_assets(category);
create index if not exists projects_slug_idx on public.projects(slug);
create index if not exists projects_published_sort_idx on public.projects(published, sort_order);
create index if not exists team_members_published_sort_idx on public.team_members(published, sort_order);
create index if not exists services_published_sort_idx on public.services(published, sort_order);
