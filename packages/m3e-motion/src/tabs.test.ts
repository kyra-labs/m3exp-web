import { describe, expect, it } from 'vitest';
import { springDurationMillis, springValue, springVelocity } from './spring.js';
import {
  TAB_INDICATOR_MIN_WIDTH,
  TabIndicatorAnimation,
  TabScrollAnimation,
  scrollableTabOffset,
  tabIndicatorShift,
  tabIndicatorTarget,
  tabPositions,
} from './tabs.js';

// MotionScheme.expressive() DefaultSpatial (ExpressiveMotionTokens.kt@19991f2c, generated): the
// indicator and scroll spring (tabs-defaults.css, PARITY.md).
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };

describe('tabPositions (TabPosition)', () => {
  it('accumulates lefts from the start and enforces the 24dp minimum content width', () => {
    const positions = tabPositions(
      [
        { width: 120, contentWidth: 40 },
        { width: 120, contentWidth: 10 },
        { width: 90, contentWidth: 24 },
      ],
      52,
    );
    expect(positions).toEqual([
      { left: 52, width: 120, contentWidth: 40 },
      { left: 172, width: 120, contentWidth: TAB_INDICATOR_MIN_WIDTH },
      { left: 292, width: 90, contentWidth: 24 },
    ]);
  });

  it('primary indicators take the content width, secondary the tab width', () => {
    const [p] = tabPositions([{ width: 120, contentWidth: 40 }]);
    expect(tabIndicatorTarget(p!, 'primary')).toEqual({ offset: 0, width: 40 });
    expect(tabIndicatorTarget(p!, 'secondary')).toEqual({ offset: 0, width: 120 });
  });
});

describe('TabIndicatorAnimation (TabIndicatorOffsetNode)', () => {
  it('runs the offset and width on the spring from rest', () => {
    const a = new TabIndicatorAnimation(0, 40);
    a.animateTo(120, 60, DEFAULT_SPATIAL, 1000);
    const s = a.sample(1100);
    expect(s.running).toBe(true);
    expect(s.offset).toBeCloseTo(springValue(DEFAULT_SPATIAL, 100, 0, 120, 0), 9);
    expect(s.width).toBeCloseTo(springValue(DEFAULT_SPATIAL, 100, 40, 60, 0), 9);
    const end = springDurationMillis(DEFAULT_SPATIAL, 0, 120, 0, 0.01);
    expect(a.sample(1000 + end + 1)).toEqual({ offset: 120, width: 60, running: false });
  });

  it('a new target starts from the current value and velocity (interruptible)', () => {
    const a = new TabIndicatorAnimation(0, 40);
    a.animateTo(120, 40, DEFAULT_SPATIAL, 0);
    a.sample(80);
    const value = springValue(DEFAULT_SPATIAL, 80, 0, 120, 0);
    const velocity = springVelocity(DEFAULT_SPATIAL, 80, 0, 120, 0);
    a.animateTo(240, 40, DEFAULT_SPATIAL, 80);
    expect(a.sample(130).offset).toBeCloseTo(
      springValue(DEFAULT_SPATIAL, 50, value, 240, velocity),
      9,
    );
    // The width target did not change: it stays at rest.
    expect(a.width.isRunning).toBe(false);
  });

  it('reduced motion (null spec) jumps', () => {
    const a = new TabIndicatorAnimation(0, 40);
    a.animateTo(240, 80, null, 0);
    expect(a.sample(0)).toEqual({ offset: 240, width: 80, running: false });
  });

  it('shift = the animated offset less the selected tab’s left (centre = offset + width / 2)', () => {
    const [, b] = tabPositions([
      { width: 100, contentWidth: 30 },
      { width: 100, contentWidth: 60 },
    ]);
    expect(tabIndicatorShift({ offset: 25 }, b!)).toBe(-75);
  });
});

describe('scrollableTabOffset (ScrollableTabData.calculateTabOffset)', () => {
  it('centres the tab, clamped to the scroll range', () => {
    // 52 + 10 × 100 + 52 = 1104 wide, seen through 400.
    expect(scrollableTabOffset({ left: 552, width: 100 }, 1104, 400)).toBe(402);
    expect(scrollableTabOffset({ left: 52, width: 100 }, 1104, 400)).toBe(0);
    expect(scrollableTabOffset({ left: 952, width: 100 }, 1104, 400)).toBe(704);
    // Everything visible: no scroll.
    expect(scrollableTabOffset({ left: 152, width: 100 }, 300, 400)).toBe(0);
  });

  it('animateScrollTo starts from rest', () => {
    const s = new TabScrollAnimation(0);
    s.animateTo(10, 200, DEFAULT_SPATIAL, 0);
    s.value.sample(50);
    s.animateTo(s.value.value, 300, DEFAULT_SPATIAL, 50);
    const from = springValue(DEFAULT_SPATIAL, 50, 10, 200, 0);
    expect(s.value.sample(100)).toBeCloseTo(springValue(DEFAULT_SPATIAL, 50, from, 300, 0), 9);
  });
});
