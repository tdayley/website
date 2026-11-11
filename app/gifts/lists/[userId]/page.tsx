import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ItemView from '@/components/gifts/ItemView';
import { withPhotoUrls } from '@/lib/photos';
import { createClient } from '@/lib/supabase/server';
import { ITEM_COLUMNS, UUID, type WishlistItem } from '@/lib/wishlist';

export const metadata: Metadata = {
	title: 'Wish list · Gift exchange',
};

type Props = {
	params: Promise<{ userId: string }>;
};

// Someone else's wish list. The database only returns it if you share an exchange with them.
export default async function MemberWishlist({ params }: Props) {
	const { userId } = await params;
	if (!UUID.test(userId)) notFound();

	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) redirect('/gifts/login');
	if (userId === me) redirect('/gifts/wishlist');

	const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
	if (!profile) notFound();

	const { data } = await supabase
		.from('wishlist_items')
		.select(ITEM_COLUMNS)
		.eq('user_id', userId)
		.order('position')
		.order('created_at');
	const items = await withPhotoUrls(supabase, (data ?? []) as WishlistItem[]);

	return (
		<div className="gx-page">
			<Link className="gx-back" href="/gifts">
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
					<p className="gx-lead">Their favorites are at the top.</p>
					<ul className="wishlist gx-stagger">
						{items.map((item) => (
							<li key={item.id}>
								<ItemView item={item} />
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
