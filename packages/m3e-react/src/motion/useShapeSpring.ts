import { type RefObject, useLayoutEffect, useRef } from 'react';
import { LengthSpring, readSpring } from './shape-spring.js';

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface ShapeSpringOptions {
  /** Registered length custom property m3e-css resolves to the current shape. */
  shapeVar: string;
  /**
   * Motion-scheme spring: `default-effects` (no bounce; Button.kt and IconButton.kt press and
   * select morphs) or `fast-spatial` (ToggleButton.kt). Reduced motion: effects fall back to the
   * fast effects spring, spatial springs jump.
   */
  spring: 'default-effects' | 'fast-spatial';
}

/**
 * Springs the element's corner radius to whatever m3e-css resolves for its current state
 * (resting, pressed or selected), capped at half the smaller side (CircleShape).
 * `stateKey` changes whenever anything that can change the shape changes.
 */
export function useShapeSpring(
  ref: RefObject<HTMLElement | null>,
  { shapeVar, spring }: ShapeSpringOptions,
  stateKey: string,
): void {
  const springRef = useRef<LengthSpring | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const radius = (springRef.current ??= new LengthSpring(el, 'borderRadius'));
    const resolved = Number.parseFloat(getComputedStyle(el).getPropertyValue(shapeVar));
    if (!Number.isFinite(resolved)) return;
    const box = el.getBoundingClientRect();
    const half = Math.min(box.width, box.height) / 2;
    const target = half > 0 ? Math.min(resolved, half) : resolved;
    const token =
      spring === 'fast-spatial' ? spring : reducedMotion() ? 'fast-effects' : 'default-effects';
    radius.to(target, radius.value === null ? null : readSpring(el, token));
  }, [ref, shapeVar, spring, stateKey]);

  useLayoutEffect(
    () => () => {
      springRef.current?.stop();
    },
    [],
  );
}
