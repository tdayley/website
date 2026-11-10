import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { NEXT_COOKIE, createClient, safeNextPath } from '@/lib/supabase/server';

// Magic links land here. Handles both link styles Supabase can send:
//   ?token_hash=...&type=email   (works even if the link is opened on another device)
//   ?code=...                    (Supabase's default; must be opened in the same browser)
export async function GET(request: NextRequest) {
	const params = request.nextUrl.searchParams;
	const next = safeNextPath(params.get('next') ?? request.cookies.get(NEXT_COOKIE)?.value);
	const tokenHash = params.get('token_hash');
	const type = params.get('type') as EmailOtpType | null;
	const code = params.get('code');

	const supabase = await createClient();
	let ok = false;

	if (tokenHash && type) {
		const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
		ok = !error;
	} else if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		ok = !error;
	}

	const target = request.nextUrl.clone();
	target.search = '';
	if (ok) {
		target.pathname = next.split('?')[0];
		target.search = next.includes('?') ? next.slice(next.indexOf('?')) : '';
	} else {
		target.pathname = '/gifts/login';
		target.searchParams.set('error', 'link');
	}
	const response = NextResponse.redirect(target);
	if (ok) {
		response.cookies.delete(NEXT_COOKIE);
	}
	return response;
}
