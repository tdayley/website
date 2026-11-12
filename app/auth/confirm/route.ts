import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { NEXT_COOKIE, createClient, safeNextPath } from '@/lib/supabase/server';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';

// Magic links land here. Handles both link styles Supabase can send:
//   ?token_hash=...&type=email   (works even if the link is opened on another device)
//   ?code=...                    (Supabase's default; must be opened in the same browser)
export async function GET(request: NextRequest) {
	const base = await giftsBase();
	const params = request.nextUrl.searchParams;
	const next = safeNextPath(params.get('next') ?? request.cookies.get(NEXT_COOKIE)?.value, at(base, '/'));
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

	const location = ok ? next : at(base, '/login?error=link');
	// Send only the path, so the browser stays on the domain it used. Behind Amplify,
	// the server sees requests as localhost:3000, so a full URL built from the request
	// would send people there.
	const response = new NextResponse(null, { status: 303, headers: { Location: location } });
	if (ok) {
		response.cookies.delete(NEXT_COOKIE);
	}
	return response;
}
