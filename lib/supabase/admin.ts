import { createClient } from '@supabase/supabase-js';

// A Supabase client that uses the project's SECRET key and so bypasses the
// access rules. Server-only, and only for the email jobs, which need people's
// email addresses and run without anyone signed in. Returns null if the key
// isn't configured, so callers can skip their work instead of failing.
export function createAdminClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SECRET_KEY;
	if (!url || !key) return null;
	return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
