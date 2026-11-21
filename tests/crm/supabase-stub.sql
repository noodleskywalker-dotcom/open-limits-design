-- Minimal stand-in for the Supabase platform pieces the migrations rely on, so the
-- real migration files can run in PGlite for authorization tests. Test-only.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text unique, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select jsonb_build_object('sub', auth.uid(), 'role', auth.role()) $$;

create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;

-- CMS tables that pre-date the repository's SQL (created in the Supabase UI);
-- only the columns the restore script references.
create table public.services (id uuid primary key default gen_random_uuid(), title text, is_active boolean default true);
create table public.team_members (id uuid primary key default gen_random_uuid(), name text, is_active boolean default true);
create table public.projects (id uuid primary key default gen_random_uuid(), slug text, title text, is_published boolean default false);
create table public.project_images (id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id));
