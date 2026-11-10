export type WishlistItem = {
	id: string;
	title: string;
	url: string | null;
	image_url: string | null;
	price_cents: number | null;
	notes: string | null;
	position: number;
};

export const ITEM_COLUMNS = 'id, title, url, image_url, price_cents, notes, position';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Accepts "example.com/thing" as well as full links; returns null if it isn't a web address.
export function normalizeUrl(input: string): string | null {
	const text = input.trim();
	if (!text) return null;
	const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
	try {
		const url = new URL(withScheme);
		if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return null;
		return url.toString();
	} catch {
		return null;
	}
}

type Parsed =
	| { ok: true; values: Omit<WishlistItem, 'id' | 'position'> }
	| { ok: false; error: 'title' | 'url' | 'image' | 'price' | 'notes' };

export function parseItemForm(formData: FormData): Parsed {
	const text = (name: string) => String(formData.get(name) ?? '').trim();

	const title = text('title');
	if (title.length < 1 || title.length > 200) return { ok: false, error: 'title' };

	const url = normalizeUrl(text('url'));
	if (text('url') && !url) return { ok: false, error: 'url' };

	const imageUrl = normalizeUrl(text('image_url'));
	if (text('image_url') && !imageUrl) return { ok: false, error: 'image' };

	let priceCents: number | null = null;
	const priceText = text('price').replace(/^\$/, '').replace(/,/g, '');
	if (priceText) {
		const dollars = Number(priceText);
		if (!Number.isFinite(dollars) || dollars < 0 || dollars > 1000000) return { ok: false, error: 'price' };
		priceCents = Math.round(dollars * 100);
	}

	const notes = text('notes');
	if (notes.length > 1000) return { ok: false, error: 'notes' };

	return { ok: true, values: { title, url, image_url: imageUrl, price_cents: priceCents, notes: notes || null } };
}

export const itemErrors: Record<string, string> = {
	title: 'Give the item a name (up to 200 characters).',
	url: "That link doesn't look like a web address.",
	image: "That image link doesn't look like a web address.",
	price: 'Price should be a dollar amount, like 24.99.',
	notes: 'Notes can be up to 1000 characters.',
	save: "Couldn't save. Please try again.",
};
