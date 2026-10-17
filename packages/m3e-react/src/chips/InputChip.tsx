import {
  Children,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  forwardRef,
  isValidElement,
  useRef,
} from 'react';
import { mergeProps, useButton, useObjectRef, usePress, useTag, useTagGroup } from 'react-aria';
import {
  type Key,
  type ListState,
  type Node,
  type Selection,
  type SelectionMode,
  useListState,
} from 'react-stately';
import { Icon } from '../icon/Icon.js';
import { useShapeSpring } from '../motion/useShapeSpring.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';

export interface InputChipProps {
  /** The chip's key (else the element's `key`). */
  id?: Key;
  /** The label. */
  children?: ReactNode;
  /** The chip's text for accessibility and typeahead, when `children` is not a string. */
  textValue?: string | undefined;
  /**
   * The avatar before the label (Compose's `avatar`, InputChipTokens 24dp, clipped round): an
   * image URL, or content (initials, an `<Icon>`). It takes precedence over `leadingIcon`.
   */
  avatar?: string | ReactElement | undefined;
  /** Icon before the label, e.g. `<Icon name="mail" />`. */
  leadingIcon?: ReactNode;
  isDisabled?: boolean | undefined;
  'aria-label'?: string | undefined;
}

interface PartialNode {
  type: string;
  key?: Key;
  props?: unknown;
  rendered?: ReactNode;
  textValue?: string;
  'aria-label'?: string | undefined;
  hasChildNodes?: boolean;
}

function* itemNode(props: InputChipProps): Generator<PartialNode> {
  const rendered = props.children;
  // `id` is the key only: useTag passes the item's DOM props to the row, whose id it sets itself.
  const domSafe: InputChipProps = { ...props };
  delete domSafe.id;
  yield {
    type: 'item',
    props: domSafe,
    rendered,
    textValue:
      props.textValue ?? (typeof rendered === 'string' ? rendered : (props['aria-label'] ?? '')),
    'aria-label': props['aria-label'],
    hasChildNodes: false,
    ...(props.id != null ? { key: props.id } : {}),
  };
}

/** An input chip: a row of an `<InputChipGroup>` (a collection element, never rendered alone). */
export const InputChip = /* @__PURE__ */ Object.assign(
  function InputChip(_props: InputChipProps): ReactElement | null {
    return null;
  },
  { getCollectionNode: itemNode },
);

export interface InputChipGroupProps {
  /** `<InputChip>` elements. */
  children: ReactNode;
  /**
   * Called with the keys to remove: Backspace or Delete on a focused chip (its selected chips
   * when it is selected), or its remove button. Without it the chips have no remove button.
   */
  onRemove?: (keys: Set<Key>) => void;
  /** The ChipsTokens morph, tonal colors and compact spacing (see `<FilterChip isExpressive>`). */
  isExpressive?: boolean;
  /** One scrolling row instead of wrapping lines. */
  singleLine?: boolean;
  /** Selectable chips (Compose InputChip `selected`): `aria-selected` rows. Default `none`. */
  selectionMode?: SelectionMode;
  selectedKeys?: 'all' | Iterable<Key>;
  defaultSelectedKeys?: 'all' | Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  disallowEmptySelection?: boolean;
  disabledKeys?: Iterable<Key>;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
  id?: string;
}

/** Keys of `<InputChip isDisabled>` elements (react-stately takes disabled keys up front). */
function disabledChipKeys(children: ReactNode, initial?: Iterable<Key>): Set<Key> {
  const out = new Set<Key>(initial);
  Children.forEach(children, (child) => {
    if (!isValidElement<InputChipProps>(child) || !child.props.isDisabled) return;
    const key = child.props.id ?? child.key;
    if (key != null) out.add(key);
  });
  return out;
}

/** Classes for an input chip row (the m3e-css contract). */
export const inputChipClassName = (isExpressive = false, className?: string): string =>
  cx('m3e-input-chip', isExpressive && 'm3e-input-chip--expressive', className);

interface RowProps {
  item: Node<unknown>;
  state: ListState<unknown>;
  isExpressive: boolean;
}

/** One `.m3e-input-chip` row. */
function InputChipRow({ item, state, isExpressive }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const { rowProps, gridCellProps, removeButtonProps, allowsRemoving, isPressed } = useTag(
    { item },
    state,
    ref,
  );
  const stateLayer = useStateLayer(ref);
  const { pressProps } = usePress({
    isDisabled: state.disabledKeys.has(item.key),
    onPressStart: stateLayer.onPressStart,
    onPressEnd: stateLayer.onPressEnd,
    ref,
  });
  const { buttonProps } = useButton(
    { ...removeButtonProps, excludeFromTabOrder: true, preventFocusOnPress: true },
    removeRef,
  );
  useShapeSpring(
    ref,
    { shapeVar: '--_m3e-chip-shape', spring: 'fast-spatial', enabled: isExpressive },
    `${String(isPressed)}|${String(state.selectionManager.isSelected(item.key))}`,
  );
  const props = item.props as InputChipProps;
  const avatar =
    typeof props.avatar === 'string' ? (
      <img className="m3e-input-chip__avatar" src={props.avatar} alt="" />
    ) : props.avatar ? (
      <span className="m3e-input-chip__avatar">{props.avatar}</span>
    ) : null;
  return (
    <div
      {...mergeProps(rowProps, pressProps, stateLayer.stateLayerProps)}
      ref={ref}
      className={inputChipClassName(isExpressive)}
      data-spring={isExpressive ? '' : undefined}
    >
      <div {...gridCellProps} className="m3e-input-chip__cell">
        {avatar ?? props.leadingIcon}
        <span className="m3e-input-chip__label">{item.rendered}</span>
        {allowsRemoving ? (
          <button {...buttonProps} ref={removeRef} className="m3e-input-chip__remove">
            <Icon name="close" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Input chips (COMPONENT_SPEC §18; Compose InputChip): React Aria `useTagGroup` / `useTag` on the
 * m3e-css `.m3e-chip-set` grid of `.m3e-input-chip` rows (owner decision M8 #10), the DOM
 * `<m3e-chip-set>` renders. Arrow keys move between the chips (React Aria wraps at the ends),
 * Backspace or Delete calls `onRemove` for the focused chip, and each chip's remove button
 * (Material Symbols `close`, labelled "Remove <label>") does too.
 */
export const InputChipGroup = /* @__PURE__ */ forwardRef(function InputChipGroup(
  props: InputChipGroupProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    children,
    isExpressive = false,
    singleLine = false,
    className,
    disabledKeys,
    onRemove,
    selectionMode = 'none',
    selectedKeys,
    defaultSelectedKeys,
    onSelectionChange,
    disallowEmptySelection,
    id,
  } = props;
  const ref = useObjectRef(forwardedRef);
  const state = useListState({
    children: children as never,
    selectionMode,
    disabledKeys: disabledChipKeys(children, disabledKeys),
    ...defined({ selectedKeys, defaultSelectedKeys, onSelectionChange, disallowEmptySelection }),
  });
  const { gridProps } = useTagGroup(
    {
      ...defined({
        onRemove,
        id,
        'aria-label': props['aria-label'],
        'aria-labelledby': props['aria-labelledby'],
        'aria-describedby': props['aria-describedby'],
      }),
    },
    state,
    ref,
  );
  return (
    <div
      {...gridProps}
      ref={ref}
      className={cx('m3e-chip-set', singleLine && 'm3e-chip-set--single-line', className)}
    >
      {[...state.collection].map((item) => (
        <InputChipRow key={item.key} item={item} state={state} isExpressive={isExpressive} />
      ))}
    </div>
  );
});
