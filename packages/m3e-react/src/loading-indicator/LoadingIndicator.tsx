import {
  type LoadingIndicatorTiming,
  indeterminateFrame,
  initialIndeterminateFrame,
} from '@kyralabs/m3e-motion';
import {
  type LoadingIndicatorShapes,
  type RoundedPolygon,
  determinateFrame,
  loadingIndicatorShapes,
} from '@kyralabs/m3e-shapes';
import {
  type ForwardedRef,
  type HTMLAttributes,
  forwardRef,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';

/** Square viewBox side, as in `<m3e-loading-indicator>` (any unit size works). */
const VIEWBOX = 100;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export interface LoadingIndicatorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Draws the container (Compose `ContainedLoadingIndicator`). */
  contained?: boolean;
  /** 0–1 makes it determinate (morphs by progress); omit for indeterminate. */
  progress?: number;
  /**
   * Shapes to morph between (at least two), e.g. `materialShape('Heart')` from
   * `@kyralabs/m3e-shapes`. Defaults to Compose's lists. Keep the array stable across renders.
   */
  polygons?: readonly RoundedPolygon[];
  /** Accessible name of the progress bar. */
  'aria-label'?: string;
}

/**
 * Loading indicator (COMPONENT_SPEC §7): the m3e-css `.m3e-loading-indicator` contract, the same
 * DOM as `<m3e-loading-indicator>`. Indeterminate: morphs through Compose's seven shapes on its
 * spring and rotates, timed by the `--m3e-comp-loading-indicator-*` tokens; holds its first frame
 * under `prefers-reduced-motion: reduce`. Determinate: morphs between its shapes by `progress`.
 */
export const LoadingIndicator = /* @__PURE__ */ forwardRef(function LoadingIndicator(
  { contained = false, progress, polygons, className, ...rest }: LoadingIndicatorProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const root = useObjectRef(forwardedRef);
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const determinate = progress !== undefined;
  const value = progressValue(progress);

  useLayoutEffect(() => {
    const el = root.current;
    const svgEl = svg.current;
    const pathEl = path.current;
    if (!el || !svgEl || !pathEl) return;
    const shapes = loadingIndicatorShapes(polygons ?? null, !determinate, activeIndicatorScale(el));
    const draw = (frame: { morphIndex: number; morphProgress: number; rotation: number }) => {
      drawFrame(svgEl, pathEl, shapes, frame);
    };
    if (progress !== undefined) {
      draw(determinateFrame(progress, shapes.morphs.length));
      return;
    }
    const timing = readLoadingIndicatorTiming(el);
    if (timing === null || reducedMotion) {
      draw(initialIndeterminateFrame);
      return;
    }
    const startedAt = performance.now();
    let handle = 0;
    const step = (now: number) => {
      draw(indeterminateFrame(now - startedAt, shapes.morphs.length, timing));
      handle = requestAnimationFrame(step);
    };
    step(startedAt);
    return () => {
      cancelAnimationFrame(handle);
    };
  }, [root, polygons, determinate, progress, reducedMotion]);

  return (
    <div
      {...rest}
      ref={root}
      className={cx(
        'm3e-loading-indicator',
        contained && 'm3e-loading-indicator--contained',
        className,
      )}
      role="progressbar"
      data-driven=""
      {...(value === null
        ? {}
        : { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Number(value) })}
    >
      <svg
        ref={svg}
        className="m3e-loading-indicator__shape"
        viewBox={`0 0 ${String(VIEWBOX)} ${String(VIEWBOX)}`}
        aria-hidden="true"
        focusable="false"
      >
        <path ref={path} />
      </svg>
    </div>
  );
});

/** `aria-valuenow` (0–100) for a progress coerced into 0–1; null when indeterminate. */
const progressValue = (progress: number | undefined): string | null =>
  progress === undefined
    ? null
    : String(Math.round(Math.min(Math.max(Number.isNaN(progress) ? 0 : progress, 0), 1) * 100));

// Mirrors <m3e-loading-indicator> (m3e-elements loading-indicator.ts); the DOM parity test keeps
// the two identical.
function drawFrame(
  svg: SVGSVGElement,
  path: SVGPathElement,
  shapes: LoadingIndicatorShapes,
  frame: { morphIndex: number; morphProgress: number; rotation: number },
): void {
  path.setAttribute('d', shapes.pathData(frame.morphIndex, frame.morphProgress, VIEWBOX));
  svg.style.setProperty('rotate', `${String(Math.round(frame.rotation * 1000) / 1000)}deg`);
}

const px = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name));

/** A CSS <time> token in ms: the CSS build may minify `650ms` to `.65s`. */
const millis = (style: CSSStyleDeclaration, name: string) => {
  const value = style.getPropertyValue(name).trim();
  const number = Number.parseFloat(value);
  return value.endsWith('ms') ? number : value.endsWith('s') ? number * 1000 : number;
};

/** `ActiveSize / min(ContainerWidth, ContainerHeight)` from the resolved tokens (1 if missing). */
function activeIndicatorScale(el: Element): number {
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
function readLoadingIndicatorTiming(el: Element): LoadingIndicatorTiming | null {
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

const subscribeReducedMotion = (onChange: () => void) => {
  if (typeof matchMedia !== 'function') return () => undefined;
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
};

const usePrefersReducedMotion = (): boolean =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () => typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION).matches,
  );
