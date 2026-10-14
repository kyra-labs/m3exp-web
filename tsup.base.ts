import type { Options } from 'tsup';

/** Shared tsup settings: ESM + d.ts, no bundling of peer/runtime deps. */
export const baseOptions = {
  format: ['esm'],
  target: 'es2022',
  platform: 'browser',
  // tsup 8.5's d.ts worker injects `baseUrl`, which TypeScript 6 deprecates (TS5101).
  // The override is scoped to the d.ts build; `tsc` typechecks stay deprecation-strict.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  outDir: 'dist',
  // esbuild's browser platform defines `process.env.NODE_ENV` as "development" (unminified),
  // which baked dev-only warnings into the published JS. Defining it as itself leaves the
  // expression for the consumer's bundler. tsup's `replaceNodeEnv` is already off by default.
  define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' },
} satisfies Options;
