import {
  type AmplitudeAnimation,
  type AmplitudeTween,
  type CircularIndeterminateTiming,
  type LinearIndeterminateTiming,
  SpringAnimatable,
  type SpringSpec,
  indicatorAmplitude,
  parseCubicBezier,
  waveOffset,
  waveTravelMillis,
} from '@kyralabs/m3e-motion';

/** The progress indicators' shared inputs (COMPONENT_SPEC §8). */
export interface ProgressIndicatorOptions {
  /** 0–1 for a determinate indicator; null for indeterminate. */
  value: number | null;
  /** `wavy` draws the wave (SVG paths, every frame); `flat` leaves the drawing to m3e-css. */
  shape: 'flat' | 'wavy';
  /**
   * Wave amplitude, 0–1 of the room the container leaves the stroke (Compose `amplitude`): a
   * function of the progress, or a fixed value. Default: determinate indicators are flat at ≤ 10%
   * and ≥ 95% (`WavyProgressIndicatorDefaults.indicatorAmplitude`), indeterminate ones full (1).
   */
  amplitude?: number | ((progress: number) => number) | null | undefined;
  /** Wavelength in px. Default: the `--m3e-comp-*-progress-indicator-*-wavelength` token. */
  wavelength?: number | null | undefined;
  /** Wave speed in px per second. Default: one wavelength per second (Compose `waveSpeed`). */
  waveSpeed?: number | null | undefined;
}

const P = '--m3e-comp-progress-indicator-defaults-';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const SVG_NS = 'http://www.w3.org/2000/svg';

export const num = (style: CSSStyleDeclaration, name: string): number =>
  Number.parseFloat(style.getPropertyValue(name));

/** A CSS <time> in ms (the CSS build may minify `500ms` to `.5s`). */
export const millis = (style: CSSStyleDeclaration, name: string): number => {
  const value = style.getPropertyValue(name).trim();
  const n = Number.parseFloat(value);
  return value.endsWith('ms') ? n : value.endsWith('s') ? n * 1000 : n;
};

const tween = (style: CSSStyleDeclaration, kind: string): AmplitudeTween => ({
  durationMillis: millis(style, `${P}amplitude-${kind}-duration`) || 0,
  easing: parseCubicBezier(style.getPropertyValue(`${P}amplitude-${kind}-easing`)) ?? ((f) => f),
});

/** Resolved tokens the driver needs, read once per update. */
export interface ProgressTokens {
  style: CSSStyleDeclaration;
  spring: SpringSpec | null;
  threshold: number;
  increase: AmplitudeTween;
  decrease: AmplitudeTween;
  rampMin: number;
  rampMax: number;
  travelMillis: number;
  minTravelMillis: number;
  thickness: number;
  trackThickness: number;
  gap: number;
  wavelength: number;
  stopSize: number;
  /** The root's size in px (re-measured on resize; read once, not every frame). */
  width: number;
  height: number;
  linear: LinearIndeterminateTiming | null;
  circular: CircularIndeterminateTiming | null;
}

export function readTokens(el: Element): ProgressTokens {
  const style = getComputedStyle(el);
  const dampingRatio = num(style, `${P}progress-damping-ratio`);
  const stiffness = num(style, `${P}progress-stiffness`);
  const spring =
    millis(style, `${P}progress-duration`) > 0 && dampingRatio > 0 && stiffness > 0
      ? { dampingRatio, stiffness }
      : null;
  return {
    style,
    spring,
    threshold: num(style, `${P}progress-visibility-threshold`) || 0.01,
    increase: tween(style, 'increase'),
    decrease: tween(style, 'decrease'),
    rampMin: num(style, `${P}amplitude-min-progress`),
    rampMax: num(style, `${P}amplitude-max-progress`),
    travelMillis: millis(style, `${P}wave-travel-duration`),
    minTravelMillis: millis(style, `${P}wave-min-travel-duration`) || 0,
    thickness: num(style, '--_m3e-progress-thickness') || 0,
    trackThickness: num(style, '--_m3e-progress-track-thickness') || 0,
    gap: num(style, '--_m3e-progress-gap') || 0,
    wavelength: num(style, '--_m3e-progress-wavelength') || 0,
    stopSize: num(style, '--_m3e-progress-stop-size') || 0,
    width: el.clientWidth,
    height: el.clientHeight,
    linear: linearTiming(style),
    circular: circularTiming(style),
  };
}

const easing = (style: CSSStyleDeclaration, name: string) =>
  parseCubicBezier(style.getPropertyValue(`${P}${name}`)) ?? ((f: number) => f);

/** The indeterminate linear keyframes from the tokens, or null when they are not loaded. */
export function linearTiming(style: CSSStyleDeclaration): LinearIndeterminateTiming | null {
  const line = (name: string): [number, number] => [
    millis(style, `${P}linear-${name}-delay`),
    millis(style, `${P}linear-${name}-duration`),
  ];
  const durationMillis = millis(style, `${P}linear-indeterminate-duration`);
  return durationMillis > 0
    ? {
        durationMillis,
        firstHead: line('first-head'),
        firstTail: line('first-tail'),
        secondHead: line('second-head'),
        secondTail: line('second-tail'),
        easing: easing(style, 'linear-indeterminate-easing'),
      }
    : null;
}

/** The indeterminate circular keyframes from the tokens, or null when they are not loaded. */
export function circularTiming(style: CSSStyleDeclaration): CircularIndeterminateTiming | null {
  const durationMillis = millis(style, `${P}circular-indeterminate-duration`);
  return durationMillis > 0
    ? {
        durationMillis,
        rotation: num(style, `${P}circular-rotation`),
        additionalRotation: num(style, `${P}circular-additional-rotation`),
        additionalDelayMillis: millis(style, `${P}circular-additional-rotation-delay`),
        additionalDurationMillis: millis(style, `${P}circular-additional-rotation-duration`),
        minProgress: num(style, `${P}circular-min-progress`),
        maxProgress: num(style, `${P}circular-max-progress`),
        easing: easing(style, 'circular-progress-easing'),
      }
    : null;
}

/** The wave offset tween (a linear 0 → 1, restarting), which can pause and change speed. */
export class OffsetClock {
  #base = 0;
  #start = 0;
  #travel = Number.POSITIVE_INFINITY;
  #started = false;
  running = false;
  /** When the indicator attached (ms): Compose starts the offset tween there, not at a draw. */
  origin = 0;

  value(now: number): number {
    return this.running
      ? waveOffset(now - this.#start + this.#base * this.#travel, this.#travel)
      : this.#base;
  }

  /** Runs with `travel` ms per offset unit from the current offset (Compose restarts from it). */
  run(now: number, travel: number): void {
    if (this.running && travel === this.#travel) return;
    this.#base = Number.isFinite(travel) ? this.value(now) : 0;
    this.#start = this.#started ? now : Math.min(now, this.origin || now);
    this.#started = true;
    this.#travel = travel;
    this.running = Number.isFinite(travel);
  }

  stop(now: number): void {
    this.#base = this.value(now);
    this.running = false;
  }
}

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION).matches;

/**
 * Animates a rendered `.m3e-linear-progress` / `.m3e-circular-progress` (COMPONENT_SPEC §8), shared
 * by the elements and m3e-react so both layers write the same DOM: the determinate value runs on
 * `ProgressIndicatorDefaults.ProgressAnimationSpec` (the spring every Compose sample uses; an
 * interrupted change keeps its velocity) into `--m3e-comp-progress-indicator-value`, which m3e-css
 * draws flat indicators from; wavy ones are drawn into their SVG every frame by the subclass.
 * The root gets [data-driven] (m3e-css then leaves the value to it).
 */
export abstract class ProgressIndicatorDriver {
  protected readonly root: HTMLElement;
  protected options: ProgressIndicatorOptions = { value: null, shape: 'flat' };
  protected tokens: ProgressTokens | null = null;
  protected value: SpringAnimatable | null = null;
  protected amplitude: AmplitudeAnimation | null = null;
  protected offset = new OffsetClock();
  /** When the indeterminate timeline started (ms). */
  protected startedAt = 0;
  #frame = 0;
  #observer: ResizeObserver | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
    root.toggleAttribute('data-driven', true);
    if (typeof ResizeObserver === 'function') {
      this.#observer = new ResizeObserver(() => {
        if (this.tokens) {
          this.tokens.width = root.clientWidth;
          this.tokens.height = root.clientHeight;
        }
        this.#schedule();
      });
      this.#observer.observe(root);
    }
  }

  /** Applies new options (and re-reads the tokens); call after rendering the contract. */
  update(options: ProgressIndicatorOptions): void {
    const now = performance.now();
    const previous = this.options;
    this.options = options;
    this.tokens = readTokens(this.root);
    this.root.toggleAttribute('data-driven', true);
    if ((previous.value === null) !== (options.value === null) || this.startedAt === 0)
      this.startedAt = now;
    this.offset.origin ||= now;
    const value = options.value;
    if (value === null) {
      this.value = null;
      this.root.style.removeProperty('--m3e-comp-progress-indicator-value');
    } else {
      const target = Math.min(Math.max(Number.isNaN(value) ? 0 : value, 0), 1);
      if (this.value === null) this.value = new SpringAnimatable(target, this.tokens.threshold);
      else if (target !== this.value.target) this.value.animateTo(target, this.tokens.spring, now);
    }
    if (options.shape === 'flat') this.amplitude = null;
    // Write the value now, so a flat indicator never paints a frame without it.
    this.progressAt(now);
    this.#schedule();
  }

  /** Stops animating (the element disconnected or the React component unmounted). */
  disconnect(): void {
    if (this.#frame !== 0) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#observer?.disconnect();
  }

  /** The value to draw: the spring's at `now`, or null when indeterminate. */
  protected progressAt(now: number): number | null {
    const value = this.value;
    if (value === null) return null;
    const v = value.sample(now);
    this.root.style.setProperty(
      '--m3e-comp-progress-indicator-value',
      String(Math.round(v * 1e5) / 1e5),
    );
    return v;
  }

  /** Target amplitude for `progress` (determinate) per the options. */
  protected targetAmplitude(t: ProgressTokens, progress: number | null): number {
    const a = this.options.amplitude;
    const raw =
      typeof a === 'function'
        ? a(progress ?? 0)
        : typeof a === 'number'
          ? a
          : progress === null
            ? 1
            : indicatorAmplitude(progress, t.rampMin, t.rampMax);
    return Math.min(Math.max(Number.isNaN(raw) ? 0 : raw, 0), 1);
  }

  /** Wave speed in px/s (0 holds the wave still: no speed, or reduced motion). */
  protected waveSpeed(t: ProgressTokens, wavelength: number): number {
    if (prefersReducedMotion()) return 0;
    const speed = this.options.waveSpeed;
    if (speed != null) return speed;
    const travel = t.travelMillis;
    return travel > 0 ? (wavelength * 1000) / travel : 0;
  }

  /** Wave offset travel (ms per wavelength × `vertices`). */
  protected travel(t: ProgressTokens, wavelength: number, vertices = 1): number {
    return waveTravelMillis(wavelength, this.waveSpeed(t, wavelength), t.minTravelMillis, vertices);
  }

  /** Draws one frame; returns true while something still moves. */
  protected abstract draw(now: number, tokens: ProgressTokens): boolean;

  #schedule(): void {
    if (this.#frame !== 0 || typeof requestAnimationFrame !== 'function') return;
    this.#frame = requestAnimationFrame(this.#step);
  }

  #step = (now: number): void => {
    this.#frame = 0;
    const tokens = this.tokens;
    if (!this.root.isConnected || tokens === null) return;
    if (this.draw(now, tokens)) this.#frame = requestAnimationFrame(this.#step);
  };
}

/** `aria-valuenow` (0–100) for a progress coerced into 0–1, or null when indeterminate. */
export const progressValue = (value: number | null): string | null =>
  value === null
    ? null
    : String(Math.round(Math.min(Math.max(Number.isNaN(value) ? 0 : value, 0), 1) * 100));

/** Writes the role and value attributes of the progress bar root. */
export function renderProgressRoot(
  root: HTMLElement,
  className: string,
  value: number | null,
  label: string | null | undefined,
): void {
  root.className = className;
  root.setAttribute('role', 'progressbar');
  root.toggleAttribute('data-driven', true);
  if (label) root.setAttribute('aria-label', label);
  else root.removeAttribute('aria-label');
  const now = progressValue(value);
  if (now === null) {
    for (const name of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'])
      root.removeAttribute(name);
    root.style.removeProperty('--m3e-comp-progress-indicator-value');
  } else {
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    root.setAttribute('aria-valuenow', now);
  }
}
