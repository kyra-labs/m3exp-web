import { type RefObject, useLayoutEffect, useRef } from 'react';
import { LengthSpring, readSpring } from '../motion/shape-spring.js';

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Springs the button's corner radius to whatever m3e-css resolves for its current state
 * (`--_m3e-button-shape`, a registered length: resting, pressed or selected). The radius is
 * capped at half the height (CircleShape). Buttons use the default effects spring (Button.kt:
 * no bounce), toggle buttons the fast spatial spring (ToggleButton.kt). Reduced motion: effects
 * fall back to the fast effects spring, spatial springs jump.
 *
 * `stateKey` changes whenever anything that can change the shape changes.
 */
export function useShapeSpring(
  ref: RefObject<HTMLElement | null>,
  isToggle: boolean,
  stateKey: string,
): void {
  const springRef = useRef<LengthSpring | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const radius = (springRef.current ??= new LengthSpring(el, 'borderRadius'));
    const style = getComputedStyle(el);
    const resolved = Number.parseFloat(style.getPropertyValue('--_m3e-button-shape'));
    if (!Number.isFinite(resolved)) return;
    const target = Math.min(resolved, el.getBoundingClientRect().height / 2 || resolved);
    const token = isToggle ? 'fast-spatial' : reducedMotion() ? 'fast-effects' : 'default-effects';
    radius.to(target, radius.value === null ? null : readSpring(el, token));
  }, [ref, isToggle, stateKey]);

  useLayoutEffect(
    () => () => {
      springRef.current?.stop();
    },
    [],
  );
}
