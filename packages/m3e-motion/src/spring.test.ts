import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/spring-reference.json' with { type: 'json' };
import { springToLinear } from './linear.js';
import {
  dampingCoefficient,
  dampingRatioFromCoefficient,
  springDurationMillis,
  springValue,
  springVelocity,
} from './spring.js';
import { SpringSimulation } from './spring-simulation.js';

const SCHEME = {
  'standard.fastSpatial': { dampingRatio: 0.9, stiffness: 1400 },
  'standard.defaultSpatial': { dampingRatio: 0.9, stiffness: 700 },
  'standard.slowSpatial': { dampingRatio: 0.9, stiffness: 300 },
  'expressive.fastSpatial': { dampingRatio: 0.6, stiffness: 800 },
  'expressive.defaultSpatial': { dampingRatio: 0.8, stiffness: 380 },
  'expressive.slowSpatial': { dampingRatio: 0.8, stiffness: 200 },
  'standard.fastEffects': { dampingRatio: 1, stiffness: 3800 },
  'standard.defaultEffects': { dampingRatio: 1, stiffness: 1600 },
  'standard.slowEffects': { dampingRatio: 1, stiffness: 800 },
} as const;

describe('FloatSpringSpec helpers', () => {
  it('springValue / springVelocity equal the simulation', () => {
    const spec = SCHEME['expressive.defaultSpatial'];
    const sim = new SpringSimulation(100);
    sim.dampingRatio = spec.dampingRatio;
    sim.stiffness = spec.stiffness;
    const m = sim.updateValues(20, -300, 123);
    expect(springValue(spec, 123, 20, 100, -300)).toBe(m.value);
    expect(springVelocity(spec, 123, 20, 100, -300)).toBe(m.velocity);
  });

  it('springDurationMillis reproduces Compose getDurationNanos (JVM fixture, 0 → 1)', () => {
    let checked = 0;
    for (const d of reference.durations) {
      const spec = SCHEME[d.name as keyof typeof SCHEME] as
        { dampingRatio: number; stiffness: number } | undefined;
      if (!spec) continue;
      // Fixture rows encode threshold t as displacement -1/t and velocity v0/t.
      const threshold = Math.fround(-1 / d.initialDisplacement);
      const v0 = d.initialVelocity * threshold;
      expect(springDurationMillis(spec, 0, 1, v0, threshold), d.name).toBe(d.millis);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(36);
  });

  it.each([
    ['standard.fastSpatial', 67.35],
    ['standard.defaultSpatial', 47.62],
    ['standard.slowSpatial', 31.18],
    ['expressive.fastSpatial', 33.94],
    ['expressive.defaultSpatial', 31.19],
    ['expressive.slowSpatial', 22.63],
    ['standard.fastEffects', 123.29],
    ['standard.defaultEffects', 80],
    ['standard.slowEffects', 56.57],
  ] as const)('damping coefficient for %s matches FOUNDATIONS §4 (c = 2ζ√k)', (name, c) => {
    const spec = SCHEME[name];
    expect(dampingCoefficient(spec)).toBeCloseTo(c, 2);
    expect(dampingRatioFromCoefficient(dampingCoefficient(spec), spec.stiffness)).toBeCloseTo(
      spec.dampingRatio,
      10,
    );
  });
});

describe('springToLinear', () => {
  it.each(Object.entries(SCHEME))('%s', (_name, spec) => {
    const result = springToLinear(spec);
    expect(result.durationMillis).toBe(springDurationMillis(spec, 0, 1, 0, 0.001));
    expect(result.stops.length).toBeLessThanOrEqual(40);
    expect(result.stops[0]).toEqual([0, 0]);
    expect(result.stops.at(-1)).toEqual([1, 1]);
    for (let i = 1; i < result.stops.length; i++) {
      expect(result.stops[i]![0]).toBeGreaterThan(result.stops[i - 1]![0]);
    }
    expect(result.maxError).toBeLessThan(0.0015);
    expect(result.easing).toMatch(/^linear\(0, (-?[\d.]+ [\d.]+%, )+1\)$/);
  });

  it('effects springs never overshoot; expressive spatial springs do', () => {
    const peak = (spec: { dampingRatio: number; stiffness: number }) =>
      Math.max(...springToLinear(spec).stops.map(([, y]) => y));
    expect(peak(SCHEME['standard.defaultEffects'])).toBeLessThanOrEqual(1);
    expect(peak(SCHEME['expressive.fastSpatial'])).toBeGreaterThan(1.05);
  });

  it('honours maxStops', () => {
    expect(
      springToLinear(SCHEME['expressive.fastSpatial'], { maxStops: 12 }).stops.length,
    ).toBeLessThanOrEqual(12);
    expect(() => springToLinear(SCHEME['expressive.fastSpatial'], { maxStops: 1 })).toThrow();
  });
});
