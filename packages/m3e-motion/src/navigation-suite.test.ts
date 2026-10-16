import { describe, expect, it } from 'vitest';
import { NavigationSuiteScaffoldAnimation, navigationSuiteOffset } from './navigation-suite.js';
import { springDurationMillis, springValue } from './spring.js';

// NavigationSuiteScaffold.kt AnimationSpec: spring(SpringDefaultSpatialDamping 0.9,
// SpringDefaultSpatialStiffness 700) (the generated --m3e-comp-navigation-suite-scaffold-visibility-*).
const SPEC = { dampingRatio: 0.9, stiffness: 700 };
const DURATION = springDurationMillis(SPEC, 1, 0, 0, 0.01);

/** Samples every 16ms from `from` until both springs rest; returns the progress per frame. */
function run(anim: NavigationSuiteScaffoldAnimation, from: number, frames = 200) {
  const out: number[] = [];
  for (let i = 1; i <= frames; i++) {
    const s = anim.sample(from + i * 16);
    out.push(s.progress);
    if (!s.running) break;
  }
  return out;
}

describe('NavigationSuiteScaffoldAnimation (NavigationSuiteScaffoldStateImpl + layout progress)', () => {
  it('starts at rest in the initial value', () => {
    expect(new NavigationSuiteScaffoldAnimation().sample(0)).toEqual({
      progress: 1,
      running: false,
    });
    const hidden = new NavigationSuiteScaffoldAnimation(true);
    expect(hidden.sample(0)).toEqual({ progress: 0, running: false });
    expect(hidden.currentHidden).toBe(true);
    expect(hidden.targetHidden).toBe(true);
  });

  it('hide(): currentValue leaves Visible on the first frame, so the layout follows at once', () => {
    const anim = new NavigationSuiteScaffoldAnimation();
    anim.hide(SPEC, 1000);
    expect(anim.targetHidden).toBe(true);
    expect(anim.isAnimating).toBe(true);
    const first = anim.sample(1016);
    expect(anim.currentHidden).toBe(true);
    // The layout's spring started this frame: at its first sample it is still 1.
    expect(first.progress).toBe(1);
    const second = anim.sample(1032);
    expect(second.progress).toBeCloseTo(springValue(SPEC, 16, 1, 0, 0), 6);
    const frames = run(anim, 1032);
    expect(frames.at(-1)).toBe(0);
  });

  it('show(): the layout waits for the state spring to settle at exactly 1', () => {
    const anim = new NavigationSuiteScaffoldAnimation(true);
    anim.show(SPEC, 0);
    expect(anim.targetHidden).toBe(false);
    // While the state spring runs, currentValue stays Hidden and the navigation stays out.
    for (let t = 16; t < DURATION; t += 16) {
      const s = anim.sample(t);
      expect(s.progress, `t=${String(t)}`).toBe(0);
      expect(anim.currentHidden).toBe(true);
    }
    anim.sample(DURATION);
    expect(anim.currentHidden).toBe(false);
    expect(anim.isAnimating).toBe(false);
    // Then the layout animates 0 → 1 on the same spring.
    const s = anim.sample(DURATION + 16);
    expect(s.progress).toBeCloseTo(springValue(SPEC, 16, 0, 1, 0), 6);
    expect(s.running).toBe(true);
    expect(run(anim, DURATION + 16).at(-1)).toBe(1);
  });

  it('toggle() targets the opposite of the target value', () => {
    const anim = new NavigationSuiteScaffoldAnimation();
    anim.toggle(SPEC, 0);
    expect(anim.targetHidden).toBe(true);
    anim.toggle(SPEC, 16);
    expect(anim.targetHidden).toBe(false);
  });

  it('snapTo() jumps the state; the layout still animates', () => {
    const anim = new NavigationSuiteScaffoldAnimation();
    anim.snapTo(true, SPEC, 0);
    expect(anim.currentHidden).toBe(true);
    expect(anim.isAnimating).toBe(false);
    const s = anim.sample(16);
    expect(s.running).toBe(true);
    expect(s.progress).toBeGreaterThan(0);
    expect(s.progress).toBeLessThan(1);
  });

  it('a hide interrupted by show keeps the layout hidden until the state settles back', () => {
    const anim = new NavigationSuiteScaffoldAnimation();
    anim.hide(SPEC, 0);
    run(anim, 0, 5);
    anim.show(SPEC, 80);
    // The state heads back to 1 from where it was; currentValue is Hidden until it gets there,
    // so the layout keeps going to 0 (with its velocity) and only then comes back.
    const s = anim.sample(96);
    expect(anim.currentHidden).toBe(true);
    expect(s.progress).toBeLessThan(1);
    expect(run(anim, 96).at(-1)).toBe(1);
  });

  it('a null spec (reduced motion) jumps both', () => {
    const anim = new NavigationSuiteScaffoldAnimation();
    anim.hide(null, 0);
    expect(anim.sample(0)).toEqual({ progress: 0, running: false });
    anim.show(null, 16);
    expect(anim.sample(16)).toEqual({ progress: 1, running: false });
  });
});

describe('navigationSuiteOffset', () => {
  it('is size − (size × progress).toInt()', () => {
    expect(navigationSuiteOffset(64, 1)).toBe(0);
    expect(navigationSuiteOffset(64, 0)).toBe(64);
    expect(navigationSuiteOffset(64, 0.5)).toBe(32);
    expect(navigationSuiteOffset(96, 0.3)).toBe(68);
    // The spring overshoots 1 slightly: the navigation moves past its place.
    expect(navigationSuiteOffset(100, 1.02)).toBe(-2);
  });
});
