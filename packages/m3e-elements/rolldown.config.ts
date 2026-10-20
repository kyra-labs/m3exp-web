import { defineConfig } from 'rolldown';

// The JavaScript build (D24). The build script runs it after `tsc -p tsconfig.dts.json` and
// before `tsup`, which bundles the d.ts next to the JS (tsup.config.ts); this build cleans dist/.
//
// One entry per element (`@kyralabs/m3e-elements/<element>.js` registers it, built to
// dist/<element>/index.js), `base.js` (M3eElement and helpers, registers nothing) and the index,
// as before. m3e-motion and m3e-shapes are bundled (zero runtime dependencies, D7), from their
// sources (the `@kyralabs/source` export condition): rolldown then splits shared code per source
// module, so an entry's static imports reach only the modules it uses. A page that loads dist
// without a bundler (a CDN `<script type="module">`) downloads that closure; with esbuild every
// entry imported one chunk holding all of m3e-motion. tools/unbundled-closure.js reports it in CI.
//
// (node:fs is imported by name: this config is typechecked with the browser sources, without
// Node's types.)
const FS = 'node:fs';
const fs = (await import(FS)) as {
  readdirSync(
    path: string,
    options: { withFileTypes: true },
  ): { name: string; isDirectory(): boolean }[];
  existsSync(path: string): boolean;
};
const input: Record<string, string> = { index: 'src/index.ts' };
for (const dir of fs.readdirSync('src', { withFileTypes: true })) {
  if (dir.isDirectory() && fs.existsSync(`src/${dir.name}/index.ts`)) {
    input[`${dir.name}/index`] = `src/${dir.name}/index.ts`;
  }
}

export default defineConfig({
  input,
  platform: 'browser',
  resolve: { conditionNames: ['@kyralabs/source', 'import', 'module', 'browser', 'default'] },
  // The package's own entries are only ever imported lazily, and stay package imports:
  // <m3e-button-group> imports the menu entry on its first overflow and both it and
  // <m3e-bottom-sheet> the tooltip-popup controller; a pane scaffold its pane-motion and
  // pane-expansion entries; <m3e-bottom-sheet>, <m3e-carousel> and the date pickers their layouts
  // on first render; <m3e-pull-to-refresh indicator="loading-indicator"> the loading indicator it
  // drives (owner decision M9 #28: not bundled, D17); the date and range pickers the date field
  // the first time their input mode shows.
  external: /^@kyralabs\/m3e-elements\//,
  treeshake: true,
  transform: {
    target: 'es2022',
    // Leaves `process.env.NODE_ENV` (dev-only warnings) for the consumer's bundler.
    define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' },
  },
  output: {
    dir: 'dist',
    cleanDir: true,
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: 'chunk-[hash].js',
    sourcemap: true,
    minify: false,
    // Keep `/* @__PURE__ */` (consumers' bundlers drop unused element classes with it, D23) and
    // license comments; drop JSDoc (the d.ts carries it), as esbuild did.
    comments: { legal: true, annotation: true, jsdoc: false },
  },
});
