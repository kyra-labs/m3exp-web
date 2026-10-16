import { NavigationDrawerLayout } from '@kyralabs/m3e-elements/navigation-drawer-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { mergeProps, useButton, useLink, useObjectRef } from 'react-aria';
import { Icon } from '../icon/Icon.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx } from '../utils/cx.js';
import { type NavigationSelectionProps, useNavigationSelection } from './NavigationItem.js';

/** One destination of a navigation drawer (Compose `NavigationDrawerItem`). */
export interface NavigationDrawerDestination {
  /** Unique within the drawer; what `selectedKey` refers to. */
  key: string;
  /** Visible label, and the accessible name. */
  label: string;
  /** Material Symbols ligature (optional, as Compose's `icon`). Filled (FILL 1) while selected. */
  icon?: string | undefined;
  /** Navigates (renders `<a>`); otherwise a `<button>` that only selects. */
  href?: string | undefined;
  /** Trailing badge text, e.g. an unread count (Compose `badge`). */
  badge?: string | undefined;
  type?: undefined;
}

/** A section headline (m3.material.io "Headline" / "Section label"). */
export interface NavigationDrawerHeadline {
  key: string;
  type: 'headline';
  label: string;
}

/** A divider between groups of destinations. */
export interface NavigationDrawerDivider {
  key: string;
  type: 'divider';
}

export type NavigationDrawerEntry =
  NavigationDrawerDestination | NavigationDrawerHeadline | NavigationDrawerDivider;

export interface NavigationDrawerProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'defaultValue'>,
    Omit<NavigationSelectionProps, 'items'> {
  /**
   * `permanent` (default): always shown, in the layout. `dismissible`: in the layout, opened and
   * closed (the content beside it moves). `modal`: opens over the page as a dialog above a scrim.
   * Compose's three drawers; switching it (e.g. by window size class) keeps the selection.
   */
  variant?: 'permanent' | 'dismissible' | 'modal';
  /** Destinations, headlines and dividers, in order. */
  items: readonly NavigationDrawerEntry[];
  /** Open (dismissible / modal; controlled). */
  isOpen?: boolean;
  /** The initial open state (uncontrolled). */
  defaultOpen?: boolean;
  /**
   * Called when the drawer asks to change state: Escape, a press on the scrim, or a drag released
   * past Compose's thresholds. Controlled drawers follow `isOpen`.
   */
  onOpenChange?: (isOpen: boolean) => void;
  /** Content at the top of the sheet, before the items. */
  header?: ReactNode;
  /** The modal window's accessible name (default "Navigation menu", Compose's pane title). */
  dialogLabel?: string;
}

interface DrawerItemProps {
  item: NavigationDrawerDestination;
  isSelected: boolean;
  onSelect: (key: string) => void;
}

/** The m3e-css `.m3e-navigation-drawer-item` contract; React Aria handles the press. */
function NavigationDrawerItem({ item, isSelected, onSelect }: DrawerItemProps): ReactNode {
  const { key, icon, label, href, badge } = item;
  const ref = useObjectRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const stateLayer = useStateLayer();
  const press = {
    onPress: () => {
      // The release of a drag that closes the drawer is not a press (NavigationDrawerLayout).
      if (ref.current?.closest('[data-dragging]')) return;
      onSelect(key);
    },
    onPressStart: stateLayer.onPressStart,
    onPressEnd: stateLayer.onPressEnd,
  };
  const link = useLink({ ...press, ...(href !== undefined ? { href } : {}) }, ref);
  const button = useButton(
    { ...press, type: 'button' },
    ref as RefObject<HTMLButtonElement | null>,
  );
  const common = {
    ...stateLayer.stateLayerProps,
    className: 'm3e-navigation-drawer-item',
    'aria-current': isSelected ? ('page' as const) : undefined,
  };
  const content = (
    <>
      {icon === undefined ? null : (
        <Icon name={icon} className="m3e-navigation-drawer-item__icon" />
      )}
      <span className="m3e-navigation-drawer-item__label">{label}</span>
      {badge === undefined ? null : (
        <span className="m3e-navigation-drawer-item__badge">{badge}</span>
      )}
    </>
  );
  if (href !== undefined) {
    return (
      <a
        {...mergeProps(link.linkProps, common)}
        ref={ref as RefObject<HTMLAnchorElement | null>}
        href={href}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      {...mergeProps(button.buttonProps, common)}
      ref={ref as RefObject<HTMLButtonElement | null>}
    >
      {content}
    </button>
  );
}

/**
 * Navigation drawer (COMPONENT_SPEC §15; Compose `PermanentNavigationDrawer`,
 * `DismissibleNavigationDrawer` and `ModalNavigationDrawer` with their drawer sheet and
 * `NavigationDrawerItem`s). A `<nav>` sheet of destinations (the selected one marked
 * `aria-current="page"`), headlines and dividers. Opening and closing animate on Compose's springs
 * with m3e-elements' NavigationDrawerLayout (the code `<m3e-navigation-drawer>` runs): drags on the
 * open sheet close it, and the modal drawer is a dialog over a scrim (focus trapped, Escape or the
 * scrim close it, focus returns to the opener). `aria-label` names the `<nav>`; other props go to
 * the root. Place permanent / dismissible drawers in a flex row before the content.
 */
export const NavigationDrawer = /* @__PURE__ */ forwardRef(function NavigationDrawer(
  {
    variant = 'permanent',
    items,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    isOpen: openProp,
    defaultOpen = false,
    onOpenChange,
    header,
    dialogLabel,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...rest
  }: NavigationDrawerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const [selected, select] = useNavigationSelection({
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
  });
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = variant !== 'permanent' && (openProp ?? uncontrolled);
  const layoutRef = useRef<NavigationDrawerLayout | null>(null);
  const handlers = useRef({ onOpenChange, controlled: openProp !== undefined });
  handlers.current = { onOpenChange, controlled: openProp !== undefined };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const layout = new NavigationDrawerLayout(el, {
      open,
      ...(dialogLabel === undefined ? {} : { dialogLabel }),
      onOpenChange: (next) => {
        if (!handlers.current.controlled) setUncontrolled(next);
        handlers.current.onOpenChange?.(next);
        return undefined;
      },
    });
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // Created once per variant; `open` is synced below.
  }, [variant]);
  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    layout.update();
    layout.setOpen(open);
  });
  const sheet = (
    <nav
      key="sheet"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className="m3e-navigation-drawer__sheet"
    >
      {header}
      {items.map((entry) =>
        entry.type === 'headline' ? (
          <h2 key={entry.key} className="m3e-navigation-drawer__headline">
            {entry.label}
          </h2>
        ) : entry.type === 'divider' ? (
          <hr key={entry.key} className="m3e-navigation-drawer__divider" />
        ) : (
          <NavigationDrawerItem
            key={entry.key}
            item={entry}
            isSelected={entry.key === selected}
            onSelect={select}
          />
        ),
      )}
    </nav>
  );
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'm3e-navigation-drawer',
        variant !== 'permanent' && `m3e-navigation-drawer--${variant}`,
        open && 'm3e-navigation-drawer--open',
        className,
      )}
    >
      {variant === 'modal' ? (
        <div key="scrim" className="m3e-navigation-drawer__scrim" aria-hidden="true" />
      ) : null}
      {sheet}
    </div>
  );
});
