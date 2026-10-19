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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/carousel/Strategy.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/carousel/KeylineSnapPosition.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The carousel's Strategy: the default keylines plus the steps that shift the focal range to the
// start and end of the container (and into the content padding) as the scroll reaches either end,
// and the keyline-aligned snap position of every item. Float32-faithful (Math.fround), like
// carousel-keylines.ts.
import {
  type Keyline,
  KeylineList,
  at,
  emptyKeylineList,
  keylineListOf,
  lerpFloat,
  lerpKeylineList,
} from './carousel-keylines.js';

const f = Math.fround;

/** Kotlin `Float.roundToInt()` (Math.round: halves toward +∞). */
const roundToInt = (v: number) => Math.round(v);

/** Strategy.kt `lerp(outputMin, outputMax, inputMin, inputMax, value)` (L671–685). */
export function lerpRange(
  outputMin: number,
  outputMax: number,
  inputMin: number,
  inputMax: number,
  value: number,
): number {
  if (value <= inputMin) return outputMin;
  else if (value >= inputMax) return outputMax;
  return lerpFloat(outputMin, outputMax, f(f(value - inputMin) / f(inputMax - inputMin)));
}

/**
 * Supplies the keylines for a scroll offset (Strategy.kt L46–333). Build it with
 * {@link Strategy.create}.
 */
export class Strategy {
  readonly defaultKeylines: KeylineList;
  readonly startKeylineSteps: readonly KeylineList[];
  readonly endKeylineSteps: readonly KeylineList[];
  readonly availableSpace: number;
  readonly itemSpacing: number;
  readonly beforeContentPadding: number;
  readonly afterContentPadding: number;
  readonly minItemSize: number;
  readonly maxItemSize: number;
  /** The scroll distance that moves through every start step. */
  readonly startShiftDistance: number;
  /** The scroll distance that moves through every end step. */
  readonly endShiftDistance: number;
  readonly startShiftPoints: readonly number[];
  readonly endShiftPoints: readonly number[];
  /** True when the keylines are a valid arrangement for a non-empty container. */
  readonly isValid: boolean;

  #lastStartAndEndKeylineListSteps: KeylineList[] | null = null;
  #cachedScrollOffset = -1;
  #cachedMaxScrollOffset = -1;
  #cachedRoundToNearestStep = false;
  #cachedKeylineList: KeylineList | null = null;

  static readonly Empty = new Strategy(emptyKeylineList(), [], [], 0, 0, 0, 0);

  private constructor(
    defaultKeylines: KeylineList,
    startKeylineSteps: readonly KeylineList[],
    endKeylineSteps: readonly KeylineList[],
    availableSpace: number,
    itemSpacing: number,
    beforeContentPadding: number,
    afterContentPadding: number,
  ) {
    this.defaultKeylines = defaultKeylines;
    this.startKeylineSteps = startKeylineSteps;
    this.endKeylineSteps = endKeylineSteps;
    this.availableSpace = availableSpace;
    this.itemSpacing = itemSpacing;
    this.beforeContentPadding = beforeContentPadding;
    this.afterContentPadding = afterContentPadding;

    let min = defaultKeylines.minSize;
    let max = defaultKeylines.maxSize;
    for (const step of [...startKeylineSteps, ...endKeylineSteps]) {
      if (step.minSize < min) min = step.minSize;
      if (step.maxSize > max) max = step.maxSize;
    }
    this.minItemSize = min;
    this.maxItemSize = max;

    this.startShiftDistance = getStartShiftDistance(startKeylineSteps, beforeContentPadding);
    this.endShiftDistance = getEndShiftDistance(endKeylineSteps, afterContentPadding);
    this.startShiftPoints = getStepInterpolationPoints(
      this.startShiftDistance,
      startKeylineSteps,
      true,
    );
    this.endShiftPoints = getStepInterpolationPoints(this.endShiftDistance, endKeylineSteps, false);
    this.isValid =
      defaultKeylines.isNotEmpty() && availableSpace !== 0 && this.itemMainAxisSize !== 0;
  }

  /**
   * A strategy for `defaultKeylines` (a left-to-right arrangement) in a container of
   * `availableSpace` (L98–119).
   */
  static create(
    defaultKeylines: KeylineList,
    availableSpace: number,
    itemSpacing: number,
    beforeContentPadding: number,
    afterContentPadding: number,
  ): Strategy {
    availableSpace = f(availableSpace);
    itemSpacing = f(itemSpacing);
    beforeContentPadding = f(beforeContentPadding);
    afterContentPadding = f(afterContentPadding);
    return new Strategy(
      defaultKeylines,
      getStartKeylineSteps(defaultKeylines, availableSpace, itemSpacing, beforeContentPadding),
      getEndKeylineSteps(defaultKeylines, availableSpace, itemSpacing, afterContentPadding),
      availableSpace,
      itemSpacing,
      beforeContentPadding,
      afterContentPadding,
    );
  }

  /** The size of focal (fully unmasked) items. */
  get itemMainAxisSize(): number {
    return this.defaultKeylines.firstFocal.size;
  }

  /**
   * The keylines for `scrollOffset` (L169–192), cached for the last arguments.
   * `roundToNearestStep` returns a whole shift step instead of an interpolation.
   */
  getKeylineListForScrollOffset(
    scrollOffset: number,
    maxScrollOffset: number,
    roundToNearestStep = false,
  ): KeylineList {
    scrollOffset = f(scrollOffset);
    maxScrollOffset = f(maxScrollOffset);
    if (
      scrollOffset === this.#cachedScrollOffset &&
      maxScrollOffset === this.#cachedMaxScrollOffset &&
      roundToNearestStep === this.#cachedRoundToNearestStep &&
      this.#cachedKeylineList !== null
    ) {
      return this.#cachedKeylineList;
    }
    const result = this.#internal(scrollOffset, maxScrollOffset, roundToNearestStep);
    this.#cachedScrollOffset = scrollOffset;
    this.#cachedMaxScrollOffset = maxScrollOffset;
    this.#cachedRoundToNearestStep = roundToNearestStep;
    this.#cachedKeylineList = result;
    return result;
  }

  #internal(
    scrollOffset: number,
    maxScrollOffset: number,
    roundToNearestStep: boolean,
  ): KeylineList {
    const positiveScrollOffset = Math.max(0, scrollOffset);
    const startShiftOffset = this.startShiftDistance;
    const endShiftOffset = Math.max(0, f(maxScrollOffset - this.endShiftDistance));

    if (positiveScrollOffset >= startShiftOffset && positiveScrollOffset <= endShiftOffset) {
      return this.defaultKeylines;
    }

    let interpolation = lerpRange(1, 0, 0, startShiftOffset, positiveScrollOffset);
    let shiftPoints = this.startShiftPoints;
    let steps = this.startKeylineSteps;

    if (positiveScrollOffset > endShiftOffset) {
      interpolation = lerpRange(0, 1, endShiftOffset, maxScrollOffset, positiveScrollOffset);
      shiftPoints = this.endShiftPoints;
      steps = this.endKeylineSteps;

      if (
        endShiftOffset < f(0.01) &&
        this.startKeylineSteps.length === 2 &&
        this.endKeylineSteps.length === 2
      ) {
        this.#lastStartAndEndKeylineListSteps ??= [
          at(this.startKeylineSteps, this.startKeylineSteps.length - 1),
          at(this.endKeylineSteps, this.endKeylineSteps.length - 1),
        ];
        steps = this.#lastStartAndEndKeylineListSteps;
      }
    }

    let fromStepIndex = 0;
    let toStepIndex = 0;
    let steppedInterpolation = 0;
    let lowerBounds = at(shiftPoints, 0);
    for (let i = 1; i < steps.length; i++) {
      const upperBounds = at(shiftPoints, i);
      if (interpolation <= upperBounds) {
        fromStepIndex = i - 1;
        toStepIndex = i;
        steppedInterpolation = lerpRange(0, 1, lowerBounds, upperBounds, interpolation);
        break;
      }
      lowerBounds = upperBounds;
    }

    if (roundToNearestStep) {
      const roundedStepIndex = roundToInt(steppedInterpolation) === 0 ? fromStepIndex : toStepIndex;
      return at(steps, roundedStepIndex);
    }
    return lerpKeylineList(at(steps, fromStepIndex), at(steps, toStepIndex), steppedInterpolation);
  }

  /** Structural equality (L280–302). */
  equals(other: Strategy): boolean {
    if (this === other) return true;
    if (!this.isValid && !other.isValid) return true;
    if (this.isValid !== other.isValid) return false;
    return (
      this.availableSpace === other.availableSpace &&
      this.itemSpacing === other.itemSpacing &&
      this.beforeContentPadding === other.beforeContentPadding &&
      this.afterContentPadding === other.afterContentPadding &&
      this.itemMainAxisSize === other.itemMainAxisSize &&
      this.startShiftDistance === other.startShiftDistance &&
      this.endShiftDistance === other.endShiftDistance &&
      this.startShiftPoints.length === other.startShiftPoints.length &&
      this.startShiftPoints.every((p, i) => Object.is(p, other.startShiftPoints[i])) &&
      this.endShiftPoints.length === other.endShiftPoints.length &&
      this.endShiftPoints.every((p, i) => Object.is(p, other.endShiftPoints[i])) &&
      this.defaultKeylines.equals(other.defaultKeylines)
    );
  }
}

const lastOf = <T>(list: readonly T[]): T => at(list, list.length - 1);

/** L338–348. */
function getStartShiftDistance(
  startKeylineSteps: readonly KeylineList[],
  beforeContentPadding: number,
): number {
  if (startKeylineSteps.length === 0) return 0;
  return Math.max(
    f(
      lastOf(startKeylineSteps).first().unadjustedOffset -
        at(startKeylineSteps, 0).first().unadjustedOffset,
    ),
    beforeContentPadding,
  );
}

/** L351–361. */
function getEndShiftDistance(
  endKeylineSteps: readonly KeylineList[],
  afterContentPadding: number,
): number {
  if (endKeylineSteps.length === 0) return 0;
  return Math.max(
    f(
      at(endKeylineSteps, 0).last().unadjustedOffset -
        lastOf(endKeylineSteps).last().unadjustedOffset,
    ),
    afterContentPadding,
  );
}

/**
 * Steps that move the focal range to the start of the container, one keyline at a time; the first
 * is the default list (L377–458).
 */
function getStartKeylineSteps(
  defaultKeylines: KeylineList,
  carouselMainAxisSize: number,
  itemSpacing: number,
  beforeContentPadding: number,
): KeylineList[] {
  if (defaultKeylines.isEmpty()) return [];

  const steps: KeylineList[] = [defaultKeylines];

  if (defaultKeylines.isFirstFocalItemAtStartOfContainer()) {
    if (beforeContentPadding !== 0) {
      steps.push(
        createShiftedKeylineListForContentPadding(
          defaultKeylines,
          carouselMainAxisSize,
          itemSpacing,
          beforeContentPadding,
          defaultKeylines.firstFocal,
          defaultKeylines.firstFocalIndex,
        ),
      );
    }
    return steps;
  }

  const startIndex = defaultKeylines.firstNonAnchorIndex;
  const endIndex = defaultKeylines.firstFocalIndex;
  const numberOfSteps = endIndex - startIndex;

  if (numberOfSteps <= 0 && defaultKeylines.firstFocal.cutoff > 0) {
    steps.push(
      moveKeylineAndCreateShiftedKeylineList(
        defaultKeylines,
        0,
        0,
        carouselMainAxisSize,
        itemSpacing,
      ),
    );
    return steps;
  }

  for (let i = 0; i < numberOfSteps; i++) {
    const prevStep = lastOf(steps);
    const originalItemIndex = startIndex + i;
    let dstIndex = defaultKeylines.lastIndex;
    if (originalItemIndex > 0) {
      const originalNeighborBeforeSize = defaultKeylines.get(originalItemIndex - 1).size;
      dstIndex = prevStep.firstIndexAfterFocalRangeWithSize(originalNeighborBeforeSize) - 1;
    }
    steps.push(
      moveKeylineAndCreateShiftedKeylineList(
        prevStep,
        defaultKeylines.firstNonAnchorIndex,
        dstIndex,
        carouselMainAxisSize,
        itemSpacing,
      ),
    );
  }

  if (beforeContentPadding !== 0) {
    const last = lastOf(steps);
    steps[steps.length - 1] = createShiftedKeylineListForContentPadding(
      last,
      carouselMainAxisSize,
      itemSpacing,
      beforeContentPadding,
      last.firstFocal,
      last.firstFocalIndex,
    );
  }
  return steps;
}

/**
 * Steps that move the focal range to the end of the container, one keyline at a time; the first is
 * the default list (L474–555).
 */
function getEndKeylineSteps(
  defaultKeylines: KeylineList,
  carouselMainAxisSize: number,
  itemSpacing: number,
  afterContentPadding: number,
): KeylineList[] {
  if (defaultKeylines.isEmpty()) return [];
  const steps: KeylineList[] = [defaultKeylines];

  if (defaultKeylines.isLastFocalItemAtEndOfContainer(carouselMainAxisSize)) {
    if (afterContentPadding !== 0) {
      steps.push(
        createShiftedKeylineListForContentPadding(
          defaultKeylines,
          carouselMainAxisSize,
          itemSpacing,
          -afterContentPadding,
          defaultKeylines.lastFocal,
          defaultKeylines.lastFocalIndex,
        ),
      );
    }
    return steps;
  }

  const startIndex = defaultKeylines.lastFocalIndex;
  const endIndex = defaultKeylines.lastNonAnchorIndex;
  const numberOfSteps = endIndex - startIndex;

  if (numberOfSteps <= 0 && defaultKeylines.lastFocal.cutoff > 0) {
    steps.push(
      moveKeylineAndCreateShiftedKeylineList(
        defaultKeylines,
        0,
        0,
        carouselMainAxisSize,
        itemSpacing,
      ),
    );
    return steps;
  }

  for (let i = 0; i < numberOfSteps; i++) {
    const prevStep = lastOf(steps);
    const originalItemIndex = endIndex - i;
    let dstIndex = 0;
    if (originalItemIndex < defaultKeylines.lastIndex) {
      const originalNeighborAfterSize = defaultKeylines.get(originalItemIndex + 1).size;
      dstIndex = prevStep.lastIndexBeforeFocalRangeWithSize(originalNeighborAfterSize) + 1;
    }
    steps.push(
      moveKeylineAndCreateShiftedKeylineList(
        prevStep,
        defaultKeylines.lastNonAnchorIndex,
        dstIndex,
        carouselMainAxisSize,
        itemSpacing,
      ),
    );
  }

  if (afterContentPadding !== 0) {
    const last = lastOf(steps);
    steps[steps.length - 1] = createShiftedKeylineListForContentPadding(
      last,
      carouselMainAxisSize,
      itemSpacing,
      -afterContentPadding,
      last.lastFocal,
      last.lastFocalIndex,
    );
  }
  return steps;
}

/** `from` with every keyline shrunk and shifted into the content padding (L561–589). */
function createShiftedKeylineListForContentPadding(
  from: KeylineList,
  carouselMainAxisSize: number,
  itemSpacing: number,
  contentPadding: number,
  pivot: Keyline,
  pivotIndex: number,
): KeylineList {
  const numberOfNonAnchorKeylines = from.keylines.filter((k) => !k.isAnchor).length;
  const sizeReduction = f(contentPadding / numberOfNonAnchorKeylines);
  const newKeylines = keylineListOf(
    carouselMainAxisSize,
    itemSpacing,
    pivotIndex,
    f(f(pivot.offset - f(sizeReduction / 2)) + contentPadding),
    (s) => {
      for (const k of from.keylines) s.add(f(k.size - Math.abs(sizeReduction)), k.isAnchor);
    },
  );
  return new KeylineList(
    newKeylines.keylines.map((k, i) => ({ ...k, unadjustedOffset: from.get(i).unadjustedOffset })),
  );
}

/** `from` with the keyline at `srcIndex` moved to `dstIndex`, re-pivoted (L595–610). */
function moveKeylineAndCreateShiftedKeylineList(
  from: KeylineList,
  srcIndex: number,
  dstIndex: number,
  carouselMainAxisSize: number,
  itemSpacing: number,
): KeylineList {
  const pivotDir = srcIndex > dstIndex ? 1 : -1;
  const src = from.get(srcIndex);
  const pivotDelta = f(f(f(src.size - src.cutoff) + itemSpacing) * pivotDir);
  const newPivotIndex = from.pivotIndex + pivotDir;
  const newPivotOffset = f(from.pivot.offset + pivotDelta);
  const moved = [...from.keylines];
  moved.splice(srcIndex, 1);
  moved.splice(dstIndex, 0, src);
  return keylineListOf(carouselMainAxisSize, itemSpacing, newPivotIndex, newPivotOffset, (s) => {
    for (const k of moved) s.add(k.size, k.isAnchor);
  });
}

/** For each step, the 0–1 interpolation at which it is shown (L638–662). */
function getStepInterpolationPoints(
  totalShiftDistance: number,
  steps: readonly KeylineList[],
  isShiftingLeft: boolean,
): number[] {
  const points = [0];
  if (totalShiftDistance === 0 || steps.length === 0) return points;
  for (let i = 1; i < steps.length; i++) {
    const prevKeylines = at(steps, i - 1);
    const currKeylines = at(steps, i);
    const distanceShifted = isShiftingLeft
      ? f(currKeylines.first().unadjustedOffset - prevKeylines.first().unadjustedOffset)
      : f(prevKeylines.last().unadjustedOffset - currKeylines.last().unadjustedOffset);
    const stepPercentage = f(distanceShifted / totalShiftDistance);
    points.push(i === steps.length - 1 ? 1 : f(at(points, i - 1) + stepPercentage));
  }
  return points;
}

// --- KeylineSnapPosition.kt -----------------------------------------------------------------

/**
 * The offset from the container's start at which item `itemIndex` rests when snapped: its keyline
 * in the step that brings it into the focal range (KeylineSnapPosition.kt L29–76). Pixels, rounded.
 */
export function getSnapPositionOffset(
  strategy: Strategy,
  itemIndex: number,
  itemCount: number,
): number {
  if (!strategy.isValid) return 0;

  let offset = roundToInt(
    f(strategy.defaultKeylines.firstFocal.unadjustedOffset - f(strategy.itemMainAxisSize / 2)),
  );

  const startLastIndex = strategy.startKeylineSteps.length - 1;
  if (itemIndex <= startLastIndex) {
    const stepIndex = Math.min(Math.max(startLastIndex - itemIndex, 0), startLastIndex);
    const startKeylines = at(strategy.startKeylineSteps, stepIndex);
    offset = roundToInt(
      f(startKeylines.firstFocal.unadjustedOffset - f(strategy.itemMainAxisSize / 2)),
    );
  }

  const lastItemIndex = itemCount - 1;
  const endLastIndex = strategy.endKeylineSteps.length - 1;
  if (
    itemIndex >= lastItemIndex - endLastIndex &&
    itemCount > strategy.defaultKeylines.focalCount
  ) {
    const stepIndex = Math.min(
      Math.max(endLastIndex - (lastItemIndex - itemIndex), 0),
      endLastIndex,
    );
    const endKeylines = at(strategy.endKeylineSteps, stepIndex);
    offset = roundToInt(
      f(endKeylines.lastFocal.unadjustedOffset - f(strategy.itemMainAxisSize / 2)),
    );
  }

  return offset;
}
