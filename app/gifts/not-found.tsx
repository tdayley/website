import Link from 'next/link';

export default function NotFound() {
	return (
		<div className="gx-page gx-empty">
			<span className="emoji" aria-hidden="true">🧦</span>
			<strong>Nothing under the tree here</strong>
			<p>This page doesn&apos;t exist, or it isn&apos;t yours to see.</p>
			<p>
				<Link className="gx-btn" href="/gifts">
					Back to your exchanges
				</Link>
			</p>
		</div>
	);
}
