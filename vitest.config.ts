import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// Resolve workspace packages to their TypeScript sources so tests never need a prior build.
// Vite resolves client (happy-dom) and server (node) environments separately.
const SOURCE = '@kyralabs/source';

export default defineConfig({
  resolve: { conditions: [SOURCE, ...defaultClientConditions] },
  ssr: { resolve: { conditions: [SOURCE, ...defaultServerConditions] } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'packages/*/src/**/*.node.test.ts',
            'packages/*/src/**/*.test.ts',
            'tools/**/*.test.js',
          ],
          exclude: ['packages/m3e-elements/src/**/!(*.node).test.ts', 'packages/m3e-react/src/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: [
            'packages/m3e-elements/src/**/*.test.ts',
            'packages/m3e-react/src/**/*.test.{ts,tsx}',
          ],
          exclude: ['**/*.node.test.ts'],
        },
      },
    ],
  },
});
