import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseEnv } from '@/lib/supabase/server';

// Runs before every /gifts request: refreshes the Supabase session cookie and
// sends signed-out visitors to the login page.
export async function proxy(request: NextRequest) {
	let response = NextResponse.next({ request });
	const { url, key } = supabaseEnv();

	const supabase = createServerClient(url, key, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet, headers) {
				cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
				response = NextResponse.next({ request });
				cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
				Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
			},
		},
	});

	const { data } = await supabase.auth.getClaims();
	const signedIn = Boolean(data?.claims?.sub);
	const path = request.nextUrl.pathname;

	if (!signedIn && path !== '/gifts/login') {
		const login = request.nextUrl.clone();
		login.pathname = '/gifts/login';
		login.search = '';
		login.searchParams.set('next', path + request.nextUrl.search);
		return NextResponse.redirect(login);
	}

	return response;
}

export const config = {
	matcher: ['/gifts', '/gifts/:path*'],
};
