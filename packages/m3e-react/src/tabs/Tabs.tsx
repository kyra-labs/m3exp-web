import { TabsLayout } from '@kyralabs/m3e-elements/tabs-layout.js';
import type { BadgeValue } from '@kyralabs/m3e-motion';
import {
  Children,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { mergeProps, useButton, useObjectRef } from 'react-aria';
import { Badge, BadgedBox } from '../badge/Badge.js';
import { destinationBadge, labelWithBadge } from '../badge/destination.js';
import { Icon } from '../icon/Icon.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx } from '../utils/cx.js';

/** One tab (Compose `Tab` / `LeadingIconTab`). */
export interface TabItem {
  /** Unique within the row; what `selectedKey` and `<TabPanel id>` refer to. */
  key: string;
  /** Visible label, and the accessible name. */
  label: string;
  /** Material Symbols ligature, e.g. `photo`. Filled (FILL 1) while selected. */
  icon?: string | undefined;
  /** Not selectable (stays focusable, `aria-disabled`, as APG recommends). */
  isDisabled?: boolean | undefined;
  /** Icon only: the label becomes the `aria-label` (Compose `text = null`). */
  isLabelHidden?: boolean | undefined;
  /**
   * A badge (Compose `BadgedBox` in the tab's text, TabSamples.kt LeadingIconTabs; m3.material.io:
   * a large badge at the trailing edge): on the label; on the icon when the label is hidden or
   * sits under the icon (a stacked tab, m3.material.io Tabs › Specs; D20 (1)).
   * `true` or `''` the dot, a number (or digits) a count — `999+` above 999 — other text as is.
   */
  badge?: BadgeValue | false | undefined;
  /**
   * The badge's visually hidden text, read after the label (owner decision M9 #7). Default:
   * "New notification" for the dot, the shown text otherwise; `''` leaves the badge out.
   */
  badgeLabel?: string | undefined;
}

export interface TabProps {
  /** The tab's key (as `TabItem.key`). */
  id: string;
  /** The label. */
  children: string;
  icon?: string | undefined;
  isDisabled?: boolean | undefined;
  isLabelHidden?: boolean | undefined;
  badge?: BadgeValue | false | undefined;
  badgeLabel?: string | undefined;
}

/**
 * Declares one tab as a child of `<Tabs>` (instead of `items`). Renders nothing itself: `<Tabs>`
 * renders the `.m3e-tab` contract.
 */
export function Tab(_props: TabProps): ReactNode {
  return null;
}

export interface TabsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onChange' | 'defaultValue' | 'id'
> {
  /** `primary` (default, Compose PrimaryTabRow) or `secondary` (SecondaryTabRow). */
  variant?: 'primary' | 'secondary';
  /** Scrollable row (Compose *ScrollableTabRow): tabs as wide as their content, scrolled. */
  scrollable?: boolean;
  /** `top` (default): icons above labels; `leading`: before them (Compose LeadingIconTab). */
  iconPosition?: 'top' | 'leading';
  /** The tabs (or `<Tab>` children). */
  items?: readonly TabItem[];
  /** The selected tab (controlled). */
  selectedKey?: string | null | undefined;
  /** The initially selected tab (uncontrolled). Default: the first enabled tab. */
  defaultSelectedKey?: string | null | undefined;
  /** Called when another tab is pressed (or activated with Enter / Space). */
  onSelectionChange?: ((key: string) => void) | undefined;
  /** Prefix of the tab and panel ids (default: a generated one). Not rendered on the root. */
  id?: string | undefined;
  /** `<Tab>` declarations and `<TabPanel>`s (rendered after the row, in order). */
  children?: ReactNode;
}

interface TabsContextValue {
  base: string;
  keys: readonly string[];
  selected: string | null;
}

const TabsContext = /* @__PURE__ */ createContext<TabsContextValue | null>(null);

const tabId = (base: string, index: number) => `${base}-tab-${String(index)}`;
const panelId = (base: string, index: number) => `${base}-panel-${String(index)}`;

function tabsFromChildren(children: ReactNode): TabItem[] {
  return Children.toArray(children)
    .filter((c): c is ReactElement<TabProps> => isValidElement(c) && c.type === Tab)
    .map(({ props }) => ({
      key: props.id,
      label: props.children,
      icon: props.icon,
      isDisabled: props.isDisabled,
      isLabelHidden: props.isLabelHidden,
      badge: props.badge,
      badgeLabel: props.badgeLabel,
    }));
}

interface TabButtonProps {
  item: TabItem;
  id: string;
  isSelected: boolean;
  controls: string | undefined;
  onSelect: (key: string) => void;
  /** Icons above labels (`iconPosition="top"`). */
  isStacked: boolean;
}

/** The m3e-css `.m3e-tab` contract; React Aria handles the press, the tab draws the ripple. */
function TabButton({
  item,
  id,
  isSelected,
  controls,
  onSelect,
  isStacked,
}: TabButtonProps): ReactNode {
  const { key, label, icon, isDisabled = false, isLabelHidden = false } = item;
  const iconElement = icon === undefined ? null : <Icon name={icon} className="m3e-tab__icon" />;
  const labelElement = isLabelHidden ? null : <span className="m3e-tab__label">{label}</span>;
  // The badge is read after the label. A stacked tab (icon above the label) badges its icon and
  // puts the label first in the DOM (D20 (1)); others badge the label (the icon, label hidden).
  const stacked = isStacked && iconElement !== null && labelElement !== null;
  const anchor = isLabelHidden || stacked ? iconElement : labelElement;
  const badge = anchor ? destinationBadge(item.badge, item.badgeLabel) : null;
  const ref = useRef<HTMLButtonElement>(null);
  const stateLayer = useStateLayer();
  const { buttonProps } = useButton(
    {
      type: 'button',
      onPress: () => {
        if (!isDisabled && !isSelected) onSelect(key);
      },
      onPressStart: stateLayer.onPressStart,
      onPressEnd: stateLayer.onPressEnd,
    },
    ref,
  );
  return (
    <button
      {...mergeProps(buttonProps, stateLayer.stateLayerProps, {
        className: 'm3e-tab',
        role: 'tab',
        id,
        'aria-selected': isSelected ? ('true' as const) : ('false' as const),
        'aria-controls': controls,
        'aria-disabled': isDisabled ? ('true' as const) : undefined,
        'aria-label': isLabelHidden ? labelWithBadge(label, badge) : undefined,
      })}
      ref={ref}
    >
      <span className="m3e-tab__content">
        {badge ? (stacked ? labelElement : isLabelHidden ? null : iconElement) : iconElement}
        {badge ? (
          <BadgedBox badge={<Badge label={isLabelHidden ? '' : badge.label}>{badge.text}</Badge>}>
            {anchor}
          </BadgedBox>
        ) : (
          labelElement
        )}
      </span>
    </button>
  );
}

/**
 * Tabs (COMPONENT_SPEC §17; Compose PrimaryTabRow / SecondaryTabRow / PrimaryScrollableTabRow /
 * SecondaryScrollableTabRow with Tab / LeadingIconTab): the tab row (`role="tablist"`, named by
 * `aria-label`) followed by its `<TabPanel>` children, wired as APG tabs. m3e-elements'
 * TabsLayout (the code `<m3e-tabs>` runs) moves the focus with the arrow keys (manual activation:
 * a press, Enter or Space selects), slides the indicator on Compose's spring and scrolls a
 * scrollable row to the selected tab. Other props go to the `.m3e-tabs` root.
 */
export const Tabs = /* @__PURE__ */ forwardRef(function Tabs(
  {
    variant = 'primary',
    scrollable = false,
    iconPosition = 'top',
    items,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    id,
    children,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...rest
  }: TabsProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const generated = useId();
  const base = id ?? generated;
  const tabs = items ?? tabsFromChildren(children);
  const keys = tabs.map((t) => t.key);
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultSelectedKey ?? null);
  const requested = selectedKey !== undefined ? selectedKey : uncontrolled;
  const selected =
    requested != null && keys.includes(requested)
      ? requested
      : (tabs.find((t) => !t.isDisabled)?.key ?? null);
  const select = (key: string) => {
    if (selectedKey === undefined) setUncontrolled(key);
    onSelectionChange?.(key);
  };
  const panels = Children.toArray(children).filter(
    (c): c is ReactElement<TabPanelProps> => isValidElement(c) && c.type === TabPanel,
  );
  const panelKeys = new Set(panels.map((p) => p.props.id));

  const layoutRef = useRef<TabsLayout | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const layout = new TabsLayout(el);
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    layoutRef.current?.update();
  });

  return (
    <TabsContext.Provider value={{ base, keys, selected }}>
      <div
        {...rest}
        ref={ref}
        className={cx(
          'm3e-tabs',
          `m3e-tabs--${variant}`,
          scrollable && 'm3e-tabs--scrollable',
          iconPosition === 'leading' && 'm3e-tabs--leading-icon',
          className,
        )}
      >
        <div
          className="m3e-tabs__list"
          role="tablist"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
        >
          {tabs.map((item, index) => (
            <TabButton
              key={item.key}
              item={item}
              id={tabId(base, index)}
              isSelected={item.key === selected}
              controls={panelKeys.has(item.key) ? panelId(base, index) : undefined}
              onSelect={select}
              isStacked={iconPosition !== 'leading'}
            />
          ))}
        </div>
      </div>
      {panels}
    </TabsContext.Provider>
  );
});

export interface TabPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'id'> {
  /** The key of the tab this panel belongs to. */
  id: string;
  children?: ReactNode;
}

/**
 * The content of one tab, a child of `<Tabs>`: `role="tabpanel"` (`.m3e-tab-panel`), labelled by
 * its tab, focusable, hidden while the tab is not selected (it stays mounted).
 */
export const TabPanel = /* @__PURE__ */ forwardRef(function TabPanel(
  { id, children, className, ...rest }: TabPanelProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const tabs = useContext(TabsContext);
  const index = tabs ? tabs.keys.indexOf(id) : -1;
  return (
    <div
      {...rest}
      ref={ref}
      className={cx('m3e-tab-panel', className)}
      role="tabpanel"
      tabIndex={0}
      id={tabs && index >= 0 ? panelId(tabs.base, index) : undefined}
      aria-labelledby={tabs && index >= 0 ? tabId(tabs.base, index) : undefined}
      hidden={!tabs || index < 0 || tabs.selected !== id}
    >
      {children}
    </div>
  );
});
