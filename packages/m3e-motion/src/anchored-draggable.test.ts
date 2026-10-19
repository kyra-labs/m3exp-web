import { describe, expect, it } from 'vitest';
import {
  ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY,
  AnchoredDraggableAnimation,
  DraggableAnchors,
  computeTarget,
  defaultPositionalThreshold,
} from './anchored-draggable.js';
import { drawerSettlesOpen } from './navigation-drawer.js';
import { springDurationMillis, springValue } from './spring.js';

// Reference cases ported from compose/foundation/foundation/src/androidDeviceTest/kotlin/androidx/
// compose/foundation/anchoredDraggable/AnchoredDraggableStateTest.kt@19991f2c (vendored,
// m3e-codegen androidx-foundation-sources): the Compose tests drive a real composition; here
// the same anchors, offsets and velocities go through the port with the time stepped by hand.
type V = 'A' | 'B' | 'C' | 'D';
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };
/** Spring.DampingRatioHighBouncy, StiffnessMedium (FloatSpringSpec defaults). */
const HIGH_BOUNCY = { dampingRatio: 0.2, stiffness: 1500 };
const VT = ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY;

const anchors = (...entries: [V, number][]) => new DraggableAnchors<V>(entries);

/** Runs `a` to rest in 16ms frames from `t0`; returns the end time and the offsets seen. */
function settle(a: AnchoredDraggableAnimation<V>, t0: number): { t: number; seen: number[] } {
  const seen: number[] = [];
  let t = t0;
  for (let i = 0; i < 1000 && a.sample(t).running; i++) {
    seen.push(a.offset);
    t += 16;
  }
  seen.push(a.offset);
  return { t, seen };
}

describe('DraggableAnchors (DefaultDraggableAnchors)', () => {
  it('positions, bounds and closest anchors; ties go to the later anchor', () => {
    const a = anchors(['A', 0], ['B', 100], ['C', 300]);
    expect(a.positionOf('B')).toBe(100);
    expect(a.positionOf('D')).toBeNaN();
    expect(a.hasPositionFor('C')).toBe(true);
    expect([a.minPosition(), a.maxPosition()]).toEqual([0, 300]);
    expect(a.closestAnchor(49)).toBe('A');
    expect(a.closestAnchor(50)).toBe('B');
    expect(a.closestAnchor(120, true)).toBe('C');
    expect(a.closestAnchor(120, false)).toBe('B');
    expect(a.closestAnchor(100, true)).toBe('B');
    expect(new DraggableAnchors<V>([]).minPosition()).toBeNaN();
    expect(new DraggableAnchors<V>([]).closestAnchor(0)).toBeUndefined();
  });

  it('equals compares keys and positions in order', () => {
    expect(anchors(['A', 0], ['B', 1]).equals(anchors(['A', 0], ['B', 1]))).toBe(true);
    expect(anchors(['A', 0], ['B', 1]).equals(anchors(['A', 0], ['B', 2]))).toBe(false);
  });
});

describe('computeTarget', () => {
  const ab = anchors(['A', 0], ['B', 100]);
  const half = defaultPositionalThreshold;

  // anchoredDraggable_fling_fromOffset_onlyAdvancesIfThresholdCrossed (L1452-1550) and its four
  // cases: the release just under the velocity threshold advances only past the threshold.
  it.each([
    ['offsetPastHalfwayBetweenAnchors_beyondPosThreshold_advances', 0.9, 0.8, true],
    ['offsetLessThanHalfwayBetweenAnchors_beyondPosThreshold_advances', 0.4, 0.3, true],
    ['offsetLessHalfwayBetweenAnchors_beforePosThreshold_doesntAdvance', 0.4, 0.5, false],
    ['offsetPastHalfwayBetweenAnchors_beforePosThreshold_doesntAdvance', 0.8, 0.9, false],
  ])('%s', (_name, fraction, threshold, advances) => {
    const positional = (d: number) => d * threshold;
    expect(computeTarget(ab, 100 * fraction, VT - 1, positional, VT)).toBe(advances ? 'B' : 'A');
    expect(computeTarget(ab, 100 - 100 * fraction, -(VT - 1), positional, VT)).toBe(
      advances ? 'A' : 'B',
    );
  });

  it('without velocity: the closest anchor', () => {
    expect(computeTarget(ab, 49, 0, half, VT)).toBe('A');
    expect(computeTarget(ab, 50, 0, half, VT)).toBe('B');
  });

  it('at or above the velocity threshold: the next anchor in the fling direction', () => {
    expect(computeTarget(ab, 1, VT, half, VT)).toBe('B');
    expect(computeTarget(ab, 99, -VT, half, VT)).toBe('A');
    // anchoredDraggable_state_canSkipStateByFling (L101-131): past B towards C, C.
    const abc = anchors(['A', 0], ['B', 100], ['C', 200]);
    expect(computeTarget(abc, 120, 2000, half, VT)).toBe('C');
  });

  it('an absolute positional threshold (BottomSheet: 56dp whatever the distance)', () => {
    const sheet = anchors(['A', 0], ['B', 400]);
    expect(computeTarget(sheet, 55, 10, () => 56, VT)).toBe('A');
    expect(computeTarget(sheet, 56, 10, () => 56, VT)).toBe('B');
    expect(computeTarget(sheet, 400 - 56, -10, () => 56, VT)).toBe('A');
  });
});

describe('AnchoredDraggableAnimation (AnchoredDraggableState)', () => {
  it('drags coerced between the outer anchors (newOffsetForDelta)', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 200]));
    a.startDrag(0);
    expect(a.dragBy(-50)).toBe(0);
    expect(a.dragBy(120)).toBe(120);
    expect(a.dragBy(500)).toBe(80);
    expect(a.offset).toBe(200);
    expect(a.targetValue).toBe('B');
  });

  // anchoredDraggable_performFling_positiveOffset_positiveVelocity (L1152-1197): under both
  // thresholds the fling settles back on A.
  it('a fling under both thresholds settles back', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 200]));
    a.startDrag(0);
    a.dragBy(200 * 0.5 * 0.9);
    expect(a.fling(VT * 0.9, { spec: DEFAULT_SPATIAL }, 0)).toBe('A');
    settle(a, 0);
    expect(a.settledValue).toBe('A');
    expect(a.offset).toBe(0);
  });

  // anchoredDraggable_performFling_positiveOffset_negativeVelocity (L1199-1250).
  it('a fling back under both thresholds from B settles on B', () => {
    const a = new AnchoredDraggableAnimation<V>('B', anchors(['A', 0], ['B', 200]));
    a.startDrag(0);
    a.dragBy(-200 * 0.5 * 0.9);
    expect(a.fling(-VT * 0.9, { spec: DEFAULT_SPATIAL }, 0)).toBe('B');
    settle(a, 0);
    expect([a.settledValue, a.offset]).toEqual(['B', 200]);
  });

  // anchoredDraggable_settleWhenOffsetEqualsTargetOffset (L1359-1397): no animation runs.
  it('a fling from the target offset ends at once', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 250]));
    a.startDrag(0);
    a.dragBy(250);
    expect(a.fling(1000, { spec: DEFAULT_SPATIAL }, 0)).toBe('B');
    expect(a.isAnimationRunning).toBe(false);
    expect([a.settledValue, a.offset]).toEqual(['B', 250]);
  });

  it('the snap spring starts at the release velocity and stops where it first reaches the target', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 400]));
    a.startDrag(0);
    a.dragBy(100);
    expect(a.fling(1500, { spec: DEFAULT_SPATIAL }, 1000)).toBe('B');
    // SnapFlingBehavior.animateWithTarget: the spring from 0 to the relative target (300).
    for (const t of [16, 48, 96]) {
      a.sample(1000 + t);
      const expected = 100 + springValue(DEFAULT_SPATIAL, t, 0, 300, 1500);
      if (expected >= 400) break;
      expect(a.offset).toBeCloseTo(expected, 6);
    }
    const { seen } = settle(a, 1096);
    // The overshooting spatial spring is cut at the anchor: the offset never passes 400.
    expect(Math.max(...seen)).toBe(400);
    expect(a.settledValue).toBe('B');
  });

  it('a fling with a veto (confirmValueChange) settles on the settled value', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 200]));
    a.startDrag(0);
    a.dragBy(150);
    expect(a.fling(0, { spec: DEFAULT_SPATIAL, confirm: () => false }, 0)).toBe('A');
    settle(a, 0);
    expect([a.settledValue, a.offset]).toEqual(['A', 0]);
  });

  it('a null spec (reduced motion) jumps', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 200]));
    a.startDrag(0);
    a.dragBy(150);
    expect(a.fling(0, { spec: null }, 0)).toBe('B');
    expect([a.settledValue, a.offset, a.isAnimationRunning]).toEqual(['B', 200, false]);
    expect(a.animateTo('A', null, 0)).toBe(false);
    expect(a.offset).toBe(0);
  });

  // anchoredDraggable_animateTo_animatesBeyondBounds (L595-640).
  it('animateTo may overshoot the anchors', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['C', 500]));
    expect(a.animateTo('C', HIGH_BOUNCY, 0)).toBe(true);
    const duration = springDurationMillis(HIGH_BOUNCY, 0, 500, 0);
    let highest = 0;
    for (let t = 0; t <= duration; t += 16) highest = Math.max(highest, a.sample(t).offset);
    expect(highest).toBeGreaterThan(500);
    a.sample(duration + 1);
    expect([a.settledValue, a.offset, a.isAnimationRunning]).toEqual(['C', 500, false]);
  });

  it('animateTo keeps the velocity of an interrupted animation (lastVelocity)', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 500]));
    a.animateTo('B', DEFAULT_SPATIAL, 0);
    a.sample(100);
    const { offset, velocity } = a;
    expect(velocity).toBeGreaterThan(0);
    a.animateTo('A', DEFAULT_SPATIAL, 100);
    a.sample(116);
    expect(a.offset).toBeCloseTo(springValue(DEFAULT_SPATIAL, 16, offset, 0, velocity), 6);
  });

  // anchoredDraggable_animateTo_alreadyAtTarget_noOps (L1399-1418).
  it('animateTo the current offset does nothing', () => {
    const a = new AnchoredDraggableAnimation<V>('B', anchors(['A', 0], ['B', 200], ['C', 300]));
    expect(a.animateTo('B', DEFAULT_SPATIAL, 0)).toBe(false);
    expect(a.offset).toBe(200);
  });

  // anchoredDraggable_targetValue_shouldBeEqualToCurrentValue_multipleAnchorsAtSameOffset (L241-261).
  it('several anchors at one offset: the settled value is the one snapped to', () => {
    const a = new AnchoredDraggableAnimation<V>(
      'B',
      anchors(['A', 1000], ['B', 0], ['C', 0], ['D', 0]),
    );
    expect([a.settledValue, a.targetValue]).toEqual(['B', 'B']);
    a.snapTo('C');
    expect([a.settledValue, a.targetValue]).toEqual(['C', 'C']);
  });

  // anchoredDraggable_targetNotInAnchors_animateTo_updatesCurrentValue (L653-662).
  it('animateTo a value without an anchor sets it without moving', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 200]));
    a.animateTo('C', DEFAULT_SPATIAL, 0);
    expect([a.settledValue, a.offset]).toEqual(['C', 0]);
  });

  // anchoredDraggable_updateAnchors_noOngoingDrag_shouldUpdateOffset (L686-706).
  it('updateAnchors at rest snaps to the new target', () => {
    const a = new AnchoredDraggableAnimation<V>('A');
    expect(a.offset).toBeNaN();
    a.updateAnchors(anchors(['A', 0], ['B', 200]));
    expect(a.offset).toBe(0);
    a.updateAnchors(anchors(['A', 100], ['B', 200]), 'B');
    expect([a.settledValue, a.offset]).toEqual(['B', 200]);
  });

  it('updateAnchors during an animation retargets it from where it is', () => {
    const a = new AnchoredDraggableAnimation<V>('A', anchors(['A', 0], ['B', 200]));
    a.animateTo('B', DEFAULT_SPATIAL, 0);
    a.sample(50);
    const mid = a.offset;
    a.updateAnchors(anchors(['A', 0], ['B', 300]), 'B', 50);
    expect(a.isAnimationRunning).toBe(true);
    expect(a.offset).toBe(mid);
    settle(a, 50);
    expect([a.settledValue, a.offset]).toEqual(['B', 300]);
  });
});

describe('the navigation drawer’s two-anchor target selection', () => {
  // drawerSettlesOpen (navigation-drawer.ts) is the drawer's own two-anchor computeTarget, kept
  // inline for its D17 budget. It agrees with the N-anchor port everywhere the drawer can release,
  // i.e. except a fling at or above the threshold released exactly on an anchor (where Compose's
  // directional closestAnchor search returns that anchor itself; the drawer's drags cannot end
  // there with such a velocity, since the offset follows the pointer).
  it('agrees with computeTarget over Closed (−width) / Open (0)', () => {
    const W = 360;
    const anchors = new DraggableAnchors<boolean>([
      [false, -W],
      [true, 0],
    ]);
    for (let offset = -W; offset <= 0; offset += 7.5) {
      for (const velocity of [-2000, -400, -399, -100, -1, 0, 1, 100, 399, 400, 2000]) {
        const onAnchor = offset === -W || offset === 0;
        if (onAnchor && Math.abs(velocity) >= 400) continue;
        expect(
          drawerSettlesOpen(offset, velocity, W),
          `offset ${String(offset)}, velocity ${String(velocity)}`,
        ).toBe(computeTarget(anchors, offset, velocity, (d) => d * 0.5, 400));
      }
    }
  });
});
