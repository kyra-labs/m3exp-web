// An interruptible spring value with Compose `Animatable` semantics (animation-core Animatable.kt
// @19991f2c): `animateTo` starts from the current value *and velocity*, the animation runs for
// Compose's own duration estimate (FloatSpringSpec.getDurationNanos at the visibility threshold)
// and then rests exactly on the target. Time is injected, so callers drive it from their frame loop
// (m3e-elements) and tests can step it deterministically.
import {
  DEFAULT_DISPLACEMENT_THRESHOLD,
  type SpringSpec,
  springDurationMillis,
  springValue,
  springVelocity,
} from './spring.js';

export class SpringAnimatable {
  #value: number;
  #velocity = 0;
  #target: number;
  #from = 0;
  #velocity0 = 0;
  #start = 0;
  #duration = 0;
  #spec: SpringSpec | null = null;

  /**
   * @param value initial value, at rest.
   * @param visibilityThreshold Compose's visibility threshold: 0.01 for Float animations
   *   (`Spring.DefaultDisplacementThreshold`), 1 for an Int one.
   */
  constructor(
    value: number,
    readonly visibilityThreshold: number = DEFAULT_DISPLACEMENT_THRESHOLD,
  ) {
    this.#value = value;
    this.#target = value;
  }

  get value(): number {
    return this.#value;
  }

  /** Units per second. */
  get velocity(): number {
    return this.#velocity;
  }

  get target(): number {
    return this.#target;
  }

  get isRunning(): boolean {
    return this.#spec !== null;
  }

  /** Jumps to `value` and stops. */
  snapTo(value: number): void {
    this.#spec = null;
    this.#value = value;
    this.#target = value;
    this.#velocity = 0;
  }

  /**
   * Animates to `target` from the value and velocity at `now` (ms); a null spec (e.g. a spatial
   * spring under reduced motion) jumps there. `velocity` (units per second) overrides the current
   * velocity, e.g. after the value was driven by something else (a drag, a tween).
   */
  animateTo(target: number, spec: SpringSpec | null, now: number, velocity?: number): void {
    this.sample(now);
    if (spec === null) {
      this.snapTo(target);
      return;
    }
    this.#from = this.#value;
    this.#velocity0 = velocity ?? this.#velocity;
    this.#target = target;
    this.#start = now;
    this.#spec = spec;
    this.#duration = springDurationMillis(
      spec,
      this.#from,
      target,
      this.#velocity0,
      this.visibilityThreshold,
    );
    if (this.#duration <= 0) this.snapTo(target);
  }

  /** Advances to `now` (ms) and returns the value; the animation ends once its duration is up. */
  sample(now: number): number {
    const spec = this.#spec;
    if (spec === null) return this.#value;
    const elapsed = Math.max(0, now - this.#start);
    if (elapsed >= this.#duration) {
      this.snapTo(this.#target);
      return this.#value;
    }
    this.#value = springValue(spec, elapsed, this.#from, this.#target, this.#velocity0);
    this.#velocity = springVelocity(spec, elapsed, this.#from, this.#target, this.#velocity0);
    return this.#value;
  }
}
