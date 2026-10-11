// ROADMAP M3 DoD: "shape cubics match Kotlin reference dump within 1e-4"; the float32-faithful port
// is held to bit-exactness. Fixture: the JVM harness (packages/m3e-shapes/reference) compiled with
// the unmodified graphics-shapes 1.0.1 sources.
import { describe, expect, it } from 'vitest';
import reference from '../__fixtures__/shapes-reference.json' with { type: 'json' };
import { type ReferencePolygon, expectCubicsClose, expectNumbersClose } from '../test-helpers.js';
import { CornerRounding } from './corner-rounding.js';
import { RoundedPolygon } from './rounded-polygon.js';
import { circle, pill, pillStar, rectangle, star } from './shapes.js';
import { FLOAT_MIN_VALUE } from './utils.js';

/** Kotlin float literal. */
const f = Math.fround;

const cases: Record<string, () => RoundedPolygon> = {
  'pentagon.rounded': () =>
    RoundedPolygon.fromVertexCount(5, { radius: 1, rounding: new CornerRounding(f(0.2), f(0.5)) }),
  'circle.12': () => circle({ numVertices: 12, radius: 2, centerX: 1, centerY: -1 }),
  'rectangle.rounded': () =>
    rectangle({ width: 2, height: 1, rounding: new CornerRounding(f(0.3), f(0.7)) }),
  'rectangle.perVertex': () =>
    rectangle({
      perVertexRounding: [
        new CornerRounding(f(0.1)),
        new CornerRounding(f(0.4), 1),
        CornerRounding.Unrounded,
        new CornerRounding(f(0.25), f(0.25)),
      ],
    }),
  'star.8': () =>
    star(8, {
      innerRadius: f(0.6),
      rounding: new CornerRounding(f(0.15), f(0.3)),
      innerRounding: new CornerRounding(f(0.05)),
    }),
  'pill.smooth': () => pill({ width: 3, height: 1, smoothing: f(0.6) }),
  pillStar: () =>
    pillStar({
      width: 2,
      height: 1,
      numVerticesPerRadius: 10,
      innerRadiusRatio: f(0.7),
      rounding: new CornerRounding(f(0.1)),
    }),
  'custom.concave': () =>
    RoundedPolygon.fromVertices([0, 0, 1, 0, 1, 1, 0.5, 0.4, 0, 1].map(f), {
      rounding: new CornerRounding(f(0.1), f(0.5)),
    }),
  'custom.negativeOnly': () => RoundedPolygon.fromVertices([-3, -3, -1, -3, -2, -1]),
};

describe('graphics-shapes 1.0.1 vs Kotlin (JVM)', () => {
  const polygons = reference.polygons as ReferencePolygon[];

  it('covers every reference case', () => {
    expect(polygons.map((p) => p.name).sort()).toEqual(Object.keys(cases).sort());
  });

  it.each(polygons.map((p) => [p.name, p] as const))('%s', (name, ref) => {
    const polygon = cases[name]!();
    expectCubicsClose(polygon.cubics, ref.cubics, name);
    expectNumbersClose(
      [polygon.centerX, polygon.centerY],
      [ref.centerX, ref.centerY],
      `${name} center`,
    );
    expectNumbersClose(polygon.calculateBounds(), ref.bounds, `${name} bounds`);
    expectNumbersClose(polygon.calculateMaxBounds(), ref.maxBounds, `${name} maxBounds`);
  });

  it('reproduces the 1.0.1 Float.MIN_VALUE bounds quirk', () => {
    const bounds = cases['custom.negativeOnly']!().calculateBounds();
    expect(bounds[2]).toBe(FLOAT_MIN_VALUE);
    expect(bounds[3]).toBe(FLOAT_MIN_VALUE);
  });
});
