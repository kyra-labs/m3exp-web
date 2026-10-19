import type { BadgeValue } from '@kyralabs/m3e-motion';
import { type ReactNode, type RefObject, useRef, useState } from 'react';
import { mergeProps, useButton, useLink, useObjectRef } from 'react-aria';
import { Badge, BadgedBox } from '../badge/Badge.js';
import { destinationBadge, labelWithBadge } from '../badge/destination.js';
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
  /**
   * A badge on the icon (Compose `BadgedBox` in the item's icon, as NavigationSuiteScaffold's
   * NavigationItemIcon builds it): `true` or `''` the dot, a number (or digits) a count — `999+`
   * above 999 — other short text as is. In a navigation drawer it is the trailing badge text.
   */
  badge?: BadgeValue | false | undefined;
  /**
   * The badge's visually hidden text, read after the label (owner decision M9 #7). Default:
   * "New notification" for the dot, the shown text otherwise; `''` leaves the badge out.
   */
  badgeLabel?: string | undefined;
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
  const badge = destinationBadge(item.badge, item.badgeLabel);
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
    'aria-label': isLabelHidden ? labelWithBadge(label, badge) : undefined,
  };
  const iconElement = <Icon name={icon} className="m3e-navigation-item__icon" />;
  const labelElement = isLabelHidden ? null : (
    <span className="m3e-navigation-item__label">{label}</span>
  );
  // With a badge: the label, then the icon in a badged box, so the badge is read after the label.
  const content = (
    <span className="m3e-navigation-item__content">
      <span className="m3e-navigation-item__indicator" aria-hidden="true" />
      <span
        {...stateLayer.stateLayerProps}
        ref={stateRef}
        className="m3e-navigation-item__state"
        aria-hidden="true"
      />
      {badge ? labelElement : iconElement}
      {badge ? (
        <BadgedBox badge={<Badge label={isLabelHidden ? '' : badge.label}>{badge.text}</Badge>}>
          {iconElement}
        </BadgedBox>
      ) : (
        labelElement
      )}
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
