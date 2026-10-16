import { describe, expect, it } from 'vitest';
import { cubicBezier } from './cubic-bezier.js';
import {
  SEARCH_BAR_EXPANDED_THRESHOLD,
  SearchBarAnimation,
  type SearchBarSpecs,
  type SearchViewMetrics,
  TweenAnimatable,
  searchNavigationTarget,
  searchViewFrame,
} from './search-bar.js';
import { springDurationMillis, springValue, springVelocity } from './spring.js';

// MotionScheme.expressive() (ExpressiveMotionTokens.kt@19991f2c, generated) and the SearchBar.kt
// state functions: rememberSearchBarState = slow spatial / default spatial (L1640-1641),
// rememberSearchBarWithGapState = default spatial / fast spatial + the content fades (L1720-1723).
const SLOW_SPATIAL = { dampingRatio: 0.8, stiffness: 200 };
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };
const FAST_SPATIAL = { dampingRatio: 0.6, stiffness: 800 };
// AnimationForContentFadeInSpec / OutSpec (L4230-4240): MotionTokens DurationShort2 (100ms) after
// DurationShort1 (50ms), EasingStandardAccelerate / EasingStandardDecelerate.
const FADE_IN = { duration: 100, delay: 50, easing: cubicBezier(0.3, 0, 1, 1) };
const FADE_OUT = { duration: 100, delay: 0, easing: cubicBezier(0, 0, 0, 1) };

const FULL_SCREEN: SearchBarSpecs = {
  expand: SLOW_SPATIAL,
  collapse: DEFAULT_SPATIAL,
  contentFadeIn: null,
  contentFadeOut: null,
};
const WITH_GAP: SearchBarSpecs = {
  expand: DEFAULT_SPATIAL,
  collapse: FAST_SPATIAL,
  contentFadeIn: FADE_IN,
  contentFadeOut: FADE_OUT,
};

describe('TweenAnimatable (Animatable.animateTo(tween))', () => {
  it('holds for the delay, then eases over the duration and rests on the target', () => {
    const t = new TweenAnimatable(0);
    t.animateTo(1, FADE_IN, 1000);
    expect(t.sample(1049)).toBe(0);
    expect(t.sample(1100)).toBeCloseTo(FADE_IN.easing(0.5), 10);
    expect(t.sample(1150)).toBe(1);
    expect(t.isRunning).toBe(false);
  });

  it('a new target starts from the current value; null is snap()', () => {
    const t = new TweenAnimatable(0);
    t.animateTo(1, FADE_IN, 0);
    const mid = t.sample(120);
    t.animateTo(0, FADE_OUT, 120);
    expect(t.sample(120)).toBe(mid);
    expect(t.sample(170)).toBeCloseTo(mid * (1 - FADE_OUT.easing(0.5)), 10);
    t.animateTo(1, null, 200);
    expect(t.value).toBe(1);
  });
});

describe('SearchBarAnimation (SearchBarState)', () => {
  it('expands on the expand spring, overshooting 1 (progress clamps), content snaps', () => {
    const a = new SearchBarAnimation();
    a.expand(FULL_SCREEN, 0);
    expect(a.isTargetExpanded).toBe(true);
    const at = (t: number) => a.sample(t);
    expect(at(0).contentProgress).toBe(1);
    expect(at(100).value).toBe(springValue(SLOW_SPATIAL, 100, 0, 1));
    const values = Array.from({ length: 80 }, (_, i) => at(i * 16));
    const peak = Math.max(...values.map((s) => s.value));
    expect(peak).toBeGreaterThan(1);
    expect(Math.max(...values.map((s) => s.progress))).toBe(1);
    expect(at(springDurationMillis(SLOW_SPATIAL, 0, 1)).value).toBe(1);
    expect(a.isRunning).toBe(false);
  });

  it('collapsing mid-expansion keeps the velocity (Animatable retarget)', () => {
    const a = new SearchBarAnimation();
    a.expand(FULL_SCREEN, 0);
    const mid = a.sample(80).value;
    const velocity = springVelocity(SLOW_SPATIAL, 80, 0, 1);
    a.collapse(FULL_SCREEN, 80);
    expect(a.isTargetExpanded).toBe(false);
    expect(a.sample(96).value).toBe(springValue(DEFAULT_SPATIAL, 16, mid, 0, velocity));
    // Still moving up for a moment: momentum carried over.
    expect(a.sample(84).value).toBeGreaterThan(mid);
  });

  it('currentValue stays expanded until the value is back within 0.02', () => {
    const a = new SearchBarAnimation(true);
    expect(a.isExpanded).toBe(true);
    a.collapse(FULL_SCREEN, 0);
    const duration = springDurationMillis(DEFAULT_SPATIAL, 1, 0);
    let t = 0;
    while (a.sample(t).value > SEARCH_BAR_EXPANDED_THRESHOLD) {
      expect(a.isExpanded).toBe(true);
      t += 4;
    }
    expect(a.isExpanded).toBe(false);
    expect(t).toBeLessThan(duration);
  });

  it('with gap: the drop-down enters past progress 0.1 from minus half its height', () => {
    const a = new SearchBarAnimation();
    a.expand(WITH_GAP, 0);
    expect(a.sample(0, 300).dropdownShown).toBe(false);
    let t = 0;
    while (a.sample(t, 300).progress <= 0.1) t += 1;
    const enter = a.sample(t, 300);
    expect(enter.dropdownShown).toBe(true);
    expect(enter.slide).toBe(-150);
    expect(a.sample(t + 40, 300).slide).toBe(springValue(DEFAULT_SPATIAL, 40, -150, 0));
    // The content fades in after its delay, on its own tween.
    expect(a.sample(49, 300).contentProgress).toBe(0);
    expect(a.sample(150, 300).contentProgress).toBe(1);
  });

  it('with gap: collapsing slides the drop-down out on the collapse spring, then hides it', () => {
    const a = new SearchBarAnimation(true);
    expect(a.sample(0, 300).slide).toBe(0);
    a.collapse(WITH_GAP, 0);
    // The visibility change is picked up by the frame that follows the target change.
    expect(a.sample(0, 300).slide).toBe(0);
    expect(a.sample(16, 300).slide).toBe(springValue(FAST_SPATIAL, 16, 0, -150));
    expect(a.sample(50, 300).contentProgress).toBeCloseTo(1 - FADE_OUT.easing(0.5), 10);
    const end = springDurationMillis(FAST_SPATIAL, 0, -150) + 1;
    const done = a.sample(Math.max(end, springDurationMillis(FAST_SPATIAL, 1, 0)) + 1, 300);
    expect(done.dropdownShown).toBe(false);
    expect(done.value).toBe(0);
  });
});

const METRICS: SearchViewMetrics = {
  verticalPadding: 8,
  containedTopPadding: 4,
  containedHorizontalPadding: 8,
  cornerRadius: 28,
  dockedMinHeight: 240,
  dockedMaxHeightRatio: 2 / 3,
  withGapMaxHeightRatio: 1 / 2,
  dropdownGap: 2,
};
const COLLAPSED = { x: 100, y: 40, width: 360, height: 56 };
const WINDOW = { width: 1000, height: 900 };
const frame = (variant: Parameters<typeof searchViewFrame>[0]['variant'], value: number) =>
  searchViewFrame({
    variant,
    collapsed: COLLAPSED,
    window: WINDOW,
    insetTop: 0,
    sample: { value, progress: Math.min(Math.max(value, 0), 1) },
    metrics: METRICS,
  });

describe('searchViewFrame (FullScreenSearchBarLayout, DockedSearchBarLayoutImpl)', () => {
  it('full-screen: collapsed = the bar; expanded = the window, field 8dp down, results below', () => {
    const start = frame('full-screen', 0);
    expect(start.surface).toMatchObject({ ...COLLAPSED, radius: 28 });
    expect(start.field).toEqual({ x: 100, y: 40, width: 360 });
    const end = frame('full-screen', 1);
    expect(end.surface).toMatchObject({ x: 0, y: 0, width: 1000, height: 900, radius: 0 });
    expect(end.field).toEqual({ x: 0, y: 8, width: 1000 });
    // Divider + results start 8 + 56 + 8 = 72 down (SearchViewTokens.FullScreenHeaderContainerHeight).
    expect(end.results).toEqual({ x: 0, y: 72, width: 1000, maxHeight: 900 - 72 });
  });

  it('full-screen: the field centre moves by progress × value (a double lerp)', () => {
    const half = frame('full-screen', 0.5);
    // surface x = 50, width = 680 → centre 390; centreX = lerp(280, 390, 0.5) = 335.
    expect(half.surface.x).toBe(50);
    expect(half.field.width).toBe(520);
    expect(half.field.x).toBe(Math.round(335 - 260));
  });

  it('full-screen contained: window surface fading in, padded field, results 8dp below', () => {
    const end = frame('full-screen-contained', 1);
    expect(end.surface).toMatchObject({ x: 0, y: 0, width: 1000, height: 900, alpha: 1 });
    expect(end.field).toEqual({ x: 8, y: 4, width: 984 });
    expect(end.results).toEqual({ x: 0, y: 68, width: 1000, maxHeight: 900 - 68 });
    expect(frame('full-screen-contained', 0).surface.alpha).toBe(0);
  });

  it('docked: the panel grows from the bar to 2/3 of the window, at least 240dp', () => {
    const start = frame('docked', 0);
    expect(start.surface).toMatchObject({ ...COLLAPSED, minHeight: 56, maxHeight: 56 });
    const end = frame('docked', 1);
    expect(end.surface).toMatchObject({ minHeight: 240, maxHeight: 600 });
    expect(end.results).toMatchObject({ y: 96, maxHeight: 544 });
    // Overshoot lets the panel grow past the maximum, as Compose's coerceAtLeast(0f) only.
    expect(frame('docked', 1.05).surface.maxHeight).toBeGreaterThan(600);
  });

  it('docked with gap: scrim fades in; results 2dp under the field, at most half the window', () => {
    const end = frame('docked-with-gap', 1);
    expect(end.surface).toMatchObject({ x: 0, y: 0, width: 1000, height: 900, alpha: 1 });
    expect(end.field).toEqual({ x: 100, y: 40, width: 360 });
    expect(end.results).toEqual({ x: 100, y: 98, width: 360, maxHeight: 450 - 58 });
  });
});

describe('searchNavigationTarget (combobox virtual focus)', () => {
  const all = [true, true, true];
  it('ArrowDown enters at the first option and stops at the last', () => {
    expect(searchNavigationTarget('ArrowDown', all, -1)).toBe(0);
    expect(searchNavigationTarget('ArrowDown', all, 1)).toBe(2);
    expect(searchNavigationTarget('ArrowDown', all, 2)).toBe(2);
  });
  it('ArrowUp enters at the last option and leaves from the first back to the input', () => {
    expect(searchNavigationTarget('ArrowUp', all, -1)).toBe(2);
    expect(searchNavigationTarget('ArrowUp', all, 1)).toBe(0);
    expect(searchNavigationTarget('ArrowUp', all, 0)).toBe(-1);
  });
  it('skips disabled options; nothing to do without options or for other keys', () => {
    expect(searchNavigationTarget('ArrowDown', [false, true, false, true], -1)).toBe(1);
    expect(searchNavigationTarget('ArrowDown', [false, true, false, true], 1)).toBe(3);
    expect(searchNavigationTarget('ArrowUp', [false, true, false, true], 3)).toBe(1);
    expect(searchNavigationTarget('ArrowDown', [], -1)).toBeNull();
    expect(searchNavigationTarget('Enter', all, 0)).toBeNull();
  });
});
