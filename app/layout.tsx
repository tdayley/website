import type { Metadata } from 'next';
import './globals.css';

const description =
	"Timothy Dayley's personal website. Here you can find out more about Timothy including his current projects and how to get in touch with him.";

export const metadata: Metadata = {
	metadataBase: new URL('https://www.timdayley.com'),
	title: 'timdayley',
	description,
	openGraph: {
		type: 'website',
		title: 'timdayley',
		description,
		url: '/',
		siteName: 'Timothy Dayley',
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				{/* Copied into public/ by scripts/copy-semantic.mjs; its CSS layer lets globals.css override it. */}
				{/* eslint-disable-next-line @next/next/no-css-tags */}
				<link rel="stylesheet" href="/vendor/semantic-ui/index.css" precedence="high" />
			</head>
			<body>{children}</body>
		</html>
	);
}
