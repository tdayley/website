'use server';

import { getLinkPreview, type LinkPreview } from '@/lib/link-preview';
import { createClient } from '@/lib/supabase/server';
import { normalizeUrl } from '@/lib/wishlist';

// Called from the item form when someone pastes a link. Signed-in users only.
export async function fetchLinkPreview(link: string): Promise<LinkPreview | null> {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	if (!data?.claims?.sub) return null;

	const url = normalizeUrl(String(link ?? '').slice(0, 2000));
	if (!url) return null;
	return getLinkPreview(url);
}
