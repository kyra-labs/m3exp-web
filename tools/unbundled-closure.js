// Unbundled closure of every m3e-elements entry (D24): what a page that loads dist/ without a
// bundler (a CDN `<script type="module" src=".../m3e-elements/menu.js">`, REQUIREMENTS §11)
// downloads before the element can register. That is the entry file plus every file it reaches
// through static `import` / `export … from`, each fetched and compressed on its own. Lazy
// `import()` calls are left out: they load on first use. size-limit cannot see this number, since
// it bundles and tree-shakes each entry first.
//
//   node tools/unbundled-closure.js [dist dir] [--json]
//
// Prints a table (raw, gzip, brotli per entry; sizes in kB, 1 kB = 1,000 B, as size-limit) and
// appends it to the GitHub step summary when there is one. Reported, not a budget: it exits 1
// only when an element entry's brotli closure passes CAP_BROTLI, a regression cap (see below).
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { parseAst } from 'rolldown/parseAst';

// Regression cap for one element entry's brotli closure (the index, every element at once, is
// left out: size-limit caps it bundled at 130 kB, D18 (1)). Before D24, esbuild put all of
// m3e-motion in one chunk (38 kB brotli) that 61 of 72 entries imported, so element entries
// measured 39–63 kB (median 44 kB); with rolldown the largest is ~26 kB (date-picker-layout) and
// the median ~10 kB. A 40 kB cap sits under the old floor, so it fails if an entry again pulls in
// the whole of m3e-motion or m3e-shapes (a broken split or a barrel import), while leaving ~50 %
// headroom for elements to grow. Growth past it is a review item, like a size-limit raise.
export const CAP_BROTLI = 40_000;

/** Relative files `file` imports statically (import / export … from / bare `import '…'`). */
export function staticImports(file) {
  const { body } = parseAst(readFileSync(file, 'utf8'));
  return body
    .filter(
      (node) =>
        (node.type === 'ImportDeclaration' && node.importKind !== 'type') ||
        ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') &&
          node.source),
    )
    .map((node) => node.source.value)
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => resolve(dirname(file), specifier));
}

/** Every file `entry` loads before it runs: itself and its static imports, transitively. */
export function closure(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const file of staticImports(entry)) closure(file, seen);
  return seen;
}

const cache = new Map();
/** Raw, gzip (level 9) and brotli (quality 11) bytes of one file, each compressed on its own. */
export function fileSizes(file) {
  let sizes = cache.get(file);
  if (!sizes) {
    const bytes = readFileSync(file);
    sizes = {
      raw: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
      brotli: brotliCompressSync(bytes, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      }).length,
    };
    cache.set(file, sizes);
  }
  return sizes;
}

/** Summed sizes of a set of files. */
export function totals(files) {
  const sum = { files: files.size, raw: 0, gzip: 0, brotli: 0 };
  for (const file of files) {
    const { raw, gzip, brotli } = fileSizes(file);
    sum.raw += raw;
    sum.gzip += gzip;
    sum.brotli += brotli;
  }
  return sum;
}

/** The entries of an m3e-elements dist: index.js and every <entry>/index.js. */
export function entries(dist) {
  const dirs = readdirSync(dist, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dist, e.name, 'index.js')))
    .map((e) => e.name)
    .sort();
  return [
    ['index', join(dist, 'index.js')],
    ...dirs.map((name) => [name, join(dist, name, 'index.js')]),
  ];
}

// The elements common-page set (D17): what a typical page loads together.
const COMMON_PAGE = ['icon', 'ripple', 'menu', 'top-app-bar', 'loading-indicator'];

export function report(dist) {
  const list = entries(dist);
  const rows = list.map(([name, file]) => ({ name, ...totals(closure(file)) }));
  const union = (names) => {
    const files = new Set();
    for (const [name, file] of list) if (names.includes(name)) closure(file, files);
    return files;
  };
  const elementRows = rows.filter((r) => r.name !== 'index');
  const sorted = elementRows.map((r) => r.brotli).sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
  const sets = [
    { name: 'set: common page (D17)', ...totals(union(COMMON_PAGE)) },
    {
      name: 'set: every element entry',
      ...totals(union(elementRows.map((r) => r.name))),
    },
  ];
  return { rows, sets, median, over: elementRows.filter((r) => r.brotli > CAP_BROTLI) };
}

const kB = (bytes) => (bytes / 1000).toFixed(2);

export function table({ rows, sets, median }) {
  const line = (r) => `| ${r.name} | ${r.files} | ${kB(r.raw)} | ${kB(r.gzip)} | ${kB(r.brotli)} |`;
  return [
    '| m3e-elements entry (static import closure) | files | raw kB | gzip kB | brotli kB |',
    '|---|---:|---:|---:|---:|',
    ...rows.map(line),
    ...sets.map(line),
    '',
    `Median element entry: ${kB(median)} kB brotli. Lazy \`import()\`s excluded. ` +
      `Reported, not a budget (D24); fails only when an element entry passes ${kB(CAP_BROTLI)} kB brotli.`,
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dist = resolve(
    args.find((a) => !a.startsWith('--')) ?? join(root, 'packages/m3e-elements/dist'),
  );
  if (!existsSync(join(dist, 'index.js'))) {
    console.error(`${relative(process.cwd(), dist)}/index.js not found: build m3e-elements first.`);
    process.exit(1);
  }
  const result = report(dist);
  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const text = table(result);
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Unbundled closure (D24)\n\n${text}\n`);
    }
  }
  for (const r of result.over) {
    console.error(
      `::error::${r.name}: ${kB(r.brotli)} kB brotli unbundled, over ${kB(CAP_BROTLI)} kB`,
    );
  }
  if (result.over.length > 0) process.exit(1);
}
