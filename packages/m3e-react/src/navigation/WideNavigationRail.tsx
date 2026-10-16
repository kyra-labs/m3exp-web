import { WideNavigationRailLayout } from '@kyralabs/m3e-elements/wide-navigation-rail-layout.js';
import {
  type ForwardedRef,
  type ReactNode,
  type RefObject,
  forwardRef,
  useLayoutEffect,
  useRef,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';
import {
  NavigationItem,
  type NavigationSelectionProps,
  useNavigationSelection,
} from './NavigationItem.js';
import type { NavigationNativeProps } from './ShortNavigationBar.js';

export interface WideNavigationRailProps extends NavigationNativeProps, NavigationSelectionProps {
  /**
   * Expanded: icons before labels, the rail as wide as its widest item (220–360dp). Switching it
   * animates the rail on Compose's springs (WideNavigationRailState.expand / collapse).
   */
  isExpanded?: boolean;
  /** Content above the destinations, e.g. a menu button and a FAB. */
  header?: ReactNode;
}

/** The header slot and the destinations, shared with the modal rail. */
export function RailContent({
  header,
  items,
  selected,
  select,
}: {
  header: ReactNode;
  items: NavigationSelectionProps['items'];
  selected: string | null;
  select: (key: string) => void;
}): ReactNode {
  return (
    <>
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
    </>
  );
}

/**
 * Runs m3e-elements' WideNavigationRailLayout (the code `<m3e-wide-navigation-rail>` and
 * `<m3e-modal-wide-navigation-rail>` run) on `root` and animates it to `expanded`.
 */
export function useWideNavigationRailLayout(
  root: RefObject<HTMLElement | null>,
  expanded: boolean,
  options: { onExpandedChange?: (expanded: boolean) => void; dialogLabel?: string } = {},
  resetKey?: unknown,
): void {
  const layoutRef = useRef<WideNavigationRailLayout | null>(null);
  const handlers = useRef(options);
  handlers.current = options;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const layout = new WideNavigationRailLayout(el, {
      expanded,
      onExpandedChange: (next) => handlers.current.onExpandedChange?.(next),
      ...(options.dialogLabel === undefined ? {} : { dialogLabel: options.dialogLabel }),
    });
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // Created once per variant (resetKey); `expanded` is synced below.
  }, [resetKey]);
  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    layout.update();
    layout.setExpanded(expanded);
  });
}

/**
 * Wide navigation rail (COMPONENT_SPEC §14; Compose `WideNavigationRail`), collapsed or expanded.
 * Switching `isExpanded` animates width, items and labels on Compose's springs with
 * m3e-elements' WideNavigationRailLayout (one layout per frame, interruptible). For the modal
 * rail, see `<ModalWideNavigationRail>`. Give it an `aria-label`.
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
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const [selected, select] = useNavigationSelection({
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
  });
  useWideNavigationRailLayout(ref, isExpanded);
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
      <RailContent header={header} items={items} selected={selected} select={select} />
    </nav>
  );
});
