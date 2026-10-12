// Source fidelity of the loading indicator port (COMPONENT_SPEC §7), checked against the vendored
// LoadingIndicator.kt@19991f2c: the JVM reference harness copies its private geometry verbatim,
// and the TypeScript port uses the same shape sequence.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8').replace(/\r\n/g, '\n');
const vendored = read('packages/m3e-codegen/vendor/androidx-material3-sources/LoadingIndicator.kt');
const harness = read(
  'packages/m3e-shapes/reference-loading-indicator/LoadingIndicatorReference.kt',
);
const port = read('packages/m3e-shapes/src/loading-indicator.ts');
const unindent = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

describe('loading indicator JVM harness', () => {
  it('copies every VERBATIM block unchanged from the vendored LoadingIndicator.kt', () => {
    const blocks = [
      ...harness.matchAll(/\/\/ BEGIN VERBATIM ([^\n]+)\n([\s\S]*?)\n\s*\/\/ END VERBATIM/g),
    ];
    expect(blocks.map((b) => b[1])).toEqual([
      'IndeterminateIndicatorPolygons',
      'DeterminateIndicatorPolygons',
      'morphSequence',
      'calculateScaleFactor',
      'FloatArray.width',
      'FloatArray.height',
      'processPath',
      'determinate draw step',
    ]);
    for (const [, name, body] of blocks) {
      expect(unindent(vendored), name).toContain(unindent(body!));
    }
  });
});

describe('loading indicator port', () => {
  it('morphs through IndeterminateIndicatorPolygons in Compose order', () => {
    const kotlin = /IndeterminateIndicatorPolygons: List<RoundedPolygon> =\s*listOf\(([\s\S]*?)\)/
      .exec(vendored)![1]!
      .match(/MaterialShapes\.(\w+)/g)!
      .map((m) => m.replace('MaterialShapes.', ''));
    const ts = /const INDETERMINATE[^=]*= \[([\s\S]*?)\]/
      .exec(port)![1]!
      .match(/'(\w+)'/g)!
      .map((m) => m.slice(1, -1));
    expect(kotlin).toEqual([
      'SoftBurst',
      'Cookie9Sided',
      'Pentagon',
      'Pill',
      'Sunny',
      'Cookie4Sided',
      'Oval',
    ]);
    expect(ts).toEqual(kotlin);
  });

  it('rotates the determinate circle by 360 / 20 and draws with startAngle 0, as Compose does', () => {
    expect(vendored).toContain(
      'MaterialShapes.Circle.transformed(Matrix().apply { rotateZ(360f / 20) })',
    );
    expect(port).toContain(
      "transformedByMatrix(materialShape('Circle'), new Matrix().rotateZ(f(360 / 20)))",
    );
    expect(vendored.match(/startAngle = 0,/g)).toHaveLength(2);
    expect(port).toContain('startAngle: 0');
  });
});
