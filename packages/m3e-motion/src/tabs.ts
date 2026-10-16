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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/TabRow.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The tab rows' indicator and scroll math, in CSS px (= dp):
// - TabPosition (L946-973): a tab's left edge, width and contentWidth. Fixed rows (TabRowImpl
//   L454-465): rowWidth / count wide tabs, contentWidth = min(intrinsic width, tab width) −
//   2 × HorizontalTextPadding; scrollable rows (ScrollableTabRowImpl L597-613): at least
//   minTabWidth wide from edgePadding, contentWidth = intrinsic width − 2 × HorizontalTextPadding;
//   both at least 24dp ("minimum touch target"). The caller measures the tab content directly
//   (the intrinsic width less the padding), so `tabPositions` only accumulates and clamps.
// - TabIndicatorOffsetNode (L680-751): two Animatable<Dp>s, the indicator offset (the selected
//   tab's left) and width (contentWidth for PrimaryIndicator, matchContentSize = true; width for
//   SecondaryIndicator), each retargeted with animateTo(target, DefaultSpatial) when its target
//   changes, so a new selection starts from the current value and velocity; the first layout
//   snaps. The indicator is centred in the selected tab's slot: x = offset + (tab width − width)/2
//   (fixed rows: the indicator constraints are the tab width; scrollable rows: relativeOffset,
//   L634-638), so its centre is offset + tab width / 2. In RTL the offset is negated (mirrored).
// - ScrollableTabData.calculateTabOffset (L1168-1184): the scroll position that centres the
//   selected tab, clamped to the scroll range; animateScrollTo runs it on DefaultSpatial from rest.
// Time is injected (ms): m3e-elements drives it from its frame loop and tests step it.

import { SpringAnimatable } from './animatable.js';
import type { SpringSpec } from './spring.js';

/** TabRow.kt L461 / L608: `maxOf(contentWidth, 24.dp)` ("Enforce minimum touch target of 24.dp"). */
export const TAB_INDICATOR_MIN_WIDTH = 24;

/**
 * Visibility threshold of the indicator Animatables (Animatable<Dp> on a MotionScheme spring with
 * no threshold: Spring.DefaultDisplacementThreshold, 0.01dp), and of animateScrollTo's Float.
 */
const THRESHOLD = 0.01;

export type TabRowVariant = 'primary' | 'secondary';

/** What the caller measures per tab: its laid-out width and its content's width. */
export interface TabMeasure {
  readonly width: number;
  readonly contentWidth: number;
}

/** Compose `TabPosition`. */
export interface TabPosition {
  readonly left: number;
  readonly width: number;
  readonly contentWidth: number;
}

/** The tabs' positions from `start` (a scrollable row's edge padding; 0 for a fixed row). */
export function tabPositions(
  tabs: readonly TabMeasure[],
  start = 0,
  minIndicatorWidth = TAB_INDICATOR_MIN_WIDTH,
): TabPosition[] {
  let left = start;
  return tabs.map(({ width, contentWidth }) => {
    const position = { left, width, contentWidth: Math.max(contentWidth, minIndicatorWidth) };
    left += width;
    return position;
  });
}

/** The indicator's target: offset (the tab's left) and width (per variant). */
export function tabIndicatorTarget(
  position: TabPosition,
  variant: TabRowVariant,
): { offset: number; width: number } {
  return {
    offset: position.left,
    width: variant === 'primary' ? position.contentWidth : position.width,
  };
}

/** One frame of the indicator. */
export interface TabIndicatorSample {
  /** The animated offset (a tab's left edge). */
  readonly offset: number;
  readonly width: number;
  readonly running: boolean;
}

/** TabIndicatorOffsetNode: the offset and width Animatables. */
export class TabIndicatorAnimation {
  #offset: SpringAnimatable;
  #width: SpringAnimatable;

  /** Starts at rest on the first layout's target (Compose: initialOffset / initialWidth). */
  constructor(offset: number, width: number) {
    this.#offset = new SpringAnimatable(offset, THRESHOLD);
    this.#width = new SpringAnimatable(width, THRESHOLD);
  }

  get offset(): SpringAnimatable {
    return this.#offset;
  }

  get width(): SpringAnimatable {
    return this.#width;
  }

  get running(): boolean {
    return this.#offset.isRunning || this.#width.isRunning;
  }

  /**
   * Retargets each Animatable whose target changed, from its value and velocity at `now`; a null
   * spec (reduced motion) jumps.
   */
  animateTo(offset: number, width: number, spec: SpringSpec | null, now: number): void {
    if (width !== this.#width.target) this.#width.animateTo(width, spec, now);
    if (offset !== this.#offset.target) this.#offset.animateTo(offset, spec, now);
  }

  snapTo(offset: number, width: number): void {
    this.#offset.snapTo(offset);
    this.#width.snapTo(width);
  }

  sample(now: number): TabIndicatorSample {
    const offset = this.#offset.sample(now);
    const width = this.#width.sample(now);
    return { offset, width, running: this.running };
  }
}

/**
 * The indicator's shift from where the selected tab draws it at rest (centred in the tab), in the
 * row's logical direction: the centre is offset + tab width / 2 in both cases, so the shift is the
 * animated offset less the tab's left.
 */
export const tabIndicatorShift = (sample: { offset: number }, selected: TabPosition): number =>
  sample.offset - selected.left;

/**
 * ScrollableTabData.calculateTabOffset: the scroll position centring `tab` (its left includes the
 * edge padding) in a row `scrollWidth` wide (edge padding × 2 + the tabs) seen through
 * `visibleWidth`, clamped to the scroll range.
 */
export function scrollableTabOffset(
  tab: Pick<TabPosition, 'left' | 'width'>,
  scrollWidth: number,
  visibleWidth: number,
): number {
  const centered = tab.left - (visibleWidth / 2 - tab.width / 2);
  const available = Math.max(scrollWidth - visibleWidth, 0);
  return Math.min(Math.max(centered, 0), available);
}

/** animateScrollTo: a Float animation from the current scroll position, from rest. */
export class TabScrollAnimation {
  readonly value: SpringAnimatable;

  constructor(position: number) {
    this.value = new SpringAnimatable(position, THRESHOLD);
  }

  /** Starts a new scroll from `from` (the scroll state's value), velocity 0. */
  animateTo(from: number, target: number, spec: SpringSpec | null, now: number): void {
    this.value.snapTo(from);
    this.value.animateTo(target, spec, now, 0);
  }
}
