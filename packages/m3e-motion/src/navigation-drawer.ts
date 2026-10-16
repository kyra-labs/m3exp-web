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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/NavigationDrawer.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898,
// compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/AnchoredDraggable.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/FloatDecayAnimationSpec.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// DrawerState (NavigationDrawer.kt L129-297) over its AnchoredDraggableState: the sheet offset in
// px between the Closed anchor (−sheet width) and the Open anchor (0).
// - open() / close() (L180-190, L267-285): animate from the current offset *and velocity*
//   (lastVelocity) on the drawer's springs (open DefaultSpatial, close FastEffects; L354-355).
//   Springs may overshoot the anchors (the sheet is then stretched, DrawerSheet horizontalScaleUp).
// - Drags (anchoredDraggable, AnchoredDraggable.kt L410-428) move the offset by the pointer delta,
//   coerced between the anchors (newOffsetForDelta), interrupting any animation.
// - Release: AnchoredDraggableState.settle(velocity) (L1064-1085; DrawerState sets thresholds and
//   specs through the deprecated constructor, so usePreModifierChangeBehavior is true): the target
//   is computeTarget (L1485-1514; positional threshold 50% of the distance, velocity threshold
//   400dp/s, NavigationDrawer.kt L1339-1341), reached by animateToWithDecay (L1403-1477): an
//   exponential decay (FloatExponentialDecaySpec, friction −4.2, velocity threshold 0.1;
//   FloatDecayAnimationSpec.kt L82-141) clamped at the target when it would reach it, else the
//   snap spec, AnchoredDraggableDefaultAnimationSpec = tween(256ms, FastOutSlowInEasing)
//   (NavigationDrawer.kt L1354; DrawerState captures it at construction, L134-146).
// - The scrim alpha is calculateFraction(closed, open, offset) (L391, L1336-1337).
// Time is injected (ms): m3e-elements drives it from its frame loop and tests step it.

import { SpringAnimatable } from './animatable.js';
import type { Easing } from './cubic-bezier.js';
import type { SpringSpec } from './spring.js';

/** NavigationDrawer.kt `DrawerPositionalThreshold` (L1339): a fraction of the sheet width. */
export const DRAWER_POSITIONAL_THRESHOLD = 0.5;
/** NavigationDrawer.kt `DrawerVelocityThreshold` (L1340-1341), in dp (= CSS px) per second. */
export const DRAWER_VELOCITY_THRESHOLD = 400;
/** NavigationDrawer.kt `AnchoredDraggableDefaultAnimationSpec` (L1354): the settle tween. */
export const DRAWER_SETTLE_MILLIS = 256;
/** FloatDecayAnimationSpec.kt `ExponentialDecayFriction` (L82; frictionMultiplier 1). */
const DECAY_FRICTION = -4.2;
/** FloatExponentialDecaySpec's default `absVelocityThreshold` (L98). */
const DECAY_VELOCITY_THRESHOLD = 0.1;

/** The springs and settle tween of a drawer (null jumps: reduced motion). */
export interface DrawerSpecs {
  readonly open: SpringSpec | null;
  readonly close: SpringSpec | null;
  /** AnchoredDraggableDefaultAnimationSpec; null (0ms) jumps. */
  readonly settle: { readonly duration: number; readonly easing: Easing } | null;
}

/** FloatExponentialDecaySpec.getTargetValue (L132-141). */
export function exponentialDecayTarget(value: number, velocity: number): number {
  if (Math.abs(velocity) <= DECAY_VELOCITY_THRESHOLD) return value;
  const duration =
    (Math.log(Math.abs(DECAY_VELOCITY_THRESHOLD / velocity)) / DECAY_FRICTION) * 1000;
  return (
    value -
    velocity / DECAY_FRICTION +
    (velocity / DECAY_FRICTION) * Math.exp((DECAY_FRICTION * duration) / 1000)
  );
}

/**
 * DraggableAnchors.computeTarget (AnchoredDraggable.kt L1485-1514) for the drawer's two anchors:
 * whether a release at `offset` (px, −width…0) with `velocity` (px/s, positive towards open)
 * settles open. `velocityThreshold` is px/s.
 */
export function drawerSettlesOpen(
  offset: number,
  velocity: number,
  width: number,
  velocityThreshold = DRAWER_VELOCITY_THRESHOLD,
): boolean {
  const closed = -width;
  if (velocity === 0) return Math.abs(offset) <= Math.abs(offset - closed);
  const forward = velocity > 0;
  if (Math.abs(velocity) >= Math.abs(velocityThreshold)) return forward;
  const threshold = Math.abs(width * DRAWER_POSITIONAL_THRESHOLD);
  // Distance travelled from the anchor behind the movement.
  const fromStart = Math.abs((forward ? closed : 0) - offset);
  return fromStart >= threshold ? forward : !forward;
}

type Mode = 'rest' | 'spring' | 'tween' | 'decay' | 'drag';

/** One frame of a {@link DrawerAnimation}. */
export interface DrawerSample {
  /** Sheet offset in px: −width (closed) … 0 (open); above 0 while an open spring overshoots. */
  readonly offset: number;
  /** calculateFraction(closed, open, offset): 0 closed … 1 open (the scrim alpha). */
  readonly fraction: number;
  /** Something is moving (an animation or a drag). */
  readonly running: boolean;
  /** The sheet is visible (fraction > 0): Compose only places it then. */
  readonly visible: boolean;
}

/** DrawerState: the offset, its animations, drags and the settle after a release. */
export class DrawerAnimation {
  #width: number;
  #open: boolean;
  #settled: boolean;
  #mode: Mode = 'rest';
  readonly #spring: SpringAnimatable;
  #offset: number;
  #velocity = 0;
  // Tween / decay state.
  #from = 0;
  #to = 0;
  #v0 = 0;
  #start = 0;
  #duration = 0;
  #easing: Easing = (t) => t;

  /** @param open initial value (at rest); @param width the sheet width in px. */
  constructor(open: boolean, width: number) {
    this.#width = Math.max(0, width);
    this.#open = open;
    this.#settled = open;
    this.#offset = open ? 0 : -this.#width;
    this.#spring = new SpringAnimatable(this.#offset);
  }

  /** DrawerState.targetValue === Open. */
  get isOpen(): boolean {
    return this.#open;
  }

  /** DrawerState.currentValue === Open: the last anchor it settled on. */
  get isSettledOpen(): boolean {
    return this.#settled;
  }

  get isDragging(): boolean {
    return this.#mode === 'drag';
  }

  get width(): number {
    return this.#width;
  }

  /** Units: px per second, positive towards open (AnchoredDraggableState.lastVelocity). */
  get velocity(): number {
    return this.#velocity;
  }

  /** New anchors (the sheet was measured): at rest the offset follows its anchor. */
  setWidth(width: number): void {
    const w = Math.max(0, width);
    if (w === this.#width) return;
    const previous = this.#width;
    this.#width = w;
    if (this.#mode === 'rest') {
      this.#offset = this.#open ? 0 : -w;
      this.#spring.snapTo(this.#offset);
    } else if (this.#mode !== 'drag' && !this.#open && this.#to === -previous) {
      this.#to = -w;
    }
  }

  /** Jumps (DrawerState.snapTo). */
  snapTo(open: boolean): void {
    this.#mode = 'rest';
    this.#open = open;
    this.#settled = open;
    this.#offset = open ? 0 : -this.#width;
    this.#velocity = 0;
    this.#spring.snapTo(this.#offset);
  }

  /** DrawerState.open() / close() at `now` (ms): springs from the current offset and velocity. */
  animateTo(open: boolean, specs: DrawerSpecs, now: number): void {
    this.sample(now);
    if (this.#mode === 'drag') this.#mode = 'rest';
    this.#open = open;
    const target = open ? 0 : -this.#width;
    const spec = open ? specs.open : specs.close;
    if (spec === null || (this.#offset === target && this.#velocity === 0)) {
      this.snapTo(open);
      return;
    }
    // From the current offset and velocity (lastVelocity), whatever drove them.
    const velocity = this.#velocity;
    this.#spring.snapTo(this.#offset);
    this.#spring.animateTo(target, spec, now, velocity);
    if (this.#spring.isRunning) this.#mode = 'spring';
    else this.snapTo(open);
  }

  /** Grabs the sheet (pointer down past the slop): stops any animation where it is. */
  startDrag(now: number): void {
    this.sample(now);
    this.#mode = 'drag';
    this.#velocity = 0;
  }

  /** Moves the offset by `delta` px (positive towards open), coerced between the anchors. */
  dragBy(delta: number): void {
    if (this.#mode !== 'drag') return;
    this.#offset = Math.min(0, Math.max(-this.#width, this.#offset + delta));
  }

  /**
   * Ends a drag with the pointer `velocity` (px/s, positive towards open): picks the target
   * (computeTarget) and settles on it (animateToWithDecay). Returns whether it settles open.
   * `velocityThreshold`: DrawerVelocityThreshold in px/s.
   */
  release(
    velocity: number,
    specs: DrawerSpecs,
    now: number,
    velocityThreshold = DRAWER_VELOCITY_THRESHOLD,
    confirm: (open: boolean) => boolean = () => true,
  ): boolean {
    if (this.#mode !== 'drag') return this.#open;
    const proposed = drawerSettlesOpen(this.#offset, velocity, this.#width, velocityThreshold);
    // confirmValueChange: a veto rolls back to the previous value.
    const open = proposed === this.#settled || confirm(proposed) ? proposed : this.#settled;
    this.#open = open;
    const target = open ? 0 : -this.#width;
    const prev = this.#offset;
    this.#start = now;
    this.#from = prev;
    this.#to = target;
    this.#v0 = velocity;
    this.#velocity = velocity;
    if (prev === target) {
      this.snapTo(open);
      return open;
    }
    const towards = velocity * (target - prev) > 0;
    if (towards) {
      const projected = exponentialDecayTarget(prev, velocity);
      if (velocity > 0 ? projected >= target : projected <= target) {
        this.#mode = 'decay';
        this.#duration =
          (1000 * Math.log(DECAY_VELOCITY_THRESHOLD / Math.abs(velocity))) / DECAY_FRICTION;
        return open;
      }
    }
    if (specs.settle === null || specs.settle.duration <= 0) {
      this.snapTo(open);
      return open;
    }
    this.#mode = 'tween';
    this.#duration = specs.settle.duration;
    this.#easing = specs.settle.easing;
    return open;
  }

  /** Advances to `now` (ms). */
  sample(now: number): DrawerSample {
    switch (this.#mode) {
      case 'spring': {
        this.#offset = this.#spring.sample(now);
        this.#velocity = this.#spring.velocity;
        if (!this.#spring.isRunning) this.#settle();
        break;
      }
      case 'tween': {
        const elapsed = now - this.#start;
        if (elapsed >= this.#duration) {
          this.#settle();
          break;
        }
        const f = (t: number) => {
          const p = Math.min(1, Math.max(0, t / this.#duration));
          return this.#from + (this.#to - this.#from) * this.#easing(p);
        };
        const value = f(elapsed);
        // Finite difference (VectorizedTweenSpec derives the velocity numerically too).
        this.#velocity = (f(elapsed + 1) - value) * 1000;
        this.#offset = value;
        break;
      }
      case 'decay': {
        const t = (now - this.#start) / 1000;
        const value =
          this.#from -
          this.#v0 / DECAY_FRICTION +
          (this.#v0 / DECAY_FRICTION) * Math.exp(DECAY_FRICTION * t);
        const crossed = this.#v0 > 0 ? value >= this.#to : value <= this.#to;
        if (crossed || now - this.#start >= this.#duration) {
          this.#settle();
          break;
        }
        this.#offset = value;
        this.#velocity = this.#v0 * Math.exp(DECAY_FRICTION * t);
        break;
      }
      case 'drag':
        break;
      case 'rest':
        break;
    }
    const w = this.#width;
    const fraction =
      w <= 0 ? (this.#open ? 1 : 0) : Math.min(1, Math.max(0, (this.#offset + w) / w));
    return {
      offset: this.#offset,
      fraction,
      running: this.#mode !== 'rest',
      visible: fraction !== 0,
    };
  }

  #settle(): void {
    this.#mode = 'rest';
    this.#offset = this.#open ? 0 : -this.#width;
    this.#velocity = 0;
    this.#settled = this.#open;
    this.#spring.snapTo(this.#offset);
  }
}
