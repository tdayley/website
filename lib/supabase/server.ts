import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function supabaseEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key) {
		throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
	}
	return { url, key };
}

// Supabase client for server components, server actions and route handlers.
// Create a new one per request.
export async function createClient() {
	const cookieStore = await cookies();
	const { url, key } = supabaseEnv();

	return createServerClient(url, key, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
				} catch {
					// Server components can't set cookies. The proxy refreshes the session instead.
				}
			},
		},
	});
}

// Only allow redirects to paths on this site, e.g. "/gifts", never "//evil.com".
export function safeNextPath(next: string | null | undefined, fallback = '/gifts') {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
		return fallback;
	}
	return next;
}
