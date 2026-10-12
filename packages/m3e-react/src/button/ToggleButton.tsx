import { type ButtonHTMLAttributes, type ForwardedRef, forwardRef } from 'react';
import {
  type PressEvent,
  mergeProps,
  useFocusRing,
  useHover,
  useObjectRef,
  useToggleButton,
} from 'react-aria';
import { useToggleState } from 'react-stately';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { type ButtonStyleProps, buttonClassName } from './Button.js';
import { defined } from '../utils/cx.js';
import { useShapeSpring } from '../motion/useShapeSpring.js';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled' | 'onClick' | 'onChange' | 'type' | 'aria-pressed'
>;

export interface ToggleButtonProps extends Omit<ButtonStyleProps, 'variant'>, NativeButtonProps {
  /** Color configuration. Default `filled`. Toggle buttons have no text variant (Compose). */
  variant?: 'filled' | 'tonal' | 'elevated' | 'outlined';
  /** Controlled selection. */
  isSelected?: boolean;
  /** Uncontrolled initial selection. */
  defaultSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
  isDisabled?: boolean;
  onPress?: (e: PressEvent) => void;
}

/**
 * Toggle button (COMPONENT_SPEC §1, Compose ToggleButton): `aria-pressed`; round buttons turn
 * square when selected and square ones round, on the fast spatial spring.
 */
export const ToggleButton = forwardRef(function ToggleButton(
  props: ToggleButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const {
    variant,
    size,
    shape,
    icon,
    trailingIcon,
    children,
    className,
    isSelected,
    defaultSelected,
    onChange,
    isDisabled = false,
    onPress,
    ...rest
  } = props;
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
  useShapeSpring(
    ref,
    { shapeVar: '--_m3e-button-shape', spring: 'fast-spatial' },
    `${String(isPressed)}|${String(state.isSelected)}|${variant ?? ''}|${size ?? ''}|${shape ?? ''}`,
  );
  return (
    <button
      {...mergeProps(buttonProps, rest, focusProps, hoverProps, stateLayer.stateLayerProps, {
        className: buttonClassName({ variant, size, shape }, className),
        'data-spring': '',
        'data-pressed': isPressed ? '' : undefined,
      })}
      ref={ref}
    >
      {icon}
      {children}
      {trailingIcon}
    </button>
  );
});
