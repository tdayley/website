// Sends email through Resend (the same service Supabase uses for sign-in links).

export type Email = { to: string; subject: string; html: string; text: string };

const API = process.env.RESEND_API_URL ?? 'https://api.resend.com';

export function emailConfigured() {
	return Boolean(process.env.RESEND_API_KEY);
}

// Returns how many were accepted. Never throws: email is a nice-to-have, and a
// failure here must not undo whatever triggered it.
export async function sendEmails(emails: Email[]): Promise<number> {
	const key = process.env.RESEND_API_KEY;
	if (!key || emails.length === 0) return 0;
	const from = process.env.EMAIL_FROM ?? 'Secret Santa <gifts@timdayley.com>';
	try {
		// One request for the whole batch (Resend allows up to 100 per request).
		const response = await fetch(`${API}/emails/batch`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(emails.slice(0, 100).map((e) => ({ from, to: [e.to], subject: e.subject, html: e.html, text: e.text }))),
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) {
			console.error('sendEmails failed:', response.status, (await response.text()).slice(0, 300));
			return 0;
		}
		return Math.min(emails.length, 100);
	} catch (e) {
		console.error('sendEmails failed:', (e as Error).message);
		return 0;
	}
}

export function escapeHtml(text: string) {
	return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// The shared look of our emails: cream card, evergreen button.
export function layout({ heading, paragraphs, button, footer }: { heading: string; paragraphs: string[]; button: { label: string; url: string }; footer: string }) {
	const html = `<div style="background:#f8f1e4;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:480px;margin:0 auto;background:#fffdf8;border:1px solid #e8dcc6;border-radius:18px;padding:28px 24px;color:#2a2723;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;">
<p style="font-size:34px;line-height:1;margin:0 0 10px;">🎁</p>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:#163a2c;margin:0 0 14px;">${escapeHtml(heading)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p)}</p>`).join('\n')}
<p style="margin:24px 0;"><a href="${escapeHtml(button.url)}" style="background:#1f4d3a;color:#fffdf8;padding:13px 26px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">${escapeHtml(button.label)}</a></p>
<p style="color:#6d665a;font-size:13px;margin:0;">${escapeHtml(footer)}</p>
</div></div>`;
	const text = [heading, '', ...paragraphs, '', `${button.label}: ${button.url}`, '', footer].join('\n');
	return { html, text };
}
