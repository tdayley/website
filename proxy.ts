import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { at, giftsHost, isGiftsHost, stripGifts } from '@/lib/gifts-path';
import { NEXT_COOKIE, supabaseEnv } from '@/lib/supabase/server';

// Runs before requests reach the pages. It does three things for the Secret Santa app:
//   1. Refreshes the Supabase session cookie.
//   2. Sends signed-out visitors to the login page.
//   3. On the Secret Santa subdomain (GIFTS_HOST), maps short addresses such as
//      /wishlist onto the pages, which live under /gifts.
// Everything else (the main homepage, /auth, /api) passes straight through.
export async function proxy(request: NextRequest) {
	const path = request.nextUrl.pathname;
	const search = request.nextUrl.search;
	const onGiftsHost = isGiftsHost((name) => request.headers.get(name));
	const underGifts = path === '/gifts' || path.startsWith('/gifts/');

	if (onGiftsHost) {
		// Not part of the app's pages: sign-in confirmation and the reminder job.
		if (path.startsWith('/auth/') || path.startsWith('/api/')) return NextResponse.next({ request });
		// Old-style address on the new host: forward to the short one.
		if (underGifts) return redirectTo(request, stripGifts(path) + search);
	} else {
		if (!underGifts) return NextResponse.next({ request });
		// Stage 2 of the move: the old address forwards to the subdomain.
		const host = giftsHost();
		if (host && process.env.GIFTS_REDIRECT_OLD === '1') {
			return NextResponse.redirect(`https://${host}${stripGifts(path)}${search}`, 307);
		}
	}

	// From here on this is a Secret Santa page. `base` is how its links are written
	// on this host, `appPath` is the address without that prefix, and `page` is where
	// the page actually lives.
	const base = onGiftsHost ? '' : '/gifts';
	const appPath = onGiftsHost ? path : stripGifts(path);
	const page = at('/gifts', appPath);

	const pass = () => {
		if (!onGiftsHost) return NextResponse.next({ request });
		const target = request.nextUrl.clone();
		target.pathname = page;
		return NextResponse.rewrite(target, { request });
	};

	let response = pass();
	const { url, key } = supabaseEnv();
	const supabase = createServerClient(url, key, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet, headers) {
				cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
				response = pass();
				cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
				Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
			},
		},
	});

	const { data } = await supabase.auth.getClaims();
	const signedIn = Boolean(data?.claims?.sub);

	if (!signedIn && appPath !== '/login') {
		const wanted = at(base, appPath) + search;
		const redirect = redirectTo(request, `${at(base, '/login')}?next=${encodeURIComponent(wanted)}`);
		// Also remember the page in a cookie: the sign-in email's link may not carry
		// "next" (e.g. a custom email template), and /auth/confirm falls back to this.
		// Only for real page visits: Next.js preloads links in the background, and
		// those requests must not overwrite the page the person actually asked for.
		const h = request.headers;
		const background = h.has('next-router-prefetch') || h.has('rsc') || h.get('purpose') === 'prefetch' || (h.get('sec-fetch-mode') ?? 'navigate') !== 'navigate';
		if (!background) {
			redirect.cookies.set(NEXT_COOKIE, wanted, {
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

// Redirect to a path on the same host. Next.js sends same-site redirects from here
// as a path only, so the browser stays on the domain it used (behind Amplify the
// server sees requests as localhost:3000).
function redirectTo(request: NextRequest, location: string) {
	return NextResponse.redirect(new URL(location, request.url), 307);
}

export const config = {
	// Everything except Next.js internals and files (anything ending in ".ext").
	matcher: ['/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)'],
};
