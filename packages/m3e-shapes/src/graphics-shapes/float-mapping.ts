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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/FloatMapping.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)

import { f, positiveModulo } from './utils.js';

/**
 * Checks if the given progress is in the given progress range, since progress is in the [0..1)
 * interval, and wraps, there is a special case when progressTo < progressFrom. For example, if
 * the progress range is 0.7 to 0.2, both 0.8 and 0.1 are inside and 0.5 is outside.
 */
export function progressInRange(
  progress: number,
  progressFrom: number,
  progressTo: number,
): boolean {
  return progressTo >= progressFrom
    ? progress >= progressFrom && progress <= progressTo
    : progress >= progressFrom || progress <= progressTo;
}

/**
 * Maps from one set of progress values to another. This is used by DoubleMapper to retrieve the
 * value on one shape that maps to the appropriate value on the other.
 */
export function linearMap(
  xValues: readonly number[],
  yValues: readonly number[],
  x: number,
): number {
  if (!(x >= 0 && x <= 1)) throw new Error(`Invalid progress: ${String(x)}`);
  const n = xValues.length;
  const segmentStartIndex = xValues.findIndex((_, it) =>
    progressInRange(x, xValues[it]!, xValues[(it + 1) % n]!),
  );
  if (segmentStartIndex === -1)
    throw new Error('Collection contains no element matching the predicate.');
  const segmentEndIndex = (segmentStartIndex + 1) % n;
  const segmentSizeX = positiveModulo(
    f(xValues[segmentEndIndex]! - xValues[segmentStartIndex]!),
    1,
  );
  const segmentSizeY = positiveModulo(
    f(yValues[segmentEndIndex]! - yValues[segmentStartIndex]!),
    1,
  );
  const positionInSegment =
    segmentSizeX < f(0.001)
      ? 0.5
      : f(positiveModulo(f(x - xValues[segmentStartIndex]!), 1) / segmentSizeX);
  return positiveModulo(f(yValues[segmentStartIndex]! + f(segmentSizeY * positionInSegment)), 1);
}

/**
 * DoubleMapper creates mappings from values in the [0..1) source space to values in the [0..1)
 * target space, and back. This mapping is created given a finite list of representative mappings,
 * and this is extended to the whole interval by linear interpolation, and wrapping around.
 */
export class DoubleMapper {
  private readonly sourceValues: number[] = [];
  private readonly targetValues: number[] = [];

  constructor(...mappings: (readonly [number, number])[]) {
    for (const [source, target] of mappings) {
      this.sourceValues.push(f(source));
      this.targetValues.push(f(target));
    }
    validateProgress(this.sourceValues);
    validateProgress(this.targetValues);
  }

  map(x: number): number {
    return linearMap(this.sourceValues, this.targetValues, x);
  }

  mapBack(x: number): number {
    return linearMap(this.targetValues, this.sourceValues, x);
  }

  static readonly Identity = /* @__PURE__ */ new DoubleMapper(
    // We need any 2 points in the (x, x) diagonal, with x in the [0, 1) range,
    // We spread them as much as possible to minimize float errors.
    [0, 0],
    [0.5, 0.5],
  );
}

/**
 * Verify that a list of progress values are all in the range [0.0, 1.0) and is monotonically
 * increasing, with the exception of maybe one wrap around.
 */
export function validateProgress(p: readonly number[]): void {
  if (!p.every((curr) => curr >= 0 && curr <= 1)) {
    throw new Error(`FloatMapping - Progress outside of range: ${p.join(', ')}`);
  }
  let wraps = 0;
  for (let it = 1; it < p.length; it++) if (p[it]! < p[it - 1]!) wraps++;
  if (wraps > 1) throw new Error(`FloatMapping - Progress wraps more than once: ${p.join(', ')}`);
}
