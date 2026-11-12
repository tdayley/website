import type { SupabaseClient } from '@supabase/supabase-js';
import { emailConfigured, layout, sendEmails, type Email } from '@/lib/email';
import { daysUntil, formatDate, formatMoney } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';

const SITE = (process.env.SITE_URL ?? 'https://timdayley.com').replace(/\/$/, '');
const FOOTER = 'You’re getting this because you’re in a Secret Santa on timdayley.com.';

type Group = { id: string; name: string; budget_cents: number | null; exchange_date: string | null; draw_completed_at: string | null };
type Person = { id: string; name: string; email: string; organizer: boolean };

async function peopleIn(admin: SupabaseClient, groupId: string): Promise<Person[]> {
	const { data: rows } = await admin.from('memberships').select('user_id, role, profiles(display_name)').eq('group_id', groupId);
	const members = (rows ?? []) as unknown as { user_id: string; role: string; profiles: { display_name: string } | null }[];
	const people = await Promise.all(
		members.map(async (m) => {
			const { data } = await admin.auth.admin.getUserById(m.user_id);
			const email = data?.user?.email;
			return email ? { id: m.user_id, name: m.profiles?.display_name ?? 'there', email, organizer: m.role === 'organizer' } : null;
		}),
	);
	return people.filter((p): p is Person => p !== null);
}

function when(days: number) {
	return days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
}

// "Names are drawn": one email to everyone in the exchange. It deliberately does NOT
// say who anyone got; each person opens the site and unwraps their own name.
export async function notifyDrawn(groupId: string): Promise<number> {
	const admin = createAdminClient();
	if (!admin || !emailConfigured()) return 0;
	try {
		const { data: group } = await admin.from('groups').select('id, name, budget_cents, exchange_date, draw_completed_at').eq('id', groupId).maybeSingle();
		if (!group) return 0;
		const g = group as Group;
		const details = [formatDate(g.exchange_date), formatMoney(g.budget_cents) ? `${formatMoney(g.budget_cents)} budget per gift` : null].filter(Boolean).join(' · ');
		const emails: Email[] = (await peopleIn(admin, groupId)).map((p) => ({
			to: p.email,
			subject: `Names are drawn for ${g.name}!`,
			...layout({
				heading: `Names are drawn, ${p.name}!`,
				paragraphs: [
					`The names for ${g.name} have been drawn, and yours is waiting for you.`,
					...(details ? [details] : []),
					'Tap the button to unwrap it, then have a look at their wish list. And keep it a secret!',
				],
				button: { label: 'See who you’re buying for', url: `${SITE}/gifts/groups/${g.id}` },
				footer: FOOTER,
			}),
		}));
		return await sendEmails(emails);
	} catch (e) {
		console.error('notifyDrawn failed:', (e as Error).message);
		return 0;
	}
}

// The "one week to go" reminder. Run once a day; each exchange gets it once, the
// first day it's 7 or fewer days away. If names haven't been drawn yet, only the
// organizer is nudged.
export async function sendReminders(now = new Date()): Promise<{ exchanges: number; emails: number } | null> {
	const admin = createAdminClient();
	if (!admin || !emailConfigured()) return null;

	const day = (offset: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)).toISOString().slice(0, 10);
	const { data: due, error } = await admin
		.from('groups')
		.select('id, name, budget_cents, exchange_date, draw_completed_at')
		.gte('exchange_date', day(0))
		.lte('exchange_date', day(7))
		.is('reminder_sent_at', null);
	if (error) {
		console.error('sendReminders failed:', error.message);
		return null;
	}

	let exchanges = 0;
	let total = 0;
	for (const g of (due ?? []) as Group[]) {
		// Claim it first, so two overlapping runs can't both send.
		const { data: claimed } = await admin.from('groups').update({ reminder_sent_at: now.toISOString() }).eq('id', g.id).is('reminder_sent_at', null).select('id');
		if (!claimed || claimed.length === 0) continue;

		const days = daysUntil(g.exchange_date, now) ?? 0;
		const people = await peopleIn(admin, g.id);
		const drawn = Boolean(g.draw_completed_at);
		const budget = formatMoney(g.budget_cents);
		const emails: Email[] = (drawn ? people : people.filter((p) => p.organizer)).map((p) => ({
			to: p.email,
			subject: drawn ? `${g.name} is ${when(days)}` : `${g.name} is ${when(days)}, and names aren’t drawn yet`,
			...layout(
				drawn
					? {
							heading: `${g.name} is ${when(days)}`,
							paragraphs: [
								`Hi ${p.name}, a friendly reminder that ${g.name} is ${when(days)} (${formatDate(g.exchange_date)}).`,
								`If you haven’t shopped yet, check who you’re buying for and their wish list${budget ? `. The budget is ${budget}` : ''}.`,
								'It’s also a good moment to add a few more ideas to your own list.',
							],
							button: { label: 'Open the exchange', url: `${SITE}/gifts/groups/${g.id}` },
							footer: FOOTER,
						}
					: {
							heading: 'Names haven’t been drawn yet',
							paragraphs: [
								`Hi ${p.name}, ${g.name} is ${when(days)} (${formatDate(g.exchange_date)}), but names haven’t been drawn.`,
								'Once everyone has joined, open the exchange and tap “Draw names” so people have time to shop.',
							],
							button: { label: 'Draw names', url: `${SITE}/gifts/groups/${g.id}#draw` },
							footer: FOOTER,
						},
			),
		}));

		const sent = await sendEmails(emails);
		if (sent === 0 && emails.length > 0) {
			// Sending failed: release the claim so tomorrow's run tries again.
			await admin.from('groups').update({ reminder_sent_at: null }).eq('id', g.id);
			continue;
		}
		exchanges += 1;
		total += sent;
	}
	return { exchanges, emails: total };
}
