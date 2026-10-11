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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/RoundedPolygon.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)
//
// Faithful to 1.0.1, including two upstream behaviours fixed in later releases:
// - calculateCenter() divides the coordinate sum by vertices.size and then by 2 again
//   (graphics-shapes 1.1.0-alpha01: "Fix an error in the algorithm to estimate the center").
// - calculateBounds() starts max values at Float.MIN_VALUE (the smallest positive float), so
//   bounds of geometry entirely at negative coordinates report max 0.

import { CornerRounding } from './corner-rounding.js';
import { Cubic } from './cubic.js';
import { Corner, Edge, type Feature } from './features.js';
import {
  type Point,
  type PointTransformer,
  clockwise,
  div,
  dotProduct,
  getDirection,
  interpolatePoint,
  minus,
  plus,
  point,
  times,
  transformed,
} from './point.js';
import {
  DistanceEpsilon,
  FLOAT_MAX_VALUE,
  FLOAT_MIN_VALUE,
  FloatPi,
  directionVector,
  f,
  distance,
  distanceSquared,
  radialToCartesian,
  rotate90,
  square,
} from './utils.js';

/**
 * The RoundedPolygon class allows simple construction of polygonal shapes with optional rounding
 * at the vertices. Polygons can be constructed with either the number of vertices desired or an
 * ordered list of vertices.
 */
export class RoundedPolygon {
  readonly cubics: readonly Cubic[];
  readonly centerX: number;
  readonly centerY: number;

  constructor(
    readonly features: readonly Feature[],
    centerX: number,
    centerY: number,
  ) {
    this.centerX = f(centerX);
    this.centerY = f(centerY);
    this.cubics = buildCubics(features);
    let prevCubic = this.cubics[this.cubics.length - 1]!;
    for (const cubic of this.cubics) {
      if (
        Math.abs(f(cubic.anchor0X - prevCubic.anchor1X)) > DistanceEpsilon ||
        Math.abs(f(cubic.anchor0Y - prevCubic.anchor1Y)) > DistanceEpsilon
      ) {
        throw new Error(
          'RoundedPolygon must be contiguous, with the anchor points of all curves matching the ' +
            'anchor points of the preceding and succeeding cubics',
        );
      }
      prevCubic = cubic;
    }
  }

  /** Transforms (scales/translates/etc.) this [RoundedPolygon] with the given [PointTransformer]. */
  transformed(f: PointTransformer): RoundedPolygon {
    const center = transformed(point(this.centerX, this.centerY), f);
    return new RoundedPolygon(
      this.features.map((feature) => feature.transformed(f)),
      center.x,
      center.y,
    );
  }

  /**
   * Creates a new RoundedPolygon, moving and resizing this one, so it is completely inside the
   * (0, 0) -> (1, 1) square, centered if there extra space in one direction
   */
  normalized(): RoundedPolygon {
    const bounds = this.calculateBounds();
    const width = f(bounds[2]! - bounds[0]!);
    const height = f(bounds[3]! - bounds[1]!);
    const side = Math.max(width, height);
    // Center the shape if bounds are not a square
    const offsetX = f(f(f(side - width) / 2) - bounds[0]!); /* left */
    const offsetY = f(f(f(side - height) / 2) - bounds[1]!); /* top */
    return this.transformed((x, y) => [f(f(x + offsetX) / side), f(f(y + offsetY) / side)]);
  }

  toString(): string {
    return `[RoundedPolygon. Cubics = ${this.cubics.join(', ')} || Features = ${this.features.join(', ')} || Center = (${String(this.centerX)}, ${String(this.centerY)})]`;
  }

  /**
   * Like [calculateBounds], this function calculates the axis-aligned bounds of the object and
   * returns that rectangle. But this function determines the max dimension of the shape (by
   * calculating the distance from its center to the start and midpoint of each curve) and returns
   * a square which can be used to hold the object in any rotation.
   */
  calculateMaxBounds(bounds: number[] = [0, 0, 0, 0]): number[] {
    if (bounds.length < 4) throw new Error('Required bounds size of 4');
    let maxDistSquared = 0;
    for (const cubic of this.cubics) {
      const anchorDistance = distanceSquared(
        f(cubic.anchor0X - this.centerX),
        f(cubic.anchor0Y - this.centerY),
      );
      const middlePoint = cubic.pointOnCurve(0.5);
      const middleDistance = distanceSquared(
        f(middlePoint.x - this.centerX),
        f(middlePoint.y - this.centerY),
      );
      maxDistSquared = Math.max(maxDistSquared, Math.max(anchorDistance, middleDistance));
    }
    const d = f(Math.sqrt(maxDistSquared));
    bounds[0] = f(this.centerX - d);
    bounds[1] = f(this.centerY - d);
    bounds[2] = f(this.centerX + d);
    bounds[3] = f(this.centerY + d);
    return bounds;
  }

  /**
   * Calculates the axis-aligned bounds of the object. With [approximate] (the default), uses the
   * bounding box of every anchor and control point.
   */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = true): number[] {
    if (bounds.length < 4) throw new Error('Required bounds size of 4');
    let minX = FLOAT_MAX_VALUE;
    let minY = FLOAT_MAX_VALUE;
    let maxX = FLOAT_MIN_VALUE;
    let maxY = FLOAT_MIN_VALUE;
    for (const cubic of this.cubics) {
      cubic.calculateBounds(bounds, approximate);
      minX = Math.min(minX, bounds[0]!);
      minY = Math.min(minY, bounds[1]!);
      maxX = Math.max(maxX, bounds[2]!);
      maxY = Math.max(maxY, bounds[3]!);
    }
    bounds[0] = minX;
    bounds[1] = minY;
    bounds[2] = maxX;
    bounds[3] = maxY;
    return bounds;
  }

  /** Copy constructor (Kotlin `RoundedPolygon(source)`). */
  static copy(source: RoundedPolygon): RoundedPolygon {
    return new RoundedPolygon(source.features, source.centerX, source.centerY);
  }

  /**
   * Regular polygon of [numVertices] vertices around ([centerX], [centerY]) at [radius]
   * (Kotlin `RoundedPolygon(numVertices, …)`).
   */
  static fromVertexCount(
    numVertices: number,
    options: {
      radius?: number;
      centerX?: number;
      centerY?: number;
      rounding?: CornerRounding;
      perVertexRounding?: readonly CornerRounding[] | null;
    } = {},
  ): RoundedPolygon {
    const { radius = 1, centerX = 0, centerY = 0, rounding = CornerRounding.Unrounded } = options;
    return RoundedPolygon.fromVertices(
      verticesFromNumVerts(numVertices, radius, centerX, centerY),
      {
        rounding,
        perVertexRounding: options.perVertexRounding ?? null,
        centerX,
        centerY,
      },
    );
  }

  /**
   * Polygon from an ordered list of `[x0, y0, x1, y1, …]` vertices (Kotlin
   * `RoundedPolygon(vertices, …)`). Center defaults to the (1.0.1) estimate from the vertices.
   */
  static fromVertices(
    vertices: ArrayLike<number>,
    options: {
      rounding?: CornerRounding;
      perVertexRounding?: readonly CornerRounding[] | null;
      centerX?: number;
      centerY?: number;
    } = {},
  ): RoundedPolygon {
    const {
      rounding = CornerRounding.Unrounded,
      perVertexRounding = null,
      centerX = FLOAT_MIN_VALUE,
      centerY = FLOAT_MIN_VALUE,
    } = options;
    if (vertices.length < 6) throw new Error('Polygons must have at least 3 vertices');
    if (vertices.length % 2 === 1) throw new Error('The vertices array should have even size');
    if (perVertexRounding !== null && perVertexRounding.length * 2 !== vertices.length) {
      throw new Error(
        'perVertexRounding list should be either null or the same size as the number of vertices (vertices.size / 2)',
      );
    }
    // Kotlin FloatArray
    const v = (i: number) => f(vertices[i]!);
    const corners: Cubic[][] = [];
    const n = vertices.length / 2;
    const roundedCorners: RoundedCorner[] = [];
    for (let i = 0; i < n; i++) {
      const vtxRounding = perVertexRounding?.[i] ?? rounding;
      const prevIndex = ((i + n - 1) % n) * 2;
      const nextIndex = ((i + 1) % n) * 2;
      roundedCorners.push(
        new RoundedCorner(
          point(v(prevIndex), v(prevIndex + 1)),
          point(v(i * 2), v(i * 2 + 1)),
          point(v(nextIndex), v(nextIndex + 1)),
          vtxRounding,
        ),
      );
    }

    // For each side, check if we have enough space to do the cuts needed, and if not split
    // the available space, first for round cuts, then for smoothing if there is space left.
    // Each element in this list is a pair, that represent how much we can do of the cut for
    // the given side (side i goes from corner i to corner i+1), the elements of the pair are:
    // first is how much we can use of expectedRoundCut, second how much of expectedCut
    const cutAdjusts: (readonly [number, number])[] = [];
    for (let ix = 0; ix < n; ix++) {
      const here = roundedCorners[ix]!;
      const next = roundedCorners[(ix + 1) % n]!;
      const expectedRoundCut = f(here.expectedRoundCut + next.expectedRoundCut);
      const expectedCut = f(here.expectedCut + next.expectedCut);
      const vtxX = v(ix * 2);
      const vtxY = v(ix * 2 + 1);
      const nextVtxX = v(((ix + 1) % n) * 2);
      const nextVtxY = v(((ix + 1) % n) * 2 + 1);
      const sideSize = distance(f(vtxX - nextVtxX), f(vtxY - nextVtxY));

      // Check expectedRoundCut first, and ensure we fulfill rounding needs first for
      // both corners before using space for smoothing
      if (expectedRoundCut > sideSize) {
        // Not enough room for fully rounding, see how much we can actually do.
        cutAdjusts.push([f(sideSize / expectedRoundCut), 0]);
      } else if (expectedCut > sideSize) {
        // We can do full rounding, but not full smoothing.
        cutAdjusts.push([1, f(f(sideSize - expectedRoundCut) / f(expectedCut - expectedRoundCut))]);
      } else {
        // There is enough room for rounding & smoothing.
        cutAdjusts.push([1, 1]);
      }
    }

    // Create and store list of beziers for each [potentially] rounded corner
    for (let i = 0; i < n; i++) {
      // allowedCuts[0] is for the side from the previous corner to this one,
      // allowedCuts[1] is for the side from this corner to the next one.
      const allowedCuts: number[] = [];
      const corner = roundedCorners[i]!;
      for (let delta = 0; delta <= 1; delta++) {
        const [roundCutRatio, cutRatio] = cutAdjusts[(i + n - 1 + delta) % n]!;
        allowedCuts.push(
          f(
            f(corner.expectedRoundCut * roundCutRatio) +
              f(f(corner.expectedCut - corner.expectedRoundCut) * cutRatio),
          ),
        );
      }
      corners.push(corner.getCubics(allowedCuts[0]!, allowedCuts[1]));
    }

    // Finally, store the calculated cubics. This includes all of the rounded corners
    // from above, along with new cubics representing the edges between those corners.
    const tempFeatures: Feature[] = [];
    for (let i = 0; i < n; i++) {
      // Determine whether corner at this vertex is concave or convex, based on the
      // relationship of the prev->curr/curr->next vectors
      // Note that these indices are for pairs of values (points), they need to be
      // doubled to access the xy values in the vertices float array
      const prevVtxIndex = (i + n - 1) % n;
      const nextVtxIndex = (i + 1) % n;
      const currVertex = point(v(i * 2), v(i * 2 + 1));
      const prevVertex = point(v(prevVtxIndex * 2), v(prevVtxIndex * 2 + 1));
      const nextVertex = point(v(nextVtxIndex * 2), v(nextVtxIndex * 2 + 1));
      const convex = clockwise(minus(currVertex, prevVertex), minus(nextVertex, currVertex));
      tempFeatures.push(new Corner(corners[i]!, currVertex, roundedCorners[i]!.center, convex));
      const last = corners[i]![corners[i]!.length - 1]!;
      const first = corners[(i + 1) % n]![0]!;
      tempFeatures.push(
        new Edge([
          Cubic.straightLine(last.anchor1X, last.anchor1Y, first.anchor0X, first.anchor0Y),
        ]),
      );
    }

    const { x: cx, y: cy } =
      centerX === FLOAT_MIN_VALUE || centerY === FLOAT_MIN_VALUE
        ? calculateCenter(vertices)
        : point(f(centerX), f(centerY));
    return new RoundedPolygon(tempFeatures, cx, cy);
  }
}

function buildCubics(features: readonly Feature[]): Cubic[] {
  const out: Cubic[] = [];
  // The first/last mechanism here ensures that the final anchor point in the shape
  // exactly matches the first anchor point. There can be rendering artifacts introduced
  // by those points being slightly off, even by much less than a pixel
  let firstCubic: Cubic | null = null;
  let lastCubic: Cubic | null = null;
  let firstFeatureSplitStart: Cubic[] | null = null;
  let firstFeatureSplitEnd: Cubic[] | null = null;
  if (features.length > 0 && features[0]!.cubics.length === 3) {
    const centerCubic = features[0]!.cubics[1]!;
    const [start, end] = centerCubic.split(0.5);
    firstFeatureSplitStart = [features[0]!.cubics[0]!, start];
    firstFeatureSplitEnd = [end, features[0]!.cubics[2]!];
  }
  // iterating one past the features list size allows us to insert the initial split
  // cubic if it exists
  for (let i = 0; i <= features.length; i++) {
    let featureCubics: readonly Cubic[];
    if (i === 0 && firstFeatureSplitEnd !== null) featureCubics = firstFeatureSplitEnd;
    else if (i === features.length) {
      if (firstFeatureSplitStart !== null) featureCubics = firstFeatureSplitStart;
      else break;
    } else featureCubics = features[i]!.cubics;

    for (const cubic of featureCubics) {
      // Skip zero-length curves; they add nothing and can trigger rendering artifacts
      if (!cubic.zeroLength()) {
        if (lastCubic !== null) out.push(lastCubic);
        lastCubic = cubic;
        firstCubic ??= cubic;
      } else if (lastCubic !== null) {
        // Dropping several zero-ish length curves in a row can lead to
        // enough discontinuity to throw an exception later, even though the
        // distances are quite small. Account for that by making the last
        // cubic use the latest anchor point, always. (Mutates the shared cubic, as upstream.)
        lastCubic.points[6] = cubic.anchor1X;
        lastCubic.points[7] = cubic.anchor1Y;
      }
    }
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

/** 1.0.1 center estimate (divides by vertices.size, then by 2 again; see file header). */
function calculateCenter(vertices: ArrayLike<number>): Point {
  let cumulativeX = 0;
  let cumulativeY = 0;
  let index = 0;
  while (index < vertices.length) {
    cumulativeX = f(cumulativeX + f(vertices[index++]!));
    cumulativeY = f(cumulativeY + f(vertices[index++]!));
  }
  return point(f(cumulativeX / vertices.length) / 2, f(cumulativeY / vertices.length) / 2);
}

/**
 * Private utility class that holds the information about each corner in a polygon. The shape of
 * the corner can be returned by calling the [getCubics] function, which will return a list of
 * curves representing the corner geometry. The shape of the corner depends on the [rounding]
 * constructor parameter.
 */
class RoundedCorner {
  readonly d1: Point;
  readonly d2: Point;
  readonly cornerRadius: number;
  readonly smoothing: number;
  readonly cosAngle: number;
  readonly sinAngle: number;
  readonly expectedRoundCut: number;
  /**
   * the center of the circle approximated by the rounding curve (or the middle of the three
   * curves if smoothing is requested). The center is the same as p0 if there is no rounding.
   */
  center: Point = point(0, 0);

  constructor(
    readonly p0: Point,
    readonly p1: Point,
    readonly p2: Point,
    readonly rounding: CornerRounding | null = null,
  ) {
    this.d1 = getDirection(minus(p0, p1));
    this.d2 = getDirection(minus(p2, p1));
    this.cornerRadius = rounding?.radius ?? 0;
    this.smoothing = rounding?.smoothing ?? 0;
    // cosine of angle at p1 is dot product of unit vectors to the other two vertices
    this.cosAngle = dotProduct(this.d1, this.d2);
    // identity: sin^2 + cos^2 = 1
    // sinAngle gives us the intersection
    this.sinAngle = f(Math.sqrt(f(1 - square(this.cosAngle))));
    // How much we need to cut, as measured on a side, to get the required radius
    // calculating where the rounding circle hits the edge
    // This uses the identity of tan(A/2) = sinA/(1 + cosA), where tan(A/2) = radius/cut
    this.expectedRoundCut =
      this.sinAngle > 1e-3 ? f(f(this.cornerRadius * f(this.cosAngle + 1)) / this.sinAngle) : 0;
  }

  /** smoothing changes the actual cut. 0 is same as expectedRoundCut, 1 doubles it */
  get expectedCut(): number {
    return f(f(1 + this.smoothing) * this.expectedRoundCut);
  }

  getCubics(allowedCut0: number, allowedCut1: number = allowedCut0): Cubic[] {
    // We use the minimum of both cuts to determine the radius, but if there is more space
    // in one side we can use it for smoothing.
    const allowedCut = Math.min(allowedCut0, allowedCut1);
    // Nothing to do, just use lines, or a point
    if (
      this.expectedRoundCut < DistanceEpsilon ||
      allowedCut < DistanceEpsilon ||
      this.cornerRadius < DistanceEpsilon
    ) {
      this.center = this.p1;
      return [Cubic.straightLine(this.p1.x, this.p1.y, this.p1.x, this.p1.y)];
    }
    // How much of the cut is required for the rounding part.
    const actualRoundCut = Math.min(allowedCut, this.expectedRoundCut);
    // We have two smoothing values, one for each side of the vertex
    // Space is used for rounding values first. If there is space left over, then we
    // apply smoothing, if it was requested
    const actualSmoothing0 = this.calculateActualSmoothingValue(allowedCut0);
    const actualSmoothing1 = this.calculateActualSmoothingValue(allowedCut1);
    // Scale the radius if needed
    const actualR = f(f(this.cornerRadius * actualRoundCut) / this.expectedRoundCut);
    // Distance from the corner (p1) to the center
    const centerDistance = f(Math.sqrt(f(square(actualR) + square(actualRoundCut))));
    // Center of the arc we will use for rounding
    this.center = plus(
      this.p1,
      times(getDirection(div(plus(this.d1, this.d2), 2)), centerDistance),
    );
    const circleIntersection0 = plus(this.p1, times(this.d1, actualRoundCut));
    const circleIntersection2 = plus(this.p1, times(this.d2, actualRoundCut));
    const flanking0 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing0,
      this.p1,
      this.p0,
      circleIntersection0,
      circleIntersection2,
      this.center,
      actualR,
    );
    const flanking2 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing1,
      this.p1,
      this.p2,
      circleIntersection2,
      circleIntersection0,
      this.center,
      actualR,
    ).reverse();
    return [
      flanking0,
      Cubic.circularArc(
        this.center.x,
        this.center.y,
        flanking0.anchor1X,
        flanking0.anchor1Y,
        flanking2.anchor0X,
        flanking2.anchor0Y,
      ),
      flanking2,
    ];
  }

  /**
   * If allowedCut (the amount we are able to cut) is greater than the expected cut (without
   * smoothing applied yet), then there is room to apply smoothing and we calculate the actual
   * smoothing value here.
   */
  private calculateActualSmoothingValue(allowedCut: number): number {
    if (allowedCut > this.expectedCut) return this.smoothing;
    if (allowedCut > this.expectedRoundCut) {
      return f(
        f(this.smoothing * f(allowedCut - this.expectedRoundCut)) /
          f(this.expectedCut - this.expectedRoundCut),
      );
    }
    return 0;
  }

  /**
   * Compute a single flanking curve for this corner: from the side start to the rounding circle,
   * smoothed by [actualSmoothingValues].
   */
  private computeFlankingCurve(
    actualRoundCut: number,
    actualSmoothingValues: number,
    corner: Point,
    sideStart: Point,
    circleSegmentIntersection: Point,
    otherCircleSegmentIntersection: Point,
    circleCenter: Point,
    actualR: number,
  ): Cubic {
    // sideStart is the anchor, 'anchor' is actual control point
    const sideDirection = getDirection(minus(sideStart, corner));
    const curveStart = plus(
      corner,
      times(times(sideDirection, actualRoundCut), f(1 + actualSmoothingValues)),
    );
    // We use an approximation to cut a part of the circle section proportional to 1 - smooth,
    // When smooth = 0, we take the full section, when smooth = 1, we take nothing.
    const p = interpolatePoint(
      circleSegmentIntersection,
      div(plus(circleSegmentIntersection, otherCircleSegmentIntersection), 2),
      actualSmoothingValues,
    );
    // The flanking curve ends on the circle
    const curveEnd = plus(
      circleCenter,
      times(directionVector(f(p.x - circleCenter.x), f(p.y - circleCenter.y)), actualR),
    );
    // The anchor on the circle segment side is in the intersection between the tangent to the
    // circle in the circle/flanking curve boundary and the linear segment.
    const circleTangent = rotate90(minus(curveEnd, circleCenter));
    const anchorEnd =
      lineIntersection(sideStart, sideDirection, curveEnd, circleTangent) ??
      circleSegmentIntersection;
    // From what remains, we pick a point for the start anchor.
    // 2/3 seems to come from design tools?
    const anchorStart = div(plus(curveStart, times(anchorEnd, 2)), 3);
    return Cubic.fromPoints(curveStart, anchorStart, anchorEnd, curveEnd);
  }
}

/**
 * Returns the intersection point of the two lines d0->d1 and p0->p1, or null if the lines do not
 * intersect
 */
function lineIntersection(p0: Point, d0: Point, p1: Point, d1: Point): Point | null {
  const rotatedD1 = rotate90(d1);
  const den = dotProduct(d0, rotatedD1);
  if (Math.abs(den) < DistanceEpsilon) return null;
  const num = dotProduct(minus(p1, p0), rotatedD1);
  // Also check the relative value. This is equivalent to abs(den/num) < DistanceEpsilon,
  // but avoid doing a division
  if (Math.abs(den) < f(DistanceEpsilon * Math.abs(num))) return null;
  const k = f(num / den);
  return plus(p0, times(d0, k));
}

function verticesFromNumVerts(
  numVertices: number,
  radius: number,
  centerX: number,
  centerY: number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < numVertices; i++) {
    const vertex = plus(
      radialToCartesian(f(radius), f(f(f(FloatPi / numVertices) * 2) * i)),
      point(centerX, centerY),
    );
    result.push(vertex.x, vertex.y);
  }
  return result;
}
