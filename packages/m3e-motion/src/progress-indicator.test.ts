// The progress indicators' timelines (ProgressIndicator.kt L929–1076, WavyProgressIndicator.kt,
// *WavyProgressModifiers.kt), driven by the generated tokens.
import { describe, expect, it } from 'vitest';
import { progressIndicatorDefaults as d } from '../../m3e-tokens/src/generated/components.js';
import { cubicBezier, parseCubicBezier } from './cubic-bezier.js';
import {
  AmplitudeAnimation,
  type CircularIndeterminateTiming,
  type LinearIndeterminateTiming,
  circularIndeterminateFrame,
  indicatorAmplitude,
  linearIndeterminateFractions,
  waveOffset,
  waveTravelMillis,
} from './progress-indicator.js';

// MotionTokens.EasingEmphasizedAccelerateCubicBezier / EasingStandardCubicBezier.
const emphasizedAccelerate = cubicBezier(0.3, 0, 0.8, 0.15);
const standard = cubicBezier(0.2, 0, 0, 1);

/** Reference solve: bisection on x(t) to 1e-12, then y(t). */
function reference(a: number, b: number, c: number, dd: number, x: number): number {
  const bez = (p1: number, p2: number, t: number) =>
    3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (bez(a, c, mid) < x) lo = mid;
    else hi = mid;
  }
  return bez(b, dd, (lo + hi) / 2);
}

const linear: LinearIndeterminateTiming = {
  durationMillis: d.progressIndicatorDefaultsLinearIndeterminateDuration,
  firstHead: [
    d.progressIndicatorDefaultsLinearFirstHeadDelay,
    d.progressIndicatorDefaultsLinearFirstHeadDuration,
  ],
  firstTail: [
    d.progressIndicatorDefaultsLinearFirstTailDelay,
    d.progressIndicatorDefaultsLinearFirstTailDuration,
  ],
  secondHead: [
    d.progressIndicatorDefaultsLinearSecondHeadDelay,
    d.progressIndicatorDefaultsLinearSecondHeadDuration,
  ],
  secondTail: [
    d.progressIndicatorDefaultsLinearSecondTailDelay,
    d.progressIndicatorDefaultsLinearSecondTailDuration,
  ],
  easing: emphasizedAccelerate,
};

const circular: CircularIndeterminateTiming = {
  durationMillis: d.progressIndicatorDefaultsCircularIndeterminateDuration,
  rotation: d.progressIndicatorDefaultsCircularRotation,
  additionalRotation: d.progressIndicatorDefaultsCircularAdditionalRotation,
  additionalDelayMillis: d.progressIndicatorDefaultsCircularAdditionalRotationDelay,
  additionalDurationMillis: d.progressIndicatorDefaultsCircularAdditionalRotationDuration,
  minProgress: d.progressIndicatorDefaultsCircularMinProgress,
  maxProgress: d.progressIndicatorDefaultsCircularMaxProgress,
  easing: standard,
};

describe('cubicBezier (Compose CubicBezierEasing)', () => {
  it('matches a reference solve of the motion easings within 1e-6', () => {
    for (const [a, b, c, dd] of [
      [0.3, 0, 0.8, 0.15],
      [0.2, 0, 0, 1],
      [0.05, 0.7, 0.1, 1],
      [0.4, 0, 0.2, 1],
      [0, 0, 1, 1],
    ] as const) {
      const ease = cubicBezier(a, b, c, dd);
      for (let i = 1; i < 100; i++) {
        const x = i / 100;
        expect(Math.abs(ease(x) - reference(a, b, c, dd, x))).toBeLessThan(1e-6);
      }
    }
  });

  it('passes fractions outside ]0, 1[ through, like Compose', () => {
    expect(standard(0)).toBe(0);
    expect(standard(1)).toBe(1);
    expect(standard(-0.5)).toBe(-0.5);
  });

  it('parses resolved motion easing tokens', () => {
    expect(parseCubicBezier('cubic-bezier(0.2, 0, 0, 1)')!(0.5)).toBeCloseTo(standard(0.5), 9);
    expect(parseCubicBezier('ease')).toBeNull();
  });
});

describe('indeterminate linear indicator (1750ms cycle)', () => {
  it('starts with no lines drawn', () => {
    expect(linearIndeterminateFractions(0, linear)).toEqual([0, 0, 0, 0]);
  });

  it('eases each 0 → 1 keyframe pair from its delay and holds at 1 to the end of the cycle', () => {
    // [first tail, first head, second tail, second head] at t:
    const at = (t: number) => linearIndeterminateFractions(t, linear);
    expect(at(500)[1]).toBeCloseTo(emphasizedAccelerate(0.5), 9);
    expect(at(1000)[1]).toBe(1);
    expect(at(250)[0]).toBe(0);
    expect(at(750)[0]).toBeCloseTo(emphasizedAccelerate(0.5), 9);
    expect(at(650)[3]).toBe(0);
    expect(at(1075)[3]).toBeCloseTo(emphasizedAccelerate(0.5), 9);
    expect(at(900)[2]).toBe(0);
    expect(at(1749)[2]).toBeCloseTo(emphasizedAccelerate(849 / 850), 9);
    expect(at(1700)).toEqual([1, 1, expect.any(Number), 1]);
  });

  it('repeats every LinearAnimationDuration', () => {
    for (const t of [0, 300, 900, 1400]) {
      expect(linearIndeterminateFractions(t + 1750 * 3, linear)).toEqual(
        linearIndeterminateFractions(t, linear),
      );
    }
  });

  it('keeps each head ahead of its tail', () => {
    for (let t = 0; t < 1750; t += 5) {
      const [t1, h1, t2, h2] = linearIndeterminateFractions(t, linear);
      expect(h1).toBeGreaterThanOrEqual(t1);
      expect(h2).toBeGreaterThanOrEqual(t2);
    }
  });
});

describe('indeterminate circular indicator (6000ms cycle)', () => {
  it('rotates 1080° linearly per cycle plus a linear 90° step every 1500ms', () => {
    expect(circularIndeterminateFrame(0, circular)).toEqual({ rotation: 0, sweep: 0.1 });
    // 150ms in: half the first step (45°) + 1080 × 150 / 6000 (27°).
    expect(circularIndeterminateFrame(150, circular).rotation).toBeCloseTo(72, 9);
    expect(circularIndeterminateFrame(1000, circular).rotation).toBeCloseTo(180 + 90, 9);
    expect(circularIndeterminateFrame(1650, circular).rotation).toBeCloseTo(297 + 135, 9);
    expect(circularIndeterminateFrame(5999, circular).rotation).toBeCloseTo(
      (1080 * 5999) / 6000 + 360,
      9,
    );
  });

  it('grows the sweep linearly from 10% to 87%, then shrinks it on the standard easing', () => {
    expect(circularIndeterminateFrame(1500, circular).sweep).toBeCloseTo(0.1 + 0.77 / 2, 9);
    expect(circularIndeterminateFrame(3000, circular).sweep).toBeCloseTo(0.87, 9);
    expect(circularIndeterminateFrame(4500, circular).sweep).toBeCloseTo(
      0.87 - 0.77 * standard(0.5),
      9,
    );
  });

  it('is continuous modulo a full turn across the cycle boundary', () => {
    const end = circularIndeterminateFrame(6000 - 1e-6, circular).rotation % 360;
    const start = circularIndeterminateFrame(6000, circular).rotation % 360;
    expect(Math.min(Math.abs(end - start), 360 - Math.abs(end - start))).toBeLessThan(1e-3);
  });
});

describe('wave offset', () => {
  it('moves one wavelength per second by default (waveSpeed = wavelength)', () => {
    const travel = waveTravelMillis(40, 40, d.progressIndicatorDefaultsWaveMinTravelDuration);
    expect(travel).toBe(d.progressIndicatorDefaultsWaveTravelDuration);
    expect(waveOffset(250, travel)).toBe(0.25);
    expect(waveOffset(1250, travel)).toBe(0.25);
  });

  it('circular: one full turn per vertex-count seconds; floored at 50ms; holds without speed', () => {
    expect(waveTravelMillis(15, 15, 50, 9)).toBe(9000);
    expect(waveTravelMillis(1, 1000, 50)).toBe(50);
    expect(waveTravelMillis(40, 0, 50)).toBe(Number.POSITIVE_INFINITY);
    expect(waveOffset(1234, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('determinate amplitude', () => {
  const min = d.progressIndicatorDefaultsAmplitudeMinProgress;
  const max = d.progressIndicatorDefaultsAmplitudeMaxProgress;
  const increase = { durationMillis: 500, easing: standard };
  const decrease = { durationMillis: 500, easing: emphasizedAccelerate };

  it('is flat at ≤ 10% and ≥ 95%, full in between', () => {
    expect(indicatorAmplitude(0, min, max)).toBe(0);
    expect(indicatorAmplitude(0.1, min, max)).toBe(0);
    expect(indicatorAmplitude(0.1001, min, max)).toBe(1);
    expect(indicatorAmplitude(0.9499, min, max)).toBe(1);
    expect(indicatorAmplitude(0.95, min, max)).toBe(0);
  });

  it('starts at its first target, then tweens by direction', () => {
    const a = new AmplitudeAnimation(0);
    expect(a.update(1, 1000, increase, decrease)).toBe(true);
    expect(a.sample(1250)).toBeCloseTo(standard(0.5), 9);
    expect(a.sample(1500)).toBe(1);
    expect(a.update(0, 2000, increase, decrease)).toBe(true);
    expect(a.sample(2250)).toBeCloseTo(1 - emphasizedAccelerate(0.5), 9);
  });

  it('ignores a new target while a tween runs (Compose never retargets it)', () => {
    const a = new AmplitudeAnimation(0);
    a.update(1, 0, increase, decrease);
    expect(a.update(0, 100, increase, decrease)).toBe(false);
    expect(a.target).toBe(1);
    expect(a.sample(500)).toBe(1);
    expect(a.update(0, 600, increase, decrease)).toBe(true);
  });

  it('jumps with a 0ms tween (reduced motion)', () => {
    const a = new AmplitudeAnimation(0);
    a.update(1, 0, { durationMillis: 0, easing: standard }, decrease);
    expect(a.value).toBe(1);
    expect(a.isRunning).toBe(false);
  });
});
