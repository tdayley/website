import type { SupabaseClient } from '@supabase/supabase-js';
import type { WishlistItem } from '@/lib/wishlist';

export const PHOTO_BUCKET = 'item-photos';
const LINK_SECONDS = 60 * 60;

// The photo bucket is private, so pages show photos through short-lived links.
// Supabase only hands one out if the signed-in person is allowed to see the photo.
export async function withPhotoUrls(supabase: SupabaseClient, items: WishlistItem[]): Promise<WishlistItem[]> {
	const paths = items.map((i) => i.image_path).filter((p): p is string => Boolean(p));
	if (paths.length === 0) return items;

	const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, LINK_SECONDS);
	if (error) {
		console.error('createSignedUrls failed:', error.message);
		return items;
	}
	const links = new Map((data ?? []).filter((d) => d.signedUrl && !d.error).map((d) => [d.path, d.signedUrl]));
	return items.map((i) => (i.image_path ? { ...i, photo_url: links.get(i.image_path) ?? null } : i));
}

// Best effort: a leftover file is harmless, so failures are logged, not raised.
export async function deletePhotos(supabase: SupabaseClient, paths: string[]) {
	if (paths.length === 0) return;
	const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
	if (error) console.error('deletePhotos failed:', error.message);
}
