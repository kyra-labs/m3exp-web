// COMPONENT_SPEC §7: the morph sequence order matches Compose, and every drawn path (including
// t = 0 of each segment) equals the Compose geometry. Fixture:
// packages/m3e-shapes/reference-loading-indicator/LoadingIndicatorReference.kt, run against the
// unmodified graphics-shapes / MaterialShapes / ShapeUtil / Matrix sources
// (pnpm reference:loading-indicator).
import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/loading-indicator-reference.json' with { type: 'json' };
import {
  LoadingIndicatorShapes,
  determinateFrame,
  determinateIndicatorPolygons,
  indeterminateIndicatorPolygons,
} from './loading-indicator.js';
import { materialShape } from './material-shapes.js';
import type { PathCommand } from './path.js';
import type { ReferencePath } from './test-helpers.js';

interface ReferenceSequence {
  morphs: number;
  scaleFactor: number;
  paths: { progress: number; path: ReferencePath }[][];
}

/** Every coordinate bit-equal to the Kotlin Float. */
function expectPathExact(actual: readonly PathCommand[], expected: ReferencePath, label: string) {
  expect(actual.map((c) => c[0]).join(''), `${label}: verbs`).toBe(
    expected.map((c) => c[0]).join(''),
  );
  actual.forEach((command, i) => {
    const values = expected[i]!.slice(1) as number[];
    command.slice(1).forEach((v, j) => {
      if (v !== Math.fround(values[j]!)) {
        expect.fail(
          `${label}: command ${String(i)} value ${String(j)}: ${String(v)} vs ${String(values[j])}`,
        );
      }
    });
  });
}

describe('sequence order', () => {
  it('indeterminate shapes are LoadingIndicatorDefaults.IndeterminateIndicatorPolygons, in order', () => {
    // m3e-codegen's loading-indicator-sources test ties this list to the vendored Kotlin.
    const names = [
      'SoftBurst',
      'Cookie9Sided',
      'Pentagon',
      'Pill',
      'Sunny',
      'Cookie4Sided',
      'Oval',
    ] as const;
    const polygons = indeterminateIndicatorPolygons();
    names.forEach((name, i) => {
      expect(polygons[i]!.cubics, name).toEqual(materialShape(name).cubics);
    });
  });
});

describe('geometry equals Compose (bit-exact)', () => {
  const cases = [
    ['indeterminate', indeterminateIndicatorPolygons(), true],
    ['determinate', determinateIndicatorPolygons(), false],
  ] as const;
  for (const [name, polygons, circular] of cases) {
    const expected: ReferenceSequence = reference[name];
    const shapes = new LoadingIndicatorShapes(polygons, circular, reference.activeIndicatorScale);

    it(`${name}: morph count and scale factor`, () => {
      expect(shapes.morphs.length).toBe(expected.morphs);
      expect(shapes.scaleFactor).toBe(Math.fround(expected.scaleFactor));
    });

    it(`${name}: processed paths (t = 0 of every segment, mid-morph, overshoot)`, () => {
      expected.paths.forEach((steps, morphIndex) => {
        for (const { progress, path } of steps) {
          expectPathExact(
            shapes.path(morphIndex, Math.fround(progress), reference.size),
            path,
            `${name} morph ${String(morphIndex)} @ ${String(progress)}`,
          );
        }
      });
    });
  }

  it('determinate draw step: active morph, local progress and rotation', () => {
    for (const frame of reference.determinateFrames) {
      const actual = determinateFrame(Math.fround(frame.progress), reference.determinate.morphs);
      expect(actual.morphIndex, String(frame.progress)).toBe(frame.morphIndex);
      expect(actual.morphProgress, String(frame.progress)).toBe(Math.fround(frame.morphProgress));
      expect(actual.rotation, String(frame.progress)).toBe(Math.fround(frame.rotation));
    }
  });

  it('coerces progress into 0..1 and treats NaN as 0', () => {
    expect(determinateFrame(-1, 1)).toEqual(determinateFrame(0, 1));
    expect(determinateFrame(2, 1)).toEqual(determinateFrame(1, 1));
    expect(determinateFrame(Number.NaN, 1)).toEqual(determinateFrame(0, 1));
  });

  it('needs at least two polygons', () => {
    expect(() => new LoadingIndicatorShapes([materialShape('Oval')], true, 1)).toThrow(
      'at least, two',
    );
  });
});
