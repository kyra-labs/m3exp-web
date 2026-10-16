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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ProgressIndicator.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/WavyProgressIndicator.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/LinearWavyProgressModifiers.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/CircularWavyProgressModifiers.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The progress indicators' timelines as pure functions of elapsed time (shared by m3e-elements and
// m3e-react; the numbers come from the generated `--m3e-comp-progress-indicator-defaults-*` tokens):
// - indeterminate linear: two lines whose head and tail each run `0f at delay using easing` →
//   `1f at delay + duration` keyframes on one infinitely repeating cycle (L979–1025);
// - indeterminate circular: a linear global rotation, an additional rotation in linear steps and a
//   sweep that grows linearly and shrinks on the easing, all on one cycle (L929–977; in Compose
//   keyframes, `using` eases the interval that *starts* at its keyframe);
// - the wave offset: a linear 0 → 1 tween repeating every wavelength / waveSpeed seconds (times the
//   polygon's vertex count for circular indicators), never shorter than MinAnimationDuration;
// - the determinate amplitude (`WavyProgressIndicatorDefaults.indicatorAmplitude`) and its tweens,
//   which Compose never retargets while one runs.

import type { Easing } from './cubic-bezier.js';

export interface LinearIndeterminateTiming {
  /** `LinearAnimationDuration`: one cycle. */
  readonly durationMillis: number;
  /** `[delay, duration]` of each keyframe pair. */
  readonly firstHead: readonly [number, number];
  readonly firstTail: readonly [number, number];
  readonly secondHead: readonly [number, number];
  readonly secondTail: readonly [number, number];
  /** `LinearIndeterminateProgressEasing`. */
  readonly easing: Easing;
}

/** A 0 → 1 keyframe pair (`0f at delay using easing; 1f at delay + duration`) at cycle time `t`. */
const line = (t: number, [delay, duration]: readonly [number, number], easing: Easing) =>
  t <= delay ? 0 : t >= delay + duration ? 1 : easing((t - delay) / duration);

/**
 * The indeterminate linear indicator's fractions at `elapsedMillis`, in the order the wavy indicator
 * draws them (`getProgressFractions`): first tail, first head, second tail, second head (0–1 each).
 */
export function linearIndeterminateFractions(
  elapsedMillis: number,
  timing: LinearIndeterminateTiming,
): [number, number, number, number] {
  const t = Math.max(0, elapsedMillis) % timing.durationMillis;
  return [
    line(t, timing.firstTail, timing.easing),
    line(t, timing.firstHead, timing.easing),
    line(t, timing.secondTail, timing.easing),
    line(t, timing.secondHead, timing.easing),
  ];
}

export interface CircularIndeterminateTiming {
  /** `CircularAnimationProgressDuration`: one cycle. */
  readonly durationMillis: number;
  /** `CircularGlobalRotationDegreesTarget`: linear rotation per cycle (degrees). */
  readonly rotation: number;
  /** `CircularAdditionalRotationDegreesTarget`: the steps' total per cycle (degrees). */
  readonly additionalRotation: number;
  /** `CircularAnimationAdditionalRotationDelay`: a step starts every this. */
  readonly additionalDelayMillis: number;
  /** `CircularAnimationAdditionalRotationDuration`: and moves for this. */
  readonly additionalDurationMillis: number;
  /** `CircularIndeterminateMinProgress` / `MaxProgress`: the sweep range (0–1). */
  readonly minProgress: number;
  readonly maxProgress: number;
  /** `CircularProgressEasing`: the shrinking half of the sweep. */
  readonly easing: Easing;
}

export interface CircularIndeterminateFrame {
  /** Global + additional rotation, degrees clockwise. */
  rotation: number;
  /** Sweep, 0–1 of a full turn. */
  sweep: number;
}

/** The indeterminate circular indicator at `elapsedMillis`. */
export function circularIndeterminateFrame(
  elapsedMillis: number,
  timing: CircularIndeterminateTiming,
): CircularIndeterminateFrame {
  const d = timing.durationMillis;
  const t = Math.max(0, elapsedMillis) % d;
  const steps = Math.round(d / timing.additionalDelayMillis);
  const step = timing.additionalRotation / steps;
  const index = Math.floor(t / timing.additionalDelayMillis);
  const within = t - index * timing.additionalDelayMillis;
  const additional = step * index + step * Math.min(1, within / timing.additionalDurationMillis);
  const half = d / 2;
  const range = timing.maxProgress - timing.minProgress;
  const sweep =
    t <= half
      ? timing.minProgress + range * (t / half)
      : timing.maxProgress - range * timing.easing((t - half) / half);
  return { rotation: (timing.rotation * t) / d + additional, sweep };
}

/**
 * The wave offset tween's duration: `((wavelength / waveSpeed) * 1000 * vertexCount)` rounded and
 * floored at `minMillis`; `Infinity` (the offset holds at 0) when either is not positive.
 */
export function waveTravelMillis(
  wavelength: number,
  waveSpeed: number,
  minMillis: number,
  vertexCount = 1,
): number {
  if (!(waveSpeed > 0 && wavelength > 0)) return Number.POSITIVE_INFINITY;
  return Math.max(minMillis, Math.round((wavelength / waveSpeed) * 1000 * vertexCount));
}

/** The wave offset (0–1) after `elapsedMillis` of a tween of `travelMillis`. */
export const waveOffset = (elapsedMillis: number, travelMillis: number): number =>
  Number.isFinite(travelMillis) ? (Math.max(0, elapsedMillis) % travelMillis) / travelMillis : 0;

/** `WavyProgressIndicatorDefaults.indicatorAmplitude`: no wave near the start and the end. */
export const indicatorAmplitude = (
  progress: number,
  minProgress: number,
  maxProgress: number,
): number => (progress <= minProgress || progress >= maxProgress ? 0 : 1);

export interface AmplitudeTween {
  readonly durationMillis: number;
  readonly easing: Easing;
}

/**
 * The amplitude Animatable of the wavy modifiers: starts at its first target without animating;
 * a new target tweens with `increase` or `decrease` (by direction), but only once the running
 * tween has finished (`amplitudeAnimationJob == null || isCompleted`); a target set meanwhile is
 * ignored, as in Compose, until the next `update` after it finishes.
 */
export class AmplitudeAnimation {
  #from: number;
  #to: number;
  #start = 0;
  #tween: AmplitudeTween | null = null;
  #value: number;

  constructor(initial: number) {
    this.#from = initial;
    this.#to = initial;
    this.#value = initial;
  }

  get value(): number {
    return this.#value;
  }

  get target(): number {
    return this.#to;
  }

  get isRunning(): boolean {
    return this.#tween !== null;
  }

  /** Advances to `now` (ms). */
  sample(now: number): number {
    const tween = this.#tween;
    if (tween === null) return this.#value;
    const fraction = tween.durationMillis > 0 ? (now - this.#start) / tween.durationMillis : 1;
    if (fraction >= 1) {
      this.#tween = null;
      this.#value = this.#to;
    } else {
      this.#value = this.#from + (this.#to - this.#from) * tween.easing(Math.max(0, fraction));
    }
    return this.#value;
  }

  /** Requests `target` at `now`; returns true when a tween started. */
  update(target: number, now: number, increase: AmplitudeTween, decrease: AmplitudeTween): boolean {
    this.sample(now);
    if (this.#tween !== null || target === this.#to) return false;
    const tween = this.#value < target ? increase : decrease;
    this.#from = this.#value;
    this.#to = target;
    this.#start = now;
    this.#tween = tween;
    if (tween.durationMillis <= 0) this.sample(now);
    return true;
  }
}
