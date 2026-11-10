import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ItemView from '@/components/ItemView';
import { createClient } from '@/lib/supabase/server';
import { ITEM_COLUMNS, UUID, type WishlistItem } from '@/lib/wishlist';

export const metadata: Metadata = {
	title: 'Wish list · timdayley',
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
	const items = (data ?? []) as WishlistItem[];

	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<p>
					<Link href="/gifts">← Back</Link>
				</p>
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="list alternate outline icon"></i>
					{profile.display_name}&apos;s wish list
				</h2>
				{items.length === 0 ? (
					<p className="section-paragraph">{profile.display_name} hasn&apos;t added anything yet.</p>
				) : (
					<div className="ui divided items">
						{items.map((item) => (
							<ItemView key={item.id} item={item} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
