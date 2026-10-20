/*
 * Copyright 2022 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/MenuPosition.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/Menu.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// MenuPosition, AnchorAlignmentOffsetPosition and WindowAlignmentMarginPosition (MenuPosition.kt
// L50-L275), DropdownMenuPositionProvider.positioningLogic (L317-L392), the MenuAnchorPosition
// candidate lists (Menu.kt L1507-L1785) and calculateTransformOrigin (Menu.kt L2216-L2242). Coordinates are CSS px relative to the viewport
// ("window"); Compose works in integer px, the web keeps fractions. Alignment.align is
// BiasAlignment's `round((space - size) / 2 * (1 + bias))` (Kotlin roundToInt = Math.round).

/** Where a menu opens relative to its anchor (MenuAnchorPosition.Below…End). */
export type MenuAnchorPosition = 'below' | 'above' | 'start' | 'end' | 'left' | 'right';

export interface MenuRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface MenuPositionInput {
  /** Anchor bounds in viewport px. */
  anchor: MenuRect;
  /** Viewport (window) size in px. */
  window: { readonly width: number; readonly height: number };
  /** Untransformed menu size in px. */
  menu: { readonly width: number; readonly height: number };
  /** Layout direction of the anchor (`direction: rtl`). */
  rtl: boolean;
  /** Default `below`. */
  position?: MenuAnchorPosition | undefined;
  /** DpOffset: x is mirrored in RTL. Default 0, 0. */
  offset?: { readonly x: number; readonly y: number } | undefined;
  /** Kept from the window top/bottom (MenuVerticalMargin). */
  verticalMargin: number;
  /** Kept from the window left/right (MenuHorizontalMargin; 0 for the baseline DropdownMenu). */
  horizontalMargin: number;
}

export interface MenuPositionResult {
  /** Menu left edge in viewport px. */
  x: number;
  /** Menu top edge in viewport px. */
  y: number;
  /** Transform origin as fractions of the menu size (0 = left/top, 1 = right/bottom). */
  originX: number;
  originY: number;
}

type Horizontal = (anchor: MenuRect, width: number, menuWidth: number, rtl: boolean) => number;
type Vertical = (anchor: MenuRect, height: number, menuHeight: number) => number;

/** BiasAlignment.Horizontal.align (Start = -1, CenterHorizontally = 0, End = 1). */
const alignH = (bias: number, size: number, space: number, rtl: boolean) =>
  Math.round(((space - size) / 2) * (1 + (rtl ? -bias : bias)));
/** BiasAlignment.Vertical.align (Top = -1, CenterVertically = 0, Bottom = 1). */
const alignV = (bias: number, size: number, space: number) =>
  Math.round(((space - size) / 2) * (1 + bias));

const START = -1;
const END = 1;
const TOP = -1;
const CENTER = 0;
const BOTTOM = 1;

/** AnchorAlignmentOffsetPosition.Horizontal. */
const anchorH =
  (menuBias: number, anchorBias: number): Horizontal =>
  (anchor, _width, menuWidth, rtl) =>
    anchor.left +
    alignH(anchorBias, 0, anchor.right - anchor.left, rtl) -
    alignH(menuBias, 0, menuWidth, rtl);

/** AnchorAlignmentOffsetPosition.Vertical. */
const anchorV =
  (menuBias: number, anchorBias: number): Vertical =>
  (anchor, _height, menuHeight) =>
    anchor.top +
    alignV(anchorBias, 0, anchor.bottom - anchor.top) -
    alignV(menuBias, 0, menuHeight);

const startToAnchorStart = anchorH(START, START);
const startToAnchorEnd = anchorH(START, END);
const endToAnchorEnd = anchorH(END, END);
const endToAnchorStart = anchorH(END, START);
/** WindowAlignmentMarginPosition.Horizontal with AbsoluteAlignment.Left / Right (ignore RTL). */
const leftToWindowLeft: Horizontal = (_a, width, menuWidth) =>
  alignH(START, menuWidth, width, false);
const rightToWindowRight: Horizontal = (_a, width, menuWidth) =>
  alignH(END, menuWidth, width, false);

const topToAnchorBottom = anchorV(TOP, BOTTOM);
const topToAnchorTop = anchorV(TOP, TOP);
const bottomToAnchorTop = anchorV(BOTTOM, TOP);
const bottomToAnchorBottom = anchorV(BOTTOM, BOTTOM);
const centerToAnchorTop = anchorV(CENTER, TOP);
const topToWindowTop: Vertical = (_a, height, menuHeight) => alignV(TOP, menuHeight, height);
const bottomToWindowBottom: Vertical = (_a, height, menuHeight) =>
  alignV(BOTTOM, menuHeight, height);

const centerX = (r: MenuRect) => (r.left + r.right) / 2;
const centerY = (r: MenuRect) => (r.top + r.bottom) / 2;

/** The window-edge fallback every MenuAnchorPosition ends its x list with. */
const windowX = (anchor: MenuRect, width: number) =>
  centerX(anchor) < width / 2 ? leftToWindowLeft : rightToWindowRight;
const windowY = (anchor: MenuRect, height: number) =>
  centerY(anchor) < height / 2 ? topToWindowTop : bottomToWindowBottom;

/** MenuAnchorPosition.{Below, Above, Left, Right, Start, End}: candidate x and y lists, in order. */
function candidates(
  position: MenuAnchorPosition,
  anchor: MenuRect,
  width: number,
  height: number,
): [Horizontal[], Vertical[]] {
  const wx = windowX(anchor, width);
  const wy = windowY(anchor, height);
  switch (position) {
    case 'above':
      return [
        [startToAnchorStart, endToAnchorEnd, wx],
        [bottomToAnchorTop, topToAnchorBottom, centerToAnchorTop, wy],
      ];
    // Left and Start (Right and End) list the same candidates; Start/End resolve against the
    // layout direction inside the candidates, Left/Right too (Menu.kt keeps them identical).
    case 'left':
    case 'start':
      return [
        [endToAnchorStart, startToAnchorEnd, wx],
        [topToAnchorTop, bottomToAnchorBottom, wy],
      ];
    case 'right':
    case 'end':
      return [
        [startToAnchorEnd, endToAnchorStart, wx],
        [topToAnchorTop, bottomToAnchorBottom, wy],
      ];
    // 'below' (unrecognized values too).
    default:
      return [
        [startToAnchorStart, endToAnchorEnd, wx],
        [topToAnchorBottom, bottomToAnchorTop, centerToAnchorTop, wy],
      ];
  }
}

const coerceIn = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** First candidate that fits between the margins; else the last one coerced (or centered). */
function pick(
  values: readonly number[],
  size: number,
  space: number,
  margin: number,
  center: () => number,
): number {
  for (const [i, candidate] of values.entries()) {
    if (candidate >= margin && candidate + size <= space - margin) return candidate;
    if (i === values.length - 1) {
      return size >= space - 2 * margin
        ? center()
        : coerceIn(candidate, margin, space - margin - size);
    }
  }
  return 0;
}

/** calculateTransformOrigin (Menu.kt L2216). */
export function menuTransformOrigin(
  anchor: MenuRect,
  menu: MenuRect,
): { originX: number; originY: number } {
  const menuWidth = menu.right - menu.left;
  const menuHeight = menu.bottom - menu.top;
  const originX =
    menu.left >= anchor.right
      ? 0
      : menu.right <= anchor.left
        ? 1
        : menuWidth === 0
          ? 0
          : ((Math.max(anchor.left, menu.left) + Math.min(anchor.right, menu.right)) / 2 -
              menu.left) /
            menuWidth;
  const originY =
    menu.top >= anchor.bottom
      ? 0
      : menu.bottom <= anchor.top
        ? 1
        : menuHeight === 0
          ? 0
          : ((Math.max(anchor.top, menu.top) + Math.min(anchor.bottom, menu.bottom)) / 2 -
              menu.top) /
            menuHeight;
  return { originX, originY };
}

/**
 * Where Compose's DropdownMenuPositionProvider places a menu: the first x and y candidates of the
 * MenuAnchorPosition that keep the menu inside the window margins (below the anchor, then above it,
 * then centered on its top, then against the nearer window edge), plus the transform origin the
 * open/close scale animates from.
 */
export function menuPosition(input: MenuPositionInput): MenuPositionResult {
  const { anchor, window: win, menu, rtl, verticalMargin, horizontalMargin } = input;
  const offset = input.offset ?? { x: 0, y: 0 };
  const [xs, ys] = candidates(input.position ?? 'below', anchor, win.width, win.height);
  const offsetX = offset.x * (rtl ? -1 : 1);
  const x = pick(
    xs.map((c) => c(anchor, win.width, menu.width, rtl) + offsetX),
    menu.width,
    win.width,
    horizontalMargin,
    () => alignH(CENTER, menu.width, win.width, rtl),
  );
  const y = pick(
    ys.map((c) => c(anchor, win.height, menu.height) + offset.y),
    menu.height,
    win.height,
    verticalMargin,
    () => alignV(CENTER, menu.height, win.height),
  );
  return {
    x,
    y,
    ...menuTransformOrigin(anchor, {
      left: x,
      top: y,
      right: x + menu.width,
      bottom: y + menu.height,
    }),
  };
}
