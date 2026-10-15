import {
  type ForwardedRef,
  type ReactNode,
  type RefObject,
  forwardRef,
  useLayoutEffect,
  useRef,
} from 'react';
import { mergeProps, useObjectRef } from 'react-aria';
import { ValueSpring, readSpring } from '../motion/shape-spring.js';
import { cx, defined } from '../utils/cx.js';
import { type FabColor, type FabNativeProps, type FabPressProps, useFabButton } from './Fab.js';

/** Extended FAB sizes (Compose Small/Medium/LargeExtendedFloatingActionButton): 56, 80, 96dp. */
export type ExtendedFabSize = 'small' | 'medium' | 'large';

/** Classes for an extended FAB (the m3e-css contract). */
export const extendedFabClassName = (
  {
    size = 'small',
    color = 'primary-container',
    collapsed = false,
  }: {
    size?: ExtendedFabSize | undefined;
    color?: FabColor | undefined;
    collapsed?: boolean | undefined;
  },
  className?: string,
): string =>
  cx(
    'm3e-extended-fab',
    `m3e-extended-fab--size-${size}`,
    `m3e-extended-fab--${color}`,
    collapsed && 'm3e-extended-fab--collapsed',
    className,
  );

export interface ExtendedFabProps extends FabNativeProps, FabPressProps {
  /** Visible label; it is also the button's accessible name, collapsed or not. */
  label: ReactNode;
  /** Leading icon, e.g. `<Icon name="add" />`. Optional; collapsing needs one. */
  icon?: ReactNode;
  /** Default `small` (56dp). */
  size?: ExtendedFabSize;
  color?: FabColor;
  /**
   * Default true. `false` collapses to the icon (a FAB-sized square) with an interruptible width
   * spring; ignored without an icon. See {@link useExtendedFabScroll} for scroll-driven collapse.
   */
  expanded?: boolean;
  className?: string;
}

/**
 * Springs the extended FAB between its collapsed and expanded widths as Compose's expressive
 * ExtendedFloatingActionButton does (FloatingActionButton.kt L961-998): width =
 * lerp(container height, full row width, progress) with progress on the fast spatial spring, the
 * label alpha on the fast effects spring, the row kept at full width and clipped. Both springs keep
 * their velocity when `collapsed` flips mid-flight. At rest the inline styles are removed, so
 * m3e-css (`--collapsed`) is the single source of the settled layout.
 */
function useExpandSpring(
  ref: RefObject<HTMLButtonElement | null>,
  labelRef: RefObject<HTMLSpanElement | null>,
  collapsed: boolean,
): void {
  const springs = useRef<{ width: ValueSpring; alpha: ValueSpring } | null>(null);
  const range = useRef({ from: 0, to: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    const label = labelRef.current;
    if (!el || !label) return;
    const target = collapsed ? 0 : 1;
    if (!springs.current) {
      const clear = () => {
        if (springs.current?.width.isAnimating || springs.current?.alpha.isAnimating) return;
        el.style.removeProperty('inline-size');
        el.style.removeProperty('grid-template-columns');
        label.style.removeProperty('opacity');
      };
      const width = new ValueSpring((p) => {
        const { from, to } = range.current;
        el.style.setProperty('grid-template-columns', 'auto max-content');
        el.style.setProperty('inline-size', `${String(from + (to - from) * p)}px`);
      }, clear);
      const alpha = new ValueSpring((a) => {
        label.style.setProperty('opacity', String(a));
      }, clear);
      springs.current = { width, alpha };
      // First render: m3e-css already shows this state.
      width.snap(target);
      alpha.snap(target);
      return;
    }
    const { width, alpha } = springs.current;
    if (width.value === target && !width.isAnimating && !alpha.isAnimating) return;
    // Endpoints: the minimum width (= container height) and the full row's width.
    const style = getComputedStyle(el);
    const inlineSize = el.style.getPropertyValue('inline-size');
    const columns = el.style.getPropertyValue('grid-template-columns');
    el.style.setProperty('grid-template-columns', 'auto max-content');
    el.style.setProperty('inline-size', 'max-content');
    const from = Number.parseFloat(style.getPropertyValue('min-inline-size'));
    const full = Number.parseFloat(style.getPropertyValue('inline-size'));
    el.style.setProperty('inline-size', inlineSize);
    el.style.setProperty('grid-template-columns', columns);
    range.current = { from, to: Math.max(from, full) };
    width.to(target, readSpring(el, 'fast-spatial'));
    alpha.to(target, readSpring(el, 'fast-effects'));
  }, [ref, labelRef, collapsed]);

  useLayoutEffect(
    () => () => {
      springs.current?.width.stop();
      springs.current?.alpha.stop();
    },
    [],
  );
}

/**
 * Extended FAB (COMPONENT_SPEC §5; Compose `Small`/`Medium`/`LargeExtendedFloatingActionButton`):
 * React Aria behavior on the m3e-css `.m3e-extended-fab` classes. `expanded={false}` collapses it
 * to the icon with an interruptible width spring; the label stays the accessible name.
 */
export const ExtendedFab = /* @__PURE__ */ forwardRef(function ExtendedFab(
  props: ExtendedFabProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const {
    label,
    icon,
    size,
    color,
    expanded = true,
    className,
    type,
    onPress,
    onPressStart,
    onPressEnd,
    ...rest
  } = props;
  const ref = useObjectRef(forwardedRef);
  const labelRef = useRef<HTMLSpanElement>(null);
  const collapsed = !expanded && icon != null;
  useExpandSpring(ref, labelRef, collapsed);
  const buttonProps = useFabButton(defined({ type, onPress, onPressStart, onPressEnd }), ref);
  return (
    <button
      {...mergeProps(rest, buttonProps, {
        className: extendedFabClassName({ size, color, collapsed }, className),
        'data-spring': '',
      })}
      ref={ref}
    >
      {icon}
      <span className="m3e-extended-fab__label" ref={labelRef}>
        {label}
      </span>
    </button>
  );
});
