import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import GiftMark from '@/components/gifts/GiftMark';
import SubmitButton from '@/components/gifts/SubmitButton';
import { createClient, safeNextPath } from '@/lib/supabase/server';
import { sendMagicLink } from './actions';

export const metadata: Metadata = {
	title: 'Sign in · Gift exchange',
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
		<div className="gx-page login-page">
			<div className="login-hero">
				<GiftMark className="login-mark" />
				<h1 className="gx-title">Family gift exchange</h1>
				<p className="gx-lead">Wish lists, name drawing, and no spoiled surprises.</p>
			</div>

			{params.sent ? (
				<div className="gx-card" style={{ textAlign: 'center' }}>
					<p style={{ fontSize: 44, lineHeight: 1, margin: '4px 0 10px' }} aria-hidden="true">
						📬
					</p>
					<h2 className="gx-h2">Check your email</h2>
					<p>We sent you a sign-in link. Tap it and you&apos;re in. No password needed.</p>
					<p className="gx-muted gx-small">Nothing after a minute? Look in your spam folder.</p>
				</div>
			) : (
				<div className="gx-card">
					{params.error && errors[params.error] ? (
						<div className="gx-note gx-note--bad" style={{ marginBottom: 16 }}>
							<p>{errors[params.error]}</p>
						</div>
					) : null}
					<form className="gx-form" action={sendMagicLink}>
						<input type="hidden" name="next" value={next} />
						<div className="gx-field">
							<label htmlFor="email">Your email</label>
							<input id="email" type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" placeholder="you@example.com" required />
							<div className="field-hint">We&apos;ll email you a link to sign in. No password to remember.</div>
						</div>
						<SubmitButton className="gx-btn--block">
							<i aria-hidden="true" className="paper plane icon"></i>
							Email me a sign-in link
						</SubmitButton>
					</form>
				</div>
			)}
		</div>
	);
}
