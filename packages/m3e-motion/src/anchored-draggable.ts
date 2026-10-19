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
// Ported to TypeScript by Kyra Labs from compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/AnchoredDraggable.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/snapping/SnapFlingBehavior.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The anchored-draggable model shared by the drag-to-settle components (the navigation drawer's
// target selection, the bottom sheets, and later the side sheets / pull to refresh):
// - DraggableAnchors (DefaultDraggableAnchors, AnchoredDraggable.kt L1603-1713): N keyed
//   positions; closestAnchor with and without a search direction (ties go to the later anchor).
// - computeTarget (L1485-1514): the anchor a release settles on, from the offset, the velocity, a
//   positional threshold (a function of the distance between the two anchors around the offset)
//   and a velocity threshold.
// - AnchoredDraggableAnimation: AnchoredDraggableState (L781-1300) over that model, time injected
//   (ms) so m3e-elements drives it from its frame loop and tests step it:
//   * drags move the offset by the pointer delta coerced between the outer anchors
//     (newOffsetForDelta L1236-1240), interrupting any animation;
//   * animateTo (L1372-1386 and the private animateTo L1339-1360) runs a spring from the current
//     offset and the last velocity (lastVelocity), and may overshoot the anchors;
//   * fling is the Modifier.anchoredDraggable release path (fling L457-476 with
//     anchoredDraggableFlingBehavior L1747-1790): snapFlingBehavior with no approach (the
//     calculateApproachOffset of 0), so the snap spring starts at the release velocity
//     (SnapFlingBehavior.fling L108-162) and stops where it first reaches the target
//     (animateWithTarget L340-377: the value is coerced to the target and the animation cancelled)
//     or where the anchors' bounds stop it (scrollBy consumes less than the delta);
//   * updateAnchors (L1014-1027) snaps to the new target at rest, or restarts the running
//     animation towards it.

import { SpringAnimatable } from './animatable.js';
import type { SpringSpec } from './spring.js';

/**
 * AnchoredDraggable.kt `AnchoredDraggableMinFlingVelocity` (L1716-1717), in dp (= CSS px) per
 * second: the velocity threshold of `anchoredDraggableFlingBehavior`.
 */
export const ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY = 125;

/** `AnchoredDraggableDefaults.PositionalThreshold` (L1526): half the distance. */
export const defaultPositionalThreshold = (distance: number): number => distance / 2;

/** DefaultDraggableAnchors: keys at positions (px). Several keys may share a position. */
export class DraggableAnchors<T> {
  readonly #keys: T[];
  readonly #positions: number[];

  constructor(entries: Iterable<readonly [T, number]>) {
    this.#keys = [];
    this.#positions = [];
    for (const [key, position] of entries) {
      this.#keys.push(key);
      this.#positions.push(position);
    }
  }

  get size(): number {
    return this.#keys.length;
  }

  /** The keys in declaration order. */
  get keys(): readonly T[] {
    return this.#keys;
  }

  /** The anchor's position, or NaN when it has none. */
  positionOf(key: T): number {
    const i = this.#keys.indexOf(key);
    return i < 0 ? Number.NaN : (this.#positions[i] ?? Number.NaN);
  }

  hasPositionFor(key: T): boolean {
    return this.#keys.includes(key);
  }

  /**
   * The anchor closest to `position`; with `searchUpwards`, only anchors at or above it (true) or
   * at or below it (false). Ties go to the later anchor (`distance <= minDistance`).
   */
  closestAnchor(position: number, searchUpwards?: boolean): T | undefined {
    let min = -1;
    let minDistance = Number.POSITIVE_INFINITY;
    this.#positions.forEach((anchor, i) => {
      let distance: number;
      if (searchUpwards === undefined) {
        distance = Math.abs(position - anchor);
      } else {
        const delta = searchUpwards ? anchor - position : position - anchor;
        distance = delta < 0 ? Number.POSITIVE_INFINITY : delta;
      }
      if (distance <= minDistance) {
        min = i;
        minDistance = distance;
      }
    });
    return min < 0 ? undefined : this.#keys[min];
  }

  /** The smallest position (NaN without anchors). */
  minPosition(): number {
    return this.#positions.length === 0 ? Number.NaN : Math.min(...this.#positions);
  }

  /** The largest position (NaN without anchors). */
  maxPosition(): number {
    return this.#positions.length === 0 ? Number.NaN : Math.max(...this.#positions);
  }

  /** Same keys at the same positions, in the same order. */
  equals(other: DraggableAnchors<T>): boolean {
    return (
      other.size === this.size &&
      this.#keys.every((k, i) => other.#keys[i] === k && other.#positions[i] === this.#positions[i])
    );
  }
}

/**
 * `computeTarget` (AnchoredDraggable.kt L1485-1514): the anchor a release at `offset` (px) with
 * `velocity` (px/s, positive towards larger offsets) settles on. Without velocity, the closest
 * anchor; at or above `velocityThreshold` (px/s), the closest anchor in the direction of the
 * velocity; slower, the next anchor in that direction once the offset is `positionalThreshold(
 * distance)` px past the anchor behind it, else that anchor.
 */
export function computeTarget<T>(
  anchors: DraggableAnchors<T>,
  offset: number,
  velocity: number,
  positionalThreshold: (distance: number) => number,
  velocityThreshold: number,
): T {
  if (Number.isNaN(offset)) throw new Error('computeTarget: the offset must not be NaN');
  const moving = Math.abs(velocity) > 0;
  const forward = moving && velocity > 0;
  const pick = (key: T | undefined): T => {
    if (key === undefined) throw new Error('computeTarget: no anchors');
    return key;
  };
  if (!moving) return pick(anchors.closestAnchor(offset));
  if (Math.abs(velocity) >= Math.abs(velocityThreshold)) {
    return pick(anchors.closestAnchor(offset, forward));
  }
  const left = pick(anchors.closestAnchor(offset, false));
  const leftPosition = anchors.positionOf(left);
  const right = pick(anchors.closestAnchor(offset, true));
  const rightPosition = anchors.positionOf(right);
  const distance = Math.abs(leftPosition - rightPosition);
  const threshold = Math.abs(positionalThreshold(distance));
  const fromStart = Math.abs((forward ? leftPosition : rightPosition) - offset);
  if (fromStart >= threshold) return forward ? right : left;
  return forward ? left : right;
}

/** SnapFlingBehavior's `coerceToTarget`: no further than `target` in its own direction. */
const coerceToTarget = (value: number, target: number): number =>
  target === 0 ? 0 : target > 0 ? Math.min(value, target) : Math.max(value, target);

/** The release's thresholds (Modifier.anchoredDraggable's fling behavior). */
export interface AnchoredFlingOptions<T> {
  /** The snap spring (null jumps: reduced motion). */
  readonly spec: SpringSpec | null;
  /** px from the anchor behind, as a function of the distance between the two anchors. */
  readonly positionalThreshold?: (distance: number) => number;
  /** px/s; default {@link ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY}. */
  readonly velocityThreshold?: number;
  /** confirmValueChange: false rolls back to the settled value. */
  readonly confirm?: (value: T) => boolean;
}

/** One frame of an {@link AnchoredDraggableAnimation}. */
export interface AnchoredDraggableSample {
  /** px (NaN before the anchors give it a position). */
  readonly offset: number;
  /** An animation or a drag is in progress. */
  readonly running: boolean;
}

type Mode = 'rest' | 'spring' | 'fling' | 'drag';

/**
 * AnchoredDraggableState: an offset between keyed anchors, its spring animations, drags and the
 * snap fling after a release.
 */
export class AnchoredDraggableAnimation<T> {
  #anchors: DraggableAnchors<T>;
  #offset = Number.NaN;
  #velocity = 0;
  #settled: T;
  #target: T;
  #mode: Mode = 'rest';
  readonly #spring = new SpringAnimatable(0);
  #spec: SpringSpec | null = null;
  /** Fling: the target offset relative to where the fling started (animateWithTarget). */
  #from = 0;

  constructor(initialValue: T, anchors: DraggableAnchors<T> = new DraggableAnchors<T>([])) {
    this.#settled = initialValue;
    this.#target = initialValue;
    this.#anchors = anchors;
    this.#snapOffset(initialValue);
  }

  get anchors(): DraggableAnchors<T> {
    return this.#anchors;
  }

  /** px; NaN until an anchor gives the value a position. */
  get offset(): number {
    return this.#offset;
  }

  /** lastVelocity, px/s (0 at rest). */
  get velocity(): number {
    return this.#velocity;
  }

  /** settledValue: the last value it settled on. */
  get settledValue(): T {
    return this.#settled;
  }

  /**
   * targetValue: the animation's or fling's target; during a drag the anchor closest to the
   * offset; at rest the settled value.
   */
  get targetValue(): T {
    if (this.#mode === 'drag' && !Number.isNaN(this.#offset)) {
      return this.#anchors.closestAnchor(this.#offset) ?? this.#settled;
    }
    return this.#mode === 'rest' ? this.#settled : this.#target;
  }

  get isAnimationRunning(): boolean {
    return this.#mode === 'spring' || this.#mode === 'fling';
  }

  get isDragging(): boolean {
    return this.#mode === 'drag';
  }

  /**
   * updateAnchors: at rest the offset snaps to `newTarget` (default: the anchor closest to the
   * offset, else the target); a running animation restarts towards it from where it is.
   */
  updateAnchors(anchors: DraggableAnchors<T>, newTarget?: T, now?: number): void {
    if (this.#anchors.equals(anchors)) return;
    if (now !== undefined) this.sample(now);
    const target =
      newTarget ??
      (Number.isNaN(this.#offset)
        ? this.targetValue
        : (anchors.closestAnchor(this.#offset) ?? this.targetValue));
    this.#anchors = anchors;
    if (this.#mode === 'rest') {
      this.snapTo(target);
    } else if (this.#mode === 'drag') {
      // The drag continues within the new bounds.
      this.#target = target;
    } else if (now !== undefined && anchors.hasPositionFor(target)) {
      // restartable: the animation re-runs towards the latest target from the current offset.
      const spec = this.#spec;
      if (this.#mode === 'fling') {
        this.#flingTo(target, this.#velocity, spec, now);
      } else {
        this.#mode = 'rest';
        this.animateTo(target, spec, now);
      }
    } else {
      this.snapTo(target);
    }
  }

  /** snapTo: jumps (a value without an anchor becomes the settled value, the offset stays). */
  snapTo(value: T): void {
    this.#mode = 'rest';
    this.#velocity = 0;
    this.#settled = value;
    this.#target = value;
    this.#snapOffset(value);
  }

  /**
   * animateTo at `now` (ms): a spring from the current offset and lastVelocity to `value`'s
   * anchor, which may overshoot it; a null spec jumps. A value without an anchor becomes the
   * settled value at once (the offset stays). Returns whether something animates.
   */
  animateTo(value: T, spec: SpringSpec | null, now: number): boolean {
    this.sample(now);
    const position = this.#anchors.positionOf(value);
    if (Number.isNaN(position) || Number.isNaN(this.#offset) || spec === null) {
      this.snapTo(value);
      return false;
    }
    if (this.#offset === position) {
      this.snapTo(value);
      return false;
    }
    this.#target = value;
    this.#spec = spec;
    this.#spring.snapTo(this.#offset);
    this.#spring.animateTo(position, spec, now, this.#velocity);
    if (!this.#spring.isRunning) {
      this.snapTo(value);
      return false;
    }
    this.#mode = 'spring';
    return true;
  }

  /** Grabs it (a drag starts): any animation stops where it is. */
  startDrag(now: number): void {
    this.sample(now);
    this.#mode = 'drag';
    this.#velocity = 0;
  }

  /** newOffsetForDelta: moves by `delta` px coerced between the outer anchors; returns the move. */
  dragBy(delta: number): number {
    if (this.#mode !== 'drag' || Number.isNaN(this.#offset) || this.#anchors.size === 0) return 0;
    const before = this.#offset;
    this.#offset = Math.min(
      this.#anchors.maxPosition(),
      Math.max(this.#anchors.minPosition(), before + delta),
    );
    return this.#offset - before;
  }

  /**
   * Releases a drag with `velocity` (px/s, positive towards larger offsets) at `now`: the target
   * is computeTarget (vetoed back to the settled value by `confirm`), reached by the snap spring
   * started at that velocity. Returns the target.
   */
  fling(velocity: number, options: AnchoredFlingOptions<T>, now: number): T {
    this.sample(now);
    if (this.#anchors.size === 0 || Number.isNaN(this.#offset)) {
      this.#mode = 'rest';
      return this.#settled;
    }
    const proposed = computeTarget(
      this.#anchors,
      this.#offset,
      velocity,
      options.positionalThreshold ?? defaultPositionalThreshold,
      options.velocityThreshold ?? ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY,
    );
    const target = (options.confirm ?? (() => true))(proposed) ? proposed : this.#settled;
    this.#flingTo(target, velocity, options.spec, now);
    return target;
  }

  #flingTo(target: T, velocity: number, spec: SpringSpec | null, now: number): void {
    this.#target = target;
    this.#spec = spec;
    const position = this.#anchors.positionOf(target);
    this.#velocity = velocity;
    if (Number.isNaN(position) || this.#offset === position || spec === null) {
      this.#endFling(Number.isNaN(position) ? this.#offset : position);
      return;
    }
    // animateWithTarget runs the spring from 0 to the relative target with the fling velocity.
    this.#from = this.#offset;
    this.#spring.snapTo(0);
    this.#spring.animateTo(position - this.#offset, spec, now, velocity);
    if (!this.#spring.isRunning) {
      this.#endFling(position);
      return;
    }
    this.#mode = 'fling';
  }

  /** The end of anchoredDrag: the offset where the fling stopped; settled if at an anchor. */
  #endFling(offset: number): void {
    this.#mode = 'rest';
    this.#offset = offset;
    this.#velocity = 0;
    const closest = this.#anchors.closestAnchor(offset);
    if (closest !== undefined && Math.abs(offset - this.#anchors.positionOf(closest)) < 0.5) {
      this.#settled = closest;
      this.#target = closest;
      this.#offset = this.#anchors.positionOf(closest);
    } else {
      this.#target = this.#settled;
    }
  }

  /** Advances to `now` (ms). */
  sample(now: number): AnchoredDraggableSample {
    if (this.#mode === 'spring') {
      this.#offset = this.#spring.sample(now);
      this.#velocity = this.#spring.velocity;
      if (!this.#spring.isRunning) this.snapTo(this.#target);
    } else if (this.#mode === 'fling') {
      const relative = this.#spring.target;
      const value = this.#spring.sample(now);
      const real = coerceToTarget(value, relative);
      const min = this.#anchors.minPosition();
      const max = this.#anchors.maxPosition();
      const next = this.#from + real;
      const bounded = Math.min(max, Math.max(min, next));
      this.#offset = bounded;
      this.#velocity = this.#spring.velocity;
      // Stop at the target (the value coerced to it) or where the bounds stop the movement.
      if (!this.#spring.isRunning || real !== value || Math.abs(next - bounded) > 0.5) {
        this.#endFling(bounded);
      }
    }
    return { offset: this.#offset, running: this.#mode !== 'rest' };
  }

  #snapOffset(value: T): void {
    const position = this.#anchors.positionOf(value);
    if (!Number.isNaN(position)) this.#offset = position;
    this.#spring.snapTo(Number.isNaN(this.#offset) ? 0 : this.#offset);
  }
}
