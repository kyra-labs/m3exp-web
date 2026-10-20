import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { build as rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';
import { nodeEnvProblems } from './check-node-env.js';

const MISSING = 'source reads process.env.NODE_ENV but dist does not';
const warn = `export const warn = () => { if (process.env.NODE_ENV !== 'production') console.warn('dev'); };`;

describe('check-node-env', () => {
  it('accepts NODE_ENV left for the consumer', () => {
    const dist = 'try { return process.env.NODE_ENV !== "production"; } catch { return true; }';
    expect(nodeEnvProblems(dist, true)).toEqual([]);
  });

  it('flags an unfolded substitution', () => {
    expect(nodeEnvProblems('if ("development" !== "production") warn();', false)).toHaveLength(1);
  });

  it('flags NODE_ENV that was folded away', () => {
    // m3e-react 1.0.0 shipped this for `typeof process === 'undefined' || process.env.NODE_ENV !== 'production'`.
    expect(
      nodeEnvProblems('var isDev = () => typeof process === "undefined" || true;', true),
    ).toEqual([MISSING]);
    expect(nodeEnvProblems('function warn() {}', false)).toEqual([]);
  });

  // The bug this guards: esbuild's browser platform substitutes NODE_ENV unless it is defined.
  it('tsup.base.ts keeps esbuild from substituting NODE_ENV', async () => {
    const base = readFileSync(new URL('../tsup.base.ts', import.meta.url), 'utf8');
    const define = { 'process.env.NODE_ENV': 'process.env.NODE_ENV' };
    expect(base).toContain(`define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' }`);
    const bundle = (options) =>
      build({
        stdin: { contents: warn },
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'browser',
        ...options,
      }).then((r) => r.outputFiles[0].text);
    expect(nodeEnvProblems(await bundle({}), true)).toEqual([MISSING]);
    expect(nodeEnvProblems(await bundle({ define }), true)).toEqual([]);
  });

  // m3e-elements' JavaScript is built by rolldown (D24), whose browser platform substitutes it too.
  it("m3e-elements' rolldown.config.ts keeps rolldown from substituting NODE_ENV", async () => {
    const config = readFileSync(
      new URL('../packages/m3e-elements/rolldown.config.ts', import.meta.url),
      'utf8',
    );
    const define = { 'process.env.NODE_ENV': 'process.env.NODE_ENV' };
    expect(config).toContain(`define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' }`);
    const bundle = async (transform) => {
      const { output } = await rolldown({
        input: 'warn',
        platform: 'browser',
        write: false,
        transform,
        plugins: [{ name: 'warn', resolveId: (id) => id, load: () => warn }],
      });
      return output[0].code;
    };
    expect(nodeEnvProblems(await bundle({}), true)).toEqual([MISSING]);
    expect(nodeEnvProblems(await bundle({ define }), true)).toEqual([]);
  });
});

/** Bundles m3e-react's isDev as a consumer would and runs it without `process` (a browser). */
async function isDevInBrowser(define) {
  const { outputFiles } = await build({
    entryPoints: [
      fileURLToPath(new URL('../packages/m3e-react/src/utils/dev.ts', import.meta.url)),
    ],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'dev',
    platform: 'neutral',
    define,
  });
  return new Function('process', `${outputFiles[0].text}; return dev.isDev();`)(undefined);
}

describe('m3e-react isDev in the browser', () => {
  it('is off in a consumer production bundle', async () => {
    expect(await isDevInBrowser({ 'process.env.NODE_ENV': '"production"' })).toBe(false);
    expect(await isDevInBrowser({ 'process.env.NODE_ENV': '"development"' })).toBe(true);
  });

  it('stays on in unbundled ESM', async () => {
    expect(await isDevInBrowser({})).toBe(true);
  });
});
