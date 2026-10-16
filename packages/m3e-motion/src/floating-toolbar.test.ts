import { describe, expect, it } from 'vitest';
import {
  floatingToolbarScrollState,
  scrollFloatingToolbar,
  scrollToolbarExpansion,
  toolbarCollapsedFraction,
  toolbarExpansionScroll,
  toolbarSettleTarget,
  withToolbarOffset,
  withToolbarOffsetLimit,
} from './floating-toolbar-scroll.js';
import { toolbarNavigationTarget } from './toolbar-navigation.js';

describe('toolbarNavigationTarget (APG toolbar, no wrapping)', () => {
  it('horizontal: ArrowRight / ArrowLeft step and stop at the ends; Home / End', () => {
    expect(toolbarNavigationTarget('ArrowRight', 4, 0)).toBe(1);
    expect(toolbarNavigationTarget('ArrowRight', 4, 3)).toBe(3);
    expect(toolbarNavigationTarget('ArrowLeft', 4, 2)).toBe(1);
    expect(toolbarNavigationTarget('ArrowLeft', 4, 0)).toBe(0);
    expect(toolbarNavigationTarget('Home', 4, 2)).toBe(0);
    expect(toolbarNavigationTarget('End', 4, 1)).toBe(3);
    expect(toolbarNavigationTarget('ArrowDown', 4, 1)).toBeNull();
    expect(toolbarNavigationTarget('a', 4, 1)).toBeNull();
  });

  it('mirrors the horizontal arrows in RTL', () => {
    expect(toolbarNavigationTarget('ArrowLeft', 4, 1, 'horizontal', true)).toBe(2);
    expect(toolbarNavigationTarget('ArrowRight', 4, 1, 'horizontal', true)).toBe(0);
  });

  it('vertical: ArrowDown / ArrowUp, not mirrored; horizontal arrows ignored', () => {
    expect(toolbarNavigationTarget('ArrowDown', 3, 0, 'vertical', true)).toBe(1);
    expect(toolbarNavigationTarget('ArrowUp', 3, 0, 'vertical')).toBe(0);
    expect(toolbarNavigationTarget('ArrowRight', 3, 0, 'vertical')).toBeNull();
  });

  it('enters from nothing focused at the matching end; empty toolbars do nothing', () => {
    expect(toolbarNavigationTarget('ArrowRight', 3, -1)).toBe(0);
    expect(toolbarNavigationTarget('ArrowLeft', 3, -1)).toBe(2);
    expect(toolbarNavigationTarget('Home', 0, -1)).toBeNull();
  });
});

describe('exitAlways scroll state (FloatingToolbar.kt)', () => {
  const limited = withToolbarOffsetLimit(floatingToolbarScrollState(), 96);

  it('starts fully shown with no limit (rememberFloatingToolbarState)', () => {
    const s = floatingToolbarScrollState();
    expect(s.offset).toBe(0);
    expect(s.offsetLimit).toBe(-Number.MAX_VALUE);
    expect(toolbarCollapsedFraction(s)).toBe(0);
  });

  it('scrolling down hides by the same distance, coerced to the limit; up shows again', () => {
    let s = scrollFloatingToolbar(limited, -40);
    expect(s.offset).toBe(-40);
    expect(s.contentOffset).toBe(-40);
    s = scrollFloatingToolbar(s, -100);
    expect(s.offset).toBe(-96);
    expect(s.contentOffset).toBe(-140);
    expect(toolbarCollapsedFraction(s)).toBe(1);
    s = scrollFloatingToolbar(s, 30);
    expect(s.offset).toBe(-66);
    s = scrollFloatingToolbar(s, 500);
    expect(s.offset).toBe(0);
  });

  it('a new limit keeps the offset in range', () => {
    const s = withToolbarOffset(limited, -90);
    expect(withToolbarOffsetLimit(s, 64).offset).toBe(-64);
  });

  it('settles to shown below half, hidden from half, nothing when (almost) settled', () => {
    expect(toolbarSettleTarget(withToolbarOffset(limited, -40))).toBe(0);
    expect(toolbarSettleTarget(withToolbarOffset(limited, -48))).toBe(-96);
    expect(toolbarSettleTarget(withToolbarOffset(limited, -0.5))).toBeNull();
    expect(toolbarSettleTarget(withToolbarOffset(limited, -96))).toBeNull();
    expect(toolbarSettleTarget(limited)).toBeNull();
  });
});

describe('collapse on scroll (floatingToolbarVerticalNestedScroll)', () => {
  it('collapses after 40px down, expands after 40px up, re-arming each time', () => {
    let s = toolbarExpansionScroll(true, 40, 40);
    let r = scrollToolbarExpansion(s, -30, 40, 40);
    expect(r.change).toBeNull();
    r = scrollToolbarExpansion(r.state, -10, 40, 40);
    expect(r.change).toBe('collapse');
    s = r.state;
    expect(s.threshold).toBe(0);
    r = scrollToolbarExpansion(s, -200, 40, 40);
    expect(r.change).toBe('collapse');
    r = scrollToolbarExpansion(r.state, 39, 40, 40);
    expect(r.change).toBeNull();
    r = scrollToolbarExpansion(r.state, 1, 40, 40);
    expect(r.change).toBe('expand');
  });

  it('starts from the collapsed side when collapsed (updateThreshold)', () => {
    const s = toolbarExpansionScroll(false, 40, 40, -100);
    expect(s.threshold).toBe(-60);
    expect(scrollToolbarExpansion(s, 40, 40, 40).change).toBe('expand');
  });
});
