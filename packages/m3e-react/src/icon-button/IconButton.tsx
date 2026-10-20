import { type ButtonHTMLAttributes, type ForwardedRef, type ReactNode, forwardRef } from 'react';
import {
  type PressEvent,
  mergeProps,
  useButton,
  useFocusRing,
  useHover,
  useObjectRef,
  useToggleButton,
} from 'react-aria';
import { useToggleState } from 'react-stately';
import { useShapeSpring } from '../motion/useShapeSpring.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';
import { isDev } from '../utils/dev.js';

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined';
export type IconButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type IconButtonWidth = 'narrow' | 'default' | 'wide';
export type IconButtonShape = 'round' | 'square';

/** The style options of an icon button (`iconButtonClassName`, and the IconButton props). */
export interface IconButtonStyle {
  /** Color configuration. Default `standard` (inherits the surrounding content color). */
  variant?: IconButtonVariant | undefined;
  /** Token colors for standard/outlined instead of the inherited color (Compose "vibrant"). */
  vibrant?: boolean | undefined;
  /** Default `s` (40dp). */
  size?: IconButtonSize | undefined;
  /** Default `default` (uniform). */
  width?: IconButtonWidth | undefined;
  /** Default `round`. */
  shape?: IconButtonShape | undefined;
}

/** Classes for an icon button (the m3e-css contract). */
export const iconButtonClassName = (
  {
    variant = 'standard',
    vibrant = false,
    size = 's',
    width = 'default',
    shape = 'round',
  }: IconButtonStyle,
  className?: string,
): string =>
  cx(
    'm3e-icon-button',
    `m3e-icon-button--${variant}`,
    vibrant && 'm3e-icon-button--vibrant',
    `m3e-icon-button--size-${size}`,
    `m3e-icon-button--width-${width}`,
    `m3e-icon-button--${shape}`,
    className,
  );

type NativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled' | 'onClick' | 'onChange' | 'type' | 'aria-pressed'
>;

interface IconButtonBaseProps extends IconButtonStyle, NativeProps {
  /** The icon, e.g. `<Icon name="favorite" />`. */
  children: ReactNode;
  /** Required unless `aria-labelledby` names the button (icon-only control). */
  'aria-label'?: string;
  className?: string;
  isDisabled?: boolean;
  onPress?: (e: PressEvent) => void;
}

export interface IconToggleButtonProps extends IconButtonBaseProps {
  isSelected?: boolean;
  defaultSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
}

export interface IconButtonProps extends IconToggleButtonProps {
  type?: 'button' | 'submit' | 'reset';
}

const warned = new Set<string>();

/** COMPONENT_SPEC §2: an icon-only button without an accessible name warns once (dev only). */
function useLabelWarning(props: NativeProps & { 'aria-label'?: string }, component: string) {
  if (!props['aria-label'] && !props['aria-labelledby'] && isDev() && !warned.has(component)) {
    warned.add(component);
    console.warn(
      `[m3exp-web] <${component}> needs an aria-label (or aria-labelledby): it shows only an icon.`,
    );
  }
}

const shapeKey = (s: IconButtonStyle, ...state: boolean[]) =>
  [...state.map(String), s.variant, s.size, s.width, s.shape].join('|');

/**
 * Icon toggle button (COMPONENT_SPEC §2): `aria-pressed`; the selected icon is filled (FILL 1).
 * Press and selection morph on the default effects spring (IconButton.kt).
 */
export const IconToggleButton = /* @__PURE__ */ forwardRef(function IconToggleButton(
  props: IconToggleButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const {
    variant,
    vibrant,
    size,
    width,
    shape,
    children,
    className,
    isSelected,
    defaultSelected,
    onChange,
    isDisabled = false,
    onPress,
    ...rest
  } = props;
  useLabelWarning(rest, 'IconToggleButton');
  const ref = useObjectRef(forwardedRef);
  const state = useToggleState(defined({ isSelected, defaultSelected, onChange }));
  const stateLayer = useStateLayer();
  const { buttonProps, isPressed } = useToggleButton(
    {
      isDisabled,
      ...defined({ onPress }),
      onPressStart: stateLayer.onPressStart,
      onPressEnd: stateLayer.onPressEnd,
    },
    state,
    ref,
  );
  const { focusProps } = useFocusRing();
  const { hoverProps } = useHover({ isDisabled });
  const style = { variant, size, width, shape };
  useShapeSpring(
    ref,
    { shapeVar: '--_m3e-icon-button-shape', spring: 'default-effects' },
    shapeKey(style, isPressed, state.isSelected),
  );
  return (
    <button
      {...mergeProps(buttonProps, rest, focusProps, hoverProps, stateLayer.stateLayerProps, {
        className: iconButtonClassName({ ...style, vibrant }, className),
        'data-spring': '',
        'data-pressed': isPressed ? '' : undefined,
      })}
      ref={ref}
    >
      {children}
    </button>
  );
});

/**
 * Icon button (COMPONENT_SPEC §2). With `isSelected` or `defaultSelected` it is an
 * {@link IconToggleButton}.
 */
export const IconButton = /* @__PURE__ */ forwardRef(function IconButton(
  props: IconButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const { isSelected, defaultSelected, onChange, type, ...common } = props;
  if (isSelected !== undefined || defaultSelected !== undefined) {
    return (
      <IconToggleButton
        {...common}
        {...defined({ isSelected, defaultSelected, onChange })}
        ref={forwardedRef}
      />
    );
  }
  return <PlainIconButton {...common} {...defined({ type })} ref={forwardedRef} />;
});

const PlainIconButton = /* @__PURE__ */ forwardRef(function PlainIconButton(
  props: IconButtonBaseProps & { type?: 'button' | 'submit' | 'reset' },
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const {
    variant,
    vibrant,
    size,
    width,
    shape,
    children,
    className,
    type = 'button',
    isDisabled = false,
    onPress,
    ...rest
  } = props;
  useLabelWarning(rest, 'IconButton');
  const ref = useObjectRef(forwardedRef);
  const stateLayer = useStateLayer();
  const { buttonProps, isPressed } = useButton(
    {
      type,
      isDisabled,
      ...defined({ onPress }),
      onPressStart: stateLayer.onPressStart,
      onPressEnd: stateLayer.onPressEnd,
    },
    ref,
  );
  const { focusProps } = useFocusRing();
  const { hoverProps } = useHover({ isDisabled });
  const style = { variant, size, width, shape };
  useShapeSpring(
    ref,
    { shapeVar: '--_m3e-icon-button-shape', spring: 'default-effects' },
    shapeKey(style, isPressed),
  );
  return (
    <button
      {...mergeProps(buttonProps, rest, focusProps, hoverProps, stateLayer.stateLayerProps, {
        className: iconButtonClassName({ ...style, vibrant }, className),
        'data-spring': '',
        'data-pressed': isPressed ? '' : undefined,
      })}
      ref={ref}
    >
      {children}
    </button>
  );
});
