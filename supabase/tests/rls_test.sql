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

-- Item photos (storage). At this point alice, bob and carol share a group; dave is an outsider.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into storage.objects (bucket_id, name) values ('item-photos', '00000000-0000-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111.jpg');
select pg_temp.check((select count(*) from storage.objects) = 1, 'owner can upload and see own photo');
select pg_temp.denied($$insert into storage.objects (bucket_id, name) values ('item-photos', '00000000-0000-0000-0000-00000000000b/22222222-2222-2222-2222-222222222222.jpg')$$, 'upload into someone else''s folder');
select pg_temp.denied($$insert into storage.objects (bucket_id, name) values ('item-photos', 'loose-file.jpg')$$, 'upload outside any folder');
select pg_temp.denied($$insert into storage.objects (bucket_id, name) values ('other-bucket', '00000000-0000-0000-0000-00000000000a/x.jpg')$$, 'upload to another bucket');
update public.wishlist_items set image_path = '00000000-0000-0000-0000-00000000000a/11111111-1111-1111-1111-111111111111.jpg' where user_id = auth.uid();
select pg_temp.check((select image_path is not null from public.wishlist_items where user_id = auth.uid()), 'item can point at own photo');
select pg_temp.denied($$update public.wishlist_items set image_path = '00000000-0000-0000-0000-00000000000b/22222222-2222-2222-2222-222222222222.jpg' where user_id = auth.uid()$$, 'item pointing at a photo in someone else''s folder');
select pg_temp.denied($$update public.wishlist_items set image_path = '../etc/passwd' where user_id = auth.uid()$$, 'item with a malformed photo path');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select pg_temp.check((select count(*) from storage.objects) = 1, 'group member can see the photo');
delete from storage.objects;
select pg_temp.check((select count(*) from storage.objects) = 1, 'group member cannot delete someone else''s photo');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select pg_temp.check((select count(*) from storage.objects) = 0, 'outsider cannot see the photo');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
delete from storage.objects where name like '00000000-0000-0000-0000-00000000000a/%';
select pg_temp.check((select count(*) from storage.objects) = 0, 'owner can delete own photo');
update public.wishlist_items set image_path = null where user_id = auth.uid();

-- Claims ("I'm getting this"). alice, bob, carol share a group; dave is an outsider.
-- alice's list has 'Kayak paddle'; bob's has 'Socks'; dave's has 'Outsider item'.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
insert into public.claims (item_id) select id from public.wishlist_items where title = 'Kayak paddle';
select pg_temp.check((select count(*) from public.claims) = 1, 'member claims an item on someone else''s list and sees the claim');
select pg_temp.denied($$insert into public.claims (item_id) select id from public.wishlist_items where title = 'Socks'$$, 'claiming an item on your own list');
select pg_temp.denied($$insert into public.claims (item_id, claimed_by) select id, '00000000-0000-0000-0000-00000000000c' from public.wishlist_items where title = 'Kayak paddle'$$, 'claiming on someone else''s behalf');
select pg_temp.denied($$insert into public.claims (item_id) values ((select id from public.wishlist_items where user_id = '00000000-0000-0000-0000-00000000000d'))$$, 'claiming an outsider''s item (not visible)');
select pg_temp.denied($$update public.claims set claimed_by = '00000000-0000-0000-0000-00000000000c'$$, 'editing a claim');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select pg_temp.check((select count(*) from public.claims) = 0, 'the list owner cannot see claims on their own items');
select pg_temp.denied($$insert into public.claims (item_id) select id from public.wishlist_items where title = 'Kayak paddle'$$, 'owner probing whether their own item is claimed (insert)');
delete from public.claims;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
select pg_temp.check((select count(*) from public.claims) = 1, 'another member sees the claim (owner could not delete it)');
select pg_temp.check((select claimed_by from public.claims) = '00000000-0000-0000-0000-00000000000b', 'another member sees who claimed it');
select pg_temp.denied($$insert into public.claims (item_id) select id from public.wishlist_items where title = 'Kayak paddle'$$, 'claiming an item someone already claimed');
delete from public.claims;
select pg_temp.check((select count(*) from public.claims) = 1, 'cannot undo someone else''s claim');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false);
select pg_temp.check((select count(*) from public.claims) = 0, 'outsider cannot see claims');
select pg_temp.denied($$insert into public.claims (item_id) values ((select item_id from public.claims limit 1))$$, 'outsider cannot claim');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
delete from public.claims;
select pg_temp.check((select count(*) from public.claims) = 0, 'claimer can undo their own claim');
insert into public.claims (item_id) select id from public.wishlist_items where title = 'Kayak paddle';
reset role;
delete from public.wishlist_items where title = 'Kayak paddle';
select pg_temp.check((select count(*) from public.claims) = 0, 'claim disappears when the item is deleted');
insert into public.wishlist_items (user_id, title, url) values ('00000000-0000-0000-0000-00000000000a', 'Kayak paddle', 'https://example.com/paddle');
set role authenticated;

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

-- The real draw. At this point group g is locked by the simulated draw above,
-- has members alice (organizer), bob, carol, and bob-carol are excluded.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select pg_temp.denied($$select public.reset_draw((select id from g))$$, 'member resets the draw');
select pg_temp.denied($$select public.draw_search((select id from g), '{}', '{}')$$, 'calling the internal search function directly');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select pg_temp.denied($$select public.run_draw((select id from g))$$, 'drawing twice without a reset');
select public.reset_draw((select id from g));
select pg_temp.check((select draw_completed_at is null from public.groups), 'reset reopens the exchange');
select pg_temp.check((select count(*) from public.assignments) = 0, 'reset clears assignments');
select pg_temp.denied($$select public.run_draw((select id from g))$$, 'draw that exclusions make impossible (bob and carol could only both buy for alice)');
select pg_temp.check((select draw_completed_at is null from public.groups), 'failed draw leaves the exchange open');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
select pg_temp.denied($$select public.run_draw((select id from g))$$, 'member runs the draw');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
delete from public.exclusions;
select public.run_draw((select id from g));
select pg_temp.check((select draw_completed_at is not null from public.groups), 'draw locks the exchange');
select pg_temp.check((select count(*) from public.assignments) = 1, 'after the real draw, organizer still sees only own assignment');
select pg_temp.check((select receiver_id <> auth.uid() from public.assignments), 'organizer did not draw themselves');
select pg_temp.denied($$insert into public.exclusions (group_id, user_a, user_b) values ((select id from g), '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c')$$, 'adding an exclusion after the draw');

-- Many draws, checked with full visibility (as the database owner): 2 members is too few;
-- then 4 members with alice-bob excluded, and 6 members as three couples, 40 draws each.
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
do $$
declare
	gid uuid := (select id from g);
	other uuid;
	i int;
	bad int;
	seen text[] := '{}';
begin
	perform public.reset_draw(gid);

	delete from public.memberships where group_id = gid and user_id = '00000000-0000-0000-0000-00000000000c';
	begin
		perform public.run_draw(gid);
		raise exception 'FAIL: draw with 2 people was allowed';
	exception when others then
		if sqlerrm like 'FAIL%' then raise; end if;
		raise notice 'ok   draw with 2 people (blocked: %)', sqlerrm;
	end;
	insert into public.memberships (group_id, user_id) values (gid, '00000000-0000-0000-0000-00000000000c'), (gid, '00000000-0000-0000-0000-00000000000d');
	insert into public.exclusions (group_id, user_a, user_b) values (gid, '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

	for round in 1..2 loop
		if round = 2 then
			insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e', 'erin@example.com'), ('00000000-0000-0000-0000-00000000000f', 'frank@example.com');
			insert into public.memberships (group_id, user_id) values (gid, '00000000-0000-0000-0000-00000000000e'), (gid, '00000000-0000-0000-0000-00000000000f');
			insert into public.exclusions (group_id, user_a, user_b) values
				(gid, '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d'),
				(gid, '00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000f');
		end if;
		for i in 1..40 loop
			perform public.run_draw(gid);
			select count(*) into bad from public.memberships m
			where m.group_id = gid and (
				(select count(*) from public.assignments a where a.group_id = gid and a.giver_id = m.user_id) <> 1
				or (select count(*) from public.assignments a where a.group_id = gid and a.receiver_id = m.user_id) <> 1);
			if bad > 0 then raise exception 'FAIL: someone does not give once and receive once'; end if;
			if exists (select 1 from public.assignments a where a.group_id = gid and a.giver_id = a.receiver_id) then
				raise exception 'FAIL: someone drew themselves';
			end if;
			if exists (select 1 from public.assignments a join public.exclusions e on e.group_id = a.group_id
				and ((e.user_a = a.giver_id and e.user_b = a.receiver_id) or (e.user_b = a.giver_id and e.user_a = a.receiver_id))
				where a.group_id = gid) then
				raise exception 'FAIL: an excluded pair was drawn';
			end if;
			select receiver_id into other from public.assignments where group_id = gid and giver_id = '00000000-0000-0000-0000-00000000000a';
			if not other::text = any (seen) then seen := seen || other::text; end if;
			perform public.reset_draw(gid);
		end loop;
		raise notice 'ok   40 draws with % members: everyone gives and receives once, no self-draws, exclusions respected',
			(select count(*) from public.memberships where group_id = gid);
	end loop;
	if array_length(seen, 1) < 3 then raise exception 'FAIL: draws are not random (alice only ever drew %)', seen; end if;
	raise notice 'ok   draws vary between runs (alice drew % different people)', array_length(seen, 1);
	perform public.run_draw(gid);
end $$;

-- Signed-out visitors (anon role) see nothing
set role anon;
select set_config('request.jwt.claim.sub','',false);
select pg_temp.check((select count(*) from public.profiles) + (select count(*) from public.groups) + (select count(*) from public.wishlist_items) + (select count(*) from public.assignments) = 0, 'signed-out visitor sees nothing');
select pg_temp.denied($$select public.join_group('x')$$, 'signed-out visitor calls join_group');
select pg_temp.denied($$select * from public.invite_info('x')$$, 'signed-out visitor calls invite_info');
select pg_temp.check((select count(*) from storage.objects) = 0, 'signed-out visitor sees no photos');
select pg_temp.check((select count(*) from public.claims) = 0, 'signed-out visitor sees no claims');
select pg_temp.denied($$insert into storage.objects (bucket_id, name) values ('item-photos', '00000000-0000-0000-0000-00000000000a/33333333-3333-3333-3333-333333333333.jpg')$$, 'signed-out visitor uploads a photo');
\echo ALL TESTS PASSED
