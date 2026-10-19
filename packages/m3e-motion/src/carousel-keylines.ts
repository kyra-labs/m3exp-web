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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/carousel/Arrangement.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/carousel/KeylineList.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/carousel/Keylines.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// (CarouselDefaults' size constants and CarouselAlignment: Carousel.kt L509–525, L812–825).
//
// The carousel's keylines (COMPONENT_SPEC §36): fixed positions along the scroll axis that give an
// item its size (mask) and position when its center sits on them. Float32-faithful: every Kotlin
// Float operation is rounded with Math.fround, so the results match the androidHostTest cases and
// the JVM reference bit for bit. Sizes are pixels at density 1 (a CSS px is the web's dp).

const f = Math.fround;

/** Kotlin `Float.MAX_VALUE`. */
export const FLOAT_MAX_VALUE = 3.4028234663852886e38;

/** `CarouselDefaults.MinSmallItemSize` (Carousel.kt L813): 40dp. */
export const CAROUSEL_MIN_SMALL_ITEM_SIZE = 40;
/** `CarouselDefaults.MaxSmallItemSize` (Carousel.kt L816): 56dp. */
export const CAROUSEL_MAX_SMALL_ITEM_SIZE = 56;
/** `CarouselDefaults.AnchorSize` (Carousel.kt L824, internal): 10dp. */
export const CAROUSEL_ANCHOR_SIZE = 10;
/** `CarouselDefaults.MediumLargeItemDiffThreshold` (Carousel.kt L825, internal). */
const MEDIUM_LARGE_ITEM_DIFF_THRESHOLD = 0.8500000238418579; // 0.85f
/** `Arrangement.MediumItemFlexPercentage` (Arrangement.kt L71). */
const MEDIUM_ITEM_FLEX_PERCENTAGE = 0.10000000149011612; // .1f

/** Kotlin `coerceIn`: throws when the range is empty. */
function coerceIn(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error(
      `Cannot coerce value to an empty range: maximum ${String(max)} is less than minimum ${String(min)}.`,
    );
  }
  return value < min ? min : value > max ? max : value;
}

/** Kotlin `IntArray(size) { init }`: throws for a negative size (NegativeArraySizeException). */
function intArray(size: number, init: (index: number) => number): number[] {
  if (size < 0) throw new RangeError(`Negative array size: ${String(size)}`);
  return Array.from({ length: size }, (_, i) => init(i));
}

/** Kotlin `Float.toInt()`: truncates, NaN is 0, saturates at the Int range. */
const toInt = (v: number) =>
  Number.isNaN(v) ? 0 : Math.max(-2147483648, Math.min(2147483647, Math.trunc(v)));

/** `list[index]`, throwing out of range (Kotlin's IndexOutOfBoundsException). */
export function at<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new RangeError(`Index ${String(index)} out of bounds for length ${String(list.length)}`);
  }
  return list[index] as T;
}

/** Kotlin `Int / Int` (truncating). */
const idiv = (a: number, b: number) => Math.trunc(a / b);

/** compose ui-util `lerp(start, stop, fraction)` (MathHelpers.kt L25–27), in Float. */
export function lerpFloat(start: number, stop: number, fraction: number): number {
  return f(f(f(1 - fraction) * start) + f(fraction * stop));
}

// --- Arrangement.kt -------------------------------------------------------------------------

/**
 * A combination of large, medium and small items fitted into an available space, with a cost
 * (Arrangement.kt L28–277).
 */
export class Arrangement {
  readonly #priority: number;
  readonly smallSize: number;
  readonly smallCount: number;
  readonly mediumSize: number;
  readonly mediumCount: number;
  readonly largeSize: number;
  readonly largeCount: number;

  constructor(
    priority: number,
    smallSize: number,
    smallCount: number,
    mediumSize: number,
    mediumCount: number,
    largeSize: number,
    largeCount: number,
  ) {
    this.#priority = priority;
    this.smallSize = smallSize;
    this.smallCount = smallCount;
    this.mediumSize = mediumSize;
    this.mediumCount = mediumCount;
    this.largeSize = largeSize;
    this.largeCount = largeCount;
  }

  #isValid(): boolean {
    if (this.largeCount > 0 && this.smallCount > 0 && this.mediumCount > 0) {
      return this.largeSize > this.mediumSize && this.mediumSize > this.smallSize;
    } else if (this.largeCount > 0 && this.smallCount > 0) {
      return this.largeSize > this.smallSize;
    }
    return true;
  }

  /** Lower is better: the priority times how far the large size moved from its target (L56–61). */
  cost(targetLargeSize: number): number {
    if (!this.#isValid()) return FLOAT_MAX_VALUE;
    return f(Math.abs(f(targetLargeSize - this.largeSize)) * this.#priority);
  }

  /** The number of items (keylines) in the arrangement. */
  itemCount(): number {
    return this.largeCount + this.mediumCount + this.smallCount;
  }

  /**
   * Fits every permutation of the counts into `availableSpace` and returns the lowest cost one
   * (L98–149), or null when there is no permutation.
   */
  static findLowestCostArrangement(
    availableSpace: number,
    itemSpacing: number,
    targetSmallSize: number,
    minSmallSize: number,
    maxSmallSize: number,
    smallCounts: readonly number[],
    targetMediumSize: number,
    mediumCounts: readonly number[],
    targetLargeSize: number,
    largeCounts: readonly number[],
  ): Arrangement | null {
    let lowestCostArrangement: Arrangement | null = null;
    let priority = 1;
    for (const largeCount of largeCounts) {
      for (const mediumCount of mediumCounts) {
        for (const smallCount of smallCounts) {
          const arrangement = fit(
            priority,
            availableSpace,
            itemSpacing,
            smallCount,
            targetSmallSize,
            minSmallSize,
            maxSmallSize,
            mediumCount,
            targetMediumSize,
            largeCount,
            targetLargeSize,
          );
          if (
            lowestCostArrangement === null ||
            arrangement.cost(targetLargeSize) < lowestCostArrangement.cost(targetLargeSize)
          ) {
            lowestCostArrangement = arrangement;
            if (lowestCostArrangement.cost(targetLargeSize) === 0) return lowestCostArrangement;
          }
          priority++;
        }
      }
    }
    return lowestCostArrangement;
  }
}

/** Arrangement.fit (L172–246): small items first, then medium, then large. */
function fit(
  priority: number,
  availableSpace: number,
  itemSpacing: number,
  smallCount: number,
  smallSize: number,
  minSmallSize: number,
  maxSmallSize: number,
  mediumCount: number,
  mediumSize: number,
  largeCount: number,
  largeSize: number,
): Arrangement {
  const totalItemCount = largeCount + mediumCount + smallCount;
  const availableSpaceWithoutSpacing = f(availableSpace - f((totalItemCount - 1) * itemSpacing));
  let arrangedSmallSize = coerceIn(smallSize, minSmallSize, maxSmallSize);
  let arrangedMediumSize = mediumSize;
  let arrangedLargeSize = largeSize;

  const totalSpaceTakenByArrangement = f(
    f(f(arrangedLargeSize * largeCount) + f(arrangedMediumSize * mediumCount)) +
      f(arrangedSmallSize * smallCount),
  );
  const delta = f(availableSpaceWithoutSpacing - totalSpaceTakenByArrangement);
  if (smallCount > 0 && delta > 0) {
    arrangedSmallSize = f(
      arrangedSmallSize + Math.min(f(delta / smallCount), f(maxSmallSize - arrangedSmallSize)),
    );
  } else if (smallCount > 0 && delta < 0) {
    arrangedSmallSize = f(
      arrangedSmallSize + Math.max(f(delta / smallCount), f(minSmallSize - arrangedSmallSize)),
    );
  }

  arrangedSmallSize = smallCount > 0 ? arrangedSmallSize : 0;
  arrangedLargeSize = calculateLargeSize(
    availableSpaceWithoutSpacing,
    smallCount,
    arrangedSmallSize,
    mediumCount,
    largeCount,
  );
  arrangedMediumSize = f(f(arrangedLargeSize + arrangedSmallSize) / 2);

  if (mediumCount > 0 && arrangedLargeSize !== largeSize) {
    const targetAdjustment = f(f(largeSize - arrangedLargeSize) * largeCount);
    const availableMediumFlex = f(
      f(arrangedMediumSize * MEDIUM_ITEM_FLEX_PERCENTAGE) * mediumCount,
    );
    const distribute = Math.min(Math.abs(targetAdjustment), availableMediumFlex);
    if (targetAdjustment > 0) {
      arrangedMediumSize = f(arrangedMediumSize - f(distribute / mediumCount));
      arrangedLargeSize = f(arrangedLargeSize + f(distribute / largeCount));
    } else {
      arrangedMediumSize = f(arrangedMediumSize + f(distribute / mediumCount));
      arrangedLargeSize = f(arrangedLargeSize - f(distribute / largeCount));
    }
  }

  return new Arrangement(
    priority,
    arrangedSmallSize,
    smallCount,
    arrangedMediumSize,
    mediumCount,
    arrangedLargeSize,
    largeCount,
  );
}

/** The large size that fills `availableSpace` with medium = (large + small) / 2 (L265–275). */
function calculateLargeSize(
  availableSpace: number,
  smallCount: number,
  smallSize: number,
  mediumCount: number,
  largeCount: number,
): number {
  return f(
    f(availableSpace - f(f(smallCount + f(mediumCount / 2)) * smallSize)) /
      f(largeCount + f(mediumCount / 2)),
  );
}

// --- KeylineList.kt -------------------------------------------------------------------------

/**
 * A position along the scroll axis that defines an item's size when its center is at `offset`
 * (KeylineList.kt L47–55).
 */
export interface Keyline {
  readonly size: number;
  readonly offset: number;
  readonly unadjustedOffset: number;
  readonly isFocal: boolean;
  readonly isAnchor: boolean;
  readonly isPivot: boolean;
  readonly cutoff: number;
}

/** Kotlin data-class equality (Float.compare: -0 ≠ 0, NaN = NaN). */
export function keylineEquals(a: Keyline, b: Keyline): boolean {
  return (
    Object.is(a.size, b.size) &&
    Object.is(a.offset, b.offset) &&
    Object.is(a.unadjustedOffset, b.unadjustedOffset) &&
    a.isFocal === b.isFocal &&
    a.isAnchor === b.isAnchor &&
    a.isPivot === b.isPivot &&
    Object.is(a.cutoff, b.cutoff)
  );
}

const indexOfFirst = (list: readonly Keyline[], p: (k: Keyline) => boolean) => list.findIndex(p);
const indexOfLast = (list: readonly Keyline[], p: (k: Keyline) => boolean) => {
  for (let i = list.length - 1; i >= 0; i--) if (p(at(list, i))) return i;
  return -1;
};

/** A list of keylines with the carousel's lookups (KeylineList.kt L65–260). */
export class KeylineList {
  readonly keylines: readonly Keyline[];
  readonly minSize: number;
  readonly maxSize: number;
  readonly pivotIndex: number;
  readonly firstNonAnchorIndex: number;
  readonly lastNonAnchorIndex: number;
  readonly firstFocalIndex: number;
  readonly lastFocalIndex: number;
  readonly focalCount: number;

  constructor(keylines: readonly Keyline[]) {
    this.keylines = keylines;
    let min = FLOAT_MAX_VALUE;
    let max = 0;
    for (const k of keylines) {
      if (k.size < min) min = k.size;
      if (k.size > max) max = k.size;
    }
    this.minSize = min;
    this.maxSize = max;
    this.pivotIndex = indexOfFirst(keylines, (k) => k.isPivot);
    this.firstNonAnchorIndex = indexOfFirst(keylines, (k) => !k.isAnchor);
    this.lastNonAnchorIndex = indexOfLast(keylines, (k) => !k.isAnchor);
    this.firstFocalIndex = indexOfFirst(keylines, (k) => k.isFocal);
    this.lastFocalIndex = indexOfLast(keylines, (k) => k.isFocal);
    this.focalCount = this.lastFocalIndex - this.firstFocalIndex + 1;
  }

  get size(): number {
    return this.keylines.length;
  }

  get lastIndex(): number {
    return this.keylines.length - 1;
  }

  isEmpty(): boolean {
    return this.keylines.length === 0;
  }

  isNotEmpty(): boolean {
    return this.keylines.length !== 0;
  }

  /** `list[index]`; throws out of range (Kotlin's IndexOutOfBoundsException). */
  get(index: number): Keyline {
    const k = this.keylines[index];
    if (k === undefined || index < 0) {
      throw new RangeError(
        `Index ${String(index)} out of bounds for length ${String(this.keylines.length)}`,
      );
    }
    return k;
  }

  first(): Keyline {
    if (this.keylines.length === 0) throw new RangeError('List is empty.');
    return this.get(0);
  }

  last(): Keyline {
    if (this.keylines.length === 0) throw new RangeError('List is empty.');
    return this.get(this.lastIndex);
  }

  get pivot(): Keyline {
    return this.get(this.pivotIndex);
  }

  get firstNonAnchor(): Keyline {
    return this.get(this.firstNonAnchorIndex);
  }

  get lastNonAnchor(): Keyline {
    return this.get(this.lastNonAnchorIndex);
  }

  get firstFocal(): Keyline {
    const k = this.keylines[this.firstFocalIndex];
    if (k === undefined)
      throw new RangeError('All KeylineLists must have at least one focal keyline');
    return k;
  }

  get lastFocal(): Keyline {
    const k = this.keylines[this.lastFocalIndex];
    if (k === undefined)
      throw new RangeError('All KeylineLists must have at least one focal keyline');
    return k;
  }

  /** The first focal item's start is in the container and it is the first non-anchor (L171–174). */
  isFirstFocalItemAtStartOfContainer(): boolean {
    const firstFocal = this.firstFocal;
    const firstFocalLeft = f(firstFocal.offset - f(firstFocal.size / 2));
    return firstFocalLeft >= 0 && keylineEquals(firstFocal, this.firstNonAnchor);
  }

  /** The last focal item's end is in the container and it is the last non-anchor (L185–188). */
  isLastFocalItemAtEndOfContainer(carouselMainAxisSize: number): boolean {
    const lastFocal = this.lastFocal;
    const lastFocalRight = f(lastFocal.offset + f(lastFocal.size / 2));
    return lastFocalRight <= carouselMainAxisSize && keylineEquals(lastFocal, this.lastNonAnchor);
  }

  /** The first index from the last focal one whose size is `size`, else the last index (L198–202). */
  firstIndexAfterFocalRangeWithSize(size: number): number {
    for (let i = this.lastFocalIndex; i <= this.lastIndex; i++) {
      if (this.get(i).size === size) return i;
    }
    return this.lastIndex;
  }

  /** The last index before the focal range whose size is `size`, else 0 (L212–216). */
  lastIndexBeforeFocalRangeWithSize(size: number): number {
    for (let i = this.firstFocalIndex - 1; i >= 0; i--) {
      if (this.get(i).size === size) return i;
    }
    return 0;
  }

  /** The last keyline whose unadjusted offset is less than `unadjustedOffset`, else the first. */
  getKeylineBefore(unadjustedOffset: number): Keyline {
    for (let index = this.lastIndex; index >= 0; index--) {
      const k = this.get(index);
      if (k.unadjustedOffset < unadjustedOffset) return k;
    }
    return this.first();
  }

  /** The first keyline whose unadjusted offset is at least `unadjustedOffset`, else the last. */
  getKeylineAfter(unadjustedOffset: number): Keyline {
    return this.keylines.find((k) => k.unadjustedOffset >= unadjustedOffset) ?? this.last();
  }

  /** Structural equality (L241–249). */
  equals(other: KeylineList): boolean {
    if (this === other) return true;
    if (this.size !== other.size) return false;
    return this.keylines.every((k, i) => keylineEquals(k, other.get(i)));
  }
}

/** `CarouselAlignment` (Carousel.kt L509–525). */
export type CarouselAlignment = 'start' | 'center' | 'end';

/** Receiver of `keylineListOf`: adds keylines in order (KeylineList.kt L302–314). */
export interface KeylineListScope {
  add(size: number, isAnchor?: boolean): void;
}

interface TmpKeyline {
  size: number;
  isAnchor: boolean;
}

/** KeylineListScopeImpl (L316–570). */
class KeylineListScopeImpl implements KeylineListScope {
  #firstFocalIndex = -1;
  #focalItemSize = 0;
  readonly #tmpKeylines: TmpKeyline[] = [];

  add(size: number, isAnchor = false): void {
    this.#tmpKeylines.push({ size, isAnchor });
    if (!isAnchor && size > this.#focalItemSize) {
      this.#firstFocalIndex = this.#tmpKeylines.length - 1;
      this.#focalItemSize = size;
    }
  }

  createWithPivot(
    carouselMainAxisSize: number,
    itemSpacing: number,
    pivotIndex: number,
    pivotOffset: number,
  ): KeylineList {
    return new KeylineList(
      this.#createKeylinesWithPivot(
        pivotIndex,
        pivotOffset,
        this.#firstFocalIndex,
        this.#findLastFocalIndex(),
        this.#focalItemSize,
        carouselMainAxisSize,
        itemSpacing,
      ),
    );
  }

  createWithAlignment(
    carouselMainAxisSize: number,
    itemSpacing: number,
    carouselAlignment: CarouselAlignment,
  ): KeylineList {
    const lastFocalIndex = this.#findLastFocalIndex();
    const focalItemCount = lastFocalIndex - this.#firstFocalIndex;
    const focalItemSize = this.#focalItemSize;
    const pivotIndex = this.#firstFocalIndex;
    let pivotOffset: number;
    if (carouselAlignment === 'center') {
      const itemSpacingSplit =
        itemSpacing === 0 || ((focalItemCount % 2) + 2) % 2 === 0 ? 0 : f(itemSpacing / 2);
      const itemSpaceCounts = f(idiv(focalItemCount, 2) * itemSpacing);
      pivotOffset = f(
        f(
          f(f(carouselMainAxisSize / 2) - f(f(focalItemSize / 2) * focalItemCount)) -
            itemSpacingSplit,
        ) - itemSpaceCounts,
      );
    } else if (carouselAlignment === 'end') {
      pivotOffset = f(carouselMainAxisSize - f(focalItemSize / 2));
    } else {
      pivotOffset = f(focalItemSize / 2);
    }
    return new KeylineList(
      this.#createKeylinesWithPivot(
        pivotIndex,
        pivotOffset,
        this.#firstFocalIndex,
        lastFocalIndex,
        focalItemSize,
        carouselMainAxisSize,
        itemSpacing,
      ),
    );
  }

  #findLastFocalIndex(): number {
    if (this.#firstFocalIndex < 0) return -1;
    let lastFocalIndex = this.#firstFocalIndex;
    const tmp = this.#tmpKeylines;
    while (
      lastFocalIndex < tmp.length - 1 &&
      at(tmp, lastFocalIndex + 1).size === this.#focalItemSize
    ) {
      lastFocalIndex++;
    }
    return lastFocalIndex;
  }

  /** Offsets, unadjusted offsets and cutoffs from a pivot keyline (L445–544). */
  #createKeylinesWithPivot(
    pivotIndex: number,
    pivotOffset: number,
    firstFocalIndex: number,
    lastFocalIndex: number,
    itemMainAxisSize: number,
    carouselMainAxisSize: number,
    itemSpacing: number,
  ): Keyline[] {
    const tmpKeylines = this.#tmpKeylines;
    if (tmpKeylines.length === 0 || pivotIndex < 0 || pivotIndex >= tmpKeylines.length) return [];
    const isFocal = (i: number) => i >= firstFocalIndex && i <= lastFocalIndex;
    const pivot = at(tmpKeylines, pivotIndex);
    const keylines: Keyline[] = [];

    const pivotCutoff = isCutoffLeft(pivot.size, pivotOffset)
      ? f(pivotOffset - f(pivot.size / 2))
      : isCutoffRight(pivot.size, pivotOffset, carouselMainAxisSize)
        ? f(f(pivotOffset + f(pivot.size / 2)) - carouselMainAxisSize)
        : 0;
    keylines.push({
      size: pivot.size,
      offset: pivotOffset,
      unadjustedOffset: pivotOffset,
      isFocal: isFocal(pivotIndex),
      isAnchor: pivot.isAnchor,
      isPivot: true,
      cutoff: pivotCutoff,
    });

    let offset = f(f(pivotOffset - f(itemMainAxisSize / 2)) - itemSpacing);
    let unadjustedOffset = f(f(pivotOffset - f(itemMainAxisSize / 2)) - itemSpacing);
    for (let originalIndex = pivotIndex - 1; originalIndex >= 0; originalIndex--) {
      const tmp = at(tmpKeylines, originalIndex);
      const tmpOffset = f(offset - f(tmp.size / 2));
      const tmpUnadjustedOffset = f(unadjustedOffset - f(itemMainAxisSize / 2));
      const cutoff = isCutoffLeft(tmp.size, tmpOffset)
        ? Math.abs(f(tmpOffset - f(tmp.size / 2)))
        : 0;
      keylines.unshift({
        size: tmp.size,
        offset: tmpOffset,
        unadjustedOffset: tmpUnadjustedOffset,
        isFocal: isFocal(originalIndex),
        isAnchor: tmp.isAnchor,
        isPivot: false,
        cutoff,
      });
      offset = f(offset - f(tmp.size + itemSpacing));
      unadjustedOffset = f(unadjustedOffset - f(itemMainAxisSize + itemSpacing));
    }

    offset = f(f(pivotOffset + f(itemMainAxisSize / 2)) + itemSpacing);
    unadjustedOffset = f(f(pivotOffset + f(itemMainAxisSize / 2)) + itemSpacing);
    for (let originalIndex = pivotIndex + 1; originalIndex < tmpKeylines.length; originalIndex++) {
      const tmp = at(tmpKeylines, originalIndex);
      const tmpOffset = f(offset + f(tmp.size / 2));
      const tmpUnadjustedOffset = f(unadjustedOffset + f(itemMainAxisSize / 2));
      const cutoff = isCutoffRight(tmp.size, tmpOffset, carouselMainAxisSize)
        ? f(f(tmpOffset + f(tmp.size / 2)) - carouselMainAxisSize)
        : 0;
      keylines.push({
        size: tmp.size,
        offset: tmpOffset,
        unadjustedOffset: tmpUnadjustedOffset,
        isFocal: isFocal(originalIndex),
        isAnchor: tmp.isAnchor,
        isPivot: false,
        cutoff,
      });
      offset = f(offset + f(tmp.size + itemSpacing));
      unadjustedOffset = f(unadjustedOffset + f(itemMainAxisSize + itemSpacing));
    }
    return keylines;
  }
}

/** The item straddles the container's start edge (L554–556). */
function isCutoffLeft(size: number, offset: number): boolean {
  return f(offset - f(size / 2)) < 0 && f(offset + f(size / 2)) > 0;
}

/** The item straddles the container's end edge (L566–569). */
function isCutoffRight(size: number, offset: number, carouselMainAxisSize: number): boolean {
  return (
    f(offset - f(size / 2)) < carouselMainAxisSize && f(offset + f(size / 2)) > carouselMainAxisSize
  );
}

let empty: KeylineList | undefined;

/** `KeylineList.Empty` (created on first use: no module-level side effects for tree shaking). */
export const emptyKeylineList = (): KeylineList => (empty ??= new KeylineList([]));

/** A keyline list aligned to the container (L265–278). */
export function keylineListOf(
  carouselMainAxisSize: number,
  itemSpacing: number,
  carouselAlignment: CarouselAlignment,
  keylines: (scope: KeylineListScope) => void,
): KeylineList;
/** A keyline list whose offsets are computed from a pivot keyline (L284–299). */
export function keylineListOf(
  carouselMainAxisSize: number,
  itemSpacing: number,
  pivotIndex: number,
  pivotOffset: number,
  keylines: (scope: KeylineListScope) => void,
): KeylineList;
export function keylineListOf(
  carouselMainAxisSize: number,
  itemSpacing: number,
  alignmentOrPivotIndex: CarouselAlignment | number,
  pivotOffsetOrKeylines: number | ((scope: KeylineListScope) => void),
  keylines?: (scope: KeylineListScope) => void,
): KeylineList {
  const scope = new KeylineListScopeImpl();
  if (typeof alignmentOrPivotIndex === 'number') {
    keylines?.(scope);
    return scope.createWithPivot(
      carouselMainAxisSize,
      itemSpacing,
      alignmentOrPivotIndex,
      pivotOffsetOrKeylines as number,
    );
  }
  (pivotOffsetOrKeylines as (scope: KeylineListScope) => void)(scope);
  return scope.createWithAlignment(carouselMainAxisSize, itemSpacing, alignmentOrPivotIndex);
}

/** A keyline interpolated between `start` and `end` (L576–587). */
export function lerpKeyline(start: Keyline, end: Keyline, fraction: number): Keyline {
  return {
    size: lerpFloat(start.size, end.size, fraction),
    offset: lerpFloat(start.offset, end.offset, fraction),
    unadjustedOffset: lerpFloat(start.unadjustedOffset, end.unadjustedOffset, fraction),
    isFocal: fraction < 0.5 ? start.isFocal : end.isFocal,
    isAnchor: fraction < 0.5 ? start.isAnchor : end.isAnchor,
    isPivot: fraction < 0.5 ? start.isPivot : end.isPivot,
    cutoff: lerpFloat(start.cutoff, end.cutoff, fraction),
  };
}

/** Every keyline of `from` interpolated towards the same index of `to` (L596–599). */
export function lerpKeylineList(from: KeylineList, to: KeylineList, fraction: number): KeylineList {
  return new KeylineList(from.keylines.map((k, i) => lerpKeyline(k, to.get(i), fraction)));
}

// --- Keylines.kt ----------------------------------------------------------------------------

/**
 * Multi-browse keylines (Keylines.kt L44–142): large items at the start, then a medium and a small
 * item, from the arrangement that changes the preferred large size the least.
 */
export function multiBrowseKeylineList(
  carouselMainAxisSize: number,
  preferredItemSize: number,
  itemSpacing: number,
  itemCount: number,
  minSmallItemSize: number = CAROUSEL_MIN_SMALL_ITEM_SIZE,
  maxSmallItemSize: number = CAROUSEL_MAX_SMALL_ITEM_SIZE,
  anchorSize: number = CAROUSEL_ANCHOR_SIZE,
): KeylineList {
  carouselMainAxisSize = f(carouselMainAxisSize);
  preferredItemSize = f(preferredItemSize);
  itemSpacing = f(itemSpacing);
  minSmallItemSize = f(minSmallItemSize);
  maxSmallItemSize = f(maxSmallItemSize);
  anchorSize = f(anchorSize);
  if (carouselMainAxisSize === 0 || preferredItemSize === 0) return emptyKeylineList();

  let smallCounts = [1];
  const mediumCounts = [1, 0];

  const targetLargeSize = Math.min(preferredItemSize, carouselMainAxisSize);
  const targetSmallSize = coerceIn(f(targetLargeSize / 3), minSmallItemSize, maxSmallItemSize);
  const targetMediumSize = f(f(targetLargeSize + targetSmallSize) / 2);

  if (carouselMainAxisSize < f(minSmallItemSize * 2)) smallCounts = [0];

  const minAvailableLargeSpace = f(
    f(carouselMainAxisSize - f(targetMediumSize * Math.max(...mediumCounts))) -
      f(maxSmallItemSize * Math.max(...smallCounts)),
  );
  const minLargeCount = Math.max(1, toInt(Math.floor(f(minAvailableLargeSpace / targetLargeSize))));
  const maxLargeCount = toInt(Math.ceil(f(carouselMainAxisSize / targetLargeSize)));

  const largeCounts = intArray(maxLargeCount - minLargeCount + 1, (it) => maxLargeCount - it);
  let arrangement = Arrangement.findLowestCostArrangement(
    carouselMainAxisSize,
    itemSpacing,
    targetSmallSize,
    minSmallItemSize,
    maxSmallItemSize,
    smallCounts,
    targetMediumSize,
    mediumCounts,
    targetLargeSize,
    largeCounts,
  );

  if (arrangement !== null && arrangement.itemCount() > itemCount) {
    let keylineSurplus = arrangement.itemCount() - itemCount;
    let smallCount = arrangement.smallCount;
    let mediumCount = arrangement.mediumCount;
    while (keylineSurplus > 0) {
      if (smallCount > 0) {
        smallCount -= 1;
      } else if (mediumCount > 1) {
        mediumCount -= 1;
      }
      keylineSurplus -= 1;
    }
    arrangement = Arrangement.findLowestCostArrangement(
      carouselMainAxisSize,
      itemSpacing,
      targetSmallSize,
      minSmallItemSize,
      maxSmallItemSize,
      [smallCount],
      targetMediumSize,
      [mediumCount],
      targetLargeSize,
      largeCounts,
    );
  }

  if (arrangement === null) return emptyKeylineList();

  return createLeftAlignedKeylineList(
    carouselMainAxisSize,
    itemSpacing,
    anchorSize,
    anchorSize,
    arrangement,
  );
}

/**
 * Uncontained keylines (Keylines.kt L158–195): as many items of `itemSize` as fit, then one cut
 * off item sized for motion.
 */
export function uncontainedKeylineList(
  carouselMainAxisSize: number,
  itemSize: number,
  itemSpacing: number,
  anchorSize: number = CAROUSEL_ANCHOR_SIZE,
): KeylineList {
  carouselMainAxisSize = f(carouselMainAxisSize);
  itemSize = f(itemSize);
  itemSpacing = f(itemSpacing);
  anchorSize = f(anchorSize);
  if (carouselMainAxisSize === 0 || itemSize === 0) return emptyKeylineList();

  const largeItemSize = Math.min(f(itemSize + itemSpacing), carouselMainAxisSize);
  const largeCount = Math.max(1, toInt(Math.floor(f(carouselMainAxisSize / largeItemSize))));
  const remainingSpace = f(carouselMainAxisSize - f(largeCount * largeItemSize));

  const mediumCount = remainingSpace > 0 ? 1 : 0;

  const defaultAnchorSize = anchorSize;
  const mediumItemSize = calculateMediumChildSize(defaultAnchorSize, largeItemSize, remainingSpace);
  const arrangement = new Arrangement(
    0,
    0,
    0,
    mediumItemSize,
    mediumCount,
    largeItemSize,
    largeCount,
  );

  const xSmallSize = Math.min(defaultAnchorSize, itemSize);
  const leftAnchorSize = Math.max(xSmallSize, f(mediumItemSize * 0.5));
  return createLeftAlignedKeylineList(
    carouselMainAxisSize,
    itemSpacing,
    leftAnchorSize,
    defaultAnchorSize,
    arrangement,
  );
}

/**
 * Hero keylines (Keylines.kt L214–295): large items and one small item (start-aligned) or a large
 * item between two small items (`isCentered`, from three items). `preferredItemSize` null fills
 * the container but for the small items.
 */
export function heroKeylineList(
  carouselMainAxisSize: number,
  preferredItemSize: number | null,
  itemSpacing: number,
  itemCount: number,
  isCentered = false,
  minSmallItemSize: number = CAROUSEL_MIN_SMALL_ITEM_SIZE,
  maxSmallItemSize: number = CAROUSEL_MAX_SMALL_ITEM_SIZE,
  anchorSize: number = CAROUSEL_ANCHOR_SIZE,
): KeylineList {
  carouselMainAxisSize = f(carouselMainAxisSize);
  preferredItemSize = preferredItemSize === null ? null : f(preferredItemSize);
  itemSpacing = f(itemSpacing);
  minSmallItemSize = f(minSmallItemSize);
  maxSmallItemSize = f(maxSmallItemSize);
  anchorSize = f(anchorSize);
  if (carouselMainAxisSize === 0) return emptyKeylineList();

  const shouldCenter = isCentered && itemCount >= 3;

  let smallCounts = itemCount <= 1 ? [0] : shouldCenter ? [2] : [1];

  const targetLargeSize = Math.min(preferredItemSize ?? carouselMainAxisSize, carouselMainAxisSize);
  const targetSmallSize = coerceIn(f(targetLargeSize / 3), minSmallItemSize, maxSmallItemSize);

  const fullscreenThreshold = f(
    f(minSmallItemSize * Math.max(...smallCounts)) + f(minSmallItemSize * f(1.25)),
  );
  if (carouselMainAxisSize < fullscreenThreshold) smallCounts = [0];

  const minAvailableLargeSpace = f(
    carouselMainAxisSize - f(minSmallItemSize * Math.max(...smallCounts)),
  );
  const minLargeCount = Math.max(1, toInt(Math.floor(f(minAvailableLargeSpace / targetLargeSize))));
  const maxLargeCount = toInt(Math.ceil(f(carouselMainAxisSize / targetLargeSize)));
  const largeCounts = intArray(maxLargeCount - minLargeCount + 1, (it) => maxLargeCount - it);
  const arrangement = Arrangement.findLowestCostArrangement(
    carouselMainAxisSize,
    itemSpacing,
    targetSmallSize,
    minSmallItemSize,
    maxSmallItemSize,
    smallCounts,
    0,
    [0],
    targetLargeSize,
    largeCounts,
  );

  if (arrangement === null) return emptyKeylineList();

  return shouldCenter && itemCount >= arrangement.itemCount()
    ? createCenterAlignedKeylineList(
        carouselMainAxisSize,
        itemSpacing,
        anchorSize,
        anchorSize,
        arrangement,
      )
    : createLeftAlignedKeylineList(
        carouselMainAxisSize,
        itemSpacing,
        anchorSize,
        anchorSize,
        arrangement,
      );
}

/** Anchor, large…, medium…, small…, anchor; start-aligned (L297–313). */
export function createLeftAlignedKeylineList(
  carouselMainAxisSize: number,
  itemSpacing: number,
  leftAnchorSize: number,
  rightAnchorSize: number,
  arrangement: Arrangement,
): KeylineList {
  return keylineListOf(carouselMainAxisSize, itemSpacing, 'start', (s) => {
    s.add(leftAnchorSize, true);
    for (let i = 0; i < arrangement.largeCount; i++) s.add(arrangement.largeSize);
    for (let i = 0; i < arrangement.mediumCount; i++) s.add(arrangement.mediumSize);
    for (let i = 0; i < arrangement.smallCount; i++) s.add(arrangement.smallSize);
    s.add(rightAnchorSize, true);
  });
}

/** Anchor, small/2, medium/2, large…, medium/2, small/2, anchor; centered (L315–333). */
export function createCenterAlignedKeylineList(
  carouselMainAxisSize: number,
  itemSpacing: number,
  leftAnchorSize: number,
  rightAnchorSize: number,
  arrangement: Arrangement,
): KeylineList {
  return keylineListOf(carouselMainAxisSize, itemSpacing, 'center', (s) => {
    s.add(leftAnchorSize, true);
    for (let i = 0; i < idiv(arrangement.smallCount, 2); i++) s.add(arrangement.smallSize);
    for (let i = 0; i < idiv(arrangement.mediumCount, 2); i++) s.add(arrangement.mediumSize);
    for (let i = 0; i < arrangement.largeCount; i++) s.add(arrangement.largeSize);
    for (let i = 0; i < idiv(arrangement.mediumCount, 2); i++) s.add(arrangement.mediumSize);
    for (let i = 0; i < idiv(arrangement.smallCount, 2); i++) s.add(arrangement.smallSize);
    s.add(rightAnchorSize, true);
  });
}

/** The uncontained layout's cut off item: a third (else a fifth) cut off (L340–364). */
function calculateMediumChildSize(
  minimumMediumSize: number,
  largeItemSize: number,
  remainingSpace: number,
): number {
  let mediumItemSize = minimumMediumSize;
  const sizeWithThirdCutOff = f(remainingSpace * f(1.5));
  mediumItemSize = Math.max(sizeWithThirdCutOff, mediumItemSize);

  const largeItemThreshold = f(largeItemSize * MEDIUM_LARGE_ITEM_DIFF_THRESHOLD);
  if (mediumItemSize > largeItemThreshold) {
    const sizeWithFifthCutOff = f(remainingSpace * f(1.2));
    mediumItemSize = Math.min(Math.max(largeItemThreshold, sizeWithFifthCutOff), largeItemSize);
  }
  return mediumItemSize;
}
