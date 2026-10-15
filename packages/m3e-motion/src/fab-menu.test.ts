import { describe, expect, it } from 'vitest';
import { SpringAnimatable } from './animatable.js';
import { animatedInt, fabMenuItemVisible } from './fab-menu.js';
import { menuNavigationTarget } from './menu-navigation.js';
import { springDurationMillis, springValue } from './spring.js';

// MotionScheme.expressive() (ExpressiveMotionTokens.kt@19991f2c, generated): the springs the FAB
// menu uses (FloatingActionButtonMenu.kt L208, L342–343, L460).
const FAST_SPATIAL = { dampingRatio: 0.6, stiffness: 800 };
const SLOW_EFFECTS = { dampingRatio: 1, stiffness: 800 };

describe('SpringAnimatable (Compose Animatable semantics)', () => {
  it('follows the spring and rests on the target after Compose’s duration', () => {
    const a = new SpringAnimatable(0);
    a.animateTo(1, FAST_SPATIAL, 1000);
    expect(a.isRunning).toBe(true);
    expect(a.sample(1050)).toBe(springValue(FAST_SPATIAL, 50, 0, 1));
    const duration = springDurationMillis(FAST_SPATIAL, 0, 1);
    a.sample(1000 + duration - 1);
    expect(a.isRunning).toBe(true);
    expect(a.sample(1000 + duration)).toBe(1);
    expect(a.isRunning).toBe(false);
    expect(a.velocity).toBe(0);
  });

  it('retargets from the current value and velocity (no jump, momentum kept)', () => {
    const a = new SpringAnimatable(0);
    a.animateTo(1, FAST_SPATIAL, 0);
    const before = a.sample(40);
    const velocity = a.velocity;
    expect(velocity).toBeGreaterThan(0);
    a.animateTo(0, FAST_SPATIAL, 40);
    expect(a.value).toBe(before);
    expect(a.velocity).toBe(velocity);
    // Still moving toward 1 for a moment, then turning back.
    expect(a.sample(48)).toBeGreaterThan(before);
    let min = Number.POSITIVE_INFINITY;
    for (let t = 48; t < 2000; t += 16) min = Math.min(min, a.sample(t));
    expect(a.value).toBe(0);
    // Expressive fast spatial (ζ 0.6) overshoots below 0 on the way back.
    expect(min).toBeLessThan(0);
  });

  it('a null spec jumps (reduced motion)', () => {
    const a = new SpringAnimatable(0);
    a.animateTo(1, null, 0);
    expect(a.value).toBe(1);
    expect(a.isRunning).toBe(false);
  });
});

describe('menuNavigationTarget (APG menu keys)', () => {
  it.each([
    ['ArrowDown', 0, 1],
    ['ArrowDown', 2, 0],
    ['ArrowDown', -1, 0],
    ['ArrowUp', 0, 2],
    ['ArrowUp', -1, 2],
    ['Home', 1, 0],
    ['End', 0, 2],
    ['a', 1, null],
  ] as const)('%s from %i → %s', (key, current, expected) => {
    expect(menuNavigationTarget(key, 3, current)).toBe(expected);
  });

  it('no items: nothing to move to', () => {
    expect(menuNavigationTarget('ArrowDown', 0, -1)).toBeNull();
  });
});

describe('FAB menu stagger (FloatingActionButtonMenuItemColumn)', () => {
  it('reads the Int animation by truncation', () => {
    expect(animatedInt(2.99)).toBe(2);
    expect(animatedInt(0.5)).toBe(0);
  });

  it('shows items from the bottom up and hides them top first', () => {
    const count = 4;
    expect([0, 1, 2, 3].map((i) => fabMenuItemVisible(i, count, 0))).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect([0, 1, 2, 3].map((i) => fabMenuItemVisible(i, count, 1.4))).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect([0, 1, 2, 3].map((i) => fabMenuItemVisible(i, count, 3.999))).toEqual([
      false,
      true,
      true,
      true,
    ]);
    expect([0, 1, 2, 3].map((i) => fabMenuItemVisible(i, count, 4))).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('the slow-effects Int spring (threshold 1) reveals the last item when it ends', () => {
    const count = 6;
    const stagger = new SpringAnimatable(0, 1);
    stagger.animateTo(count, SLOW_EFFECTS, 0);
    const shownAt: number[] = [];
    for (let t = 0; shownAt.length < count && t < 2000; t++) {
      const value = stagger.sample(t);
      const visible = [...Array(count).keys()].filter((i) => fabMenuItemVisible(i, count, value));
      while (shownAt.length < visible.length) shownAt.push(t);
    }
    expect(shownAt).toHaveLength(count);
    // Staggered, bottom item first. The spring ends once within one item of the target, which
    // is what reveals the top item (upstream: avoids "a delay in the appearance of the last
    // item"), so the top two can appear together.
    expect(shownAt[1]!).toBeGreaterThan(shownAt[0]!);
    for (let i = 1; i < count; i++) expect(shownAt[i]!).toBeGreaterThanOrEqual(shownAt[i - 1]!);
    expect(new Set(shownAt).size).toBeGreaterThanOrEqual(count - 1);
    expect(shownAt.at(-1)).toBe(springDurationMillis(SLOW_EFFECTS, 0, count, 0, 1));
  });
});
