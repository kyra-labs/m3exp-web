import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

export default defineConfig({
  ...baseOptions,
  platform: 'node',
  target: 'node22',
  entry: ['src/index.ts'],
});
