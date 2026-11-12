'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient, safeNextPath } from '@/lib/supabase/server';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';

export async function sendMagicLink(formData: FormData) {
	const base = await giftsBase();
	const email = String(formData.get('email') ?? '').trim();
	const next = safeNextPath(String(formData.get('next') ?? ''), at(base, '/'));
	const back = (params: Record<string, string>) =>
		redirect(at(base, `/login?${new URLSearchParams({ next, ...params })}`));

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		back({ error: 'email' });
	}

	const h = await headers();
	const host = h.get('x-forwarded-host') ?? h.get('host');
	const proto = h.get('x-forwarded-proto') ?? 'https';
	const origin = h.get('origin') ?? `${proto}://${host}`;

	const supabase = await createClient();
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
	});

	if (error) {
		console.error('signInWithOtp failed:', error.message);
		back({ error: error.status === 429 ? 'rate' : 'send' });
	}
	back({ sent: '1' });
}
