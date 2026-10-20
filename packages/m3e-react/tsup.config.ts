import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

export default defineConfig({
  ...baseOptions,
  entry: ['src/index.ts'],
  // The m3e-elements layouts and helpers this package uses are bundled. m3e-elements is listed in
  // `dependencies` only for the published d.ts, which imports its layout types (D22); tsup leaves
  // a dependency's imports external, so `noExternal` keeps the JavaScript bundled and nothing
  // loads twice (CI checks dist). Bundle them from their sources (the `@kyralabs/source` export
  // condition), so their imports of @kyralabs/m3e-motion and @kyralabs/m3e-shapes stay imports of
  // this package's dependencies instead of pulling in the copies m3e-elements' dist inlines (D7):
  // one copy of the spring and shape code in a React app. The d.ts build is unaffected: it keeps
  // the @kyralabs/m3e-elements/* type imports.
  noExternal: [/^@kyralabs\/m3e-elements(\/|$)/],
  esbuildOptions(options) {
    options.conditions = ['@kyralabs/source'];
  },
});
