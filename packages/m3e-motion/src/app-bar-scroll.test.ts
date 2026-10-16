import { describe, expect, it } from 'vitest';
import {
  type AppBarScrollState,
  FAST_OUT_LINEAR_IN_EASING,
  TOP_TITLE_ALPHA_EASING,
  appBarScrollState,
  collapsedFraction,
  cubicBezierEasing,
  isScrolledUnder,
  overlappedFraction,
  scrollAppBar,
  settleTarget,
  twoRowsFrame,
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

describe('exit-until-collapsed (ExitUntilCollapsedScrollBehavior L3476-3536)', () => {
  // A medium flexible bar: the bottom row (112 - 64 = 48px) collapses.
  const medium = appBarScrollState(48);
  const scroll = (s: AppBarScrollState, from: number, to: number) =>
    scrollAppBar(s, 'exit-until-collapsed', to, from - to);

  it('collapses with every downward scroll (onPreScroll) down to the limit', () => {
    let s = scroll(medium, 0, 30);
    expect(s.heightOffset).toBe(-30);
    s = scroll(s, 30, 200);
    expect(s.heightOffset).toBe(-48);
  });

  it('expands only with the part of an upward scroll the content cannot take', () => {
    let s = scroll(scroll(medium, 0, 200), 0, 200);
    s = scroll(s, 200, 50); // content takes it all: still collapsed
    expect(s.heightOffset).toBe(-48);
    s = scroll(s, 50, 40); // 8px of it within the collapsed 48px of the top
    expect(s.heightOffset).toBe(-40);
    s = scroll(s, 40, 0); // content at its start: fully expanded
    expect(s.heightOffset).toBe(0);
  });

  it('a bar settled open over scrolled content stays open on the way up', () => {
    // Snapped expanded while the content is 20px down, then scrolled 10px down: 10px collapsed.
    let s = scroll(withHeightOffset({ ...medium, contentOffset: -20, atStart: false }, 0), 20, 30);
    expect(s.heightOffset).toBe(-10);
    s = scroll(s, 30, 20); // above the 10px collapsed distance: the content takes it
    expect(s.heightOffset).toBe(-10);
    s = scroll(s, 20, 4); // 6px of it below 10px
    expect(s.heightOffset).toBe(-4);
    s = scroll(s, 4, 0);
    expect(s.heightOffset).toBe(0);
  });

  it('a scroll that does not move changes nothing', () => {
    const s = scroll(medium, 0, 20);
    expect(scroll(s, 20, 20).heightOffset).toBe(-20);
  });
});

describe('two-rows interpolation (TwoRowsTopAppBar L2818-2836)', () => {
  // Reference: points on the Bézier curve itself (x(t), y(t)) from the cubic in Easing.kt.
  const bezier = (p1: number, p2: number, t: number) =>
    3 * p1 * (1 - t) ** 2 * t + 3 * p2 * (1 - t) * t ** 2 + t ** 3;

  it.each([
    ['TopTitleAlphaEasing', TOP_TITLE_ALPHA_EASING],
    ['FastOutLinearInEasing', FAST_OUT_LINEAR_IN_EASING],
  ] as const)('%s solves x(t) = fraction and returns y(t)', (_name, [a, b, c, d]) => {
    const ease = cubicBezierEasing(a, b, c, d);
    for (let t = 0.05; t < 1; t += 0.05) {
      expect(ease(bezier(a, c, t))).toBeCloseTo(bezier(b, d, t), 9);
    }
    expect([ease(0), ease(1), ease(-0.5), ease(1.5)]).toEqual([0, 1, -0.5, 1.5]);
  });

  it('follows an overshooting curve', () => {
    const ease = cubicBezierEasing(0.3, 1.5, 0.7, 1);
    const peak = Math.max(...Array.from({ length: 99 }, (_, i) => ease((i + 1) / 100)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.2);
  });

  it('expanded: expanded title only, container color, collapsed title hidden', () => {
    expect(twoRowsFrame(0)).toEqual({
      collapsedTitleAlpha: 0,
      expandedTitleAlpha: 1,
      containerColorFraction: 0,
      collapsedTitleHidden: true,
    });
  });

  it('collapsed: collapsed title only, scrolled color, expanded title hidden', () => {
    expect(twoRowsFrame(1)).toEqual({
      collapsedTitleAlpha: 1,
      expandedTitleAlpha: 0,
      containerColorFraction: 1,
      collapsedTitleHidden: false,
    });
  });

  it('the semantics swap at 0.5 and the collapsed title stays faint until late', () => {
    expect(twoRowsFrame(0.4999).collapsedTitleHidden).toBe(true);
    expect(twoRowsFrame(0.5).collapsedTitleHidden).toBe(false);
    const half = twoRowsFrame(0.5);
    expect(half.expandedTitleAlpha).toBe(0.5);
    // cubic-bezier(.8, 0, .8, .15) is still near 0 at half way; FastOutLinearIn is below linear.
    expect(half.collapsedTitleAlpha).toBeLessThan(0.05);
    expect(half.containerColorFraction).toBeLessThan(0.5);
    expect(half.containerColorFraction).toBeGreaterThan(0.2);
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
