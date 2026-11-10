'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createGroup(formData: FormData) {
	const name = String(formData.get('name') ?? '').trim();
	const budgetText = String(formData.get('budget') ?? '').trim().replace(/^\$/, '');
	const date = String(formData.get('exchange_date') ?? '').trim();

	const fail = (error: string) => redirect(`/gifts/new?error=${error}`);

	if (name.length < 1 || name.length > 100) fail('name');

	let budgetCents: number | null = null;
	if (budgetText) {
		const dollars = Number(budgetText);
		if (!Number.isFinite(dollars) || dollars < 0 || dollars > 100000) fail('budget');
		budgetCents = Math.round(dollars * 100);
	}

	if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('date');

	const supabase = await createClient();
	const { data, error } = await supabase
		.from('groups')
		.insert({ name, budget_cents: budgetCents, exchange_date: date || null })
		.select('id')
		.single();

	if (error || !data) {
		console.error('createGroup failed:', error?.message);
		fail('save');
	}
	redirect(`/gifts/groups/${data!.id}`);
}

export async function joinGroup(formData: FormData) {
	const code = String(formData.get('code') ?? '');
	const supabase = await createClient();
	const { data, error } = await supabase.rpc('join_group', { code });

	if (error || !data) {
		console.error('joinGroup failed:', error?.message);
		redirect(`/gifts/join/${encodeURIComponent(code)}?error=1`);
	}
	redirect(`/gifts/groups/${data}?joined=1`);
}
