// Copies Semantic UI's prebuilt CSS and icon fonts into public/ so the page can link to them.
// Next.js's CSS bundler rejects one invalid selector in semantic.min.css, so it can't be imported directly.
import { cpSync, rmSync, writeFileSync } from 'node:fs';

const src = 'node_modules/semantic-ui-css';
const dest = 'public/vendor/semantic-ui';

rmSync(dest, { recursive: true, force: true });
cpSync(`${src}/semantic.min.css`, `${dest}/semantic.min.css`);
cpSync(`${src}/themes`, `${dest}/themes`, { recursive: true });

// Put Semantic UI in a cascade layer so the site's own CSS (globals.css) always wins, as it did in the old site.
writeFileSync(`${dest}/index.css`, '@import url("semantic.min.css") layer(semantic-ui);\n');
