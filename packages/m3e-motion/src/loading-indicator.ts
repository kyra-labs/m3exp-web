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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/LoadingIndicator.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The indeterminate LoadingIndicator's LaunchedEffect (L391–451) as a pure function of elapsed
// time. Compose runs two coroutines:
// - every MorphIntervalMillis a spring animates the morph progress 0 → 1; when it finishes, the
//   indicator advances to the next morph, snaps the progress to 0 and adds a quarter turn to the
//   morph rotation. The loop then waits for the rest of the interval (or for the spring, if it is
//   slower than the interval);
// - a linear global rotation turns 360° every GlobalRotationDurationMillis, restarting.
// The drawn rotation is `progress × 90 + morphRotationTargetAngle + globalRotation` (L473).
// The interval, rotation duration and spring are tokens (components/loading-indicator-motion.css).

import { type SpringSpec, springDurationMillis, springValue } from './spring.js';

const FULL_ROTATION = 360;
const QUARTER_ROTATION = FULL_ROTATION / 4;

export interface LoadingIndicatorTiming {
  /** `MorphIntervalMillis`: how often a morph starts. */
  readonly morphIntervalMillis: number;
  /** `GlobalRotationDurationMillis`: one linear turn. */
  readonly rotationDurationMillis: number;
  /** The morph spring (`morphAnimationSpec`). */
  readonly spring: SpringSpec;
  /** The morph spring's `visibilityThreshold`; it decides when the spring finishes. */
  readonly visibilityThreshold: number;
}

/** What the indicator draws: a morph at a progress, rotated clockwise about the center. */
export interface IndeterminateFrame {
  morphIndex: number;
  /** The raw spring value: it overshoots past 1, as in Compose (the morph extrapolates). */
  morphProgress: number;
  /** Degrees, clockwise. */
  rotation: number;
}

/**
 * The first frame (and the one held under reduced motion): the first morph at 0, rotated by the
 * initial `morphRotationTargetAngle` (a quarter turn).
 */
export const initialIndeterminateFrame: Readonly<IndeterminateFrame> = {
  morphIndex: 0,
  morphProgress: 0,
  rotation: QUARTER_ROTATION,
};

/** How long one morph spring runs (Compose's `FloatSpringSpec.getDurationNanos`), in ms. */
export const morphSpringDurationMillis = (timing: LoadingIndicatorTiming): number =>
  springDurationMillis(timing.spring, 0, 1, 0, timing.visibilityThreshold);

/**
 * The frame of an indeterminate loading indicator [elapsedMillis] after it started, cycling
 * through [morphCount] morphs.
 */
export function indeterminateFrame(
  elapsedMillis: number,
  morphCount: number,
  timing: LoadingIndicatorTiming,
): IndeterminateFrame {
  const t = Math.max(0, elapsedMillis);
  const springMillis = morphSpringDurationMillis(timing);
  // `delay(MorphIntervalMillis)` then `deferred.await()`: the next morph starts after both.
  const period = Math.max(timing.morphIntervalMillis, springMillis);
  const completed = Math.floor(t / period);
  const local = t - completed * period;
  const running = local < springMillis;
  // Each finished spring advances the index and adds a quarter turn (starting at a quarter turn).
  const finished = running ? completed : completed + 1;
  const morphIndex = finished % morphCount;
  const targetAngle = (QUARTER_ROTATION * (finished + 1)) % FULL_ROTATION;
  // Compose samples the spring at whole milliseconds of play time.
  const morphProgress = running ? springValue(timing.spring, Math.floor(local), 0, 1) : 0;
  const globalRotation =
    (FULL_ROTATION * Math.floor(t % timing.rotationDurationMillis)) / timing.rotationDurationMillis;
  return {
    morphIndex,
    morphProgress,
    rotation: morphProgress * QUARTER_ROTATION + targetAngle + globalRotation,
  };
}
