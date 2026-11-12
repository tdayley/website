// The Secret Santa logo: a Santa hat.
export default function BrandMark({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="6 9 56 48" aria-hidden="true" focusable="false">
			<path d="M13 44C14 27 25 13 40 13c8 0 13 5 13 13-3-4-8-5-11-2 5 6 8 13 9 20z" fill="#b8323f" />
			<path d="M40 13c8 0 13 5 13 13-3-4-8-5-11-2-3-4-8-7-13-8 3-2 7-3 11-3z" fill="#96232f" />
			<rect x="9" y="41" width="46" height="12" rx="6" fill="#fffdf8" stroke="#e8dcc6" strokeWidth="1" />
			<circle cx="53" cy="28" r="6.5" fill="#fffdf8" stroke="#e8dcc6" strokeWidth="1" />
		</svg>
	);
}
