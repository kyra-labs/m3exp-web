import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

// d.ts: the build script first runs `tsc -p tsconfig.dts.json`, which emits one .d.ts per source
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

// One entry per element (`@kyralabs/m3e-elements/<element>.js` registers it, built to
// dist/<element>/index.js), `base.js` (M3eElement and helpers, registers nothing) and the
// index. Splitting keeps M3eElement in one shared chunk. m3e-motion and m3e-shapes are bundled
// (zero runtime dependencies, D7), so their types are inlined into the d.ts as well.
export default defineConfig({
  ...baseOptions,
  dts: {
    ...baseOptions.dts,
    entry: dtsEntry,
    resolve: ['@kyralabs/m3e-motion', '@kyralabs/m3e-shapes'],
  },
  entry: ['src/index.ts', 'src/*/index.ts'],
  splitting: true,
  // <m3e-button-group> imports the menu entry lazily (its first overflow); keep it a package import.
  // A pane scaffold imports its pane-motion and pane-expansion entries lazily; same.
  external: [
    '@kyralabs/m3e-elements/menu.js',
    '@kyralabs/m3e-elements/pane-motion.js',
    '@kyralabs/m3e-elements/pane-expansion.js',
    // <m3e-bottom-sheet> loads its layout and its drag handle's tooltip controller on first render.
    '@kyralabs/m3e-elements/bottom-sheet-layout.js',
    '@kyralabs/m3e-elements/tooltip-popup.js',
    // <m3e-carousel> loads its layout (the keyline math) on first render.
    '@kyralabs/m3e-elements/carousel-layout.js',
    // <m3e-pull-to-refresh indicator="loading-indicator"> loads the loading indicator it drives
    // (owner decision M9 #28: not bundled, D17).
    '@kyralabs/m3e-elements/loading-indicator.js',
    // The date pickers load their layouts on first render.
    '@kyralabs/m3e-elements/date-picker-layout.js',
    '@kyralabs/m3e-elements/date-range-picker-layout.js',
    '@kyralabs/m3e-elements/docked-date-picker-layout.js',
    // The date and range pickers load the date field the first time their input mode shows.
    '@kyralabs/m3e-elements/date-field.js',
  ],
});
