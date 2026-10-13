import { type ForwardedRef, type ReactNode, forwardRef } from 'react';
import { cx } from '../utils/cx.js';
import {
  NavigationItem,
  type NavigationSelectionProps,
  useNavigationSelection,
} from './NavigationItem.js';
import type { NavigationNativeProps } from './ShortNavigationBar.js';

export interface WideNavigationRailProps extends NavigationNativeProps, NavigationSelectionProps {
  /** Expanded: icons before labels, the rail as wide as its widest item (220–360dp). */
  isExpanded?: boolean;
  /** Content above the destinations, e.g. a menu button and a FAB. */
  header?: ReactNode;
}

/**
 * Wide navigation rail (COMPONENT_SPEC §14; Compose `WideNavigationRail`), collapsed or expanded.
 * Static in M4: switching `isExpanded` re-lays the rail out without the width animation, and the
 * modal rail comes in M7. Give it an `aria-label`.
 */
export const WideNavigationRail = /* @__PURE__ */ forwardRef(function WideNavigationRail(
  {
    items,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    isExpanded = false,
    header,
    className,
    ...rest
  }: WideNavigationRailProps,
  ref: ForwardedRef<HTMLElement>,
) {
  const [selected, select] = useNavigationSelection({
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
  });
  return (
    <nav
      {...rest}
      ref={ref}
      className={cx(
        'm3e-wide-navigation-rail',
        isExpanded && 'm3e-wide-navigation-rail--expanded',
        className,
      )}
    >
      {header === undefined ? null : (
        <div className="m3e-wide-navigation-rail__header">{header}</div>
      )}
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
