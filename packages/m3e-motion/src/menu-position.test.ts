import { describe, expect, it } from 'vitest';
import { type MenuPositionInput, menuPosition, menuTransformOrigin } from './menu-position.js';

// Expected values are worked by hand from MenuPosition.kt / Menu.kt @19991f2c (see menu-position.ts).
const base = (over: Partial<MenuPositionInput>): MenuPositionInput => ({
  anchor: { left: 100, top: 100, right: 140, bottom: 140 },
  window: { width: 1000, height: 800 },
  menu: { width: 200, height: 300 },
  rtl: false,
  verticalMargin: 48,
  horizontalMargin: 8,
  ...over,
});

describe('menuPosition (DropdownMenuPositionProvider)', () => {
  it('below: start-aligned under the anchor, origin over the anchor', () => {
    expect(menuPosition(base({}))).toEqual({ x: 100, y: 140, originX: 0.1, originY: 0 });
  });

  it('flips above the anchor when there is no room below', () => {
    const r = menuPosition(base({ anchor: { left: 100, top: 600, right: 140, bottom: 640 } }));
    expect(r.y).toBe(300);
    expect(r.originY).toBe(1);
  });

  it('above: prefers bottomToAnchorTop, falls back to below', () => {
    const anchor = { left: 100, top: 400, right: 140, bottom: 440 };
    expect(menuPosition(base({ anchor, position: 'above' })).y).toBe(100);
    const nearTop = { left: 100, top: 60, right: 140, bottom: 100 };
    expect(menuPosition(base({ anchor: nearTop, position: 'above' })).y).toBe(100);
  });

  it('centers on the anchor top when neither side fits (centerToAnchorTop)', () => {
    const anchor = { left: 100, top: 400, right: 140, bottom: 440 };
    expect(menuPosition(base({ anchor, menu: { width: 200, height: 400 } })).y).toBe(200);
  });

  it('centers in the window when the menu is taller than the margins allow', () => {
    expect(menuPosition(base({ menu: { width: 200, height: 720 } })).y).toBe(40);
  });

  it('coerces the last candidate into the margins', () => {
    // 650 tall: no anchor candidate fits; the window-edge candidate (top) is coerced to 48.
    const anchor = { left: 100, top: 300, right: 140, bottom: 340 };
    expect(menuPosition(base({ anchor, menu: { width: 200, height: 650 } })).y).toBe(48);
  });

  it('end-aligns when the start-aligned menu would cross the right margin', () => {
    const anchor = { left: 900, top: 100, right: 940, bottom: 140 };
    expect(menuPosition(base({ anchor })).x).toBe(740);
  });

  it('RTL: start is the right edge; offset x is mirrored', () => {
    const anchor = { left: 800, top: 100, right: 840, bottom: 140 };
    expect(menuPosition(base({ anchor, rtl: true })).x).toBe(640);
    expect(menuPosition(base({ anchor, rtl: true, offset: { x: 10, y: 5 } }))).toMatchObject({
      x: 630,
      y: 145,
    });
  });

  it('end: beside the anchor, top-aligned (submenus)', () => {
    const anchor = { left: 100, top: 200, right: 300, bottom: 244 };
    const r = menuPosition(base({ anchor, menu: { width: 150, height: 100 }, position: 'end' }));
    expect(r).toEqual({ x: 300, y: 200, originX: 0, originY: 0.22 });
    const rtl = menuPosition(
      base({
        anchor: { left: 600, top: 200, right: 800, bottom: 244 },
        rtl: true,
        position: 'end',
      }),
    );
    expect(rtl.x).toBe(400);
  });

  it('baseline DropdownMenu: no horizontal margin', () => {
    const anchor = { left: 2, top: 100, right: 42, bottom: 140 };
    expect(menuPosition(base({ anchor, horizontalMargin: 0 })).x).toBe(2);
    expect(menuPosition(base({ anchor })).x).toBe(8);
  });
});

describe('menuTransformOrigin (calculateTransformOrigin)', () => {
  it('pivots on the side facing the anchor', () => {
    const anchor = { left: 100, top: 100, right: 140, bottom: 140 };
    expect(menuTransformOrigin(anchor, { left: 140, top: 140, right: 340, bottom: 440 })).toEqual({
      originX: 0,
      originY: 0,
    });
    expect(menuTransformOrigin(anchor, { left: -100, top: -200, right: 100, bottom: 100 })).toEqual(
      { originX: 1, originY: 1 },
    );
  });
});
