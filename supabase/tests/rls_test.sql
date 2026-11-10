\set ON_ERROR_STOP on
\set QUIET on
-- Users: alice (organizer), bob and carol (members), dave (outsider)
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','alice@example.com','{}'),
 ('00000000-0000-0000-0000-00000000000b','bob@example.com','{"display_name":"Bobby"}'),
 ('00000000-0000-0000-0000-00000000000c','carol@example.com','{}'),
 ('00000000-0000-0000-0000-00000000000d','dave@example.com','{}');

create function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAIL: %', msg; end if; raise notice 'ok   %', msg; end $$;
grant execute on function pg_temp.check(boolean, text) to authenticated, anon;

create function pg_temp.denied(stmt text, msg text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then raise notice 'ok   % (blocked: %)', msg, sqlerrm; return; end;
  raise exception 'FAIL: % was allowed', msg;
end $$;
grant execute on function pg_temp.denied(text, text) to authenticated, anon;

select pg_temp.check((select count(*) from public.profiles) = 4, 'profile auto-created for each new user');
select pg_temp.check((select display_name from public.profiles where id='00000000-0000-0000-0000-00000000000b') = 'Bobby', 'display_name from sign-up metadata');
select pg_temp.check((select display_name from public.profiles where id='00000000-0000-0000-0000-00000000000a') = 'alice', 'display_name defaults to email prefix');

-- Alice creates a group (insert ... returning must work)
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into public.groups (name, budget_cents) values ('Family 2026', 5000) returning id as gid, invite_code as gcode \gset
create temp table g as select :'gid'::uuid as id, :'gcode'::text as invite_code;
select pg_temp.check((select role from public.memberships where user_id = auth.uid()) = 'organizer', 'creator becomes organizer');
insert into public.wishlist_items (title, url) values ('Kayak paddle', 'https://example.com/paddle');

-- Bob and Carol join with the invite code; Dave does not
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select pg_temp.check((select count(*) from public.groups) = 0, 'non-member cannot see group before joining');
select public.join_group((select invite_code from g));
select public.join_group((select invite_code from g));
select pg_temp.check((select count(*) from public.memberships where user_id = auth.uid()) = 1, 'joining twice is harmless');
insert into public.wishlist_items (title) values ('Socks');
select pg_temp.denied($$select public.join_group('nope')$$, 'bad invite code');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select public.join_group((select invite_code from g));
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
insert into public.wishlist_items (title) values ('Outsider item');

-- Invite preview
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select pg_temp.check((select group_name from public.invite_info((select invite_code from g))) = 'Family 2026', 'outsider sees group name via invite code');
select pg_temp.check((select organizer_name from public.invite_info((select invite_code from g))) = 'alice', 'invite shows organizer name');
select pg_temp.check((select not already_member from public.invite_info((select invite_code from g))), 'invite says outsider is not yet a member');
select pg_temp.check((select count(*) from public.invite_info('wrong-code')) = 0, 'wrong invite code returns nothing');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select pg_temp.check((select already_member from public.invite_info((select invite_code from g))), 'invite says member is already in');

-- Visibility
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select pg_temp.check((select count(*) from public.groups) = 1, 'member sees the group');
select pg_temp.check((select count(*) from public.memberships) = 3, 'member sees all 3 members');
select pg_temp.check((select count(*) from public.profiles) = 3, 'member sees group profiles, not outsider');
select pg_temp.check((select count(*) from public.wishlist_items) = 2, 'member sees group wish lists, not outsider''s');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select pg_temp.check((select count(*) from public.groups) = 0, 'outsider sees no groups');
select pg_temp.check((select count(*) from public.profiles) = 1, 'outsider sees only own profile');
select pg_temp.check((select count(*) from public.wishlist_items) = 1, 'outsider sees only own list');
select pg_temp.check((select count(*) from public.memberships) = 0, 'outsider sees no memberships');

-- Writes that must be blocked
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select pg_temp.denied($$insert into public.wishlist_items (user_id, title) values ('00000000-0000-0000-0000-00000000000a','Fake')$$, 'add item to someone else''s list');
update public.wishlist_items set title = 'Hacked' where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select title from public.wishlist_items where user_id='00000000-0000-0000-0000-00000000000a') = 'Kayak paddle', 'cannot edit someone else''s item');
delete from public.wishlist_items where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select count(*) from public.wishlist_items where user_id='00000000-0000-0000-0000-00000000000a') = 1, 'cannot delete someone else''s item');
update public.profiles set display_name = 'Evil' where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select display_name from public.profiles where id='00000000-0000-0000-0000-00000000000a') = 'alice', 'cannot rename someone else');
update public.profiles set display_name = 'Bob D' where id = auth.uid();
select pg_temp.check((select display_name from public.profiles where id=auth.uid()) = 'Bob D', 'can rename self');
update public.groups set name = 'Mine now';
select pg_temp.check((select name from public.groups) = 'Family 2026', 'member cannot edit group');
select pg_temp.denied($$insert into public.memberships (group_id, user_id) values ((select id from g), '00000000-0000-0000-0000-00000000000d')$$, 'member adds someone directly');
update public.memberships set role = 'organizer' where user_id = auth.uid();
select pg_temp.check((select role from public.memberships where user_id = auth.uid()) = 'member', 'role unchanged');
select pg_temp.denied($$insert into public.exclusions (group_id, user_a, user_b) values ((select id from g), '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c')$$, 'member adds exclusion');
select pg_temp.denied($$insert into public.assignments (group_id, giver_id, receiver_id) values ((select id from g), auth.uid(), '00000000-0000-0000-0000-00000000000a')$$, 'member writes an assignment');

-- Organizer abilities
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
update public.groups set name = 'Dayley Family 2026', exchange_date = '2026-12-24';
select pg_temp.check((select name from public.groups) = 'Dayley Family 2026', 'organizer edits group');
select pg_temp.denied($$update public.groups set draw_completed_at = now()$$, 'organizer sets draw status directly');
insert into public.exclusions (group_id, user_a, user_b) values ((select id from g), '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c');
select pg_temp.denied($$insert into public.exclusions (group_id, user_a, user_b) values ((select id from g), '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b')$$, 'duplicate exclusion in reverse order');
select pg_temp.denied($$insert into public.exclusions (group_id, user_a, user_b) values ((select id from g), '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d')$$, 'exclusion with a non-member');
select pg_temp.denied($$insert into public.wishlist_items (title, url) values ('x', 'javascript:alert(1)')$$, 'non-http URL on an item');

-- Simulate the draw (as the database owner, like the future draw function) and check assignment privacy
reset role;
insert into public.assignments (group_id, giver_id, receiver_id) select id, '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b' from g;
insert into public.assignments (group_id, giver_id, receiver_id) select id, '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a' from g;
insert into public.assignments (group_id, giver_id, receiver_id) select id, '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a' from g on conflict do nothing;
update public.groups set draw_completed_at = now();
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select pg_temp.check((select count(*) from public.assignments) = 1, 'organizer sees only own assignment');
select pg_temp.check((select receiver_id from public.assignments) = '00000000-0000-0000-0000-00000000000b', 'organizer sees who they are buying for');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select pg_temp.check((select count(*) from public.assignments) = 1, 'member sees only own assignment');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select pg_temp.denied($$select public.join_group((select invite_code from g))$$, 'joining after the draw');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
delete from public.memberships where user_id = auth.uid();
select pg_temp.check((select count(*) from public.memberships where user_id = auth.uid()) = 1, 'cannot leave after the draw');

-- Signed-out visitors (anon role) see nothing
set role anon;
select set_config('request.jwt.claim.sub','',false);
select pg_temp.check((select count(*) from public.profiles) + (select count(*) from public.groups) + (select count(*) from public.wishlist_items) + (select count(*) from public.assignments) = 0, 'signed-out visitor sees nothing');
select pg_temp.denied($$select public.join_group('x')$$, 'signed-out visitor calls join_group');
select pg_temp.denied($$select * from public.invite_info('x')$$, 'signed-out visitor calls invite_info');
\echo ALL TESTS PASSED
