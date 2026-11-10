'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut();
	redirect('/gifts/login');
}

export async function updateDisplayName(formData: FormData) {
	const name = String(formData.get('display_name') ?? '').trim();
	if (name.length < 1 || name.length > 50) {
		redirect('/gifts?error=name');
	}

	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const userId = data?.claims?.sub;
	if (!userId) {
		redirect('/gifts/login');
	}

	const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', userId);
	if (error) {
		console.error('updateDisplayName failed:', error.message);
		redirect('/gifts?error=save');
	}
	revalidatePath('/gifts');
	redirect('/gifts?saved=1');
}
