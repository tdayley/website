import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, safeNextPath } from '@/lib/supabase/server';
import { sendMagicLink } from './actions';

export const metadata: Metadata = {
	title: 'Sign in · timdayley',
};

const errors: Record<string, string> = {
	email: 'Please enter a valid email address.',
	send: "Couldn't send the email. Please try again in a minute.",
	rate: 'Too many sign-in emails were sent. Please wait a few minutes and try again.',
	link: 'That sign-in link is invalid or has expired. Request a new one below.',
};

type Props = {
	searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
	const params = await searchParams;
	const next = safeNextPath(params.next);

	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();
	if (data?.claims?.sub) {
		redirect(next);
	}

	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="gift icon"></i>
					gift exchange
				</h2>

				{params.sent ? (
					<div className="ui positive message">
						<div className="header">Check your email</div>
						<p>We sent you a sign-in link. Open it on this device to sign in.</p>
					</div>
				) : (
					<>
						{params.error && errors[params.error] ? (
							<div className="ui negative message">
								<p>{errors[params.error]}</p>
							</div>
						) : null}
						<p className="section-paragraph">Enter your email and we&apos;ll send you a link to sign in. No password needed.</p>
						<form className="ui form" action={sendMagicLink}>
							<input type="hidden" name="next" value={next} />
							<div className="field">
								<label htmlFor="email">Email</label>
								<input id="email" type="email" name="email" autoComplete="email" required />
							</div>
							<button className="ui primary button" type="submit">
								Send sign-in link
							</button>
						</form>
					</>
				)}
			</div>
		</div>
	);
}
