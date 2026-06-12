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

create table if not exists public.furniture_item_images (
  furniture_item_id uuid not null references public.furniture_items(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (furniture_item_id, media_id)
);

drop trigger if exists set_furniture_categories_updated_at on public.furniture_categories;
create trigger set_furniture_categories_updated_at
before update on public.furniture_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_furniture_items_updated_at on public.furniture_items;
create trigger set_furniture_items_updated_at
before update on public.furniture_items
for each row execute function public.set_updated_at();

insert into public.furniture_categories (slug, name, description, sort_order)
values
  ('sofas', 'Sofas', 'Sofas, sectionals, and lounge seating.', 1),
  ('majlis', 'Majlis', 'Majlis seating and custom gathering spaces.', 2),
  ('chairs', 'Chairs', 'Accent, dining, lounge, and task chairs.', 3),
  ('tables', 'Tables', 'Coffee tables, dining tables, consoles, and side tables.', 4),
  ('bedrooms', 'Bedrooms', 'Beds, nightstands, wardrobes, and bedroom furniture.', 5),
  ('exterior', 'Exterior', 'Outdoor and exterior furniture collections.', 6)
on conflict (slug) do nothing;

alter table public.furniture_categories enable row level security;
alter table public.furniture_items enable row level security;
alter table public.furniture_item_images enable row level security;

drop policy if exists "Public can read published furniture categories" on public.furniture_categories;
create policy "Public can read published furniture categories"
on public.furniture_categories for select
to anon, authenticated
using (published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage furniture categories" on public.furniture_categories;
create policy "Authenticated users can manage furniture categories"
on public.furniture_categories for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read published furniture items" on public.furniture_items;
create policy "Public can read published furniture items"
on public.furniture_items for select
to anon, authenticated
using (published or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage furniture items" on public.furniture_items;
create policy "Authenticated users can manage furniture items"
on public.furniture_items for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read images for published furniture items" on public.furniture_item_images;
create policy "Public can read images for published furniture items"
on public.furniture_item_images for select
to anon, authenticated
using (
  exists (
    select 1
    from public.furniture_items
    where furniture_items.id = furniture_item_images.furniture_item_id
      and (furniture_items.published or auth.role() = 'authenticated')
  )
);

drop policy if exists "Authenticated users can manage furniture item images" on public.furniture_item_images;
create policy "Authenticated users can manage furniture item images"
on public.furniture_item_images for all
to authenticated
using (true)
with check (true);

create index if not exists furniture_categories_published_sort_idx
on public.furniture_categories(published, sort_order);

create index if not exists furniture_items_slug_idx
on public.furniture_items(slug);

create index if not exists furniture_items_category_sort_idx
on public.furniture_items(category_id, sort_order);

create index if not exists furniture_items_published_sort_idx
on public.furniture_items(published, sort_order);
