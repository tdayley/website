import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ConfirmButton from '@/components/ConfirmButton';
import CopyInviteLink from '@/components/CopyInviteLink';
import { formatDate, formatMoney } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { addExclusion, removeExclusion, resetDraw, runDraw } from '../actions';

export const metadata: Metadata = {
	title: 'Exchange · timdayley',
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
	drawn: 'Names are drawn! Everyone can now see who they’re buying for.',
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
	const { id } = await params;
	const { joined, notice, error } = await searchParams;

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
				{notice && notices[notice] ? (
					<div className="ui positive message">
						<p>{notices[notice]}</p>
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

				{drawn && receiverId ? (
					<div className="ui center aligned segment assignment-card margin-bottom-50">
						<p>You&apos;re buying for</p>
						<p className="assignment-name">{nameOf(receiverId)}</p>
						<p>
							<Link className="ui primary button" href={`/gifts/lists/${receiverId}`}>
								<i aria-hidden="true" className="list alternate outline icon"></i>
								See {nameOf(receiverId)}&apos;s wish list
							</Link>
						</p>
						<p className="field-hint">Only you can see this. Keep it a secret!</p>
					</div>
				) : null}
				{drawn && !receiverId ? (
					<div className="ui warning message">
						<p>Names have been drawn, but you weren&apos;t in the exchange at the time. Ask the organizer if that&apos;s a mistake.</p>
					</div>
				) : null}
				{!drawn && !isOrganizer ? (
					<div className="ui message">
						<p>Names haven&apos;t been drawn yet. Once the organizer draws, you&apos;ll see who you&apos;re buying for here.</p>
					</div>
				) : null}

				{isOrganizer && !drawn ? (
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
				<div className="ui relaxed divided list margin-bottom-50">
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

				{isOrganizer ? (
					<div id="draw">
						<h3 className="ui header">Draw names</h3>
						{error && errors[error] ? (
							<div className="ui negative message">
								<p>{errors[error]}</p>
							</div>
						) : null}

						{drawn ? (
							<>
								<p>
									Names are drawn and the exchange is locked: nobody can join, leave or change the rules. You can&apos;t see who
									anyone else got, either.
								</p>
								<form action={resetDraw}>
									<input type="hidden" name="group_id" value={group.id} />
									<ConfirmButton
										className="ui basic red button"
										message="Undo the draw? Everyone’s name will be thrown away, and a new draw will give people different names. Only do this if nobody has started shopping."
									>
										Undo the draw
									</ConfirmButton>
								</form>
							</>
						) : (
							<>
								<h4 className="ui header">Who can&apos;t draw each other?</h4>
								<p>Optional. Use this for couples, or anyone who shouldn&apos;t be buying for each other.</p>
								{exclusions.length > 0 ? (
									<div className="ui relaxed divided list">
										{exclusions.map((x) => (
											<div className="item exclusion-row" key={x.id}>
												<span>
													<i aria-hidden="true" className="ban icon"></i>
													{nameOf(x.user_a)} and {nameOf(x.user_b)}
												</span>
												<form action={removeExclusion}>
													<input type="hidden" name="group_id" value={group.id} />
													<input type="hidden" name="id" value={x.id} />
													<button className="ui mini basic button" type="submit" aria-label={`Remove rule for ${nameOf(x.user_a)} and ${nameOf(x.user_b)}`}>
														Remove
													</button>
												</form>
											</div>
										))}
									</div>
								) : null}
								{members.length >= 2 ? (
									<form className="ui form margin-bottom-50" action={addExclusion}>
										<input type="hidden" name="group_id" value={group.id} />
										<div className="two fields">
											<div className="field">
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
											<div className="field">
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
										<p className="field-hint">It works both ways: neither will get the other.</p>
										<button className="ui button" type="submit">
											Add
										</button>
									</form>
								) : null}

								{members.length < MIN_MEMBERS ? (
									<p>
										You need at least {MIN_MEMBERS} people to draw names. {members.length} so far.
									</p>
								) : (
									<>
										<p>
											When everyone has joined, draw names. Each of the {members.length} people gets one person to buy for. After
											that, nobody else can join.
										</p>
										<form action={runDraw}>
											<input type="hidden" name="group_id" value={group.id} />
											<ConfirmButton
												className="ui primary button"
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
					</div>
				) : null}
			</div>
		</div>
	);
}
