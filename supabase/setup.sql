-- StockNest cloud database. Run once in Supabase → SQL Editor (safe to run again).
--
-- Every row belongs to a business. Row-level security lets people read and write only the
-- businesses they are members of. People who have turned on two-step login must have used it
-- in this session (assurance level aal2) before they can touch any data.

-- ── Tables ─────────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.member_role as enum ('Owner', 'Manager', 'Staff');
exception when duplicate_object then null;
end $$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  name text not null default '' check (char_length(name) <= 120),
  email text not null default '' check (char_length(email) <= 320),
  joined_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists members_user on public.members (user_id);

-- People the owner has added by email. They join when they sign in with that email.
create table if not exists public.invites (
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 320),
  role public.member_role not null check (role <> 'Owner'),
  name text not null default '' check (char_length(name) <= 120),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (business_id, email)
);

-- Everything else the app keeps (products, movements, orders, …) as one row per item.
-- Deleting sets `deleted`, so other devices learn about it when they sync.
create table if not exists public.records (
  business_id uuid not null references public.businesses (id) on delete cascade,
  collection text not null check (collection in ('products', 'movements', 'orders', 'locations', 'suppliers', 'batches', 'settings')),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (business_id, collection, id),
  check (data is null or pg_column_size(data) <= 200000)
);
create index if not exists records_changes on public.records (business_id, updated_at);

-- The server decides when a record changed and who changed it, never the device
create or replace function public.stamp_record() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists stamp_record on public.records;
create trigger stamp_record before insert or update on public.records
  for each row execute function public.stamp_record();

-- Quantities on hand are kept by the server: each stock movement is applied to its product when it
-- arrives, so two devices recording stock offline both count. Devices can't overwrite a quantity
-- directly; a product's qty only changes through movements (or when the product is first added).
create or replace function public.apply_movement() returns trigger
language plpgsql set search_path = '' as $$
declare
  pid text := new.data ->> 'productId';
  kind text := new.data ->> 'kind';
  q numeric := coalesce((new.data ->> 'qty')::numeric, 0);
  cur numeric;
  nxt numeric;
begin
  if new.collection <> 'movements' or pid is null then return new; end if;
  select coalesce((data ->> 'qty')::numeric, 0) into cur from public.records
    where business_id = new.business_id and collection = 'products' and id = pid and not deleted;
  if not found then return new; end if;

  if tg_op = 'INSERT' and not new.deleted then
    nxt := case kind when 'in' then cur + q when 'out' then greatest(0, cur - q) when 'count' then q else cur end;
    -- remember what this movement actually did, so undoing it is exact
    new.data := new.data || jsonb_build_object('applied', nxt - cur, 'serverBefore', cur);
  elsif tg_op = 'UPDATE' and new.deleted and not old.deleted then
    nxt := case
      when kind = 'count' then coalesce((old.data ->> 'serverBefore')::numeric, cur)
      else greatest(0, cur - coalesce((old.data ->> 'applied')::numeric, 0))
    end;
  else
    return new;
  end if;

  perform set_config('stocknest.applying_movement', 'on', true);
  update public.records set data = jsonb_set(data, '{qty}', to_jsonb(nxt))
    where business_id = new.business_id and collection = 'products' and id = pid;
  perform set_config('stocknest.applying_movement', 'off', true);
  return new;
end $$;

drop trigger if exists apply_movement on public.records;
create trigger apply_movement before insert or update on public.records
  for each row execute function public.apply_movement();

-- A device updating a product (renaming it, changing its reorder point…) keeps the server's quantity
create or replace function public.keep_server_qty() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.collection = 'products' and old.data ? 'qty' and new.data is not null
     and coalesce(current_setting('stocknest.applying_movement', true), 'off') <> 'on' then
    new.data := jsonb_set(new.data, '{qty}', old.data -> 'qty');
  end if;
  return new;
end $$;

drop trigger if exists keep_server_qty on public.records;
create trigger keep_server_qty before update on public.records
  for each row execute function public.keep_server_qty();

-- ── Helpers ────────────────────────────────────────────────────────────────────────────────

-- The signed-in person's role in a business, or null if they aren't a member
create or replace function public.my_role(b uuid) returns public.member_role
language sql stable security definer set search_path = '' as $$
  select role from public.members where business_id = b and user_id = (select auth.uid())
$$;

-- True when the session has passed two-step login, or the person hasn't turned it on
create or replace function public.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
      or not exists (select 1 from auth.mfa_factors where user_id = (select auth.uid()) and status = 'verified')
$$;

-- ── Actions the app calls ──────────────────────────────────────────────────────────────────

-- Creates a business with the caller as its owner
create or replace function public.create_business(p_name text, p_member_name text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  b uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not public.mfa_ok() then raise exception 'Enter your two-step code first'; end if;
  insert into public.businesses (name, created_by) values (left(trim(p_name), 120), auth.uid()) returning id into b;
  insert into public.members (business_id, user_id, role, name, email)
  values (b, auth.uid(), 'Owner', left(trim(p_member_name), 120), coalesce(auth.jwt() ->> 'email', ''));
  return b;
end $$;

-- Joins every business that has invited the caller's (confirmed) email
create or replace function public.accept_invites() returns setof uuid
language plpgsql security definer set search_path = '' as $$
declare
  my_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or my_email = '' then return; end if;
  if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then return; end if;
  return query
    with joined as (
      insert into public.members (business_id, user_id, role, name, email)
      select i.business_id, auth.uid(), i.role, i.name, my_email from public.invites i where i.email = my_email
      on conflict (business_id, user_id) do nothing
      returning business_id
    ), cleared as (
      delete from public.invites i where i.email = my_email returning i.business_id
    )
    select business_id from joined;
end $$;

revoke all on function public.create_business(text, text) from public, anon;
revoke all on function public.accept_invites() from public, anon;
grant execute on function public.create_business(text, text) to authenticated;
grant execute on function public.accept_invites() to authenticated;
revoke all on function public.my_role(uuid) from public, anon;
revoke all on function public.mfa_ok() from public, anon;
grant execute on function public.my_role(uuid) to authenticated;
grant execute on function public.mfa_ok() to authenticated;

-- ── Row-level security ─────────────────────────────────────────────────────────────────────

alter table public.businesses enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.records enable row level security;

revoke all on public.businesses, public.members, public.invites, public.records from anon, public;
grant select, update on public.businesses to authenticated;
grant select, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.invites to authenticated;
grant select, insert, update on public.records to authenticated;

-- Businesses: members see them, owners and managers rename them
drop policy if exists "members see their business" on public.businesses;
create policy "members see their business" on public.businesses for select to authenticated
  using (public.my_role(id) is not null);
drop policy if exists "owners and managers rename" on public.businesses;
create policy "owners and managers rename" on public.businesses for update to authenticated
  using (public.my_role(id) in ('Owner', 'Manager')) with check (public.my_role(id) in ('Owner', 'Manager'));

-- Members: everyone in a business sees the team; only the owner changes roles or removes people;
-- anyone but the owner can leave
drop policy if exists "team is visible to the team" on public.members;
create policy "team is visible to the team" on public.members for select to authenticated
  using (public.my_role(business_id) is not null);
drop policy if exists "owner changes roles" on public.members;
create policy "owner changes roles" on public.members for update to authenticated
  using (public.my_role(business_id) = 'Owner' and role <> 'Owner')
  with check (public.my_role(business_id) = 'Owner' and role <> 'Owner');
drop policy if exists "owner removes people, people leave" on public.members;
create policy "owner removes people, people leave" on public.members for delete to authenticated
  using (role <> 'Owner' and (public.my_role(business_id) = 'Owner' or user_id = (select auth.uid())));

-- Invites: the owner manages them
drop policy if exists "owner manages invites" on public.invites;
create policy "owner manages invites" on public.invites for all to authenticated
  using (public.my_role(business_id) = 'Owner')
  with check (public.my_role(business_id) = 'Owner');

-- Records: every member reads and writes their business's data (the app limits what each role
-- can change on screen); nobody can move a record to another business
drop policy if exists "members read records" on public.records;
create policy "members read records" on public.records for select to authenticated
  using (public.my_role(business_id) is not null);
drop policy if exists "members add records" on public.records;
create policy "members add records" on public.records for insert to authenticated
  with check (public.my_role(business_id) is not null);
drop policy if exists "members change records" on public.records;
create policy "members change records" on public.records for update to authenticated
  using (public.my_role(business_id) is not null)
  with check (public.my_role(business_id) is not null);

-- Two-step login: once someone has turned it on, every table needs a session that used it
drop policy if exists "two-step login when turned on" on public.businesses;
create policy "two-step login when turned on" on public.businesses as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
drop policy if exists "two-step login when turned on" on public.members;
create policy "two-step login when turned on" on public.members as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
drop policy if exists "two-step login when turned on" on public.invites;
create policy "two-step login when turned on" on public.invites as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
drop policy if exists "two-step login when turned on" on public.records;
create policy "two-step login when turned on" on public.records as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
