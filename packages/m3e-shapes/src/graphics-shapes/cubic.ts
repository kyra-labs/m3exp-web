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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/Cubic.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)

import { type Point, type PointTransformer, dotProduct, dotProductXY, point } from './point.js';
import { DistanceEpsilon, directionVector, distance, f, interpolate, rotate90 } from './utils.js';

const inUnitRange = (t: number) => t >= 0 && t <= 1;

/**
 * This class holds the anchor and control point data for a single cubic Bézier curve, with anchor
 * points ([anchor0X], [anchor0Y]) and ([anchor1X], [anchor1Y]) at either end and control points
 * ([control0X], [control0Y]) and ([control1X], [control1Y]) determining the slope of the curve
 * between the anchor points.
 */
export class Cubic {
  /** Kotlin `FloatArray`: values are stored as float32. */
  readonly points: Float32Array;

  constructor(points: ArrayLike<number> = new Float32Array(8)) {
    if (points.length !== 8) throw new Error('Points array size should be 8');
    this.points = Float32Array.from(points);
  }

  /** Creates a Cubic from its eight coordinates (the top-level Kotlin `Cubic(...)` factory). */
  static of(
    anchor0X: number,
    anchor0Y: number,
    control0X: number,
    control0Y: number,
    control1X: number,
    control1Y: number,
    anchor1X: number,
    anchor1Y: number,
  ): Cubic {
    return new Cubic([
      anchor0X,
      anchor0Y,
      control0X,
      control0Y,
      control1X,
      control1Y,
      anchor1X,
      anchor1Y,
    ]);
  }

  static fromPoints(anchor0: Point, control0: Point, control1: Point, anchor1: Point): Cubic {
    return Cubic.of(
      anchor0.x,
      anchor0.y,
      control0.x,
      control0.y,
      control1.x,
      control1.y,
      anchor1.x,
      anchor1.y,
    );
  }

  get anchor0X(): number {
    return this.points[0]!;
  }
  get anchor0Y(): number {
    return this.points[1]!;
  }
  get control0X(): number {
    return this.points[2]!;
  }
  get control0Y(): number {
    return this.points[3]!;
  }
  get control1X(): number {
    return this.points[4]!;
  }
  get control1Y(): number {
    return this.points[5]!;
  }
  get anchor1X(): number {
    return this.points[6]!;
  }
  get anchor1Y(): number {
    return this.points[7]!;
  }

  pointOnCurve(t: number): Point {
    const u = f(1 - t);
    const w0 = f(f(u * u) * u);
    const w1 = f(f(f(3 * t) * u) * u);
    const w2 = f(f(f(3 * t) * t) * u);
    const w3 = f(f(t * t) * t);
    return point(
      f(
        f(f(f(this.anchor0X * w0) + f(this.control0X * w1)) + f(this.control1X * w2)) +
          f(this.anchor1X * w3),
      ),
      f(
        f(f(f(this.anchor0Y * w0) + f(this.control0Y * w1)) + f(this.control1Y * w2)) +
          f(this.anchor1Y * w3),
      ),
    );
  }

  zeroLength(): boolean {
    return (
      Math.abs(f(this.anchor0X - this.anchor1X)) < DistanceEpsilon &&
      Math.abs(f(this.anchor0Y - this.anchor1Y)) < DistanceEpsilon
    );
  }

  /**
   * Fills [bounds] with `[minX, minY, maxX, maxY]`. With [approximate], the bounding box of all
   * anchors and controls; otherwise the exact extrema (solving the derivative quadratic).
   */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = false): void {
    // A curve might be of zero-length, with both anchors co-lated.
    // Just return the point itself.
    if (this.zeroLength()) {
      bounds[0] = this.anchor0X;
      bounds[1] = this.anchor0Y;
      bounds[2] = this.anchor0X;
      bounds[3] = this.anchor0Y;
      return;
    }

    let minX = Math.min(this.anchor0X, this.anchor1X);
    let minY = Math.min(this.anchor0Y, this.anchor1Y);
    let maxX = Math.max(this.anchor0X, this.anchor1X);
    let maxY = Math.max(this.anchor0Y, this.anchor1Y);

    if (approximate) {
      // Approximate bounds use the bounding box of all anchors and controls
      bounds[0] = Math.min(minX, Math.min(this.control0X, this.control1X));
      bounds[1] = Math.min(minY, Math.min(this.control0Y, this.control1Y));
      bounds[2] = Math.max(maxX, Math.max(this.control0X, this.control1X));
      bounds[3] = Math.max(maxY, Math.max(this.control0Y, this.control1Y));
      return;
    }

    const zeroIsh = (value: number) => Math.abs(value) < DistanceEpsilon;
    const includeX = (t: number) => {
      if (!inUnitRange(t)) return;
      const it = this.pointOnCurve(t).x;
      if (it < minX) minX = it;
      if (it > maxX) maxX = it;
    };
    const includeY = (t: number) => {
      if (!inUnitRange(t)) return;
      const it = this.pointOnCurve(t).y;
      if (it < minY) minY = it;
      if (it > maxY) maxY = it;
    };

    // Find the derivative, which is a quadratic Bezier. Then we can solve for t using
    // the quadratic formula
    const xa = f(
      f(f(-this.anchor0X + f(3 * this.control0X)) - f(3 * this.control1X)) + this.anchor1X,
    );
    const xb = f(f(f(2 * this.anchor0X) - f(4 * this.control0X)) + f(2 * this.control1X));
    const xc = f(-this.anchor0X + this.control0X);

    if (zeroIsh(xa)) {
      // Try the Muller method instead; it can find a single root when a is 0
      if (xb !== 0) includeX(f(f(2 * xc) / f(-2 * xb)));
    } else {
      const xs = f(f(xb * xb) - f(f(4 * xa) * xc));
      if (xs >= 0) {
        includeX(f(f(-xb + f(Math.sqrt(xs))) / f(2 * xa)));
        includeX(f(f(-xb - f(Math.sqrt(xs))) / f(2 * xa)));
      }
    }

    // Repeat the above for y coordinate
    const ya = f(
      f(f(-this.anchor0Y + f(3 * this.control0Y)) - f(3 * this.control1Y)) + this.anchor1Y,
    );
    const yb = f(f(f(2 * this.anchor0Y) - f(4 * this.control0Y)) + f(2 * this.control1Y));
    const yc = f(-this.anchor0Y + this.control0Y);

    if (zeroIsh(ya)) {
      if (yb !== 0) includeY(f(f(2 * yc) / f(-2 * yb)));
    } else {
      const ys = f(f(yb * yb) - f(f(4 * ya) * yc));
      if (ys >= 0) {
        includeY(f(f(-yb + f(Math.sqrt(ys))) / f(2 * ya)));
        includeY(f(f(-yb - f(Math.sqrt(ys))) / f(2 * ya)));
      }
    }
    bounds[0] = minX;
    bounds[1] = minY;
    bounds[2] = maxX;
    bounds[3] = maxY;
  }

  /** Returns two Cubics, created by splitting this curve at the given distance of [t]. */
  split(t: number): [Cubic, Cubic] {
    const u = f(1 - t);
    const p = this.pointOnCurve(t);
    const uu = f(u * u);
    const ut2 = f(f(2 * u) * t);
    const tt = f(t * t);
    const lerp = (a: number, b: number) => f(f(a * u) + f(b * t));
    const quad = (a: number, b: number, c: number) => f(f(f(a * uu) + f(b * ut2)) + f(c * tt));
    return [
      Cubic.of(
        this.anchor0X,
        this.anchor0Y,
        lerp(this.anchor0X, this.control0X),
        lerp(this.anchor0Y, this.control0Y),
        quad(this.anchor0X, this.control0X, this.control1X),
        quad(this.anchor0Y, this.control0Y, this.control1Y),
        p.x,
        p.y,
      ),
      Cubic.of(
        p.x,
        p.y,
        quad(this.control0X, this.control1X, this.anchor1X),
        quad(this.control0Y, this.control1Y, this.anchor1Y),
        lerp(this.control1X, this.anchor1X),
        lerp(this.control1Y, this.anchor1Y),
        this.anchor1X,
        this.anchor1Y,
      ),
    ];
  }

  /** Utility function to reverse the control/anchor points for this curve. */
  reverse(): Cubic {
    return Cubic.of(
      this.anchor1X,
      this.anchor1Y,
      this.control1X,
      this.control1Y,
      this.control0X,
      this.control0Y,
      this.anchor0X,
      this.anchor0Y,
    );
  }

  plus(o: Cubic): Cubic {
    return new Cubic(this.points.map((v, i) => v + o.points[i]!));
  }

  times(x: number): Cubic {
    return new Cubic(this.points.map((v) => v * x));
  }

  div(x: number): Cubic {
    return this.times(f(1 / x));
  }

  toString(): string {
    const [a0x, a0y, c0x, c0y, c1x, c1y, a1x, a1y] = Array.from(this.points, String);
    return `anchor0: (${a0x!}, ${a0y!}) control0: (${c0x!}, ${c0y!}), control1: (${c1x!}, ${c1y!}), anchor1: (${a1x!}, ${a1y!})`;
  }

  equals(other: unknown): boolean {
    if (this === other) return true;
    return other instanceof Cubic && this.points.every((v, i) => v === other.points[i]);
  }

  /** Transforms the points in this [Cubic] with the given [PointTransformer]. */
  transformed(f: PointTransformer): Cubic {
    const newCubic = new MutableCubic();
    newCubic.points.set(this.points);
    newCubic.transform(f);
    return newCubic;
  }

  /** Generates a bezier curve that is a straight line between the given anchor points. */
  static straightLine(x0: number, y0: number, x1: number, y1: number): Cubic {
    return Cubic.of(
      x0,
      y0,
      interpolate(x0, x1, ONE_THIRD),
      interpolate(y0, y1, ONE_THIRD),
      interpolate(x0, x1, TWO_THIRDS),
      interpolate(y0, y1, TWO_THIRDS),
      x1,
      y1,
    );
  }

  /**
   * Generates a bezier curve that approximates a circular arc, with p0 and p1 as the starting and
   * ending anchor points. The curve generated is the smallest of the two possible arcs around the
   * entire 360-degree circle. Arcs of greater than 180 degrees should use more than one arc
   * together. Note that p0 and p1 should be equidistant from the center.
   */
  static circularArc(
    centerX: number,
    centerY: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): Cubic {
    const p0d = directionVector(f(x0 - centerX), f(y0 - centerY));
    const p1d = directionVector(f(x1 - centerX), f(y1 - centerY));
    const rotatedP0 = rotate90(p0d);
    const rotatedP1 = rotate90(p1d);
    const clockwise = dotProductXY(rotatedP0, f(x1 - centerX), f(y1 - centerY)) >= 0;
    const cosa = dotProduct(p0d, p1d);
    if (cosa > COS_NEARLY_ZERO_ANGLE) /* p0 ~= p1 */ return Cubic.straightLine(x0, y0, x1, y1);
    const oneMinusCosa = f(1 - cosa);
    const k = f(
      f(
        f(
          f(f(distance(f(x0 - centerX), f(y0 - centerY)) * 4) / 3) *
            f(f(Math.sqrt(f(2 * oneMinusCosa))) - f(Math.sqrt(f(1 - f(cosa * cosa))))),
        ) / oneMinusCosa,
      ) * (clockwise ? 1 : -1),
    );
    return Cubic.of(
      x0,
      y0,
      f(x0 + f(rotatedP0.x * k)),
      f(y0 + f(rotatedP0.y * k)),
      f(x1 - f(rotatedP1.x * k)),
      f(y1 - f(rotatedP1.y * k)),
      x1,
      y1,
    );
  }
}

/** Kotlin `0.999f`, `1f / 3f` and `2f / 3f`. */
const COS_NEARLY_ZERO_ANGLE = /* @__PURE__ */ f(0.999);
const ONE_THIRD = /* @__PURE__ */ f(1 / 3);
const TWO_THIRDS = /* @__PURE__ */ f(2 / 3);

/** This is a Mutable version of [Cubic], used mostly for performance critical paths. */
export class MutableCubic extends Cubic {
  private transformOnePoint(f: PointTransformer, ix: number): void {
    const [x, y] = f(this.points[ix]!, this.points[ix + 1]!);
    this.points[ix] = x;
    this.points[ix + 1] = y;
  }

  transform(f: PointTransformer): void {
    this.transformOnePoint(f, 0);
    this.transformOnePoint(f, 2);
    this.transformOnePoint(f, 4);
    this.transformOnePoint(f, 6);
  }

  interpolate(c1: Cubic, c2: Cubic, progress: number): void {
    for (let i = 0; i < 8; i++) {
      this.points[i] = interpolate(c1.points[i]!, c2.points[i]!, progress);
    }
  }
}
