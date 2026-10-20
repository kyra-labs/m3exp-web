import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

// d.ts only: the JavaScript is built by rolldown (rolldown.config.ts, D24), which also cleans
// dist/. The build script first runs `tsc -p tsconfig.dts.json`, which emits one .d.ts per source
// file into .dts/ in a single TypeScript program (m3e-motion / m3e-shapes resolve to their built
// d.ts, the package's lazy self-imports to its sources). tsup then bundles those .d.ts files per
// entry: rollup-plugin-dts creates no TypeScript program for .d.ts inputs, so the whole build fits
// a 512 MB heap. (Given the .ts entries, it created one program per entry and needed a 4 GB heap.)
// The keys keep every public type path: dist/index.d.ts and dist/<entry>/index.d.ts. (node:fs is
// imported by name: this config is typechecked with the browser sources, without Node's types.)
const FS = 'node:fs';
const fs = (await import(FS)) as {
  readdirSync(
    path: string,
    options: { withFileTypes: true },
  ): { name: string; isDirectory(): boolean }[];
  existsSync(path: string): boolean;
};
const dtsEntry: Record<string, string> = { index: '.dts/index.d.ts' };
for (const dir of fs.readdirSync('src', { withFileTypes: true })) {
  if (dir.isDirectory() && fs.existsSync(`src/${dir.name}/index.ts`)) {
    dtsEntry[`${dir.name}/index`] = `.dts/${dir.name}/index.d.ts`;
  }
}

// The keys keep every public type path: dist/index.d.ts and dist/<entry>/index.d.ts. m3e-motion
// and m3e-shapes are bundled into the JS (zero runtime dependencies, D7), so their types are
// inlined into the d.ts as well.
export default defineConfig({
  ...baseOptions,
  dts: {
    ...baseOptions.dts,
    entry: dtsEntry,
    only: true,
    resolve: ['@kyralabs/m3e-motion', '@kyralabs/m3e-shapes'],
  },
  entry: dtsEntry,
  // The package's lazily imported entries (see rolldown.config.ts) stay package imports in the
  // d.ts too.
  external: [/^@kyralabs\/m3e-elements\//],
});
