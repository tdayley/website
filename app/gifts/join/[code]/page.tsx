import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { joinGroup } from '../../groups/actions';

export const metadata: Metadata = {
	title: 'Join exchange · timdayley',
};

type Props = {
	params: Promise<{ code: string }>;
	searchParams: Promise<{ error?: string }>;
};

type Invite = {
	group_id: string;
	group_name: string;
	organizer_name: string | null;
	exchange_date: string | null;
	already_member: boolean;
	draw_done: boolean;
};

export default async function JoinPage({ params, searchParams }: Props) {
	const { code } = await params;
	const { error } = await searchParams;

	const supabase = await createClient();
	const { data } = await supabase.rpc('invite_info', { code });
	const invite = (data as Invite[] | null)?.[0];

	if (invite?.already_member) {
		redirect(`/gifts/groups/${invite.group_id}`);
	}

	let body;
	if (!invite) {
		body = (
			<div className="ui negative message">
				<div className="header">This invite link isn&apos;t valid</div>
				<p>Check that you copied the whole link, or ask the organizer to send it again.</p>
			</div>
		);
	} else if (invite.draw_done) {
		body = (
			<div className="ui warning message">
				<div className="header">Names have already been drawn</div>
				<p>
					{invite.group_name} has already drawn names, so new people can&apos;t join. Ask{' '}
					{invite.organizer_name ?? 'the organizer'} if you think this is a mistake.
				</p>
			</div>
		);
	} else {
		const date = formatDate(invite.exchange_date);
		body = (
			<>
				{error ? (
					<div className="ui negative message">
						<p>Couldn&apos;t join. Please try again.</p>
					</div>
				) : null}
				<p className="section-paragraph">
					{invite.organizer_name ?? 'Someone'} invited you to join <strong>{invite.group_name}</strong>
					{date ? `, happening ${date}` : null}.
				</p>
				<form action={joinGroup}>
					<input type="hidden" name="code" value={code} />
					<button className="ui primary button" type="submit">
						Join {invite.group_name}
					</button>
				</form>
			</>
		);
	}

	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="gift icon"></i>
					gift exchange invite
				</h2>
				{body}
				<p style={{ marginTop: '2em' }}>
					<Link href="/gifts">Go to your exchanges</Link>
				</p>
			</div>
		</div>
	);
}
