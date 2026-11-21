-- Production schema of the website Supabase project (lwwfoqsutxwzgirsarig), rebuilt from its catalog
-- on 2026-11-21 BEFORE the CRM migrations. Schema only: no rows, no personal data.
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create type public."media_category" as enum ('architecture', 'projects', 'interior_design', 'furniture', 'team', 'ceo', 'company');
create table public."admin_users" (
  "id" uuid not null,
  "email" text not null,
  "full_name" text,
  "role" text default 'admin'::text,
  "created_at" timestamp with time zone default now()
);
create table public."ai_conversations" (
  "id" uuid default gen_random_uuid() not null,
  "session_id" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."appointments" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "lead_id" uuid,
  "name" text not null,
  "email" text not null,
  "phone" text,
  "scheduled_at" timestamp with time zone not null,
  "duration_minutes" integer default 60,
  "google_event_id" text,
  "status" text default 'confirmed'::text,
  "notes" text,
  "created_at" timestamp with time zone default now()
);
create table public."availability_slots" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "day_of_week" integer not null,
  "start_time" time without time zone not null,
  "end_time" time without time zone not null,
  "is_active" boolean default true
);
create table public."blocked_times" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "title" text default 'Blocked'::text not null,
  "date" date,
  "start_time" time without time zone not null,
  "end_time" time without time zone not null,
  "repeat_type" text default 'none'::text not null,
  "created_at" timestamp with time zone default now()
);
create table public."bookings" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "client_name" text not null,
  "client_email" text not null,
  "client_phone" text,
  "notes" text,
  "booking_date" date not null,
  "start_time" time without time zone not null,
  "end_time" time without time zone not null,
  "status" text default 'pending'::text not null,
  "created_at" timestamp with time zone default now()
);
create table public."callback_requests" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "lead_id" uuid,
  "name" text not null,
  "email" text not null,
  "phone" text,
  "question" text,
  "status" text default 'pending'::text,
  "created_at" timestamp with time zone default now()
);
create table public."chat_messages" (
  "id" uuid default gen_random_uuid() not null,
  "conversation_id" uuid not null,
  "role" text not null,
  "content" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."company_profile" (
  "id" integer default 1 not null,
  "name" text default 'Open Limits Design'::text not null,
  "tagline" text,
  "description" text,
  "address" text,
  "phone" text,
  "email" text,
  "hero_headline" text,
  "hero_subheadline" text,
  "ceo_image_id" uuid,
  "updated_at" timestamp with time zone default now() not null,
  "ceo_name" text,
  "ceo_bio" text,
  "about_text" text,
  "map_query" text,
  "phone2" text
);
create table public."conversations" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "lead_id" uuid,
  "session_id" text not null,
  "created_at" timestamp with time zone default now()
);
create table public."furniture_categories" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "name" text not null,
  "description" text,
  "sort_order" integer default 0 not null,
  "published" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."furniture_item_images" (
  "furniture_item_id" uuid not null,
  "media_id" uuid not null,
  "sort_order" integer default 0 not null
);
create table public."furniture_item_materials" (
  "furniture_item_id" uuid not null,
  "material_id" uuid not null
);
create table public."furniture_items" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "title" text not null,
  "description" text not null,
  "dimensions" text,
  "materials" text,
  "category_id" uuid not null,
  "featured_image_id" uuid,
  "sort_order" integer default 0 not null,
  "published" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "collection" text,
  "width" text,
  "depth" text,
  "height" text,
  "finishes" text,
  "features" text,
  "availability" text,
  "upholstery" text
);
create table public."homepage_content" (
  "id" integer default 1 not null,
  "hero_title" text,
  "hero_subtitle" text,
  "hero_image_id" uuid,
  "ceo_image_id" uuid,
  "about_text" text,
  "updated_at" timestamp with time zone default now() not null
);
create table public."homepage_hero_images" (
  "id" uuid default gen_random_uuid() not null,
  "media_id" uuid not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."leads" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "session_id" text not null,
  "name" text,
  "email" text,
  "phone" text,
  "project_type" text,
  "project_location" text,
  "estimated_budget" text,
  "desired_completion" date,
  "status" text default 'new'::text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);
create table public."materials" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "name" text not null,
  "description" text,
  "category" text,
  "image_id" uuid,
  "sort_order" integer default 0 not null,
  "published" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."media" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "title" text not null,
  "category" public."media_category" not null,
  "storage_path" text not null,
  "public_url" text not null,
  "alt_text" text,
  "width" integer,
  "height" integer,
  "is_before_after" boolean default false,
  "pair_id" uuid,
  "sort_order" integer default 0,
  "created_at" timestamp with time zone default now()
);
create table public."media_assets" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "alt_text" text,
  "category" text not null,
  "storage_path" text not null,
  "public_url" text not null,
  "mime_type" text,
  "width" integer,
  "height" integer,
  "size_bytes" bigint,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null
);
create table public."messages" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "conversation_id" uuid,
  "role" text not null,
  "content" text not null,
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default now()
);
create table public."project_comparisons" (
  "id" uuid default gen_random_uuid() not null,
  "project_id" uuid not null,
  "label" text not null,
  "before_image_id" uuid not null,
  "after_image_id" uuid not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."project_images" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "project_id" uuid,
  "media_id" uuid,
  "is_cover" boolean default false,
  "sort_order" integer default 0
);
create table public."projects" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "slug" text not null,
  "title" text not null,
  "description" text,
  "location" text,
  "completion_date" date,
  "cover_image_url" text,
  "latitude" numeric,
  "longitude" numeric,
  "is_featured" boolean default false,
  "is_published" boolean default true,
  "sort_order" integer default 0,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "featured_image_id" uuid,
  "category" text
);
create table public."services" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "slug" text not null,
  "title" text not null,
  "description" text,
  "icon" text,
  "image_url" text,
  "sort_order" integer default 0,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "image_id" uuid
);
create table public."site_content" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "key" text not null,
  "value" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp with time zone default now()
);
create table public."site_settings" (
  "key" text not null,
  "value" text,
  "updated_at" timestamp with time zone default now() not null
);
create table public."team_members" (
  "id" uuid default extensions.uuid_generate_v4() not null,
  "name" text not null,
  "role" text not null,
  "bio" text,
  "photo_url" text,
  "sort_order" integer default 0,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "email" text,
  "photo_id" uuid
);
alter table admin_users add constraint "admin_users_pkey" PRIMARY KEY (id);
alter table ai_conversations add constraint "ai_conversations_pkey" PRIMARY KEY (id);
alter table appointments add constraint "appointments_pkey" PRIMARY KEY (id);
alter table availability_slots add constraint "availability_slots_day_of_week_check" CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
alter table availability_slots add constraint "availability_slots_pkey" PRIMARY KEY (id);
alter table blocked_times add constraint "blocked_times_repeat_type_check" CHECK ((repeat_type = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text])));
alter table blocked_times add constraint "blocked_times_pkey" PRIMARY KEY (id);
alter table bookings add constraint "bookings_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text])));
alter table bookings add constraint "bookings_pkey" PRIMARY KEY (id);
alter table callback_requests add constraint "callback_requests_pkey" PRIMARY KEY (id);
alter table chat_messages add constraint "chat_messages_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])));
alter table chat_messages add constraint "chat_messages_pkey" PRIMARY KEY (id);
alter table company_profile add constraint "company_profile_id_check" CHECK ((id = 1));
alter table company_profile add constraint "company_profile_pkey" PRIMARY KEY (id);
alter table conversations add constraint "conversations_pkey" PRIMARY KEY (id);
alter table furniture_categories add constraint "furniture_categories_pkey" PRIMARY KEY (id);
alter table furniture_categories add constraint "furniture_categories_slug_key" UNIQUE (slug);
alter table furniture_item_images add constraint "furniture_item_images_pkey" PRIMARY KEY (furniture_item_id, media_id);
alter table furniture_item_materials add constraint "furniture_item_materials_pkey" PRIMARY KEY (furniture_item_id, material_id);
alter table furniture_items add constraint "furniture_items_pkey" PRIMARY KEY (id);
alter table furniture_items add constraint "furniture_items_slug_key" UNIQUE (slug);
alter table homepage_content add constraint "homepage_content_id_check" CHECK ((id = 1));
alter table homepage_content add constraint "homepage_content_pkey" PRIMARY KEY (id);
alter table homepage_hero_images add constraint "homepage_hero_images_pkey" PRIMARY KEY (id);
alter table leads add constraint "leads_pkey" PRIMARY KEY (id);
alter table leads add constraint "leads_session_id_key" UNIQUE (session_id);
alter table materials add constraint "materials_pkey" PRIMARY KEY (id);
alter table materials add constraint "materials_slug_key" UNIQUE (slug);
alter table media add constraint "media_pkey" PRIMARY KEY (id);
alter table media_assets add constraint "media_assets_category_check" CHECK ((category = ANY (ARRAY['Architecture'::text, 'Projects'::text, 'Interior Design'::text, 'Furniture'::text, 'Materials'::text, 'Team'::text, 'CEO'::text, 'Company'::text])));
alter table media_assets add constraint "media_assets_pkey" PRIMARY KEY (id);
alter table media_assets add constraint "media_assets_storage_path_key" UNIQUE (storage_path);
alter table messages add constraint "messages_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])));
alter table messages add constraint "messages_pkey" PRIMARY KEY (id);
alter table project_comparisons add constraint "project_comparisons_pkey" PRIMARY KEY (id);
alter table project_images add constraint "project_images_pkey" PRIMARY KEY (id);
alter table projects add constraint "projects_pkey" PRIMARY KEY (id);
alter table projects add constraint "projects_slug_key" UNIQUE (slug);
alter table services add constraint "services_pkey" PRIMARY KEY (id);
alter table services add constraint "services_slug_key" UNIQUE (slug);
alter table site_content add constraint "site_content_pkey" PRIMARY KEY (id);
alter table site_content add constraint "site_content_key_key" UNIQUE (key);
alter table site_settings add constraint "site_settings_pkey" PRIMARY KEY (key);
alter table team_members add constraint "team_members_pkey" PRIMARY KEY (id);
alter table admin_users add constraint "admin_users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table appointments add constraint "appointments_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
alter table callback_requests add constraint "callback_requests_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
alter table chat_messages add constraint "chat_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE;
alter table company_profile add constraint "company_profile_ceo_image_id_fkey" FOREIGN KEY (ceo_image_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table conversations add constraint "conversations_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
alter table furniture_item_images add constraint "furniture_item_images_furniture_item_id_fkey" FOREIGN KEY (furniture_item_id) REFERENCES furniture_items(id) ON DELETE CASCADE;
alter table furniture_item_images add constraint "furniture_item_images_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE;
alter table furniture_item_materials add constraint "furniture_item_materials_furniture_item_id_fkey" FOREIGN KEY (furniture_item_id) REFERENCES furniture_items(id) ON DELETE CASCADE;
alter table furniture_item_materials add constraint "furniture_item_materials_material_id_fkey" FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE;
alter table furniture_items add constraint "furniture_items_category_id_fkey" FOREIGN KEY (category_id) REFERENCES furniture_categories(id) ON DELETE RESTRICT;
alter table furniture_items add constraint "furniture_items_featured_image_id_fkey" FOREIGN KEY (featured_image_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table homepage_content add constraint "homepage_content_ceo_image_id_fkey" FOREIGN KEY (ceo_image_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table homepage_content add constraint "homepage_content_hero_image_id_fkey" FOREIGN KEY (hero_image_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table homepage_hero_images add constraint "homepage_hero_images_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE;
alter table materials add constraint "materials_image_id_fkey" FOREIGN KEY (image_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table media add constraint "media_pair_id_fkey" FOREIGN KEY (pair_id) REFERENCES media(id);
alter table messages add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table project_comparisons add constraint "project_comparisons_after_image_id_fkey" FOREIGN KEY (after_image_id) REFERENCES media_assets(id) ON DELETE CASCADE;
alter table project_comparisons add constraint "project_comparisons_before_image_id_fkey" FOREIGN KEY (before_image_id) REFERENCES media_assets(id) ON DELETE CASCADE;
alter table project_comparisons add constraint "project_comparisons_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
alter table project_images add constraint "project_images_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_assets(id) ON DELETE CASCADE;
alter table project_images add constraint "project_images_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
alter table projects add constraint "projects_featured_image_id_fkey" FOREIGN KEY (featured_image_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table services add constraint "services_image_id_fkey" FOREIGN KEY (image_id) REFERENCES media_assets(id) ON DELETE SET NULL;
alter table team_members add constraint "team_members_photo_id_fkey" FOREIGN KEY (photo_id) REFERENCES media_assets(id) ON DELETE SET NULL;
CREATE INDEX idx_blocked_times_date ON public.blocked_times USING btree (date);
CREATE UNIQUE INDEX bookings_active_slot_idx ON public.bookings USING btree (booking_date, start_time) WHERE (status = ANY (ARRAY['pending'::text, 'confirmed'::text]));
CREATE INDEX idx_bookings_date ON public.bookings USING btree (booking_date);
CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);
CREATE INDEX chat_messages_conversation_idx ON public.chat_messages USING btree (conversation_id);
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;
alter table public."admin_users" enable row level security;
alter table public."ai_conversations" enable row level security;
alter table public."appointments" enable row level security;
alter table public."availability_slots" enable row level security;
alter table public."blocked_times" enable row level security;
alter table public."bookings" enable row level security;
alter table public."callback_requests" enable row level security;
alter table public."chat_messages" enable row level security;
alter table public."company_profile" enable row level security;
alter table public."conversations" enable row level security;
alter table public."furniture_categories" enable row level security;
alter table public."furniture_item_images" enable row level security;
alter table public."furniture_item_materials" enable row level security;
alter table public."furniture_items" enable row level security;
alter table public."homepage_content" enable row level security;
alter table public."homepage_hero_images" enable row level security;
alter table public."leads" enable row level security;
alter table public."materials" enable row level security;
alter table public."media" enable row level security;
alter table public."media_assets" enable row level security;
alter table public."messages" enable row level security;
alter table public."project_comparisons" enable row level security;
alter table public."project_images" enable row level security;
alter table public."projects" enable row level security;
alter table public."services" enable row level security;
alter table public."site_content" enable row level security;
alter table public."site_settings" enable row level security;
alter table public."team_members" enable row level security;
create policy "Admin all appointments" on public."appointments" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Service insert appointments" on public."appointments" as permissive for insert to public with check (true);
create policy "Admin all availability" on public."availability_slots" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Public read availability" on public."availability_slots" as permissive for select to public using ((is_active = true));
create policy "Admin all blocked_times" on public."blocked_times" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Authenticated users can manage blocked times" on public."blocked_times" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read blocked times" on public."blocked_times" as permissive for select to anon, authenticated using (true);
create policy "Admin all bookings" on public."bookings" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Anyone can create a booking request" on public."bookings" as permissive for insert to anon, authenticated with check ((status = 'pending'::text));
create policy "Authenticated users can manage bookings" on public."bookings" as permissive for all to authenticated using (true) with check (true);
create policy "Service insert bookings" on public."bookings" as permissive for insert to public with check (true);
create policy "Admin all callbacks" on public."callback_requests" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Service insert callbacks" on public."callback_requests" as permissive for insert to public with check (true);
create policy "Authenticated users can manage company profile" on public."company_profile" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read company profile" on public."company_profile" as permissive for select to anon, authenticated using (true);
create policy "Admin all conversations" on public."conversations" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Service insert conversations" on public."conversations" as permissive for insert to public with check (true);
create policy "Authenticated users can manage furniture categories" on public."furniture_categories" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read published furniture categories" on public."furniture_categories" as permissive for select to anon, authenticated using ((published OR (auth.role() = 'authenticated'::text)));
create policy "Authenticated users can manage furniture item images" on public."furniture_item_images" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read images for published furniture items" on public."furniture_item_images" as permissive for select to anon, authenticated using ((EXISTS ( SELECT 1
   FROM furniture_items
  WHERE ((furniture_items.id = furniture_item_images.furniture_item_id) AND (furniture_items.published OR (auth.role() = 'authenticated'::text))))));
create policy "Authenticated users can manage furniture item materials" on public."furniture_item_materials" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read furniture item materials" on public."furniture_item_materials" as permissive for select to anon, authenticated using (true);
create policy "Authenticated users can manage furniture items" on public."furniture_items" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read published furniture items" on public."furniture_items" as permissive for select to anon, authenticated using ((published OR (auth.role() = 'authenticated'::text)));
create policy "Authenticated users can manage homepage hero images" on public."homepage_hero_images" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read homepage hero images" on public."homepage_hero_images" as permissive for select to anon, authenticated using (true);
create policy "Admin all leads" on public."leads" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Service insert leads" on public."leads" as permissive for insert to public with check (true);
create policy "Authenticated users can manage materials" on public."materials" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read published materials" on public."materials" as permissive for select to anon, authenticated using ((published OR (auth.role() = 'authenticated'::text)));
create policy "Admin all media" on public."media" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Public read media" on public."media" as permissive for select to public using (true);
create policy "Authenticated users can manage media" on public."media_assets" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read media" on public."media_assets" as permissive for select to anon, authenticated using (true);
create policy "Admin all messages" on public."messages" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Service insert messages" on public."messages" as permissive for insert to public with check (true);
create policy "Authenticated users can manage project comparisons" on public."project_comparisons" as permissive for all to authenticated using (true) with check (true);
create policy "Public can read comparisons for published projects" on public."project_comparisons" as permissive for select to anon, authenticated using ((EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_comparisons.project_id) AND ((projects.is_published = true) OR (auth.role() = 'authenticated'::text))))));
create policy "Admin all project_images" on public."project_images" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Public read project_images" on public."project_images" as permissive for select to public using (true);
create policy "Admin all projects" on public."projects" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Public read projects" on public."projects" as permissive for select to public using ((is_published = true));
create policy "Admin all services" on public."services" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Public read services" on public."services" as permissive for select to public using ((is_active = true));
create policy "Admin all site_content" on public."site_content" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Public read site_content" on public."site_content" as permissive for select to public using (true);
create policy "Admin all team" on public."team_members" as permissive for all to public using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE (admin_users.id = auth.uid()))));
create policy "Public read team" on public."team_members" as permissive for select to public using ((is_active = true));
revoke all on public."admin_users" from anon;
grant select, insert, update, delete on public."admin_users" to anon;
revoke all on public."admin_users" from authenticated;
grant select, insert, update, delete on public."admin_users" to authenticated;
revoke all on public."admin_users" from service_role;
grant select, insert, update, delete on public."admin_users" to service_role;
revoke all on public."ai_conversations" from anon;
grant select, insert, update, delete on public."ai_conversations" to anon;
revoke all on public."ai_conversations" from authenticated;
grant select, insert, update, delete on public."ai_conversations" to authenticated;
revoke all on public."ai_conversations" from service_role;
grant select, insert, update, delete on public."ai_conversations" to service_role;
revoke all on public."appointments" from anon;
grant select, insert, update, delete on public."appointments" to anon;
revoke all on public."appointments" from authenticated;
grant select, insert, update, delete on public."appointments" to authenticated;
revoke all on public."appointments" from service_role;
grant select, insert, update, delete on public."appointments" to service_role;
revoke all on public."availability_slots" from anon;
grant select, insert, update, delete on public."availability_slots" to anon;
revoke all on public."availability_slots" from authenticated;
grant select, insert, update, delete on public."availability_slots" to authenticated;
revoke all on public."availability_slots" from service_role;
grant select, insert, update, delete on public."availability_slots" to service_role;
revoke all on public."blocked_times" from anon;
grant select, insert, update, delete on public."blocked_times" to anon;
revoke all on public."blocked_times" from authenticated;
grant select, insert, update, delete on public."blocked_times" to authenticated;
revoke all on public."blocked_times" from service_role;
grant select, insert, update, delete on public."blocked_times" to service_role;
revoke all on public."bookings" from anon;
grant select, insert, update, delete on public."bookings" to anon;
revoke all on public."bookings" from authenticated;
grant select, insert, update, delete on public."bookings" to authenticated;
revoke all on public."bookings" from service_role;
grant select, insert, update, delete on public."bookings" to service_role;
revoke all on public."callback_requests" from anon;
grant select, insert, update, delete on public."callback_requests" to anon;
revoke all on public."callback_requests" from authenticated;
grant select, insert, update, delete on public."callback_requests" to authenticated;
revoke all on public."callback_requests" from service_role;
grant select, insert, update, delete on public."callback_requests" to service_role;
revoke all on public."chat_messages" from anon;
grant select, insert, update, delete on public."chat_messages" to anon;
revoke all on public."chat_messages" from authenticated;
grant select, insert, update, delete on public."chat_messages" to authenticated;
revoke all on public."chat_messages" from service_role;
grant select, insert, update, delete on public."chat_messages" to service_role;
revoke all on public."company_profile" from anon;
grant select, insert, update, delete on public."company_profile" to anon;
revoke all on public."company_profile" from authenticated;
grant select, insert, update, delete on public."company_profile" to authenticated;
revoke all on public."company_profile" from service_role;
grant select, insert, update, delete on public."company_profile" to service_role;
revoke all on public."conversations" from anon;
grant select, insert, update, delete on public."conversations" to anon;
revoke all on public."conversations" from authenticated;
grant select, insert, update, delete on public."conversations" to authenticated;
revoke all on public."conversations" from service_role;
grant select, insert, update, delete on public."conversations" to service_role;
revoke all on public."furniture_categories" from anon;
grant select, insert, update, delete on public."furniture_categories" to anon;
revoke all on public."furniture_categories" from authenticated;
grant select, insert, update, delete on public."furniture_categories" to authenticated;
revoke all on public."furniture_categories" from service_role;
grant select, insert, update, delete on public."furniture_categories" to service_role;
revoke all on public."furniture_item_images" from anon;
grant select, insert, update, delete on public."furniture_item_images" to anon;
revoke all on public."furniture_item_images" from authenticated;
grant select, insert, update, delete on public."furniture_item_images" to authenticated;
revoke all on public."furniture_item_images" from service_role;
grant select, insert, update, delete on public."furniture_item_images" to service_role;
revoke all on public."furniture_item_materials" from anon;
grant select, insert, update, delete on public."furniture_item_materials" to anon;
revoke all on public."furniture_item_materials" from authenticated;
grant select, insert, update, delete on public."furniture_item_materials" to authenticated;
revoke all on public."furniture_item_materials" from service_role;
grant select, insert, update, delete on public."furniture_item_materials" to service_role;
revoke all on public."furniture_items" from anon;
grant select, insert, update, delete on public."furniture_items" to anon;
revoke all on public."furniture_items" from authenticated;
grant select, insert, update, delete on public."furniture_items" to authenticated;
revoke all on public."furniture_items" from service_role;
grant select, insert, update, delete on public."furniture_items" to service_role;
revoke all on public."homepage_content" from anon;
grant select, insert, update, delete on public."homepage_content" to anon;
revoke all on public."homepage_content" from authenticated;
grant select, insert, update, delete on public."homepage_content" to authenticated;
revoke all on public."homepage_content" from service_role;
grant select, insert, update, delete on public."homepage_content" to service_role;
revoke all on public."homepage_hero_images" from anon;
grant select, insert, update, delete on public."homepage_hero_images" to anon;
revoke all on public."homepage_hero_images" from authenticated;
grant select, insert, update, delete on public."homepage_hero_images" to authenticated;
revoke all on public."homepage_hero_images" from service_role;
grant select, insert, update, delete on public."homepage_hero_images" to service_role;
revoke all on public."leads" from anon;
grant select, insert, update, delete on public."leads" to anon;
revoke all on public."leads" from authenticated;
grant select, insert, update, delete on public."leads" to authenticated;
revoke all on public."leads" from service_role;
grant select, insert, update, delete on public."leads" to service_role;
revoke all on public."materials" from anon;
grant select, insert, update, delete on public."materials" to anon;
revoke all on public."materials" from authenticated;
grant select, insert, update, delete on public."materials" to authenticated;
revoke all on public."materials" from service_role;
grant select, insert, update, delete on public."materials" to service_role;
revoke all on public."media" from anon;
grant select, insert, update, delete on public."media" to anon;
revoke all on public."media" from authenticated;
grant select, insert, update, delete on public."media" to authenticated;
revoke all on public."media" from service_role;
grant select, insert, update, delete on public."media" to service_role;
revoke all on public."media_assets" from anon;
grant select, insert, update, delete on public."media_assets" to anon;
revoke all on public."media_assets" from authenticated;
grant select, insert, update, delete on public."media_assets" to authenticated;
revoke all on public."media_assets" from service_role;
grant select, insert, update, delete on public."media_assets" to service_role;
revoke all on public."messages" from anon;
grant select, insert, update, delete on public."messages" to anon;
revoke all on public."messages" from authenticated;
grant select, insert, update, delete on public."messages" to authenticated;
revoke all on public."messages" from service_role;
grant select, insert, update, delete on public."messages" to service_role;
revoke all on public."project_comparisons" from anon;
grant select, insert, update, delete on public."project_comparisons" to anon;
revoke all on public."project_comparisons" from authenticated;
grant select, insert, update, delete on public."project_comparisons" to authenticated;
revoke all on public."project_comparisons" from service_role;
grant select, insert, update, delete on public."project_comparisons" to service_role;
revoke all on public."project_images" from anon;
grant select, insert, update, delete on public."project_images" to anon;
revoke all on public."project_images" from authenticated;
grant select, insert, update, delete on public."project_images" to authenticated;
revoke all on public."project_images" from service_role;
grant select, insert, update, delete on public."project_images" to service_role;
revoke all on public."projects" from anon;
grant select, insert, update, delete on public."projects" to anon;
revoke all on public."projects" from authenticated;
grant select, insert, update, delete on public."projects" to authenticated;
revoke all on public."projects" from service_role;
grant select, insert, update, delete on public."projects" to service_role;
revoke all on public."services" from anon;
grant select, insert, update, delete on public."services" to anon;
revoke all on public."services" from authenticated;
grant select, insert, update, delete on public."services" to authenticated;
revoke all on public."services" from service_role;
grant select, insert, update, delete on public."services" to service_role;
revoke all on public."site_content" from anon;
grant select, insert, update, delete on public."site_content" to anon;
revoke all on public."site_content" from authenticated;
grant select, insert, update, delete on public."site_content" to authenticated;
revoke all on public."site_content" from service_role;
grant select, insert, update, delete on public."site_content" to service_role;
revoke all on public."site_settings" from anon;
grant select, insert, update, delete on public."site_settings" to anon;
revoke all on public."site_settings" from authenticated;
grant select, insert, update, delete on public."site_settings" to authenticated;
revoke all on public."site_settings" from service_role;
grant select, insert, update, delete on public."site_settings" to service_role;
revoke all on public."team_members" from anon;
grant select, insert, update, delete on public."team_members" to anon;
revoke all on public."team_members" from authenticated;
grant select, insert, update, delete on public."team_members" to authenticated;
revoke all on public."team_members" from service_role;
grant select, insert, update, delete on public."team_members" to service_role;
