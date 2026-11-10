import type { WishlistItem } from '@/lib/wishlist';

// The inputs shared by the "add item" and "edit item" forms.
export default function ItemFields({ item }: { item?: WishlistItem }) {
	return (
		<>
			<div className="required field">
				<label htmlFor="title">What is it?</label>
				<input id="title" name="title" defaultValue={item?.title} maxLength={200} placeholder="Wool socks" required />
			</div>
			<div className="field">
				<label htmlFor="url">Link (optional)</label>
				<input id="url" name="url" inputMode="url" defaultValue={item?.url ?? ''} placeholder="https://store.example.com/wool-socks" />
			</div>
			<div className="two fields">
				<div className="field">
					<label htmlFor="price">Price (optional)</label>
					<div className="ui labeled input">
						<div className="ui basic label">$</div>
						<input
							id="price"
							name="price"
							inputMode="decimal"
							pattern="\$?[0-9,]*\.?[0-9]{0,2}"
							title="A dollar amount, like 24.99"
							defaultValue={item?.price_cents != null ? (item.price_cents / 100).toFixed(2) : ''}
							placeholder="24.99"
						/>
					</div>
				</div>
				<div className="field">
					<label htmlFor="image_url">Image link (optional)</label>
					<input id="image_url" name="image_url" inputMode="url" defaultValue={item?.image_url ?? ''} placeholder="https://…/photo.jpg" />
				</div>
			</div>
			<div className="field">
				<label htmlFor="notes">Notes (optional)</label>
				<textarea id="notes" name="notes" rows={2} maxLength={1000} defaultValue={item?.notes ?? ''} placeholder="Size, color, anything helpful" />
			</div>
		</>
	);
}
