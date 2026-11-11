'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { claimItem, unclaimItem } from '@/app/gifts/lists/actions';
import type { WishlistItem } from '@/lib/wishlist';
import ItemView from './ItemView';

// Who is getting an item: you, a named person, or someone whose name you can't see.
export type Claim = { mine: boolean; name: string | null };

type Change = { itemId: string; claim: Claim | null };

// Someone else's wish list, with "I'm getting this" on each item. The list's owner
// never sees this component's claim information (they get their own list page instead).
export default function ClaimableList({ items, claims, listUserId, ownerName }: { items: WishlistItem[]; claims: Record<string, Claim>; listUserId: string; ownerName: string }) {
	const [shown, change] = useOptimistic(claims, (current, { itemId, claim }: Change) => {
		const next = { ...current };
		if (claim) next[itemId] = claim;
		else delete next[itemId];
		return next;
	});
	const [, startTransition] = useTransition();
	const [justTaken, setJustTaken] = useState<string | null>(null);

	function claim(itemId: string) {
		setJustTaken(null);
		startTransition(async () => {
			change({ itemId, claim: { mine: true, name: null } });
			const result = await claimItem(itemId, listUserId);
			if (result.taken) setJustTaken(itemId);
		});
	}

	function undo(itemId: string) {
		startTransition(async () => {
			change({ itemId, claim: null });
			await unclaimItem(itemId, listUserId);
		});
	}

	return (
		<ul className="wishlist gx-stagger">
			{items.map((item) => {
				const c = shown[item.id];
				return (
					<li key={item.id}>
						<ItemView
							item={item}
							className={c && !c.mine ? 'is-claimed' : ''}
							actions={
								c?.mine ? (
									<>
										<span className="gx-pill gx-pill--green claim-pill">
											<i aria-hidden="true" className="check icon"></i>
											You&apos;re getting this
										</span>
										<span className="spacer" />
										<button type="button" className="gx-btn gx-btn--ghost gx-btn--small" aria-label={`Undo: I'm not getting ${item.title}`} onClick={() => undo(item.id)}>
											Undo
										</button>
									</>
								) : c ? (
									<>
										<span className="gx-pill claim-pill">
											<i aria-hidden="true" className="gift icon"></i>
											{c.name ? `${c.name} is getting this` : 'Someone is getting this'}
										</span>
										{justTaken === item.id ? <span className="gx-muted gx-small">Someone just beat you to it!</span> : null}
									</>
								) : (
									<>
										<button type="button" className="gx-btn gx-btn--small" aria-label={`I'm getting ${item.title}`} onClick={() => claim(item.id)}>
											<i aria-hidden="true" className="gift icon"></i>
											I&apos;m getting this
										</button>
										{justTaken === item.id ? <span className="gx-muted gx-small">Someone just beat you to it!</span> : null}
									</>
								)
							}
						/>
					</li>
				);
			})}
			<li className="claim-note gx-muted gx-small">
				<i aria-hidden="true" className="eye slash outline icon"></i>
				{ownerName} can&apos;t see what&apos;s been marked. Everyone else in your exchanges can.
			</li>
		</ul>
	);
}
