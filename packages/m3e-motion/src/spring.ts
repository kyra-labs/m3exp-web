// Spring helpers with Compose `FloatSpringSpec` semantics (animation-core FloatAnimationSpec.kt
// L133–187 @19991f2c), built on the ported SpringSimulation / SpringEstimation.
import { estimateAnimationDurationMillis } from './spring-estimation.js';
import { SpringSimulation } from './spring-simulation.js';

/** A Material motion-scheme spring (`dampingRatio` ζ, `stiffness` k; mass 1). */
export interface SpringSpec {
  readonly dampingRatio: number;
  readonly stiffness: number;
}

/** `Spring.DefaultDisplacementThreshold` (VectorizedAnimationSpec.kt L842). */
export const DEFAULT_DISPLACEMENT_THRESHOLD = 0.01;

const f32 = Math.fround;

function simulation(spec: SpringSpec, targetValue: number): SpringSimulation {
  const sim = new SpringSimulation(targetValue);
  sim.dampingRatio = spec.dampingRatio;
  sim.stiffness = spec.stiffness;
  return sim;
}

/** Value at `playTimeMillis` (whole milliseconds, as in Compose). */
export function springValue(
  spec: SpringSpec,
  playTimeMillis: number,
  initialValue: number,
  targetValue: number,
  initialVelocity = 0,
): number {
  return simulation(spec, targetValue).updateValues(initialValue, initialVelocity, playTimeMillis)
    .value;
}

/** Velocity (units/s) at `playTimeMillis`. */
export function springVelocity(
  spec: SpringSpec,
  playTimeMillis: number,
  initialValue: number,
  targetValue: number,
  initialVelocity = 0,
): number {
  return simulation(spec, targetValue).updateValues(initialValue, initialVelocity, playTimeMillis)
    .velocity;
}

/**
 * Duration until the spring stays within `visibilityThreshold` of the target, as Compose computes
 * it (`FloatSpringSpec.getDurationNanos` / 1e6).
 */
export function springDurationMillis(
  spec: SpringSpec,
  initialValue: number,
  targetValue: number,
  initialVelocity = 0,
  visibilityThreshold = DEFAULT_DISPLACEMENT_THRESHOLD,
): number {
  const sim = simulation(spec, targetValue);
  const threshold = f32(visibilityThreshold);
  return estimateAnimationDurationMillis(
    sim.stiffness,
    sim.dampingRatio,
    f32(f32(initialVelocity) / threshold),
    f32(f32(f32(initialValue) - f32(targetValue)) / threshold),
    1,
  );
}

/**
 * Damping coefficient c = 2ζ√(k·m), for physics engines parameterized by stiffness/damping/mass
 * (e.g. Motion's `{ type: 'spring', stiffness, damping, mass }`).
 */
export function dampingCoefficient(spec: SpringSpec, mass = 1): number {
  return 2 * spec.dampingRatio * Math.sqrt(spec.stiffness * mass);
}

/** Inverse of {@link dampingCoefficient}: ζ = c / (2√(k·m)). */
export function dampingRatioFromCoefficient(damping: number, stiffness: number, mass = 1): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}
