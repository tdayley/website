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
