import { type ForwardedRef, type HTMLAttributes, forwardRef } from 'react';
import { cx } from '../utils/cx.js';
import {
  NavigationItem,
  type NavigationSelectionProps,
  useNavigationSelection,
} from './NavigationItem.js';

export type NavigationNativeProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'onChange' | 'defaultValue'
>;

export interface ShortNavigationBarProps extends NavigationNativeProps, NavigationSelectionProps {
  /**
   * `vertical` (default): icons above labels, equal-width items. `horizontal`: icons before labels,
   * items centered (the medium-width configuration).
   */
  layout?: 'vertical' | 'horizontal';
}

/**
 * Short navigation bar (COMPONENT_SPEC §13; Compose `ShortNavigationBar`): a `<nav>` of
 * destinations, the selected one marked `aria-current="page"`. Give it an `aria-label`.
 */
export const ShortNavigationBar = /* @__PURE__ */ forwardRef(function ShortNavigationBar(
  {
    items,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    layout = 'vertical',
    className,
    ...rest
  }: ShortNavigationBarProps,
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
        'm3e-short-navigation-bar',
        layout === 'horizontal' && 'm3e-short-navigation-bar--horizontal',
        className,
      )}
    >
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
