import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ItemFields from '@/components/gifts/ItemFields';
import SubmitButton from '@/components/gifts/SubmitButton';
import WishlistManager from '@/components/gifts/WishlistManager';
import { withPhotoUrls } from '@/lib/photos';
import { createClient } from '@/lib/supabase/server';
import { ITEM_COLUMNS, itemErrors, type WishlistItem } from '@/lib/wishlist';
import { addItem } from './actions';
import { giftsBase } from '@/lib/gifts-base';
import { at } from '@/lib/gifts-path';

export const metadata: Metadata = {
	title: 'My wish list · Secret Santa',
};

type Props = {
	searchParams: Promise<{ error?: string; added?: string; saved?: string }>;
};

export default async function MyWishlist({ searchParams }: Props) {
	const base = await giftsBase();
	const params = await searchParams;
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) redirect(at(base, '/login'));

	const { data } = await supabase
		.from('wishlist_items')
		.select(ITEM_COLUMNS)
		.eq('user_id', me)
		.order('position')
		.order('created_at');
	const items = await withPhotoUrls(supabase, (data ?? []) as WishlistItem[]);

	const notice = params.added ? 'Added to your list.' : params.saved ? 'Saved.' : null;

	return (
		<div className="gx-page">
			<h1 className="gx-title">My wish list</h1>
			<p className="gx-lead">Everyone in your exchanges can see this. Put your favorites at the top.</p>

			{notice ? (
				<div className="gx-note gx-note--good" style={{ marginBottom: 18 }}>
					<i aria-hidden="true" className="check circle icon"></i>
					<p>{notice}</p>
				</div>
			) : null}

			{items.length === 0 ? (
				<div className="gx-empty">
					<span className="emoji" aria-hidden="true">📝</span>
					<strong>Your list is empty</strong>
					<p>Add a few things you&apos;d love, so whoever draws your name isn&apos;t guessing.</p>
				</div>
			) : (
				<WishlistManager items={items} />
			)}

			<section className="gx-section" id="add">
				<h2 className="gx-h2">Add an item</h2>
				{params.error && itemErrors[params.error] ? (
					<div className="gx-note gx-note--bad" style={{ margin: '10px 0 14px' }}>
						<p>{itemErrors[params.error]}</p>
					</div>
				) : null}
				<form className="gx-card gx-form" action={addItem} style={{ marginTop: 10 }}>
					{/* The key resets the form's picture preview and hints after each add or removal. */}
					<ItemFields key={items.length} />
					<SubmitButton className="gx-btn--block">
						<i aria-hidden="true" className="plus icon"></i>
						Add to my list
					</SubmitButton>
				</form>
			</section>
		</div>
	);
}
