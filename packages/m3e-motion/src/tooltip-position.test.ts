import { describe, expect, it } from 'vitest';
import {
  type TooltipPositionInput,
  tooltipCaret,
  tooltipCaretX,
  tooltipPosition,
} from './tooltip-position.js';

// Expected values are worked by hand from Tooltip.kt @19991f2c (see tooltip-position.ts):
// TooltipPositionProviderImpl with SpacingBetweenTooltipAndAnchor = 4, a 48 × 48 anchor.
const base = (over: Partial<TooltipPositionInput>): TooltipPositionInput => ({
  anchor: { left: 100, top: 100, right: 148, bottom: 148 },
  window: { width: 400, height: 800 },
  tooltip: { width: 120, height: 24 },
  rtl: false,
  spacing: 4,
  ...over,
});

describe('tooltipPosition (TooltipPositionProviderImpl)', () => {
  it('above (the default): centered on the anchor, spacing above it', () => {
    // x = 100 + (48 − 120) / 2 = 64; y = 100 − 24 − 4 = 72.
    expect(tooltipPosition(base({}))).toEqual({ x: 64, y: 72 });
    expect(tooltipPosition(base({ position: 'above' }))).toEqual({ x: 64, y: 72 });
  });

  it('above flips below when it would leave the window top', () => {
    const anchor = { left: 100, top: 10, right: 148, bottom: 58 };
    // y = 10 − 28 < 0 → 58 + 4.
    expect(tooltipPosition(base({ anchor }))).toEqual({ x: 64, y: 62 });
  });

  it('below: spacing under the anchor; flips above at the window bottom', () => {
    expect(tooltipPosition(base({ position: 'below' }))).toEqual({ x: 64, y: 152 });
    const anchor = { left: 100, top: 760, right: 148, bottom: 808 };
    // 812 + 24 > 800 → 760 − 24 − 4 = 732.
    expect(tooltipPosition(base({ anchor, position: 'below' }))).toEqual({ x: 64, y: 732 });
  });

  it('keeps above / below tooltips inside the window horizontally (coerceIn)', () => {
    const nearLeft = { left: 8, top: 100, right: 56, bottom: 148 };
    expect(tooltipPosition(base({ anchor: nearLeft })).x).toBe(0);
    const nearRight = { left: 344, top: 100, right: 392, bottom: 148 };
    expect(tooltipPosition(base({ anchor: nearRight })).x).toBe(280);
    // Wider than the window: coerceIn(x, 0, max(0, …)) pins it to 0.
    expect(tooltipPosition(base({ tooltip: { width: 500, height: 24 } })).x).toBe(0);
  });

  it('left: before the anchor, vertically centered; flips right at the window edge', () => {
    // x = 100 − (120 + 4) = −24 < 0 → 148 + 4 = 152; y = (100 + 148 − 24) / 2 = 112.
    expect(tooltipPosition(base({ position: 'left' }))).toEqual({ x: 152, y: 112 });
    const anchor = { left: 200, top: 100, right: 248, bottom: 148 };
    expect(tooltipPosition(base({ anchor, position: 'left' }))).toEqual({ x: 76, y: 112 });
  });

  it('right: after the anchor; flips left when it would leave the window', () => {
    expect(tooltipPosition(base({ position: 'right' }))).toEqual({ x: 152, y: 112 });
    const anchor = { left: 300, top: 100, right: 348, bottom: 148 };
    // 352 + 120 > 400 → 300 − 124 = 176.
    expect(tooltipPosition(base({ anchor, position: 'right' }))).toEqual({ x: 176, y: 112 });
  });

  it('left / right: the vertical center is kept inside the window', () => {
    const anchor = { left: 200, top: 0, right: 248, bottom: 10 };
    expect(tooltipPosition(base({ anchor, position: 'right' })).y).toBe(0);
  });

  it('start / end resolve against the layout direction', () => {
    const anchor = { left: 200, top: 100, right: 248, bottom: 148 };
    const left = tooltipPosition(base({ anchor, position: 'left' }));
    const right = tooltipPosition(base({ anchor, position: 'right' }));
    expect(tooltipPosition(base({ anchor, position: 'start' }))).toEqual(left);
    expect(tooltipPosition(base({ anchor, position: 'end' }))).toEqual(right);
    expect(tooltipPosition(base({ anchor, position: 'start', rtl: true }))).toEqual(right);
    expect(tooltipPosition(base({ anchor, position: 'end', rtl: true }))).toEqual(left);
  });
});

describe('tooltipCaretX (caretX)', () => {
  const anchor = { left: 100, top: 100, right: 148, bottom: 148 };

  it('centered on the tooltip when it fits centered on the anchor', () => {
    expect(tooltipCaretX(120, 400, anchor)).toBe(60);
  });

  it('as wide as the window: the anchor center', () => {
    expect(tooltipCaretX(400, 400, anchor)).toBe(124);
  });

  it('start-aligned near the left edge: anchor center + max(width − window, −anchor left)', () => {
    // anchorMid 32, 32 − 60 < 0; correction max(120 − 400, −8) = −8 → 24 (upstream arithmetic).
    expect(tooltipCaretX(120, 400, { left: 8, top: 0, right: 56, bottom: 48 })).toBe(24);
  });

  it('end-aligned near the right edge: anchor center + min(width − anchor right, 0)', () => {
    // anchorMid 368, 368 + 60 > 400; correction min(120 − 392, 0) = −272 → 96.
    expect(tooltipCaretX(120, 400, { left: 344, top: 0, right: 392, bottom: 48 })).toBe(96);
  });
});

describe('tooltipCaret (Modifier.layoutCaret)', () => {
  const anchor = { left: 100, top: 100, right: 148, bottom: 148 };

  it('above: on the bottom edge, pointing down', () => {
    const tooltip = { left: 64, top: 72, right: 184, bottom: 96 };
    expect(tooltipCaret({ anchor, tooltip, windowWidth: 400, position: 'above' })).toEqual({
      x: 60,
      y: 24,
      direction: 'down',
    });
  });

  it('below: on the top edge, pointing up (rotateX(180))', () => {
    const tooltip = { left: 64, top: 152, right: 184, bottom: 176 };
    expect(tooltipCaret({ anchor, tooltip, windowWidth: 400, position: 'below' })).toEqual({
      x: 60,
      y: 0,
      direction: 'up',
    });
  });

  it('left / start / end / right: the middle of the edge facing the anchor', () => {
    const before = { left: 0, top: 112, right: 96, bottom: 136 };
    const after = { left: 152, top: 112, right: 272, bottom: 136 };
    for (const position of ['left', 'right', 'start', 'end'] as const) {
      expect(tooltipCaret({ anchor, tooltip: before, windowWidth: 400, position })).toEqual({
        x: 96,
        y: 12,
        direction: 'right',
      });
      expect(tooltipCaret({ anchor, tooltip: after, windowWidth: 400, position })).toEqual({
        x: 0,
        y: 12,
        direction: 'left',
      });
    }
  });
});
