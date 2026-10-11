import { cancelFrame, frame, spring } from 'motion';

/** A motion-scheme spring as Compose defines it: damping ratio ζ and stiffness k (mass 1). */
export interface SpringSpec {
  dampingRatio: number;
  stiffness: number;
}

const readNumber = (style: CSSStyleDeclaration, name: string): number =>
  Number.parseFloat(style.getPropertyValue(name));

/**
 * Reads a motion-scheme spring from the element's resolved tokens
 * (`--m3e-sys-motion-spring-<token>-damping-ratio` / `-stiffness`), so themes that switch the
 * motion scheme apply. Returns null when the scheme's duration resolves to 0ms (reduced motion
 * for spatial springs): the caller should jump to the target.
 */
export function readSpring(el: Element, token: string): SpringSpec | null {
  const style = getComputedStyle(el);
  if (
    Number.parseFloat(style.getPropertyValue(`--m3e-sys-motion-spring-${token}-duration`)) === 0
  ) {
    return null;
  }
  const dampingRatio = readNumber(style, `--m3e-sys-motion-spring-${token}-damping-ratio`);
  const stiffness = readNumber(style, `--m3e-sys-motion-spring-${token}-stiffness`);
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}

/**
 * Animates one CSS length property (px) of an element with an interruptible spring: a new target
 * starts from the current value *and velocity*, like Compose's Animatable. Uses Motion's spring
 * generator and frame loop.
 */
export class LengthSpring {
  #value: number | null = null;
  #generator: ReturnType<typeof spring> | null = null;
  #startedAt = 0;
  #step: (() => void) | null = null;

  constructor(
    private readonly el: HTMLElement,
    private readonly property: 'borderRadius',
  ) {}

  get value(): number | null {
    return this.#value;
  }

  /** Moves to `target` px with `spec`, or instantly when `spec` is null. */
  to(target: number, spec: SpringSpec | null): void {
    const now = performance.now();
    let velocity = 0;
    if (this.#generator) {
      const elapsed = now - this.#startedAt;
      velocity = this.#generator.velocity?.(elapsed) ?? 0;
    }
    this.stop();
    if (this.#value === null || spec === null || this.#value === target) {
      this.#set(target);
      return;
    }
    const generator = spring({
      keyframes: [this.#value, target],
      velocity,
      stiffness: spec.stiffness,
      // Motion's mass defaults to 1, as in Compose's SpringSimulation.
      damping: 2 * spec.dampingRatio * Math.sqrt(spec.stiffness),
    });
    this.#generator = generator;
    this.#startedAt = now;
    const step = () => {
      const { value, done } = generator.next(performance.now() - this.#startedAt);
      this.#set(done ? target : value);
      if (done) this.stop();
    };
    this.#step = step;
    frame.update(step, true);
  }

  stop(): void {
    if (this.#step) cancelFrame(this.#step);
    this.#step = null;
    this.#generator = null;
  }

  #set(value: number): void {
    this.#value = value;
    this.el.style[this.property] = `${String(value)}px`;
  }
}
