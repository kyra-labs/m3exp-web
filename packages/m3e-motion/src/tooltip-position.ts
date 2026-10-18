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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/Tooltip.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// TooltipPositionProviderImpl (Tooltip.kt L898-L1051: rememberTooltipPositionProvider with a
// TooltipAnchorPosition), caretX (L1164-L1190) and the caret placement of Modifier.layoutCaret
// (L1192-L1335) as the position and direction of DefaultTooltipCaretShape's apex. Coordinates are
// CSS px relative to the viewport ("window"); Compose works in integer px (its `/ 2` truncates),
// the web keeps fractions.

/** Where a tooltip is placed relative to its anchor (TooltipAnchorPosition.Above…End). */
export type TooltipAnchorPosition = 'above' | 'below' | 'left' | 'right' | 'start' | 'end';

export interface TooltipRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface TooltipPositionInput {
  /** Anchor bounds in viewport px. */
  anchor: TooltipRect;
  /** Viewport (LocalWindowInfo.containerSize) in px. */
  window: { readonly width: number; readonly height: number };
  /** Untransformed tooltip size in px (the popup content size). */
  tooltip: { readonly width: number; readonly height: number };
  /** Layout direction (`direction: rtl`): Start / End resolve against it. */
  rtl: boolean;
  /** Default `above` (TooltipAnchorPosition.Above; unrecognized values too). */
  position?: TooltipAnchorPosition | undefined;
  /** SpacingBetweenTooltipAndAnchor. */
  spacing: number;
}

const coerceIn = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

type Side = 'left' | 'right' | 'above' | 'below';

/** Start / End resolve to Left / Right in LTR and Right / Left in RTL (start/endPositioning). */
const side = (position: TooltipAnchorPosition | undefined, rtl: boolean): Side => {
  switch (position) {
    case 'left':
    case 'right':
    case 'below':
      return position;
    case 'start':
      return rtl ? 'right' : 'left';
    case 'end':
      return rtl ? 'left' : 'right';
    default:
      return 'above';
  }
};

/**
 * Where Compose's TooltipPositionProviderImpl places a tooltip (its top-left corner): Above /
 * Below center it on the anchor (kept inside the window) and flip to the other side when it would
 * leave the window; Left / Right / Start / End center it vertically and flip horizontally.
 */
export function tooltipPosition(input: TooltipPositionInput): { x: number; y: number } {
  const { anchor, window: win, tooltip, spacing } = input;
  const maxX = Math.max(0, win.width - tooltip.width);
  const maxY = Math.max(0, win.height - tooltip.height);
  switch (side(input.position, input.rtl)) {
    case 'left': {
      // Horizontal alignment preference: left -> right. Vertical preference: center.
      let x = anchor.left - (tooltip.width + spacing);
      if (x < 0) x = anchor.right + spacing;
      const y = (anchor.top + anchor.bottom - tooltip.height) / 2;
      return { x: coerceIn(x, 0, maxX), y: coerceIn(y, 0, maxY) };
    }
    case 'right': {
      // Horizontal alignment preference: right -> left. Vertical preference: center.
      let x = anchor.right + spacing;
      if (x + tooltip.width > win.width) x = anchor.left - (tooltip.width + spacing);
      const y = (anchor.top + anchor.bottom - tooltip.height) / 2;
      return { x: coerceIn(x, 0, maxX), y: coerceIn(y, 0, maxY) };
    }
    case 'below': {
      // Horizontal: centered (kept inside the window). Vertical preference: below -> above.
      const x = anchor.left + (anchor.right - anchor.left - tooltip.width) / 2;
      let y = anchor.bottom + spacing;
      if (y + tooltip.height > win.height) y = anchor.top - tooltip.height - spacing;
      return { x: coerceIn(x, 0, maxX), y: coerceIn(y, 0, maxY) };
    }
    case 'above': {
      // Horizontal: centered (kept inside the window). Vertical preference: above -> below.
      const x = anchor.left + (anchor.right - anchor.left - tooltip.width) / 2;
      let y = anchor.top - tooltip.height - spacing;
      if (y < 0) y = anchor.bottom + spacing;
      return { x: coerceIn(x, 0, maxX), y: coerceIn(y, 0, maxY) };
    }
  }
}

/**
 * caretX (Tooltip.kt L1164): the caret's x inside an above / below tooltip. Centered on the tooltip
 * when it fits centered on the anchor; otherwise Compose returns the anchor's center in window
 * coordinates plus a correction (as upstream, not converted to tooltip coordinates).
 */
export function tooltipCaretX(tooltipWidth: number, windowWidth: number, anchor: TooltipRect) {
  const anchorMid = (anchor.left + anchor.right) / 2;
  if (tooltipWidth >= windowWidth) return anchorMid;
  if (anchorMid - tooltipWidth / 2 < 0) {
    return anchorMid + Math.max(tooltipWidth - windowWidth, -anchor.left);
  }
  if (anchorMid + tooltipWidth / 2 > windowWidth) {
    return anchorMid + Math.min(tooltipWidth - anchor.right, 0);
  }
  return tooltipWidth / 2;
}

/** The direction DefaultTooltipCaretShape's apex points (towards the anchor). */
export type TooltipCaretDirection = 'up' | 'down' | 'left' | 'right';

export interface TooltipCaretInput {
  /** Anchor bounds in viewport px. */
  anchor: TooltipRect;
  /** The placed tooltip's bounds in viewport px (untransformed). */
  tooltip: TooltipRect;
  /** Viewport width in px. */
  windowWidth: number;
  /** The TooltipAnchorPosition the tooltip was placed with. */
  position?: TooltipAnchorPosition | undefined;
}

export interface TooltipCaret {
  /** The middle of the caret's base, in tooltip px from its top-left corner. */
  x: number;
  y: number;
  direction: TooltipCaretDirection;
}

/**
 * Modifier.layoutCaret: where the caret's base sits on the tooltip and which way its apex points.
 * Above / Below tooltips get it on the edge facing the anchor at tooltipCaretX; Left / Right /
 * Start / End ones at the vertical middle of the edge facing the anchor (the transformation matrix
 * rotates the downward caret path by ±90° or flips it, which reduces to these four directions in
 * either layout direction).
 */
export function tooltipCaret(input: TooltipCaretInput): TooltipCaret {
  const { anchor, tooltip, windowWidth } = input;
  const width = tooltip.right - tooltip.left;
  const height = tooltip.bottom - tooltip.top;
  const isBelow = tooltip.top > anchor.top;
  const isToTheRight = tooltip.left > anchor.left;
  const horizontal =
    input.position !== undefined && /^(left|right|start|end)$/.test(input.position);
  if (horizontal) {
    return isToTheRight
      ? { x: 0, y: height / 2, direction: 'left' }
      : { x: width, y: height / 2, direction: 'right' };
  }
  return {
    x: tooltipCaretX(width, windowWidth, anchor),
    y: isBelow ? 0 : height,
    direction: isBelow ? 'up' : 'down',
  };
}
