import { describe, expect, it } from 'vitest';
import {
  WINDOW_HEIGHT_BREAKPOINTS,
  WINDOW_WIDTH_BREAKPOINTS,
  isAtLeastBreakpoint,
  isHeightAtLeastBreakpoint,
  NAVIGATION_SUITE_EXPANDED_FROM,
  NAVIGATION_SUITE_TYPES,
  isNavigationBarType,
  isWidthAtLeastBreakpoint,
  navigationSuiteType,
  paneScaffoldDirective,
  sameWindowSizeClass,
  windowHeightSizeClass,
  windowSizeClass,
  windowWidthSizeClass,
} from './window-size-class.js';

describe('windowWidthSizeClass', () => {
  it.each([
    [0, 'compact'],
    [599, 'compact'],
    [599.99, 'compact'],
    [600, 'medium'],
    [839, 'medium'],
    [840, 'expanded'],
    [1199, 'expanded'],
    [1200, 'large'],
    [1599, 'large'],
    [1600, 'extra-large'],
    [4000, 'extra-large'],
  ] as const)('%d px → %s', (width, expected) => {
    expect(windowWidthSizeClass(width)).toBe(expected);
  });

  it('keeps every width from 840 expanded with the V1 set', () => {
    const v1 = { largeAndExtraLargeWidth: false };
    expect(windowWidthSizeClass(839, v1)).toBe('medium');
    expect(windowWidthSizeClass(840, v1)).toBe('expanded');
    expect(windowWidthSizeClass(1200, v1)).toBe('expanded');
    expect(windowWidthSizeClass(1600, v1)).toBe('expanded');
  });

  it('classifies negative and NaN widths as compact', () => {
    expect(windowWidthSizeClass(-1)).toBe('compact');
    expect(windowWidthSizeClass(Number.NaN)).toBe('compact');
  });
});

describe('windowHeightSizeClass', () => {
  it.each([
    [0, 'compact'],
    [479, 'compact'],
    [480, 'medium'],
    [899, 'medium'],
    [900, 'expanded'],
    [2000, 'expanded'],
  ] as const)('%d px → %s', (height, expected) => {
    expect(windowHeightSizeClass(height)).toBe(expected);
  });
});

describe('windowSizeClass', () => {
  it('carries both classes and their lower bounds (minWidthDp / minHeightDp)', () => {
    expect(windowSizeClass({ width: 1300, height: 700 })).toEqual({
      widthClass: 'large',
      heightClass: 'medium',
      minWidth: 1200,
      minHeight: 480,
    });
    expect(
      windowSizeClass({ width: 1300, height: 700 }, { largeAndExtraLargeWidth: false }),
    ).toEqual({ widthClass: 'expanded', heightClass: 'medium', minWidth: 840, minHeight: 480 });
  });

  it('compares buckets, not sizes', () => {
    const a = windowSizeClass({ width: 600, height: 480 });
    expect(sameWindowSizeClass(a, windowSizeClass({ width: 839, height: 899 }))).toBe(true);
    expect(sameWindowSizeClass(a, windowSizeClass({ width: 840, height: 899 }))).toBe(false);
    expect(sameWindowSizeClass(a, windowSizeClass({ width: 600, height: 900 }))).toBe(false);
  });

  it('has frozen breakpoint tables', () => {
    expect(Object.isFrozen(WINDOW_WIDTH_BREAKPOINTS)).toBe(true);
    expect(Object.isFrozen(WINDOW_HEIGHT_BREAKPOINTS)).toBe(true);
  });
});

describe('isAtLeastBreakpoint', () => {
  const expanded = windowSizeClass({ width: 900, height: 500 });

  it('compares the class lower bound with a class name or px value', () => {
    expect(isWidthAtLeastBreakpoint(expanded, 'medium')).toBe(true);
    expect(isWidthAtLeastBreakpoint(expanded, 'expanded')).toBe(true);
    expect(isWidthAtLeastBreakpoint(expanded, 'large')).toBe(false);
    // The class lower bound (840), not the window width (900), is compared (androidx semantics).
    expect(isWidthAtLeastBreakpoint(expanded, 900)).toBe(false);
    expect(isHeightAtLeastBreakpoint(expanded, 'medium')).toBe(true);
    expect(isHeightAtLeastBreakpoint(expanded, 'expanded')).toBe(false);
    expect(isAtLeastBreakpoint(expanded, 'expanded', 'medium')).toBe(true);
    expect(isAtLeastBreakpoint(expanded, 'expanded', 'expanded')).toBe(false);
  });
});

describe('paneScaffoldDirective (calculatePaneScaffoldDirective)', () => {
  const at = (width: number, height = 800) =>
    paneScaffoldDirective(windowSizeClass({ width, height }));

  it('gives 1 / 1 / 2 / 3 / 3 horizontal partitions by width class', () => {
    expect([599, 600, 840, 1200, 1600].map((w) => at(w).maxHorizontalPartitions)).toEqual([
      1, 1, 2, 3, 3,
    ]);
    expect(at(599).horizontalPartitionSpacerSize).toBe(0);
    expect(at(840).horizontalPartitionSpacerSize).toBe(24);
  });

  it('prefers 360 px panes up to expanded and 412 px from large', () => {
    expect(at(840).defaultPanePreferredWidth).toBe(360);
    expect(at(1200).defaultPanePreferredWidth).toBe(412);
    expect(at(1200).defaultPanePreferredHeight).toBe(420);
  });

  it('caps at 2 panes with the V1 width set (no large class)', () => {
    const v1 = windowSizeClass({ width: 1600, height: 800 }, { largeAndExtraLargeWidth: false });
    expect(paneScaffoldDirective(v1).maxHorizontalPartitions).toBe(2);
  });

  it('stacks two panes in single-pane windows of expanded height, or on a tabletop posture', () => {
    expect(at(700, 900)).toMatchObject({
      maxVerticalPartitions: 2,
      verticalPartitionSpacerSize: 24,
    });
    expect(at(700, 899)).toMatchObject({
      maxVerticalPartitions: 1,
      verticalPartitionSpacerSize: 0,
    });
    expect(at(900, 900).maxVerticalPartitions).toBe(1);
    const tabletop = paneScaffoldDirective(windowSizeClass({ width: 900, height: 600 }), {
      isTabletop: true,
    });
    expect(tabletop.maxVerticalPartitions).toBe(2);
  });
});

describe('navigationSuiteType', () => {
  const type = (width: number, height: number, isTabletop = false) =>
    navigationSuiteType(windowSizeClass({ width, height }), { isTabletop });

  it('follows NavigationSuiteScaffoldDefaults.navigationSuiteType', () => {
    expect(type(599, 900)).toBe('short-navigation-bar-compact');
    expect(type(599, 300)).toBe('short-navigation-bar-compact');
    expect(type(600, 479)).toBe('short-navigation-bar-medium');
    expect(type(1600, 479)).toBe('short-navigation-bar-medium');
    expect(type(900, 800, true)).toBe('short-navigation-bar-medium');
    expect(type(600, 480)).toBe('wide-navigation-rail-collapsed');
    expect(type(1600, 1000)).toBe('wide-navigation-rail-collapsed');
  });

  it('expands from `expandedFrom` (the scaffold default: large), after the bar rules', () => {
    const expanded = (width: number, height: number, options = {}) =>
      navigationSuiteType(windowSizeClass({ width, height }), {
        expandedFrom: NAVIGATION_SUITE_EXPANDED_FROM,
        ...options,
      });
    expect(NAVIGATION_SUITE_EXPANDED_FROM).toBe('large');
    expect(expanded(599, 900)).toBe('short-navigation-bar-compact');
    expect(expanded(1199, 900)).toBe('wide-navigation-rail-collapsed');
    expect(expanded(1200, 900)).toBe('wide-navigation-rail-expanded');
    expect(expanded(1800, 900)).toBe('wide-navigation-rail-expanded');
    // Compact height and tabletop keep the medium bar (Compose's custom configuration sample).
    expect(expanded(1600, 479)).toBe('short-navigation-bar-medium');
    expect(expanded(1600, 900, { isTabletop: true })).toBe('short-navigation-bar-medium');
    expect(expanded(1300, 900, { expandedType: 'navigation-drawer' })).toBe('navigation-drawer');
    // A px bound compares with the class's lower bound (isWidthAtLeastBreakpoint).
    expect(expanded(900, 900, { expandedFrom: 840 })).toBe('wide-navigation-rail-expanded');
    expect(expanded(1000, 900, { expandedFrom: 1000 })).toBe('wide-navigation-rail-collapsed');
    expect(expanded(1300, 900, { expandedFrom: null })).toBe('wide-navigation-rail-collapsed');
    // The V1 set never reaches large.
    expect(
      navigationSuiteType(
        windowSizeClass({ width: 1800, height: 900 }, { largeAndExtraLargeWidth: false }),
        { expandedFrom: 'large' },
      ),
    ).toBe('wide-navigation-rail-collapsed');
  });

  it('bar types', () => {
    expect(NAVIGATION_SUITE_TYPES.filter(isNavigationBarType)).toEqual([
      'short-navigation-bar-compact',
      'short-navigation-bar-medium',
    ]);
  });
});
