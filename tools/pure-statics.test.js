import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DIR, findImpureStatics, makeStaticsPure, scan } from './pure-statics.js';

const IMPURE = `class A extends B {
  static override properties = { ...B.properties, open: { type: Boolean } };
  static other = { ...B.other };
}
class C extends B {
  static properties = { own: {} };
}
`;

describe('pure-statics', () => {
  it('finds spreads in static properties only', () => {
    expect(findImpureStatics(IMPURE).map((f) => f.line)).toEqual([2]);
  });

  it('wraps them in a pure IIFE, idempotently', () => {
    const pure = makeStaticsPure(IMPURE);
    expect(pure).toContain(
      'static override properties = /* @__PURE__ */ (() => ({ ...B.properties, open: { type: Boolean } }))();',
    );
    expect(pure).toContain('static properties = { own: {} };');
    expect(findImpureStatics(pure)).toEqual([]);
    expect(makeStaticsPure(pure)).toBe(pure);
  });

  it('m3e-elements declares no impure static properties', () => {
    const found = scan().flatMap(({ file, found }) =>
      found.map(({ line }) => `${relative(DEFAULT_DIR, file)}:${line}`),
    );
    expect(found).toEqual([]);
  });

  // What the codemod is for: a bundle that imports element classes without registering them keeps
  // nothing. Each index.ts registers its element, so every other source module is imported for
  // its side effects only, from source, the way an app bundler would see the package. (With
  // `...Parent.properties` spreads this kept ~110 kB brotli of classes, layouts and m3e-motion /
  // m3e-shapes code.)
  it('element classes tree-shake when they are not registered', async () => {
    const modules = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name) && name !== 'index.ts') {
          modules.push(path);
        }
      }
    };
    walk(DEFAULT_DIR);
    expect(modules.length).toBeGreaterThan(50);
    const result = await build({
      stdin: {
        contents: modules.map((m) => `import ${JSON.stringify(m)};`).join('\n'),
        resolveDir: DEFAULT_DIR,
        loader: 'js',
      },
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      conditions: ['@kyralabs/source'],
      // The lazily imported entries stay package imports, as in the m3e-elements build.
      external: ['@kyralabs/m3e-elements/*'],
      minify: true,
      treeShaking: true,
      logLevel: 'silent',
    });
    const kept = result.outputFiles[0]?.text ?? '';
    expect(kept).not.toMatch(/\bclass\b|customElements/);
    // esbuild keeps two template-literal selector constants (list-layout, navigation-suite-layout)
    // that rolldown, which size-limit uses, drops; nothing else stays.
    expect(kept.length).toBeLessThan(200);
  });
});
