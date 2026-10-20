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
// Ported to TypeScript by Kyra Labs from compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/Easing.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// TopAppBarState (L2050-2130), the pinned, enter-always and exit-until-collapsed scroll behaviors
// (L3267-3303, L3400-3455, L3476-3536), the settle decision of settleAppBar (L3542-3589) and the
// two-rows bar's collapsed-fraction interpolation (TwoRowsTopAppBar L2818-2836,
// TopAppBarColors.containerColor L2229-2235, TopTitleAlphaEasing L3604; FastOutLinearInEasing
// from Easing.kt L66, solved by the shared cubic-bezier.ts), adapted to DOM scrolling. Compose
// receives nested scroll deltas and can consume them; the web observes `scrollTop` after the
// browser scrolled, so every delta goes to both the bar and the content, and momentum comes from
// the browser instead of flingAnimationSpec. Offsets are in CSS px; y grows downward, so
// collapsing is negative.

import { cubicBezier } from './cubic-bezier.js';

/** How the bar reacts to its scroll container (TopAppBarDefaults.*ScrollBehavior). */
export type AppBarScrollBehavior = 'pinned' | 'enter-always' | 'exit-until-collapsed';

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
 * - exit-until-collapsed: scrolling down collapses the bar by the same amount
 *   (ExitUntilCollapsedScrollBehavior.onPreScroll); scrolling up expands it only by what the
 *   content cannot take (onPostScroll: `heightOffset += available.y` once the content is at its
 *   start). On the web the content scrolls by the whole delta, so the part of an upward scroll
 *   that lies within the collapsed distance of the top (scroll position below -heightOffset) is
 *   the part Compose hands to the bar: the bar is fully expanded when the content reaches its
 *   start, and a bar that collapsed together with the content stays attached to it.
 */
export function scrollAppBar(
  state: AppBarScrollState,
  behavior: AppBarScrollBehavior,
  scrollTop: number,
  delta: number,
): AppBarScrollState {
  const next: AppBarScrollState = { ...state, contentOffset: -scrollTop, atStart: scrollTop <= 0 };
  if (behavior === 'pinned') return next;
  if (behavior === 'enter-always' || delta < 0) {
    return withHeightOffset(next, state.heightOffset + delta);
  }
  const below = (top: number) => Math.max(0, -state.heightOffset - top);
  return withHeightOffset(next, state.heightOffset + below(scrollTop) - below(scrollTop + delta));
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

/** TopTitleAlphaEasing (AppBar.kt L3604): CubicBezierEasing(.8f, 0f, .8f, .15f). */
export const TOP_TITLE_ALPHA_EASING = [0.8, 0, 0.8, 0.15] as const;
/** FastOutLinearInEasing (Easing.kt L66): CubicBezierEasing(0.4f, 0.0f, 1.0f, 1.0f). */
export const FAST_OUT_LINEAR_IN_EASING = [0.4, 0, 1, 1] as const;

// Pure IIFEs: a spread argument runs the array iterator, which bundlers keep even when the
// annotated call itself is dropped, so the spread stays inside the call they can remove.
const topTitleAlpha = /* @__PURE__ */ (() => cubicBezier(...TOP_TITLE_ALPHA_EASING))();
const fastOutLinearIn = /* @__PURE__ */ (() => cubicBezier(...FAST_OUT_LINEAR_IN_EASING))();

/** What a two-rows bar (medium / large flexible, TwoRowsTopAppBar) draws at a collapsed fraction. */
export interface TwoRowsFrame {
  /** Alpha of the collapsed (top row) title and subtitle: TopTitleAlphaEasing(fraction). */
  readonly collapsedTitleAlpha: number;
  /** Alpha of the expanded (bottom row) title and subtitle: 1 - fraction. */
  readonly expandedTitleAlpha: number;
  /** Container → scrolled container color mix (TopAppBarColors.containerColor): FastOutLinearIn. */
  readonly containerColorFraction: number;
  /** Below 0.5 the collapsed title is hidden from accessibility, from 0.5 the expanded one. */
  readonly collapsedTitleHidden: boolean;
}

/** TwoRowsTopAppBar (L2818-2836): the color, both title alphas and semantics follow the fraction. */
export function twoRowsFrame(fraction: number): TwoRowsFrame {
  return {
    collapsedTitleAlpha: topTitleAlpha(fraction),
    expandedTitleAlpha: 1 - fraction,
    containerColorFraction: fastOutLinearIn(fraction),
    collapsedTitleHidden: fraction < 0.5,
  };
}
