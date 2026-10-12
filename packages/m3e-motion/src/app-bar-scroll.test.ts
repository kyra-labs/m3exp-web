import { describe, expect, it } from 'vitest';
import {
  appBarScrollState,
  collapsedFraction,
  isScrolledUnder,
  overlappedFraction,
  scrollAppBar,
  settleTarget,
  withHeight,
  withHeightOffset,
} from './app-bar-scroll.js';

// Expected values follow the Kotlin expressions in AppBar.kt@19991f2c (TopAppBarState L2050-2130,
// settleAppBar L3542-3589), evaluated by hand for a 64px bar (AppBarSmallTokens.ContainerHeight).
const bar = appBarScrollState(64);

describe('TopAppBarState', () => {
  it('starts expanded over unscrolled content', () => {
    expect(bar).toEqual({
      heightOffsetLimit: -64,
      heightOffset: 0,
      contentOffset: 0,
      atStart: true,
    });
    expect(collapsedFraction(bar)).toBe(0);
    expect(overlappedFraction(bar)).toBe(0);
  });

  it('coerces the height offset into [limit, 0]', () => {
    expect(withHeightOffset(bar, -100).heightOffset).toBe(-64);
    expect(withHeightOffset(bar, 10).heightOffset).toBe(0);
    expect(withHeightOffset(bar, -16).heightOffset).toBe(-16);
  });

  it('collapsedFraction = heightOffset / heightOffsetLimit (0 when the limit is 0)', () => {
    expect(collapsedFraction(withHeightOffset(bar, -16))).toBe(0.25);
    expect(collapsedFraction(withHeightOffset(bar, -64))).toBe(1);
    expect(collapsedFraction(appBarScrollState(0))).toBe(0);
  });

  it('overlappedFraction = 1 - clamp(limit + |contentOffset|, limit, 0) / limit', () => {
    const at = (contentOffset: number) =>
      overlappedFraction({ ...bar, contentOffset, atStart: contentOffset === 0 });
    expect(at(-16)).toBe(0.25); // 1 - (-48 / -64)
    expect(at(-64)).toBe(1);
    expect(at(-500)).toBe(1);
    // Scrolled content with a zero offset counts as fully overlapped.
    expect(overlappedFraction({ ...bar, contentOffset: 0, atStart: false })).toBe(1);
  });

  it('a resize moves the limit and keeps the offset in range', () => {
    const collapsed = withHeightOffset(bar, -64);
    expect(withHeight(collapsed, 56)).toMatchObject({ heightOffsetLimit: -56, heightOffset: -56 });
  });
});

describe('scroll behaviors', () => {
  it('scrolled color only past 0.01 overlap (0.64px of a 64px bar)', () => {
    expect(isScrolledUnder(scrollAppBar(bar, 'pinned', 0.5, -0.5))).toBe(false);
    expect(isScrolledUnder(scrollAppBar(bar, 'pinned', 1, -1))).toBe(true);
    expect(isScrolledUnder(scrollAppBar(bar, 'pinned', 0, 1))).toBe(false);
  });

  it('pinned never changes the height', () => {
    const scrolled = scrollAppBar(bar, 'pinned', 200, -200);
    expect(scrolled.heightOffset).toBe(0);
    expect(scrolled.contentOffset).toBe(-200);
  });

  it('enter-always collapses with the scroll and re-enters on any upward scroll', () => {
    let s = scrollAppBar(bar, 'enter-always', 40, -40);
    expect(s.heightOffset).toBe(-40);
    s = scrollAppBar(s, 'enter-always', 300, -260);
    expect(s.heightOffset).toBe(-64);
    s = scrollAppBar(s, 'enter-always', 290, 10);
    expect(s.heightOffset).toBe(-54);
    expect(s.atStart).toBe(false);
  });
});

describe('settleAppBar target', () => {
  it.each([
    [0, null], // expanded
    [-0.5, null], // < 1% collapsed counts as expanded
    [-64, null], // fully collapsed
    [-31, 0], // fraction 0.484 < 0.5 → expand
    [-32, -64], // fraction 0.5 → collapse
    [-50, -64],
  ])('offset %d → %s', (offset, target) => {
    expect(settleTarget(withHeightOffset(bar, offset))).toBe(target);
  });
});
