/*
 * Copyright 2022 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/Morph.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)

import { Cubic, MutableCubic } from './cubic.js';
import { featureMapper } from './feature-mapping.js';
import { AngleMeasurer, type MeasuredCubic, MeasuredPolygon } from './polygon-measure.js';
import type { RoundedPolygon } from './rounded-polygon.js';
import { AngleEpsilon, f, interpolate, positiveModulo } from './utils.js';

/**
 * This class is used to animate between start and end polygons objects.
 *
 * Morphing between arbitrary objects can be problematic because it can be difficult to determine
 * how the points of a given shape map to the points of some other shape. [Morph] simplifies the
 * problem by only operating on [RoundedPolygon] objects, which are known to have similar,
 * contiguous structures. For one thing, the shape of a polygon is contiguous from start to end
 * (compared to an arbitrary Path object, which could have one or more `moveTo` operations in the
 * shape). Also, all edges of a polygon shape are represented by [Cubic] objects, thus the start
 * and end shapes use similar operations. Two Polygon shapes then only differ in the quantity and
 * placement of their curves. The morph works by determining how to map the curves of the two
 * shapes together (based on proximity and other information, such as distance to polygon
 * vertices and concavity), and splitting curves when the shapes do not have the same number of
 * curves or when the curve placement within the shapes is very different.
 */
export class Morph {
  /** The structure which holds the actual shape being morphed: matched start/end cubics. */
  readonly morphMatch: readonly (readonly [Cubic, Cubic])[];

  constructor(
    private readonly start: RoundedPolygon,
    private readonly end: RoundedPolygon,
  ) {
    this.morphMatch = Morph.match(start, end);
  }

  /** Axis-aligned bounds covering both start and end shapes (and so the whole morph). */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = true): number[] {
    this.start.calculateBounds(bounds, approximate);
    const [minX, minY, maxX, maxY] = bounds as [number, number, number, number];
    this.end.calculateBounds(bounds, approximate);
    bounds[0] = Math.min(minX, bounds[0]!);
    bounds[1] = Math.min(minY, bounds[1]!);
    bounds[2] = Math.max(maxX, bounds[2]!);
    bounds[3] = Math.max(maxY, bounds[3]!);
    return bounds;
  }

  /** A square that holds both shapes in any rotation (see RoundedPolygon.calculateMaxBounds). */
  calculateMaxBounds(bounds: number[] = [0, 0, 0, 0]): number[] {
    this.start.calculateMaxBounds(bounds);
    const [minX, minY, maxX, maxY] = bounds as [number, number, number, number];
    this.end.calculateMaxBounds(bounds);
    bounds[0] = Math.min(minX, bounds[0]!);
    bounds[1] = Math.min(minY, bounds[1]!);
    bounds[2] = Math.max(maxX, bounds[2]!);
    bounds[3] = Math.max(maxY, bounds[3]!);
    return bounds;
  }

  /**
   * Returns a representation of the morph object at a given [progress] value as a list of Cubics.
   * Note that this function causes a new list to be created and populated, so there is some
   * overhead.
   */
  asCubics(progress: number): Cubic[] {
    const out: Cubic[] = [];
    // The first/last mechanism here ensures that the final anchor point in the shape
    // exactly matches the first anchor point. There can be rendering artifacts introduced
    // by those points being slightly off, even by much less than a pixel
    let firstCubic: Cubic | null = null;
    let lastCubic: Cubic | null = null;
    for (const [first, second] of this.morphMatch) {
      const cubic = new Cubic(
        first.points.map((v, it) => interpolate(v, second.points[it]!, progress)),
      );
      firstCubic ??= cubic;
      if (lastCubic !== null) out.push(lastCubic);
      lastCubic = cubic;
    }
    if (lastCubic !== null && firstCubic !== null) {
      out.push(
        Cubic.of(
          lastCubic.anchor0X,
          lastCubic.anchor0Y,
          lastCubic.control0X,
          lastCubic.control0Y,
          lastCubic.control1X,
          lastCubic.control1Y,
          firstCubic.anchor0X,
          firstCubic.anchor0Y,
        ),
      );
    }
    return out;
  }

  /**
   * Calls [callback] for each of the cubics of the morph at [progress], reusing [mutableCubic]
   * (no per-frame allocation).
   */
  forEachCubic(
    progress: number,
    callback: (cubic: MutableCubic) => void,
    mutableCubic: MutableCubic = new MutableCubic(),
  ): void {
    for (const [first, second] of this.morphMatch) {
      mutableCubic.interpolate(first, second, progress);
      callback(mutableCubic);
    }
  }

  /**
   * Matches the cubics of two polygons: measures both outlines, maps their corners, cuts and
   * shifts the end polygon, then walks both, cutting curves so every pair spans the same progress.
   */
  static match(p1: RoundedPolygon, p2: RoundedPolygon): [Cubic, Cubic][] {
    // Measure polygons, returns lists of measured cubics for each polygon, which
    // we then use to match start/end curves
    const measuredPolygon1 = MeasuredPolygon.measurePolygon(
      new AngleMeasurer(p1.centerX, p1.centerY),
      p1,
    );
    const measuredPolygon2 = MeasuredPolygon.measurePolygon(
      new AngleMeasurer(p2.centerX, p2.centerY),
      p2,
    );

    // features1 and 2 will contain the list of corners (just the inner circular curve)
    // along with the progress at the middle of those corners. These measurement values
    // are then used to compare and match between the two polygons
    const features1 = measuredPolygon1.features;
    const features2 = measuredPolygon2.features;

    // Map features: doubleMapper is the result of mapping the features in each shape to the
    // closest feature in the other shape.
    // Given a progress in one of the shapes it can be used to find the corresponding
    // progress in the other shape (in both directions)
    const doubleMapper = featureMapper(features1, features2);

    // cut point on poly2 is the mapping of the 0 point on poly1
    const polygon2CutPoint = doubleMapper.map(0);

    // Cut and rotate.
    // Polygons start at progress 0, and the featureMapper has decided that we want to match
    // progress 0 in the first polygon to `polygon2CutPoint` on the second polygon.
    // So we need to cut the second polygon there and "rotate it", so as we walk through
    // both polygons we can find the matching.
    // The resulting bs1/2 are MeasuredPolygons, whose MeasuredCubics start from
    // outlineProgress=0 and increasing until outlineProgress=1
    const bs1 = measuredPolygon1;
    const bs2 = measuredPolygon2.cutAndShift(polygon2CutPoint);

    // Match
    // Now we can compare the two lists of measured cubics and create a list of pairs
    // of cubics [ret], which are the start/end curves that represent the Morph object
    // and the start and end shapes, and which can be interpolated to animate the
    // between those shapes.
    const ret: [Cubic, Cubic][] = [];
    const getOrNull = (p: MeasuredPolygon, i: number): MeasuredCubic | null =>
      i < p.size ? p.get(i) : null;
    // i1/i2 are the indices of the current cubic on the start (1) and end (2) shapes
    let i1 = 0;
    let i2 = 0;
    // b1, b2 are the current measured cubic for each polygon
    let b1 = getOrNull(bs1, i1++);
    let b2 = getOrNull(bs2, i2++);
    // Iterate until all curves are accounted for and matched
    while (b1 !== null && b2 !== null) {
      // Progresses are in shape1 perspective
      // b1a, b2a are ending progress values of current measured cubics in [0,1] range
      const b1a = i1 === bs1.size ? 1 : b1.endOutlineProgress;
      const b2a =
        i2 === bs2.size
          ? 1
          : doubleMapper.mapBack(positiveModulo(f(b2.endOutlineProgress + polygon2CutPoint), 1));
      const minb = Math.min(b1a, b2a);
      // min b is the progress at which the curve that ends first ends.
      // If both curves ends roughly there, no cutting is needed, we have a match.
      // If one curve extends beyond, we need to cut it.
      let seg1: MeasuredCubic;
      let newb1: MeasuredCubic | null;
      if (b1a > f(minb + AngleEpsilon)) {
        [seg1, newb1] = b1.cutAtProgress(minb);
      } else {
        seg1 = b1;
        newb1 = getOrNull(bs1, i1++);
      }
      let seg2: MeasuredCubic;
      let newb2: MeasuredCubic | null;
      if (b2a > f(minb + AngleEpsilon)) {
        [seg2, newb2] = b2.cutAtProgress(
          positiveModulo(f(doubleMapper.map(minb) - polygon2CutPoint), 1),
        );
      } else {
        seg2 = b2;
        newb2 = getOrNull(bs2, i2++);
      }
      ret.push([seg1.cubic, seg2.cubic]);
      b1 = newb1;
      b2 = newb2;
    }
    if (!(b1 === null && b2 === null)) {
      throw new Error("Expected both Polygon's Cubic to be fully matched");
    }
    return ret;
  }
}
