// The little wrapped-gift logo.
export default function GiftMark({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
			<rect x="8" y="26" width="48" height="32" rx="6" fill="#1f4d3a" />
			<rect x="4" y="16" width="56" height="14" rx="5" fill="#2a6a50" />
			<rect x="27" y="16" width="10" height="42" fill="#a4303d" />
			<path d="M32 16c-3-9-14-11-15-4s9 6 15 4zm0 0c3-9 14-11 15-4s-9 6-15 4z" fill="#c2932f" />
		</svg>
	);
}
