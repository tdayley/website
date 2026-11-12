// Where the Secret Santa app lives.
//
// By default it's under /gifts on the main site (timdayley.com/gifts/wishlist).
// When GIFTS_HOST is set (e.g. "gifts.timdayley.com"), requests to that host get the
// app at the top level instead (gifts.timdayley.com/wishlist). The pages themselves
// always live in app/gifts/...; proxy.ts maps the short addresses onto them.
//
// Every link and redirect in the app goes through at(base, '/wishlist') so it comes
// out right on either host.

export function giftsHost(): string | null {
	return (process.env.GIFTS_HOST ?? '').trim().toLowerCase() || null;
}

type HeaderGetter = (name: string) => string | null | undefined;

// True when this request came in on the Secret Santa subdomain. Hosting platforms
// differ in which header carries the public hostname, so both are checked.
export function isGiftsHost(get: HeaderGetter): boolean {
	const host = giftsHost();
	if (!host) return false;
	return ['x-forwarded-host', 'host'].some((name) => {
		const value = (get(name) ?? '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
		return value === host;
	});
}

export type GiftsBase = '' | '/gifts';

// at('/gifts', '/wishlist') -> '/gifts/wishlist';  at('', '/wishlist') -> '/wishlist'
// at('/gifts', '/')         -> '/gifts';           at('', '/')         -> '/'
// at('/gifts', '/?saved=1') -> '/gifts?saved=1';   at('', '/?saved=1') -> '/?saved=1'
export function at(base: string, path: string): string {
	if (path === '/' || path.startsWith('/?') || path.startsWith('/#')) {
		return (base || '/') + path.slice(1);
	}
	return base + path;
}

// The app's own address for a path, whichever way it was written: strips a leading /gifts.
export function stripGifts(path: string): string {
	if (path === '/gifts') return '/';
	return path.startsWith('/gifts/') || path.startsWith('/gifts?') ? path.slice('/gifts'.length) || '/' : path;
}
