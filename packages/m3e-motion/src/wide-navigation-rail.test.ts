import { describe, expect, it } from 'vitest';
import { springDurationMillis, springValue, springVelocity } from './spring.js';
import {
  MODAL_RAIL_EXPANDED_PROGRESS,
  WideNavigationRailAnimation,
  type WideNavigationRailMetrics,
  type WideNavigationRailSpecs,
  wideNavigationRailItemWidth,
  wideNavigationRailWidth,
} from './wide-navigation-rail.js';

// MotionScheme.expressive() (ExpressiveMotionTokens.kt@19991f2c, generated) and the springs
// WideNavigationRail.kt / NavigationItem.kt read (navigation-defaults.css, PARITY.md).
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };
const FAST_SPATIAL = { dampingRatio: 0.6, stiffness: 800 };
const DEFAULT_EFFECTS = { dampingRatio: 1, stiffness: 1600 };
const SPECS: WideNavigationRailSpecs = {
  width: DEFAULT_SPATIAL,
  modalWidth: FAST_SPATIAL,
  iconPosition: DEFAULT_SPATIAL,
  position: DEFAULT_EFFECTS,
  scrim: DEFAULT_EFFECTS,
  slide: DEFAULT_SPATIAL,
};
// NavigationRail*Tokens.kt@19991f2c and WideNavigationRail.kt (WNRItemHorizontalPadding L1678).
const METRICS: WideNavigationRailMetrics = {
  collapsedWidth: 96,
  expandedMinWidth: 220,
  expandedMaxWidth: 360,
  itemHorizontalPadding: 20,
  iconSize: 24,
  iconLabelSpace: 8,
  collapsedIndicatorPadding: 16,
  expandedIndicatorPadding: 16,
};

describe('WideNavigationRailAnimation (non-modal)', () => {
  it('runs width, spacing and icon position on the default spatial spring together', () => {
    const a = new WideNavigationRailAnimation({ expanded: false });
    a.setExpanded(true, SPECS, 1000);
    for (const t of [0, 16, 48, 160, 320]) {
      const s = a.sample(1000 + t);
      const expected = springValue(DEFAULT_SPATIAL, t, 0, 1);
      expect(s.item).toBeCloseTo(Math.max(expected, 0), 6);
      expect(s.width).toBeCloseTo(expected, 6);
      expect(s.layout).toBeCloseTo(expected, 6);
      expect(s.open).toBe(false);
    }
    // The expressive spatial spring overshoots.
    let peak = 0;
    for (let t = 0; t < 1000; t += 4) peak = Math.max(peak, a.sample(1000 + t).width);
    expect(peak).toBeGreaterThan(1);
    expect(a.sample(5000)).toMatchObject({ item: 1, width: 1, layout: 1, running: false });
  });

  it('is interruptible: collapsing keeps the value and velocity', () => {
    const a = new WideNavigationRailAnimation({ expanded: false });
    a.setExpanded(true, SPECS, 0);
    a.setExpanded(false, SPECS, 100);
    const from = springValue(DEFAULT_SPATIAL, 100, 0, 1);
    const velocity = springVelocity(DEFAULT_SPATIAL, 100, 0, 1);
    for (const t of [16, 32, 64]) {
      expect(a.sample(100 + t).width).toBeCloseTo(
        springValue(DEFAULT_SPATIAL, t, from, 0, velocity),
        6,
      );
    }
    // Still moving outward right after the reversal.
    expect(a.sample(116).width).toBeGreaterThan(from);
  });

  it('jumps without specs (reduced motion) and snaps', () => {
    const a = new WideNavigationRailAnimation({ expanded: false });
    a.setExpanded(true, { ...SPECS, width: null, iconPosition: null }, 0);
    expect(a.sample(0)).toMatchObject({ item: 1, width: 1, running: false });
    a.snapTo(false);
    expect(a.sample(1)).toMatchObject({ item: 0, width: 0, layout: 0 });
  });
});

describe('WideNavigationRailAnimation (modal)', () => {
  it('opens the window once positionProgress > 0 and expands its rail from 0.3', () => {
    const a = new WideNavigationRailAnimation({ expanded: false, modal: true });
    a.setExpanded(true, SPECS, 0);
    expect(a.sample(0)).toMatchObject({ open: false, width: 0 });
    // positionProgress on the default effects spring; find when it reaches 0.3.
    let cross = 0;
    while (springValue(DEFAULT_EFFECTS, cross, 0, 1) < MODAL_RAIL_EXPANDED_PROGRESS) cross += 1;
    const early = a.sample(cross - 1);
    expect(early.open).toBe(true);
    expect(early.width).toBe(0);
    expect(early.scrim).toBe(0);
    // The items follow the state immediately.
    expect(early.item).toBeCloseTo(springValue(DEFAULT_SPATIAL, cross - 1, 0, 1), 6);
    a.sample(cross);
    // From the crossing frame the window rail widens on the fast spatial spring and the scrim fades.
    const later = a.sample(cross + 32);
    expect(later.width).toBeCloseTo(springValue(FAST_SPATIAL, 32, 0, 1), 6);
    expect(later.layout).toBeCloseTo(springValue(DEFAULT_SPATIAL, 32, 0, 1), 6);
    expect(later.scrim).toBeCloseTo(springValue(DEFAULT_EFFECTS, 32, 0, 1), 6);
    expect(a.sample(3000)).toMatchObject({ open: true, width: 1, scrim: 1, running: false });
  });

  it('drops the window when positionProgress reaches 0, the items still moving', () => {
    const a = new WideNavigationRailAnimation({ expanded: true, modal: true });
    expect(a.sample(0)).toMatchObject({ open: true, width: 1, item: 1, scrim: 1 });
    a.setExpanded(false, SPECS, 0);
    const closeAt = springDurationMillis(DEFAULT_EFFECTS, 1, 0, 0, 0.01);
    expect(a.sample(closeAt - 1).open).toBe(true);
    const closed = a.sample(closeAt);
    expect(closed.open).toBe(false);
    expect(closed.width).toBe(0);
    expect(closed.scrim).toBe(0);
    expect(closed.item).toBeGreaterThan(0);
    expect(closed.running).toBe(true);
  });

  it('hideOnCollapse slides the expanded rail in and closes after sliding out', () => {
    const a = new WideNavigationRailAnimation({
      expanded: false,
      modal: true,
      hideOnCollapse: true,
    });
    expect(a.sample(0)).toMatchObject({ open: false, item: 1, width: 1, slide: 0 });
    a.setExpanded(true, SPECS, 0);
    const s = a.sample(48);
    expect(s.open).toBe(true);
    expect(s.slide).toBeCloseTo(springValue(DEFAULT_SPATIAL, 48, 0, 1), 6);
    expect(s.scrim).toBeCloseTo(springValue(DEFAULT_EFFECTS, 48, 0, 1), 6);
    a.sample(3000);
    a.setExpanded(false, SPECS, 3000);
    const slideOut = springDurationMillis(DEFAULT_SPATIAL, 1, 0, 0, 0.01 / 360);
    // The window stays while the rail slides out, then positionProgress runs down.
    expect(a.sample(3000 + slideOut - 1).open).toBe(true);
    expect(a.sample(3000 + slideOut).slide).toBe(0);
    expect(a.sample(3000 + slideOut + 1).open).toBe(true);
    expect(a.sample(6000)).toMatchObject({ open: false, running: false });
  });
});

describe('wideNavigationRailWidth (WideNavigationRailLayout measure policy)', () => {
  const narrow = [24 + 8 + 40 + 32, 24 + 8 + 50 + 32]; // short labels: widest item 162 + 20 < 220
  const wide = [24 + 8 + 180 + 32]; // a long label: 244 + 20 + 20 = 284 expanded

  it('expands narrow items on minWidth (96 → 220)', () => {
    for (const p of [0, 0.25, 0.5, 1]) {
      const { width } = wideNavigationRailWidth({
        expanded: true,
        widthProgress: p,
        itemProgress: p,
        items: narrow,
        header: 72,
        previousWidth: 96,
        wide: false,
        metrics: METRICS,
      });
      expect(width).toBeCloseTo(96 + 124 * p, 6);
    }
  });

  it('expands wide items on widthFullRange (96 → 360) up to the widest item', () => {
    const at = (p: number) =>
      wideNavigationRailWidth({
        expanded: true,
        widthProgress: p,
        itemProgress: p,
        items: wide,
        header: 0,
        previousWidth: 96,
        wide: false,
        metrics: METRICS,
      });
    // Each frame measures the item at lerp(widthTop, widthStart(p), p) + padding: while that is
    // narrower than the expanded minimum the rail follows minWidth, then widthFullRange.
    const item = (p: number) => wideNavigationRailItemWidth(wide[0]!, p, METRICS, 340) + 20;
    expect(item(0.1)).toBeLessThan(220);
    expect(at(0.1).width).toBeCloseTo(96 + 124 * 0.1, 6);
    expect(item(0.9)).toBeGreaterThan(220);
    expect(at(0.9).width).toBeCloseTo(Math.min(96 + 264 * 0.9, item(0.9)), 6);
    expect(at(1)).toEqual({ width: 284, wide: true });
  });

  it('collapses a wide rail on widthFullRange between minWidth and the previous width', () => {
    const at = (p: number, previous: number) =>
      wideNavigationRailWidth({
        expanded: false,
        widthProgress: p,
        itemProgress: p,
        items: wide,
        header: 0,
        previousWidth: previous,
        wide: true,
        metrics: METRICS,
      }).width;
    expect(at(0.9, 284)).toBe(284);
    expect(at(0.5, 284)).toBeCloseTo(96 + 264 * 0.5, 6);
    expect(at(0, 120)).toBe(96);
  });

  it('measures icon-only items as the 56dp circle plus padding', () => {
    expect(wideNavigationRailItemWidth(null, 0.5, METRICS, 340)).toBe(96);
    // Top icon: max(label, 96); start icon: the pill + padding.
    expect(wideNavigationRailItemWidth(104, 0, METRICS, 340)).toBe(96);
    expect(wideNavigationRailItemWidth(104, 1, METRICS, 340)).toBe(124);
  });
});
