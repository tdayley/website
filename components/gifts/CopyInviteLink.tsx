'use client';

import { useState, useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// The invite link, with a Share button (opens the phone's share sheet) and a Copy button.
export default function CopyInviteLink({ code, groupName }: { code: string; groupName: string }) {
	const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => '');
	const canShare = useSyncExternalStore(subscribe, () => typeof navigator.share === 'function', () => false);
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

	async function share() {
		try {
			await navigator.share({ title: groupName, text: `Join our Secret Santa, ${groupName}:`, url });
		} catch {
			// Closed the share sheet without sending; nothing to do.
		}
	}

	return (
		<div className="gx-stack">
			<input type="text" readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
			<div className="gx-row-actions">
				{canShare ? (
					<button className="gx-btn" type="button" onClick={share}>
						<i aria-hidden="true" className="share alternate icon"></i>
						Share invite
					</button>
				) : null}
				<button className={`gx-btn${canShare ? ' gx-btn--ghost' : ''}`} type="button" onClick={copy}>
					<i aria-hidden="true" className={`${copied ? 'check' : 'copy outline'} icon`}></i>
					{copied ? 'Copied!' : 'Copy link'}
				</button>
			</div>
		</div>
	);
}
