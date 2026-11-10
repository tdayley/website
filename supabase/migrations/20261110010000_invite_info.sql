-- What an invite link shows before you join: the group's name, organizer and date.
-- Non-members can't read groups directly (row-level security), so this looks the
-- group up by its invite code and returns only these few fields.

create function public.invite_info(code text)
returns table (
	group_id uuid,
	group_name text,
	organizer_name text,
	exchange_date date,
	already_member boolean,
	draw_done boolean
)
language sql stable security definer set search_path = ''
as $$
	select
		g.id,
		g.name,
		p.display_name,
		g.exchange_date,
		exists (
			select 1 from public.memberships m
			where m.group_id = g.id and m.user_id = (select auth.uid())
		),
		g.draw_completed_at is not null
	from public.groups g
	left join public.profiles p on p.id = g.created_by
	where g.invite_code = code
		and (select auth.uid()) is not null;
$$;

revoke execute on function public.invite_info(text) from public, anon;
grant execute on function public.invite_info(text) to authenticated;
