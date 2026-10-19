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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/pulltorefresh/PullToRefresh.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// Pull to refresh (COMPONENT_SPEC §38), shared by m3e-elements' PullToRefreshLayout and therefore
// by <m3e-pull-to-refresh> and m3e-react's <PullToRefresh>:
// - PullToRefreshPull: PullToRefreshModifierNode's drag bookkeeping (L288–446): the distance
//   pulled, the drag multiplier, the tension past the threshold (calculateVerticalOffset
//   L408–423), what a drag consumes (consumeAvailableOffset L368–379), the release decision
//   (onRelease L382–406) and the state's distanceFraction (L344: verticalOffset / thresholdPx);
// - pullToRefreshArrowValues / pullToRefreshArrowGeometry: the default indicator's arrow (CircularArrowProgressIndicator
//   L788–817, drawCircularIndicator L819–836, PullToRefreshArrowValues L846–864, drawArrow L866–888) and
//   pullToRefreshArrowPaths, its SVG paths;
// - pullToRefreshIndicatorTranslation (IndicatorBox's translationY, L553–555) and
//   pullToRefreshLoadingIndicatorRotation (PullToRefreshDefaults.LoadingIndicator L681–691).
// Float operations are rounded with Math.fround like Kotlin's Float math, so the values match the
// JVM reference bit for bit (`pnpm reference:pull-to-refresh`). Lengths are px at a density
// (1 on the web: a CSS px is a dp); no module-level state (the module is side-effect free).

const f = Math.fround;

/** `DragMultiplier` (L922): the distance pulled counts half. */
export const PULL_TO_REFRESH_DRAG_MULTIPLIER = 0.5;
/** `MinAlpha` / `MaxAlpha` (L913–914): the arrow's alpha below / at the threshold. */
export const PULL_TO_REFRESH_MIN_ALPHA = /* @__PURE__ */ f(0.3);
export const PULL_TO_REFRESH_MAX_ALPHA = 1;

// The arrow's private constants (L890–903), dp.
const MAX_PROGRESS_ARC = /* @__PURE__ */ f(0.8);
const STROKE_WIDTH = 2.5;
const ARC_RADIUS = 5.5;
const ARROW_WIDTH = 10;
const ARROW_HEIGHT = 5;
/** `SpinnerSize` (L897), dp: the arrow's canvas. */
export const PULL_TO_REFRESH_SPINNER_SIZE = 16;

/** Kotlin `Float.coerceIn(0f, 2f)`. */
const coerce02 = (v: number) => Math.min(Math.max(v, 0), 2);

/** `linearTension - linearTension.pow(2) / 4` (L416–418, L852–854), from a progress. */
function tensionPercent(progress: number): number {
  // How far beyond the threshold pull has gone, as a percentage of the threshold.
  const overshootPercent = f(Math.abs(progress) - 1);
  // Limit the overshoot to 200%. Linear between 0 and 200.
  const linearTension = coerce02(overshootPercent);
  // Non-linear tension. Increases with linearTension, but at a decreasing rate.
  return f(linearTension - f(f(linearTension ** 2) / 4));
}

/**
 * `calculateVerticalOffset` (L408–423): the indicator offset for an adjusted distance pulled; past
 * the threshold it follows the tension curve, at most twice the threshold.
 */
export function pullToRefreshVerticalOffset(adjustedDistancePulled: number, thresholdPx: number) {
  // If drag hasn't gone past the threshold, the position is the adjustedDistancePulled.
  if (adjustedDistancePulled <= thresholdPx) return adjustedDistancePulled;
  const progress = f(adjustedDistancePulled / thresholdPx);
  // The additional offset beyond the threshold.
  const extraOffset = f(thresholdPx * tensionPercent(progress));
  return f(thresholdPx + extraOffset);
}

/**
 * PullToRefreshModifierNode's drag bookkeeping. `thresholdPx` is `threshold.roundToPx()`
 * (`PullToRefreshDefaults.PositionalThreshold`, 80dp, by default).
 */
export class PullToRefreshPull {
  /** `distancePulled`: the drag distance the pull took, px. */
  distancePulled = 0;
  /** `verticalOffset`: where the indicator is (the tension applied), px. */
  verticalOffset = 0;

  constructor(public thresholdPx: number) {}

  /** `adjustedDistancePulled` (L305–306). */
  get adjustedDistancePulled(): number {
    return f(this.distancePulled * PULL_TO_REFRESH_DRAG_MULTIPLIER);
  }

  /** `progress` (L311–312). */
  get progress(): number {
    return f(this.adjustedDistancePulled / this.thresholdPx);
  }

  /** The state's `distanceFraction` the node snaps to after a drag (L344). */
  get distanceFraction(): number {
    return f(this.verticalOffset / this.thresholdPx);
  }

  /**
   * `consumeAvailableOffset` (L368–379): `available` px of drag (positive down) after the content
   * took its part; returns what the pull consumed. Nothing while refreshing.
   */
  consume(available: number, isRefreshing: boolean): number {
    if (isRefreshing) return 0;
    const newOffset = Math.max(f(this.distancePulled + f(available)), 0);
    const dragConsumed = f(newOffset - this.distancePulled);
    this.distancePulled = newOffset;
    this.verticalOffset = pullToRefreshVerticalOffset(
      this.adjustedDistancePulled,
      this.thresholdPx,
    );
    return dragConsumed;
  }

  /**
   * `onRelease` (L382–406) up to its animation: whether the release triggers `onRefresh`
   * (the adjusted distance past the threshold). Nothing while refreshing. The caller then animates
   * to hidden (and resets with {@link reset}), or to the threshold once refreshing.
   */
  release(isRefreshing: boolean): boolean {
    if (isRefreshing) return false;
    return this.adjustedDistancePulled > this.thresholdPx;
  }

  /** `animateToHidden`'s / `animateToThreshold`'s `finally` (L432–443): `distancePulled` and
   * `verticalOffset` at 0, or at the threshold while refreshing. */
  reset(isRefreshing: boolean): void {
    this.distancePulled = isRefreshing ? this.thresholdPx : 0;
    this.verticalOffset = this.distancePulled;
  }
}

/** `PullToRefreshArrowValues` (L838–864): the arrow's rotation (degrees as Compose draws it), arc and scale. */
export interface PullToRefreshArrowValues {
  /** A fraction of a turn that Compose passes to `rotate(degrees =)` as is (L810). */
  readonly rotation: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly scale: number;
}

/** `PullToRefreshArrowValues(progress)` (L846–864), from the state's distanceFraction. */
export function pullToRefreshArrowValues(progress: number): PullToRefreshArrowValues {
  // Discard first 40% of progress. Scale remaining progress to full range between 0 and 100%.
  const adjustedPercent = f(f(Math.max(f(Math.min(1, progress) - f(0.4)), 0) * 5) / 3);
  const tension = tensionPercent(progress);
  // Calculations based on SwipeRefreshLayout specification.
  const endTrim = f(adjustedPercent * MAX_PROGRESS_ARC);
  const rotation = f(f(f(f(-0.25) + f(f(0.4) * adjustedPercent)) + tension) * f(0.5));
  const startAngle = f(rotation * 360);
  const endAngle = f(f(rotation + endTrim) * 360);
  const scale = Math.min(1, adjustedPercent);
  return { rotation, startAngle, endAngle, scale };
}

/**
 * What CircularArrowProgressIndicator draws on its `SpinnerSize` canvas (L808–815, L819–888), in
 * px: the whole drawing rotated by `rotation` degrees about the canvas center; the arc
 * (`drawArc`, butt caps) on `arc`'s bounds from `startAngle` (clockwise from 3 o'clock) over
 * `sweepAngle`; the arrow's open triangle (`points`, x/y pairs, a mitered stroke) rotated by a
 * further `arrowRotation` degrees about the center.
 */
export interface PullToRefreshArrowGeometry {
  readonly size: number;
  readonly strokeWidth: number;
  readonly rotation: number;
  readonly arc: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly startAngle: number;
    readonly sweepAngle: number;
  };
  readonly points: readonly [number, number, number, number, number, number];
  readonly arrowRotation: number;
}

/** The arrow for a distanceFraction at `density` px per dp (1 on the web). */
export function pullToRefreshArrowGeometry(
  progress: number,
  density = 1,
): PullToRefreshArrowGeometry {
  const values = pullToRefreshArrowValues(progress);
  const px = (dp: number) => f(dp * density);
  // Modifier.size(SpinnerSize): whole pixels.
  const size = Math.round(px(PULL_TO_REFRESH_SPINNER_SIZE));
  const center = f(size / 2);
  const strokeWidth = px(STROKE_WIDTH);
  const arcRadius = f(px(ARC_RADIUS) + f(strokeWidth / 2));
  // Rect(center = size.center, radius = arcRadius)
  const left = f(center - arcRadius);
  const top = f(center - arcRadius);
  const right = f(center + arcRadius);
  const bottom = f(center + arcRadius);
  const width = f(right - left);
  const height = f(bottom - top);
  // drawArrow: the triangle, translated next to the arc's end.
  const arrowWidth = f(px(ARROW_WIDTH) * values.scale);
  const tipX = f(arrowWidth / 2);
  const tipY = f(px(ARROW_HEIGHT) * values.scale);
  const radius = f(Math.min(width, height) / 2);
  const inset = f(f(px(ARROW_WIDTH) * values.scale) / 2);
  const centerX = f(left + f(width / 2));
  const centerY = f(top + f(height / 2));
  const dx = f(f(radius + centerX) - inset);
  const dy = f(centerY - strokeWidth);
  return {
    size,
    strokeWidth,
    rotation: values.rotation,
    arc: {
      left,
      top,
      width,
      height,
      startAngle: values.startAngle,
      sweepAngle: f(values.endAngle - values.startAngle),
    },
    points: [f(0 + dx), f(0 + dy), f(tipX + dx), f(tipY + dy), f(arrowWidth + dx), f(0 + dy)],
    arrowRotation: f(values.endAngle - strokeWidth),
  };
}

const num = (v: number) => String(Math.round(v * 1e4) / 1e4);

/**
 * SVG path data for an {@link PullToRefreshArrowGeometry} in a `0 0 size size` viewBox: the arc and the arrow,
 * the rotations applied. Empty strings where Compose draws nothing (a zero sweep, a zero scale).
 */
export function pullToRefreshArrowPaths(g: PullToRefreshArrowGeometry): {
  arc: string;
  arrow: string;
} {
  const c = g.size / 2;
  const rotate = (x: number, y: number, degrees: number): [number, number] => {
    const a = (degrees * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return [c + (x - c) * cos - (y - c) * sin, c + (x - c) * sin + (y - c) * cos];
  };
  let arc = '';
  const { left, top, width, height, startAngle, sweepAngle } = g.arc;
  if (sweepAngle > 0) {
    const rx = width / 2;
    const ry = height / 2;
    const cx = left + rx;
    const cy = top + ry;
    const at = (degrees: number) => {
      const a = (degrees * Math.PI) / 180;
      return rotate(cx + rx * Math.cos(a), cy + ry * Math.sin(a), g.rotation);
    };
    const [x0, y0] = at(startAngle);
    const [x1, y1] = at(startAngle + sweepAngle);
    const large = sweepAngle > 180 ? 1 : 0;
    arc = `M${num(x0)} ${num(y0)}A${num(rx)} ${num(ry)} 0 ${String(large)} 1 ${num(x1)} ${num(y1)}`;
  }
  let arrow = '';
  const [ax, ay, bx, by, cx2, cy2] = g.points;
  if (ax !== cx2 || ay !== by) {
    const turn = g.rotation + g.arrowRotation;
    const [x0, y0] = rotate(ax, ay, turn);
    const [x1, y1] = rotate(bx, by, turn);
    const [x2, y2] = rotate(cx2, cy2, turn);
    arrow = `M${num(x0)} ${num(y0)}L${num(x1)} ${num(y1)}L${num(x2)} ${num(y2)}`;
  }
  return { arc, arrow };
}

/**
 * IndicatorBox's `translationY` (L553–555): the box moves down from just above the container top
 * (its own height above) by `distanceFraction × maxDistance.roundToPx()`.
 */
export function pullToRefreshIndicatorTranslation(
  distanceFraction: number,
  maxDistancePx: number,
  height: number,
): number {
  return f(f(distanceFraction * Math.round(maxDistancePx)) - height);
}

/**
 * PullToRefreshDefaults.LoadingIndicator's extra rotation past the threshold (L681–691):
 * `-(progress - 1) × 180` degrees once the distanceFraction passes 1, else 0.
 */
export function pullToRefreshLoadingIndicatorRotation(distanceFraction: number): number {
  return distanceFraction > 1 ? f(-f(distanceFraction - 1) * 180) : 0;
}
