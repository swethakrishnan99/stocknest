-- Stock movements from two devices both count, and devices can't overwrite quantities
\set ON_ERROR_STOP on
set client_min_messages = warning;
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1', 'q@a.test', now()) on conflict do nothing;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"q@a.test","aal":"aal1"}', false);
set role authenticated;
create temp table b as select public.create_business('Qty test', 'Q') as id;

insert into public.records (business_id, collection, id, data) select id, 'products', 'P1', '{"name":"Flour","qty":10}' from b;
-- device A sells 3, device B (offline) received 5, both arrive
insert into public.records (business_id, collection, id, data) select id, 'movements', 'a1', '{"productId":"P1","kind":"out","qty":3}' from b;
insert into public.records (business_id, collection, id, data) select id, 'movements', 'b1', '{"productId":"P1","kind":"in","qty":5}' from b;
do $$ begin assert (select (data->>'qty')::int from public.records where id = 'P1') = 12, 'both movements count: 10 - 3 + 5 = 12'; end $$;

-- a device renames the product with its stale qty: name changes, qty stays
update public.records set data = '{"name":"Bread flour","qty":999}' where id = 'P1';
do $$ begin
  assert (select data->>'name' from public.records where id = 'P1') = 'Bread flour', 'rename applied';
  assert (select (data->>'qty')::int from public.records where id = 'P1') = 12, 'stale qty ignored';
end $$;

-- selling more than there is stops at zero, and undoing it puts back exactly what was taken
insert into public.records (business_id, collection, id, data) select id, 'movements', 'a2', '{"productId":"P1","kind":"out","qty":50}' from b;
do $$ begin assert (select (data->>'qty')::int from public.records where id = 'P1') = 0, 'never below zero'; end $$;
update public.records set deleted = true where id = 'a2';
do $$ begin assert (select (data->>'qty')::int from public.records where id = 'P1') = 12, 'undo restores exactly 12'; end $$;

-- a count sets the quantity, and undoing the count goes back to what it was
insert into public.records (business_id, collection, id, data) select id, 'movements', 'c1', '{"productId":"P1","kind":"count","qty":7}' from b;
do $$ begin assert (select (data->>'qty')::int from public.records where id = 'P1') = 7, 'count sets 7'; end $$;
update public.records set deleted = true where id = 'c1';
do $$ begin assert (select (data->>'qty')::int from public.records where id = 'P1') = 12, 'undoing the count gives 12 back'; end $$;

-- a movement for a product the server doesn't have yet is kept, and changes nothing else
insert into public.records (business_id, collection, id, data) select id, 'movements', 'x1', '{"productId":"NOPE","kind":"in","qty":1}' from b;
reset role;
select 'ALL QUANTITY CHECKS PASSED' as result;
