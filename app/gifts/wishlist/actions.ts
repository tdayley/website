'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { deletePhotos } from '@/lib/photos';
import { UUID, parseItemForm } from '@/lib/wishlist';

async function signedIn() {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const userId = data?.claims?.sub;
	if (!userId) redirect('/gifts/login');
	return { supabase, userId: userId as string };
}

// The database's access rules also enforce "your own items only"; the user_id
// filters here just keep the queries tight.

export async function addItem(formData: FormData) {
	const parsed = parseItemForm(formData);
	if (!parsed.ok) redirect(`/gifts/wishlist?error=${parsed.error}#add`);

	const { supabase, userId } = await signedIn();
	if (parsed.values.image_path && !parsed.values.image_path.startsWith(`${userId}/`)) redirect('/gifts/wishlist?error=photo#add');
	const { data: last } = await supabase
		.from('wishlist_items')
		.select('position')
		.eq('user_id', userId)
		.order('position', { ascending: false })
		.limit(1);
	const position = (last?.[0]?.position ?? -1) + 1;

	const { error } = await supabase.from('wishlist_items').insert({ ...parsed.values, position });
	if (error) {
		console.error('addItem failed:', error.message);
		redirect('/gifts/wishlist?error=save#add');
	}
	revalidatePath('/gifts/wishlist');
	redirect('/gifts/wishlist?added=1');
}

export async function updateItem(formData: FormData) {
	const id = String(formData.get('id') ?? '');
	if (!UUID.test(id)) redirect('/gifts/wishlist');

	const parsed = parseItemForm(formData);
	if (!parsed.ok) redirect(`/gifts/wishlist/${id}?error=${parsed.error}`);

	const { supabase, userId } = await signedIn();
	if (parsed.values.image_path && !parsed.values.image_path.startsWith(`${userId}/`)) redirect(`/gifts/wishlist/${id}?error=photo`);
	const { data: before } = await supabase.from('wishlist_items').select('image_path').eq('id', id).eq('user_id', userId).maybeSingle();
	const { error } = await supabase.from('wishlist_items').update(parsed.values).eq('id', id).eq('user_id', userId);
	if (error) {
		console.error('updateItem failed:', error.message);
		redirect(`/gifts/wishlist/${id}?error=save`);
	}
	// The old photo was replaced or taken off: delete the stored file.
	if (before?.image_path && before.image_path !== parsed.values.image_path) {
		await deletePhotos(supabase, [before.image_path]);
	}
	revalidatePath('/gifts/wishlist');
	redirect('/gifts/wishlist?saved=1');
}

// Called straight from the list (not a form): the screen has already updated,
// so these just save the change and refresh the page's data.

export async function removeItem(id: string) {
	if (!UUID.test(String(id))) return;
	const { supabase, userId } = await signedIn();
	const { data: before } = await supabase.from('wishlist_items').select('image_path').eq('id', id).eq('user_id', userId).maybeSingle();
	const { error } = await supabase.from('wishlist_items').delete().eq('id', id).eq('user_id', userId);
	if (error) console.error('removeItem failed:', error.message);
	else if (before?.image_path) await deletePhotos(supabase, [before.image_path]);
	revalidatePath('/gifts/wishlist');
}

export async function moveItem(id: string, direction: 'up' | 'down') {
	const step = direction === 'up' ? -1 : 1;

	const { supabase, userId } = await signedIn();
	const { data } = await supabase
		.from('wishlist_items')
		.select('id, position')
		.eq('user_id', userId)
		.order('position')
		.order('created_at');
	const items = data ?? [];
	const from = items.findIndex((i) => i.id === id);
	const to = from + step;

	if (from >= 0 && to >= 0 && to < items.length) {
		[items[from], items[to]] = [items[to], items[from]];
		// Renumber 0..n-1, writing only the rows whose position changed.
		const changed = items.map((item, index) => ({ item, index })).filter(({ item, index }) => item.position !== index);
		const results = await Promise.all(
			changed.map(({ item, index }) =>
				supabase.from('wishlist_items').update({ position: index }).eq('id', item.id).eq('user_id', userId),
			),
		);
		const failed = results.find((r) => r.error);
		if (failed) console.error('moveItem failed:', failed.error?.message);
	}
	revalidatePath('/gifts/wishlist');
}
