// Builds every CSS file under ./src of the current package into ./dist (bundled, minified).
// Imports of other @kyralabs packages stay as @import so layers are not duplicated.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

/** @param {string} dir @returns {string[]} */
const cssFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });

const entryPoints = cssFiles('src');
await build({
  entryPoints,
  outbase: 'src',
  outdir: 'dist',
  bundle: true,
  minify: true,
  external: ['@kyralabs/*'],
  target: ['chrome113', 'firefox112', 'safari17.2'],
  logLevel: 'warning',
});
console.log(`build-css: ${String(entryPoints.length)} file(s)`);
