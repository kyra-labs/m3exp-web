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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/SheetDefaults.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898,
// compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/BottomSheet.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/BottomSheetScaffold.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// SheetState (SheetDefaults.kt L90-494) over m3e-motion's AnchoredDraggableAnimation, with the
// anchors BottomSheet lays out (BottomSheetImpl L293-328, L417-460) or, given a peek height,
// BottomSheetScaffold's StandardBottomSheet (L297-362; owner decision M9 #13: the standard sheet
// is BottomSheet with that peek option), the release fling's dampening near Hidden
// (BottomSheetImpl L218-247) and the drag handle's click (L364-371; scaffold L394-406).
// Offsets are px from the top of the sheet's container to the top of the sheet: Hidden at the
// container height, Expanded at container − sheet height. Time is injected (ms).

import {
  ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY,
  AnchoredDraggableAnimation,
  DraggableAnchors,
} from './anchored-draggable.js';
import type { SpringSpec } from './spring.js';

/** SheetValue (SheetDefaults.kt L498-507). */
export type SheetValue = 'hidden' | 'partially-expanded' | 'expanded';

/** `BottomSheetDefaults.PositionalThreshold` (SheetDefaults.kt L557), dp: absolute, not a fraction. */
export const SHEET_POSITIONAL_THRESHOLD = 56;
/** `BottomSheetDefaults.VelocityThreshold` (L559), dp/s: the dampening floor of a release. */
export const SHEET_VELOCITY_THRESHOLD = 125;
/** `BottomSheetDefaults.BoundaryDampeningZone` (L567), dp above the Hidden anchor. */
export const SHEET_BOUNDARY_DAMPENING_ZONE = 125;

/** The springs of a sheet (null jumps: reduced motion). */
export interface SheetSpecs {
  /** show() / expand(): BottomSheet's showMotion, DefaultSpatial (L135). */
  readonly show: SpringSpec | null;
  /** hide() / partialExpand(): hideMotion, FastEffects (L136). */
  readonly hide: SpringSpec | null;
  /** The release settle: the fling behavior's snap spec, DefaultSpatial (L198-205). */
  readonly settle: SpringSpec | null;
}

export interface SheetLayout {
  /** The container height (Compose `constraints.maxHeight`), px. */
  readonly fullHeight: number;
  /** The sheet height (at most fullHeight), px. */
  readonly sheetHeight: number;
  /**
   * BottomSheetScaffold's `sheetPeekHeight`, px: PartiallyExpanded shows this much of the sheet
   * (StandardBottomSheet's anchors). Undefined: BottomSheet's anchors (half the container, or the
   * whole sheet when it is shorter).
   */
  readonly peekHeight?: number | undefined;
}

export interface SheetStateOptions {
  /** The values the sheet can settle on; Expanded must be one (SheetState init L176-181). */
  readonly enabledValues?: Iterable<SheetValue>;
  readonly initialValue?: SheetValue;
  /** confirmValueChange: false vetoes a change (L94). */
  readonly confirmValueChange?: (value: SheetValue) => boolean;
  /** px (default {@link SHEET_POSITIONAL_THRESHOLD}). */
  readonly positionalThreshold?: number;
}

/** What the drag handle's click does (BottomSheetImpl L364-371, StandardBottomSheet L394-406). */
export type SheetHandleAction = 'dismiss' | 'expand' | 'partial-expand' | 'hide' | 'show';

/** One frame of a {@link SheetState}. */
export interface SheetSample {
  /** Sheet top in px from the container top (NaN before the first layout). */
  readonly offset: number;
  /**
   * px the offset is above the Expanded anchor (an overshooting spring): verticalScaleUp fills it
   * (SheetDefaults.kt L758-782).
   */
  readonly overflow: number;
  readonly running: boolean;
}

/**
 * BottomSheetImpl's anchors (L293-328): Hidden at the container height, PartiallyExpanded at
 * container − min(container / 2, sheet) (`isBottomSheetPartiallyExpandedDeterministicEnabled`,
 * true at the pin: a short sheet's PartiallyExpanded converges with Expanded), Expanded at
 * max(0, container − sheet) when the sheet has a height. With `peekHeight`, StandardBottomSheet's
 * (BottomSheetScaffold.kt L297-362): PartiallyExpanded at container − peek (unless skipped, the
 * peek is 0 or the whole sheet), Hidden only when enabled (or nothing else exists), Expanded at
 * container − sheet.
 */
export function bottomSheetAnchors(
  layout: SheetLayout,
  enabled: ReadonlySet<SheetValue>,
): DraggableAnchors<SheetValue> {
  const { fullHeight, sheetHeight, peekHeight } = layout;
  const entries: [SheetValue, number][] = [];
  if (peekHeight === undefined) {
    entries.push(['hidden', fullHeight]);
    if (enabled.has('partially-expanded')) {
      entries.push(['partially-expanded', fullHeight - Math.min(fullHeight / 2, sheetHeight)]);
    }
    if (sheetHeight !== 0) entries.push(['expanded', Math.max(0, fullHeight - sheetHeight)]);
    return new DraggableAnchors(entries);
  }
  const hidden = sheetHeight === 0 || peekHeight === 0 || enabled.has('hidden');
  const partial = enabled.has('partially-expanded') && peekHeight > 0 && peekHeight !== sheetHeight;
  if (partial) entries.push(['partially-expanded', fullHeight - peekHeight]);
  if (hidden) entries.push(['hidden', fullHeight]);
  if (sheetHeight > 0) entries.push(['expanded', fullHeight - sheetHeight]);
  return new DraggableAnchors(entries);
}

/**
 * The target after a layout change (BottomSheetImpl's draggableAnchors newTarget L310-326 with
 * shouldPromoteToExpanded L444-460; StandardBottomSheet L346-360).
 */
export function bottomSheetLayoutTarget(
  target: SheetValue,
  previous: DraggableAnchors<SheetValue>,
  next: DraggableAnchors<SheetValue>,
  peek: boolean,
): SheetValue {
  if (target === 'hidden') return 'hidden';
  if (target === 'expanded') return next.hasPositionFor('expanded') ? 'expanded' : 'hidden';
  if (!peek) {
    const converged =
      previous.hasPositionFor('partially-expanded') &&
      previous.hasPositionFor('expanded') &&
      previous.positionOf('partially-expanded') === previous.positionOf('expanded');
    if (converged && next.hasPositionFor('expanded')) return 'expanded';
  }
  if (next.hasPositionFor('partially-expanded')) return 'partially-expanded';
  if (next.hasPositionFor('expanded')) return 'expanded';
  return next.hasPositionFor('hidden') || !peek ? 'hidden' : target;
}

/**
 * The release velocity BottomSheetImpl's fling behavior uses (L218-247): a downward fling within
 * `zone` px of the Hidden anchor is scaled by (distance / zone)² (the expressive spring would
 * overshoot the floor), but a fling that reached `threshold` px/s keeps at least that.
 */
export function dampenSheetFlingVelocity(
  velocity: number,
  offset: number,
  anchors: DraggableAnchors<SheetValue>,
  zone = SHEET_BOUNDARY_DAMPENING_ZONE,
  threshold = SHEET_VELOCITY_THRESHOLD,
): number {
  if (velocity <= 0 || !anchors.hasPositionFor('hidden')) return velocity;
  const distanceToFloor = Math.max(0, anchors.positionOf('hidden') - offset);
  if (distanceToFloor >= zone) return velocity;
  const factor = distanceToFloor / zone;
  let safe = velocity * factor * factor;
  if (velocity >= threshold) safe = Math.max(safe, threshold);
  return safe;
}

/**
 * SheetState: the sheet's value and offset, its programmatic moves (expand / partialExpand /
 * show / hide, which confirm first), drags and the release.
 */
export class SheetState {
  readonly enabledValues: ReadonlySet<SheetValue>;
  readonly draggable: AnchoredDraggableAnimation<SheetValue>;
  readonly positionalThreshold: number;
  #confirm: (value: SheetValue) => boolean;
  #peek = false;

  constructor(options: SheetStateOptions = {}) {
    const enabled = new Set<SheetValue>(
      options.enabledValues ?? ['hidden', 'partially-expanded', 'expanded'],
    );
    const initial = options.initialValue ?? 'hidden';
    if (!enabled.has('expanded')) throw new Error('Expanded must be one of the enabled values.');
    if (!enabled.has(initial)) {
      throw new Error('The initial value must be one of the enabled values.');
    }
    this.enabledValues = enabled;
    this.positionalThreshold = options.positionalThreshold ?? SHEET_POSITIONAL_THRESHOLD;
    this.#confirm = options.confirmValueChange ?? (() => true);
    this.draggable = new AnchoredDraggableAnimation<SheetValue>(initial);
  }

  /** Replaces confirmValueChange (e.g. with a component's latest callback). */
  setConfirmValueChange(fn: (value: SheetValue) => boolean): void {
    this.#confirm = fn;
  }

  confirmValueChange(value: SheetValue): boolean {
    return this.#confirm(value);
  }

  get skipPartiallyExpanded(): boolean {
    return !this.enabledValues.has('partially-expanded');
  }

  get skipHiddenState(): boolean {
    return !this.enabledValues.has('hidden');
  }

  /** currentValue: the value it settled on (the anchored draggable's settledValue, L197-202). */
  get currentValue(): SheetValue {
    return this.draggable.settledValue;
  }

  get targetValue(): SheetValue {
    return this.draggable.targetValue;
  }

  /**
   * isVisible (L216-217): the anchored draggable's currentValue is not Hidden. Here: it is not
   * settled on Hidden, or it moves towards something else.
   */
  get isVisible(): boolean {
    return this.currentValue !== 'hidden' || this.targetValue !== 'hidden';
  }

  get isAnimationRunning(): boolean {
    return this.draggable.isAnimationRunning;
  }

  get hasExpandedState(): boolean {
    return this.draggable.anchors.hasPositionFor('expanded');
  }

  get hasPartiallyExpandedState(): boolean {
    return this.draggable.anchors.hasPositionFor('partially-expanded');
  }

  /** px from the container top (NaN before the first layout). */
  get offset(): number {
    return this.draggable.offset;
  }

  /** Lays the anchors out for a measured container and sheet (draggableAnchors). */
  updateLayout(layout: SheetLayout, now?: number): void {
    const peek = layout.peekHeight !== undefined;
    const previous = this.draggable.anchors;
    const next = bottomSheetAnchors(layout, this.enabledValues);
    const peekChanged = peek !== this.#peek;
    this.#peek = peek;
    if (!peekChanged && previous.equals(next)) return;
    const target = bottomSheetLayoutTarget(this.targetValue, previous, next, peek);
    this.draggable.updateAnchors(next, target, now);
  }

  /** expand() (L258-260): Expanded on the show spring, if confirmed. */
  expand(specs: SheetSpecs, now: number): boolean {
    if (!this.#confirm('expanded')) return false;
    this.draggable.animateTo('expanded', specs.show, now);
    return true;
  }

  /** partialExpand() (L269-275): PartiallyExpanded on the hide spring, if enabled and confirmed. */
  partialExpand(specs: SheetSpecs, now: number): boolean {
    if (this.skipPartiallyExpanded || !this.#confirm('partially-expanded')) return false;
    this.draggable.animateTo('partially-expanded', specs.hide, now);
    return true;
  }

  /** show() (L283-290): PartiallyExpanded when it has an anchor, else Expanded, on the show spring. */
  show(specs: SheetSpecs, now: number): boolean {
    const target = this.hasPartiallyExpandedState ? 'partially-expanded' : 'expanded';
    if (!this.#confirm(target)) return false;
    this.draggable.animateTo(target, specs.show, now);
    return true;
  }

  /** hide() (L298-304): Hidden on the hide spring, if enabled and confirmed. */
  hide(specs: SheetSpecs, now: number): boolean {
    if (this.skipHiddenState || !this.#confirm('hidden')) return false;
    this.draggable.animateTo('hidden', specs.hide, now);
    return true;
  }

  /** Jumps (snapTo). */
  snapTo(value: SheetValue): void {
    this.draggable.snapTo(value);
  }

  /** Grabs the sheet (a drag past the slop). */
  startDrag(now: number): void {
    this.draggable.startDrag(now);
  }

  /** Moves it by `delta` px (positive downwards) within the anchors; returns the move. */
  dragBy(delta: number): number {
    return this.draggable.dragBy(delta);
  }

  /**
   * Releases a drag with `velocity` (px/s, positive downwards; dampened near Hidden unless the
   * sheet has a peek height, whose StandardBottomSheet flings without it) at `now`: the positional
   * threshold is absolute (`{ _ -> state.positionalThreshold() }`), the velocity threshold 125dp/s
   * (AnchoredDraggableMinFlingVelocity), the settle spring starts at the release velocity. Returns
   * the target.
   */
  release(velocity: number, specs: SheetSpecs, now: number): SheetValue {
    this.draggable.sample(now);
    const v = this.#peek
      ? velocity
      : dampenSheetFlingVelocity(velocity, this.draggable.offset, this.draggable.anchors);
    return this.draggable.fling(
      v,
      {
        spec: specs.settle,
        positionalThreshold: () => this.positionalThreshold,
        velocityThreshold: ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY,
        confirm: (value) => this.#confirm(value),
      },
      now,
    );
  }

  /**
   * The drag handle's click: BottomSheet (L366-371) dismisses an Expanded sheet, expands a
   * PartiallyExpanded one, else shows it; the scaffold's sheet (a peek height) hides an Expanded
   * one when Hidden is enabled, else partially expands it.
   */
  handleAction(): SheetHandleAction {
    switch (this.currentValue) {
      case 'expanded':
        if (!this.#peek) return 'dismiss';
        return this.skipHiddenState ? 'partial-expand' : 'hide';
      case 'partially-expanded':
        return 'expand';
      default:
        return 'show';
    }
  }

  /** Advances to `now` (ms). */
  sample(now: number): SheetSample {
    const s = this.draggable.sample(now);
    const min = this.draggable.anchors.minPosition();
    const overflow = Number.isNaN(min) || s.offset >= min ? 0 : min - s.offset;
    return { offset: s.offset, overflow, running: s.running };
  }
}
