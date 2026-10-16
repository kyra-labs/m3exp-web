// m3e-elements is bundled (a devDependency); the public types come from m3e-motion (a dependency).
import { NavigationSuiteLayout } from '@kyralabs/m3e-elements/navigation-suite-layout.js';
import {
  NAVIGATION_SUITE_EXPANDED_FROM,
  type NavigationSuiteType,
  type NavigationSuiteTypeOptions,
  type WindowSizeClass,
  isNavigationBarType,
  navigationSuiteType as defaultNavigationSuiteType,
} from '@kyralabs/m3e-motion';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';
import { useWindowSizeClass } from '../window-size-class/useWindowSizeClass.js';
import { NavigationDrawerItem } from './NavigationDrawer.js';
import {
  type NavigationDestination,
  NavigationItem,
  type NavigationSelectionProps,
  useNavigationSelection,
} from './NavigationItem.js';

/** A navigation suite destination: a bar / rail destination, plus a badge in the drawer. */
export interface NavigationSuiteDestination extends NavigationDestination {
  /** Trailing badge text in the drawer type (bars and rails wait for the Badge component). */
  badge?: string | undefined;
}

export interface NavigationSuiteScaffoldProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'defaultValue'>,
    Omit<NavigationSelectionProps, 'items'> {
  items: readonly NavigationSuiteDestination[];
  /**
   * A fixed navigation type (Compose's `navigationSuiteType` / `layoutType` argument), e.g.
   * `navigation-drawer`; it wins over the adaptive rule. Default: adaptive.
   */
  layoutType?: NavigationSuiteType | undefined;
  /**
   * The adaptive rule: a function of the window size class (`useWindowSizeClass`). Default:
   * m3e-motion's `navigationSuiteType(sizeClass, { expandedFrom, expandedType })`.
   */
  navigationSuiteType?: ((sizeClass: WindowSizeClass) => NavigationSuiteType) | undefined;
  /**
   * Where the default rule expands the navigation (a width class or px bound); `null` keeps
   * Compose's own rule (bar / collapsed rail only). Default `'large'` (m3.material.io).
   */
  expandedFrom?: NavigationSuiteTypeOptions['expandedFrom'];
  /** What the expanded navigation is: the expanded wide rail (default) or a drawer. */
  expandedType?: NavigationSuiteTypeOptions['expandedType'];
  /**
   * Hides the navigation (NavigationSuiteScaffoldState); switching it animates on Compose's
   * spring. The content takes the freed space.
   */
  isNavigationHidden?: boolean | undefined;
  /**
   * Primary action (typically a FAB): above a bar, the header of a rail, the first entry of a
   * drawer (Compose `primaryActionContent`).
   */
  primaryAction?: ReactNode;
  /** Where the primary action sits above a bar (Compose `primaryActionContentHorizontalAlignment`). */
  primaryActionAlignment?: 'start' | 'center' | 'end' | undefined;
  /** Called when the window size (or a prop) changes the navigation type. */
  onNavigationSuiteTypeChange?: ((type: NavigationSuiteType) => void) | undefined;
  /** The content (put your `<main>` here when the suite frames the page). */
  children?: ReactNode;
}

/**
 * Navigation suite scaffold (COMPONENT_SPEC §16; Compose `NavigationSuiteScaffold`): one set of
 * destinations shown as the navigation the window size class calls for — a short navigation bar
 * below 600px (horizontal items at compact height), a collapsed wide navigation rail from 600px,
 * the expanded rail from 1200px — beside or above the content. Switching keeps the selection, the
 * item elements (bar ↔ rail; the same `<nav>`, as Compose's `movableContentOf` keeps its items)
 * and keyboard focus. Show / hide animates with m3e-elements' NavigationSuiteLayout (the code
 * `<m3e-navigation-suite>` runs). `aria-label` names the `<nav>`; other props go to the root.
 */
export const NavigationSuiteScaffold = /* @__PURE__ */ forwardRef(function NavigationSuiteScaffold(
  {
    items,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    layoutType,
    navigationSuiteType,
    expandedFrom = NAVIGATION_SUITE_EXPANDED_FROM,
    expandedType,
    isNavigationHidden = false,
    primaryAction,
    primaryActionAlignment = 'end',
    onNavigationSuiteTypeChange,
    children,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...rest
  }: NavigationSuiteScaffoldProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const [selected, select] = useNavigationSelection({
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
  });
  const sizeClass = useWindowSizeClass();
  const type =
    layoutType ??
    (navigationSuiteType
      ? navigationSuiteType(sizeClass)
      : defaultNavigationSuiteType(sizeClass, { expandedFrom, expandedType }));
  const bar = isNavigationBarType(type);
  const rail =
    type === 'wide-navigation-rail-collapsed' || type === 'wide-navigation-rail-expanded';
  const drawer = type === 'navigation-drawer';
  const hasPrimary = primaryAction !== undefined && primaryAction !== null;

  const layoutRef = useRef<NavigationSuiteLayout | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const layout = new NavigationSuiteLayout(el, { navigationHidden: isNavigationHidden });
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // Created once; the hidden state is synced below.
  }, []);
  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    layout.update();
    layout.setNavigationHidden(isNavigationHidden);
  });

  const onTypeChange = useRef(onNavigationSuiteTypeChange);
  onTypeChange.current = onNavigationSuiteTypeChange;
  const previousType = useRef(type);
  useEffect(() => {
    if (previousType.current === type) return;
    previousType.current = type;
    onTypeChange.current?.(type);
  }, [type]);

  const label = { 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy };
  const primary = hasPrimary ? (
    <div key="primary-action" className="m3e-navigation-suite__primary-action">
      {primaryAction}
    </div>
  ) : null;
  let navigation: ReactNode = null;
  if (bar || rail) {
    navigation = (
      <nav
        key="navigation"
        {...label}
        className={
          bar
            ? cx(
                'm3e-short-navigation-bar',
                type === 'short-navigation-bar-medium' && 'm3e-short-navigation-bar--horizontal',
              )
            : cx(
                'm3e-wide-navigation-rail',
                type === 'wide-navigation-rail-expanded' && 'm3e-wide-navigation-rail--expanded',
              )
        }
      >
        {rail && hasPrimary ? (
          <div key="header" className="m3e-wide-navigation-rail__header">
            {primaryAction}
          </div>
        ) : null}
        {items.map((item) => (
          <NavigationItem
            key={item.key}
            item={item}
            isSelected={item.key === selected}
            onSelect={select}
          />
        ))}
      </nav>
    );
  } else if (drawer) {
    navigation = (
      <div key="drawer" className="m3e-navigation-drawer">
        <nav {...label} className="m3e-navigation-drawer__sheet">
          {primary}
          {items.map((item) => (
            <NavigationDrawerItem
              key={item.key}
              item={item}
              isSelected={item.key === selected}
              onSelect={select}
            />
          ))}
        </nav>
      </div>
    );
  }
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'm3e-navigation-suite',
        `m3e-navigation-suite--${bar ? 'bar' : rail ? 'rail' : drawer ? 'drawer' : 'none'}`,
        isNavigationHidden && 'm3e-navigation-suite--navigation-hidden',
        primaryActionAlignment !== 'end' &&
          `m3e-navigation-suite--primary-action-${primaryActionAlignment}`,
        className,
      )}
    >
      {navigation}
      {bar ? primary : null}
      <div key="content" className="m3e-navigation-suite__content">
        {children}
      </div>
    </div>
  );
});
