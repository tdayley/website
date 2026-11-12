import Link from 'next/link';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';

export default async function NotFound() {
	const base = await giftsBase();
	return (
		<div className="gx-page gx-empty">
			<span className="emoji" aria-hidden="true">🧦</span>
			<strong>Nothing under the tree here</strong>
			<p>This page doesn&apos;t exist, or it isn&apos;t yours to see.</p>
			<p>
				<Link className="gx-btn" href={at(base, '/')}>
					Back to your exchanges
				</Link>
			</p>
		</div>
	);
}
