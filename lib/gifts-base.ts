import { headers } from 'next/headers';
import { at, isGiftsHost, type GiftsBase } from '@/lib/gifts-path';

// For server components and server actions: the prefix for this request's links.
export async function giftsBase(): Promise<GiftsBase> {
	const h = await headers();
	return isGiftsHost((name) => h.get(name)) ? '' : '/gifts';
}

// Shorthand for one-off use: redirect(await gp('/login')).
export async function gp(path: string): Promise<string> {
	return at(await giftsBase(), path);
}
