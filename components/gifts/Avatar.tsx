const colors = ['#1f4d3a', '#a4303d', '#c2932f', '#3b6e8f', '#7a4b8c', '#b5622d'];

// A colored circle with the person's initial. The color is picked from their id, so it stays the same.
export default function Avatar({ id, name }: { id: string; name: string }) {
	let sum = 0;
	for (const ch of id) sum = (sum + ch.charCodeAt(0)) % 997;
	return (
		<span className="gx-avatar" style={{ backgroundColor: colors[sum % colors.length] }} aria-hidden="true">
			{name.trim().charAt(0) || '?'}
		</span>
	);
}
