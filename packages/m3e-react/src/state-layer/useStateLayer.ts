import { type CSSProperties, useCallback, useState } from 'react';
import type { PressEvent } from 'react-aria';

/**
 * Ripple geometry for a press at (`x`, `y`) inside a `width` × `height` box (null: keyboard or
 * virtual press, from the center). Mirrors `rippleStyle` in m3e-elements (base/ripple.ts); the
 * parity test holds them equal.
 */
export function rippleStyle(
  width: number,
  height: number,
  point: { x: number; y: number } | null,
): Record<'--_m3e-ripple-x' | '--_m3e-ripple-y' | '--_m3e-ripple-radius', string> {
  const x = point ? point.x : width / 2;
  const y = point ? point.y : height / 2;
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
  return { '--_m3e-ripple-x': px(x), '--_m3e-ripple-y': px(y), '--_m3e-ripple-radius': px(radius) };
}

export interface StateLayerProps {
  'data-ripple': '';
  'data-pressed'?: '';
  style?: CSSProperties;
}

export interface StateLayer {
  /** Spread onto the host (merge `style` with your own). */
  stateLayerProps: StateLayerProps;
  /** Pass to `usePress` / `useButton` (React Aria) so presses drive the ripple. */
  onPressStart: (e: PressEvent) => void;
  onPressEnd: (e: PressEvent) => void;
}

/**
 * Drives the m3e-css state-layer ripple (`data-ripple`, `data-pressed`, `--_m3e-ripple-*`), the
 * same attributes m3e-elements' `attachRipple` writes. Hover and focus overlays need no JS.
 */
export function useStateLayer(): StateLayer {
  const [pressed, setPressed] = useState(false);
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);
  const onPressStart = useCallback((e: PressEvent) => {
    const box = e.target.getBoundingClientRect();
    const point =
      e.pointerType === 'keyboard' || e.pointerType === 'virtual' ? null : { x: e.x, y: e.y };
    setStyle(rippleStyle(box.width, box.height, point) as CSSProperties);
    setPressed(true);
  }, []);
  const onPressEnd = useCallback(() => {
    setPressed(false);
  }, []);
  const stateLayerProps: StateLayerProps = { 'data-ripple': '' };
  if (pressed) stateLayerProps['data-pressed'] = '';
  if (style) stateLayerProps.style = style;
  return { stateLayerProps, onPressStart, onPressEnd };
}
