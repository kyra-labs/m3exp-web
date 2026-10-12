import {
  type LoadingIndicatorTiming,
  indeterminateFrame,
  initialIndeterminateFrame,
} from '@kyralabs/m3e-motion';
import {
  type LoadingIndicatorShapes,
  determinateFrame,
  loadingIndicatorShapes,
} from '@kyralabs/m3e-shapes';
import { M3eElement } from '../base/M3eElement.js';

const SVG = 'http://www.w3.org/2000/svg';
/** The shape is drawn in a square viewBox of this many units (any unit size works). */
export const LOADING_INDICATOR_VIEWBOX = 100;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * `<m3e-loading-indicator contained progress="0.4" aria-label="Loading">` (COMPONENT_SPEC §7).
 * Renders the m3e-css contract inside itself (the host is `display: contents`):
 *
 * ```html
 * <div class="m3e-loading-indicator" role="progressbar" aria-label="Loading" data-driven>
 *   <svg class="m3e-loading-indicator__shape" viewBox="0 0 100 100" aria-hidden="true"
 *        focusable="false" style="rotate: 90deg"><path d="…"></path></svg>
 * </div>
 * ```
 *
 * Without `progress` it is indeterminate: it morphs through
 * `LoadingIndicatorDefaults.IndeterminateIndicatorPolygons` on Compose's spring and rotates,
 * timed by the `--m3e-comp-loading-indicator-*` choreography tokens. With `progress` (0–1) it
 * morphs between the determinate polygons by that value. With `prefers-reduced-motion: reduce`
 * the indeterminate indicator holds its first frame. Custom shapes are React-only (`polygons`):
 * this element bundles its own m3e-shapes (D7), and graphics-shapes matches corners with
 * `instanceof`, so polygons built by another copy would not morph. The host's `aria-label` (or
 * `label`) names the progress bar and moves onto it.
 */
export class M3eLoadingIndicator extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    contained: { type: Boolean },
    progress: { type: Number },
    label: {},
    hostLabel: { attribute: 'aria-label' },
  };

  declare contained: boolean | undefined;
  declare progress: number | null | undefined;
  declare label: string | null | undefined;
  declare hostLabel: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #svg: SVGSVGElement | undefined;
  #path: SVGPathElement | undefined;
  #frame = 0;
  #startedAt = 0;
  #shapes: LoadingIndicatorShapes | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof matchMedia === 'function') {
      this.listen(matchMedia(REDUCED_MOTION), 'change', () => {
        this.requestUpdate();
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stop();
  }

  protected override update(): void {
    // The host's aria-label names the progress bar instead (a generic host cannot carry it).
    if (this.hostLabel != null) {
      this.label = this.hostLabel;
      this.removeAttribute('aria-label');
      return;
    }
    const doc = this.ownerDocument;
    const root = (this.#root ??= doc.createElement('div'));
    const svg = (this.#svg ??= doc.createElementNS(SVG, 'svg'));
    const path = (this.#path ??= doc.createElementNS(SVG, 'path'));
    if (svg.firstChild !== path) svg.replaceChildren(path);
    if (root.firstChild !== svg) root.replaceChildren(svg);
    if (root.parentNode !== this || this.childNodes.length !== 1) this.replaceChildren(root);

    const progress = this.progress ?? null;
    renderLoadingIndicator(root, svg, {
      contained: this.contained ?? false,
      progress,
      label: this.label,
    });
    const shapes = loadingIndicatorShapes(null, progress === null, activeIndicatorScale(this));
    if (progress !== null) {
      this.#stop();
      drawFrame(svg, path, shapes, determinateFrame(progress, shapes.morphs.length));
      return;
    }
    const timing = readLoadingIndicatorTiming(this);
    if (timing === null || prefersReducedMotion()) {
      this.#stop();
      drawFrame(svg, path, shapes, initialIndeterminateFrame);
      return;
    }
    // Keep a running animation across unrelated changes (label, contained).
    if (this.#frame !== 0 && this.#shapes === shapes) return;
    this.#stop();
    this.#shapes = shapes;
    this.#startedAt = performance.now();
    const step = (now: number) => {
      const elapsed = now - this.#startedAt;
      drawFrame(svg, path, shapes, indeterminateFrame(elapsed, shapes.morphs.length, timing));
      this.#frame = requestAnimationFrame(step);
    };
    step(this.#startedAt);
  }

  #stop(): void {
    if (this.#frame !== 0) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#shapes = undefined;
  }
}

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION).matches;

export interface LoadingIndicatorContract {
  contained: boolean;
  /** 0–1 for a determinate indicator; null for indeterminate. */
  progress: number | null;
  label?: string | null | undefined;
}

/** Writes the `.m3e-loading-indicator` contract (the same DOM m3e-react renders). */
export function renderLoadingIndicator(
  root: HTMLElement,
  svg: SVGSVGElement,
  li: LoadingIndicatorContract,
): void {
  root.className = li.contained
    ? 'm3e-loading-indicator m3e-loading-indicator--contained'
    : 'm3e-loading-indicator';
  root.setAttribute('role', 'progressbar');
  root.toggleAttribute('data-driven', true);
  if (li.label) root.setAttribute('aria-label', li.label);
  else root.removeAttribute('aria-label');
  const value = progressValue(li.progress);
  if (value === null) {
    for (const name of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'])
      root.removeAttribute(name);
  } else {
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    root.setAttribute('aria-valuenow', value);
  }
  svg.setAttribute('class', 'm3e-loading-indicator__shape');
  svg.setAttribute(
    'viewBox',
    `0 0 ${String(LOADING_INDICATOR_VIEWBOX)} ${String(LOADING_INDICATOR_VIEWBOX)}`,
  );
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
}

/** `aria-valuenow` (0–100) for a progress coerced into 0–1, or null when indeterminate. */
export const progressValue = (progress: number | null): string | null =>
  progress === null
    ? null
    : String(Math.round(Math.min(Math.max(Number.isNaN(progress) ? 0 : progress, 0), 1) * 100));

/** CSS `rotate` value for a frame (rounded to 1/1000°). */
export const rotationStyle = (degrees: number): string =>
  `${String(Math.round(degrees * 1000) / 1000)}deg`;

function drawFrame(
  svg: SVGSVGElement,
  path: SVGPathElement,
  shapes: LoadingIndicatorShapes,
  frame: { morphIndex: number; morphProgress: number; rotation: number },
): void {
  path.setAttribute(
    'd',
    shapes.pathData(frame.morphIndex, frame.morphProgress, LOADING_INDICATOR_VIEWBOX),
  );
  svg.style.setProperty('rotate', rotationStyle(frame.rotation));
}

const px = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name));

/** A CSS <time> token in ms: the CSS build may minify `650ms` to `.65s`. */
const millis = (style: CSSStyleDeclaration, name: string) => {
  const value = style.getPropertyValue(name).trim();
  const number = Number.parseFloat(value);
  return value.endsWith('ms') ? number : value.endsWith('s') ? number * 1000 : number;
};

/**
 * `LoadingIndicatorDefaults.ActiveIndicatorScale` from the resolved tokens:
 * `ActiveSize / min(ContainerWidth, ContainerHeight)`; 1 when the tokens are missing.
 */
export function activeIndicatorScale(el: Element): number {
  const style = getComputedStyle(el);
  const scale =
    px(style, '--m3e-comp-loading-indicator-active-size') /
    Math.min(
      px(style, '--m3e-comp-loading-indicator-container-width'),
      px(style, '--m3e-comp-loading-indicator-container-height'),
    );
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/** The choreography tokens, or null when they are not loaded (the indicator then holds still). */
export function readLoadingIndicatorTiming(el: Element): LoadingIndicatorTiming | null {
  const style = getComputedStyle(el);
  const read = (name: string) => px(style, `--m3e-comp-loading-indicator-${name}`);
  const timing = {
    morphIntervalMillis: millis(style, '--m3e-comp-loading-indicator-morph-interval'),
    rotationDurationMillis: millis(style, '--m3e-comp-loading-indicator-rotation-duration'),
    spring: {
      dampingRatio: read('morph-spring-damping-ratio'),
      stiffness: read('morph-spring-stiffness'),
    },
    visibilityThreshold: read('morph-spring-visibility-threshold'),
  };
  const values = [
    timing.morphIntervalMillis,
    timing.rotationDurationMillis,
    timing.spring.dampingRatio,
    timing.spring.stiffness,
    timing.visibilityThreshold,
  ];
  return values.every((v) => Number.isFinite(v) && v > 0) ? timing : null;
}
