import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useState,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';
import { type NavigationSelectionProps, useNavigationSelection } from './NavigationItem.js';
import { RailContent, useWideNavigationRailLayout } from './WideNavigationRail.js';

export interface ModalWideNavigationRailProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'defaultValue'>,
    NavigationSelectionProps {
  /** Expanded: the rail opens as a modal window over the page (controlled). */
  isExpanded?: boolean;
  /** The initial expanded state (uncontrolled). */
  defaultExpanded?: boolean;
  /**
   * Called when the rail asks to change state: Escape or a press on the scrim collapse it
   * (WideNavigationRailState.collapse()). Controlled rails stay open until `isExpanded` follows.
   */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Show nothing while collapsed and slide the expanded rail in from the start edge (Compose
   * `hideOnCollapse`); by default the collapsed rail stays in the layout.
   */
  hideOnCollapse?: boolean;
  /** Content above the destinations, e.g. a menu button and a FAB. */
  header?: ReactNode;
  /** The modal window's accessible name (default "Navigation rail", Compose's pane title). */
  dialogLabel?: string;
}

/**
 * Modal wide navigation rail (COMPONENT_SPEC §14; Compose `ModalWideNavigationRail`). Collapsed it
 * is a collapsed `<WideNavigationRail>`; expanded it opens as a modal window above a scrim
 * (`dialog` semantics, focus trapped, Escape or the scrim collapse it, focus returns to the
 * opener), animated on Compose's springs by m3e-elements' WideNavigationRailLayout, the code
 * `<m3e-modal-wide-navigation-rail>` runs. `aria-label` names the `<nav>`; other props go to the
 * root.
 */
export const ModalWideNavigationRail = /* @__PURE__ */ forwardRef(function ModalWideNavigationRail(
  {
    items,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
    isExpanded: expandedProp,
    defaultExpanded = false,
    onExpandedChange,
    hideOnCollapse = false,
    header,
    dialogLabel,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...rest
  }: ModalWideNavigationRailProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const [selected, select] = useNavigationSelection({
    selectedKey,
    defaultSelectedKey,
    onSelectionChange,
  });
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded);
  const expanded = expandedProp ?? uncontrolled;
  useWideNavigationRailLayout(
    ref,
    expanded,
    {
      onExpandedChange: (next) => {
        if (expandedProp === undefined) setUncontrolled(next);
        onExpandedChange?.(next);
      },
      ...(dialogLabel === undefined ? {} : { dialogLabel }),
    },
    hideOnCollapse,
  );
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'm3e-modal-wide-navigation-rail',
        hideOnCollapse && 'm3e-modal-wide-navigation-rail--hide-on-collapse',
        className,
      )}
    >
      <nav
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cx(
          'm3e-wide-navigation-rail',
          (hideOnCollapse || expanded) && 'm3e-wide-navigation-rail--expanded',
        )}
      >
        <RailContent header={header} items={items} selected={selected} select={select} />
      </nav>
      <div className="m3e-modal-wide-navigation-rail__scrim" aria-hidden="true" />
    </div>
  );
});
