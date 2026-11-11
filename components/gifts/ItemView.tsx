import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/format';
import type { WishlistItem } from '@/lib/wishlist';

function hostname(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}

// One wish list entry, as a card. `actions` is optional (the buttons on your own list).
export default function ItemView({ item, actions, className = '' }: { item: WishlistItem; actions?: ReactNode; className?: string }) {
	const price = formatMoney(item.price_cents);
	const picture = item.photo_url ?? item.image_url;
	return (
		<div className={`gx-card wishlist-item ${className}`}>
			{picture ? (
				<img className="item-thumb" src={picture} alt="" referrerPolicy="no-referrer" loading="lazy" />
			) : (
				<div className="item-thumb item-thumb--empty" aria-hidden="true">
					🎁
				</div>
			)}
			<div className="item-body">
				{item.url ? (
					<a className="item-title" href={item.url} target="_blank" rel="noopener noreferrer">
						{item.title}
					</a>
				) : (
					<span className="item-title">{item.title}</span>
				)}
				{price || item.url ? (
					<div className="item-meta">
						{price ? <span className="item-price">{price}</span> : null}
						{item.url ? (
							<span>
								<i aria-hidden="true" className="external alternate icon"></i>
								{hostname(item.url)}
							</span>
						) : null}
					</div>
				) : null}
				{item.notes ? <div className="wishlist-notes">{item.notes}</div> : null}
			</div>
			{actions ? <div className="item-actions">{actions}</div> : null}
		</div>
	);
}
