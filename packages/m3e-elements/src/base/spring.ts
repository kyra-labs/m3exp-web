import {
  type SpringSpec,
  springDurationMillis,
  springValue,
  springVelocity,
} from '@kyralabs/m3e-motion';

// Interruptible Compose springs for the elements layer (MenuPopup, ButtonGroupLayout), stepped by
// the caller's frame loop with m3e-motion's SpringSimulation port.

const readNumber = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name));

/**
 * The motion-scheme spring `token` resolved on `el` (`--m3e-sys-motion-spring-<token>-*`), or null
 * when its duration resolves to 0ms (reduced motion snaps spatial springs).
 */
export function readSpring(style: CSSStyleDeclaration, token: string): SpringSpec | null {
  if (readNumber(style, `--m3e-sys-motion-spring-${token}-duration`) === 0) return null;
  const dampingRatio = readNumber(style, `--m3e-sys-motion-spring-${token}-damping-ratio`);
  const stiffness = readNumber(style, `--m3e-sys-motion-spring-${token}-stiffness`);
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}

/**
 * One interruptible Compose spring: a new target starts from the current value and velocity.
 * Used by MenuPopup and ButtonGroupLayout.
 */
export class Spring {
  value: number;
  #from: number;
  #to: number;
  #moving = false;
  #velocity = 0;
  #start = 0;
  #duration = 0;
  #spec: SpringSpec | null = null;

  constructor(value: number) {
    this.value = value;
    this.#from = value;
    this.#to = value;
  }

  /** The value it is heading for. */
  get target(): number {
    return this.#to;
  }

  /** True from a `to()` that animates until `step()` reaches the target. */
  get isMoving(): boolean {
    return this.#moving;
  }

  /** Retargets at `now` (ms). */
  to(target: number, spec: SpringSpec | null, now: number): void {
    const elapsed = Math.max(0, Math.round(now - this.#start));
    const velocity =
      this.#spec === null || elapsed >= this.#duration
        ? 0
        : springVelocity(this.#spec, elapsed, this.#from, this.#to, this.#velocity);
    this.#from = this.value;
    this.#to = target;
    this.#spec = spec;
    this.#velocity = velocity;
    this.#start = now;
    this.#duration =
      spec === null || this.value === target
        ? 0
        : springDurationMillis(spec, this.value, target, velocity);
    this.#moving = this.#duration > 0;
    if (!this.#moving) this.value = target;
  }

  /** Advances to `now`; returns true while still moving. */
  step(now: number): boolean {
    const elapsed = Math.max(0, Math.round(now - this.#start));
    if (this.#spec === null || elapsed >= this.#duration) {
      this.value = this.#to;
      this.#moving = false;
      return false;
    }
    this.value = springValue(this.#spec, elapsed, this.#from, this.#to, this.#velocity);
    return true;
  }
}
