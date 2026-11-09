-- Acts as different people and checks what each can see and change. Any failure stops with an error.
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'alex@a.test', now()),
  ('00000000-0000-0000-0000-00000000000b', 'priya@a.test', now()),
  ('00000000-0000-0000-0000-00000000000c', 'mallory@b.test', now()),
  ('00000000-0000-0000-0000-00000000000d', 'unconfirmed@a.test', null);

create or replace function pg_temp.as_user(u text, email text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', u, 'email', email, 'aal', aal)::text, false) $$;

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- Alex creates a business and adds Priya as staff
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'alex@a.test');
set role authenticated;
insert into ids select 'alex_biz', public.create_business('Maple Street Bakery', 'Alex Moreau');
insert into public.invites (business_id, email, role, name) select id, 'priya@a.test', 'Staff', 'Priya' from ids where name = 'alex_biz';
insert into public.invites (business_id, email, role, name) select id, 'unconfirmed@a.test', 'Staff', 'U' from ids where name = 'alex_biz';
insert into public.records (business_id, collection, id, data, updated_at)
  select id, 'products', 'ING-0012', '{"name":"Flour","qty":6}', '2000-01-01' from ids where name = 'alex_biz';
do $$ begin
  assert (select count(*) from public.records) = 1, 'Alex sees his record';
  assert (select updated_at > '2020-01-01' from public.records), 'the server sets updated_at, not the device';
  assert (select updated_by = '00000000-0000-0000-0000-00000000000a' from public.records), 'the server records who changed it';
end $$;
reset role;

-- Mallory has her own business and must not see or touch Alex's
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'mallory@b.test');
set role authenticated;
insert into ids select 'mallory_biz', public.create_business('Other Shop', 'Mallory');
do $$ begin
  assert (select count(*) from public.records) = 0, 'Mallory sees no records from Alex';
  assert (select count(*) from public.businesses) = 1, 'Mallory sees only her business';
  assert (select count(*) from public.members) = 1, 'Mallory sees only her team';
  assert (select count(*) from public.invites) = 0, 'Mallory sees no invites from Alex';
end $$;
do $$ begin
  begin
    insert into public.records (business_id, collection, id, data) select id, 'products', 'X', '{}' from ids where name = 'alex_biz';
    raise exception 'FAIL: Mallory wrote into Alex''s business';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.records set data = '{"hacked":true}' where id = 'ING-0012';
do $$ begin
  begin
    insert into public.members (business_id, user_id, role) select id, '00000000-0000-0000-0000-00000000000c', 'Owner' from ids where name = 'alex_biz';
    raise exception 'FAIL: Mallory added herself to Alex''s team';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin assert (select data->>'name' from public.records where id = 'ING-0012') = 'Flour', 'Mallory''s update changed nothing'; end $$;

-- Priya joins through her invite and can record stock, but can't manage the team
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'priya@a.test');
set role authenticated;
do $$ begin assert (select count(*) from public.records) = 0, 'before joining, Priya sees nothing'; end $$;
select count(*) as joined from public.accept_invites();
do $$ begin
  assert (select count(*) from public.records) = 1, 'after joining, Priya sees the business data';
  assert (select role from public.members where user_id = auth.uid()) = 'Staff', 'Priya is staff';
end $$;
insert into public.records (business_id, collection, id, data) select id, 'movements', 'm1', '{"qty":2}' from ids where name = 'alex_biz';
update public.members set role = 'Manager' where user_id = auth.uid();
do $$ begin
  assert (select role from public.members where user_id = auth.uid()) = 'Staff', 'Priya cannot promote herself';
end $$;
do $$ begin
  begin
    delete from public.records;
    raise exception 'FAIL: records can be hard-deleted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- An unconfirmed email can't claim an invite
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d', 'unconfirmed@a.test');
set role authenticated;
do $$ begin assert (select count(*) from public.accept_invites()) = 0, 'unconfirmed emails cannot join'; end $$;
reset role;

-- Alex promotes Priya; nobody can make another owner or remove the owner
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'alex@a.test');
set role authenticated;
update public.members set role = 'Manager' where email = 'priya@a.test';
do $$ begin
  begin
    update public.members set role = 'Owner' where email = 'priya@a.test';
    raise exception 'FAIL: a second owner was made';
  exception when insufficient_privilege then null;
  end;
end $$;
delete from public.members where role = 'Owner';
do $$ begin
  assert (select role from public.members where email = 'priya@a.test') = 'Manager', 'owner promoted Priya to Manager, not Owner';
  assert (select count(*) from public.members where role = 'Owner') = 1, 'the owner cannot be removed';
  assert (select count(*) from public.records) = 2, 'Alex sees Priya''s movement';
end $$;
reset role;

-- Two-step login: once Alex turns it on, an aal1 session sees nothing until he enters a code
insert into auth.mfa_factors (user_id, status) values ('00000000-0000-0000-0000-00000000000a', 'verified');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'alex@a.test', 'aal1');
set role authenticated;
do $$ begin assert (select count(*) from public.records) = 0, 'aal1 session is locked out after MFA is on'; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'alex@a.test', 'aal2');
do $$ begin assert (select count(*) from public.records) = 2, 'aal2 session sees the data'; end $$;
reset role;

-- Signed-out visitors get nothing
set role anon;
do $$ begin
  begin
    perform count(*) from public.records;
    raise exception 'FAIL: anon can read records';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'ALL RLS CHECKS PASSED' as result;
