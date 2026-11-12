import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import SubmitButton from '@/components/gifts/SubmitButton';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';
import { createClient } from '@/lib/supabase/server';
import { UUID } from '@/lib/wishlist';
import { updateGroup } from '../../actions';

export const metadata: Metadata = {
	title: 'Edit exchange · Secret Santa',
};

const errors: Record<string, string> = {
	name: 'Give the exchange a name (up to 100 characters).',
	budget: 'Budget should be a dollar amount, like 50.',
	date: 'Please pick a valid date.',
	save: "Couldn't save. Please try again.",
};

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ error?: string }>;
};

// Organizer only: change the exchange's name, budget or date. Allowed before and after the draw.
export default async function EditGroup({ params, searchParams }: Props) {
	const base = await giftsBase();
	const { id } = await params;
	const { error } = await searchParams;
	if (!UUID.test(id)) notFound();

	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) redirect(at(base, '/login'));

	const { data: group } = await supabase.from('groups').select('id, name, budget_cents, exchange_date').eq('id', id).maybeSingle();
	if (!group) notFound();
	const { data: membership } = await supabase.from('memberships').select('role').eq('group_id', id).eq('user_id', me).maybeSingle();
	if (membership?.role !== 'organizer') notFound();

	return (
		<div className="gx-page">
			<Link className="gx-back" href={at(base, `/groups/${group.id}`)}>
				<span aria-hidden="true">←</span> {group.name}
			</Link>
			<h1 className="gx-title">Edit exchange</h1>
			<p className="gx-lead">Everyone in the exchange sees these details.</p>

			{error && errors[error] ? (
				<div className="gx-note gx-note--bad" style={{ marginBottom: 18 }}>
					<p>{errors[error]}</p>
				</div>
			) : null}

			<form className="gx-card gx-form" action={updateGroup}>
				<input type="hidden" name="group_id" value={group.id} />
				<div className="gx-field">
					<label htmlFor="name">Name</label>
					<input id="name" name="name" defaultValue={group.name} maxLength={100} required />
				</div>
				<div className="gx-two">
					<div className="gx-field">
						<label htmlFor="budget">
							Budget per gift <span className="gx-optional">(optional)</span>
						</label>
						<div className="gx-prefixed">
							<span aria-hidden="true">$</span>
							<input
								id="budget"
								name="budget"
								type="number"
								min="0"
								step="0.01"
								inputMode="decimal"
								placeholder="50"
								defaultValue={group.budget_cents != null ? String(group.budget_cents / 100) : ''}
							/>
						</div>
					</div>
					<div className="gx-field">
						<label htmlFor="exchange_date">
							Exchange date <span className="gx-optional">(optional)</span>
						</label>
						<input id="exchange_date" name="exchange_date" type="date" defaultValue={group.exchange_date ?? ''} />
					</div>
				</div>
				<div className="gx-row-actions">
					<SubmitButton>Save</SubmitButton>
					<Link className="gx-btn gx-btn--ghost" href={at(base, `/groups/${group.id}`)}>
						Cancel
					</Link>
				</div>
			</form>
		</div>
	);
}
