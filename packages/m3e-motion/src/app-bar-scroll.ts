/*
 * Copyright 2021 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/AppBar.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// TopAppBarState (L2050-2130), the pinned and enter-always scroll behaviors (L3267-3303,
// L3400-3455) and the settle decision of settleAppBar (L3542-3589), adapted to DOM scrolling.
// Compose receives nested
// scroll deltas and can consume them; the web observes `scrollTop` after the browser scrolled, so
// every delta goes to both the bar and the content, and momentum comes from the browser instead
// of flingAnimationSpec. Offsets are in CSS px; y grows downward, so collapsing is negative.

/** How the bar reacts to its scroll container (TopAppBarDefaults.*ScrollBehavior). */
export type AppBarScrollBehavior = 'pinned' | 'enter-always';

export interface AppBarScrollState {
  /** Most negative height offset: minus the bar's full height (adjustHeightOffsetLimit). */
  readonly heightOffsetLimit: number;
  /** Current height offset, between heightOffsetLimit and 0. */
  readonly heightOffset: number;
  /** Content scrolled under the bar (minus the scroll position). */
  readonly contentOffset: number;
  /** Whether the scrolling content is at its start (scroll position 0). */
  readonly atStart: boolean;
}

/** A fully expanded bar of `height` px over unscrolled content. */
export function appBarScrollState(height: number): AppBarScrollState {
  return { heightOffsetLimit: -height, heightOffset: 0, contentOffset: 0, atStart: true };
}

/** TopAppBarState.heightOffset setter: coerced between heightOffsetLimit and 0. */
export function withHeightOffset(state: AppBarScrollState, offset: number): AppBarScrollState {
  return { ...state, heightOffset: Math.min(Math.max(offset, state.heightOffsetLimit), 0) };
}

/** A new bar height (onSizeChanged → adjustHeightOffsetLimit), keeping the offset in range. */
export function withHeight(state: AppBarScrollState, height: number): AppBarScrollState {
  return withHeightOffset({ ...state, heightOffsetLimit: -height }, state.heightOffset);
}

/** 0 = fully expanded, 1 = fully collapsed (TopAppBarState.collapsedFraction). */
export function collapsedFraction(state: AppBarScrollState): number {
  // `+ 0` turns the -0 of 0 / -height into 0.
  return state.heightOffsetLimit !== 0 ? state.heightOffset / state.heightOffsetLimit + 0 : 0;
}

/** Share of the visible bar overlapping scrolled content (TopAppBarState.overlappedFraction). */
export function overlappedFraction(state: AppBarScrollState): number {
  if (!state.atStart && state.contentOffset === 0) return 1;
  if (state.heightOffsetLimit === 0) return 0;
  const limit = state.heightOffsetLimit;
  const clamped = Math.min(Math.max(limit + Math.abs(state.contentOffset), limit), 0);
  return 1 - clamped / limit;
}

/**
 * Whether the bar shows its scrolled container color: SingleRowTopAppBar targets the scrolled
 * color once `overlappedFraction > 0.01f` (L2689-2693).
 */
export function isScrolledUnder(state: AppBarScrollState): boolean {
  return overlappedFraction(state) > 0.01;
}

/**
 * Applies a scroll position change. `delta` is the previous minus the new scroll position
 * (positive when the content is pulled down, like Compose's `available.y`).
 * - pinned: only the content offset moves (PinnedScrollBehavior.onPostScroll).
 * - enter-always: the bar also collapses/expands by the same amount
 *   (EnterAlwaysScrollBehavior.onPreScroll: `heightOffset += available.y`).
 */
export function scrollAppBar(
  state: AppBarScrollState,
  behavior: AppBarScrollBehavior,
  scrollTop: number,
  delta: number,
): AppBarScrollState {
  const next: AppBarScrollState = { ...state, contentOffset: -scrollTop, atStart: scrollTop <= 0 };
  return behavior === 'enter-always' ? withHeightOffset(next, state.heightOffset + delta) : next;
}

/**
 * Where a partially collapsed bar snaps when scrolling stops (settleAppBar): fully expanded below
 * half, fully collapsed from half, or null when it is already (within 1%) settled.
 */
export function settleTarget(state: AppBarScrollState): number | null {
  const fraction = collapsedFraction(state);
  if (fraction < 0.01 || fraction === 1) return null;
  if (!(state.heightOffset < 0 && state.heightOffset > state.heightOffsetLimit)) return null;
  return fraction < 0.5 ? 0 : state.heightOffsetLimit;
}
