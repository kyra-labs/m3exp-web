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
// Ported to TypeScript by Kyra Labs from compose/material3/material3-adaptive-navigation-suite/src/commonMain/kotlin/androidx/compose/material3/adaptive/navigationsuite/NavigationSuiteScaffold.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// NavigationSuiteScaffoldStateImpl (L1407-1464) and the progress NavigationSuiteScaffoldLayout
// animates (L387-391, L410-480). The state runs one Animatable between Hidden (0) and Visible (1)
// on AnimationSpec (L1594-1595); its currentValue is Visible only while that value is exactly 1
// (L1411-1417). The layout animates its own progress (animateFloatAsState, same spec) to
// currentValue. So hiding moves the navigation as soon as the state leaves 1, while showing waits
// until the state's spring has settled at 1 and only then slides the navigation in; snapTo jumps
// the state, and the layout still animates. Both springs keep their velocity when retargeted.
import { SpringAnimatable } from './animatable.js';
import type { SpringSpec } from './spring.js';

const HIDDEN = 0;
const VISIBLE = 1;

export interface NavigationSuiteSample {
  /** The layout's animationProgress: 0 hidden … 1 shown. */
  readonly progress: number;
  /** Either spring is still moving (the caller keeps its frame loop going). */
  readonly running: boolean;
}

/**
 * NavigationSuiteScaffoldState plus its layout's progress, driven by the caller's clock (ms).
 * `spec` is the scaffold's AnimationSpec (`--m3e-comp-navigation-suite-scaffold-visibility-*`), or
 * null to jump (the spatial spring under reduced motion).
 */
export class NavigationSuiteScaffoldAnimation {
  readonly #state: SpringAnimatable;
  readonly #progress: SpringAnimatable;
  #spec: SpringSpec | null = null;

  /** `hidden`: rememberNavigationSuiteScaffoldState(initialValue = Hidden); rendered at rest. */
  constructor(hidden = false) {
    const value = hidden ? HIDDEN : VISIBLE;
    this.#state = new SpringAnimatable(value);
    this.#progress = new SpringAnimatable(value);
  }

  /** NavigationSuiteScaffoldState.targetValue == Hidden. */
  get targetHidden(): boolean {
    return this.#state.target !== VISIBLE;
  }

  /** NavigationSuiteScaffoldState.currentValue == Hidden (anything but exactly Visible). */
  get currentHidden(): boolean {
    return this.#state.value !== VISIBLE;
  }

  /** NavigationSuiteScaffoldState.isAnimating (the state's spring, not the layout's). */
  get isAnimating(): boolean {
    return this.#state.isRunning;
  }

  /** NavigationSuiteScaffoldState.hide(). */
  hide(spec: SpringSpec | null, now: number): void {
    this.#animate(HIDDEN, spec, now);
  }

  /** NavigationSuiteScaffoldState.show(). */
  show(spec: SpringSpec | null, now: number): void {
    this.#animate(VISIBLE, spec, now);
  }

  /** NavigationSuiteScaffoldState.toggle(): towards the opposite of the target. */
  toggle(spec: SpringSpec | null, now: number): void {
    this.#animate(this.targetHidden ? VISIBLE : HIDDEN, spec, now);
  }

  /** NavigationSuiteScaffoldState.snapTo(): the state jumps; the layout animates from `now`. */
  snapTo(hidden: boolean, spec: SpringSpec | null, now: number): void {
    this.#spec = spec;
    this.#state.snapTo(hidden ? HIDDEN : VISIBLE);
    this.sample(now);
  }

  #animate(target: number, spec: SpringSpec | null, now: number): void {
    this.#spec = spec;
    this.#state.animateTo(target, spec, now);
    this.sample(now);
  }

  /** Advances both springs to `now`; the layout retargets when currentValue changes. */
  sample(now: number): NavigationSuiteSample {
    this.#state.sample(now);
    const target = this.currentHidden ? HIDDEN : VISIBLE;
    if (this.#progress.target !== target) this.#progress.animateTo(target, this.#spec, now);
    const progress = this.#progress.sample(now);
    return { progress, running: this.#state.isRunning || this.#progress.isRunning };
  }
}

/**
 * How far the navigation is pushed out of the layout (px) for `size` (its height with a bar, its
 * width otherwise) at `progress`: `size − (size × progress).toInt()`. The content gets the rest of
 * the layout; the navigation sits at `layoutHeight − (height × progress).toInt()` (bar types) or
 * `−(width × (1 − progress)).toInt()` (L417-479).
 */
export function navigationSuiteOffset(size: number, progress: number): number {
  return size - Math.trunc(size * progress);
}
