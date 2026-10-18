/* eslint-disable @typescript-eslint/no-deprecated -- the D4 legacy overload is implemented here */
// m3e-elements is bundled (a devDependency); the class names and indicator markup are the ones
// <m3e-list> writes.
import {
  type ListControlNode,
  type ListItemControl,
  listControlTree,
  listItemClassName,
} from '@kyralabs/m3e-elements/list-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  createElement,
  forwardRef,
} from 'react';
import type { Key } from 'react-stately';
import { cx } from '../utils/cx.js';
import { warnDeprecated } from '../utils/deprecated.js';

export type { ListItemControl };

/** The slots every list item has (Compose's leading / trailing / overline / supporting content). */
export interface ListItemSlots {
  /** Before the text: an `<Icon>`, an avatar, an image (`.m3e-list-item__avatar` / `__image`). */
  leadingContent?: ReactNode;
  /** After the text: an `<Icon>`, trailing supporting text, a control in a static list. */
  trailingContent?: ReactNode;
  /** Above the headline (label small). */
  overlineContent?: ReactNode;
  /** Below the headline (body medium). */
  supportingContent?: ReactNode;
  /**
   * Three-line layout (88dp, slots at the top) for multi-line supporting text, which Compose
   * measures and CSS cannot (an overline with supporting text is three-line already).
   */
  threeLine?: boolean | undefined;
}

type ItemDOMProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'id' | 'role'>;

export interface ListItemProps extends ListItemSlots, ItemDOMProps {
  /** The item's key in an interactive `<List>` (else the element's `key`). */
  id?: Key;
  /** The headline (Compose's `content`). */
  children?: ReactNode;
  /** The item's text for typeahead, when `children` is not a string. */
  textValue?: string | undefined;
  /** Disabled: translucent content; in an interactive list it cannot be focused or selected. */
  isDisabled?: boolean | undefined;
  /** The dragged style (ReorderListTokens; owner decision M8 #14): style only, no drag logic. */
  isDragged?: boolean | undefined;
  /**
   * A checkbox, radio button or switch that shows the option's selected state in an interactive
   * list (Compose's samples: `onClick = null`). The option is the control; the indicator is inert.
   */
  selectionControl?: ListItemControl | undefined;
  /** The slot the selection control takes. Default `leading` (checkbox, radio), `trailing` (switch). */
  selectionControlPosition?: 'leading' | 'trailing' | undefined;
}

/**
 * The legacy, non-expressive list item (Compose's `ListItem(headlineContent, …)`, deprecated
 * upstream): CornerNone, 8 / 12dp vertical padding, 16dp slot spacing, no states.
 *
 * @deprecated D4: use `<ListItem>` with the headline as its children. Shipped until 2.0; no new
 * features.
 */
export interface BaselineListItemProps extends ListItemSlots, ItemDOMProps {
  /** The headline. */
  headlineContent: ReactNode;
}

/** The parts of an item, shared by the static item and the interactive option. */
export interface ListItemPartsProps extends ListItemSlots {
  headline: ReactNode;
  headlineProps?: HTMLAttributes<HTMLElement> | undefined;
  overlineProps?: HTMLAttributes<HTMLElement> | undefined;
  supportingProps?: HTMLAttributes<HTMLElement> | undefined;
}

const has = (node: ReactNode) => node !== undefined && node !== null && node !== false;

/** The slots of `.m3e-list-item` in contract order. */
export function ListItemParts({
  leadingContent,
  trailingContent,
  overlineContent,
  supportingContent,
  headline,
  headlineProps,
  overlineProps,
  supportingProps,
}: ListItemPartsProps): ReactElement {
  return (
    <>
      {has(leadingContent) ? (
        <span className="m3e-list-item__leading">{leadingContent}</span>
      ) : null}
      <span className="m3e-list-item__content">
        {has(overlineContent) ? (
          <span {...overlineProps} className="m3e-list-item__overline">
            {overlineContent}
          </span>
        ) : null}
        <span {...headlineProps} className="m3e-list-item__headline">
          {headline}
        </span>
        {has(supportingContent) ? (
          <span {...supportingProps} className="m3e-list-item__supporting">
            {supportingContent}
          </span>
        ) : null}
      </span>
      {has(trailingContent) ? (
        <span className="m3e-list-item__trailing">{trailingContent}</span>
      ) : null}
    </>
  );
}

const noop = () => undefined;

/** Renders an indicator tree (m3e-elements `listControlTree`) with the input's state. */
function renderControl(
  node: ListControlNode,
  state: { checked: boolean; disabled: boolean },
  key?: number,
): ReactElement {
  const [tag, attrs, children] = node;
  const { class: className, ...rest } = attrs;
  const props: Record<string, unknown> = {
    ...rest,
    className,
    key,
    // The indicator root: inert (React 19 takes a boolean).
    ...(key === undefined ? { inert: true } : {}),
    ...(tag === 'input'
      ? { checked: state.checked, disabled: state.disabled, onChange: noop }
      : {}),
  };
  return createElement(tag, props, ...children.map((child, i) => renderControl(child, state, i)));
}

/** A selection indicator (inert): the option is the control. */
export function ListItemControlIndicator({
  control,
  checked,
  disabled,
}: {
  control: ListItemControl;
  checked: boolean;
  disabled: boolean;
}): ReactElement {
  return renderControl(listControlTree(control), { checked, disabled });
}

/** Where an item's selection control goes. */
export const selectionControlSlot = (
  control: ListItemControl,
  position?: 'leading' | 'trailing',
): 'leading' | 'trailing' => position ?? (control === 'switch' ? 'trailing' : 'leading');

interface ItemNode {
  type: string;
  key?: Key;
  props?: unknown;
  rendered?: ReactNode;
  textValue?: string;
  'aria-label'?: string | undefined;
  hasChildNodes?: boolean;
}

const collectionNode = (segmented: boolean) =>
  function* itemNode(props: ListItemProps | BaselineListItemProps): Generator<ItemNode> {
    const rendered = 'headlineContent' in props ? props.headlineContent : props.children;
    const own = props as ListItemProps;
    yield {
      type: 'item',
      props: { ...props, segmented },
      rendered,
      textValue:
        own.textValue ?? (typeof rendered === 'string' ? rendered : (props['aria-label'] ?? '')),
      'aria-label': props['aria-label'],
      hasChildNodes: false,
      ...(own.id != null ? { key: own.id } : {}),
    };
  };

function renderStatic(
  props: ListItemProps | BaselineListItemProps,
  ref: ForwardedRef<HTMLLIElement>,
  segmented: boolean,
): ReactElement {
  if ('headlineContent' in props) {
    warnDeprecated('ListItem headlineContent', 'ListItem>{headline}</ListItem');
    const {
      headlineContent,
      leadingContent,
      trailingContent,
      overlineContent,
      supportingContent,
      threeLine,
      className,
      ...rest
    } = props;
    return (
      <li
        {...rest}
        ref={ref}
        className={cx(listItemClassName({ baseline: true, threeLine }), className)}
      >
        <ListItemParts
          headline={headlineContent}
          leadingContent={leadingContent}
          trailingContent={trailingContent}
          overlineContent={overlineContent}
          supportingContent={supportingContent}
        />
      </li>
    );
  }
  const {
    children,
    isDisabled,
    isDragged,
    leadingContent,
    trailingContent,
    overlineContent,
    supportingContent,
    threeLine,
    className,
    ...own
  } = props;
  // Collection-only props never reach the DOM.
  const collectionOnly = new Set([
    'id',
    'textValue',
    'selectionControl',
    'selectionControlPosition',
  ]);
  const rest = Object.fromEntries(
    Object.entries(own).filter(([name]) => !collectionOnly.has(name)),
  );
  return (
    <li
      {...rest}
      ref={ref}
      className={cx(listItemClassName({ segmented, threeLine, disabled: isDisabled }), className)}
      data-dragged={isDragged ? '' : undefined}
    >
      <ListItemParts
        headline={children}
        leadingContent={leadingContent}
        trailingContent={trailingContent}
        overlineContent={overlineContent}
        supportingContent={supportingContent}
      />
    </li>
  );
}

/** A list item component: overloaded for the deprecated `headlineContent` form. */
export interface ListItemComponent {
  (props: ListItemProps & RefAttributes<HTMLLIElement>): ReactElement | null;
  /**
   * @deprecated D4: the legacy list item (Compose's `ListItem(headlineContent, …)`). Use
   * `<ListItem>` with the headline as its children. Shipped until 2.0; no new features.
   */
  // A separate signature carries the deprecation (editors strike the legacy form through).
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (props: BaselineListItemProps & RefAttributes<HTMLLIElement>): ReactElement | null;
  displayName?: string;
}

/**
 * The expressive list item (COMPONENT_SPEC §20; Compose `ListItem(content = …)`): headline (the
 * children), overline, supporting text, leading and trailing content; one, two or three lines.
 * In a static `<List>` it is an `<li class="m3e-list-item">`; in an interactive `<List
 * selectionMode>` (or with `onAction`) it is a React Aria option with the state layer, focus ring,
 * selected colors and the fast-spatial shape morph.
 *
 * With `headlineContent` instead of children it is the legacy item (deprecated, D4).
 */
export const ListItem = /* @__PURE__ */ Object.assign(
  /* @__PURE__ */ forwardRef(function ListItem(
    props: ListItemProps | BaselineListItemProps,
    ref: ForwardedRef<HTMLLIElement>,
  ) {
    return renderStatic(props, ref, false);
  }),
  { getCollectionNode: collectionNode(false) },
) as unknown as ListItemComponent;

/**
 * A segmented list item (Compose `SegmentedListItem`): Surface by default (owner decision M8
 * #12), 2dp apart; the list's first and last items take the 16dp outer corners. Same props and
 * behavior as `<ListItem>`.
 */
export const SegmentedListItem = /* @__PURE__ */ Object.assign(
  /* @__PURE__ */ forwardRef(function SegmentedListItem(
    props: ListItemProps,
    ref: ForwardedRef<HTMLLIElement>,
  ) {
    return renderStatic(props, ref, true);
  }),
  { getCollectionNode: collectionNode(true) },
);
