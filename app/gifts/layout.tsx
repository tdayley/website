import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/nunito';
import GiftMark from '@/components/gifts/GiftMark';
import NavLinks from '@/components/gifts/NavLinks';
import { createClient } from '@/lib/supabase/server';
import './gifts.css';

export const metadata: Metadata = {
	title: 'Gift exchange · timdayley',
	manifest: '/gifts.webmanifest',
	appleWebApp: { capable: true, title: 'Gift Exchange', statusBarStyle: 'default' },
	icons: { apple: '/gifts-icon-180.png' },
};

export const viewport: Viewport = {
	themeColor: '#f8f1e4',
	viewportFit: 'cover',
};

// The shell around every gift exchange page: header, and (when signed in) the two main tabs.
export default async function GiftsLayout({ children }: { children: React.ReactNode }) {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const signedIn = Boolean(data?.claims?.sub);

	return (
		<div className={`gx${signedIn ? ' gx--tabs' : ''}`}>
			<header className="gx-top">
				<Link href="/gifts" className="gx-brand">
					<GiftMark className="gx-brand-mark" />
					Gift Exchange
				</Link>
				{signedIn ? <NavLinks variant="top" /> : null}
			</header>
			<main className="gx-main">{children}</main>
			{signedIn ? <NavLinks variant="tabs" /> : null}
		</div>
	);
}
