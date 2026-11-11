'use client';

import { useRef, useState } from 'react';
import { uploadItemPhoto } from '@/app/gifts/wishlist/photo';
import { fetchLinkPreview } from '@/app/gifts/wishlist/preview';
import { shrinkPhoto } from '@/lib/shrink-photo';
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
	// An uploaded photo: its storage path (saved with the item) and something to show for it.
	const [photoPath, setPhotoPath] = useState(item?.image_path ?? '');
	const [photoPreview, setPhotoPreview] = useState(item?.photo_url ?? '');
	const [photoStatus, setPhotoStatus] = useState<'idle' | 'working' | 'unreadable' | 'failed'>('idle');
	const fileRef = useRef<HTMLInputElement>(null);

	async function addPhoto(file: File | undefined) {
		if (!file) return;
		setPhotoStatus('working');
		const small = await shrinkPhoto(file);
		if (!small) return setPhotoStatus('unreadable');
		const body = new FormData();
		body.set('photo', new File([small], 'photo.jpg', { type: 'image/jpeg' }));
		let result: Awaited<ReturnType<typeof uploadItemPhoto>> | null = null;
		try {
			result = await uploadItemPhoto(body);
		} catch {
			// Reported below as a failed upload.
		}
		if (!result?.ok) return setPhotoStatus(result?.error === 'type' ? 'unreadable' : 'failed');
		setPhotoPath(result.path);
		setPhotoPreview(URL.createObjectURL(small));
		setPhotoStatus('idle');
	}

	function removePhoto() {
		setPhotoPath('');
		setPhotoPreview('');
		setPhotoStatus('idle');
	}

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
			<div className="gx-field">
				<label htmlFor="url">
					Link to the item <span className="gx-optional">(optional)</span>
				</label>
				<div className="gx-join">
					<input
						id="url"
						name="url"
						ref={urlRef}
						inputMode="url"
						autoCapitalize="none"
						autoCorrect="off"
						defaultValue={item?.url ?? ''}
						placeholder="Paste a link from any store"
						onPaste={() => setTimeout(() => lookUp(), 0)}
						onBlur={() => lookUp()}
					/>
					<button className={`gx-btn gx-btn--ghost${status === 'loading' ? ' is-pending' : ''}`} type="button" onClick={() => lookUp(true)}>
						<i aria-hidden="true" className="magic icon"></i>
						Fill in from link
					</button>
				</div>
				<div className="field-hint" role="status">
					{status === 'idle' ? 'Paste a link and we’ll try to fill in the name, picture and price for you.' : null}
					{status === 'loading' ? 'Looking up that link…' : null}
					{status === 'filled' ? '✨ Filled in what we could find. Check it over before saving.' : null}
					{status === 'nothing'
						? 'We couldn’t read that page. Some stores, like Amazon, block this. No problem: just type the details in below.'
						: null}
				</div>
			</div>
			<div className="gx-field">
				<label htmlFor="title">What is it?</label>
				<input id="title" name="title" ref={titleRef} defaultValue={item?.title} maxLength={200} placeholder="Wool socks" required />
			</div>
			<div className="gx-field">
				<label htmlFor="price">
					Price <span className="gx-optional">(optional)</span>
				</label>
				<div className="gx-prefixed">
					<span aria-hidden="true">$</span>
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
			<div className="gx-field">
				<span className="gx-label">
					Picture <span className="gx-optional">(optional)</span>
				</span>
				<input type="hidden" name="image_path" value={photoPath} />
				<input
					ref={fileRef}
					type="file"
					accept="image/*"
					hidden
					aria-label="Choose a photo"
					onChange={(e) => {
						addPhoto(e.target.files?.[0]);
						e.target.value = '';
					}}
				/>
				<div className="photo-field">
					{photoPreview ? (
						<img className="image-field-thumb photo-thumb" src={photoPreview} alt="Your photo" />
					) : image && !imageBroken ? (
						<img className="image-field-thumb" src={image} alt="Picture preview" referrerPolicy="no-referrer" onError={() => setImageBroken(true)} />
					) : null}
					<button
						type="button"
						className={`gx-btn gx-btn--ghost gx-btn--small${photoStatus === 'working' ? ' is-pending' : ''}`}
						onClick={() => fileRef.current?.click()}
					>
						<i aria-hidden="true" className="camera icon"></i>
						{photoPath ? 'Change photo' : 'Add a photo'}
					</button>
					{photoPath ? (
						<button type="button" className="gx-btn gx-btn--danger gx-btn--small" onClick={removePhoto}>
							Remove photo
						</button>
					) : null}
				</div>
				<div className="field-hint" role="status" data-photo-status={photoStatus}>
					{photoStatus === 'working' ? 'Adding your photo…' : null}
					{photoStatus === 'unreadable' ? 'That file doesn’t seem to be a picture. Please choose a photo or screenshot.' : null}
					{photoStatus === 'failed' ? 'Couldn’t add the photo. Check your connection and try again.' : null}
					{photoStatus === 'idle' && !photoPath
						? 'Take a photo, or pick one from your phone. A screenshot of the item works great.'
						: null}
				</div>
				<details className="field-hint">
					<summary>Or paste a link to a picture</summary>
					<input
						id="image_url"
						name="image_url"
						ref={imageRef}
						inputMode="url"
						autoCapitalize="none"
						autoCorrect="off"
						aria-label="Picture link"
						defaultValue={item?.image_url ?? ''}
						placeholder="Filled in from the item link when possible"
						onChange={(e) => showImage(e.target.value)}
					/>
					{image && imageBroken ? <p>That doesn’t seem to be a link to a picture. Add a photo instead, or leave this blank.</p> : null}
					<p>
						On a computer, right-click the item&apos;s photo and choose <em>Copy image address</em> (or <em>Copy Image Link</em> in
						Firefox), then paste it here.
					</p>
				</details>
			</div>
			<div className="gx-field">
				<label htmlFor="notes">
					Notes <span className="gx-optional">(optional)</span>
				</label>
				<textarea id="notes" name="notes" rows={2} maxLength={1000} defaultValue={item?.notes ?? ''} placeholder="Size, color, anything helpful" />
			</div>
		</>
	);
}
