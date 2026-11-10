import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { signOut, updateDisplayName } from './actions';

export const metadata: Metadata = {
	title: 'Gift exchange · timdayley',
};

type ExchangeRow = {
	role: 'organizer' | 'member';
	groups: { id: string; name: string; exchange_date: string | null } | null;
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
		.select('role, groups(id, name, exchange_date)')
		.eq('user_id', claims.sub)
		.order('joined_at', { ascending: false });
	const exchanges = ((membershipRows ?? []) as unknown as ExchangeRow[]).filter((r) => r.groups);

	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="gift icon"></i>
					gift exchange
				</h2>
				<p className="section-paragraph">
					Signed in as <strong>{displayName || claims.email}</strong>
					{claims.email && displayName ? ` (${claims.email})` : null}.
				</p>

				{params.saved ? (
					<div className="ui positive message">
						<p>Name saved.</p>
					</div>
				) : null}
				{params.error ? (
					<div className="ui negative message">
						<p>{params.error === 'name' ? 'Names must be 1 to 50 characters.' : "Couldn't save your name. Please try again."}</p>
					</div>
				) : null}

				<p className="margin-bottom-50">
					<Link className="ui button" href="/gifts/wishlist">
						<i aria-hidden="true" className="list alternate outline icon"></i>
						My wish list
					</Link>
				</p>

				<h3 className="ui header">Your exchanges</h3>
				{exchanges.length === 0 ? (
					<p>You&apos;re not in any exchanges yet. Create one, or open the invite link someone sent you.</p>
				) : (
					<div className="ui relaxed divided list">
						{exchanges.map(({ role, groups: g }) => (
							<div className="item" key={g!.id}>
								<i aria-hidden="true" className="gift large icon"></i>
								<div className="content">
									<Link className="header" href={`/gifts/groups/${g!.id}`}>
										{g!.name}
									</Link>
									<div className="description">
										{[formatDate(g!.exchange_date), role === 'organizer' ? 'You organize this one' : null]
											.filter(Boolean)
											.join(' · ')}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
				<p className="margin-bottom-50">
					<Link className="ui primary button" href="/gifts/new">
						<i aria-hidden="true" className="plus icon"></i>
						Create an exchange
					</Link>
				</p>

				<h3 className="ui header">Your name</h3>
				<form className="ui form margin-bottom-50" action={updateDisplayName}>
					<div className="field">
						<label htmlFor="display_name">As the family will see it</label>
						<input id="display_name" name="display_name" defaultValue={displayName} maxLength={50} required />
					</div>
					<button className="ui button" type="submit">
						Save name
					</button>
				</form>

				<form action={signOut}>
					<button className="ui basic button" type="submit">
						Sign out
					</button>
				</form>
			</div>
		</div>
	);
}
