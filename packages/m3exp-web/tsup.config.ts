import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

export default defineConfig({
  ...baseOptions,
  entry: ['src/index.ts', 'src/tokens.ts', 'src/elements.ts', 'src/react.ts'],
});
