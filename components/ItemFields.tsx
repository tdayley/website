'use client';

import { useRef, useState } from 'react';
import { fetchLinkPreview } from '@/app/gifts/wishlist/preview';
import type { WishlistItem } from '@/lib/wishlist';

type Status = 'idle' | 'loading' | 'filled' | 'nothing';

// The inputs shared by the "add item" and "edit item" forms. Pasting a link looks the
// page up and fills in any empty fields; everything stays editable.
export default function ItemFields({ item }: { item?: WishlistItem }) {
	const urlRef = useRef<HTMLInputElement>(null);
	const titleRef = useRef<HTMLInputElement>(null);
	const priceRef = useRef<HTMLInputElement>(null);
	const imageRef = useRef<HTMLInputElement>(null);
	const lastLookup = useRef('');
	const [status, setStatus] = useState<Status>('idle');
	const [image, setImage] = useState(item?.image_url ?? '');
	const [imageBroken, setImageBroken] = useState(false);

	function showImage(value: string) {
		setImage(value.trim());
		setImageBroken(false);
	}

	async function lookUp(force = false) {
		const link = urlRef.current?.value.trim() ?? '';
		if (!link || (!force && link === lastLookup.current)) return;
		lastLookup.current = link;
		setStatus('loading');
		let preview = null;
		try {
			preview = await fetchLinkPreview(link);
		} catch {
			// Treated the same as "found nothing".
		}
		// Ignore the answer if the link changed while we were waiting.
		if (urlRef.current?.value.trim() !== link) return;
		if (!preview) return setStatus('nothing');

		let filled = false;
		if (preview.title && titleRef.current && !titleRef.current.value.trim()) {
			titleRef.current.value = preview.title;
			filled = true;
		}
		if (preview.priceCents != null && priceRef.current && !priceRef.current.value.trim()) {
			priceRef.current.value = (preview.priceCents / 100).toFixed(2);
			filled = true;
		}
		if (preview.imageUrl && imageRef.current && !imageRef.current.value.trim()) {
			imageRef.current.value = preview.imageUrl;
			showImage(preview.imageUrl);
			filled = true;
		}
		setStatus(filled ? 'filled' : 'nothing');
	}

	return (
		<>
			<div className="field">
				<label htmlFor="url">Link to the item (optional)</label>
				<div className="ui action input">
					<input
						id="url"
						name="url"
						ref={urlRef}
						inputMode="url"
						defaultValue={item?.url ?? ''}
						placeholder="Paste a link from any store"
						onPaste={() => setTimeout(() => lookUp(), 0)}
						onBlur={() => lookUp()}
					/>
					<button className={`ui button${status === 'loading' ? ' loading disabled' : ''}`} type="button" onClick={() => lookUp(true)}>
						Fill in from link
					</button>
				</div>
				<div className="field-hint" role="status">
					{status === 'idle' ? 'Paste a link and we’ll try to fill in the name, picture and price for you.' : null}
					{status === 'loading' ? 'Looking up that link…' : null}
					{status === 'filled' ? 'Filled in what we could find. Check it over before saving.' : null}
					{status === 'nothing'
						? 'We couldn’t read that page. Some stores, like Amazon, block this. No problem: just type the details in below.'
						: null}
				</div>
			</div>
			<div className="required field">
				<label htmlFor="title">What is it?</label>
				<input id="title" name="title" ref={titleRef} defaultValue={item?.title} maxLength={200} placeholder="Wool socks" required />
			</div>
			<div className="field">
				<label htmlFor="price">Price (optional)</label>
				<div className="ui labeled input">
					<div className="ui basic label">$</div>
					<input
						id="price"
						name="price"
						ref={priceRef}
						inputMode="decimal"
						pattern="\$?[0-9,]*\.?[0-9]{0,2}"
						title="A dollar amount, like 24.99"
						defaultValue={item?.price_cents != null ? (item.price_cents / 100).toFixed(2) : ''}
						placeholder="24.99"
					/>
				</div>
			</div>
			<div className="field">
				<label htmlFor="image_url">Picture (optional)</label>
				<div className="image-field">
					{image && !imageBroken ? (
						<img className="image-field-thumb" src={image} alt="Picture preview" referrerPolicy="no-referrer" onError={() => setImageBroken(true)} />
					) : null}
					<input
						id="image_url"
						name="image_url"
						ref={imageRef}
						inputMode="url"
						defaultValue={item?.image_url ?? ''}
						placeholder="Filled in from the link when possible"
						onChange={(e) => showImage(e.target.value)}
					/>
				</div>
				{image && imageBroken ? (
					<div className="field-hint">That doesn’t seem to be a link to a picture. See the steps below, or leave this blank.</div>
				) : null}
				<details className="field-hint">
					<summary>No picture showing? How to add one yourself</summary>
					<p>A picture is optional. Your list works fine without one. To add one:</p>
					<ol>
						<li>
							<strong>On a computer:</strong> open the item&apos;s page, right-click its photo and choose{' '}
							<em>Copy image address</em> (Chrome, Edge, Safari) or <em>Copy Image Link</em> (Firefox). Then paste it in the box above.
						</li>
						<li>
							<strong>On a phone or tablet:</strong> press and hold the photo and choose <em>Open image in new tab</em> if you see
							it, then copy the address from the top of that tab and paste it above. If that option isn&apos;t there, it&apos;s
							easiest to skip the picture or add it later from a computer.
						</li>
					</ol>
					<p>You&apos;ll know it worked when a small preview of the picture appears next to the box.</p>
				</details>
			</div>
			<div className="field">
				<label htmlFor="notes">Notes (optional)</label>
				<textarea id="notes" name="notes" rows={2} maxLength={1000} defaultValue={item?.notes ?? ''} placeholder="Size, color, anything helpful" />
			</div>
		</>
	);
}
