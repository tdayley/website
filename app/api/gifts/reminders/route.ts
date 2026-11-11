import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { sendReminders } from '@/lib/notifications';

// Called once a day by the scheduled GitHub Action (.github/workflows/gift-reminders.yml).
// Sends the "one week to go" emails. Protected by a shared secret, CRON_SECRET.
export async function POST(request: NextRequest) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		return NextResponse.json({ error: 'Reminders are not configured' }, { status: 503 });
	}
	const given = Buffer.from(request.headers.get('authorization') ?? '');
	const expected = Buffer.from(`Bearer ${secret}`);
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const result = await sendReminders();
	if (!result) {
		return NextResponse.json({ error: 'Email is not configured, or the lookup failed' }, { status: 503 });
	}
	return NextResponse.json(result);
}
