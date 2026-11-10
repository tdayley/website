import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ItemFields from '@/components/ItemFields';
import { createClient } from '@/lib/supabase/server';
import { ITEM_COLUMNS, UUID, itemErrors, type WishlistItem } from '@/lib/wishlist';
import { updateItem } from '../actions';

export const metadata: Metadata = {
	title: 'Edit item · timdayley',
};

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ error?: string }>;
};

export default async function EditItem({ params, searchParams }: Props) {
	const { id } = await params;
	const { error } = await searchParams;
	if (!UUID.test(id)) notFound();

	const supabase = await createClient();
	const { data: auth } = await supabase.auth.getClaims();
	const me = auth?.claims?.sub;
	if (!me) redirect('/gifts/login');

	const { data } = await supabase.from('wishlist_items').select(ITEM_COLUMNS).eq('id', id).eq('user_id', me).maybeSingle();
	const item = data as WishlistItem | null;
	if (!item) notFound();

	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<p>
					<Link href="/gifts/wishlist">← My wish list</Link>
				</p>
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="pencil alternate icon"></i>
					edit item
				</h2>
				{error && itemErrors[error] ? (
					<div className="ui negative message">
						<p>{itemErrors[error]}</p>
					</div>
				) : null}
				<form className="ui form" action={updateItem}>
					<input type="hidden" name="id" value={item.id} />
					<ItemFields item={item} />
					<button className="ui primary button" type="submit">
						Save
					</button>
					<Link className="ui basic button" href="/gifts/wishlist">
						Cancel
					</Link>
				</form>
			</div>
		</div>
	);
}
