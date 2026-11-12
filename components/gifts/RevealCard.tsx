'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { useGiftsPath } from './GiftsBase';

const subscribe = () => () => {};

function read(key: string) {
	try {
		return window.localStorage.getItem(key) === '1';
	} catch {
		return false;
	}
}

const sparkles = Array.from({ length: 14 }, (_, i) => {
	const angle = (i / 14) * Math.PI * 2;
	const distance = 90 + (i % 3) * 34;
	return { x: Math.round(Math.cos(angle) * distance), y: Math.round(Math.sin(angle) * distance), delay: (i % 4) * 0.04 };
});

// "You're buying for…" The first time, the name is wrapped up and you tap the gift to open it.
// After that (on this phone or computer) it just shows the name.
export default function RevealCard({ groupId, receiverId, receiverName }: { groupId: string; receiverId: string; receiverName: string }) {
	const to = useGiftsPath();
	const key = `gx-unwrapped:${groupId}:${receiverId}`;
	const seenBefore = useSyncExternalStore(subscribe, () => read(key), () => false);
	const [justOpened, setJustOpened] = useState(false);
	const open = seenBefore || justOpened;

	function unwrap() {
		setJustOpened(true);
		try {
			window.localStorage.setItem(key, '1');
		} catch {
			// Private browsing: it will simply be wrapped again next time.
		}
	}

	if (!open) {
		return (
			<div className="gx-card assignment-card">
				<p className="eyebrow">Names are drawn</p>
				<button type="button" className="gift-button" onClick={unwrap}>
					<svg className="gift-box" viewBox="0 0 64 64" aria-hidden="true">
						<rect x="8" y="26" width="48" height="32" rx="6" fill="#1f4d3a" />
						<rect x="4" y="16" width="56" height="14" rx="5" fill="#2a6a50" />
						<rect x="27" y="16" width="10" height="42" fill="#a4303d" />
						<path d="M32 16c-3-9-14-11-15-4s9 6 15 4zm0 0c3-9 14-11 15-4s-9 6-15 4z" fill="#c2932f" />
					</svg>
					<span className="gift-label">Tap to see who you&apos;re buying for</span>
				</button>
				<p className="field-hint">Make sure nobody&apos;s looking over your shoulder!</p>
			</div>
		);
	}

	return (
		<div className={`gx-card assignment-card${justOpened ? ' is-fresh' : ''}`} aria-live="polite">
			{justOpened ? (
				<div className="sparkles" aria-hidden="true">
					{sparkles.map((s, i) => (
						<span key={i} style={{ '--x': `${s.x}px`, '--y': `${s.y}px`, animationDelay: `${s.delay}s` } as React.CSSProperties} />
					))}
				</div>
			) : null}
			<p className="eyebrow">You&apos;re buying for</p>
			<p className="assignment-name">{receiverName}</p>
			<div className="after-name">
				<p>
					<Link className="gx-btn gx-btn--festive" href={to(`/lists/${receiverId}`)}>
						<i aria-hidden="true" className="list alternate outline icon"></i>
						See {receiverName}&apos;s wish list
					</Link>
				</p>
				<p className="field-hint">Only you can see this. Keep it a secret!</p>
			</div>
		</div>
	);
}
