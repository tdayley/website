import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { NEXT_COOKIE, supabaseEnv } from '@/lib/supabase/server';

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
		const redirect = NextResponse.redirect(login);
		// Also remember the page in a cookie: the sign-in email's link may not carry
		// "next" (e.g. a custom email template), and /auth/confirm falls back to this.
		// Only for real page visits: Next.js preloads links in the background, and
		// those requests must not overwrite the page the person actually asked for.
		const h = request.headers;
		const background = h.has('next-router-prefetch') || h.has('rsc') || h.get('purpose') === 'prefetch' || (h.get('sec-fetch-mode') ?? 'navigate') !== 'navigate';
		if (!background) {
			redirect.cookies.set(NEXT_COOKIE, path + request.nextUrl.search, {
				httpOnly: true,
				sameSite: 'lax',
				secure: request.nextUrl.protocol === 'https:',
				path: '/',
				maxAge: 60 * 60,
			});
		}
		return redirect;
	}

	return response;
}

export const config = {
	matcher: ['/gifts', '/gifts/:path*'],
};
