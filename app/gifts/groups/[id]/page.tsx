import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Avatar from '@/components/gifts/Avatar';
import ConfirmButton from '@/components/gifts/ConfirmButton';
import CopyInviteLink from '@/components/gifts/CopyInviteLink';
import RevealCard from '@/components/gifts/RevealCard';
import SubmitButton from '@/components/gifts/SubmitButton';
import { countdown, formatDate, formatMoney } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { addExclusion, removeExclusion, resetDraw, runDraw } from '../actions';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';

export const metadata: Metadata = {
	title: 'Exchange · Secret Santa',
};

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ joined?: string; notice?: string; error?: string }>;
};

type Member = {
	user_id: string;
	role: 'organizer' | 'member';
	profiles: { display_name: string } | null;
};

type Exclusion = { id: string; user_a: string; user_b: string };

const MIN_MEMBERS = 3;

const notices: Record<string, string> = {
	excluded: 'Added. Those two won’t draw each other.',
	updated: 'Saved.',
	drawn: 'Names are drawn! Everyone can now see who they’re buying for.',
	drawn_emailed: 'Names are drawn! We’ve emailed everyone to come and see who they’re buying for.',
	reset: 'The draw was undone. Nobody has a name any more; draw again when you’re ready.',
};

const errors: Record<string, string> = {
	pick: 'Pick two people.',
	same: 'Pick two different people.',
	duplicate: 'Those two are already on the list.',
	exclusion: 'Couldn’t add that. Please try again.',
	impossible:
		'With these rules there’s no way to give everyone a name. Remove one or two “can’t draw each other” pairs and try again.',
	few: `You need at least ${MIN_MEMBERS} people to draw names.`,
	draw: 'Couldn’t draw names. Please try again.',
	reset: 'Couldn’t undo the draw. Please try again.',
};

export default async function GroupPage({ params, searchParams }: Props) {
	const base = await giftsBase();
	const { id } = await params;
	const { joined, notice, error } = await searchParams;

	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) redirect(at(base, '/login'));

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
	const nameOf = (userId: string) => members.find((m) => m.user_id === userId)?.profiles?.display_name ?? 'Unknown';
	const drawn = Boolean(group.draw_completed_at);

	// The database only ever returns your own assignment.
	let receiverId: string | null = null;
	if (drawn) {
		const { data: assignment } = await supabase
			.from('assignments')
			.select('receiver_id')
			.eq('group_id', id)
			.eq('giver_id', me)
			.maybeSingle();
		receiverId = assignment?.receiver_id ?? null;
	}

	let exclusions: Exclusion[] = [];
	if (isOrganizer) {
		const { data } = await supabase.from('exclusions').select('id, user_a, user_b').eq('group_id', id).order('created_at');
		exclusions = (data ?? []) as Exclusion[];
	}

	const budget = formatMoney(group.budget_cents);
	const date = formatDate(group.exchange_date);

	const days = countdown(group.exchange_date);

	return (
		<div className="gx-page">
			<Link className="gx-back" href={at(base, '/')}>
				<span aria-hidden="true">←</span> All exchanges
			</Link>
			<h1 className="gx-title">{group.name}</h1>

			{date || budget ? (
				<div className="gx-chips">
					{date ? (
						<span className="gx-chip">
							<i aria-hidden="true" className="calendar alternate outline icon"></i>
							{date}
						</span>
					) : null}
					{days ? <span className="gx-chip">⏳ {days}</span> : null}
					{budget ? (
						<span className="gx-chip">
							<i aria-hidden="true" className="tag icon"></i>
							{budget} budget per gift
						</span>
					) : null}
				</div>
			) : null}

			{isOrganizer ? (
				<p style={{ marginTop: -8 }}>
					<Link className="gx-btn gx-btn--ghost gx-btn--small" href={at(base, `/groups/${group.id}/edit`)}>
						<i aria-hidden="true" className="pencil alternate icon"></i>
						Edit name, budget or date
					</Link>
				</p>
			) : null}

			<div className="gx-stack">
				{joined ? (
					<div className="gx-note gx-note--good">
						<i aria-hidden="true" className="check circle icon"></i>
						<p>You&apos;re in! Welcome to {group.name}.</p>
					</div>
				) : null}
				{notice && notices[notice] ? (
					<div className="gx-note gx-note--good">
						<i aria-hidden="true" className="check circle icon"></i>
						<p>{notices[notice]}</p>
					</div>
				) : null}

				{drawn && receiverId ? <RevealCard groupId={group.id} receiverId={receiverId} receiverName={nameOf(receiverId)} /> : null}
				{drawn && !receiverId ? (
					<div className="gx-note gx-note--warn">
						<p>Names have been drawn, but you weren&apos;t in the exchange at the time. Ask the organizer if that&apos;s a mistake.</p>
					</div>
				) : null}
				{!drawn && !isOrganizer ? (
					<div className="gx-note">
						<span aria-hidden="true">⏳</span>
						<p>Names haven&apos;t been drawn yet. Once the organizer draws, you&apos;ll see who you&apos;re buying for here.</p>
					</div>
				) : null}

				{isOrganizer && !drawn ? (
					<section className="gx-card">
						<h2 className="gx-h2">Invite the family</h2>
						<p className="gx-muted">Send this link to everyone taking part. They&apos;ll sign in with their email and join.</p>
						<CopyInviteLink code={group.invite_code} groupName={group.name} />
					</section>
				) : null}

				<section className="gx-card">
					<h2 className="gx-h2">
						Who&apos;s in <span className="gx-count">{members.length}</span>
					</h2>
					<p className="gx-muted">Tap a name to see their wish list.</p>
					<ul className="gx-rows gx-stagger">
						{members.map((m) => {
							const name = m.profiles?.display_name ?? 'Unknown';
							return (
								<li key={m.user_id}>
									<Link className="member-row" href={m.user_id === me ? at(base, '/wishlist') : at(base, `/lists/${m.user_id}`)}>
										<Avatar id={m.user_id} name={name} />
										<span className="member-name">
											{name}
											{m.user_id === me ? <span className="gx-muted"> (you)</span> : null}
										</span>
										{m.role === 'organizer' ? <span className="gx-pill gx-pill--green">organizer</span> : null}
										<span className="chev" aria-hidden="true">›</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</section>

				{isOrganizer ? (
					<section className="gx-card" id="draw">
						<h2 className="gx-h2">Draw names</h2>
						{error && errors[error] ? (
							<div className="gx-note gx-note--bad" style={{ margin: '10px 0 14px' }}>
								<p>{errors[error]}</p>
							</div>
						) : null}

						{drawn ? (
							<>
								<p>
									Names are drawn and the exchange is locked: nobody can join, leave or change the rules. You can&apos;t see who anyone
									else got, either.
								</p>
								<form action={resetDraw}>
									<input type="hidden" name="group_id" value={group.id} />
									<ConfirmButton
										className="gx-btn--danger gx-btn--small"
										danger
										confirmLabel="Undo the draw"
										message="Undo the draw? Everyone’s name will be thrown away, and a new draw will give people different names. Only do this if nobody has started shopping."
									>
										Undo the draw
									</ConfirmButton>
								</form>
							</>
						) : (
							<>
								<h3 className="gx-h3" style={{ marginTop: 10 }}>
									Who can&apos;t draw each other?
								</h3>
								<p className="gx-muted">Optional. Use this for couples, or anyone who shouldn&apos;t be buying for each other.</p>
								{exclusions.length > 0 ? (
									<ul className="gx-rows" style={{ marginBottom: 14 }}>
										{exclusions.map((x) => (
											<li className="exclusion-row" key={x.id}>
												<span>
													<i aria-hidden="true" className="ban icon"></i>
													{nameOf(x.user_a)} and {nameOf(x.user_b)}
												</span>
												<form action={removeExclusion}>
													<input type="hidden" name="group_id" value={group.id} />
													<input type="hidden" name="id" value={x.id} />
													<SubmitButton className="gx-btn--ghost gx-btn--small" label={`Remove rule for ${nameOf(x.user_a)} and ${nameOf(x.user_b)}`}>
														Remove
													</SubmitButton>
												</form>
											</li>
										))}
									</ul>
								) : null}
								{members.length >= 2 ? (
									<form className="gx-form" action={addExclusion}>
										<input type="hidden" name="group_id" value={group.id} />
										<div className="gx-two">
											<div className="gx-field">
												<label htmlFor="user_a">This person</label>
												<select id="user_a" name="user_a" defaultValue="" required>
													<option value="" disabled>
														Choose…
													</option>
													{members.map((m) => (
														<option key={m.user_id} value={m.user_id}>
															{m.profiles?.display_name ?? 'Unknown'}
														</option>
													))}
												</select>
											</div>
											<div className="gx-field">
												<label htmlFor="user_b">can&apos;t draw this person</label>
												<select id="user_b" name="user_b" defaultValue="" required>
													<option value="" disabled>
														Choose…
													</option>
													{members.map((m) => (
														<option key={m.user_id} value={m.user_id}>
															{m.profiles?.display_name ?? 'Unknown'}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="gx-row-actions">
											<SubmitButton className="gx-btn--ghost gx-btn--small">Add rule</SubmitButton>
											<span className="gx-muted gx-small">It works both ways.</span>
										</div>
									</form>
								) : null}

								<hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0 16px' }} />

								{members.length < MIN_MEMBERS ? (
									<p className="gx-muted">
										You need at least {MIN_MEMBERS} people to draw names. {members.length} so far.
									</p>
								) : (
									<>
										<p>
											When everyone has joined, draw names. Each of the {members.length} people gets one person to buy for. After that,
											nobody else can join.
										</p>
										<form action={runDraw}>
											<input type="hidden" name="group_id" value={group.id} />
											<ConfirmButton
												className="gx-btn--festive gx-btn--block"
												confirmLabel="Draw names"
												message={`Draw names for all ${members.length} people now? Nobody else will be able to join afterwards.`}
											>
												<i aria-hidden="true" className="random icon"></i>
												Draw names
											</ConfirmButton>
										</form>
									</>
								)}
							</>
						)}
					</section>
				) : null}
			</div>
		</div>
	);
}
