import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

// The d.ts build (one rollup-plugin-dts program over every entry, in a worker) outgrew V8's
// default heap on machines with ~8 GB (the Playwright Docker image under Docker Desktop: the
// worker ran out of memory once the bottom sheet entries were added). Workers take the process's
// V8 flags, so raise the old-space limit before tsup starts it. (node:v8 is imported by name: this
// config is typechecked with the browser sources, without Node's types.)
const V8 = 'node:v8';
const v8 = (await import(V8)) as { setFlagsFromString(flags: string): void };
v8.setFlagsFromString('--max-old-space-size=4096');

// One entry per element (`@kyralabs/m3e-elements/<element>.js` registers it, built to
// dist/<element>/index.js), `base.js` (M3eElement and helpers, registers nothing) and the
// index. Splitting keeps M3eElement in one shared chunk. m3e-motion and m3e-shapes are bundled
// (zero runtime dependencies, D7), so their types are inlined into the d.ts as well.
export default defineConfig({
  ...baseOptions,
  dts: { ...baseOptions.dts, resolve: ['@kyralabs/m3e-motion', '@kyralabs/m3e-shapes'] },
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
  ],
});
