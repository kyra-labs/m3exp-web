import { defineConfig } from 'tsup';
import { baseOptions } from '../../tsup.base.js';

const node = { ...baseOptions, platform: 'node', target: 'node22' } as const;

export default defineConfig([
  { ...node, entry: ['src/index.ts'] },
  {
    ...node,
    clean: false,
    dts: false,
    entry: { cli: 'src/cli.ts' },
    banner: { js: '#!/usr/bin/env node' },
  },
]);
