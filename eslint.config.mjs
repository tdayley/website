import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
	...nextVitals,
	...nextTs,
	{
		rules: {
			// Plain <img> keeps the original Semantic UI markup and sizing.
			'@next/next/no-img-element': 'off',
		},
	},
	{ ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default config;
