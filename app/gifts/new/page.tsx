import type { Metadata } from 'next';
import Link from 'next/link';
import SubmitButton from '@/components/gifts/SubmitButton';
import { createGroup } from '../groups/actions';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';

export const metadata: Metadata = {
	title: 'New exchange · Secret Santa',
};

const errors: Record<string, string> = {
	name: 'Give the exchange a name (up to 100 characters).',
	budget: 'Budget should be a dollar amount, like 50.',
	date: 'Please pick a valid date.',
	save: "Couldn't create the exchange. Please try again.",
};

type Props = {
	searchParams: Promise<{ error?: string }>;
};

export default async function NewGroup({ searchParams }: Props) {
	const base = await giftsBase();
	const { error } = await searchParams;

	return (
		<div className="gx-page">
			<Link className="gx-back" href={at(base, '/')}>
				<span aria-hidden="true">←</span> Back
			</Link>
			<h1 className="gx-title">New exchange</h1>
			<p className="gx-lead">You&apos;ll be the organizer and get an invite link to share with the family.</p>

			{error && errors[error] ? (
				<div className="gx-note gx-note--bad" style={{ marginBottom: 18 }}>
					<p>{errors[error]}</p>
				</div>
			) : null}

			<form className="gx-card gx-form" action={createGroup}>
				<div className="gx-field">
					<label htmlFor="name">Name</label>
					<input id="name" name="name" placeholder="Family Christmas 2026" maxLength={100} required />
				</div>
				<div className="gx-two">
					<div className="gx-field">
						<label htmlFor="budget">
							Budget per gift <span className="gx-optional">(optional)</span>
						</label>
						<div className="gx-prefixed">
							<span aria-hidden="true">$</span>
							<input id="budget" name="budget" type="number" min="0" step="0.01" inputMode="decimal" placeholder="50" />
						</div>
					</div>
					<div className="gx-field">
						<label htmlFor="exchange_date">
							Exchange date <span className="gx-optional">(optional)</span>
						</label>
						<input id="exchange_date" name="exchange_date" type="date" />
					</div>
				</div>
				<SubmitButton className="gx-btn--block">Create exchange</SubmitButton>
			</form>
		</div>
	);
}
