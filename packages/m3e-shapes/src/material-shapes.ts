/*
 * Copyright 2024 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/MaterialShapes.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// Float32-faithful like the graphics-shapes port (see graphics-shapes/utils.ts): Kotlin float
// literals and every Float operation go through `f` (Math.fround).

import { CornerRounding } from './graphics-shapes/corner-rounding.js';
import { RoundedPolygon } from './graphics-shapes/rounded-polygon.js';
import { circle, rectangle, star } from './graphics-shapes/shapes.js';
import { FloatPi, f } from './graphics-shapes/utils.js';
import { Matrix } from './matrix.js';
import { type PathCommand, pathBounds, transformPath, translatePath } from './path.js';
import { polygonToPath, transformedByMatrix } from './shape-util.js';

/**
 * The outline Compose's `RoundedPolygon.toShape(startAngle).createOutline(size, …)` produces: the
 * path scaled to [width] x [height], then centered by its control-point bounds.
 */
export function toShapeOutline(
  polygon: RoundedPolygon,
  width: number,
  height: number,
  startAngle = 0,
): PathCommand[] {
  const shapePath = polygonToPath(polygon, { startAngle });
  // Scale and translate the path to align its center with the available size center.
  const path = transformPath(shapePath, new Matrix().scale(width, height));
  const [left, top, right, bottom] = pathBounds(path);
  return translatePath(path, width / 2 - (left + right) / 2, height / 2 - (top + bottom) / 2);
}

// Cache various roundings for use below
const cornerRound15 = new CornerRounding(f(0.15));
const cornerRound20 = new CornerRounding(f(0.2));
const cornerRound30 = new CornerRounding(f(0.3));
const cornerRound50 = new CornerRounding(f(0.5));
const cornerRound100 = new CornerRounding(1);

const rotateNeg45 = new Matrix().rotateZ(-45);
const rotateNeg90 = new Matrix().rotateZ(-90);
const rotateNeg135 = new Matrix().rotateZ(-135);

interface PointNRound {
  readonly x: number;
  readonly y: number;
  readonly r: CornerRounding;
}

/** `PointNRound(Offset(x, y), r)` with Kotlin float literals. */
const pnr = (x: number, y: number, r: CornerRounding = CornerRounding.Unrounded): PointNRound => ({
  x: f(x),
  y: f(y),
  r,
});

/** `CornerRounding(radius, smoothing)` with Kotlin float literals. */
const cr = (radius: number, smoothing = 0): CornerRounding => new CornerRounding(radius, smoothing);

const toRadians = (degrees: number): number => f(f(f(degrees / 360) * 2) * FloatPi);

const angleDegrees = (x: number, y: number): number => f(f(f(Math.atan2(y, x)) * 180) / FloatPi);

function rotateDegrees(
  p: PointNRound,
  angle: number,
  centerX: number,
  centerY: number,
): PointNRound {
  const a = toRadians(angle);
  const cos = f(Math.cos(a));
  const sin = f(Math.sin(a));
  const offX = f(p.x - centerX);
  const offY = f(p.y - centerY);
  return {
    x: f(f(f(offX * cos) - f(offY * sin)) + centerX),
    y: f(f(f(offX * sin) + f(offY * cos)) + centerY),
    r: p.r,
  };
}

function doRepeat(
  points: readonly PointNRound[],
  reps: number,
  centerX: number,
  centerY: number,
  mirroring: boolean,
): PointNRound[] {
  const out: PointNRound[] = [];
  if (mirroring) {
    const angles = points.map((it) => angleDegrees(f(it.x - centerX), f(it.y - centerY)));
    const distances = points.map((it) => {
      const x = f(it.x - centerX);
      const y = f(it.y - centerY);
      return f(Math.sqrt(f(f(x * x) + f(y * y))));
    });
    const actualReps = reps * 2;
    const sectionAngle = f(360 / actualReps);
    for (let it = 0; it < actualReps; it++) {
      for (let index = 0; index < points.length; index++) {
        const i = it % 2 === 0 ? index : points.length - 1 - index;
        if (i > 0 || it % 2 === 0) {
          const angle = angles[i] ?? 0;
          const a = toRadians(
            f(
              f(sectionAngle * it) +
                (it % 2 === 0 ? angle : f(f(sectionAngle - angle) + f(2 * (angles[0] ?? 0)))),
            ),
          );
          const distance = distances[i] ?? 0;
          out.push({
            x: f(f(f(Math.cos(a)) * distance) + centerX),
            y: f(f(f(Math.sin(a)) * distance) + centerY),
            r: points[i]?.r ?? CornerRounding.Unrounded,
          });
        }
      }
    }
  } else {
    const np = points.length;
    for (let it = 0; it < np * reps; it++) {
      const p = points[it % np];
      if (p) out.push(rotateDegrees(p, f((Math.trunc(it / np) * 360) / reps), centerX, centerY));
    }
  }
  return out;
}

function customPolygon(
  points: readonly PointNRound[],
  reps: number,
  mirroring = false,
): RoundedPolygon {
  // Every MaterialShapes polygon uses the default center, Offset(0.5f, 0.5f).
  const centerX = 0.5;
  const centerY = 0.5;
  const actualPoints = doRepeat(points, reps, centerX, centerY, mirroring);
  return RoundedPolygon.fromVertices(
    actualPoints.flatMap((p) => [p.x, p.y]),
    { perVertexRounding: actualPoints.map((p) => p.r), centerX, centerY },
  );
}

// The builders, in MaterialShapes.kt order.
const builders = {
  Circle: () => circle({ numVertices: 10 }),
  Square: () => rectangle({ width: 1, height: 1, rounding: cornerRound30 }),
  Slanted: () =>
    customPolygon([pnr(0.926, 0.97, cr(0.189, 0.811)), pnr(-0.021, 0.967, cr(0.187, 0.057))], 2),
  Arch: () =>
    transformedByMatrix(
      RoundedPolygon.fromVertexCount(4, {
        perVertexRounding: [cornerRound100, cornerRound100, cornerRound20, cornerRound20],
      }),
      rotateNeg135,
    ),
  Fan: () =>
    customPolygon(
      [
        pnr(1.004, 1.0, cr(0.148, 0.417)),
        pnr(0.0, 1.0, cr(0.151)),
        pnr(0.0, -0.003, cr(0.148)),
        pnr(0.978, 0.02, cr(0.803)),
      ],
      1,
    ),
  Arrow: () =>
    customPolygon(
      [
        pnr(0.5, 0.892, cr(0.313)),
        pnr(-0.216, 1.05, cr(0.207)),
        pnr(0.499, -0.16, cr(0.215, 1.0)),
        pnr(1.225, 1.06, cr(0.211)),
      ],
      1,
    ),
  SemiCircle: () =>
    rectangle({
      width: f(1.6),
      height: 1,
      perVertexRounding: [cornerRound20, cornerRound20, cornerRound100, cornerRound100],
    }),
  Oval: () =>
    transformedByMatrix(transformedByMatrix(circle(), new Matrix().scale(1, f(0.64))), rotateNeg45),
  Pill: () =>
    customPolygon(
      [pnr(0.961, 0.039, cr(0.426)), pnr(1.001, 0.428), pnr(1.0, 0.609, cr(1.0))],
      2,
      true,
    ),
  Triangle: () =>
    transformedByMatrix(
      RoundedPolygon.fromVertexCount(3, { rounding: cornerRound20 }),
      rotateNeg90,
    ),
  Diamond: () => customPolygon([pnr(0.5, 1.096, cr(0.151, 0.524)), pnr(0.04, 0.5, cr(0.159))], 2),
  ClamShell: () =>
    customPolygon(
      [pnr(0.171, 0.841, cr(0.159)), pnr(-0.02, 0.5, cr(0.14)), pnr(0.17, 0.159, cr(0.159))],
      2,
    ),
  Pentagon: () =>
    customPolygon(
      [pnr(0.5, -0.009, cr(0.172)), pnr(1.03, 0.365, cr(0.164)), pnr(0.828, 0.97, cr(0.169))],
      1,
      true,
    ),
  Gem: () =>
    customPolygon(
      [
        pnr(0.499, 1.023, cr(0.241, 0.778)),
        pnr(-0.005, 0.792, cr(0.208)),
        pnr(0.073, 0.258, cr(0.228)),
        pnr(0.433, -0.0, cr(0.491)),
      ],
      1,
      true,
    ),
  Sunny: () => star(8, { innerRadius: f(0.8), rounding: cornerRound15 }),
  VerySunny: () => customPolygon([pnr(0.5, 1.08, cr(0.085)), pnr(0.358, 0.843, cr(0.085))], 8),
  Cookie4Sided: () => customPolygon([pnr(1.237, 1.236, cr(0.258)), pnr(0.5, 0.918, cr(0.233))], 4),
  // 6-point cookie
  Cookie6Sided: () => customPolygon([pnr(0.723, 0.884, cr(0.394)), pnr(0.5, 1.099, cr(0.398))], 6),
  // 7-point cookie
  Cookie7Sided: () =>
    transformedByMatrix(star(7, { innerRadius: f(0.75), rounding: cornerRound50 }), rotateNeg90),
  Cookie9Sided: () =>
    transformedByMatrix(star(9, { innerRadius: f(0.8), rounding: cornerRound50 }), rotateNeg90),
  Cookie12Sided: () =>
    transformedByMatrix(star(12, { innerRadius: f(0.8), rounding: cornerRound50 }), rotateNeg90),
  Ghostish: () =>
    customPolygon(
      [
        pnr(0.5, 0, cr(1.0)),
        pnr(1, 0, cr(1.0)),
        pnr(1, 1.14, cr(0.254, 0.106)),
        pnr(0.575, 0.906, cr(0.253)),
      ],
      1,
      true,
    ),
  Clover4Leaf: () => customPolygon([pnr(0.5, 0.074), pnr(0.725, -0.099, cr(0.476))], 4, true),
  Clover8Leaf: () => customPolygon([pnr(0.5, 0.036), pnr(0.758, -0.101, cr(0.209))], 8),
  Burst: () => customPolygon([pnr(0.5, -0.006, cr(0.006)), pnr(0.592, 0.158, cr(0.006))], 12),
  SoftBurst: () => customPolygon([pnr(0.193, 0.277, cr(0.053)), pnr(0.176, 0.055, cr(0.053))], 10),
  Boom: () => customPolygon([pnr(0.457, 0.296, cr(0.007)), pnr(0.5, -0.051, cr(0.007))], 15),
  SoftBoom: () =>
    customPolygon(
      [
        pnr(0.733, 0.454),
        pnr(0.839, 0.437, cr(0.532)),
        pnr(0.949, 0.449, cr(0.439, 1.0)),
        pnr(0.998, 0.478, cr(0.174)),
      ],
      16,
      true,
    ),
  Flower: () =>
    customPolygon(
      [pnr(0.37, 0.187), pnr(0.416, 0.049, cr(0.381)), pnr(0.479, 0.001, cr(0.095))],
      8,
      true,
    ),
  Puffy: () =>
    transformedByMatrix(
      customPolygon(
        [
          pnr(0.5, 0.053),
          pnr(0.545, -0.04, cr(0.405)),
          pnr(0.67, -0.035, cr(0.426)),
          pnr(0.717, 0.066, cr(0.574)),
          pnr(0.722, 0.128),
          pnr(0.777, 0.002, cr(0.36)),
          pnr(0.914, 0.149, cr(0.66)),
          pnr(0.926, 0.289, cr(0.66)),
          pnr(0.881, 0.346),
          pnr(0.94, 0.344, cr(0.126)),
          pnr(1.003, 0.437, cr(0.255)),
        ],
        2,
        true,
      ),
      new Matrix().scale(1, f(0.742)),
    ),
  PuffyDiamond: () =>
    customPolygon(
      [pnr(0.87, 0.13, cr(0.146)), pnr(0.818, 0.357), pnr(1.0, 0.332, cr(0.853))],
      4,
      true,
    ),
  PixelCircle: () =>
    customPolygon(
      [
        pnr(0.5, 0.0),
        pnr(0.704, 0.0),
        pnr(0.704, 0.065),
        pnr(0.843, 0.065),
        pnr(0.843, 0.148),
        pnr(0.926, 0.148),
        pnr(0.926, 0.296),
        pnr(1.0, 0.296),
      ],
      2,
      true,
    ),
  PixelTriangle: () =>
    customPolygon(
      [
        pnr(0.11, 0.5),
        pnr(0.113, 0.0),
        pnr(0.287, 0.0),
        pnr(0.287, 0.087),
        pnr(0.421, 0.087),
        pnr(0.421, 0.17),
        pnr(0.56, 0.17),
        pnr(0.56, 0.265),
        pnr(0.674, 0.265),
        pnr(0.675, 0.344),
        pnr(0.789, 0.344),
        pnr(0.789, 0.439),
        pnr(0.888, 0.439),
      ],
      1,
      true,
    ),
  Bun: () =>
    customPolygon(
      [pnr(0.796, 0.5), pnr(0.853, 0.518, cr(1)), pnr(0.992, 0.631, cr(1)), pnr(0.968, 1.0, cr(1))],
      2,
      true,
    ),
  Heart: () =>
    customPolygon(
      [
        pnr(0.5, 0.268, cr(0.016)),
        pnr(0.792, -0.066, cr(0.958)),
        pnr(1.064, 0.276, cr(1.0)),
        pnr(0.501, 0.946, cr(0.129)),
      ],
      1,
      true,
    ),
} satisfies Record<string, () => RoundedPolygon>;

export type MaterialShapeName = keyof typeof builders;

/** The 35 Material shape names, in MaterialShapes.kt order. */
export const materialShapeNames = Object.keys(builders) as MaterialShapeName[];

const cache = new Map<MaterialShapeName, RoundedPolygon>();

/**
 * A predefined Material shape as a normalized [RoundedPolygon] (fits the unit square), created on
 * first use and cached, like the `MaterialShapes.<Name>` getters.
 */
export function materialShape(name: MaterialShapeName): RoundedPolygon {
  let polygon = cache.get(name);
  if (polygon === undefined) {
    polygon = builders[name]().normalized();
    cache.set(name, polygon);
  }
  return polygon;
}
