import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

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
  ],
});
