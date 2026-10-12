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

/** `flat` = Compose `AssistChip`, `elevated` = `ElevatedAssistChip`. */
export type AssistChipVariant = 'flat' | 'elevated';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled' | 'onClick' | 'type'
>;

export interface AssistChipProps extends NativeButtonProps {
  /** Default `flat`. */
  variant?: AssistChipVariant;
  /** Icon before the label, e.g. `<Icon name="event" />`. */
  leadingIcon?: ReactNode;
  /** Icon after the label. */
  trailingIcon?: ReactNode;
  /** The label. */
  children?: ReactNode;
  className?: string;
  /** Renders a link (`<a class="m3e-assist-chip">`) instead of a `<button>`. */
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  rel?: string;
  isDisabled?: boolean;
  /** Keeps a disabled chip in the tab order (`aria-disabled` instead of `disabled`). */
  focusableWhenDisabled?: boolean;
  onPress?: (e: PressEvent) => void;
  onPressStart?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
}

/** Classes for an assist chip (the m3e-css contract). */
export const assistChipClassName = (
  variant: AssistChipVariant = 'flat',
  className?: string,
): string =>
  cx('m3e-assist-chip', variant === 'elevated' && 'm3e-assist-chip--elevated', className);

/**
 * Assist chip (COMPONENT_SPEC §18): React Aria behavior on the m3e-css `.m3e-assist-chip` classes.
 * A smart or contextual action, e.g. "Add to calendar".
 */
export const AssistChip = forwardRef(function AssistChip(
  props: AssistChipProps,
  forwardedRef: ForwardedRef<HTMLButtonElement | HTMLAnchorElement>,
) {
  const {
    variant,
    leadingIcon,
    trailingIcon,
    children,
    className,
    href,
    target,
    rel,
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
  const button = useButton(
    { ...pressOptions, type: 'button' },
    ref as React.RefObject<HTMLButtonElement>,
  );
  const { focusProps } = useFocusRing();
  const { hoverProps } = useHover({ isDisabled });
  const isLink = href !== undefined;
  const isPressed = (isLink ? link.isPressed : button.isPressed) && !softDisabled;

  const common = mergeProps(rest, focusProps, hoverProps, stateLayer.stateLayerProps, {
    className: assistChipClassName(variant, className),
    'data-pressed': isPressed ? '' : undefined,
    'aria-disabled': softDisabled ? 'true' : undefined,
  });
  const content = (
    <>
      {leadingIcon}
      <span className="m3e-assist-chip__label">{children}</span>
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
