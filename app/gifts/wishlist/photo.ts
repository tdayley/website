'use server';

import { randomUUID } from 'node:crypto';
import { PHOTO_BUCKET, deletePhotos } from '@/lib/photos';
import { createClient } from '@/lib/supabase/server';

const MAX_BYTES = 2 * 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

type Result = { ok: true; path: string } | { ok: false; error: 'signin' | 'type' | 'size' | 'upload' };

// Receives a photo the browser has already shrunk to a JPEG, and stores it in the
// signed-in person's folder. The item form then saves the returned path with the item.
export async function uploadItemPhoto(formData: FormData): Promise<Result> {
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const userId = auth?.claims?.sub;
	if (!userId) return { ok: false, error: 'signin' };

	const file = formData.get('photo');
	if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'type' };
	if (file.size > MAX_BYTES) return { ok: false, error: 'size' };

	// Check the file really is a JPEG (they start with FF D8 FF), whatever it claims to be.
	const bytes = Buffer.from(await file.arrayBuffer());
	if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return { ok: false, error: 'type' };

	const path = `${userId}/${randomUUID()}.jpg`;
	const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000' });
	if (error) {
		console.error('uploadItemPhoto failed:', error.message);
		return { ok: false, error: 'upload' };
	}

	await sweepUnusedPhotos(supabase, userId, path);
	return { ok: true, path };
}

// Tidy up: photos that were uploaded but never saved with an item (the form was
// abandoned) are deleted once they're a day old.
async function sweepUnusedPhotos(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, keep: string) {
	try {
		const [{ data: files }, { data: items }] = await Promise.all([
			supabase.storage.from(PHOTO_BUCKET).list(userId, { limit: 200 }),
			supabase.from('wishlist_items').select('image_path').eq('user_id', userId).not('image_path', 'is', null),
		]);
		const used = new Set((items ?? []).map((i) => i.image_path as string));
		const stale = (files ?? [])
			.filter((f) => f.created_at && Date.now() - new Date(f.created_at).getTime() > DAY_MS)
			.map((f) => `${userId}/${f.name}`)
			.filter((p) => p !== keep && !used.has(p));
		await deletePhotos(supabase, stale);
	} catch (e) {
		console.error('sweepUnusedPhotos failed:', (e as Error).message);
	}
}
