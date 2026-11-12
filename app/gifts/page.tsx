import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SubmitButton from '@/components/gifts/SubmitButton';
import { countdown, formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { signOut, updateDisplayName } from './actions';

export const metadata: Metadata = {
	title: 'Secret Santa · timdayley',
};

type ExchangeRow = {
	role: 'organizer' | 'member';
	groups: { id: string; name: string; exchange_date: string | null; draw_completed_at: string | null } | null;
};

type Props = {
	searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function GiftsHome({ searchParams }: Props) {
	const params = await searchParams;
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	const claims = data?.claims;
	if (!claims?.sub) {
		redirect('/gifts/login');
	}

	const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', claims.sub).maybeSingle();
	const displayName = profile?.display_name ?? '';

	const { data: membershipRows } = await supabase
		.from('memberships')
		.select('role, groups(id, name, exchange_date, draw_completed_at)')
		.eq('user_id', claims.sub)
		.order('joined_at', { ascending: false });
	const exchanges = ((membershipRows ?? []) as unknown as ExchangeRow[]).filter((r) => r.groups);

	return (
		<div className="gx-page">
			<h1 className="gx-title">Hi, {displayName || 'there'}!</h1>
			<p className="gx-lead">Here&apos;s what&apos;s happening with your Secret Santa exchanges.</p>

			{params.saved ? (
				<div className="gx-note gx-note--good" style={{ marginBottom: 18 }}>
					<p>Name saved.</p>
				</div>
			) : null}
			{params.error ? (
				<div className="gx-note gx-note--bad" style={{ marginBottom: 18 }}>
					<p>{params.error === 'name' ? 'Names must be 1 to 50 characters.' : "Couldn't save your name. Please try again."}</p>
				</div>
			) : null}

			<h2 className="gx-h2">Your exchanges</h2>
			{exchanges.length === 0 ? (
				<div className="gx-empty">
					<span className="emoji" aria-hidden="true">🎄</span>
					<strong>No exchanges yet</strong>
					<p>Start one for the family, or open the invite link someone sent you.</p>
				</div>
			) : (
				<div className="gx-stack gx-stagger" style={{ marginTop: 12 }}>
					{exchanges.map(({ role, groups: g }) => {
						const when = [formatDate(g!.exchange_date), countdown(g!.exchange_date)].filter(Boolean).join(' · ');
						return (
							<Link className="gx-card gx-card--link exchange-card" href={`/gifts/groups/${g!.id}`} key={g!.id}>
								<span className="exchange-icon" aria-hidden="true">🎁</span>
								<span className="exchange-body">
									<span className="exchange-name">{g!.name}</span>
									{when ? <span className="exchange-meta" style={{ display: 'block' }}>{when}</span> : null}
									<span className="exchange-pills">
										{g!.draw_completed_at ? (
											<span className="gx-pill gx-pill--red">Names drawn · see who you got</span>
										) : (
											<span className="gx-pill">Waiting for the draw</span>
										)}
										{role === 'organizer' ? <span className="gx-pill gx-pill--green">You organize this one</span> : null}
									</span>
								</span>
							</Link>
						);
					})}
				</div>
			)}

			<div className="gx-row-actions" style={{ marginTop: 18 }}>
				<Link className="gx-btn" href="/gifts/new">
					<i aria-hidden="true" className="plus icon"></i>
					Create an exchange
				</Link>
				<Link className="gx-btn gx-btn--ghost" href="/gifts/wishlist">
					<i aria-hidden="true" className="list alternate outline icon"></i>
					My wish list
				</Link>
			</div>

			<section className="gx-section">
				<h2 className="gx-h2">Your name</h2>
				<p className="gx-muted">This is how the family sees you.</p>
				<form className="gx-join" action={updateDisplayName}>
					<input id="display_name" name="display_name" aria-label="Your name" defaultValue={displayName} maxLength={50} autoComplete="name" required />
					<SubmitButton className="gx-btn--ghost">Save name</SubmitButton>
				</form>
			</section>

			<section className="gx-section">
				<p className="gx-muted gx-small">Signed in as {claims.email}</p>
				<form action={signOut}>
					<SubmitButton className="gx-btn--ghost gx-btn--small">Sign out</SubmitButton>
				</form>
			</section>
		</div>
	);
}
