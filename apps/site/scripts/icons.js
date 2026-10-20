// Subsets Material Symbols (Rounded, D12) to the icons the site can render (D5): names found in
// the site's sources and the icon names the library's components render on their own (default
// icons such as the date picker's arrows). Writes src/generated/icons/site-icons.{woff2,css},
// which src/styles/base.css imports so the build fingerprints and bundles them.
// Collection is by pattern, so tests/site.spec.ts checks that every rendered icon resolved.
//
// The site font pins the axes the tokens never vary (--m3e-ref-typeface-icon-weight 400, -grade 0,
// -optical-size 24) and keeps FILL: about 17 KB instead of 128 KB on every first visit. The
// fonts guide's axes demo gets its own face with weight kept variable (site-icons-axes.*,
// imported by that page only).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconFontFace, parseCodepoints, subsetIcons } from '@kyralabs/m3e-icons';
import { ICON_AXES_DEMO } from '../src/data/icon-demo.ts';

const SITE = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO = dirname(dirname(SITE));
const OUT = join(SITE, 'src/generated/icons');
const FAMILY = 'M3E Site Icons';

const require = createRequire(import.meta.url);
const codepoints = parseCodepoints(
  readFileSync(
    require.resolve('@kyralabs/m3e-tokens/fonts/material-symbols-rounded.codepoints'),
    'utf8',
  ),
);

/** @param {string} dir @param {RegExp} ext @returns {string[]} */
function files(dir, ext) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && ext.test(e.name) && !/\.test\.|\.spec\./.test(e.name))
    .map((e) => join(e.parentPath, e.name));
}

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** Quoted string literals that are icon names (TS / TSX and Astro frontmatter). */
const LITERAL = /(['"`])([a-z][a-z0-9_]*)\1/g;
/** Markup: icon attributes / props, and the text of `.m3e-icon` spans. */
const MARKUP = [
  /\b(?:name|icon|[a-z]+-icon|[a-z]+Icon)=["']([a-z][a-z0-9_]*)["']/g,
  /class="[^"]*\bm3e-icon\b[^"]*"[^>]*>\s*([a-z][a-z0-9_]*)\s*</g,
];

const names = new Set();
const add = (name) => {
  if (codepoints.has(name)) names.add(name);
};

for (const file of files(join(SITE, 'src'), /\.(astro|tsx?|html|md)$/)) {
  const src = readFileSync(file, 'utf8');
  for (const re of MARKUP) for (const m of src.matchAll(re)) add(m[1]);
  if (/\.(astro|tsx?)$/.test(file)) for (const m of stripComments(src).matchAll(LITERAL)) add(m[2]);
}
// Icons the components render themselves. JSDoc examples are stripped first.
for (const pkg of ['m3e-react', 'm3e-elements']) {
  for (const file of files(join(REPO, 'packages', pkg, 'src'), /\.tsx?$/)) {
    for (const m of stripComments(readFileSync(file, 'utf8')).matchAll(LITERAL)) add(m[2]);
  }
}

const font = readFileSync(
  require.resolve('@kyralabs/m3e-tokens/fonts/material-symbols-rounded.woff2'),
);
// The values of --m3e-ref-typeface-icon-{weight,grade,optical-size} (m3e-tokens).
const PINNED = { wght: 400, GRAD: 0, opsz: 24 };
const woff2 = await subsetIcons({ font, codepoints, names: [...names].sort(), axes: PINNED });
const axes = await subsetIcons({
  font,
  codepoints,
  names: ICON_AXES_DEMO,
  axes: { FILL: 0, GRAD: PINNED.GRAD, opsz: PINNED.opsz },
});
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'site-icons.woff2'), woff2);
writeFileSync(
  join(OUT, 'site-icons.css'),
  iconFontFace({ family: FAMILY, url: './site-icons.woff2' }),
);
writeFileSync(join(OUT, 'site-icons-axes.woff2'), axes);
writeFileSync(
  join(OUT, 'site-icons-axes.css'),
  [
    '@font-face {',
    `  font-family: "${FAMILY} Axes";`,
    '  font-style: normal;',
    '  font-weight: 100 700;',
    '  src: url("./site-icons-axes.woff2") format("woff2");',
    '}',
    '',
    '.site-icon-demo__row--axes {',
    `  --m3e-ref-typeface-icon: "${FAMILY} Axes";`,
    '}',
    '',
  ].join('\n'),
);
console.log(
  `${relative(SITE, OUT)}/site-icons.woff2: ${String(names.size)} icons, ${String(woff2.length)} bytes; ` +
    `site-icons-axes.woff2: ${String(ICON_AXES_DEMO.length)} icons, ${String(axes.length)} bytes`,
);
