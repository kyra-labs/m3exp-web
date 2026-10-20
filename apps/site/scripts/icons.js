// Subsets Material Symbols (Rounded, D12) to the icons the site can render (D5): names found in
// the site's sources and the icon names the library's components render on their own (default
// icons such as the date picker's arrows). Writes src/generated/icons/site-icons.{woff2,css},
// which src/styles/base.css imports so the build fingerprints and bundles them.
// Collection is by pattern, so tests/site.spec.ts checks that every rendered icon resolved.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconFontFace, parseCodepoints, subsetIcons } from '@kyralabs/m3e-icons';

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

const woff2 = await subsetIcons({
  font: readFileSync(require.resolve('@kyralabs/m3e-tokens/fonts/material-symbols-rounded.woff2')),
  codepoints,
  names: [...names].sort(),
});
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'site-icons.woff2'), woff2);
writeFileSync(
  join(OUT, 'site-icons.css'),
  iconFontFace({ family: FAMILY, url: './site-icons.woff2' }),
);
console.log(
  `${relative(SITE, OUT)}/site-icons.woff2: ${String(names.size)} icons, ${String(woff2.length)} bytes`,
);
