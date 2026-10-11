// ROADMAP M3 DoD: "shape cubics match Kotlin reference dump within 1e-4; morph midpoints match".
// Fixture: packages/m3e-shapes/reference/ShapesReference.kt run against the unmodified Compose
// sources (pnpm reference:shapes).
import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/shapes-reference.json' with { type: 'json' };
import { Morph } from './graphics-shapes/morph.js';
import {
  type MaterialShapeName,
  materialShape,
  materialShapeNames,
  toShapeOutline,
} from './material-shapes.js';
import { toSvgPathData } from './path.js';
import { morphToPath, polygonToPath } from './shape-util.js';
import {
  type ReferencePath,
  type ReferencePolygon,
  expectCubicsClose,
  expectNumbersClose,
  expectPathClose,
} from './test-helpers.js';

interface ReferencePreset extends ReferencePolygon {
  outline100: ReferencePath;
}

interface ReferenceMorph {
  start: MaterialShapeName;
  end: MaterialShapeName;
  bounds: number[];
  maxBounds: number[];
  steps: { progress: number; cubics: number[][] }[];
  path50: ReferencePath;
}

const presets = reference.presets as ReferencePreset[];
const morphs = reference.morphs as ReferenceMorph[];
const paths = reference.paths as { name: string; path: ReferencePath }[];
const morphPairs = reference.morphPairs as [MaterialShapeName, MaterialShapeName, number, number][];

describe('MaterialShapes vs Compose (JVM)', () => {
  it('has the 35 shapes in MaterialShapes.kt order', () => {
    expect(materialShapeNames).toHaveLength(35);
    expect(materialShapeNames).toEqual(presets.map((p) => p.name));
  });

  it.each(presets.map((p) => [p.name, p] as const))('%s', (name, ref) => {
    const polygon = materialShape(name as MaterialShapeName);
    expectCubicsClose(polygon.cubics, ref.cubics, name);
    expectNumbersClose(
      [polygon.centerX, polygon.centerY],
      [ref.centerX, ref.centerY],
      `${name} center`,
    );
    expectNumbersClose(polygon.calculateBounds(), ref.bounds, `${name} bounds`);
    expectNumbersClose(polygon.calculateMaxBounds(), ref.maxBounds, `${name} maxBounds`);
    // toShape().createOutline(Size(100f, 100f)): within 1e-4 of the box.
    expectPathClose(toShapeOutline(polygon, 100, 100), ref.outline100, `${name} outline`, 100);
  });

  it('caches each shape', () => {
    expect(materialShape('Heart')).toBe(materialShape('Heart'));
  });
});

describe('Morph between MaterialShapes vs Compose (JVM)', () => {
  it.each(morphs.map((m) => [`${m.start} -> ${m.end}`, m] as const))('%s', (label, ref) => {
    const morph = new Morph(materialShape(ref.start), materialShape(ref.end));
    for (const step of ref.steps) {
      expectCubicsClose(
        morph.asCubics(step.progress),
        step.cubics,
        `${label} @ ${String(step.progress)}`,
      );
    }
    expectNumbersClose(morph.calculateBounds(), ref.bounds, `${label} bounds`);
    expectNumbersClose(morph.calculateMaxBounds(), ref.maxBounds, `${label} maxBounds`);
    expectPathClose(
      morphToPath(morph, 0.5, { rotationPivotX: 0.5, rotationPivotY: 0.5 }),
      ref.path50,
      `${label} path`,
    );
  });
});

describe('Morph between every pair of MaterialShapes vs Compose (JVM)', () => {
  it('covers all 35 x 34 ordered pairs', () => {
    expect(morphPairs).toHaveLength(35 * 34);
  });

  it('matches cubic count and checksum at progress 0.5 for every pair', () => {
    const mismatches = morphPairs.flatMap(([start, end, count, sum]) => {
      const cubics = new Morph(materialShape(start), materialShape(end)).asCubics(0.5);
      let actualSum = 0;
      for (const cubic of cubics) for (const v of cubic.points) actualSum += v;
      return cubics.length === count && actualSum === sum
        ? []
        : [
            `${start} -> ${end}: ${String(cubics.length)}/${String(count)} cubics, sum ${String(actualSum)}/${String(sum)}`,
          ];
    });
    expect(mismatches).toEqual([]);
  });
});

describe('ShapeUtil toPath vs Compose (JVM)', () => {
  const cases: Record<string, () => ReturnType<typeof polygonToPath>> = {
    'Heart.toPath': () => polygonToPath(materialShape('Heart'), { startAngle: 270 }),
    'Slanted.toPath': () => polygonToPath(materialShape('Slanted'), { startAngle: 270 }),
    'Triangle.toPath.repeat.open': () =>
      polygonToPath(materialShape('Triangle'), {
        startAngle: 270,
        repeatPath: true,
        closePath: false,
      }),
    'Triangle-Heart.toPath.30': () =>
      morphToPath(new Morph(materialShape('Triangle'), materialShape('Heart')), 0.3, {
        startAngle: 270,
        rotationPivotX: 0.5,
        rotationPivotY: 0.5,
      }),
  };

  it('covers every reference case', () => {
    expect(paths.map((p) => p.name).sort()).toEqual(Object.keys(cases).sort());
  });

  it.each(paths.map((p) => [p.name, p.path] as const))('%s', (name, expected) => {
    expectPathClose(cases[name]!(), expected, name);
  });
});

describe('toSvgPathData', () => {
  it('serializes absolute commands with bounded decimals', () => {
    expect(
      toSvgPathData(
        [['M', 100, 50], ['C', 1 / 3, -0.00001, 2, 2.5, 0, -1], ['L', 1e-9, 7], ['Z']],
        3,
      ),
    ).toBe('M100 50C0.333 0 2 2.5 0 -1L0 7Z');
  });

  it('keeps integers intact with no decimals', () => {
    expect(toSvgPathData([['M', 100, 10]], 0)).toBe('M100 10');
  });
});
