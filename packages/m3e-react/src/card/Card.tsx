import {
  type ElementType,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  createContext,
  forwardRef,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { type PressEvent, mergeProps, useButton, useLink, useObjectRef } from 'react-aria';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';

export type CardVariant = 'filled' | 'elevated' | 'outlined';

interface CardContextValue {
  register: () => () => void;
  onPressStart: (e: PressEvent) => void;
  onPressEnd: (e: PressEvent) => void;
}

const CardContext = createContext<CardContextValue | null>(null);

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Default `filled` (Compose `Card`). */
  variant?: CardVariant;
  /** Element to render. Default `div`; use `article` for self-contained content. */
  as?: 'div' | 'article' | 'section' | 'li';
  children?: ReactNode;
}

/**
 * Card (COMPONENT_SPEC §19): the `.m3e-card` classes. Add one {@link CardAction} to make it
 * interactive: its hit area stretches over the card, which then shows the state layer, the
 * elevation change and the focus ring.
 */
export const Card = forwardRef(function Card(
  { variant = 'filled', as = 'div', className, children, ...rest }: CardProps,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const [actions, setActions] = useState(0);
  const stateLayer = useStateLayer(ref);
  const context = useMemo<CardContextValue>(
    () => ({
      register: () => {
        setActions((n) => n + 1);
        return () => {
          setActions((n) => n - 1);
        };
      },
      onPressStart: stateLayer.onPressStart,
      onPressEnd: stateLayer.onPressEnd,
    }),
    [stateLayer.onPressStart, stateLayer.onPressEnd],
  );
  const interactive = actions > 0;
  const Element = as as ElementType;
  return (
    <CardContext.Provider value={context}>
      <Element
        {...mergeProps(rest, interactive ? stateLayer.stateLayerProps : {})}
        ref={ref}
        className={cx(
          'm3e-card',
          `m3e-card--${variant}`,
          interactive && 'm3e-card--interactive',
          className,
        )}
      >
        {children}
      </Element>
    </CardContext.Provider>
  );
});

export interface CardActionProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  /** Navigates (renders `<a>`); otherwise a `<button>`. */
  href?: string;
  isDisabled?: boolean;
  onPress?: (e: PressEvent) => void;
  children?: ReactNode;
}

/** The primary action of an interactive {@link Card} (`.m3e-card__action`). */
export const CardAction = forwardRef(function CardAction(
  { href, isDisabled = false, onPress, className, children, ...rest }: CardActionProps,
  forwardedRef: ForwardedRef<HTMLAnchorElement | HTMLButtonElement>,
) {
  const card = useContext(CardContext);
  if (!card) throw new Error('<CardAction> must be inside a <Card>.');
  const { register } = card;
  useLayoutEffect(() => register(), [register]);
  const ref = useObjectRef(forwardedRef);
  const press = {
    isDisabled,
    ...defined({ onPress }),
    onPressStart: card.onPressStart,
    onPressEnd: card.onPressEnd,
  };
  const link = useLink({ ...press, ...defined({ href }) }, ref);
  const button = useButton({ ...press, type: 'button' }, ref as React.RefObject<HTMLButtonElement>);
  const common = { className: cx('m3e-card__action', className) };
  if (href !== undefined) {
    return (
      <a
        {...mergeProps(rest, link.linkProps, common)}
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={isDisabled ? undefined : href}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      {...mergeProps(rest, button.buttonProps, common, {
        'aria-disabled': isDisabled ? ('true' as const) : undefined,
      })}
      ref={ref as React.Ref<HTMLButtonElement>}
    >
      {children}
    </button>
  );
});
