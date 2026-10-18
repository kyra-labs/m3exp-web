// m3e-elements is bundled (a devDependency): the class names <m3e-list> writes.
import { listIdRefs, listItemClassName } from '@kyralabs/m3e-elements/list-layout.js';
import {
  Children,
  type ForwardedRef,
  type ReactNode,
  type RefObject,
  forwardRef,
  isValidElement,
  useMemo,
  useRef,
} from 'react';
import {
  type AriaListBoxOptions,
  ListKeyboardDelegate,
  mergeProps,
  useCollator,
  useHover,
  useId,
  useListBox,
  useLocale,
  useObjectRef,
  useOption,
  usePress,
} from 'react-aria';
import {
  type Key,
  type ListState,
  type Node,
  type Selection,
  type SelectionMode,
  useListState,
} from 'react-stately';
import { useShapeSpring } from '../motion/useShapeSpring.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';
import {
  ListItemControlIndicator,
  ListItemParts,
  type ListItemProps,
  selectionControlSlot,
} from './ListItem.js';

export interface ListProps {
  /** `<ListItem>` / `<SegmentedListItem>` elements (static lists may hold other `<li>`s too). */
  children: ReactNode;
  /**
   * Interactive list selection (React Aria listbox, owner decision M8 #13): `single` (Compose's
   * selectable items) or `multiple` (checkable items). Without it, and without `onAction`, the
   * list is a static `<ul>`.
   */
  selectionMode?: SelectionMode | undefined;
  selectedKeys?: 'all' | Iterable<Key> | undefined;
  defaultSelectedKeys?: 'all' | Iterable<Key> | undefined;
  onSelectionChange?: ((keys: Selection) => void) | undefined;
  disallowEmptySelection?: boolean | undefined;
  disabledKeys?: Iterable<Key> | undefined;
  /** Actionable options (Compose's clickable items): click or Enter. Makes the list interactive. */
  onAction?: ((key: Key) => void) | undefined;
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  'aria-describedby'?: string | undefined;
  id?: string | undefined;
  className?: string | undefined;
}

/** Keys of `<ListItem isDisabled>` elements (react-stately takes disabled keys up front). */
function disabledItemKeys(children: ReactNode, initial?: Iterable<Key>): Set<Key> {
  const out = new Set<Key>(initial);
  Children.forEach(children, (child) => {
    if (!isValidElement<ListItemProps>(child) || !child.props.isDisabled) return;
    const key = child.props.id ?? child.key;
    if (key != null) out.add(key);
  });
  return out;
}

/**
 * React Aria's list keyboard delegate with m3.material.io's keys (Lists › Accessibility):
 * Right moves like Down and Left like Up (mirrored in RTL); useListBox's `shouldFocusWrap` wraps
 * both pairs at the ends, as `<m3e-list>`'s RovingFocus (`both`, `wrap`) does.
 */
class ListNavigationDelegate<T> extends ListKeyboardDelegate<T> {
  constructor(options: ConstructorParameters<typeof ListKeyboardDelegate<T>>[0], rtl: boolean) {
    super(options);
    // The base removes Left / Right from a vertical stack; put them back as Down / Up.
    this.getKeyRightOf = (key) => (rtl ? this.getKeyAbove(key) : this.getKeyBelow(key));
    this.getKeyLeftOf = (key) => (rtl ? this.getKeyBelow(key) : this.getKeyAbove(key));
  }
}

interface OptionProps {
  item: Node<unknown>;
  state: ListState<unknown>;
}

/** One `.m3e-list-item` option (React Aria useOption). */
function ListOption({ item, state }: OptionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const props = item.props as ListItemProps & { segmented?: boolean };
  const {
    optionProps,
    labelProps,
    descriptionProps,
    isSelected,
    isDisabled,
    isPressed,
    isFocusVisible,
  } = useOption({ key: item.key }, state, ref);
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const stateLayer = useStateLayer(ref);
  const { pressProps } = usePress({
    isDisabled,
    onPressStart: stateLayer.onPressStart,
    onPressEnd: stateLayer.onPressEnd,
    ref,
  });
  const dragged = props.isDragged === true;
  useShapeSpring(
    ref,
    {
      shapeVar: { top: '--_m3e-list-item-radius-top', bottom: '--_m3e-list-item-radius-bottom' },
      spring: 'fast-spatial',
    },
    [isHovered, isFocusVisible, isSelected, isPressed, dragged, isDisabled].join('|'),
  );
  const overlineId = useId();
  const has = (node: ReactNode) => node !== undefined && node !== null && node !== false;
  const control = props.selectionControl;
  const controlSlot = control
    ? selectionControlSlot(control, props.selectionControlPosition)
    : undefined;
  const indicator = control ? (
    <ListItemControlIndicator control={control} checked={isSelected} disabled={isDisabled} />
  ) : null;
  const leading = controlSlot === 'leading' ? indicator : props.leadingContent;
  const trailing = controlSlot === 'trailing' ? indicator : props.trailingContent;
  const overline = has(props.overlineContent);
  const supporting = has(props.supportingContent);
  return (
    <div
      {...mergeProps(optionProps, hoverProps, pressProps, stateLayer.stateLayerProps)}
      ref={ref}
      className={cx(
        listItemClassName({
          segmented: props.segmented,
          interactive: true,
          threeLine: props.threeLine,
        }),
        props.className,
      )}
      aria-labelledby={listIdRefs(overline ? overlineId : undefined, labelProps.id)}
      aria-describedby={supporting ? descriptionProps.id : undefined}
      data-spring=""
      data-dragged={dragged ? '' : undefined}
    >
      <ListItemParts
        headline={item.rendered}
        headlineProps={labelProps}
        overlineProps={{ id: overlineId }}
        supportingProps={descriptionProps}
        leadingContent={leading}
        trailingContent={trailing}
        overlineContent={props.overlineContent}
        supportingContent={props.supportingContent}
      />
    </div>
  );
}

type InteractiveListProps = ListProps & { listRef: RefObject<HTMLDivElement | null> };

function InteractiveList(props: InteractiveListProps) {
  const {
    children,
    selectionMode = 'none',
    selectedKeys,
    defaultSelectedKeys,
    onSelectionChange,
    disallowEmptySelection,
    disabledKeys,
    onAction,
    className,
    listRef,
  } = props;
  const state = useListState({
    children: children as never,
    selectionMode,
    disabledKeys: disabledItemKeys(children, disabledKeys),
    ...defined({ selectedKeys, defaultSelectedKeys, onSelectionChange, disallowEmptySelection }),
  });
  const { direction } = useLocale();
  const collator = useCollator({ usage: 'search', sensitivity: 'base' });
  const { collection, disabledKeys: stateDisabledKeys, selectionManager } = state;
  const keyboardDelegate = useMemo(
    () =>
      new ListNavigationDelegate(
        {
          collection,
          ref: listRef,
          collator,
          disabledKeys: stateDisabledKeys,
          disabledBehavior: selectionManager.disabledBehavior,
        },
        direction === 'rtl',
      ),
    [
      collection,
      listRef,
      collator,
      stateDisabledKeys,
      selectionManager.disabledBehavior,
      direction,
    ],
  );
  const options: AriaListBoxOptions<unknown> = {
    shouldFocusWrap: true,
    keyboardDelegate,
    ...defined({
      onAction,
      id: props.id,
      'aria-label': props['aria-label'],
      'aria-labelledby': props['aria-labelledby'],
      'aria-describedby': props['aria-describedby'],
    }),
  };
  const { listBoxProps } = useListBox(options, state, listRef);
  return (
    <div {...listBoxProps} ref={listRef} className={cx('m3e-list', className)}>
      {[...state.collection].map((item) => (
        <ListOption key={item.key} item={item} state={state} />
      ))}
    </div>
  );
}

/**
 * A list (COMPONENT_SPEC §20). Static by default: the m3e-css `<ul class="m3e-list">` of
 * `<ListItem>` / `<SegmentedListItem>` `<li>`s. With `selectionMode` (or `onAction`) it is an
 * interactive list (owner decision M8 #13): React Aria `useListBox` / `useOption` (a listbox
 * of options with `aria-selected`: single and multiple selection, typeahead, Home / End, arrows
 * that wrap; Right / Left move like Down / Up), the DOM `<m3e-list>` renders. Items with a
 * `selectionControl` show their state in an inert checkbox, radio button or switch.
 *
 * Why useListBox and not GridList: every option is one control (Compose's selectable / checkable
 * rows, m3.material.io's listbox); a grid is for rows with several actions, which Compose's
 * nested-control sample (a trailing IconButton) is the only case of and which a listbox cannot
 * hold without nested interactive elements.
 */
export const List = /* @__PURE__ */ forwardRef(function List(
  props: ListProps,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const ref = useObjectRef(forwardedRef);
  if (props.selectionMode === undefined && props.onAction === undefined) {
    const { children, className, id } = props;
    return (
      <ul
        ref={ref as RefObject<HTMLUListElement | null>}
        className={cx('m3e-list', className)}
        {...defined({
          id,
          'aria-label': props['aria-label'],
          'aria-labelledby': props['aria-labelledby'],
          'aria-describedby': props['aria-describedby'],
        })}
      >
        {children}
      </ul>
    );
  }
  return <InteractiveList {...props} listRef={ref as RefObject<HTMLDivElement | null>} />;
});
