import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';
import ogs from 'open-graph-scraper';

export type LinkPreview = {
	title: string | null;
	imageUrl: string | null;
	priceCents: number | null;
};

const TIMEOUT_MS = 6000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;

// The server fetches whatever link a user pastes, so it must never reach
// private or internal addresses (cloud metadata, localhost, the local network).
const blocked = new net.BlockList();
for (const [prefix, bits] of [
	['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
	['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
	blocked.addSubnet(prefix, bits, 'ipv4');
}
for (const [prefix, bits] of [
	['::', 127], ['64:ff9b::', 96], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) {
	blocked.addSubnet(prefix, bits, 'ipv6');
}

// For local testing only: lets previews fetch pages served from this machine.
const allowLocal = process.env.LINK_PREVIEW_ALLOW_LOCAL === '1';

export function isPublicAddress(address: string) {
	// "::ffff:1.2.3.4" is an IPv4 address in IPv6 clothing; judge it as IPv4.
	const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
	const ip = mapped ? mapped[1] : address;
	const family = net.isIP(ip);
	if (family === 0) return false;
	if (allowLocal) return true;
	if (family === 6 && /^::ffff:/i.test(ip)) return false;
	return !blocked.check(ip, family === 6 ? 'ipv6' : 'ipv4');
}

export function isAllowedUrl(url: URL) {
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
	if (url.username || url.password) return false;
	if (!allowLocal && url.port && url.port !== '80' && url.port !== '443') return false;
	const host = url.hostname.replace(/^\[|\]$/g, '');
	if (net.isIP(host)) return isPublicAddress(host);
	return host.includes('.') || allowLocal;
}

// DNS lookup that refuses private addresses. Passed to the request itself, so the
// address that was checked is the address that gets connected to.
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
	dns.lookup(hostname, { ...(options as dns.LookupOptions), all: true }, (err, addresses) => {
		if (err) return callback(err, '', 0);
		const list = addresses as dns.LookupAddress[];
		const bad = list.find((a) => !isPublicAddress(a.address));
		if (bad || list.length === 0) {
			return callback(new Error(`Refusing to connect to ${hostname}`), '', 0);
		}
		if ((options as dns.LookupOptions).all) {
			return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
		}
		callback(null, list[0].address, list[0].family);
	});
};

type Page = { html: string; url: URL };

function fetchOnce(url: URL, deadline: number): Promise<{ redirect?: string; page?: Page }> {
	return new Promise((resolve, reject) => {
		const lib = url.protocol === 'https:' ? https : http;
		const req = lib.request(
			url,
			{
				method: 'GET',
				lookup: safeLookup,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; link-preview/1.0)',
					Accept: 'text/html,application/xhtml+xml',
					'Accept-Language': 'en-US,en;q=0.8',
					'Accept-Encoding': 'gzip, deflate, br',
				},
			},
			(res) => {
				const status = res.statusCode ?? 0;
				if (status >= 300 && status < 400 && res.headers.location) {
					res.resume();
					return resolve({ redirect: res.headers.location });
				}
				if (status < 200 || status >= 300) {
					res.resume();
					return reject(new Error(`HTTP ${status}`));
				}
				if (!/html/i.test(String(res.headers['content-type'] ?? ''))) {
					res.resume();
					return reject(new Error('Not an HTML page'));
				}

				const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase();
				const body =
					encoding === 'gzip' ? res.pipe(zlib.createGunzip())
					: encoding === 'deflate' ? res.pipe(zlib.createInflate())
					: encoding === 'br' ? res.pipe(zlib.createBrotliDecompress())
					: res;

				const chunks: Buffer[] = [];
				let size = 0;
				const finish = () => resolve({ page: { html: Buffer.concat(chunks).toString('utf8'), url } });
				body.on('data', (chunk: Buffer) => {
					size += chunk.length;
					chunks.push(chunk);
					// Preview tags live in <head>; stop once we have plenty of the page.
					if (size >= MAX_BYTES) {
						req.destroy();
						finish();
					}
				});
				body.on('end', finish);
				body.on('error', (e) => (size > 0 ? finish() : reject(e)));
			},
		);
		req.setTimeout(Math.max(1, deadline - Date.now()), () => req.destroy(new Error('Timed out')));
		req.on('error', reject);
		req.end();
	});
}

async function fetchPage(start: URL): Promise<Page> {
	const deadline = Date.now() + TIMEOUT_MS;
	let url = start;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		if (!isAllowedUrl(url)) throw new Error('Address not allowed');
		const result = await fetchOnce(url, deadline);
		if (result.page) return result.page;
		url = new URL(result.redirect!, url);
	}
	throw new Error('Too many redirects');
}

function absoluteHttpUrl(value: unknown, base: URL): string | null {
	if (typeof value !== 'string' || !value.trim()) return null;
	try {
		const url = new URL(value.trim(), base);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
	} catch {
		return null;
	}
}

function toCents(value: unknown): number | null {
	if (typeof value !== 'string' && typeof value !== 'number') return null;
	const dollars = Number(String(value).replace(/[^0-9.]/g, ''));
	if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 1_000_000) return null;
	return Math.round(dollars * 100);
}

// Looks through schema.org data (used by most stores) for a Product's price and image.
function fromJsonLd(nodes: unknown, found: { price: unknown; image: unknown } = { price: null, image: null }, depth = 0) {
	if (!nodes || depth > 6) return found;
	if (Array.isArray(nodes)) {
		nodes.forEach((n) => fromJsonLd(n, found, depth + 1));
		return found;
	}
	if (typeof nodes !== 'object') return found;
	const node = nodes as Record<string, unknown>;
	const types = ([] as unknown[]).concat(node['@type'] ?? []);
	if (types.includes('Product')) {
		const offers = ([] as unknown[]).concat(node.offers ?? [])[0] as Record<string, unknown> | undefined;
		found.price ??= offers?.price ?? offers?.lowPrice ?? null;
		const image = ([] as unknown[]).concat(node.image ?? [])[0];
		found.image ??= typeof image === 'object' && image ? (image as Record<string, unknown>).url : image ?? null;
	}
	fromJsonLd(node['@graph'], found, depth + 1);
	return found;
}

// Fetches a page and pulls out a title, image and price, like a link preview in a text message.
// Returns null when the page can't be read (blocked, not found, not a web page...).
export async function getLinkPreview(link: string): Promise<LinkPreview | null> {
	let page: Page;
	try {
		page = await fetchPage(new URL(link));
	} catch (e) {
		console.warn('link preview fetch failed:', (e as Error).message);
		return null;
	}

	try {
		const { result } = await ogs({
			html: page.html,
			// Many stores use "product:price:amount" without the "og:" prefix.
			customMetaTags: [{ multiple: false, property: 'product:price:amount', fieldName: 'productPriceAmount' }],
		});
		const ld = fromJsonLd(result.jsonLD);
		const title = (result.ogTitle ?? result.twitterTitle ?? result.dcTitle ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) || null;
		const imageUrl =
			absoluteHttpUrl(result.ogImage?.[0]?.url, page.url) ??
			absoluteHttpUrl(result.twitterImage?.[0]?.url, page.url) ??
			absoluteHttpUrl(ld.image, page.url);
		const priceCents = toCents(result.ogProductPriceAmount) ??
			toCents(result.customMetaTags?.productPriceAmount) ??
			toCents(result.ogPriceAmount) ??
			toCents(ld.price);
		if (!title && !imageUrl && priceCents == null) return null;
		return { title, imageUrl, priceCents };
	} catch (e) {
		console.warn('link preview parse failed:', (e as Error).message ?? e);
		return null;
	}
}
