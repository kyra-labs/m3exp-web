import { type Locator, expect } from '@playwright/test';

// Shared checks for the badges built into navigation items and tabs (M9 B2): Compose BadgedBox
// placement (Badge.kt L107-125) relative to the anchor, before any ruler clamps it.

export interface Placement {
  /** The badge's offset from the anchor's top-end corner (logical: positive = towards the end). */
  end: number;
  top: number;
  width: number;
  height: number;
  /** The badge's end edge beyond the bounding item's end edge (≤ 0 inside). */
  overflow: number;
}

/** Where `badge` sits on its badged box's anchor, and how far it reaches past `bounds`. */
export const placement = (badge: Locator, bounds: string): Promise<Placement> =>
  badge.evaluate((node, selector) => {
    const anchor = node.parentElement!.firstElementChild!.getBoundingClientRect();
    const b = node.getBoundingClientRect();
    const item = node.closest(selector)!.getBoundingClientRect();
    const rtl = getComputedStyle(node).direction === 'rtl';
    return {
      end: rtl ? anchor.left - b.left : b.right - anchor.right,
      top: b.top - anchor.top,
      width: b.width,
      height: b.height,
      overflow: rtl ? item.left - b.left : b.right - item.right,
    };
  }, bounds);

/**
 * Compose's placement: the dot 6dp inside the corner; text 12dp in, 2dp above — or, with
 * `rulers`, moved back so it ends at the bounding item's end edge when it would cross it.
 * `overlap` replaces the inline overlap on the anchor for both (a stacked tab's icon: 6dp,
 * m3.material.io Tabs › Specs, D20 (1)); the vertical offsets stay Compose's.
 */
export async function expectComposePlacement(
  badge: Locator,
  bounds: string,
  { rulers = false, overlap }: { rulers?: boolean; overlap?: number } = {},
): Promise<void> {
  const p = await placement(badge, bounds);
  const large = await badge.evaluate((el) => el.classList.contains('m3e-badge--large'));
  const inside = overlap ?? (large ? 12 : 6);
  const clamped = rulers && p.end < p.width - inside - 0.05;
  // (WebKit lays out in 1/64 px: allow a subpixel.)
  if (clamped) expect(p.overflow).toBeCloseTo(0, 0);
  if (large) {
    expect(p.height).toBeCloseTo(16, 1);
    expect(p.width).toBeGreaterThanOrEqual(16);
    if (!clamped) expect(p.end).toBeCloseTo(p.width - inside, 1);
    expect(p.top).toBeCloseTo(-2, 1);
  } else {
    expect(p.width).toBeCloseTo(6, 1);
    expect(p.height).toBeCloseTo(6, 1);
    if (!clamped) expect(p.end).toBeCloseTo(p.width - inside, 1);
    expect(p.top).toBeCloseTo(0, 1);
  }
}
