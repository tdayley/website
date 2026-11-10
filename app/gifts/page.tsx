import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut, updateDisplayName } from './actions';

export const metadata: Metadata = {
	title: 'Gift exchange · timdayley',
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

				<form className="ui form margin-bottom-50" action={updateDisplayName}>
					<div className="field">
						<label htmlFor="display_name">Your name, as the family will see it</label>
						<input id="display_name" name="display_name" defaultValue={displayName} maxLength={50} required />
					</div>
					<button className="ui button" type="submit">
						Save name
					</button>
				</form>

				<p className="section-paragraph">Groups, wish lists and the draw are coming soon.</p>

				<form action={signOut}>
					<button className="ui basic button" type="submit">
						Sign out
					</button>
				</form>
			</div>
		</div>
	);
}
