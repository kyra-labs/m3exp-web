import { type HTMLAttributes, forwardRef } from 'react';
import { cx } from '../utils/cx.js';

export type SurfaceContainer = 'lowest' | 'low' | 'default' | 'high' | 'highest';
export type SurfaceShape =
  'none' | 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large' | 'full';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Tonal surface container (`surface-container-*` roles). Omit for `surface`. */
  container?: SurfaceContainer;
  /** `surface-variant` / `on-surface-variant` instead of `surface` / `on-surface`. */
  variant?: boolean;
  /** Elevation level 0–5 (two-layer shadow tokens). */
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  /** Corner shape token. */
  shape?: SurfaceShape;
}

/** Surface primitive (COMPONENT_SPEC §39): the `.m3e-surface` classes as a `<div>`. */
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { container, variant = false, elevation, shape, className, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'm3e-surface',
        container &&
          (container === 'default'
            ? 'm3e-surface--container'
            : `m3e-surface--container-${container}`),
        variant && 'm3e-surface--variant',
        elevation !== undefined && `m3e-surface--elevation-${String(elevation)}`,
        shape && `m3e-surface--shape-${shape}`,
        className,
      )}
    />
  );
});
