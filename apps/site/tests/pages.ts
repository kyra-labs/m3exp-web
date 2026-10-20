// Every page of the built site, from its sitemap (plus the 404 page, which is not listed).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sitemap = readFileSync(
  fileURLToPath(new URL('../dist/sitemap-0.xml', import.meta.url)),
  'utf8',
);

export const PAGES: string[] = [
  ...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1] ?? '/').pathname),
  '/404.html',
];
