// ROADMAP M3 DoD: spring positions match Compose reference samples (JVM harness export) within
// 1e-4. Fixture: packages/m3e-motion/reference/SpringReference.kt compiled with the unmodified
// SpringSimulation.kt / SpringEstimation.kt @19991f2c (tools/jvm/kotlin.mjs).
import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/spring-reference.json' with { type: 'json' };
import { estimateAnimationDurationMillis } from './spring-estimation.js';
import { SpringSimulation } from './spring-simulation.js';

interface Simulation {
  name: string;
  dampingRatio: number;
  stiffness: number;
  initialValue: number;
  finalPosition: number;
  initialVelocity: number;
  samples: [number, number | null, number | null][];
}

const simulations = reference.simulations as Simulation[];

describe('SpringSimulation vs Compose (JVM)', () => {
  let exact = 0;
  let total = 0;
  let maxValueError = 0;

  it.each(simulations.map((s) => [s.name, s] as const))('%s', (_name, s) => {
    const sim = new SpringSimulation(s.finalPosition);
    sim.dampingRatio = s.dampingRatio;
    sim.stiffness = s.stiffness;
    expect(s.samples.length).toBeGreaterThan(10);
    for (const [t, value, velocity] of s.samples) {
      const m = sim.updateValues(s.initialValue, s.initialVelocity, t);
      const valueError = Math.abs(m.value - Math.fround(value!));
      maxValueError = Math.max(maxValueError, valueError);
      expect(valueError, `${s.name} value @${String(t)}ms`).toBeLessThanOrEqual(1e-4);
      expect(
        Math.abs(m.velocity - velocity!),
        `${s.name} velocity @${String(t)}ms`,
      ).toBeLessThanOrEqual(1e-4 * Math.max(1, Math.abs(velocity!)));
      total++;
      // Kotlin prints the shortest decimal for a Float; Math.fround recovers the exact float32.
      if (m.value === Math.fround(value!) && m.velocity === Math.fround(velocity!)) exact++;
    }
  });

  it('is bit-exact with Compose in float32 (stronger than the 1e-4 DoD)', () => {
    console.log(
      `spring samples: ${String(total)}, bit-exact ${String(exact)} (${((exact / total) * 100).toFixed(2)}%), max |Δvalue| ${maxValueError.toExponential(2)}`,
    );
    expect(total).toBe(simulations.reduce((n, s) => n + s.samples.length, 0));
    expect(exact).toBe(total);
  });
});

describe('estimateAnimationDurationMillis vs Compose (JVM)', () => {
  it.each(reference.durations.map((d, i) => [`${d.name} #${String(i)}`, d] as const))(
    '%s',
    (_n, d) => {
      expect(
        estimateAnimationDurationMillis(
          d.stiffness,
          d.dampingRatio,
          d.initialVelocity,
          d.initialDisplacement,
          d.delta,
        ),
      ).toBe(d.millis);
    },
  );
});
