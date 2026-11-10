import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Gift exchange · timdayley',
};

// Home of the family gift exchange app. Login, groups, wish lists and the draw come in later issues.
export default function GiftsHome() {
	return (
		<div className="wrapper">
			<div className="ui text container margin-bottom-50">
				<h2 className="ui dividing header">
					<i aria-hidden="true" className="gift icon"></i>
					gift exchange
				</h2>
				<p className="section-paragraph">Coming soon.</p>
			</div>
		</div>
	);
}
