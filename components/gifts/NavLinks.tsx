'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { stripGifts } from '@/lib/gifts-path';
import { useGiftsPath } from './GiftsBase';

// Paths are the app's own ("/wishlist"); useGiftsPath() adds /gifts when the app is under the main site.
const links = [
	{ path: '/', label: 'Exchanges', icon: 'gift', match: (p: string) => p === '/' || p.startsWith('/groups') || p.startsWith('/new') || p.startsWith('/lists') },
	{ path: '/wishlist', label: 'My wish list', icon: 'list alternate outline', match: (p: string) => p.startsWith('/wishlist') },
];

// The two main destinations: a bottom tab bar on phones, links in the header on wider screens.
export default function NavLinks({ variant }: { variant: 'tabs' | 'top' }) {
	const pathname = stripGifts(usePathname());
	const to = useGiftsPath();
	if (variant === 'top') {
		return (
			<nav className="gx-topnav" aria-label="Secret Santa">
				{links.map((l) => (
					<Link key={l.path} href={to(l.path)} className="gx-navlink" aria-current={l.match(pathname) ? 'page' : undefined}>
						{l.label}
					</Link>
				))}
			</nav>
		);
	}
	return (
		<nav className="gx-tabs" aria-label="Secret Santa">
			{links.map((l) => (
				<Link key={l.path} href={to(l.path)} className="gx-tab" aria-current={l.match(pathname) ? 'page' : undefined}>
					<i aria-hidden="true" className={`${l.icon} icon`}></i>
					{l.label}
				</Link>
			))}
		</nav>
	);
}
