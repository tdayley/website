import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/nunito';
import BrandMark from '@/components/gifts/BrandMark';
import { GiftsBaseProvider } from '@/components/gifts/GiftsBase';
import { InstallCapture } from '@/components/gifts/InstallApp';
import NavLinks from '@/components/gifts/NavLinks';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';
import { createClient } from '@/lib/supabase/server';
import './gifts.css';

export const metadata: Metadata = {
	title: 'Secret Santa · timdayley',
	manifest: '/gifts.webmanifest',
	appleWebApp: { capable: true, title: 'Secret Santa', statusBarStyle: 'default' },
	icons: {
		icon: [
			{ url: '/secret-santa-icon.svg', type: 'image/svg+xml' },
			{ url: '/secret-santa-icon-32.png', type: 'image/png', sizes: '32x32' },
		],
		apple: '/gifts-icon-180.png',
	},
};

export const viewport: Viewport = {
	themeColor: '#f8f1e4',
	viewportFit: 'cover',
};

// The shell around every Secret Santa page: header, and (when signed in) the two main tabs.
export default async function GiftsLayout({ children }: { children: React.ReactNode }) {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const signedIn = Boolean(data?.claims?.sub);
	const base = await giftsBase();

	return (
		<GiftsBaseProvider base={base}>
		<InstallCapture />
		<div className={`gx${signedIn ? ' gx--tabs' : ''}`}>
			<header className="gx-top">
				<Link href={at(base, '/')} className="gx-brand">
					<BrandMark className="gx-brand-mark" />
					Secret Santa
				</Link>
				{signedIn ? <NavLinks variant="top" /> : null}
			</header>
			<main className="gx-main">{children}</main>
			{signedIn ? <NavLinks variant="tabs" /> : null}
		</div>
		</GiftsBaseProvider>
	);
}
