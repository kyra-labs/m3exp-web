// Serves apps/site/dist like Cloudflare Pages does for Lighthouse: brotli / gzip compression,
// directory indexes and the 404 page. `astro preview` sends files uncompressed, which would
// understate the production scores. Usage: node scripts/serve.js [port]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrotliCompress, createGzip } from 'node:zlib';

const DIST = join(dirname(dirname(fileURLToPath(import.meta.url))), 'dist');
const PORT = Number(process.argv[2] ?? 4323);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.pf_meta': 'application/octet-stream',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt']);

function resolve(pathname) {
  const path = normalize(join(DIST, decodeURIComponent(pathname)));
  if (!path.startsWith(DIST)) return null;
  if (existsSync(path) && statSync(path).isFile()) return path;
  const index = join(path, 'index.html');
  return existsSync(index) ? index : null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const file = resolve(url.pathname);
  const path = file ?? join(DIST, '404.html');
  const ext = extname(path);
  const headers = { 'Content-Type': TYPES[ext] ?? 'application/octet-stream' };
  if (url.pathname.startsWith('/_astro/')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  }
  const accept = String(req.headers['accept-encoding'] ?? '');
  let body = createReadStream(path);
  if (COMPRESSIBLE.has(ext) && /\bbr\b/.test(accept)) {
    headers['Content-Encoding'] = 'br';
    body = body.pipe(createBrotliCompress());
  } else if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(accept)) {
    headers['Content-Encoding'] = 'gzip';
    body = body.pipe(createGzip());
  }
  res.writeHead(file ? 200 : 404, headers);
  body.pipe(res);
}).listen(PORT, () => {
  console.log(`Serving ${DIST} at http://localhost:${String(PORT)}`);
});
