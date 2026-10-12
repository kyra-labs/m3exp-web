// The indeterminate LoadingIndicator timeline (LoadingIndicator.kt L391–451), driven by the
// generated choreography tokens. The spring itself is reference-tested in spring.test.ts.
import { describe, expect, it } from 'vitest';
import { loadingIndicator } from '../../m3e-tokens/src/generated/components.js';
import {
  type LoadingIndicatorTiming,
  indeterminateFrame,
  initialIndeterminateFrame,
  morphSpringDurationMillis,
} from './loading-indicator.js';
import { springValue } from './spring.js';

const timing: LoadingIndicatorTiming = {
  morphIntervalMillis: loadingIndicator.loadingIndicatorMorphInterval,
  rotationDurationMillis: loadingIndicator.loadingIndicatorRotationDuration,
  spring: {
    dampingRatio: loadingIndicator.loadingIndicatorMorphSpringDampingRatio,
    stiffness: loadingIndicator.loadingIndicatorMorphSpringStiffness,
  },
  visibilityThreshold: loadingIndicator.loadingIndicatorMorphSpringVisibilityThreshold,
};
const MORPHS = 7;
const interval = timing.morphIntervalMillis;
const turn = timing.rotationDurationMillis;
const global = (t: number) => (360 * Math.floor(t % turn)) / turn;

describe('indeterminate loading indicator timeline', () => {
  it('starts at the frame held under reduced motion', () => {
    expect(indeterminateFrame(0, MORPHS, timing)).toEqual(initialIndeterminateFrame);
  });

  it('finishes each morph spring within the morph interval ("will finish in less than 650ms")', () => {
    const d = morphSpringDurationMillis(timing);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(interval);
  });

  it('starts morph k at k × interval, a quarter turn further each time, cycling through the shapes', () => {
    for (let k = 0; k < 2 * MORPHS + 1; k++) {
      const t = k * interval;
      const frame = indeterminateFrame(t, MORPHS, timing);
      expect(frame.morphIndex, `k=${String(k)}`).toBe(k % MORPHS);
      expect(frame.morphProgress).toBe(0);
      expect(frame.rotation).toBeCloseTo(((90 * (k + 1)) % 360) + global(t), 9);
    }
  });

  it('follows the morph spring (overshooting past 1) while it runs', () => {
    const d = morphSpringDurationMillis(timing);
    const values = Array.from({ length: Math.floor(d) }, (_, ms) =>
      indeterminateFrame(3 * interval + ms, MORPHS, timing),
    );
    values.forEach((frame, ms) => {
      expect(frame.morphIndex).toBe(3);
      expect(frame.morphProgress).toBe(springValue(timing.spring, ms, 0, 1));
    });
    expect(Math.max(...values.map((f) => f.morphProgress))).toBeGreaterThan(1);
  });

  it('holds the next shape after the spring finishes, with a continuous rotation', () => {
    const d = morphSpringDurationMillis(timing);
    const done = indeterminateFrame(2 * interval + d, MORPHS, timing);
    expect(done.morphIndex).toBe(3);
    expect(done.morphProgress).toBe(0);
    // Morph 2 targets 270°; finishing adds a quarter turn, wrapping to 0° (`% FullRotation`).
    expect(done.rotation).toBeCloseTo(global(2 * interval + d), 9);
    // Near-continuous: at its end the spring is within visibilityThreshold of 1, so it adds
    // 90° ± threshold × 90° to 270° (Compose ends the low-damping spring early the same way).
    const last = indeterminateFrame(2 * interval + d - 1, MORPHS, timing);
    const offset = ((last.rotation - global(2 * interval + d - 1) + 180) % 360) - 180;
    expect(Math.abs(offset)).toBeLessThanOrEqual(timing.visibilityThreshold * 90);
    const end = indeterminateFrame(3 * interval - 1, MORPHS, timing);
    expect(end).toMatchObject({ morphIndex: 3, morphProgress: 0 });
  });

  it('turns once per rotation duration, linearly', () => {
    expect(indeterminateFrame(turn / 2, MORPHS, timing).rotation % 90).toBeCloseTo(
      global(turn / 2) % 90,
      9,
    );
    expect(global(turn)).toBe(0);
  });

  it('waits for a spring slower than the interval before the next morph', () => {
    const slow = { ...timing, morphIntervalMillis: 1 };
    const d = morphSpringDurationMillis(slow);
    expect(indeterminateFrame(d, MORPHS, slow)).toMatchObject({ morphIndex: 1, morphProgress: 0 });
    expect(indeterminateFrame(d - 1, MORPHS, slow).morphIndex).toBe(0);
  });
});
