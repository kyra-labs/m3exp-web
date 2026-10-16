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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/FloatingToolbar.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// FloatingToolbarState (L1299-1377), ExitAlwaysFloatingToolbarScrollBehavior (onPostScroll and the
// offset limit, L540-628), the settle decision of settleFloatingToolbar (L1383-1437) and
// FloatingToolbarDefaults.VerticalNestedScrollExpansionNode (floatingToolbarVerticalNestedScroll,
// L1013-1106), adapted to DOM scrolling like app-bar-scroll.ts: the web observes `scrollTop` after
// the browser scrolled, so `delta` (previous minus new scroll position, positive when the content
// is pulled down, like Compose's `consumed.y`) moves both, and momentum comes from the browser
// instead of flingAnimationSpec. Offsets are CSS px; hiding is negative.
import { settleTarget } from './app-bar-scroll.js';

/** Where a floating toolbar leaves the screen (FloatingToolbarExitDirection), logical. */
export type FloatingToolbarExitDirection = 'bottom' | 'top' | 'start' | 'end';

export interface FloatingToolbarScrollState {
  /** Most negative offset: minus the distance that takes the toolbar off its container. */
  readonly offsetLimit: number;
  /** Current offset, between offsetLimit and 0. */
  readonly offset: number;
  /** Total content scrolled under the toolbar (sum of the deltas). */
  readonly contentOffset: number;
}

/** rememberFloatingToolbarState() defaults: no limit known yet, fully shown. */
export function floatingToolbarScrollState(
  offsetLimit = -Number.MAX_VALUE,
  offset = 0,
  contentOffset = 0,
): FloatingToolbarScrollState {
  return withToolbarOffset({ offsetLimit, offset: 0, contentOffset }, offset);
}

/** FloatingToolbarState.offset setter: coerced between offsetLimit and 0. */
export function withToolbarOffset(
  state: FloatingToolbarScrollState,
  offset: number,
): FloatingToolbarScrollState {
  return { ...state, offset: Math.min(Math.max(offset, state.offsetLimit), 0) };
}

/**
 * The offset limit from the toolbar's layout (onGloballyPositioned): `distance` is how far the
 * toolbar must travel along its exit direction to leave its container, i.e. its size plus its gap
 * to that edge, measured without the current offset. The offset stays in range.
 */
export function withToolbarOffsetLimit(
  state: FloatingToolbarScrollState,
  distance: number,
): FloatingToolbarScrollState {
  return withToolbarOffset({ ...state, offsetLimit: -Math.max(distance, 0) }, state.offset);
}

/** exitAlways onPostScroll: the content offset and the toolbar offset both move by `delta`. */
export function scrollFloatingToolbar(
  state: FloatingToolbarScrollState,
  delta: number,
): FloatingToolbarScrollState {
  return withToolbarOffset(
    { ...state, contentOffset: state.contentOffset + delta },
    state.offset + delta,
  );
}

/** 0 = fully shown, 1 = fully hidden (FloatingToolbarState.collapsedFraction()). */
export function toolbarCollapsedFraction(state: FloatingToolbarScrollState): number {
  // `+ 0` turns the -0 of 0 / -limit into 0.
  return state.offsetLimit !== 0 ? state.offset / state.offsetLimit + 0 : 0;
}

/**
 * Where a partly hidden toolbar snaps when scrolling stops (settleFloatingToolbar): shown below
 * half, hidden from half, or null when it is already (within 1%) settled. The decision is the
 * same as the top app bar's settleAppBar, so it reuses that port.
 */
export function toolbarSettleTarget(state: FloatingToolbarScrollState): number | null {
  return settleTarget({
    heightOffsetLimit: state.offsetLimit,
    heightOffset: state.offset,
    contentOffset: state.contentOffset,
    atStart: false,
  });
}

/**
 * floatingToolbarVerticalNestedScroll: collapses the toolbar after scrolling down by the collapse
 * threshold and expands it after scrolling up by the expand threshold (both
 * FloatingToolbarDefaults.ScrollDistanceThreshold by default).
 */
export interface ToolbarExpansionScroll {
  readonly contentOffset: number;
  /** The content offset that triggers the next change. */
  readonly threshold: number;
}

/** A tracker for a toolbar that is `expanded` (updateThreshold). */
export function toolbarExpansionScroll(
  expanded: boolean,
  collapseThreshold: number,
  expandThreshold: number,
  contentOffset = 0,
): ToolbarExpansionScroll {
  return {
    contentOffset,
    threshold: expanded ? contentOffset - collapseThreshold : contentOffset + expandThreshold,
  };
}

/**
 * onPostScroll: moves the content offset by `delta`; returns the new tracker and `'collapse'` /
 * `'expand'` when a threshold was crossed (Compose calls onCollapse / onExpand then).
 */
export function scrollToolbarExpansion(
  state: ToolbarExpansionScroll,
  delta: number,
  collapseThreshold: number,
  expandThreshold: number,
): { state: ToolbarExpansionScroll; change: 'collapse' | 'expand' | null } {
  const contentOffset = state.contentOffset + delta;
  if (delta < 0 && contentOffset <= state.threshold) {
    return {
      state: { contentOffset, threshold: contentOffset + expandThreshold },
      change: 'collapse',
    };
  }
  if (delta > 0 && contentOffset >= state.threshold) {
    return {
      state: { contentOffset, threshold: contentOffset - collapseThreshold },
      change: 'expand',
    };
  }
  return { state: { contentOffset, threshold: state.threshold }, change: null };
}
