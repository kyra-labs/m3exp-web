import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type ReactNode,
  forwardRef,
} from 'react';
import {
  type PressEvent,
  mergeProps,
  useButton,
  useFocusRing,
  useHover,
  useLink,
  useObjectRef,
} from 'react-aria';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';
import { useShapeSpring } from '../motion/useShapeSpring.js';

export type ButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined' | 'text';
export type ButtonSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type ButtonShape = 'round' | 'square';

export interface ButtonStyleProps {
  /** Color configuration. Default `filled`. */
  variant?: ButtonVariant;
  /** Default `s` (40dp). */
  size?: ButtonSize;
  /** Resting shape. Default `round`. */
  shape?: ButtonShape;
  /** Leading icon, e.g. `<Icon name="add" />`. */
  icon?: ReactNode;
  /** Trailing icon. */
  trailingIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Classes for a button (the m3e-css contract). */
export const buttonClassName = (
  {
    variant = 'filled',
    size = 's',
    shape = 'round',
  }: {
    variant?: ButtonVariant | undefined;
    size?: ButtonSize | undefined;
    shape?: ButtonShape | undefined;
  },
  className?: string,
): string =>
  cx(
    'm3e-button',
    `m3e-button--${variant}`,
    `m3e-button--size-${size}`,
    `m3e-button--${shape}`,
    className,
  );

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled' | 'onClick' | 'type'
>;

export interface ButtonProps extends ButtonStyleProps, NativeButtonProps {
  /** Renders a link (`<a class="m3e-button">`) instead of a `<button>`. */
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  rel?: string;
  type?: 'button' | 'submit' | 'reset';
  isDisabled?: boolean;
  /**
   * Keeps a disabled button in the tab order (`aria-disabled` instead of `disabled`), so it can
   * still show a tooltip or explain why it is unavailable.
   */
  focusableWhenDisabled?: boolean;
  onPress?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
}

/**
 * Material 3 Expressive button (COMPONENT_SPEC §1): React Aria behavior on the m3e-css
 * `.m3e-button` classes, with the press morph as an interruptible spring.
 */
export const Button = forwardRef(function Button(
  props: ButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement | HTMLAnchorElement>,
) {
  const {
    variant,
    size,
    shape,
    icon,
    trailingIcon,
    children,
    className,
    href,
    target,
    rel,
    type = 'button',
    isDisabled = false,
    focusableWhenDisabled = false,
    onPress,
    onPressStart,
    onPressEnd,
    ...rest
  } = props;
  const ref = useObjectRef(forwardedRef);
  const softDisabled = isDisabled && focusableWhenDisabled;
  const stateLayer = useStateLayer();
  const pressOptions = {
    isDisabled: isDisabled && !focusableWhenDisabled,
    ...defined({ onPress: softDisabled ? undefined : onPress }),
    onPressStart: (e: PressEvent) => {
      if (softDisabled) return;
      stateLayer.onPressStart(e);
      onPressStart?.(e);
    },
    onPressEnd: (e: PressEvent) => {
      stateLayer.onPressEnd(e);
      onPressEnd?.(e);
    },
  };
  const link = useLink({ ...pressOptions, ...defined({ href }) }, ref);
  const button = useButton({ ...pressOptions, type }, ref as React.RefObject<HTMLButtonElement>);
  const { focusProps } = useFocusRing();
  const { hoverProps } = useHover({ isDisabled });
  const isLink = href !== undefined;
  const isPressed = (isLink ? link.isPressed : button.isPressed) && !softDisabled;
  useShapeSpring(
    ref,
    { shapeVar: '--_m3e-button-shape', spring: 'default-effects' },
    `${String(isPressed)}|${variant ?? ''}|${size ?? ''}|${shape ?? ''}`,
  );

  const common = mergeProps(rest, focusProps, hoverProps, stateLayer.stateLayerProps, {
    className: buttonClassName({ variant, size, shape }, className),
    'data-spring': '',
    'data-pressed': isPressed ? '' : undefined,
    'aria-disabled': softDisabled ? 'true' : undefined,
  });
  const content = (
    <>
      {icon}
      {children}
      {trailingIcon}
    </>
  );
  if (isLink) {
    return (
      <a
        {...mergeProps(link.linkProps, common)}
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={isDisabled ? undefined : href}
        target={target}
        rel={rel}
      >
        {content}
      </a>
    );
  }
  return (
    <button {...mergeProps(button.buttonProps, common)} ref={ref as React.Ref<HTMLButtonElement>}>
      {content}
    </button>
  );
});
