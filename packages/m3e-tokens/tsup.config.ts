import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

// material-color-utilities 0.4.0 ships ESM with extensionless relative imports that Node cannot
// load, so it is bundled (with its license headers) instead of being a runtime dependency.
const MCU = ['@material/material-color-utilities'];

export default defineConfig([
  {
    ...baseOptions,
    entry: ['src/index.ts', 'src/components.ts', 'src/theme.ts', 'src/theme-css.ts'],
    noExternal: MCU,
  },
  {
    ...baseOptions,
    clean: false,
    dts: false,
    platform: 'node',
    target: 'node22',
    entry: { 'cli/theme': 'src/cli/theme.ts' },
    banner: { js: '#!/usr/bin/env node' },
    noExternal: MCU,
  },
]);
