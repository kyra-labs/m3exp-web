/*
 * Copyright 2023 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/Point.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)
//
// Kotlin models a point as a FloatFloatPair with extension functions; here it is an immutable
// `{ x, y }` with free functions of the same names. Coordinates are float32 (see utils.ts).

const f = Math.fround;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const point = (x: number, y: number): Point => ({ x: f(x), y: f(y) });

/**
 * The magnitude of the Point, which is the distance of this point from (0, 0).
 *
 * If you need this value to compare it to another [Point]'s distance, consider using
 * [getDistanceSquared] instead, since it is cheaper to compute.
 */
export const getDistance = (p: Point): number => f(Math.sqrt(getDistanceSquared(p)));

/** The square of the magnitude of the Point. This is cheaper than computing [getDistance]. */
export const getDistanceSquared = (p: Point): number => f(f(p.x * p.x) + f(p.y * p.y));

export const dotProduct = (p: Point, other: Point): number =>
  f(f(p.x * other.x) + f(p.y * other.y));

export const dotProductXY = (p: Point, otherX: number, otherY: number): number =>
  f(f(p.x * otherX) + f(p.y * otherY));

/**
 * Compute the Z coordinate of the cross product of two vectors, to check if the second vector is
 * going clockwise ( > 0 ) or counterclockwise (< 0) compared with the first one. It could also be
 * 0, if the vectors are co-linear.
 */
export const clockwise = (p: Point, other: Point): boolean =>
  f(f(p.x * other.y) - f(p.y * other.x)) > 0;

/** Returns unit vector representing the direction to this point from (0, 0) */
export function getDirection(p: Point): Point {
  const d = getDistance(p);
  if (!(d > 0)) throw new Error("Can't get the direction of a 0-length vector");
  return div(p, d);
}

/** Unary negation: the same arrow pointing in the reverse direction. */
export const unaryMinus = (p: Point): Point => point(-p.x, -p.y);

export const minus = (p: Point, other: Point): Point => point(p.x - other.x, p.y - other.y);

export const plus = (p: Point, other: Point): Point => point(p.x + other.x, p.y + other.y);

export const times = (p: Point, operand: number): Point => point(p.x * operand, p.y * operand);

export const div = (p: Point, operand: number): Point => point(p.x / operand, p.y / operand);

export const rem = (p: Point, operand: number): Point => point(p.x % operand, p.y % operand);

/** Linearly interpolate between two Points. */
export const interpolatePoint = (start: Point, stop: Point, fraction: number): Point =>
  point(
    f(f(f(1 - fraction) * start.x) + f(fraction * stop.x)),
    f(f(f(1 - fraction) * start.y) + f(fraction * stop.y)),
  );

/** Interface for a function that can transform (rotate/scale/translate/etc.) points. */
export type PointTransformer = (x: number, y: number) => readonly [number, number];

export function transformed(p: Point, f: PointTransformer): Point {
  const [x, y] = f(p.x, p.y);
  return point(x, y);
}
