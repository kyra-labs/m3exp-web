import { type ReactNode, type RefObject, useRef, useState } from 'react';
import { mergeProps, useButton, useLink, useObjectRef } from 'react-aria';
import { Icon } from '../icon/Icon.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';

/** One destination of a navigation bar or rail. */
export interface NavigationDestination {
  /** Unique within the bar/rail; what `selectedKey` refers to. */
  key: string;
  /** Material Symbols ligature, e.g. `home`. Filled (FILL 1) while selected. */
  icon: string;
  /** Visible label, and the accessible name. */
  label: string;
  /** Navigates (renders `<a>`); otherwise a `<button>` that only selects. */
  href?: string | undefined;
  isDisabled?: boolean | undefined;
  /** Icon only: the label becomes the `aria-label` (Compose `label = null`). */
  isLabelHidden?: boolean | undefined;
}

export interface NavigationSelectionProps {
  items: readonly NavigationDestination[];
  /** The selected destination (controlled). Exactly one item gets `aria-current="page"`. */
  selectedKey?: string | null | undefined;
  /** The initially selected destination (uncontrolled). */
  defaultSelectedKey?: string | null | undefined;
  /** Called when an item is pressed. */
  onSelectionChange?: ((key: string) => void) | undefined;
}

/** Controlled/uncontrolled single selection shared by the bars and rails. */
export function useNavigationSelection({
  selectedKey,
  defaultSelectedKey = null,
  onSelectionChange,
}: Omit<NavigationSelectionProps, 'items'>): [string | null, (key: string) => void] {
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultSelectedKey);
  const selected = selectedKey !== undefined ? selectedKey : uncontrolled;
  const select = (key: string) => {
    if (selectedKey === undefined) setUncontrolled(key);
    onSelectionChange?.(key);
  };
  return [selected, select];
}

interface NavigationItemProps {
  item: NavigationDestination;
  isSelected: boolean;
  onSelect: (key: string) => void;
}

/**
 * The m3e-css `.m3e-navigation-item` contract. React Aria handles the press; the state layer and
 * its ripple sit on the indicator pill (`__state`), as Compose maps the item's interactions there.
 */
export function NavigationItem({ item, isSelected, onSelect }: NavigationItemProps): ReactNode {
  const { key, icon, label, href, isDisabled = false, isLabelHidden = false } = item;
  const stateRef = useRef<HTMLSpanElement>(null);
  const ref = useObjectRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const stateLayer = useStateLayer(stateRef);
  const press = {
    isDisabled,
    onPress: () => {
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
    className: 'm3e-navigation-item',
    'aria-current': isSelected ? ('page' as const) : undefined,
    'aria-label': isLabelHidden ? label : undefined,
  };
  const content = (
    <span className="m3e-navigation-item__content">
      <span className="m3e-navigation-item__indicator" aria-hidden="true" />
      <span
        {...stateLayer.stateLayerProps}
        ref={stateRef}
        className="m3e-navigation-item__state"
        aria-hidden="true"
      />
      <Icon name={icon} className="m3e-navigation-item__icon" />
      {isLabelHidden ? null : <span className="m3e-navigation-item__label">{label}</span>}
    </span>
  );
  if (href !== undefined) {
    return (
      <a
        {...mergeProps(link.linkProps, common)}
        ref={ref as RefObject<HTMLAnchorElement | null>}
        href={isDisabled ? undefined : href}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      {...mergeProps(button.buttonProps, common, {
        'aria-disabled': isDisabled ? ('true' as const) : undefined,
      })}
      ref={ref as RefObject<HTMLButtonElement | null>}
    >
      {content}
    </button>
  );
}
