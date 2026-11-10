import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ConfirmButton from '@/components/ConfirmButton';
import ItemFields from '@/components/ItemFields';
import ItemView from '@/components/ItemView';
import { createClient } from '@/lib/supabase/server';
import { ITEM_COLUMNS, itemErrors, type WishlistItem } from '@/lib/wishlist';
import { addItem, deleteItem, moveItem } from './actions';

export const metadata: Metadata = {
	title: 'My wish list · timdayley',
};

type Props = {
	searchParams: Promise<{ error?: string; added?: string; saved?: string; deleted?: string }>;
};

export default async function MyWishlist({ searchParams }: Props) {
	const params = await searchParams;
	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) redirect('/gifts/login');

	const { data } = await supabase
		.from('wishlist_items')
		.select(ITEM_COLUMNS)
		.eq('user_id', me)
		.order('position')
		.order('created_at');
	const items = (data ?? []) as WishlistItem[];

	const notice = params.added ? 'Added to your list.' : params.saved ? 'Saved.' : params.deleted ? 'Removed from your list.' : null;

	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<p>
					<Link href="/gifts">← Back</Link>
				</p>
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="list alternate outline icon"></i>
					my wish list
				</h2>
				<p>Everyone in your exchanges can see this list. Put your favorites at the top.</p>

				{notice ? (
					<div className="ui positive message">
						<p>{notice}</p>
					</div>
				) : null}

				{items.length === 0 ? (
					<p className="section-paragraph">Nothing here yet. Add your first item below.</p>
				) : (
					<div className="ui divided items">
						{items.map((item, index) => (
							<ItemView
								key={item.id}
								item={item}
								actions={
									<>
										<form action={moveItem}>
											<input type="hidden" name="id" value={item.id} />
											<input type="hidden" name="direction" value="up" />
											<button className="ui mini basic icon button" type="submit" disabled={index === 0} aria-label={`Move ${item.title} up`} title="Move up">
												<i aria-hidden="true" className="arrow up icon"></i>
											</button>
										</form>
										<form action={moveItem}>
											<input type="hidden" name="id" value={item.id} />
											<input type="hidden" name="direction" value="down" />
											<button className="ui mini basic icon button" type="submit" disabled={index === items.length - 1} aria-label={`Move ${item.title} down`} title="Move down">
												<i aria-hidden="true" className="arrow down icon"></i>
											</button>
										</form>
										<Link className="ui mini basic button" href={`/gifts/wishlist/${item.id}`}>
											Edit
										</Link>
										<form action={deleteItem}>
											<input type="hidden" name="id" value={item.id} />
											<ConfirmButton className="ui mini basic red button" message={`Remove "${item.title}" from your list?`} label={`Remove ${item.title}`}>
												Remove
											</ConfirmButton>
										</form>
									</>
								}
							/>
						))}
					</div>
				)}

				<h3 className="ui header" id="add">
					Add an item
				</h3>
				{params.error && itemErrors[params.error] ? (
					<div className="ui negative message">
						<p>{itemErrors[params.error]}</p>
					</div>
				) : null}
				<form className="ui form" action={addItem}>
					<ItemFields />
					<button className="ui primary button" type="submit">
						Add to my list
					</button>
				</form>
			</div>
		</div>
	);
}
