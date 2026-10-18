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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/Slider.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The slider's value and track math, shared by m3e-elements' <m3e-slider> and m3e-react's
// <Slider> / <RangeSlider> (one place, CLAUDE.md "never duplicate"); lengths in CSS px (= dp):
// - Steps: Compose's `steps` is the number of stops between the ends; the web API takes a `step`
//   (a value increment), so `sliderSteps` = range / step − 1. Ticks are `steps + 2` fractions
//   i / (steps + 1) (stepsToTickFractions L2800); values snap to the nearest (snapValueToTick
//   L2775, SliderState.value with shouldAutoSnap L3431–3450, RangeSliderState setters L3656–3683),
//   coerced into the range first; a range thumb is coerced between the other thumb and its end of
//   the track, so the thumbs can meet but not cross.
// - Keys (slideOnKeyEvents L1084–1215, rangeSliderOnKeyEvents L1217–1381): one step of
//   range / (steps + 1), or 1 % of the range without steps; PageUp / PageDown move
//   clamp(actualSteps / 10, 1, 10) steps; Home / End go to the thumb's bounds. Arrow directions
//   follow ARIA (see sliderKeyAction).
// - Pointer: a press picks the closer range thumb, the start one when both are as close and it
//   lies after the pointer (RangeSliderLogic.compareOffsets L3197, rangeSliderPressDragModifier
//   L3074–3077); the pointer maps linearly onto the track (SliderState.dispatchRawDeltaInternal
//   L3466–3489: minPx = thumb width / 2, maxPx = width − thumb width / 2).
// - Track (SliderImpl layout L992–1046 and SliderDefaults.drawTrack L2398–2671): the geometry
//   slider.css draws, for tests and checks: the thumb positions, the active and inactive parts with
//   their gaps, thresholds and corners, the stop indicators and the ticks.

/** No `steps`: a key moves 1 % of the range (slideOnKeyEvents: `if (steps > 0) steps + 1 else 100`). */
export const SLIDER_KEY_DIVISIONS = 100;
/** PageUp / PageDown: `(actualSteps / 10).coerceIn(1, 10)` steps. */
export const SLIDER_PAGE_DIVISOR = 10;
export const SLIDER_PAGE_MAX_STEPS = 10;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Kotlin `lerp(start, stop, fraction)`. */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Compose `steps` for a web `step` (a value increment; 0, negative or absent = continuous):
 * the stops between the ends, `round((max − min) / step) − 1`, at least 0. A `step` that does not
 * divide the range gives evenly spaced ticks the nearest to it.
 */
export function sliderSteps(min: number, max: number, step?: number): number {
  if (step === undefined || !(step > 0) || !(max > min)) return 0;
  return Math.max(0, Math.round((max - min) / step) - 1);
}

/** stepsToTickFractions: `steps + 2` fractions i / (steps + 1); none without steps. */
export function sliderTickFractions(steps: number): number[] {
  if (steps <= 0) return [];
  return Array.from({ length: steps + 2 }, (_, i) => i / (steps + 1));
}

/** calcFraction: the 0..1 fraction `value` is of min..max (0 for an empty range). */
export function sliderFraction(value: number, min: number, max: number): number {
  return clamp(max - min === 0 ? 0 : (value - min) / (max - min), 0, 1);
}

/** The value at `fraction` of min..max. */
export const sliderValueAt = (fraction: number, min: number, max: number): number =>
  lerp(min, max, fraction);

/** snapValueToTick in value space: the nearest tick value (the first of equals), or `value`. */
export function sliderSnap(value: number, steps: number, min: number, max: number): number {
  const ticks = sliderTickFractions(steps);
  if (ticks.length === 0) return value;
  let best = value;
  let distance = Infinity;
  for (const t of ticks) {
    const v = lerp(min, max, t);
    const d = Math.abs(v - value);
    if (d < distance) {
      distance = d;
      best = v;
    }
  }
  return best;
}

/** The bounds of one thumb: the track, or for a range thumb up to / from the other thumb. */
export interface SliderThumbBounds {
  readonly min: number;
  readonly max: number;
}

/**
 * The value a thumb takes for a requested `value`: coerced into its bounds, then snapped to the
 * nearest tick of the whole track (SliderState.value / RangeSliderState.startValue / endValue).
 */
export function sliderThumbValue(
  value: number,
  bounds: SliderThumbBounds,
  steps: number,
  min: number,
  max: number,
): number {
  return sliderSnap(clamp(value, bounds.min, bounds.max), steps, min, max);
}

/** The bounds of thumb `index` among `values` (one thumb, or a range's start and end). */
export function sliderThumbBounds(
  values: readonly number[],
  index: number,
  min: number,
  max: number,
): SliderThumbBounds {
  return {
    min: index > 0 ? (values[index - 1] ?? min) : min,
    max: index < values.length - 1 ? (values[index + 1] ?? max) : max,
  };
}

/** One key step: `rangeLength / actualSteps`. */
export function sliderKeyDelta(steps: number, min: number, max: number): number {
  const actual = steps > 0 ? steps + 1 : SLIDER_KEY_DIVISIONS;
  return Math.abs(max - min) / actual;
}

/** PageUp / PageDown: how many key steps a page is. */
export function sliderPageSteps(steps: number): number {
  const actual = steps > 0 ? steps + 1 : SLIDER_KEY_DIVISIONS;
  return clamp(Math.floor(actual / SLIDER_PAGE_DIVISOR), 1, SLIDER_PAGE_MAX_STEPS);
}

export type SliderKeyAction =
  'increment' | 'decrement' | 'page-increment' | 'page-decrement' | 'min' | 'max';

export interface SliderKeyOptions {
  readonly vertical?: boolean;
  /** Right-to-left layout: the horizontal arrows swap (Compose `sign = -1`). */
  readonly rtl?: boolean;
  /** Shift held: an arrow moves a page (m3.material.io "a larger interval"; React Aria). */
  readonly shiftKey?: boolean;
}

/**
 * What a key does. Compose: ArrowRight / ArrowLeft on a horizontal slider (swapped in RTL),
 * ArrowUp / ArrowDown on a vertical one (minimum at the bottom: up increases, owner decision
 * M8 #21), PageUp / PageDown, Home / End. The web adds the other arrow pair per the ARIA slider
 * pattern (Up / Right increase) and Shift + arrow for a page (m3.material.io keyboard table);
 * Compose ignores them. Other keys: null.
 */
export function sliderKeyAction(
  key: string,
  options: SliderKeyOptions = {},
): SliderKeyAction | null {
  const { vertical = false, rtl = false, shiftKey = false } = options;
  const page = (up: boolean): SliderKeyAction =>
    shiftKey ? (up ? 'page-increment' : 'page-decrement') : up ? 'increment' : 'decrement';
  switch (key) {
    case 'ArrowUp':
      return page(true);
    case 'ArrowDown':
      return page(false);
    case 'ArrowRight':
      return page(vertical || !rtl);
    case 'ArrowLeft':
      return page(!(vertical || !rtl));
    case 'PageUp':
      return 'page-increment';
    case 'PageDown':
      return 'page-decrement';
    case 'Home':
      return 'min';
    case 'End':
      return 'max';
    default:
      return null;
  }
}

/**
 * The value a key action gives thumb `index` (the result is coerced into the thumb's bounds and
 * snapped). Home / End go to the thumb's bounds: a range start thumb's End meets the end thumb.
 */
export function sliderKeyValue(
  action: SliderKeyAction,
  values: readonly number[],
  index: number,
  steps: number,
  min: number,
  max: number,
): number {
  const value = values[index] ?? min;
  const bounds = sliderThumbBounds(values, index, min, max);
  const delta = sliderKeyDelta(steps, min, max);
  const page = sliderPageSteps(steps) * delta;
  const target =
    action === 'increment'
      ? value + delta
      : action === 'decrement'
        ? value - delta
        : action === 'page-increment'
          ? value + page
          : action === 'page-decrement'
            ? value - page
            : action === 'min'
              ? bounds.min
              : bounds.max;
  return sliderThumbValue(target, bounds, steps, min, max);
}

/**
 * The range thumb a press at `value` moves (RangeSliderLogic): the closer one; when both are as
 * close, the start thumb if it lies after the pointer (stacked thumbs pressed before them), else
 * the end thumb.
 */
export function sliderClosestThumb(values: readonly number[], value: number): number {
  const [start, end] = values;
  if (start === undefined || end === undefined) return 0;
  const diffStart = Math.abs(start - value);
  const diffEnd = Math.abs(end - value);
  if (diffStart !== diffEnd) return diffStart < diffEnd ? 0 : 1;
  return start > value ? 0 : 1;
}

/** Input of `sliderTrackGeometry` (one axis; slider.css mirrors it for RTL and vertical). */
export interface SliderTrackInput {
  /** Track length: the slider's length less the thumb width. */
  readonly length: number;
  /** Outer corner size (the default Track: thickness / 2). */
  readonly cornerSize: number;
  /** TrackInsideCornerSize. */
  readonly insideCornerSize: number;
  /** ThumbWidth (the thumb's layout size along the track; its handle may be narrower). */
  readonly thumbWidth: number;
  /** ThumbTrackGapSize. */
  readonly gapSize: number;
  readonly steps: number;
  /** The single thumb's fraction, or the range end's. */
  readonly fraction: number;
  /** A range's start fraction. */
  readonly startFraction?: number;
  readonly centered?: boolean;
  /** Track(trackCornerSize) and CenteredTrack shrink corners; the default Track does not. */
  readonly cornerShrinking?: boolean;
  /** Stop indicators drawn (SliderWithTrackIconsSample passes null). Default true. */
  readonly stopIndicator?: boolean;
}

export type SliderTrackPartKind = 'inactive-start' | 'active' | 'inactive-end';

export interface SliderTrackPart {
  readonly kind: SliderTrackPartKind;
  readonly start: number;
  readonly end: number;
  readonly startRadius: number;
  readonly endRadius: number;
}

export interface SliderTick {
  readonly position: number;
  readonly active: boolean;
}

export interface SliderTrackGeometry {
  /** Thumb centres along the track (one, or a range's start and end). */
  readonly thumbs: readonly number[];
  readonly parts: readonly SliderTrackPart[];
  /** Stop indicator centres. */
  readonly stops: readonly number[];
  readonly ticks: readonly SliderTick[];
}

/**
 * SliderImpl's thumb placement and drawTrack (LTR, horizontal), in track coordinates: with steps,
 * a value off the first and last tick sits between the corners
 * ((length − 2 × corner) × fraction + corner), else length × fraction.
 */
export function sliderTrackGeometry(input: SliderTrackInput): SliderTrackGeometry {
  const {
    length,
    cornerSize: c,
    insideCornerSize: inside,
    thumbWidth,
    gapSize,
    steps,
    fraction,
    centered = false,
    cornerShrinking = false,
    stopIndicator = true,
  } = input;
  const range = input.startFraction !== undefined;
  const ticks = sliderTickFractions(steps);
  const onEdge = (f: number) => f === ticks[0] || f === ticks[ticks.length - 1];
  const position = (f: number) =>
    ticks.length > 0 && !onEdge(f) ? (length - c * 2) * f + c : length * f;
  const end = position(fraction);
  const start = range ? position(input.startFraction) : 0;
  const centre = length / 2;
  // Thumb widths per gap: a centered slider has a start gap only while not after the centre and
  // an end gap only while not before it (each still ThumbTrackGapSize wide without the thumb).
  const before = fraction < 0.5;
  const after = fraction > 0.5;
  const startThumb = centered ? (!after ? thumbWidth : 0) : range ? thumbWidth : 0;
  const endThumb = centered ? (!before ? thumbWidth : 0) : thumbWidth;
  const startGapSize = centered || range ? gapSize : 0;
  const startGap = startGapSize > 0 ? startThumb / 2 + startGapSize : 0;
  const endGap = gapSize > 0 ? endThumb / 2 + gapSize : 0;
  const thresholdCorner = !cornerShrinking || ticks.length > 0;
  const parts: SliderTrackPart[] = [];
  const stops: number[] = [];

  // Inactive track before the start (range) or the centre (centered).
  const adjustedEnd = centered ? Math.min(end, centre) : start;
  const rangeThreshold = startGap + (thresholdCorner ? c : 0);
  if ((centered || range) && adjustedEnd > rangeThreshold) {
    parts.push({
      kind: 'inactive-start',
      start: 0,
      end: adjustedEnd - startGap,
      startRadius: c,
      endRadius: inside,
    });
    if (stopIndicator) stops.push(c);
  }
  // Inactive track after the thumb (or the centre).
  const adjustedStart = centered ? Math.max(end, centre) : end;
  const inactiveThreshold = length - endGap - (thresholdCorner ? c : 0);
  if (adjustedStart < inactiveThreshold) {
    parts.push({
      kind: 'inactive-end',
      start: adjustedStart + endGap,
      end: length,
      startRadius: inside,
      endRadius: c,
    });
    if (stopIndicator) stops.push(length - c);
  }
  // Active track.
  const activeStart = centered
    ? adjustedEnd + (adjustedEnd < centre ? startGap : 0)
    : range
      ? start + startGap
      : 0;
  const activeEnd = centered ? adjustedStart - (adjustedStart > centre ? endGap : 0) : end - endGap;
  const activeStartRadius = centered || range ? inside : c;
  const activeThreshold = thresholdCorner ? activeStartRadius : 0;
  if (activeEnd - activeStart > activeThreshold) {
    parts.push({
      kind: 'active',
      start: activeStart,
      end: activeEnd,
      startRadius: activeStartRadius,
      endRadius: inside,
    });
  }

  // Ticks between the corners, skipping the stop indicators' and those in a gap.
  const tickList: SliderTick[] = [];
  const centreGap = centered ? (end > centre ? startGap : endGap) : 0;
  const thumbGap = centered ? (end > centre ? endGap : startGap) : endGap;
  ticks.forEach((t, i) => {
    if (stopIndicator && (((centered || range) && i === 0) || i === ticks.length - 1)) return;
    const p = lerp(c, length - c, t);
    const within = (centreOf: number, gap: number) => p >= centreOf - gap && p <= centreOf + gap;
    if (
      (centered && within(centre, centreGap)) ||
      (range && within(start, startGap)) ||
      within(end, thumbGap)
    ) {
      return;
    }
    tickList.push({ position: p, active: p >= activeStart && p <= activeEnd });
  });

  return { thumbs: range ? [start, end] : [end], parts, stops, ticks: tickList };
}
