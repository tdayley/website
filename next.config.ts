import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			// Item photos are shrunk in the browser first, so they're well under this.
			bodySizeLimit: '3mb',
		},
	},
};

export default nextConfig;
