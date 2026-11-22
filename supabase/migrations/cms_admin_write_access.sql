-- CMS write access: admins only (before any second account exists).
-- Production let ANY signed-in user write the CMS tables and the site-media storage bucket, and let
-- anonymous callers insert into four legacy chat tables no code uses. Sign-up is disabled and the owner
-- is the only account, so this closes the gap before staff accounts are added.
-- Admin = public.is_crm_admin() (admin_users row, role admin/owner, confirmed email, matched to auth.users).
-- Public read policies are unchanged except that drafts are visible to admins rather than to every
-- signed-in user. Idempotent; no data is changed. Apply after crm_lead_access_controls.sql.

do $$
declare
  t text;
begin
  foreach t in array array['company_profile', 'furniture_categories', 'furniture_item_images', 'furniture_item_materials',
                           'furniture_items', 'homepage_hero_images', 'materials', 'media_assets', 'project_comparisons'] loop
    if to_regclass('public.' || t) is not null then
      execute (select coalesce(string_agg(format('drop policy %I on public.%I;', policyname, t), ' '), 'select 1')
                 from pg_policies where schemaname = 'public' and tablename = t and policyname like 'Authenticated users can manage%');
      execute format('drop policy if exists %I on public.%I', 'Admins can manage ' || t, t);
      execute format('create policy %I on public.%I for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin())',
                     'Admins can manage ' || t, t);
    end if;
  end loop;
end $$;

-- Drafts: previously visible to every signed-in user.
do $$
declare
  t text;
begin
  foreach t in array array['furniture_categories', 'furniture_items', 'materials'] loop
    if to_regclass('public.' || t) is not null and exists (
         select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'published') then
      execute (select coalesce(string_agg(format('drop policy %I on public.%I;', policyname, t), ' '), 'select 1')
                 from pg_policies where schemaname = 'public' and tablename = t and cmd = 'SELECT' and policyname like 'Public can read published%');
      execute format('create policy %I on public.%I for select to anon, authenticated using (published or public.is_crm_admin())',
                     'Public can read published ' || replace(t, '_', ' '), t);
    end if;
  end loop;
end $$;

-- Legacy chat/callback tables: no website code writes them; the server (service role) bypasses RLS anyway.
do $$
declare
  p record;
begin
  for p in select policyname, tablename from pg_policies
            where schemaname = 'public' and tablename in ('appointments', 'callback_requests', 'conversations', 'messages')
              and policyname like 'Service insert%' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Storage: uploads/changes to the media buckets only by admins; public read unchanged.
do $$
declare
  p record;
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;
  for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
             and policyname in ('Authenticated users can delete site media objects', 'Authenticated users can update site media objects',
                                'Authenticated users can upload site media objects', 'Authenticated users upload media',
                                'Admins can upload site media', 'Admins can update site media', 'Admins can delete site media') loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
  create policy "Admins can upload site media" on storage.objects for insert to authenticated
    with check (bucket_id in ('site-media', 'media') and public.is_crm_admin());
  create policy "Admins can update site media" on storage.objects for update to authenticated
    using (bucket_id in ('site-media', 'media') and public.is_crm_admin())
    with check (bucket_id in ('site-media', 'media') and public.is_crm_admin());
  create policy "Admins can delete site media" on storage.objects for delete to authenticated
    using (bucket_id in ('site-media', 'media') and public.is_crm_admin());
end $$;
