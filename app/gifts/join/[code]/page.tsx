import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SubmitButton from '@/components/gifts/SubmitButton';
import { formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { joinGroup } from '../../groups/actions';

export const metadata: Metadata = {
	title: 'Join exchange · Secret Santa',
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
			<div className="gx-note gx-note--bad">
				<p>
					<strong>This invite link isn&apos;t valid</strong>
					Check that you copied the whole link, or ask the organizer to send it again.
				</p>
			</div>
		);
	} else if (invite.draw_done) {
		body = (
			<div className="gx-note gx-note--warn">
				<p>
					<strong>Names have already been drawn</strong>
					{invite.group_name} has already drawn names, so new people can&apos;t join. Ask {invite.organizer_name ?? 'the organizer'} if you
					think this is a mistake.
				</p>
			</div>
		);
	} else {
		const date = formatDate(invite.exchange_date);
		body = (
			<div className="gx-card" style={{ textAlign: 'center' }}>
				<p style={{ fontSize: 48, lineHeight: 1, margin: '6px 0 12px' }} aria-hidden="true">
					💌
				</p>
				<p className="gx-muted" style={{ marginBottom: 2 }}>
					{invite.organizer_name ?? 'Someone'} invited you to join
				</p>
				<h1 className="gx-title">{invite.group_name}</h1>
				{date ? <p className="gx-muted">{date}</p> : null}
				{error ? (
					<div className="gx-note gx-note--bad" style={{ margin: '14px 0', textAlign: 'left' }}>
						<p>Couldn&apos;t join. Please try again.</p>
					</div>
				) : null}
				<form action={joinGroup} style={{ marginTop: 18 }}>
					<input type="hidden" name="code" value={code} />
					<SubmitButton className="gx-btn--block">Join {invite.group_name}</SubmitButton>
				</form>
			</div>
		);
	}

	return (
		<div className="gx-page gx-stack">
			{body}
			<p style={{ textAlign: 'center' }}>
				<Link href="/gifts">Go to your exchanges</Link>
			</p>
		</div>
	);
}
