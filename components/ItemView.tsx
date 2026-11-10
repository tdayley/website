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

// One wish list entry. `actions` is optional extra content (edit/delete buttons on your own list).
export default function ItemView({ item, actions }: { item: WishlistItem; actions?: ReactNode }) {
	const price = formatMoney(item.price_cents);
	return (
		<div className="item wishlist-item">
			{item.image_url ? (
				<div className="ui tiny image">
					<img src={item.image_url} alt="" referrerPolicy="no-referrer" loading="lazy" />
				</div>
			) : null}
			<div className="content">
				{item.url ? (
					<a className="header" href={item.url} target="_blank" rel="noopener noreferrer">
						{item.title}
					</a>
				) : (
					<div className="header">{item.title}</div>
				)}
				{price || item.url ? (
					<div className="meta">
						{price ? <span>{price}</span> : null}
						{item.url ? <span>{hostname(item.url)}</span> : null}
					</div>
				) : null}
				{item.notes ? <div className="description wishlist-notes">{item.notes}</div> : null}
				{actions ? <div className="extra">{actions}</div> : null}
			</div>
		</div>
	);
}
