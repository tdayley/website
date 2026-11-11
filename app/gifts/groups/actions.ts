'use server';

import { redirect } from 'next/navigation';
import { notifyDrawn } from '@/lib/notifications';
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function groupIdFrom(formData: FormData) {
	const groupId = String(formData.get('group_id') ?? '');
	if (!UUID.test(groupId)) redirect('/gifts');
	return groupId;
}

// The database decides who may do these (organizer only, before the draw);
// these actions just pass the request along and report what happened.

export async function addExclusion(formData: FormData) {
	const groupId = groupIdFrom(formData);
	const a = String(formData.get('user_a') ?? '');
	const b = String(formData.get('user_b') ?? '');
	const back = (query: string) => redirect(`/gifts/groups/${groupId}?${query}#draw`);

	if (!UUID.test(a) || !UUID.test(b)) back('error=pick');
	if (a === b) back('error=same');

	const supabase = await createClient();
	const { error } = await supabase.from('exclusions').insert({ group_id: groupId, user_a: a, user_b: b });
	if (error) {
		if (error.code === '23505') back('error=duplicate');
		console.error('addExclusion failed:', error.message);
		back('error=exclusion');
	}
	back('notice=excluded');
}

export async function removeExclusion(formData: FormData) {
	const groupId = groupIdFrom(formData);
	const id = String(formData.get('id') ?? '');
	const supabase = await createClient();
	if (UUID.test(id)) {
		const { error } = await supabase.from('exclusions').delete().eq('id', id).eq('group_id', groupId);
		if (error) console.error('removeExclusion failed:', error.message);
	}
	redirect(`/gifts/groups/${groupId}#draw`);
}

export async function runDraw(formData: FormData) {
	const groupId = groupIdFrom(formData);
	const supabase = await createClient();
	const { error } = await supabase.rpc('run_draw', { gid: groupId });
	if (error) {
		console.error('runDraw failed:', error.message);
		const reason = /No valid draw/.test(error.message) ? 'impossible' : /At least 3/.test(error.message) ? 'few' : 'draw';
		redirect(`/gifts/groups/${groupId}?error=${reason}#draw`);
	}
	// Tell everyone by email (without saying who they got). Skipped if email isn't set up.
	const emailed = await notifyDrawn(groupId);
	redirect(`/gifts/groups/${groupId}?notice=${emailed > 0 ? 'drawn_emailed' : 'drawn'}`);
}

export async function resetDraw(formData: FormData) {
	const groupId = groupIdFrom(formData);
	const supabase = await createClient();
	const { error } = await supabase.rpc('reset_draw', { gid: groupId });
	if (error) {
		console.error('resetDraw failed:', error.message);
		redirect(`/gifts/groups/${groupId}?error=reset#draw`);
	}
	redirect(`/gifts/groups/${groupId}?notice=reset#draw`);
}
