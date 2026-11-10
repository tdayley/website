-- The draw: randomly assign each member someone to buy for.
--
-- It runs inside the database so that nobody, the organizer included, ever
-- handles the full list. Each person can read only their own row in
-- assignments (see the row-level security policy in the first migration).
--
-- Rules: nobody draws themselves, nobody draws someone they're excluded from
-- (in either direction), and everyone gives once and receives once.

-- Depth-first search with random choices. Fills in a receiver for each giver in
-- turn and backs up when it hits a dead end, so it finds a valid draw whenever
-- one exists and returns null only when none does.
-- receivers[i] is who givers[i] buys for.
create function public.draw_search(gid uuid, givers uuid[], receivers uuid[])
returns uuid[]
language plpgsql volatile security definer set search_path = ''
as $$
declare
	giver uuid;
	candidate uuid;
	result uuid[];
begin
	if coalesce(array_length(receivers, 1), 0) = array_length(givers, 1) then
		return receivers;
	end if;
	giver := givers[coalesce(array_length(receivers, 1), 0) + 1];

	for candidate in
		select u
		from unnest(givers) as u
		where u <> giver
			and u <> all (receivers)
			and not exists (
				select 1 from public.exclusions e
				where e.group_id = gid
					and ((e.user_a = giver and e.user_b = u) or (e.user_a = u and e.user_b = giver))
			)
		order by random()
	loop
		result := public.draw_search(gid, givers, receivers || candidate);
		if result is not null then
			return result;
		end if;
	end loop;

	return null;
end;
$$;

create function public.run_draw(gid uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
	g public.groups;
	givers uuid[];
	receivers uuid[];
begin
	if not public.is_group_organizer(gid) then
		raise exception 'Only the organizer can draw names';
	end if;

	-- Lock the group so two draws can't run at once.
	select * into g from public.groups where id = gid for update;
	if g.draw_completed_at is not null then
		raise exception 'Names have already been drawn';
	end if;

	-- The people with the most exclusions pick first, which keeps the search quick.
	select array_agg(m.user_id order by excl.n desc, random())
	into givers
	from public.memberships m
	cross join lateral (
		select count(*) as n from public.exclusions e
		where e.group_id = gid and m.user_id in (e.user_a, e.user_b)
	) excl
	where m.group_id = gid;

	if coalesce(array_length(givers, 1), 0) < 3 then
		raise exception 'At least 3 people are needed to draw names';
	end if;

	receivers := public.draw_search(gid, givers, '{}');
	if receivers is null then
		raise exception 'No valid draw is possible with these exclusions';
	end if;

	delete from public.assignments where group_id = gid;
	insert into public.assignments (group_id, giver_id, receiver_id)
	select gid, giver, receiver
	from unnest(givers, receivers) as t (giver, receiver);

	update public.groups set draw_completed_at = now() where id = gid;
end;
$$;

-- Undo the draw so the organizer can fix the group and draw again.
create function public.reset_draw(gid uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
	if not public.is_group_organizer(gid) then
		raise exception 'Only the organizer can reset the draw';
	end if;
	delete from public.assignments where group_id = gid;
	update public.groups set draw_completed_at = null where id = gid;
end;
$$;

revoke execute on function
	public.draw_search(uuid, uuid[], uuid[]),
	public.run_draw(uuid),
	public.reset_draw(uuid)
from public, anon, authenticated;

-- draw_search stays internal; only run_draw calls it.
grant execute on function public.run_draw(uuid), public.reset_draw(uuid) to authenticated;
