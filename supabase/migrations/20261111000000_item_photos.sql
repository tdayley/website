-- Photos for wish list items, uploaded from a phone or computer.
--
-- Files live in a private Supabase Storage bucket, one folder per person:
--   item-photos/<user id>/<random id>.jpg
-- Access rules match wish lists: you can add and delete only your own photos,
-- and a photo can be viewed only by you and people who share an exchange with you.

alter table public.wishlist_items
	add column image_path text
		check (image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'),
	-- An item can only point at a photo in its owner's folder.
	add constraint wishlist_items_image_path_owner
		check (image_path is null or split_part(image_path, '/', 1) = user_id::text);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update
	set public = excluded.public,
		file_size_limit = excluded.file_size_limit,
		allowed_mime_types = excluded.allowed_mime_types;

-- Whose folder a stored file is in, or null if the path isn't "<user id>/<file>".
create function public.photo_owner(object_name text)
returns uuid
language sql immutable set search_path = ''
as $$
	select case
		when object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
		then split_part(object_name, '/', 1)::uuid
	end;
$$;

revoke execute on function public.photo_owner(text) from public, anon;
grant execute on function public.photo_owner(text) to authenticated;

create policy "See own item photos and those of people in your groups" on storage.objects
	for select to authenticated
	using (
		bucket_id = 'item-photos'
		and (
			public.photo_owner(name) = (select auth.uid())
			or public.shares_group_with(public.photo_owner(name))
		)
	);

create policy "Upload item photos to own folder" on storage.objects
	for insert to authenticated
	with check (bucket_id = 'item-photos' and public.photo_owner(name) = (select auth.uid()));

create policy "Delete own item photos" on storage.objects
	for delete to authenticated
	using (bucket_id = 'item-photos' and public.photo_owner(name) = (select auth.uid()));
