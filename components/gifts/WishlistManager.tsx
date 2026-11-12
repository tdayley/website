'use client';

import Link from 'next/link';
import { useLayoutEffect, useOptimistic, useRef, useTransition } from 'react';
import { moveItem, removeItem } from '@/app/gifts/wishlist/actions';
import type { WishlistItem } from '@/lib/wishlist';
import { useGiftsPath } from './GiftsBase';
import ItemView from './ItemView';

type Change = { type: 'move'; id: string; step: -1 | 1 } | { type: 'remove'; id: string };

function apply(items: WishlistItem[], change: Change) {
	if (change.type === 'remove') return items.filter((i) => i.id !== change.id);
	const from = items.findIndex((i) => i.id === change.id);
	const to = from + change.step;
	if (from < 0 || to < 0 || to >= items.length) return items;
	const next = [...items];
	[next[from], next[to]] = [next[to], next[from]];
	return next;
}

// Your own wish list. Moving and removing happen on screen straight away, with the
// cards sliding into their new places, while the change is saved in the background.
export default function WishlistManager({ items }: { items: WishlistItem[] }) {
	const to = useGiftsPath();
	const [shown, change] = useOptimistic(items, apply);
	const [, startTransition] = useTransition();
	const nodes = useRef(new Map<string, HTMLLIElement>());
	const lastTops = useRef(new Map<string, number>());
	const dialog = useRef<HTMLDialogElement>(null);
	const pendingRemoval = useRef<WishlistItem | null>(null);
	const dialogText = useRef<HTMLParagraphElement>(null);

	// Slide each card from where it was to where it is now.
	useLayoutEffect(() => {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const tops = new Map<string, number>();
		nodes.current.forEach((node, id) => {
			const top = node.offsetTop;
			tops.set(id, top);
			const before = lastTops.current.get(id);
			if (!reduce && before !== undefined && before !== top) {
				node.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], {
					duration: 320,
					easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
				});
			}
		});
		lastTops.current = tops;
	}, [shown]);

	function move(id: string, step: -1 | 1) {
		startTransition(async () => {
			change({ type: 'move', id, step });
			await moveItem(id, step === -1 ? 'up' : 'down');
		});
	}

	function askRemove(item: WishlistItem) {
		pendingRemoval.current = item;
		if (dialogText.current) dialogText.current.textContent = `Remove “${item.title}” from your list?`;
		dialog.current?.showModal();
	}

	function confirmRemove() {
		const item = pendingRemoval.current;
		dialog.current?.close();
		if (!item) return;
		startTransition(async () => {
			change({ type: 'remove', id: item.id });
			await removeItem(item.id);
		});
	}

	return (
		<>
			<ul className="wishlist gx-stagger">
				{shown.map((item, index) => (
					<li
						key={item.id}
						ref={(node) => {
							if (node) nodes.current.set(item.id, node);
							else nodes.current.delete(item.id);
						}}
					>
						<ItemView
							item={item}
							actions={
								<>
									<button
										type="button"
										className="gx-btn gx-btn--ghost gx-btn--small gx-btn--icon"
										disabled={index === 0}
										aria-label={`Move ${item.title} up`}
										title="Move up"
										onClick={() => move(item.id, -1)}
									>
										<i aria-hidden="true" className="arrow up icon"></i>
									</button>
									<button
										type="button"
										className="gx-btn gx-btn--ghost gx-btn--small gx-btn--icon"
										disabled={index === shown.length - 1}
										aria-label={`Move ${item.title} down`}
										title="Move down"
										onClick={() => move(item.id, 1)}
									>
										<i aria-hidden="true" className="arrow down icon"></i>
									</button>
									<span className="spacer" />
									<Link className="gx-btn gx-btn--ghost gx-btn--small" href={to(`/wishlist/${item.id}`)} aria-label={`Edit ${item.title}`}>
										Edit
									</Link>
									<button type="button" className="gx-btn gx-btn--danger gx-btn--small" aria-label={`Remove ${item.title}`} onClick={() => askRemove(item)}>
										Remove
									</button>
								</>
							}
						/>
					</li>
				))}
			</ul>
			<dialog
				ref={dialog}
				className="gx-dialog"
				onClick={(e) => {
					if (e.target === dialog.current) dialog.current?.close();
				}}
			>
				<p ref={dialogText}></p>
				<div className="gx-row-actions">
					<button type="button" className="gx-btn gx-btn--ghost gx-btn--small" onClick={() => dialog.current?.close()}>
						Cancel
					</button>
					<button type="button" className="gx-btn gx-btn--festive gx-btn--small" onClick={confirmRemove}>
						Remove
					</button>
				</div>
			</dialog>
		</>
	);
}
