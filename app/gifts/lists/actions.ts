'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { UUID } from '@/lib/wishlist';

// "I'm getting this" and its undo. The database decides who may do what:
// not your own items, one claim per item, and only your own claim can be undone.

export async function claimItem(itemId: string, listUserId: string): Promise<{ ok: boolean; taken?: boolean }> {
	if (!UUID.test(String(itemId)) || !UUID.test(String(listUserId))) return { ok: false };
	const supabase = await createClient();
	const { error } = await supabase.from('claims').insert({ item_id: itemId });
	revalidatePath(`/gifts/lists/${listUserId}`);
	if (error) {
		// 23505 = someone else claimed it a moment ago.
		if (error.code !== '23505') console.error('claimItem failed:', error.message);
		return { ok: false, taken: error.code === '23505' };
	}
	return { ok: true };
}

export async function unclaimItem(itemId: string, listUserId: string): Promise<{ ok: boolean }> {
	if (!UUID.test(String(itemId)) || !UUID.test(String(listUserId))) return { ok: false };
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) return { ok: false };
	const { error } = await supabase.from('claims').delete().eq('item_id', itemId).eq('claimed_by', me);
	revalidatePath(`/gifts/lists/${listUserId}`);
	if (error) console.error('unclaimItem failed:', error.message);
	return { ok: !error };
}
