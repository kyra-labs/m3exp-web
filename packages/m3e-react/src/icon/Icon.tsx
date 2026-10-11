import { type CSSProperties, type HTMLAttributes, forwardRef } from 'react';
import { cx } from '../utils/cx.js';

export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Material Symbols ligature, e.g. `home`. */
  name: string;
  /** FILL axis on (the filled style; m3.material.io uses it for selected icons). */
  fill?: boolean;
  /** `wght` axis (100–700). */
  weight?: number;
  /** `GRAD` axis (−50–200). */
  grade?: number;
  /** `opsz` axis (20–48); match it to the rendered size. */
  opticalSize?: number;
  /** Accessible name. Without it the icon is decorative (`aria-hidden`). */
  label?: string;
}

/**
 * Material Symbols icon (D5, COMPONENT_SPEC §39). Renders the m3e-css `.m3e-icon` contract,
 * the same DOM as `<m3e-icon>`.
 */
export const Icon = forwardRef<HTMLSpanElement, IconProps>(function Icon(
  { name, fill = false, weight, grade, opticalSize, label, className, style, ...rest },
  ref,
) {
  const axes: Record<string, string> = {};
  if (weight !== undefined) axes['--m3e-comp-icon-weight'] = String(weight);
  if (grade !== undefined) axes['--m3e-comp-icon-grade'] = String(grade);
  if (opticalSize !== undefined) axes['--m3e-comp-icon-optical-size'] = String(opticalSize);
  const merged: CSSProperties = { ...axes, ...style };
  return (
    <span
      {...rest}
      ref={ref}
      className={cx('m3e-icon', className)}
      data-fill={fill ? '' : undefined}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      style={Object.keys(merged).length > 0 ? merged : undefined}
    >
      {name}
    </span>
  );
});
