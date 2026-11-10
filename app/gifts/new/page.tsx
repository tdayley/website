import type { Metadata } from 'next';
import Link from 'next/link';
import { createGroup } from '../groups/actions';

export const metadata: Metadata = {
	title: 'New exchange · timdayley',
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
	const { error } = await searchParams;

	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<p>
					<Link href="/gifts">← Back</Link>
				</p>
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="gift icon"></i>
					new exchange
				</h2>

				{error && errors[error] ? (
					<div className="ui negative message">
						<p>{errors[error]}</p>
					</div>
				) : null}

				<form className="ui form" action={createGroup}>
					<div className="required field">
						<label htmlFor="name">Name</label>
						<input id="name" name="name" placeholder="Family Christmas 2026" maxLength={100} required />
					</div>
					<div className="two fields">
						<div className="field">
							<label htmlFor="budget">Budget per gift (optional)</label>
							<div className="ui labeled input">
								<div className="ui basic label">$</div>
								<input id="budget" name="budget" type="number" min="0" step="0.01" inputMode="decimal" placeholder="50" />
							</div>
						</div>
						<div className="field">
							<label htmlFor="exchange_date">Exchange date (optional)</label>
							<input id="exchange_date" name="exchange_date" type="date" />
						</div>
					</div>
					<p>You&apos;ll be the organizer and get an invite link to share with the family.</p>
					<button className="ui primary button" type="submit">
						Create exchange
					</button>
				</form>
			</div>
		</div>
	);
}
