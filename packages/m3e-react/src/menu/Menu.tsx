import { MenuPopup } from '@kyralabs/m3e-elements/menu-popup.js';
import type { MenuAnchorPosition } from '@kyralabs/m3e-motion';
import {
  Children,
  type ForwardedRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  forwardRef,
  isValidElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  chain,
  mergeProps,
  mergeRefs,
  useMenu,
  useMenuItem,
  useLocale,
  useMenuSection,
  useObjectRef,
  useSubmenuTrigger,
} from 'react-aria';
import {
  type Key,
  type Node,
  type RootMenuTriggerState,
  type Selection,
  type SelectionMode,
  type TreeState,
  useMenuTriggerState,
  useSubmenuTriggerState,
  useTreeState,
} from 'react-stately';
import { Icon } from '../icon/Icon.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';
import { MenuPopupContext, type MenuPopupContextValue } from './context.js';

export type MenuVariant = 'standard' | 'vibrant' | 'baseline';

export interface MenuItemProps {
  /** Unique within the menu (React Aria key). Defaults to the element's React `key`. */
  id?: Key;
  /** The label. */
  children: ReactNode;
  /** Typeahead text when `children` is not a plain string. */
  textValue?: string;
  'aria-label'?: string;
  /** Leading icon: a Material Symbols name or an `<Icon>`. */
  icon?: string | ReactElement;
  /**
   * Leading icon while checked (selectable menus). Without `icon`, the slot expands in when the
   * item is checked and collapses when it is not (Compose's AnimatedVisibility).
   */
  checkedIcon?: string | ReactElement;
  /** Second line (bodyMedium). */
  supportingText?: ReactNode;
  /** Trailing icon: a Material Symbols name or an `<Icon>`. */
  trailingIcon?: string | ReactElement;
  /** Trailing text, e.g. a keyboard shortcut (announced as the item's description). */
  trailingText?: ReactNode;
  isDisabled?: boolean;
  /** Called when this item is activated (in addition to the menu's `onAction`). */
  onAction?: () => void;
  /** A nested `<Menu>`: the item opens it (hover, press, ArrowRight / ArrowLeft in RTL). */
  submenu?: ReactElement;
}

export interface MenuSectionProps {
  id?: Key;
  /** Group label (MenuDefaults.DropdownMenuGroupLabel). Without it, pass `aria-label`. */
  title?: ReactNode;
  'aria-label'?: string;
  /** Draws a divider under the label (MenuDefaults.HorizontalDividerPadding). */
  divider?: boolean;
  children: ReactNode;
}

interface PartialNode {
  type: string;
  key?: Key;
  props?: unknown;
  rendered?: ReactNode;
  textValue?: string;
  'aria-label'?: string | undefined;
  hasChildNodes?: boolean;
  element?: ReactElement;
  childNodes?: () => Generator<PartialNode>;
}

function* itemNode(props: MenuItemProps): Generator<PartialNode> {
  const rendered = props.children;
  yield {
    type: 'item',
    props,
    rendered,
    textValue:
      props.textValue ?? (typeof rendered === 'string' ? rendered : (props['aria-label'] ?? '')),
    'aria-label': props['aria-label'],
    hasChildNodes: false,
    ...(props.id != null ? { key: props.id } : {}),
  };
}

function* sectionNode(props: MenuSectionProps): Generator<PartialNode> {
  yield {
    type: 'section',
    props,
    rendered: props.title,
    'aria-label': props['aria-label'],
    hasChildNodes: true,
    ...(props.id != null ? { key: props.id } : {}),
    *childNodes() {
      const children: ReactElement[] = [];
      Children.forEach(props.children, (child) => {
        if (isValidElement(child)) children.push(child);
      });
      for (const element of children) yield { type: 'item', element };
    },
  };
}

/** A menu item: an action, or checkable/selectable when the menu has a `selectionMode`. */
export const MenuItem = /* @__PURE__ */ Object.assign(
  // Collection element (react-stately): rendered by <Menu>, never on its own.
  function MenuItem(_props: MenuItemProps): ReactElement | null {
    return null;
  },
  { getCollectionNode: itemNode },
);

/** A group of items (Compose DropdownMenuGroup): its own surface, separated by a gap. */
export const MenuSection = /* @__PURE__ */ Object.assign(
  function MenuSection(_props: MenuSectionProps): ReactElement | null {
    return null;
  },
  { getCollectionNode: sectionNode },
);

export interface MenuProps {
  /** `<MenuItem>` and `<MenuSection>` elements. */
  children: ReactNode;
  /** Color and layout. Default `standard`. */
  variant?: MenuVariant;
  /** Called with the item's key when an item is activated. */
  onAction?: (key: Key) => void;
  /** `single`: items are radios (menuitemradio); `multiple`: checkboxes (menuitemcheckbox). */
  selectionMode?: SelectionMode;
  selectedKeys?: 'all' | Iterable<Key>;
  defaultSelectedKeys?: 'all' | Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  /** Keep at least one item selected. */
  disallowEmptySelection?: boolean;
  disabledKeys?: Iterable<Key>;
  /** Overrides the trigger's placement for this menu. */
  position?: MenuAnchorPosition;
  /** DpOffset in px (x mirrored in RTL). */
  offset?: { x: number; y: number };
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  id?: string;
}

/** Keys of `<MenuItem isDisabled>` elements (react-stately takes disabled keys up front). */
function disabledItemKeys(children: ReactNode, out: Set<Key>): Set<Key> {
  Children.forEach(children, (child) => {
    if (!isValidElement<MenuItemProps & MenuSectionProps>(child)) return;
    if (child.type === MenuSection) disabledItemKeys(child.props.children, out);
    else if (child.props.isDisabled) {
      const key = child.props.id ?? child.key;
      if (key != null) out.add(key);
    }
  });
  return out;
}

const iconElement = (icon: string | ReactElement | undefined): ReactNode =>
  typeof icon === 'string' ? <Icon name={icon} /> : icon;

interface ItemViewProps {
  node: Node<unknown>;
  state: TreeState<unknown>;
  menuRef: RefObject<HTMLDivElement | null>;
  rootState: RootMenuTriggerState;
  popupRef: RefObject<MenuPopup | null>;
}

type SubmenuTriggerProps = ReturnType<typeof useSubmenuTrigger>['submenuTriggerProps'];

/** The `.m3e-menu__item` contract for one collection node. */
function ItemContent({
  node,
  state,
  itemRef,
  trigger,
}: {
  node: Node<unknown>;
  state: TreeState<unknown>;
  itemRef: RefObject<HTMLDivElement | null>;
  trigger: SubmenuTriggerProps | null;
}): ReactNode {
  const props = node.props as MenuItemProps;
  const stateLayer = useStateLayer();
  const {
    menuItemProps,
    labelProps,
    descriptionProps,
    keyboardShortcutProps,
    isSelected,
    isPressed,
  } = useMenuItem(
    {
      key: node.key,
      ...defined({ 'aria-label': node['aria-label'] }),
      ...(trigger
        ? {
            id: trigger.id,
            'aria-haspopup': trigger['aria-haspopup'],
            'aria-expanded': trigger['aria-expanded'],
            ...defined({ 'aria-controls': trigger['aria-controls'] }),
            onKeyDown: trigger.onKeyDown,
            onKeyUp: trigger.onKeyUp,
            onHoverChange: trigger.onHoverChange,
            onPress: trigger.onPress,
          }
        : {}),
      onPressStart: chain(stateLayer.onPressStart, trigger?.onPressStart),
      onPressEnd: stateLayer.onPressEnd,
    },
    state,
    itemRef,
  );
  const checked = state.selectionManager.selectionMode !== 'none' && isSelected;
  const toggle = props.icon === undefined && props.checkedIcon !== undefined;
  const leading =
    checked && props.checkedIcon !== undefined
      ? props.checkedIcon
      : (props.icon ?? props.checkedIcon);
  const trailing = props.trailingText ?? iconElement(props.trailingIcon);
  return (
    <div
      {...mergeProps(menuItemProps, stateLayer.stateLayerProps, {
        className: 'm3e-menu__item',
        'data-pressed': isPressed ? '' : undefined,
      })}
      ref={itemRef}
    >
      {leading !== undefined ? (
        <span className={cx('m3e-menu__item-leading', toggle && 'm3e-menu__item-leading--toggle')}>
          {iconElement(leading)}
        </span>
      ) : null}
      <span className="m3e-menu__item-text">
        <span className="m3e-menu__item-label" {...labelProps}>
          {node.rendered}
        </span>
        {props.supportingText != null ? (
          <span className="m3e-menu__item-supporting" {...descriptionProps}>
            {props.supportingText}
          </span>
        ) : null}
      </span>
      {trailing != null ? (
        <span
          className="m3e-menu__item-trailing"
          {...(props.trailingText != null ? keyboardShortcutProps : {})}
        >
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

function ItemView(props: ItemViewProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  if ((props.node.props as MenuItemProps).submenu !== undefined) return <SubmenuItem {...props} />;
  return <ItemContent node={props.node} state={props.state} itemRef={ref} trigger={null} />;
}

/** An item that opens a nested `<Menu>` (React Aria useSubmenuTrigger). */
function SubmenuItem({ node, state, menuRef, rootState, popupRef }: ItemViewProps): ReactNode {
  const props = node.props as MenuItemProps;
  const ref = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const submenuState = useSubmenuTriggerState({ triggerKey: node.key }, rootState);
  const { submenuTriggerProps, submenuProps } = useSubmenuTrigger(
    { parentMenuRef: menuRef, submenuRef },
    submenuState,
    ref,
  );
  const context = useMemo<MenuPopupContextValue>(
    () => ({
      isOpen: submenuState.isOpen,
      focusStrategy:
        submenuState.focusStrategy === 'first' || submenuState.focusStrategy === 'last'
          ? submenuState.focusStrategy
          : null,
      close: submenuState.close,
      closeAll: submenuState.closeAll,
      rootState,
      anchorRef: ref,
      menuId: submenuProps.id ?? '',
      labelledBy: submenuProps['aria-labelledby'] ?? '',
      position: 'end',
      parentPopup: popupRef,
      submenuRef,
      onKeyDown: submenuProps.onKeyDown as ((e: ReactKeyboardEvent) => void) | undefined,
      onKeyUp: submenuProps.onKeyUp as ((e: ReactKeyboardEvent) => void) | undefined,
    }),
    [submenuState, rootState, submenuProps, popupRef],
  );
  return (
    <>
      <ItemContent node={node} state={state} itemRef={ref} trigger={submenuTriggerProps} />
      {/* Outside the parent menu's DOM, so its keyboard handling ignores the submenu's keys. */}
      {createPortal(
        <MenuPopupContext.Provider value={context}>{props.submenu}</MenuPopupContext.Provider>,
        menuRef.current?.ownerDocument.body ?? document.body,
      )}
    </>
  );
}

function SectionView({ node, children }: { node: Node<unknown>; children: ReactNode }): ReactNode {
  const props = node.props as MenuSectionProps;
  const { headingProps, groupProps } = useMenuSection({
    heading: node.rendered,
    ...defined({ 'aria-label': node['aria-label'] }),
  });
  return (
    <div {...groupProps} className="m3e-menu__group" {...useGroupHover()}>
      {node.rendered != null ? (
        <div {...headingProps} className="m3e-menu__label">
          {node.rendered}
        </div>
      ) : null}
      {props.divider ? <div className="m3e-menu__divider" role="separator" /> : null}
      {children}
    </div>
  );
}

/** `data-hovered` once the pointer entered (Compose `hasBeenHovered`): the inactive shape after. */
function useGroupHover(): { onPointerEnter: () => void; 'data-hovered'?: '' } {
  const [hovered, setHovered] = useState(false);
  return {
    onPointerEnter: () => {
      setHovered(true);
    },
    ...(hovered ? { 'data-hovered': '' as const } : {}),
  };
}

interface MenuListProps extends MenuProps {
  popup: MenuPopupContextValue | null;
  rootState: RootMenuTriggerState;
  popupRef: RefObject<MenuPopup | null>;
  isPopup: boolean;
}

const MenuList = /* @__PURE__ */ forwardRef(function MenuList(
  {
    children,
    variant = 'standard',
    onAction,
    selectionMode = 'none',
    selectedKeys,
    defaultSelectedKeys,
    onSelectionChange,
    disallowEmptySelection,
    disabledKeys,
    className,
    id,
    popup,
    rootState,
    popupRef,
    isPopup,
    position: _position,
    offset: _offset,
    ...aria
  }: MenuListProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const { direction } = useLocale();
  const disabled = useMemo(
    () => disabledItemKeys(children, new Set(disabledKeys ?? [])),
    [children, disabledKeys],
  );
  const state = useTreeState({
    children: children as never,
    selectionMode,
    disabledKeys: disabled,
    ...defined({ selectedKeys, defaultSelectedKeys, onSelectionChange, disallowEmptySelection }),
  });
  const labelled = aria['aria-label'] !== undefined || aria['aria-labelledby'] !== undefined;
  const { menuProps } = useMenu(
    {
      ...aria,
      ...(popup && !labelled ? { 'aria-labelledby': popup.labelledBy } : {}),
      ...defined({ onAction }),
      ...(popup ? { onClose: popup.closeAll } : {}),
      autoFocus: popup ? (popup.focusStrategy ?? true) : false,
      shouldFocusWrap: true,
      escapeKeyBehavior: 'none',
      onKeyDown: (e) => {
        // Raw React events (useMenu merges these before its own handlers).
        const event = e as unknown as ReactKeyboardEvent;
        popup?.onKeyDown?.(event);
        if (!popup || event.isPropagationStopped()) return;
        if (popup.submenuRef) {
          // Escape and ArrowLeft (ArrowRight in RTL) close the submenu, back to its item.
          const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
          if (event.key === 'Escape' || event.key === back) {
            event.preventDefault();
            event.stopPropagation();
            popup.close();
            popup.anchorRef.current?.focus({ preventScroll: true });
          }
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          popup.close();
          popup.anchorRef.current?.focus({ preventScroll: true });
        }
      },
      ...(popup?.onKeyUp ? { onKeyUp: popup.onKeyUp as never } : {}),
    },
    state,
    ref,
  );

  const renderNodes = (nodes: Iterable<Node<unknown>>): ReactNode[] =>
    [...nodes].map((node) =>
      node.type === 'section' ? (
        <SectionView key={node.key} node={node}>
          {renderNodes(
            // TreeCollection has no getChildren(); a section's items are its childNodes.
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            state.collection.getChildren?.(node.key) ?? node.childNodes,
          )}
        </SectionView>
      ) : (
        <ItemView
          key={node.key}
          node={node}
          state={state}
          menuRef={ref}
          rootState={rootState}
          popupRef={popupRef}
        />
      ),
    );
  const groupHover = useGroupHover();
  const hasSections = [...state.collection].some((n) => n.type === 'section');

  // Tab leaves the menu: close the chain and focus the root trigger, so Tab moves on from it.
  // Capture phase, so React Aria's own Tab handling (focus the last item) never runs.
  const onKeyDownCapture = (e: ReactKeyboardEvent) => {
    if (!popup || e.key !== 'Tab') return;
    e.stopPropagation();
    popup.rootState.close();
    rootAnchor(popup)?.focus({ preventScroll: true });
  };

  return (
    <div
      {...mergeProps(menuProps, hasSections || variant === 'baseline' ? {} : groupHover, {
        onKeyDownCapture,
      })}
      {...(popup ? { id: popup.menuId } : defined({ id }))}
      {...(isPopup ? { popover: 'manual' } : {})}
      className={cx(
        'm3e-menu',
        variant === 'vibrant' && 'm3e-menu--vibrant',
        variant === 'baseline' && 'm3e-menu--baseline',
        className,
      )}
      ref={popup?.submenuRef ? mergeRefs(ref, popup.submenuRef) : ref}
    >
      {renderNodes(state.collection)}
    </div>
  );
});

function rootAnchor(popup: MenuPopupContextValue): HTMLElement | null {
  // A submenu's anchor is an item; the root trigger is the anchor of the outermost popup.
  let el: HTMLElement | null = popup.anchorRef.current;
  for (
    let menu = el?.closest<HTMLElement>('.m3e-menu');
    el && menu;
    menu = el.closest<HTMLElement>('.m3e-menu')
  ) {
    const trigger = menu.id
      ? menu.ownerDocument.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(menu.id)}"]`)
      : null;
    if (!trigger) break;
    el = trigger;
  }
  return el;
}

/**
 * Menu (COMPONENT_SPEC §21): the expressive vertical menu (`standard` or `vibrant` colors; sections
 * become separate groups, "segmented") or Compose's `baseline` DropdownMenu. Inside a
 * `<MenuTrigger>` (or as a `<MenuItem submenu>`) it is a popover placed by Compose's
 * DropdownMenuPositionProvider and opened/closed with interruptible springs (m3e-elements
 * `MenuPopup`); on its own it renders inline. React Aria `useMenu` provides the APG keyboard
 * model and typeahead; `selectionMode` makes items checkable (`multiple`) or selectable
 * (`single`).
 */
export const Menu = /* @__PURE__ */ forwardRef(function Menu(
  props: MenuProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const popup = useContext(MenuPopupContext);
  const fallbackRoot = useMenuTriggerState({});
  const ref = useObjectRef(forwardedRef);
  const popupRef = useRef<MenuPopup | null>(null);
  const isOpen = popup?.isOpen ?? false;
  const [mounted, setMounted] = useState(isOpen);
  if (isOpen && !mounted) setMounted(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!popup || !el) return;
    const instance = (popupRef.current ??= new MenuPopup(el, popup.parentPopup?.current ?? null));
    const anchor = popup.anchorRef.current;
    if (isOpen && anchor) {
      instance.open({
        anchor,
        position: props.position ?? popup.position,
        offset: props.offset,
        // Submenus close with their root (useSubmenuTrigger handles their own dismissal).
        onDismiss: popup.parentPopup ? undefined : popup.close,
      });
    } else if (!isOpen) {
      if (el.contains(el.ownerDocument.activeElement) && !popup.parentPopup) {
        anchor?.focus({ preventScroll: true });
      }
      instance.close(() => {
        setMounted(false);
      });
    }
  });

  useLayoutEffect(
    () => () => {
      popupRef.current?.destroy();
      popupRef.current = null;
    },
    [],
  );

  if (!popup) {
    return (
      <MenuList
        {...props}
        ref={ref}
        popup={null}
        rootState={fallbackRoot}
        popupRef={popupRef}
        isPopup={false}
      />
    );
  }
  if (!mounted) return null;
  return (
    <MenuList
      {...props}
      ref={ref}
      popup={popup}
      rootState={popup.rootState}
      popupRef={popupRef}
      isPopup
    />
  );
});
