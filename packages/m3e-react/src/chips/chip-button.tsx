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
import { defined } from '../utils/cx.js';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled' | 'onClick' | 'type'
>;

/** Props shared by the button chips (assist, suggestion). */
export interface ChipButtonProps extends NativeButtonProps {
  /** The label. */
  children?: ReactNode;
  className?: string;
  /** Renders a link (`<a>`) instead of a `<button>`. */
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

interface ChipButtonImplProps extends ChipButtonProps {
  /** The chip's classes. */
  className: string;
  /** The label's class (`.m3e-<chip>__label`). */
  labelClassName: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

/**
 * A button chip (Compose `Chip()`, Role.Button): React Aria `useButton` / `useLink`, the state
 * layer ripple and `data-pressed` on the m3e-css chip contract
 * (`[leading] .m3e-<chip>__label [trailing]`). Shared by `<AssistChip>` and `<SuggestionChip>`.
 */
export const ChipButton = /* @__PURE__ */ forwardRef(function ChipButton(
  props: ChipButtonImplProps,
  forwardedRef: ForwardedRef<HTMLButtonElement | HTMLAnchorElement>,
) {
  const {
    leading,
    trailing,
    labelClassName,
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
    className,
    'data-pressed': isPressed ? '' : undefined,
    'aria-disabled': softDisabled ? 'true' : undefined,
  });
  const content = (
    <>
      {leading}
      <span className={labelClassName}>{children}</span>
      {trailing}
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
