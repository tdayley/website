'use client';

import { useState, useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// Shows the full invite URL for this site and a button to copy it.
export default function CopyInviteLink({ code }: { code: string }) {
	const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => '');
	const [copied, setCopied] = useState(false);
	const url = `${origin}/gifts/join/${code}`;

	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			window.prompt('Copy this invite link:', url);
		}
	}

	return (
		<div className="ui fluid action input">
			<input type="text" readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
			<button className={`ui ${copied ? 'positive' : 'primary'} button`} type="button" onClick={copy}>
				{copied ? 'Copied!' : 'Copy link'}
			</button>
		</div>
	);
}
