import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import CopyInviteLink from '@/components/CopyInviteLink';
import { formatDate, formatMoney } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
	title: 'Exchange · timdayley',
};

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ joined?: string }>;
};

type Member = {
	user_id: string;
	role: 'organizer' | 'member';
	profiles: { display_name: string } | null;
};

export default async function GroupPage({ params, searchParams }: Props) {
	const { id } = await params;
	const { joined } = await searchParams;

	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) redirect('/gifts/login');

	// Not a UUID: treat like a group that doesn't exist (avoids a database error).
	if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

	const { data: group } = await supabase
		.from('groups')
		.select('id, name, budget_cents, exchange_date, invite_code, draw_completed_at')
		.eq('id', id)
		.maybeSingle();
	if (!group) notFound();

	const { data: memberRows } = await supabase
		.from('memberships')
		.select('user_id, role, profiles(display_name)')
		.eq('group_id', id)
		.order('joined_at');
	const members = (memberRows ?? []) as unknown as Member[];
	const isOrganizer = members.some((m) => m.user_id === me && m.role === 'organizer');

	const budget = formatMoney(group.budget_cents);
	const date = formatDate(group.exchange_date);

	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<p>
					<Link href="/gifts">← All exchanges</Link>
				</p>
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="gift icon"></i>
					{group.name}
				</h2>

				{joined ? (
					<div className="ui positive message">
						<p>You&apos;re in! Welcome to {group.name}.</p>
					</div>
				) : null}

				<p className="section-paragraph">
					{date ? (
						<>
							<i aria-hidden="true" className="calendar alternate outline icon"></i>
							{date}
							<br />
						</>
					) : null}
					{budget ? (
						<>
							<i aria-hidden="true" className="dollar sign icon"></i>
							{budget} budget per gift
						</>
					) : null}
				</p>

				{isOrganizer && !group.draw_completed_at ? (
					<div className="margin-bottom-50">
						<h3 className="ui header">Invite the family</h3>
						<p>Send this link to everyone taking part. They&apos;ll sign in with their email and join.</p>
						<CopyInviteLink code={group.invite_code} />
					</div>
				) : null}

				<h3 className="ui header">
					Members <span className="ui circular label">{members.length}</span>
				</h3>
				<p>Pick a name to see their wish list.</p>
				<div className="ui relaxed divided list">
					{members.map((m) => (
						<div className="item" key={m.user_id}>
							<i aria-hidden="true" className="user circle icon"></i>
							<div className="content">
								<Link href={m.user_id === me ? '/gifts/wishlist' : `/gifts/lists/${m.user_id}`}>
									{m.profiles?.display_name ?? 'Unknown'}
								</Link>
								{m.user_id === me ? ' (you)' : null}
								{m.role === 'organizer' ? (
									<span className="ui tiny basic label" style={{ marginLeft: '0.5em' }}>
										organizer
									</span>
								) : null}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
