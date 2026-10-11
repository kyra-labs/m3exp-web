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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/Utils.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)
//
// Float32-faithful: Kotlin does this math in `Float`, so every operation is rounded with
// `fround` (exact for + - * / and sqrt; `kotlin.math` trig is the double result rounded to
// float). Symmetric shapes produce near-ties in Morph's corner matching that only the same
// rounding resolves the way Compose does.

import { type Point, point, plus, times } from './point.js';

/** Kotlin `Float` rounding. */
export const f = Math.fround;

/** Kotlin `Float.MIN_VALUE`: the smallest *positive* float32 (not the most negative). */
export const FLOAT_MIN_VALUE = 1.401298464324817e-45;
/** Kotlin `Float.MAX_VALUE`. */
export const FLOAT_MAX_VALUE = 3.4028234663852886e38;

/** This class has all internal methods, used by Polygon, Morph, etc. */
export const distance = (x: number, y: number): number => f(Math.sqrt(f(f(x * x) + f(y * y))));

export const distanceSquared = (x: number, y: number): number => f(f(x * x) + f(y * y));

/** Returns unit vector representing the direction to this point from (0, 0) */
export function directionVector(x: number, y: number): Point {
  const d = distance(x, y);
  if (!(d > 0)) throw new Error('Required distance greater than zero');
  return point(f(x / d), f(y / d));
}

export const directionVectorFromAngle = (angleRadians: number): Point =>
  point(f(Math.cos(angleRadians)), f(Math.sin(angleRadians)));

/**
 * These epsilon values are used internally to determine when two points are the same, within some
 * reasonable roundoff error. The distance epsilon is smaller, with the intention that the roundoff
 * should not be larger than a pixel on any reasonable sized display.
 */
export const DistanceEpsilon = f(1e-4);
export const AngleEpsilon = f(1e-6);

export const Zero: Point = point(0, 0);
export const FloatPi = f(Math.PI);
export const TwoPi = f(2 * FloatPi);

export const angle = (x: number, y: number): number => f(f(f(Math.atan2(y, x)) + TwoPi) % TwoPi);

export const radialToCartesian = (
  radius: number,
  angleRadians: number,
  center: Point = Zero,
): Point => plus(times(directionVectorFromAngle(angleRadians), radius), center);

export const rotate90 = (p: Point): Point => point(-p.y, p.x);

export const square = (x: number): number => f(x * x);

/** Linearly interpolate between [start] and [stop] with [fraction] fraction between them. */
export const interpolate = (start: number, stop: number, fraction: number): number =>
  f(f(f(1 - fraction) * start) + f(fraction * stop));

export const positiveModulo = (num: number, mod: number): number => f(f(f(num % mod) + mod) % mod);

/**
 * Does a ternary search in [v0..v1] to find the parameter that minimizes the given function.
 * Stops when the search space size is reduced below the given tolerance.
 */
export function findMinimum(
  v0: number,
  v1: number,
  tolerance: number,
  fn: (value: number) => number,
): number {
  let a = v0;
  let b = v1;
  while (f(b - a) > tolerance) {
    const c1 = f(f(f(2 * a) + b) / 3);
    const c2 = f(f(f(2 * b) + a) / 3);
    if (fn(c1) < fn(c2)) {
      b = c2;
    } else {
      a = c1;
    }
  }
  return f(f(a + b) / 2);
}

/** Kotlin's default `findMinimum` tolerance. */
export const FIND_MINIMUM_TOLERANCE = f(1e-3);
