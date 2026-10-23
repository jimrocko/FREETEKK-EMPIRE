// Packs the Vite build (dist/) into one self-contained HTML body for the
// claude.ai artifact page: game code, styles and woff2 fonts inlined.
// The viewer adds the doctype, head and viewport itself.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [dist = 'dist', out = 'dist-single/tekk-life.html'] = process.argv.slice(2);
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const jsName = html.match(/src="\.\/assets\/([^"]+\.js)"/)[1];
const cssName = html.match(/href="\.\/assets\/([^"]+\.css)"/)[1];
const js = readFileSync(join(dist, 'assets', jsName), 'utf8');
let css = readFileSync(join(dist, 'assets', cssName), 'utf8');

// Fonts: woff2 as data URIs, woff fallbacks dropped (every current browser reads woff2).
css = css.replace(/,\s*url\(\.\/[^)]+\.woff\)\s*format\("woff"\)/g, '');
css = css.replace(/url\(\.\/([^)]+\.woff2)\)/g, (_, file) => `url(data:font/woff2;base64,${readFileSync(join(dist, 'assets', file)).toString('base64')})`);

const leftover = [...css.matchAll(/url\(([^)]*)\)/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:') && !u.startsWith('"data:') && !u.startsWith('#'));
if (leftover.length) throw new Error(`Unresolved url(): ${leftover.join(', ')}`);
if (js.includes('</script') || css.includes('</style')) throw new Error('Closing tag inside inlined code');

const page = `<title>TEKK LIFE</title>
<meta name="description" content="TEKK LIFE – Management-Simulation über eine fiktive Underground-Tekno-Szene.">
<meta name="theme-color" content="#07060b">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`${out}: ${Math.round(Buffer.byteLength(page) / 1024)} KB`);
