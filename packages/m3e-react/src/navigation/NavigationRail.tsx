import { type ForwardedRef, type ReactNode, forwardRef } from 'react';
import { cx } from '../utils/cx.js';
import { warnDeprecated } from '../utils/deprecated.js';
import {
  NavigationItem,
  type NavigationSelectionProps,
  useNavigationSelection,
} from './NavigationItem.js';
import type { NavigationNativeProps } from './ShortNavigationBar.js';

/** @deprecated D4: use {@link WideNavigationRailProps} (`<WideNavigationRail>`). Removed in 2.0. */
export interface NavigationRailProps extends NavigationNativeProps, NavigationSelectionProps {
  /** Content above the destinations, e.g. a FAB. */
  header?: ReactNode;
}

/**
 * Legacy navigation rail (Compose `NavigationRail`): 80dp wide, items centered.
 *
 * @deprecated D4: use {@link WideNavigationRail}. Shipped until 2.0; no new features.
 */
export const NavigationRail = /* @__PURE__ */ forwardRef(function NavigationRail(
  {
    items,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    header,
    className,
    ...rest
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- D4: the legacy component's own props
  }: NavigationRailProps,
  ref: ForwardedRef<HTMLElement>,
) {
  warnDeprecated('NavigationRail', 'WideNavigationRail');
  const [selected, select] = useNavigationSelection({
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
  });
  return (
    <nav {...rest} ref={ref} className={cx('m3e-navigation-rail', className)}>
      {header === undefined ? null : <div className="m3e-navigation-rail__header">{header}</div>}
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
});
