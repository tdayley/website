'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
	{ href: '/gifts', label: 'Exchanges', icon: 'gift', match: (p: string) => p === '/gifts' || p.startsWith('/gifts/groups') || p.startsWith('/gifts/new') || p.startsWith('/gifts/lists') },
	{ href: '/gifts/wishlist', label: 'My wish list', icon: 'list alternate outline', match: (p: string) => p.startsWith('/gifts/wishlist') },
];

// The two main destinations: a bottom tab bar on phones, links in the header on wider screens.
export default function NavLinks({ variant }: { variant: 'tabs' | 'top' }) {
	const pathname = usePathname();
	if (variant === 'top') {
		return (
			<nav className="gx-topnav" aria-label="Gift exchange">
				{links.map((l) => (
					<Link key={l.href} href={l.href} className="gx-navlink" aria-current={l.match(pathname) ? 'page' : undefined}>
						{l.label}
					</Link>
				))}
			</nav>
		);
	}
	return (
		<nav className="gx-tabs" aria-label="Gift exchange">
			{links.map((l) => (
				<Link key={l.href} href={l.href} className="gx-tab" aria-current={l.match(pathname) ? 'page' : undefined}>
					<i aria-hidden="true" className={`${l.icon} icon`}></i>
					{l.label}
				</Link>
			))}
		</nav>
	);
}
