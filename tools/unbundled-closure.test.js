import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CAP_BROTLI, closure, entries, report, staticImports } from './unbundled-closure.js';

// A tiny dist in the shape rolldown writes for m3e-elements: entries in <name>/index.js, shared
// chunks at the root.
const dist = mkdtempSync(join(tmpdir(), 'unbundled-closure-'));
const write = (path, text) => {
  mkdirSync(join(dist, path, '..'), { recursive: true });
  writeFileSync(join(dist, path), text);
};
write('chunk-base.js', 'export class Base {}\n');
write('chunk-motion.js', 'import "./chunk-base.js";\nexport const spring = 1;\n');
write('chunk-lazy.js', 'export const later = 2;\n');
write(
  'menu/index.js',
  [
    'import { Base } from "../chunk-base.js";',
    'export { spring } from "../chunk-motion.js";',
    'export * from "../chunk-base.js";',
    'const lazy = () => import("../chunk-lazy.js");',
    'import("@kyralabs/m3e-elements/tooltip-popup.js");',
    'export const menu = [Base, lazy];',
  ].join('\n'),
);
write('icon/index.js', 'import "../chunk-base.js";\n');
write('index.js', 'export * from "./menu/index.js";\nexport * from "./icon/index.js";\n');
afterAll(() => rmSync(dist, { recursive: true, force: true }));

const names = (files) => [...files].map((f) => f.slice(dist.length + 1)).sort();

describe('unbundled-closure', () => {
  it('follows static imports and re-exports, not import()', () => {
    expect(names(staticImports(join(dist, 'menu/index.js')))).toEqual([
      'chunk-base.js',
      'chunk-base.js',
      'chunk-motion.js',
    ]);
    expect(names(closure(join(dist, 'menu/index.js')))).toEqual([
      'chunk-base.js',
      'chunk-motion.js',
      'menu/index.js',
    ]);
  });

  it('lists the index and every <entry>/index.js', () => {
    expect(entries(dist).map(([name]) => name)).toEqual(['index', 'icon', 'menu']);
  });

  it('reports each entry and the sets, under the cap', () => {
    const { rows, sets, over } = report(dist);
    const icon = rows.find((r) => r.name === 'icon');
    expect(icon?.files).toBe(2);
    expect(icon?.brotli).toBeGreaterThan(0);
    expect(rows.find((r) => r.name === 'index')?.files).toBe(5);
    expect(sets.find((s) => s.name === 'set: every element entry')?.files).toBe(4);
    expect(over).toEqual([]);
    expect(CAP_BROTLI).toBeGreaterThan(0);
  });
});
