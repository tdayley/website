-- "I'm getting this": someone marks an item on another person's wish list as
-- bought, so two people don't buy the same thing.
--
-- The whole point is that the list's owner must not find out. So a claim is
-- visible to everyone who can see the item EXCEPT the item's owner, and that
-- is enforced here in the database, not just hidden on the page.

create table public.claims (
	-- One claim per item.
	item_id uuid primary key references public.wishlist_items (id) on delete cascade,
	claimed_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now()
);
create index claims_claimed_by_idx on public.claims (claimed_by);

-- True when the signed-in person may know about claims on this item: it's on
-- the list of someone they share an exchange with, and it isn't their own.
create function public.can_see_claims(item uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
	select exists (
		select 1 from public.wishlist_items i
		where i.id = item
			and i.user_id <> (select auth.uid())
			and public.shares_group_with(i.user_id)
	);
$$;

revoke execute on function public.can_see_claims(uuid) from public, anon;
grant execute on function public.can_see_claims(uuid) to authenticated;

alter table public.claims enable row level security;

create policy "See claims on other people's items, never your own" on public.claims
	for select to authenticated
	using (public.can_see_claims(item_id));

create policy "Claim an item on someone else's list" on public.claims
	for insert to authenticated
	with check (claimed_by = (select auth.uid()) and public.can_see_claims(item_id));

create policy "Undo your own claim" on public.claims
	for delete to authenticated
	using (claimed_by = (select auth.uid()));

-- No update policy: a claim is made or undone, never edited.
revoke update on public.claims from anon, authenticated;
