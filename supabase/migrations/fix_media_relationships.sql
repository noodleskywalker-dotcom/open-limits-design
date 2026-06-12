-- ============================================================
-- OPEN LIMITS DESIGN — fix media FK relationships (idempotent)
-- Run against live Supabase when PostgREST cannot join media_assets.
-- Fixes: team_members.photo_id, projects.featured_image_id,
--        services.image_id, materials table, schema cache refresh.
-- ============================================================

-- Ensure media_assets exists (required parent for all FKs)
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text,
  category text not null default 'Company',
  storage_path text not null unique,
  public_url text not null,
  mime_type text,
  width integer,
  height integer,
  size_bytes bigint,
  created_by uuid,
  created_at timestamptz not null default now()
);

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
exception when others then null;
end $$;

-- Legacy FK columns (preserve photo_url / image_url / cover_image_url)
alter table public.team_members add column if not exists email text;
alter table public.team_members add column if not exists photo_id uuid;
alter table public.services add column if not exists image_id uuid;
alter table public.projects add column if not exists featured_image_id uuid;
alter table public.projects add column if not exists category text;
alter table public.project_images add column if not exists media_id uuid;
alter table public.project_images add column if not exists sort_order integer not null default 0;
alter table public.company_profile add column if not exists ceo_name text;
alter table public.company_profile add column if not exists ceo_bio text;
alter table public.company_profile add column if not exists about_text text;
alter table public.company_profile add column if not exists map_query text;
alter table public.company_profile add column if not exists phone2 text;

-- Drop orphan FK constraints if they exist without valid columns, then re-add cleanly
alter table public.team_members drop constraint if exists team_members_photo_id_fkey;
alter table public.services drop constraint if exists services_image_id_fkey;
alter table public.projects drop constraint if exists projects_featured_image_id_fkey;
alter table public.project_images drop constraint if exists project_images_media_id_fkey;

alter table public.team_members
  add constraint team_members_photo_id_fkey
  foreign key (photo_id) references public.media_assets(id) on delete set null;

alter table public.services
  add constraint services_image_id_fkey
  foreign key (image_id) references public.media_assets(id) on delete set null;

alter table public.projects
  add constraint projects_featured_image_id_fkey
  foreign key (featured_image_id) references public.media_assets(id) on delete set null;

alter table public.project_images
  add constraint project_images_media_id_fkey
  foreign key (media_id) references public.media_assets(id) on delete cascade;

-- company_profile ceo_image_id FK (may already exist)
alter table public.company_profile drop constraint if exists company_profile_ceo_image_id_fkey;
alter table public.company_profile
  add constraint company_profile_ceo_image_id_fkey
  foreign key (ceo_image_id) references public.media_assets(id) on delete set null;

-- Materials table (missing on live DB)
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

-- Ensure furniture_items featured_image FK is named consistently
alter table public.furniture_items drop constraint if exists furniture_items_featured_image_id_fkey;
alter table public.furniture_items
  add constraint furniture_items_featured_image_id_fkey
  foreign key (featured_image_id) references public.media_assets(id) on delete set null;

-- RLS for materials
alter table public.materials enable row level security;
alter table public.furniture_item_materials enable row level security;

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

-- Seed default materials if table is empty
insert into public.materials (slug, name, description, category, sort_order)
select v.slug, v.name, v.description, v.category, v.sort_order
from (values
  ('oak', 'Oak', 'Solid oak wood.', 'Wood', 1),
  ('walnut', 'Walnut', 'Rich walnut wood.', 'Wood', 2),
  ('marble', 'Marble', 'Natural marble surfaces.', 'Stone', 5),
  ('leather', 'Leather', 'Full-grain upholstery leather.', 'Upholstery', 6),
  ('brushed-brass', 'Brushed Brass', 'Brushed brass detailing.', 'Metal', 11)
) as v(slug, name, description, category, sort_order)
where not exists (select 1 from public.materials limit 1)
on conflict (slug) do nothing;

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
