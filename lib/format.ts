// "5000" cents -> "$50", "1999" -> "$19.99"
export function formatMoney(cents: number | null | undefined) {
	if (cents == null) return null;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
	}).format(cents / 100);
}

// "2026-12-24" -> "Thursday, December 24, 2026" (no timezone shifting)
export function formatDate(isoDate: string | null | undefined) {
	if (!isoDate) return null;
	const [y, m, d] = isoDate.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

// Whole days from today until "2026-12-24" (negative once it has passed).
export function daysUntil(isoDate: string | null | undefined, now = new Date()) {
	if (!isoDate) return null;
	const [y, m, d] = isoDate.split('-').map(Number);
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return Math.round((Date.UTC(y, m - 1, d) - today) / 86_400_000);
}

export function countdown(isoDate: string | null | undefined) {
	const days = daysUntil(isoDate);
	if (days == null || days < 0) return null;
	if (days === 0) return 'Today!';
	if (days === 1) return 'Tomorrow';
	return `${days} days to go`;
}
