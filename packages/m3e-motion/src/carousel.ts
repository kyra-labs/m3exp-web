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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/carousel/Carousel.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The carousel's per-item layout (COMPONENT_SPEC §36), shared by m3e-elements' CarouselLayout and
// therefore by <m3e-carousel> and m3e-react's <Carousel>:
// - carouselKeylineList: the keyline list each public composable builds
//   (HorizontalMultiBrowseCarousel L108–148, HorizontalUncontainedCarousel L179–213,
//   HorizontalCenteredHeroCarousel L261–303), plus the start-aligned hero, which Compose only has
//   as `heroKeylineList(isCentered = false)` (owner decision M9 #22);
// - carouselStrategy: CarouselPageSize (L478–507), the Strategy for the container;
// - calculateMaxScrollOffset (L696–702);
// - carouselItemLayout: Modifier.carouselItem's placement (L549–658): the interpolated keyline
//   around the item's center gives the mask (clip) and the translation that pins masked items
//   together; z-index 1 / (1 + distance from the current item).
// Scroll offsets are the web's: items laid end to end from 0 (item i starts at
// i × (itemMainAxisSize + itemSpacing)), the container's scroll position as the offset, so
// calculateCurrentScrollOffset (L685–692) is the scroll position itself.
import {
  CAROUSEL_ANCHOR_SIZE,
  CAROUSEL_MAX_SMALL_ITEM_SIZE,
  CAROUSEL_MIN_SMALL_ITEM_SIZE,
  type Keyline,
  type KeylineList,
  emptyKeylineList,
  heroKeylineList,
  keylineEquals,
  lerpKeyline,
  multiBrowseKeylineList,
  uncontainedKeylineList,
} from './carousel-keylines.js';
import { Strategy, getSnapPositionOffset } from './carousel-strategy.js';

const f = Math.fround;

/**
 * The carousel layouts with keyline math: Compose's three public carousels and the start-aligned
 * hero (owner decision M9 #22). The full-screen layout is CSS only (no keylines).
 */
export type CarouselLayoutName = 'multi-browse' | 'uncontained' | 'hero' | 'centered-hero';

export interface CarouselKeylineInput {
  layout: CarouselLayoutName;
  /** The container's size along the scroll axis (Compose `availableSpace`). */
  availableSpace: number;
  /**
   * Multi-browse and hero: `preferredItemWidth` (hero: null fills the container but for the small
   * items, Compose's `Dp.Unspecified`). Uncontained: `itemWidth`.
   */
  itemSize: number | null;
  itemSpacing: number;
  itemCount: number;
  /** `CarouselDefaults.MinSmallItemSize` (40) by default. */
  minSmallItemSize?: number | undefined;
  /** `CarouselDefaults.MaxSmallItemSize` (56) by default. */
  maxSmallItemSize?: number | undefined;
}

/** The keyline list the layout's composable builds (see the file header). */
export function carouselKeylineList(input: CarouselKeylineInput): KeylineList {
  const {
    layout,
    availableSpace,
    itemSize,
    itemSpacing,
    itemCount,
    minSmallItemSize = CAROUSEL_MIN_SMALL_ITEM_SIZE,
    maxSmallItemSize = CAROUSEL_MAX_SMALL_ITEM_SIZE,
  } = input;
  switch (layout) {
    case 'multi-browse':
      return itemSize === null
        ? emptyKeylineList()
        : multiBrowseKeylineList(
            availableSpace,
            itemSize,
            itemSpacing,
            itemCount,
            minSmallItemSize,
            maxSmallItemSize,
            CAROUSEL_ANCHOR_SIZE,
          );
    case 'uncontained':
      return itemSize === null
        ? emptyKeylineList()
        : uncontainedKeylineList(availableSpace, itemSize, itemSpacing, CAROUSEL_ANCHOR_SIZE);
    case 'hero':
    case 'centered-hero':
      return heroKeylineList(
        availableSpace,
        itemSize,
        itemSpacing,
        itemCount,
        layout === 'centered-hero',
        minSmallItemSize,
        maxSmallItemSize,
        CAROUSEL_ANCHOR_SIZE,
      );
  }
}

/**
 * CarouselPageSize (L488–506): the layout's keylines and the Strategy over them. Main-axis content
 * padding is the strategy's (Compose passes only the cross-axis padding to the pager).
 */
export function carouselStrategy(
  input: CarouselKeylineInput & { beforeContentPadding: number; afterContentPadding: number },
): Strategy {
  return Strategy.create(
    carouselKeylineList(input),
    input.availableSpace,
    input.itemSpacing,
    input.beforeContentPadding,
    input.afterContentPadding,
  );
}

/** The scroll range: every item end to end, less the container (L696–702). */
export function calculateMaxScrollOffset(strategy: Strategy, itemCount: number): number {
  const count = f(itemCount);
  const maxScrollPossible = f(
    f(strategy.itemMainAxisSize * count) + f(strategy.itemSpacing * f(count - 1)),
  );
  return Math.max(f(maxScrollPossible - strategy.availableSpace), 0);
}

/** How far `unadjustedOffset` is from `before` to `after`, 0–1 (L713–720). */
function getProgress(before: Keyline, after: Keyline, unadjustedOffset: number): number {
  if (keylineEquals(before, after)) return 1;
  const total = f(after.unadjustedOffset - before.unadjustedOffset);
  return f(f(unadjustedOffset - before.unadjustedOffset) / total);
}

/** One item's placement for a scroll offset (Modifier.carouselItem, L587–656). */
export interface CarouselItemLayout {
  /** The masked (visible) size along the scroll axis (CarouselItemDrawInfo.size). */
  size: number;
  /** The mask's start and end within the item's `itemMainAxisSize` box (maskRect left / right). */
  maskStart: number;
  maskEnd: number;
  /** Whether the item is clipped (the mask is not the whole item). */
  clipped: boolean;
  /** The translation along the scroll axis (physical in LTR; mirror it in RTL). */
  translation: number;
}

/**
 * Modifier.carouselItem's placement of item `index` at `scrollOffset` (L587–641; horizontal):
 * the keylines before and after the item's center, interpolated, give its mask centered in the
 * item and the translation that moves it onto the interpolated keyline (plus a small offset past
 * the first or last keyline).
 */
export function carouselItemLayout(
  strategy: Strategy,
  index: number,
  scrollOffset: number,
  maxScrollOffset: number,
): CarouselItemLayout {
  scrollOffset = f(scrollOffset);
  const keylines = strategy.getKeylineListForScrollOffset(scrollOffset, maxScrollOffset);

  const itemSizeWithSpacing = f(strategy.itemMainAxisSize + strategy.itemSpacing);
  const unadjustedCenter = f(
    f(f(index * itemSizeWithSpacing) + f(strategy.itemMainAxisSize / 2)) - scrollOffset,
  );

  const keylineBefore = keylines.getKeylineBefore(unadjustedCenter);
  const keylineAfter = keylines.getKeylineAfter(unadjustedCenter);
  const progress = getProgress(keylineBefore, keylineAfter, unadjustedCenter);
  const interpolatedKeyline = lerpKeyline(keylineBefore, keylineAfter, progress);
  const isOutOfKeylineBounds = keylineEquals(keylineBefore, keylineAfter);

  const centerX = f(strategy.itemMainAxisSize / 2);
  const halfMaskWidth = f(interpolatedKeyline.size / 2);
  const maskLeft = f(centerX - halfMaskWidth);
  const maskRight = f(centerX + halfMaskWidth);
  // Compose measures the item at itemMainAxisSize.roundToInt() (L559–575).
  const width = Math.round(strategy.itemMainAxisSize);

  let translation = f(interpolatedKeyline.offset - unadjustedCenter);
  if (isOutOfKeylineBounds) {
    const outOfBoundsOffset = f(
      f(unadjustedCenter - interpolatedKeyline.unadjustedOffset) / interpolatedKeyline.size,
    );
    translation = f(translation + outOfBoundsOffset);
  }

  return {
    size: interpolatedKeyline.size,
    maskStart: maskLeft,
    maskEnd: maskRight,
    clipped: maskLeft !== 0 || maskRight !== width,
    translation,
  };
}

/** The item a carousel at `scrollOffset` rests on: the one whose snap position is nearest. */
export function carouselCurrentItem(
  strategy: Strategy,
  itemCount: number,
  scrollOffset: number,
): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < itemCount; i++) {
    const distance = Math.abs(carouselItemScrollOffset(strategy, i, itemCount) - scrollOffset);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * The scroll offset at which item `index` rests (snapped): its end-to-end start less its snap
 * position (KeylineSnapPosition; Compose's pager scrolls the page to that position).
 */
export function carouselItemScrollOffset(
  strategy: Strategy,
  index: number,
  itemCount: number,
): number {
  const itemSizeWithSpacing = f(strategy.itemMainAxisSize + strategy.itemSpacing);
  return f(f(index * itemSizeWithSpacing) - getSnapPositionOffset(strategy, index, itemCount));
}

/** Compose's item z-index: 1 / (1 + distance from the current item) (L581–582). */
export function carouselItemZIndex(index: number, currentItem: number): number {
  return 1 / (1 + Math.abs(index - currentItem));
}
