import {
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type ReactNode,
  type RefObject,
  forwardRef,
} from 'react';
import {
  type PressEvent,
  mergeProps,
  useButton,
  useFocusRing,
  useHover,
  useObjectRef,
} from 'react-aria';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';
import { warnDeprecated } from '../utils/deprecated.js';
import { isDev } from '../utils/dev.js';

/**
 * The small FAB (40dp, Compose `SmallFloatingActionButton`).
 *
 * @deprecated D4: m3.material.io no longer recommends the small FAB; use `'baseline'` (56dp).
 * Shipped until 2.0; no new features.
 */
export type FabSmallSize = 'small';

/** FAB sizes: baseline 56dp, medium 80dp, large 96dp; `'small'` (40dp) is deprecated (D4). */
// eslint-disable-next-line @typescript-eslint/no-deprecated -- D4: the small FAB ships until 2.0
export type FabSize = 'baseline' | 'medium' | 'large' | FabSmallSize;

/**
 * Container / content color pairs (m3.material.io FAB › Color styles): the container roles and,
 * new in M3 Expressive, the plain roles. Default `primary-container`
 * (FloatingActionButtonDefaults.containerColor).
 */
export type FabColor =
  | 'primary-container'
  | 'secondary-container'
  | 'tertiary-container'
  | 'primary'
  | 'secondary'
  | 'tertiary';

/** Classes for a FAB (the m3e-css contract). */
export const fabClassName = (
  {
    size = 'baseline',
    color = 'primary-container',
  }: { size?: FabSize | undefined; color?: FabColor | undefined },
  className?: string,
): string => cx('m3e-fab', `m3e-fab--size-${size}`, `m3e-fab--${color}`, className);

/** Native button props a FAB passes through (FABs have no disabled state in Compose). */
export type FabNativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'color' | 'disabled' | 'onClick' | 'type'
>;

/** Press handlers shared by both FABs (React Aria `usePress`). */
export interface FabPressProps {
  type?: 'button' | 'submit' | 'reset';
  onPress?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
}

export interface FabProps extends FabNativeProps, FabPressProps {
  /** The icon, e.g. `<Icon name="add" />`. */
  icon: ReactNode;
  /** Default `baseline` (56dp). `'small'` is deprecated (D4) and warns once in development. */
  size?: FabSize;
  color?: FabColor;
  /** Required unless `aria-labelledby` names the button: a FAB shows only an icon. */
  'aria-label'?: string;
  className?: string;
}

const warned = new Set<string>();

/** COMPONENT_SPEC §5: an icon-only FAB needs an accessible name (dev warning, once). */
export function useFabLabelWarning(props: FabNativeProps, component: string): void {
  if (!props['aria-label'] && !props['aria-labelledby'] && isDev() && !warned.has(component)) {
    warned.add(component);
    console.warn(
      `[m3exp-web] <${component}> needs an aria-label (or aria-labelledby): it shows only an icon.`,
    );
  }
}

/**
 * React Aria button wiring shared by `<Fab>` and `<ExtendedFab>`: press, hover, focus and the
 * state-layer ripple. Elevation and the state layer are pure m3e-css.
 */
export function useFabButton(
  { type = 'button', onPress, onPressStart, onPressEnd }: FabPressProps,
  ref: RefObject<HTMLButtonElement | null>,
) {
  const stateLayer = useStateLayer();
  const { buttonProps, isPressed } = useButton(
    {
      type,
      ...defined({ onPress }),
      onPressStart: (e: PressEvent) => {
        stateLayer.onPressStart(e);
        onPressStart?.(e);
      },
      onPressEnd: (e: PressEvent) => {
        stateLayer.onPressEnd(e);
        onPressEnd?.(e);
      },
    },
    ref,
  );
  const { focusProps } = useFocusRing();
  const { hoverProps } = useHover({});
  return mergeProps(buttonProps, focusProps, hoverProps, stateLayer.stateLayerProps, {
    'data-pressed': isPressed ? '' : undefined,
  }) as ButtonHTMLAttributes<HTMLButtonElement>;
}

/**
 * Floating action button (COMPONENT_SPEC §5; Compose `FloatingActionButton`,
 * `MediumFloatingActionButton`, `LargeFloatingActionButton`): React Aria behavior on the m3e-css
 * `.m3e-fab` classes. Elevation follows the ElevationDefaults tweens in CSS.
 */
export const Fab = /* @__PURE__ */ forwardRef(function Fab(
  props: FabProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const { icon, size, color, className, type, onPress, onPressStart, onPressEnd, ...rest } = props;
  if (size === 'small') warnDeprecated('Fab size="small"', 'Fab size="baseline"');
  useFabLabelWarning(rest, 'Fab');
  const ref = useObjectRef(forwardedRef);
  const buttonProps = useFabButton(defined({ type, onPress, onPressStart, onPressEnd }), ref);
  return (
    <button
      {...mergeProps(rest, buttonProps, { className: fabClassName({ size, color }, className) })}
      ref={ref}
    >
      {icon}
    </button>
  );
});
