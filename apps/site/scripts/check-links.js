// Link check for the built site (apps/site/dist): every internal href / src resolves to a built
// file, every #fragment to an id on its page, and every external link answers (a 404 or 410
// fails; other errors such as rate limits or timeouts are reported but do not fail, so a
// flaky host cannot block a PR). Usage: node scripts/check-links.js [--no-external]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(dirname(fileURLToPath(import.meta.url))), 'dist');
const SITE_ORIGIN = 'https://m3e.kyralabs.dev';
const checkExternal = !process.argv.includes('--no-external');

const pages = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.html'))
  .map((e) => join(e.parentPath, e.name));

const ATTR = /\s(href|src)="([^"]*)"/g;
const ID = /\sid="([^"]*)"/g;

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<');

/** @type {Map<string, Set<string>>} */
const idsByFile = new Map();
function idsOf(file) {
  let ids = idsByFile.get(file);
  if (!ids) {
    ids = new Set([...readFileSync(file, 'utf8').matchAll(ID)].map((m) => decode(m[1])));
    idsByFile.set(file, ids);
  }
  return ids;
}

/** The built file a site path serves, or null. */
function fileFor(pathname) {
  const path = join(DIST, decodeURIComponent(pathname));
  if (existsSync(path) && statSync(path).isFile()) return path;
  const index = join(path, 'index.html');
  return existsSync(index) ? index : null;
}

const errors = [];
/** @type {Map<string, string[]>} external URL → pages linking it */
const external = new Map();

for (const page of pages) {
  const html = readFileSync(page, 'utf8')
    // Code samples show markup; their attributes are not links.
    .replace(/<pre[\s\S]*?<\/pre>/g, '');
  const pageUrl = new URL(
    '/' +
      relative(DIST, page)
        .replace(/index\.html$/, '')
        .replace(/\\/g, '/'),
    SITE_ORIGIN,
  );
  for (const [, attr, raw] of html.matchAll(ATTR)) {
    const value = decode(raw);
    if (!value || /^(mailto|tel|data|javascript):/.test(value)) continue;
    const url = new URL(value, pageUrl);
    const where = `${relative(DIST, page)}: ${attr}="${value}"`;
    if (url.origin !== SITE_ORIGIN) {
      if (/^https?:$/.test(url.protocol)) {
        const key = url.href.replace(/#.*$/, '');
        external.set(key, [...(external.get(key) ?? []), where]);
      }
      continue;
    }
    const target = fileFor(url.pathname);
    if (!target) {
      errors.push(`${where} → no page at ${url.pathname}`);
      continue;
    }
    if (url.pathname !== '/' && !url.pathname.endsWith('/') && target.endsWith('index.html')) {
      errors.push(`${where} → write ${url.pathname}/ (trailingSlash: 'always')`);
    }
    const fragment = decodeURIComponent(url.hash.slice(1));
    if (fragment && target.endsWith('.html') && !idsOf(target).has(fragment)) {
      errors.push(`${where} → no id "${fragment}" on ${url.pathname}`);
    }
  }
}

if (checkExternal) {
  const warnings = [];
  await Promise.all(
    [...external].map(async ([href, from]) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(href, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
          if (res.status === 404 || res.status === 410) {
            errors.push(`${from[0]} → ${String(res.status)} (${String(from.length)} page(s))`);
          } else if (!res.ok) {
            warnings.push(`${href}: HTTP ${String(res.status)}`);
          }
          return;
        } catch (error) {
          if (attempt === 2) warnings.push(`${href}: ${String(error)}`);
        }
      }
    }),
  );
  for (const w of warnings) console.warn(`warning: ${w}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  console.error(`\n${String(errors.length)} broken link(s).`);
  process.exitCode = 1;
} else {
  console.log(
    `Links OK: ${String(pages.length)} pages${checkExternal ? `, ${String(external.size)} external URLs` : ''}.`,
  );
}
