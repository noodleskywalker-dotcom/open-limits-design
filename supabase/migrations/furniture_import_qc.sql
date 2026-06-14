-- Furniture import QC: category hierarchy, SEO fields, import batch history + rollback

alter table public.furniture_categories
  add column if not exists parent_id uuid references public.furniture_categories(id) on delete set null;

alter table public.furniture_items
  add column if not exists seo_title text;

alter table public.furniture_items
  add column if not exists meta_description text;

create table if not exists public.furniture_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'pdf',
  file_name text not null,
  item_count integer not null default 0,
  image_count integer not null default 0,
  status text not null default 'completed'
    check (status in ('completed', 'failed', 'rolled_back', 'partial')),
  log jsonb not null default '[]'::jsonb,
  rollback_snapshot jsonb,
  imported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  rolled_back_at timestamptz
);

create index if not exists furniture_import_batches_created_at_idx
  on public.furniture_import_batches(created_at desc);

create index if not exists furniture_categories_parent_id_idx
  on public.furniture_categories(parent_id);

alter table public.furniture_import_batches enable row level security;

drop policy if exists "Authenticated users can manage furniture import batches" on public.furniture_import_batches;
create policy "Authenticated users can manage furniture import batches"
on public.furniture_import_batches for all to authenticated using (true) with check (true);

-- Ensure root Furniture category exists (child categories linked on first import)
insert into public.furniture_categories (slug, name, description, sort_order, published)
values ('furniture', 'Furniture', 'Root category for all furniture collections.', 0, true)
on conflict (slug) do nothing;
