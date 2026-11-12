'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';

export async function signOut() {
	const base = await giftsBase();
	const supabase = await createClient();
	await supabase.auth.signOut();
	redirect(at(base, '/login'));
}

export async function updateDisplayName(formData: FormData) {
	const base = await giftsBase();
	const name = String(formData.get('display_name') ?? '').trim();
	if (name.length < 1 || name.length > 50) {
		redirect(at(base, '/?error=name'));
	}

	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const userId = data?.claims?.sub;
	if (!userId) {
		redirect(at(base, '/login'));
	}

	const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', userId);
	if (error) {
		console.error('updateDisplayName failed:', error.message);
		redirect(at(base, '/?error=save'));
	}
	revalidatePath('/gifts');
	redirect(at(base, '/?saved=1'));
}
