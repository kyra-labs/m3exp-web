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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/SearchBar.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// SearchBarState (L1434-1628: the expand / collapse animatable, the content fade animatable and
// currentValue's 0.02 threshold), the drop-down slide of ExpandedDockedSearchBarWithGap
// (DockedSearchBarLayout L3659-3690: AnimatedVisibility once progress > 0.1, sliding by half its
// height on the state's expand / collapse springs) and the geometry of the expanded views:
// FullScreenSearchBarLayout (L3880-4023, without predictive back), DockedSearchBarLayoutImpl
// (L3724-3771) and the with-gap popup (ExpandedDockedSearchBarImpl L1172-1203). Compose lays the
// expanded views out in a dialog / popup window; here they are fixed-position boxes in the top
// layer, so every rectangle is in viewport (window) px. Time is injected (ms), so m3e-elements
// drives it from its frame loop and tests step it deterministically.

import { SpringAnimatable } from './animatable.js';
import type { Easing } from './cubic-bezier.js';
import type { SpringSpec } from './spring.js';

/** SearchBarState.currentValue is Expanded above this (L1535, "tolerance for spring anim"). */
export const SEARCH_BAR_EXPANDED_THRESHOLD = 0.02;
/** ExpandedDockedSearchBarWithGap shows its results once progress passes this (L3667). */
export const SEARCH_DROPDOWN_VISIBLE_PROGRESS = 0.1;

/** A Compose `tween(durationMillis, delayMillis, easing)`. */
export interface TweenSpec {
  readonly duration: number;
  readonly delay: number;
  readonly easing: Easing;
}

/**
 * A float with Compose `Animatable.animateTo(tween)` semantics: each target starts a tween from the
 * current value (velocity is not carried), held for `delay`, then eased over `duration`. A null
 * spec is Compose's `snap()`: the value jumps.
 */
export class TweenAnimatable {
  #value: number;
  #from: number;
  #target: number;
  #start = 0;
  #spec: TweenSpec | null = null;

  constructor(value: number) {
    this.#value = value;
    this.#from = value;
    this.#target = value;
  }

  get value(): number {
    return this.#value;
  }

  get target(): number {
    return this.#target;
  }

  get isRunning(): boolean {
    return this.#spec !== null;
  }

  snapTo(value: number): void {
    this.#spec = null;
    this.#value = value;
    this.#from = value;
    this.#target = value;
  }

  animateTo(target: number, spec: TweenSpec | null, now: number): void {
    this.sample(now);
    if (spec === null || spec.delay + spec.duration <= 0) {
      this.snapTo(target);
      return;
    }
    this.#from = this.#value;
    this.#target = target;
    this.#start = now;
    this.#spec = spec;
  }

  sample(now: number): number {
    const spec = this.#spec;
    if (spec === null) return this.#value;
    const elapsed = now - this.#start - spec.delay;
    if (elapsed >= spec.duration) {
      this.snapTo(this.#target);
      return this.#value;
    }
    const fraction = elapsed <= 0 ? 0 : spec.easing(elapsed / spec.duration);
    this.#value = this.#from + (this.#target - this.#from) * fraction;
    return this.#value;
  }
}

/** The four animation specs of a SearchBarState (null springs / tweens jump, as `snap()`). */
export interface SearchBarSpecs {
  readonly expand: SpringSpec | null;
  readonly collapse: SpringSpec | null;
  readonly contentFadeIn: TweenSpec | null;
  readonly contentFadeOut: TweenSpec | null;
}

/** One sampled frame of a {@link SearchBarAnimation}. */
export interface SearchBarSample {
  /** `animatable.value`: may overshoot 1 (expressive spatial springs). */
  readonly value: number;
  /** `progress`: the value clamped to [0, 1]. */
  readonly progress: number;
  /** `contentProgress` (the contained / with-gap results' alpha). */
  readonly contentProgress: number;
  /** The with-gap drop-down's slide offset in px (0 at rest, minus half its height hidden). */
  readonly slide: number;
  /** Whether the with-gap drop-down is shown (AnimatedVisibility is entering, visible or exiting). */
  readonly dropdownShown: boolean;
}

/**
 * SearchBarState's animation: `animateToExpanded` / `animateToCollapsed` run the progress spring
 * and the content tween together; a new target starts from the current value and velocity
 * (Animatable). Optionally (ExpandedDockedSearchBarWithGap) it also runs the drop-down's
 * slide-in / slide-out on the same springs, from progress 0.1.
 */
export class SearchBarAnimation {
  readonly #progress: SpringAnimatable;
  readonly #content: TweenAnimatable;
  readonly #slide = new SpringAnimatable(0);
  #specs: SearchBarSpecs | null = null;
  #dropdownShown = false;
  #dropdownVisible = false;

  constructor(expanded = false) {
    this.#progress = new SpringAnimatable(expanded ? 1 : 0);
    this.#content = new TweenAnimatable(expanded ? 1 : 0);
    this.#dropdownShown = expanded;
    this.#dropdownVisible = expanded;
  }

  /** SearchBarState.targetValue. */
  get isTargetExpanded(): boolean {
    return this.#progress.target === 1;
  }

  /** SearchBarState.currentValue: expanded until the value drops to the 0.02 tolerance. */
  get isExpanded(): boolean {
    return this.#progress.value > SEARCH_BAR_EXPANDED_THRESHOLD;
  }

  get isRunning(): boolean {
    return this.#progress.isRunning || this.#content.isRunning || this.#slide.isRunning;
  }

  /** animateToExpanded() at `now` (ms). */
  expand(specs: SearchBarSpecs, now: number): void {
    this.#specs = specs;
    this.#progress.animateTo(1, specs.expand, now);
    this.#content.animateTo(1, specs.contentFadeIn, now);
  }

  /** animateToCollapsed() at `now` (ms). */
  collapse(specs: SearchBarSpecs, now: number): void {
    this.#specs = specs;
    this.#content.animateTo(0, specs.contentFadeOut, now);
    this.#progress.animateTo(0, specs.collapse, now);
  }

  /** Jumps to collapsed (0) or expanded (1), stopping every animation. */
  snapTo(expanded: boolean): void {
    this.#progress.snapTo(expanded ? 1 : 0);
    this.#content.snapTo(expanded ? 1 : 0);
    this.#slide.snapTo(0);
    this.#dropdownShown = expanded;
    this.#dropdownVisible = expanded;
  }

  /**
   * Advances to `now`. `dropdownHeight` (px, the drop-down's full height) enables the with-gap
   * slide: AnimatedVisibility(visible = progress > 0.1 && target == Expanded) slides in from minus
   * half the height on the expand spring and out to it on the collapse spring.
   */
  sample(now: number, dropdownHeight?: number): SearchBarSample {
    const value = this.#progress.sample(now);
    const progress = Math.min(Math.max(value, 0), 1);
    const contentProgress = Math.min(Math.max(this.#content.sample(now), 0), 1);
    if (dropdownHeight !== undefined) {
      const hidden = Math.round(-dropdownHeight / 2);
      const visible = progress > SEARCH_DROPDOWN_VISIBLE_PROGRESS && this.isTargetExpanded;
      if (visible !== this.#dropdownVisible) {
        this.#dropdownVisible = visible;
        if (visible) {
          // Enter: from minus half the height (or from where an exit got to).
          if (!this.#dropdownShown) this.#slide.snapTo(hidden);
          this.#dropdownShown = true;
          this.#slide.animateTo(0, this.#specs?.expand ?? null, now);
        } else if (this.#dropdownShown) {
          this.#slide.animateTo(hidden, this.#specs?.collapse ?? null, now);
        }
      }
      this.#slide.sample(now);
      if (!visible && this.#dropdownShown && !this.#slide.isRunning) this.#dropdownShown = false;
    }
    return {
      value,
      progress,
      contentProgress,
      slide: this.#slide.value,
      dropdownShown: this.#dropdownShown,
    };
  }
}

/** The expanded views Compose offers for a SearchBarState. */
export type SearchViewVariant =
  'full-screen' | 'full-screen-contained' | 'docked' | 'docked-with-gap';

export interface SearchRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The SearchBar.kt measurements the layouts read (px; search-defaults.css). */
export interface SearchViewMetrics {
  /** SearchBarVerticalPadding (8dp). */
  readonly verticalPadding: number;
  /** AppBarWithSearchVerticalPadding (4dp): the contained view's top padding. */
  readonly containedTopPadding: number;
  /** FullScreenExpandedHorizontalPadding (8dp). */
  readonly containedHorizontalPadding: number;
  /** SearchBarCornerRadius = InputFieldHeight / 2 (28dp). */
  readonly cornerRadius: number;
  /** DockedExpandedTableMinHeight (240dp). */
  readonly dockedMinHeight: number;
  /** DockedExpandedTableMaxHeightScreenRatio (2/3). */
  readonly dockedMaxHeightRatio: number;
  /** DockedExpandedWithGapTableMaxHeightScreenRatio (1/2). */
  readonly withGapMaxHeightRatio: number;
  /** dockedDropdownGapSize (2dp). */
  readonly dropdownGap: number;
}

export interface SearchViewInput {
  readonly variant: SearchViewVariant;
  /** The collapsed search bar (`collapsedBounds`), viewport px. */
  readonly collapsed: SearchRect;
  /** The window (viewport) size. */
  readonly window: { readonly width: number; readonly height: number };
  /** The unconsumed top window inset (safe area). */
  readonly insetTop: number;
  readonly sample: Pick<SearchBarSample, 'value' | 'progress'>;
  readonly metrics: SearchViewMetrics;
}

/** Where everything of an expanded view goes in one frame (viewport px). */
export interface SearchViewFrame {
  /**
   * The surface: full-screen, the growing container (with `radius`); contained, the window,
   * faded in by `alpha`; docked, the panel holding field and results (height between `minHeight`
   * and `maxHeight`); with gap, the scrim (drawn at `alpha` × the scrim opacity).
   */
  readonly surface: SearchRect & {
    readonly radius: number;
    readonly alpha: number;
    readonly minHeight: number;
    readonly maxHeight: number;
  };
  /** The input field (collapsed height). */
  readonly field: { readonly x: number; readonly y: number; readonly width: number };
  /** The results: top-left, width and the height they may take. */
  readonly results: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly maxHeight: number;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The layout of an expanded view at one animation frame: FullScreenSearchBarLayout (`isContained`
 * false / true), DockedSearchBarLayoutImpl (docked) and the with-gap popup. Predictive back is not
 * ported (the web has no back gesture progress).
 */
export function searchViewFrame(input: SearchViewInput): SearchViewFrame {
  const { variant, collapsed: c, window: w, insetTop, metrics: m } = input;
  const { value, progress: p } = input.sample;
  const none = { radius: 0, alpha: 1, minHeight: 0, maxHeight: 0 };

  if (variant === 'docked' || variant === 'docked-with-gap') {
    const ratio = variant === 'docked' ? m.dockedMaxHeightRatio : m.withGapMaxHeightRatio;
    const tableMax = w.height * ratio;
    const maxHeight = lerp(c.height, tableMax, Math.max(value, 0));
    const minHeight = Math.min(Math.min(m.dockedMinHeight, tableMax), maxHeight);
    if (variant === 'docked') {
      return {
        surface: { ...c, radius: 0, alpha: 1, minHeight, maxHeight },
        field: { x: c.x, y: c.y, width: c.width },
        results: { x: c.x, y: c.y + c.height, width: c.width, maxHeight: maxHeight - c.height },
      };
    }
    return {
      surface: { x: 0, y: 0, width: w.width, height: w.height, ...none, alpha: p },
      field: { x: c.x, y: c.y, width: c.width },
      results: {
        x: c.x,
        y: c.y + c.height + m.dropdownGap,
        width: c.width,
        maxHeight: Math.max(0, maxHeight - c.height - m.dropdownGap),
      },
    };
  }

  const contained = variant === 'full-screen-contained';
  const width = contained ? w.width : lerp(c.width, w.width, p);
  const height = contained ? w.height : lerp(c.height, w.height, p);
  const offsetX = contained ? 0 : lerp(c.x, 0, p);
  const padding = contained ? m.containedHorizontalPadding : 0;
  const fieldWidth = lerp(c.width, width - 2 * padding, value);
  const centerX = lerp(c.x + c.width / 2, offsetX + width / 2, value);
  const topPadding = insetTop + (contained ? m.containedTopPadding : m.verticalPadding);
  const animatedTopPadding = topPadding * Math.min(p, 1);
  const bottomPadding = contained ? m.verticalPadding : m.verticalPadding * p;
  const offsetY = lerp(c.y, 0, p);
  const fieldY = offsetY + animatedTopPadding;
  return {
    surface: contained
      ? { x: 0, y: 0, width, height, ...none, alpha: p }
      : { x: offsetX, y: offsetY, width, height, ...none, radius: m.cornerRadius * (1 - p) },
    field: { x: Math.round(centerX - fieldWidth / 2), y: fieldY, width: fieldWidth },
    results: {
      x: offsetX,
      y: fieldY + c.height + bottomPadding,
      width,
      maxHeight: Math.max(0, height - (c.height + animatedTopPadding + bottomPadding)),
    },
  };
}

/**
 * The combobox's next active option for a key (React Aria / APG list autocomplete): ArrowDown
 * from the input goes to the first option and then down, stopping at the last; ArrowUp from the
 * input goes to the last option and then up, and from the first option back to the input (-1).
 * Returns null for keys it does not handle or an empty list. `enabled` filters disabled options.
 */
export function searchNavigationTarget(
  key: string,
  enabled: readonly boolean[],
  active: number,
): number | null {
  const indices = enabled.flatMap((on, i) => (on ? [i] : []));
  const first = indices[0];
  const last = indices.at(-1);
  if (first === undefined || last === undefined) return null;
  const at = indices.indexOf(active);
  if (key === 'ArrowDown') return at === -1 ? first : (indices[at + 1] ?? last);
  if (key === 'ArrowUp') return at === -1 ? last : at === 0 ? -1 : (indices[at - 1] ?? first);
  return null;
}
