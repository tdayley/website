import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ClaimableList, { type Claim } from '@/components/gifts/ClaimableList';
import { withPhotoUrls } from '@/lib/photos';
import { createClient } from '@/lib/supabase/server';
import { ITEM_COLUMNS, UUID, type WishlistItem } from '@/lib/wishlist';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';

export const metadata: Metadata = {
	title: 'Wish list · Secret Santa',
};

type Props = {
	params: Promise<{ userId: string }>;
};

// Someone else's wish list. The database only returns it if you share an exchange with them.
export default async function MemberWishlist({ params }: Props) {
	const base = await giftsBase();
	const { userId } = await params;
	if (!UUID.test(userId)) notFound();

	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) redirect(at(base, '/login'));
	if (userId === me) redirect(at(base, '/wishlist'));

	const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
	if (!profile) notFound();

	const { data } = await supabase
		.from('wishlist_items')
		.select(ITEM_COLUMNS)
		.eq('user_id', userId)
		.order('position')
		.order('created_at');
	const items = await withPhotoUrls(supabase, (data ?? []) as WishlistItem[]);

	// Who's getting what. The database never returns claims on your own items,
	// and this page is never shown to the list's owner (they're redirected above).
	const claims: Record<string, Claim> = {};
	if (items.length > 0) {
		const { data: claimRows } = await supabase
			.from('claims')
			.select('item_id, claimed_by')
			.in('item_id', items.map((i) => i.id));
		const others = [...new Set((claimRows ?? []).map((c) => c.claimed_by as string).filter((id) => id !== me))];
		const names = new Map<string, string>();
		if (others.length > 0) {
			const { data: people } = await supabase.from('profiles').select('id, display_name').in('id', others);
			(people ?? []).forEach((p) => names.set(p.id as string, p.display_name as string));
		}
		(claimRows ?? []).forEach((c) => {
			claims[c.item_id as string] = { mine: c.claimed_by === me, name: names.get(c.claimed_by as string) ?? null };
		});
	}

	return (
		<div className="gx-page">
			<Link className="gx-back" href={at(base, '/')}>
				<span aria-hidden="true">←</span> Back
			</Link>
			<h1 className="gx-title">{profile.display_name}&apos;s wish list</h1>
			{items.length === 0 ? (
				<div className="gx-empty">
					<span className="emoji" aria-hidden="true">🤷</span>
					<strong>Nothing here yet</strong>
					<p>{profile.display_name} hasn&apos;t added anything. Maybe give them a nudge?</p>
				</div>
			) : (
				<>
					<p className="gx-lead">Their favorites are at the top. Mark what you&apos;re getting so nobody doubles up.</p>
					<ClaimableList items={items} claims={claims} listUserId={userId} ownerName={profile.display_name} />
				</>
			)}
		</div>
	);
}
