import { cancelFrame, frame, spring } from 'motion';

/** A motion-scheme spring as Compose defines it: damping ratio ζ and stiffness k (mass 1). */
export interface SpringSpec {
  dampingRatio: number;
  stiffness: number;
  /**
   * Compose's visibility threshold, when not the Float default: the spring rests once within it
   * of the target (e.g. 1 for an Int animation).
   */
  visibilityThreshold?: number;
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
  return readSpringVars(getComputedStyle(el), `--m3e-sys-motion-spring-${token}`);
}

/**
 * Reads a spring from `<prefix>-duration`, `-damping-ratio` and `-stiffness` custom properties,
 * e.g. a component's generated spring (`--m3e-comp-fab-menu-defaults-toggle-progress`), which
 * references the motion-scheme token Compose uses. Null when the duration resolves to 0ms.
 */
export function readSpringVars(style: CSSStyleDeclaration, prefix: string): SpringSpec | null {
  if (Number.parseFloat(style.getPropertyValue(`${prefix}-duration`)) === 0) return null;
  const dampingRatio = readNumber(style, `${prefix}-damping-ratio`);
  const stiffness = readNumber(style, `${prefix}-stiffness`);
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}

/**
 * A number animated with an interruptible spring: a new target starts from the current value
 * *and velocity*, like Compose's Animatable. Uses Motion's spring generator and frame loop.
 * `onValue` receives every value written; `onSettle` runs once the value rests on its target.
 */
export class ValueSpring {
  #value: number | null = null;
  #generator: ReturnType<typeof spring> | null = null;
  #startedAt = 0;
  #step: (() => void) | null = null;

  constructor(
    private readonly onValue: (value: number) => void,
    private readonly onSettle?: (value: number) => void,
  ) {}

  get value(): number | null {
    return this.#value;
  }

  /** True while a spring is running. */
  get isAnimating(): boolean {
    return this.#step !== null;
  }

  /** Starts at `value` without animating or notifying (the rendered state already shows it). */
  snap(value: number): void {
    this.stop();
    this.#value = value;
  }

  /** Moves to `target` with `spec`, or instantly when `spec` is null. */
  to(target: number, spec: SpringSpec | null): void {
    const now = performance.now();
    let velocity = 0;
    if (this.#generator) {
      const elapsed = now - this.#startedAt;
      velocity = this.#generator.velocity?.(elapsed) ?? 0;
    }
    this.stop();
    if (this.#value === null || spec === null || (this.#value === target && velocity === 0)) {
      this.#set(target);
      this.onSettle?.(target);
      return;
    }
    const generator = spring({
      keyframes: [this.#value, target],
      velocity,
      stiffness: spec.stiffness,
      // Motion's mass defaults to 1, as in Compose's SpringSimulation.
      damping: 2 * spec.dampingRatio * Math.sqrt(spec.stiffness),
      // A custom threshold ends the spring as soon as it is that close (Compose's estimate).
      ...(spec.visibilityThreshold === undefined
        ? {}
        : { restDelta: spec.visibilityThreshold, restSpeed: Number.POSITIVE_INFINITY }),
    });
    this.#generator = generator;
    this.#startedAt = now;
    const step = () => {
      const { value, done } = generator.next(performance.now() - this.#startedAt);
      this.#set(done ? target : value);
      if (done) {
        this.stop();
        this.onSettle?.(target);
      }
    };
    this.#step = step;
    // Hold the current value until the first frame (the styles behind it may already show the target).
    this.#set(this.#value);
    frame.update(step, true);
  }

  stop(): void {
    if (this.#step) cancelFrame(this.#step);
    this.#step = null;
    this.#generator = null;
  }

  #set(value: number): void {
    this.#value = value;
    this.onValue(value);
  }
}

/** A {@link ValueSpring} that writes one CSS length property (px) of an element. */
export class LengthSpring extends ValueSpring {
  constructor(el: HTMLElement, property: 'borderRadius') {
    super((value) => {
      el.style[property] = `${String(value)}px`;
    });
  }
}
