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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/FeatureMapping.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)

import { Corner, type Feature } from './features.js';
import { DoubleMapper } from './float-mapping.js';
import type { ProgressableFeature } from './polygon-measure.js';
import { FLOAT_MAX_VALUE, f } from './utils.js';

/** Kotlin `minBy`: the first element with the smallest key. */
function minBy(from: number, toInclusive: number, key: (i: number) => number): number {
  let best = from;
  let bestKey = key(from);
  for (let i = from + 1; i <= toInclusive; i++) {
    const k = key(i);
    if (k < bestKey) {
      best = i;
      bestKey = k;
    }
  }
  return best;
}

/**
 * Creates a mapping between the "features" (rounded corners) of two shapes. Used by Morph to
 * decide which corners of one shape morph into which corners of the other.
 */
export function featureMapper(
  features1: readonly ProgressableFeature[],
  features2: readonly ProgressableFeature[],
): DoubleMapper {
  // We only use corners for this mapping.
  const filteredFeatures1 = features1.filter((f) => f.feature instanceof Corner);
  const filteredFeatures2 = features2.filter((f) => f.feature instanceof Corner);

  const [m1, m2] =
    filteredFeatures1.length > filteredFeatures2.length
      ? [doMapping(filteredFeatures2, filteredFeatures1), filteredFeatures2]
      : [filteredFeatures1, doMapping(filteredFeatures1, filteredFeatures2)];

  const mm: (readonly [number, number])[] = [];
  for (let i = 0; i < m1.length; i++) {
    if (i === m2.length) break;
    mm.push([m1[i]!.progress, m2[i]!.progress]);
  }
  return new DoubleMapper(...mm);
}

/**
 * Returns distance along overall shape between two Features on the two different shapes. This
 * information is used to determine how to map features (and the curves that make up those
 * features).
 */
export function featureDistSquared(f1: Feature, f2: Feature): number {
  if (f1 instanceof Corner && f2 instanceof Corner && f1.convex !== f2.convex) {
    // Simple hack to force all features to map only to features of the same concavity, by
    // returning an infinitely large distance in that case
    return FLOAT_MAX_VALUE;
  }
  const first1 = f1.cubics[0]!;
  const last1 = f1.cubics[f1.cubics.length - 1]!;
  const first2 = f2.cubics[0]!;
  const last2 = f2.cubics[f2.cubics.length - 1]!;
  const c1x = f(f(first1.anchor0X + last1.anchor1X) / 2);
  const c1y = f(f(first1.anchor0Y + last1.anchor1Y) / 2);
  const c2x = f(f(first2.anchor0X + last2.anchor1X) / 2);
  const c2y = f(f(first2.anchor0Y + last2.anchor1Y) / 2);
  const dx = f(c1x - c2x);
  const dy = f(c1y - c2y);
  return f(f(dx * dx) + f(dy * dy));
}

/**
 * Returns a mapping of the features in f2 that best map to the features in f1. The result will
 * be a list of features in f2 that is the size of f1.
 */
export function doMapping(
  f1: readonly ProgressableFeature[],
  f2: readonly ProgressableFeature[],
): ProgressableFeature[] {
  // Pick the first mapping in a greedy way.
  const ix = minBy(0, f2.length - 1, (it) => featureDistSquared(f1[0]!.feature, f2[it]!.feature));

  const m = f1.length;
  const n = f2.length;

  const ret = [f2[ix]!];
  let lastPicked = ix;
  for (let i = 1; i < m; i++) {
    // Check the indices we can pick, which one is better.
    // Leave enough items in f2 to pick matches for the items left in f1.
    let last = ix - (m - i);
    if (!(last > lastPicked)) last += n;
    const best = minBy(lastPicked + 1, last, (it) =>
      featureDistSquared(f1[i]!.feature, f2[it % n]!.feature),
    );
    ret.push(f2[best % n]!);
    lastPicked = best;
  }
  return ret;
}
