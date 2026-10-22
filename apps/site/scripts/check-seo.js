// SEO check for the built site (apps/site/dist). For every indexable page: a title of at most 60
// characters and a description of 50–160 (what search results show uncut), both unique; a
// canonical URL that is the page's own; og:url equal to it; an absolute og:image that exists; one
// h1; JSON-LD that parses. The home page's JSON-LD names the site (one WebSite node, the one
// Google takes the site name from) and Kyra Labs (one Organization node, the same @id on every
// Kyra Labs site). The sitemap lists exactly the indexable pages, robots.txt points to it, and
// noindex pages stay out. Usage: node scripts/check-seo.js
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(dirname(fileURLToPath(import.meta.url))), 'dist');
const SITE_ORIGIN = 'https://m3e.kyralabs.dev';
const TITLE_MAX = 60;
const DESCRIPTION = [50, 160];
const SITE_NAME = 'M3 Expressive Web';
const ORGANIZATION_ID = 'https://kyralabs.dev/#organization';

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const meta = (html, attr, name) =>
  new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html)?.[1];

const errors = [];
const titles = new Map();
const descriptions = new Map();
const indexable = new Set();
const noindex = new Set();

const pages = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === 'index.html')
  .map((e) => join(e.parentPath, e.name));

for (const file of pages) {
  const path = `/${relative(DIST, file)
    .replace(/\\/g, '/')
    .replace(/index\.html$/, '')}`;
  const url = new URL(path, SITE_ORIGIN).href;
  const html = readFileSync(file, 'utf8');
  const fail = (message) => errors.push(`${path}: ${message}`);

  if (/<meta name="robots" content="[^"]*noindex/.test(html)) {
    noindex.add(url);
    continue;
  }
  indexable.add(url);

  const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');
  if (!title) fail('no <title>');
  else if (title.length > TITLE_MAX) fail(`title is ${title.length} characters: "${title}"`);
  titles.set(title, [...(titles.get(title) ?? []), path]);

  const description = decode(meta(html, 'name', 'description') ?? '');
  if (description.length < DESCRIPTION[0] || description.length > DESCRIPTION[1])
    fail(`description is ${description.length} characters (${DESCRIPTION.join('–')})`);
  descriptions.set(description, [...(descriptions.get(description) ?? []), path]);

  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  if (canonical !== url) fail(`canonical is ${canonical ?? 'missing'}, not ${url}`);
  if (meta(html, 'property', 'og:url') !== url) fail('og:url is not the canonical URL');

  const image = meta(html, 'property', 'og:image');
  if (!image?.startsWith(`${SITE_ORIGIN}/`)) fail(`og:image is ${image ?? 'missing'}`);
  else if (!existsSync(join(DIST, new URL(image).pathname))) fail(`og:image ${image} is not built`);

  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1s !== 1) fail(`${h1s} h1 elements`);

  const nodes = [];
  for (const [, json] of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    try {
      const data = JSON.parse(json);
      for (const item of [data].flat()) nodes.push(...(item['@graph'] ?? [item]));
    } catch (error) {
      fail(`JSON-LD does not parse: ${error.message}`);
    }
  }

  if (path === '/') {
    const ofType = (type) => nodes.filter((n) => [n['@type']].flat().includes(type));
    const sites = ofType('WebSite');
    if (sites.length !== 1) fail(`${sites.length} WebSite nodes in the JSON-LD (want 1)`);
    else {
      if (sites[0].name !== SITE_NAME)
        fail(`WebSite name is "${sites[0].name}", not "${SITE_NAME}"`);
      if (sites[0].url !== canonical)
        fail(`WebSite url is ${sites[0].url}, not the canonical ${canonical}`);
    }
    const orgs = ofType('Organization').filter((n) => n['@id'] === ORGANIZATION_ID);
    if (orgs.length !== 1)
      fail(`${orgs.length} Organization nodes with @id ${ORGANIZATION_ID} (want 1)`);
  }
}

for (const [title, paths] of titles) {
  if (paths.length > 1) errors.push(`title "${title}" is on ${paths.join(', ')}`);
}
for (const [description, paths] of descriptions) {
  if (paths.length > 1) errors.push(`description "${description}" is on ${paths.join(', ')}`);
}

// The sitemap (@astrojs/sitemap) and robots.txt.
const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap-index.xml`))
  errors.push('robots.txt does not point to the sitemap');
const sitemapFiles = [
  ...readFileSync(join(DIST, 'sitemap-index.xml'), 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g),
].map((m) => join(DIST, new URL(m[1]).pathname));
const listed = new Set(
  sitemapFiles.flatMap((f) =>
    [...readFileSync(f, 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]),
  ),
);
for (const url of indexable) if (!listed.has(url)) errors.push(`${url} is not in the sitemap`);
for (const url of listed) {
  if (noindex.has(url)) errors.push(`${url} is noindex but in the sitemap`);
  else if (!indexable.has(url)) errors.push(`${url} is in the sitemap but not built`);
}

if (errors.length > 0) {
  console.error(
    `SEO check: ${errors.length} problem(s)\n${errors.map((e) => `  ${e}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(
  `SEO OK: ${indexable.size} indexable pages, all in the sitemap; ${noindex.size} noindex.`,
);
