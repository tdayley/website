'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
	const { error } = await supabase.from('wishlist_items').update(parsed.values).eq('id', id).eq('user_id', userId);
	if (error) {
		console.error('updateItem failed:', error.message);
		redirect(`/gifts/wishlist/${id}?error=save`);
	}
	revalidatePath('/gifts/wishlist');
	redirect('/gifts/wishlist?saved=1');
}

export async function deleteItem(formData: FormData) {
	const id = String(formData.get('id') ?? '');
	if (!UUID.test(id)) redirect('/gifts/wishlist');

	const { supabase, userId } = await signedIn();
	const { error } = await supabase.from('wishlist_items').delete().eq('id', id).eq('user_id', userId);
	if (error) console.error('deleteItem failed:', error.message);
	revalidatePath('/gifts/wishlist');
	redirect('/gifts/wishlist?deleted=1');
}

export async function moveItem(formData: FormData) {
	const id = String(formData.get('id') ?? '');
	const step = formData.get('direction') === 'up' ? -1 : 1;

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
	redirect('/gifts/wishlist');
}
