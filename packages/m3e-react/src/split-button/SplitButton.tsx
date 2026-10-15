import type { MenuAnchorPosition } from '@kyralabs/m3e-motion';
import {
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  forwardRef,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  type PressEvent,
  mergeProps,
  useButton,
  useFocusRing,
  useHover,
  useObjectRef,
} from 'react-aria';
import type { ButtonSize } from '../button/Button.js';
import { Icon } from '../icon/Icon.js';
import { MenuTrigger } from '../menu/MenuTrigger.js';
import { type SpringSpec, ValueSpring, readSpring } from '../motion/shape-spring.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';

/** SplitButtonDefaults.LeadingButton / TonalLeadingButton / ElevatedLeadingButton / OutlinedLeadingButton. */
export type SplitButtonVariant = 'filled' | 'tonal' | 'elevated' | 'outlined';

export interface SplitButtonProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onKeyDown'
> {
  /** Color configuration of both buttons. Default `filled`. */
  variant?: SplitButtonVariant;
  /** Default `s` (40dp). */
  size?: ButtonSize;
  /** Leading button icon, e.g. `<Icon name="save" />`. */
  icon?: ReactNode;
  /** Leading button label. */
  children?: ReactNode;
  /** The primary action (leading button). */
  onPress?: (e: PressEvent) => void;
  /** The `<Menu>` the trailing button opens. */
  menu: ReactElement;
  /** Accessible name of the trailing (menu) button, e.g. "More save options". */
  menuLabel: string;
  /** Trailing icon. Default `<Icon name="keyboard_arrow_down" />` (Compose samples). */
  trailingIcon?: ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Where the menu opens. Default `below` (flips above when there is no room). */
  menuPosition?: MenuAnchorPosition;
  /** Disables both buttons. */
  isDisabled?: boolean;
}

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The samples' icon rotation spring (split-button-defaults.css); null when it jumps. */
function rotationSpring(el: Element): SpringSpec | null {
  const style = getComputedStyle(el);
  const read = (field: string) =>
    Number.parseFloat(
      style.getPropertyValue(`--m3e-comp-split-button-trailing-icon-rotation-${field}`),
    );
  if (read('duration') === 0) return null;
  const dampingRatio = read('damping-ratio');
  const stiffness = read('stiffness');
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}

/** A spring that writes one inline custom property and removes it once settled. */
const inlineSpring = (el: HTMLElement, property: string, unit: string) =>
  new ValueSpring(
    (value) => {
      el.style.setProperty(property, `${String(Math.round(value * 100) / 100)}${unit}`);
    },
    () => {
      el.style.removeProperty(property);
      if (el.getAttribute('style') === '') el.removeAttribute('style');
    },
  );

/**
 * Springs a part's inner corners (`--_m3e-split-button-inner`, capped at half the smaller side) and,
 * for the trailing part, its icon's rotation (`--_m3e-split-button-rotation`) to what m3e-css
 * resolves for the current state. Corner: SplitButton.kt default effects spring (fast effects with
 * reduced motion). Rotation: the samples' spring (jumps with reduced motion). Both keep their
 * velocity when retargeted.
 */
function useSplitButtonSprings(
  ref: RefObject<HTMLElement | null>,
  withIcon: boolean,
  stateKey: string,
): void {
  const springs = useRef<{
    corner: ValueSpring;
    rotation: ValueSpring | null;
    icon: HTMLElement | null;
  } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const icon = withIcon ? el.querySelector<HTMLElement>(':scope > .m3e-icon') : null;
    springs.current ??= {
      corner: inlineSpring(el, '--_m3e-split-button-inner-now', 'px'),
      rotation: null,
      icon: null,
    };
    if (springs.current.icon !== icon) {
      springs.current.rotation?.stop();
      springs.current.rotation = icon
        ? inlineSpring(icon, '--_m3e-split-button-rotation-now', 'deg')
        : null;
      springs.current.icon = icon;
    }
    const { corner, rotation } = springs.current;
    const resolved = Number.parseFloat(
      getComputedStyle(el).getPropertyValue('--_m3e-split-button-inner'),
    );
    if (Number.isFinite(resolved)) {
      const box = el.getBoundingClientRect();
      const half = Math.min(box.width, box.height) / 2;
      const target = half > 0 ? Math.min(resolved, half) : resolved;
      const token = reducedMotion() ? 'fast-effects' : 'default-effects';
      corner.to(target, corner.value === null ? null : readSpring(el, token));
    }
    if (icon && rotation) {
      const angle = Number.parseFloat(
        getComputedStyle(icon).getPropertyValue('--_m3e-split-button-rotation'),
      );
      if (Number.isFinite(angle)) {
        rotation.to(angle, rotation.value === null ? null : rotationSpring(icon));
      }
    }
  }, [ref, withIcon, stateKey]);

  useLayoutEffect(
    () => () => {
      springs.current?.corner.stop();
      springs.current?.rotation?.stop();
    },
    [],
  );
}

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled' | 'onClick' | 'type' | 'onKeyDown'
>;

interface PartProps extends NativeButtonProps {
  part: 'leading' | 'trailing';
  variant: SplitButtonVariant;
  size: ButtonSize;
  isDisabled: boolean;
  onPress?: ((e: PressEvent) => void) | undefined;
  onKeyDown?: ((e: KeyboardEvent) => void) | undefined;
  children?: ReactNode;
}

/** One of the two buttons: React Aria `useButton` on the `.m3e-button` classes. */
const SplitButtonPart = /* @__PURE__ */ forwardRef(function SplitButtonPart(
  props: PartProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const { part, variant, size, isDisabled, onPress, onKeyDown, children, ...rest } = props;
  const ref = useObjectRef(forwardedRef);
  const stateLayer = useStateLayer();
  const { buttonProps, isPressed } = useButton(
    {
      type: 'button',
      isDisabled,
      ...defined({ onPress, onKeyDown }),
      onPressStart: stateLayer.onPressStart,
      onPressEnd: stateLayer.onPressEnd,
    },
    ref,
  );
  const { focusProps } = useFocusRing();
  const { hoverProps } = useHover({ isDisabled });
  const expanded = rest['aria-expanded'];
  useSplitButtonSprings(
    ref,
    part === 'trailing',
    `${String(isPressed)}|${String(expanded)}|${variant}|${size}`,
  );
  return (
    <button
      {...mergeProps(rest, buttonProps, focusProps, hoverProps, stateLayer.stateLayerProps, {
        className: cx(
          'm3e-button',
          `m3e-button--${variant}`,
          `m3e-button--size-${size}`,
          'm3e-button--round',
          `m3e-split-button__${part}`,
        ),
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
 * Material 3 Expressive split button (COMPONENT_SPEC §4; Compose `SplitButtonLayout` with
 * `SplitButtonDefaults.LeadingButton` and the checkable `TrailingButton`): the leading button runs
 * `onPress`, the trailing button opens `menu` (a `<Menu>`, via `<MenuTrigger>`: press, ArrowDown /
 * ArrowUp / Enter / Space, Escape returns focus to it). While the menu is open the trailing button
 * is checked: its inner corners morph to full and its icon turns 180°, on interruptible springs.
 */
export const SplitButton = /* @__PURE__ */ forwardRef(function SplitButton(
  props: SplitButtonProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const {
    variant = 'filled',
    size = 's',
    icon,
    children,
    onPress,
    menu,
    menuLabel,
    trailingIcon,
    isOpen,
    defaultOpen,
    onOpenChange,
    menuPosition = 'below',
    isDisabled = false,
    className,
    ...rest
  } = props;
  return (
    <div {...rest} ref={ref} className={cx('m3e-split-button', className)}>
      <SplitButtonPart
        part="leading"
        variant={variant}
        size={size}
        isDisabled={isDisabled}
        onPress={onPress}
      >
        {icon}
        {children}
      </SplitButtonPart>
      <MenuTrigger
        {...defined({ isOpen, defaultOpen, onOpenChange })}
        position={menuPosition}
        isDisabled={isDisabled}
      >
        <SplitButtonPart
          part="trailing"
          variant={variant}
          size={size}
          isDisabled={isDisabled}
          aria-label={menuLabel}
        >
          {trailingIcon ?? <Icon name="keyboard_arrow_down" />}
        </SplitButtonPart>
        {menu}
      </MenuTrigger>
    </div>
  );
});
