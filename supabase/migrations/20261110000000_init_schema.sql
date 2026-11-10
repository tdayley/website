-- Gift exchange schema: profiles, groups, memberships, wishlist_items, exclusions, assignments.
--
-- Access rules (row-level security):
--   * You see profiles and wish lists only for people who share a group with you.
--   * You see a group, its members and its exclusions only if you belong to it.
--   * You see only your own assignment (who you're buying for). Nobody else can, organizer included.
--   * You join a group only through join_group(invite_code).
--   * Assignments are written only by the draw function (a later migration), never directly.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text not null check (char_length(display_name) between 1 and 50),
	created_at timestamptz not null default now()
);

create table public.groups (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(name) between 1 and 100),
	budget_cents integer check (budget_cents >= 0),
	exchange_date date,
	invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
	created_by uuid not null default auth.uid() references public.profiles (id),
	draw_completed_at timestamptz,
	created_at timestamptz not null default now()
);

create table public.memberships (
	group_id uuid not null references public.groups (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	role text not null default 'member' check (role in ('organizer', 'member')),
	joined_at timestamptz not null default now(),
	primary key (group_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

-- A wish list belongs to a person and is visible in every group they're in.
create table public.wishlist_items (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
	title text not null check (char_length(title) between 1 and 200),
	url text check (url ~* '^https?://'),
	image_url text check (image_url ~* '^https?://'),
	price_cents integer check (price_cents >= 0),
	notes text check (char_length(notes) <= 1000),
	position integer not null default 0,
	created_at timestamptz not null default now()
);
create index wishlist_items_user_id_idx on public.wishlist_items (user_id, position);

-- Pairs who must not draw each other (in either direction), e.g. spouses.
create table public.exclusions (
	id uuid primary key default gen_random_uuid(),
	group_id uuid not null,
	user_a uuid not null,
	user_b uuid not null,
	created_at timestamptz not null default now(),
	check (user_a <> user_b),
	foreign key (group_id, user_a) references public.memberships (group_id, user_id) on delete cascade,
	foreign key (group_id, user_b) references public.memberships (group_id, user_id) on delete cascade
);
create unique index exclusions_pair_idx
	on public.exclusions (group_id, least(user_a, user_b), greatest(user_a, user_b));

create table public.assignments (
	group_id uuid not null,
	giver_id uuid not null,
	receiver_id uuid not null,
	created_at timestamptz not null default now(),
	primary key (group_id, giver_id),
	unique (group_id, receiver_id),
	check (giver_id <> receiver_id),
	foreign key (group_id, giver_id) references public.memberships (group_id, user_id) on delete cascade,
	foreign key (group_id, receiver_id) references public.memberships (group_id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Helper functions for policies. SECURITY DEFINER so policies on memberships
-- can check membership without recursing into their own policy.
-- ---------------------------------------------------------------------------

create function public.is_group_member(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.memberships
		where group_id = gid and user_id = (select auth.uid())
	);
$$;

create function public.is_group_organizer(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.memberships
		where group_id = gid and user_id = (select auth.uid()) and role = 'organizer'
	);
$$;

create function public.shares_group_with(other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1
		from public.memberships mine
		join public.memberships theirs on theirs.group_id = mine.group_id
		where mine.user_id = (select auth.uid()) and theirs.user_id = other
	);
$$;

create function public.draw_is_open(gid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.groups where id = gid and draw_completed_at is null
	);
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile the first time someone signs in. Display name defaults to
-- the part of their email before the @; they can change it in the app.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	insert into public.profiles (id, display_name)
	values (
		new.id,
		left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Guest'), 50)
	);
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();

-- Whoever creates a group becomes its organizer.
create function public.handle_new_group()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
	insert into public.memberships (group_id, user_id, role)
	values (new.id, new.created_by, 'organizer');
	return new;
end;
$$;

create trigger on_group_created
	after insert on public.groups
	for each row execute function public.handle_new_group();

-- ---------------------------------------------------------------------------
-- Joining a group by invite code
-- ---------------------------------------------------------------------------

create function public.join_group(code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
	g public.groups;
begin
	if (select auth.uid()) is null then
		raise exception 'Not signed in';
	end if;

	select * into g from public.groups where invite_code = code;
	if not found then
		raise exception 'Invite link is not valid';
	end if;
	if g.draw_completed_at is not null then
		raise exception 'This exchange has already been drawn';
	end if;

	insert into public.memberships (group_id, user_id)
	values (g.id, (select auth.uid()))
	on conflict do nothing;

	return g.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function permissions: signed-in users only.
-- ---------------------------------------------------------------------------

revoke execute on function
	public.is_group_member(uuid),
	public.is_group_organizer(uuid),
	public.shares_group_with(uuid),
	public.draw_is_open(uuid),
	public.join_group(text),
	public.handle_new_user(),
	public.handle_new_group()
from public, anon;

grant execute on function
	public.is_group_member(uuid),
	public.is_group_organizer(uuid),
	public.shares_group_with(uuid),
	public.draw_is_open(uuid),
	public.join_group(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.exclusions enable row level security;
alter table public.assignments enable row level security;

-- profiles
create policy "See own profile and people in your groups" on public.profiles
	for select to authenticated
	using (id = (select auth.uid()) or public.shares_group_with(id));

create policy "Edit own profile" on public.profiles
	for update to authenticated
	using (id = (select auth.uid()))
	with check (id = (select auth.uid()));

-- groups
-- created_by is included so insert ... returning works: the organizer membership
-- is added by an AFTER trigger, which runs after the returned row is checked.
create policy "Members see their groups" on public.groups
	for select to authenticated
	using (public.is_group_member(id) or created_by = (select auth.uid()));

create policy "Signed-in users create groups" on public.groups
	for insert to authenticated
	with check (created_by = (select auth.uid()) and draw_completed_at is null);

create policy "Organizers edit their groups" on public.groups
	for update to authenticated
	using (public.is_group_organizer(id))
	with check (public.is_group_organizer(id));

create policy "Organizers delete their groups" on public.groups
	for delete to authenticated
	using (public.is_group_organizer(id));

-- Organizers may only change these columns directly; the draw status is set by the draw function.
revoke update on public.groups from anon, authenticated;
grant update (name, budget_cents, exchange_date) on public.groups to authenticated;

-- memberships (rows are added by the group trigger and join_group, never directly)
create policy "Members see who is in their groups" on public.memberships
	for select to authenticated
	using (public.is_group_member(group_id));

create policy "Leave a group, or organizer removes someone, before the draw" on public.memberships
	for delete to authenticated
	using (
		public.draw_is_open(group_id)
		and role = 'member'
		and (user_id = (select auth.uid()) or public.is_group_organizer(group_id))
	);

-- wishlist_items
create policy "See own list and lists of people in your groups" on public.wishlist_items
	for select to authenticated
	using (user_id = (select auth.uid()) or public.shares_group_with(user_id));

create policy "Add to own list" on public.wishlist_items
	for insert to authenticated
	with check (user_id = (select auth.uid()));

create policy "Edit own list" on public.wishlist_items
	for update to authenticated
	using (user_id = (select auth.uid()))
	with check (user_id = (select auth.uid()));

create policy "Delete from own list" on public.wishlist_items
	for delete to authenticated
	using (user_id = (select auth.uid()));

-- exclusions
create policy "Members see their group's exclusions" on public.exclusions
	for select to authenticated
	using (public.is_group_member(group_id));

create policy "Organizers add exclusions before the draw" on public.exclusions
	for insert to authenticated
	with check (public.is_group_organizer(group_id) and public.draw_is_open(group_id));

create policy "Organizers remove exclusions before the draw" on public.exclusions
	for delete to authenticated
	using (public.is_group_organizer(group_id) and public.draw_is_open(group_id));

-- assignments: you see only who you're buying for. No insert/update/delete policies.
create policy "See only your own assignment" on public.assignments
	for select to authenticated
	using (giver_id = (select auth.uid()));
