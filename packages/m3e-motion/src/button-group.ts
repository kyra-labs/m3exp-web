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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/ButtonGroup.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// ButtonGroupMeasurePolicy.measure (L549-L812): how many items fit before the overflow indicator
// (L680-L716) and the expand/compress pass that grows a pressed item and shrinks its neighbors
// (L720-L770). Widths are CSS px; Compose rounds each growth to whole device px (roundToInt), the
// web keeps fractions so the animation does not step.

export interface ButtonGroupItemSize {
  /** Resting width (Compose: the item's max intrinsic width). */
  readonly width: number;
  /**
   * Most this item may be compressed by a pressed neighbor (Compose `compressionLimit`: the end
   * content padding of the item, `ButtonDefaults.ContentPadding` by default).
   */
  readonly compressionLimit: number;
}

/**
 * Number of leading items that fit in `maxWidth` (ButtonGroupMeasurePolicy L688-L716). When all
 * items and their spacing fit, every item shows; otherwise the overflow indicator's width is
 * reserved and items are added while each one fits in what is left (each after the first also
 * pays one `spacing`, the gap before the next item or the indicator).
 */
export function buttonGroupVisibleCount(
  widths: readonly number[],
  spacing: number,
  maxWidth: number,
  overflowWidth: number,
): number {
  const desired = widths.reduce((sum, w) => sum + w, 0) + spacing * (widths.length - 1);
  if (desired <= maxWidth) return widths.length;
  let remaining = maxWidth - overflowWidth;
  let last = 0;
  while (last < widths.length && widths[last]! <= remaining) {
    remaining -= widths[last++]! + spacing;
  }
  return last;
}

/**
 * Widths of the visible items while some are pressed (ButtonGroupMeasurePolicy L720-L770).
 * `pressed[i]` is item i's press animation value (0 at rest, 1 fully expanded; it overshoots on a
 * bouncy spring). A pressed middle item grows by `pressed × min(expandedRatio × width / 2, both
 * neighbors' compression limits)` on each side, taken from each neighbor; the first and last items
 * grow by `pressed × min(expandedRatio × width, neighbor's limit)` taken from their only neighbor.
 * Items are processed in order on the running widths, as Compose does, so the total width stays
 * constant. `visibleCount` is the number of items shown (the rest are in the overflow menu).
 */
export function buttonGroupWidths(
  items: readonly ButtonGroupItemSize[],
  pressed: readonly number[],
  expandedRatio: number,
  visibleCount: number = items.length,
): number[] {
  const widths = items.map((item) => item.width);
  const last = Math.min(visibleCount, items.length);
  if (items.length <= 1) return widths.slice(0, last);
  for (let index = 0; index < last; index++) {
    const value = pressed[index] ?? 0;
    if (value === 0) continue;
    let growth: number;
    if (index >= 1 && index < last - 1) {
      // A middle item compresses both neighbors.
      const target =
        value *
        Math.min(
          (expandedRatio * widths[index]!) / 2,
          items[index - 1]!.compressionLimit,
          items[index + 1]!.compressionLimit,
        );
      const left = Math.min(target, widths[index - 1]!);
      const right = Math.min(target, widths[index + 1]!);
      widths[index - 1]! -= left;
      widths[index + 1]! -= right;
      growth = left + right;
    } else if (index === 0) {
      // The first item compresses the next one.
      const target =
        value * Math.min(expandedRatio * widths[index]!, items[index + 1]!.compressionLimit);
      const right = Math.min(target, widths[index + 1]!);
      widths[index + 1]! -= right;
      growth = right;
    } else {
      // The last item compresses the previous one.
      const target =
        value * Math.min(expandedRatio * widths[index]!, items[index - 1]!.compressionLimit);
      const left = Math.min(target, widths[index - 1]!);
      widths[index - 1]! -= left;
      growth = left;
    }
    widths[index]! += growth;
  }
  return widths.slice(0, last);
}
