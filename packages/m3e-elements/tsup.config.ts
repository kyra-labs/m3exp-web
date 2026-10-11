import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

// One entry per element (`@kyralabs/m3e-elements/<element>.js` registers it, built to
// dist/<element>/index.js), `base.js` (M3eElement and helpers, registers nothing) and the
// index. Splitting keeps M3eElement in one shared chunk.
export default defineConfig({
  ...baseOptions,
  entry: ['src/index.ts', 'src/*/index.ts'],
  splitting: true,
});
