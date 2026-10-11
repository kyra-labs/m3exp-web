// Shared assertions for the JVM reference fixture (src/__fixtures__/shapes-reference.json).
// ROADMAP M3 DoD tolerance is 1e-4; the float32-faithful port is held to bit-exactness for
// geometry (Kotlin prints the shortest Float decimal, so compare against Math.fround(value)).
import { expect } from 'vitest';
import type { Cubic } from './graphics-shapes/cubic.js';
import type { PathCommand } from './path.js';

export const TOLERANCE = 1e-4;

export interface ReferencePolygon {
  name: string;
  centerX: number;
  centerY: number;
  bounds: number[];
  maxBounds: number[];
  cubics: number[][];
}

/** A recorded Compose `Path`: `[verb, ...points]`. */
export type ReferencePath = (string | number)[][];

const expectClose = (actual: number, expected: number, label: string, tolerance: number): void => {
  const error = Math.abs(actual - Math.fround(expected));
  if (!(error <= tolerance)) expect.fail(`${label}: ${String(actual)} vs ${String(expected)}`);
};

/** Every cubic point equal to the Kotlin Float (within [tolerance], default exact). */
export function expectCubicsClose(
  actual: readonly Cubic[],
  expected: readonly number[][],
  label: string,
  tolerance = 0,
): void {
  expect(actual.length, `${label}: cubic count`).toBe(expected.length);
  actual.forEach((cubic, i) => {
    cubic.points.forEach((v, j) => {
      expectClose(
        v,
        expected[i]![j]!,
        `${label}: cubic ${String(i)} point ${String(j)}`,
        tolerance,
      );
    });
  });
}

/**
 * Same verbs in the same order, every coordinate within [TOLERANCE] of the box size [scale].
 * Paths go through Compose's Path/Matrix plumbing (shimmed on the JVM), so they are held to the
 * DoD tolerance rather than bit-exactness.
 */
export function expectPathClose(
  actual: readonly PathCommand[],
  expected: ReferencePath,
  label: string,
  scale = 1,
): void {
  expect(actual.map((c) => c[0]).join(''), `${label}: verbs`).toBe(
    expected.map((c) => c[0]).join(''),
  );
  actual.forEach((command, i) => {
    const values = expected[i]!.slice(1) as number[];
    command.slice(1).forEach((v, j) => {
      expectClose(
        v as number,
        values[j]!,
        `${label}: command ${String(i)} value ${String(j)}`,
        TOLERANCE * scale,
      );
    });
  });
}

export function expectNumbersClose(
  actual: readonly number[],
  expected: readonly number[],
  label: string,
  tolerance = 0,
): void {
  expect(actual.length, `${label}: length`).toBe(expected.length);
  actual.forEach((v, i) => {
    expectClose(v, expected[i]!, `${label}[${String(i)}]`, tolerance);
  });
}
