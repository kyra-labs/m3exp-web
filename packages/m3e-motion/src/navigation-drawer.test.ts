import { describe, expect, it } from 'vitest';
import { cubicBezier } from './cubic-bezier.js';
import {
  DRAWER_VELOCITY_THRESHOLD,
  DrawerAnimation,
  type DrawerSpecs,
  drawerSettlesOpen,
  exponentialDecayTarget,
} from './navigation-drawer.js';
import { springValue, springVelocity } from './spring.js';

// MotionScheme.expressive() (ExpressiveMotionTokens.kt@19991f2c, generated) and the drawer's
// springs / settle tween (navigation-drawer-defaults.css, PARITY.md).
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };
const FAST_EFFECTS = { dampingRatio: 1, stiffness: 3800 };
const FAST_OUT_SLOW_IN = cubicBezier(0.4, 0, 0.2, 1);
const SPECS: DrawerSpecs = {
  open: DEFAULT_SPATIAL,
  close: FAST_EFFECTS,
  settle: { duration: 256, easing: FAST_OUT_SLOW_IN },
};
const W = 360;

describe('drawerSettlesOpen (AnchoredDraggable computeTarget)', () => {
  it('without velocity: the closest anchor', () => {
    expect(drawerSettlesOpen(-100, 0, W)).toBe(true);
    expect(drawerSettlesOpen(-200, 0, W)).toBe(false);
  });

  it('at or above 400dp/s: the next anchor in the direction of the fling', () => {
    expect(drawerSettlesOpen(-350, DRAWER_VELOCITY_THRESHOLD, W)).toBe(true);
    expect(drawerSettlesOpen(-10, -DRAWER_VELOCITY_THRESHOLD, W)).toBe(false);
  });

  it('slower: the positional threshold, 50% of the distance from the anchor behind', () => {
    // Opening from closed (moving forward): open once past the middle.
    expect(drawerSettlesOpen(-181, 100, W)).toBe(false);
    expect(drawerSettlesOpen(-180, 100, W)).toBe(true);
    // Closing from open: closed once past the middle.
    expect(drawerSettlesOpen(-179, -100, W)).toBe(true);
    expect(drawerSettlesOpen(-180, -100, W)).toBe(false);
  });
});

describe('exponentialDecayTarget (FloatExponentialDecaySpec)', () => {
  it('travels v / 4.2 minus the stop below 0.1 px/s', () => {
    expect(exponentialDecayTarget(0, 0.05)).toBe(0);
    expect(exponentialDecayTarget(0, 4200)).toBeCloseTo(1000 - 0.1 / 4.2, 3);
    expect(exponentialDecayTarget(10, -420)).toBeCloseTo(10 - 100 + 0.1 / 4.2, 3);
  });
});

describe('DrawerAnimation (DrawerState)', () => {
  it('opens on the default spatial spring from −width, overshooting the open anchor', () => {
    const a = new DrawerAnimation(false, W);
    expect(a.sample(0)).toMatchObject({ offset: -W, fraction: 0, running: false, visible: false });
    a.animateTo(true, SPECS, 1000);
    for (const t of [0, 16, 64, 160]) {
      const s = a.sample(1000 + t);
      expect(s.offset).toBeCloseTo(springValue(DEFAULT_SPATIAL, t, -W, 0), 6);
      expect(s.fraction).toBeCloseTo(Math.min(1, Math.max(0, (s.offset + W) / W)), 6);
    }
    let peak = -W;
    for (let t = 160; t < 1500; t += 4) peak = Math.max(peak, a.sample(1000 + t).offset);
    expect(peak).toBeGreaterThan(0);
    expect(a.sample(5000)).toMatchObject({ offset: 0, fraction: 1, running: false });
    expect(a.isSettledOpen).toBe(true);
  });

  it('closes on the fast effects spring (no overshoot)', () => {
    const a = new DrawerAnimation(true, W);
    a.animateTo(false, SPECS, 0);
    for (let t = 0; t < 400; t += 8) {
      const s = a.sample(t);
      if (s.running) expect(s.offset).toBeCloseTo(springValue(FAST_EFFECTS, t, 0, -W), 6);
      expect(s.offset).toBeGreaterThanOrEqual(-W - 1e-9);
    }
    expect(a.sample(1000)).toMatchObject({ offset: -W, running: false, visible: false });
  });

  it('a new target keeps the current offset and velocity (interruptible)', () => {
    const a = new DrawerAnimation(false, W);
    a.animateTo(true, SPECS, 0);
    const from = springValue(DEFAULT_SPATIAL, 80, -W, 0);
    const velocity = springVelocity(DEFAULT_SPATIAL, 80, -W, 0);
    a.animateTo(false, SPECS, 80);
    expect(a.velocity).toBeCloseTo(velocity, 6);
    for (const t of [0, 16, 32]) {
      expect(a.sample(80 + t).offset).toBeCloseTo(
        springValue(FAST_EFFECTS, t, from, -W, velocity),
        6,
      );
    }
  });

  it('a null spec jumps (reduced motion)', () => {
    const a = new DrawerAnimation(false, W);
    a.animateTo(true, { open: null, close: null, settle: null }, 0);
    expect(a.sample(0)).toMatchObject({ offset: 0, running: false });
  });

  it('drags follow the pointer between the anchors and interrupt an animation', () => {
    const a = new DrawerAnimation(true, W);
    a.animateTo(false, SPECS, 0);
    const at = a.sample(20).offset;
    a.startDrag(20);
    expect(a.isDragging).toBe(true);
    a.dragBy(-30);
    expect(a.sample(30).offset).toBeCloseTo(at - 30, 6);
    a.dragBy(10_000);
    expect(a.sample(40).offset).toBe(0);
    a.dragBy(-10_000);
    expect(a.sample(50)).toMatchObject({ offset: -W, fraction: 0 });
  });

  it('a slow release settles on the 256ms FastOutSlowIn tween', () => {
    const a = new DrawerAnimation(true, W);
    a.startDrag(0);
    a.dragBy(-100);
    // Moving back towards open slowly: the target is open (computeTarget), the velocity points
    // there but the decay would stop short, so the tween runs.
    expect(a.release(50, SPECS, 0)).toBe(true);
    expect(a.sample(128).offset).toBeCloseTo(-100 + 100 * FAST_OUT_SLOW_IN(0.5), 6);
    expect(a.sample(256)).toMatchObject({ offset: 0, running: false });
  });

  it('a release against the target tweens; a fling that reaches it decays and stops there', () => {
    const a = new DrawerAnimation(true, W);
    a.startDrag(0);
    a.dragBy(-250);
    // Past the middle and moving slowly towards open: positional threshold → closed, the
    // velocity points away from it → tween.
    expect(a.release(-50, SPECS, 0)).toBe(false);
    expect(a.sample(128).offset).toBeCloseTo(-250 - 110 * FAST_OUT_SLOW_IN(0.5), 6);

    const b = new DrawerAnimation(false, W);
    b.startDrag(0);
    b.dragBy(200);
    // A 3000px/s fling: the decay (3000 / 4.2 ≈ 714px) reaches the open anchor 160px away.
    expect(b.release(3000, SPECS, 0)).toBe(true);
    const s = b.sample(16);
    expect(s.offset).toBeCloseTo(-160 + (3000 / 4.2) * (1 - Math.exp(-4.2 * 0.016)), 3);
    expect(b.sample(200)).toMatchObject({ offset: 0, running: false });
    expect(b.isSettledOpen).toBe(true);
  });

  it('confirm vetoes roll back to the settled value', () => {
    const a = new DrawerAnimation(true, W);
    a.startDrag(0);
    a.dragBy(-300);
    expect(a.release(0, SPECS, 0, DRAWER_VELOCITY_THRESHOLD, () => false)).toBe(true);
    expect(a.sample(1000).offset).toBe(0);
  });

  it('a new width moves the resting offset to its anchor', () => {
    const a = new DrawerAnimation(false, W);
    a.setWidth(240);
    expect(a.sample(0).offset).toBe(-240);
  });
});
