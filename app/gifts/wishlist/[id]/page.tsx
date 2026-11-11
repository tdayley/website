import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ItemFields from '@/components/gifts/ItemFields';
import SubmitButton from '@/components/gifts/SubmitButton';
import { withPhotoUrls } from '@/lib/photos';
import { createClient } from '@/lib/supabase/server';
import { ITEM_COLUMNS, UUID, itemErrors, type WishlistItem } from '@/lib/wishlist';
import { updateItem } from '../actions';

export const metadata: Metadata = {
	title: 'Edit item · Gift exchange',
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
	if (!data) notFound();
	const [item] = await withPhotoUrls(supabase, [data as WishlistItem]);

	return (
		<div className="gx-page">
			<Link className="gx-back" href="/gifts/wishlist">
				<span aria-hidden="true">←</span> My wish list
			</Link>
			<h1 className="gx-title">Edit item</h1>
			{error && itemErrors[error] ? (
				<div className="gx-note gx-note--bad" style={{ marginBottom: 18 }}>
					<p>{itemErrors[error]}</p>
				</div>
			) : null}
			<form className="gx-card gx-form" action={updateItem}>
				<input type="hidden" name="id" value={item.id} />
				<ItemFields item={item} />
				<div className="gx-row-actions">
					<SubmitButton>Save</SubmitButton>
					<Link className="gx-btn gx-btn--ghost" href="/gifts/wishlist">
						Cancel
					</Link>
				</div>
			</form>
		</div>
	);
}
