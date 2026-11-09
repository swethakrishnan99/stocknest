-- A small stand-in for Supabase's auth schema, so setup.sql can be tested on plain Postgres
create extension if not exists pgcrypto;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
create table if not exists auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create table if not exists auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), status text);
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
