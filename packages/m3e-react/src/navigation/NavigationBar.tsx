import { type ForwardedRef, forwardRef } from 'react';
import { cx } from '../utils/cx.js';
import { warnDeprecated } from '../utils/deprecated.js';
import {
  NavigationItem,
  type NavigationSelectionProps,
  useNavigationSelection,
} from './NavigationItem.js';
import type { NavigationNativeProps } from './ShortNavigationBar.js';

/** @deprecated D4: use {@link ShortNavigationBarProps} (`<ShortNavigationBar>`). Removed in 2.0. */
export interface NavigationBarProps extends NavigationNativeProps, NavigationSelectionProps {}

/**
 * Legacy navigation bar (Compose `NavigationBar`): 80dp tall, labels always shown.
 *
 * @deprecated D4: use {@link ShortNavigationBar}. Shipped until 2.0; no new features.
 */
export const NavigationBar = /* @__PURE__ */ forwardRef(function NavigationBar(
  {
    items,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    className,
    ...rest
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- D4: the legacy component's own props
  }: NavigationBarProps,
  ref: ForwardedRef<HTMLElement>,
) {
  warnDeprecated('NavigationBar', 'ShortNavigationBar');
  const [selected, select] = useNavigationSelection({
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
  });
  return (
    <nav {...rest} ref={ref} className={cx('m3e-navigation-bar', className)}>
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
