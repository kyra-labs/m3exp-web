import { type RefObject, useLayoutEffect, useRef } from 'react';
import { LengthSpring, type RadiusProperty, readSpring } from './shape-spring.js';

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Registered length properties m3e-css resolves to the current top and bottom corner radii. */
export interface ShapeSpringEdges {
  /** The start-start and start-end corners. */
  top: string;
  /** The end-start and end-end corners. */
  bottom: string;
}

export interface ShapeSpringOptions {
  /**
   * Registered length custom property m3e-css resolves to the current shape, or one per edge
   * when the top and bottom corners differ (a segmented list item's outer corners).
   */
  shapeVar: string | ShapeSpringEdges;
  /**
   * Motion-scheme spring: `default-effects` (no bounce; Button.kt and IconButton.kt press and
   * select morphs) or `fast-spatial` (ToggleButton.kt, ListItem.kt). Reduced motion: effects fall
   * back to the fast effects spring, spatial springs jump.
   */
  spring: 'default-effects' | 'fast-spatial';
  /**
   * False leaves the corners to m3e-css (a chip without the expressive morph): no inline radius
   * is written, and one written earlier is removed. Default true.
   */
  enabled?: boolean;
}

const TOP: readonly RadiusProperty[] = ['borderStartStartRadius', 'borderStartEndRadius'];
const BOTTOM: readonly RadiusProperty[] = ['borderEndStartRadius', 'borderEndEndRadius'];

/** [custom property, radius properties it drives] for each spring. */
const targets = (shapeVar: string | ShapeSpringEdges) =>
  typeof shapeVar === 'string'
    ? ([[shapeVar, ['borderRadius']]] as const)
    : ([
        [shapeVar.top, TOP],
        [shapeVar.bottom, BOTTOM],
      ] as const);

/**
 * Springs the element's corner radius to whatever m3e-css resolves for its current state
 * (resting, pressed or selected), capped at half the smaller side (CircleShape).
 * `stateKey` changes whenever anything that can change the shape changes.
 */
export function useShapeSpring(
  ref: RefObject<HTMLElement | null>,
  { shapeVar, spring, enabled = true }: ShapeSpringOptions,
  stateKey: string,
): void {
  const springsRef = useRef<LengthSpring[] | null>(null);
  const top = typeof shapeVar === 'string' ? shapeVar : shapeVar.top;
  const bottom = typeof shapeVar === 'string' ? '' : shapeVar.bottom;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const edges = targets(bottom === '' ? top : { top, bottom });
    if (!enabled) {
      if (springsRef.current) {
        for (const s of springsRef.current) s.stop();
        springsRef.current = null;
        for (const [, properties] of edges) for (const p of properties) el.style[p] = '';
      }
      return;
    }
    const springs = (springsRef.current ??= edges.map(([, p]) => new LengthSpring(el, p)));
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const half = Math.min(box.width, box.height) / 2;
    const token =
      spring === 'fast-spatial' ? spring : reducedMotion() ? 'fast-effects' : 'default-effects';
    edges.forEach(([name], i) => {
      const radius = springs[i];
      const resolved = Number.parseFloat(style.getPropertyValue(name));
      if (!radius || !Number.isFinite(resolved)) return;
      const target = half > 0 ? Math.min(resolved, half) : resolved;
      radius.to(target, radius.value === null ? null : readSpring(el, token));
    });
  }, [ref, top, bottom, spring, enabled, stateKey]);

  useLayoutEffect(
    () => () => {
      for (const s of springsRef.current ?? []) s.stop();
    },
    [],
  );
}
