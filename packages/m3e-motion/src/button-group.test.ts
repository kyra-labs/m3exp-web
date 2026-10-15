import { describe, expect, it } from 'vitest';
import { buttonGroupVisibleCount, buttonGroupWidths } from './button-group.js';

// Expected values are worked by hand from ButtonGroup.kt @19991f2c (see button-group.ts).
const items = (...widths: number[]) => widths.map((width) => ({ width, compressionLimit: 16 }));
const sum = (a: readonly number[]) => a.reduce((s, w) => s + w, 0);

describe('buttonGroupWidths (expand/compress pass)', () => {
  it('leaves resting items alone', () => {
    expect(buttonGroupWidths(items(80, 100, 120), [0, 0, 0], 0.15)).toEqual([80, 100, 120]);
  });

  it('a pressed middle item takes ratio × width / 2 from each neighbor', () => {
    // 0.15 × 100 / 2 = 7.5 < 16 on each side.
    const w = buttonGroupWidths(items(80, 100, 120), [0, 1, 0], 0.15);
    expect(w).toEqual([72.5, 115, 112.5]);
    expect(sum(w)).toBe(300);
  });

  it('the first and last items take ratio × width from their only neighbor', () => {
    expect(buttonGroupWidths(items(80, 100, 120), [1, 0, 0], 0.15)).toEqual([92, 88, 120]);
    expect(buttonGroupWidths(items(80, 100, 120), [0, 0, 1], 0.15)).toEqual([80, 84, 136]);
  });

  it("the neighbors' compression limits cap the growth", () => {
    // 0.15 × 300 = 45 > 16: capped at the next item's limit.
    expect(buttonGroupWidths(items(300, 100), [1, 0], 0.15)).toEqual([316, 84]);
    const limited = [
      { width: 80, compressionLimit: 4 },
      { width: 200, compressionLimit: 16 },
      { width: 80, compressionLimit: 16 },
    ];
    // min(0.15 × 200 / 2 = 15, 4, 16) = 4 on both sides.
    expect(buttonGroupWidths(limited, [0, 1, 0], 0.15)).toEqual([76, 208, 76]);
  });

  it('scales with the animation value, including spring overshoot', () => {
    expect(buttonGroupWidths(items(80, 100, 120), [0, 0.5, 0], 0.15)).toEqual([
      76.25, 107.5, 116.25,
    ]);
    const over = buttonGroupWidths(items(80, 100, 120), [0, 1.2, 0], 0.15);
    expect(over[1]).toBeCloseTo(118, 10);
    const under = buttonGroupWidths(items(80, 100, 120), [0, -0.1, 0], 0.15);
    expect(under[1]).toBeCloseTo(98.5, 10);
    expect(sum(under)).toBeCloseTo(300, 10);
  });

  it('processes items in order on the running widths (two pressed items)', () => {
    // Item 0 grows by min(12, 16) = 12 from item 1 (100 → 88); item 1 then grows by
    // 0.15 × 88 / 2 = 6.6 on each side.
    const w = buttonGroupWidths(items(80, 100, 120), [1, 1, 0], 0.15);
    expect(w[0]).toBeCloseTo(85.4, 10);
    expect(w[1]).toBeCloseTo(101.2, 10);
    expect(w[2]).toBeCloseTo(113.4, 10);
    expect(sum(w)).toBeCloseTo(300, 10);
  });

  it('only visible items take part; a lone item cannot grow from nothing', () => {
    // Two visible: item 1 is the last visible item, so it takes from item 0 only.
    expect(buttonGroupWidths(items(80, 100, 120), [0, 1, 0], 0.15, 2)).toEqual([65, 115]);
    expect(buttonGroupWidths(items(80), [1], 0.15)).toEqual([80]);
  });
});

describe('buttonGroupVisibleCount (overflow)', () => {
  it('shows every item when they fit with their spacing', () => {
    expect(buttonGroupVisibleCount([80, 100, 120], 12, 324, 40)).toBe(3);
  });

  it('reserves the overflow indicator and fits items before it', () => {
    // 323 < 324 needed: 323 − 40 = 283 → 80 fits (283 − 92 = 191), 100 fits (191 − 112 = 79),
    // 120 does not.
    expect(buttonGroupVisibleCount([80, 100, 120], 12, 323, 40)).toBe(2);
    expect(buttonGroupVisibleCount([80, 100, 120], 12, 119, 40)).toBe(0);
    expect(buttonGroupVisibleCount([80, 100, 120], 12, 120, 40)).toBe(1);
  });
});
