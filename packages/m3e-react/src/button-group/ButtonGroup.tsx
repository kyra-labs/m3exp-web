import { ButtonGroupLayout } from '@kyralabs/m3e-elements/button-group-layout.js';
import {
  Children,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  forwardRef,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  type PressEvent,
  mergeProps,
  useButton,
  useFocusRing,
  useHover,
  useObjectRef,
  useToggleButtonGroupItem,
} from 'react-aria';
import { type Key, type ToggleGroupState, useToggleGroupState } from 'react-stately';
import {
  type ButtonShape,
  type ButtonSize,
  type ButtonVariant,
  buttonClassName,
} from '../button/Button.js';
import { Icon } from '../icon/Icon.js';
import { Menu, MenuItem } from '../menu/Menu.js';
import { MenuTrigger } from '../menu/MenuTrigger.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { PlainTooltip } from '../tooltip/Tooltip.js';
import { TooltipTrigger } from '../tooltip/TooltipTrigger.js';
import { cx, defined } from '../utils/cx.js';

/** Compose `Strings.ButtonGroupMoreOptions` (androidMain res/values/strings.xml L19). */
const MORE_OPTIONS = 'More options';

export type ButtonGroupVariant = 'standard' | 'connected';
export type ButtonGroupSelectionMode = 'none' | 'single' | 'multiple';

export interface ButtonGroupItemProps {
  /** Unique within the group; the key in `selectedKeys`. Defaults to the element's React `key`. */
  id?: Key;
  /** The label. Icon-only items need `aria-label`. */
  children?: ReactNode;
  /** Leading icon: a Material Symbols name or an `<Icon>`. */
  icon?: string | ReactElement;
  /** Overrides the group's `buttonVariant` for this item. */
  variant?: ButtonVariant;
  isDisabled?: boolean;
  /** Called when the item is pressed (also from the overflow menu). */
  onPress?: () => void;
  'aria-label'?: string;
  /** Overflow menu label when `children` is not a plain string. */
  textValue?: string;
}

/** One button of a `<ButtonGroup>` (rendered by the group, never on its own). */
export const ButtonGroupItem = /* @__PURE__ */ Object.assign(
  function ButtonGroupItem(_props: ButtonGroupItemProps): ReactElement | null {
    return null;
  },
  { displayName: 'ButtonGroupItem' },
);

export interface ButtonGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onChange' | 'role'
> {
  /** `<ButtonGroupItem>` elements. */
  children: ReactNode;
  /** Default `standard`: pressed items grow and push their neighbors. `connected`: one segmented row. */
  variant?: ButtonGroupVariant;
  /** Size of the group and its buttons. Default `s`. */
  size?: ButtonSize;
  /** Resting shape of the buttons. Default `round`. */
  shape?: ButtonShape;
  /** Color configuration of the buttons. Default `filled`. */
  buttonVariant?: ButtonVariant;
  /**
   * `none` (default): plain buttons. `single`: a `radiogroup` of radios (`aria-checked`).
   * `multiple`: toggle buttons (`aria-pressed`).
   */
  selectionMode?: ButtonGroupSelectionMode;
  selectedKeys?: Iterable<Key>;
  defaultSelectedKeys?: Iterable<Key>;
  onSelectionChange?: (keys: Set<Key>) => void;
  /** Keep at least one item selected (m3.material.io "selection-required"). */
  disallowEmptySelection?: boolean;
  /** Called with the item's key when an item is pressed (any selection mode). */
  onAction?: (key: Key) => void;
  /**
   * Standard groups: trailing items that do not fit collapse into a menu opened from a
   * "More options" icon button at the end (Compose ButtonGroup overflowIndicator).
   */
  overflow?: boolean;
  /** Accessible name and tooltip of the overflow button. Default "More options". */
  overflowLabel?: string;
  isDisabled?: boolean;
}

interface ItemData {
  key: Key;
  props: ButtonGroupItemProps;
}

function collectItems(children: ReactNode): ItemData[] {
  const out: ItemData[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<ButtonGroupItemProps>(child) || child.type !== ButtonGroupItem) return;
    out.push({ key: child.props.id ?? child.key ?? String(out.length), props: child.props });
  });
  return out;
}

const iconElement = (icon: string | ReactElement | undefined): ReactNode =>
  typeof icon === 'string' ? <Icon name={icon} /> : icon;

const menuLabel = ({ props }: ItemData): string =>
  props.textValue ??
  (typeof props.children === 'string' ? props.children : (props['aria-label'] ?? ''));

interface ItemViewProps {
  item: ItemData;
  className: string;
  isDisabled: boolean;
  hidden: boolean;
  onAction: (key: Key) => void;
}

/** The `.m3e-button-group__item` contract shared by plain and toggle items. */
function ItemButton({
  item,
  className,
  hidden,
  buttonProps,
  isPressed,
  isDisabled,
  buttonRef,
}: {
  item: ItemData;
  className: string;
  hidden: boolean;
  buttonProps: HTMLAttributes<HTMLButtonElement>;
  isPressed: boolean;
  isDisabled: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
}): ReactNode {
  const { focusProps } = useFocusRing();
  const { hoverProps } = useHover({ isDisabled });
  return (
    <button
      {...mergeProps(buttonProps, focusProps, hoverProps, {
        className,
        'data-spring': '',
        'data-pressed': isPressed ? '' : undefined,
        'aria-label': item.props['aria-label'],
      })}
      hidden={hidden || undefined}
      ref={buttonRef}
    >
      {iconElement(item.props.icon)}
      {item.props.children}
    </button>
  );
}

function PlainItem({ item, className, isDisabled, hidden, onAction }: ItemViewProps): ReactNode {
  const ref = useRef<HTMLButtonElement>(null);
  const stateLayer = useStateLayer();
  const { buttonProps, isPressed } = useButton(
    {
      isDisabled,
      onPress: () => {
        onAction(item.key);
      },
      onPressStart: stateLayer.onPressStart,
      onPressEnd: stateLayer.onPressEnd,
    },
    ref,
  );
  return (
    <ItemButton
      item={item}
      className={className}
      hidden={hidden}
      buttonProps={mergeProps(buttonProps, stateLayer.stateLayerProps)}
      isPressed={isPressed}
      isDisabled={isDisabled}
      buttonRef={ref}
    />
  );
}

function ToggleItem({
  item,
  className,
  isDisabled,
  hidden,
  onAction,
  state,
}: ItemViewProps & { state: ToggleGroupState }): ReactNode {
  const ref = useRef<HTMLButtonElement>(null);
  const stateLayer = useStateLayer();
  const { buttonProps, isPressed } = useToggleButtonGroupItem(
    {
      id: item.key,
      isDisabled,
      onPress: () => {
        onAction(item.key);
      },
      onPressStart: stateLayer.onPressStart,
      onPressEnd: stateLayer.onPressEnd,
    },
    state,
    ref,
  );
  return (
    <ItemButton
      item={item}
      className={className}
      hidden={hidden}
      buttonProps={mergeProps(buttonProps, stateLayer.stateLayerProps)}
      isPressed={isPressed}
      isDisabled={isDisabled}
      buttonRef={ref}
    />
  );
}

interface OverflowButtonProps {
  size: ButtonSize;
  label: string;
  isDisabled: boolean;
  hidden: boolean;
  onPress?: (e: PressEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  id?: string;
  'aria-haspopup'?: string;
  'aria-expanded'?: string;
  'aria-controls'?: string;
}

/**
 * Compose ButtonGroupDefaults.OverflowIndicator: a filled icon button with MoreVert in a
 * TooltipBox(Above) whose PlainTooltip is the button's name (owner decision M9 #30; it repeats the
 * name, so it is `aria-hidden`, owner decision M9 #2).
 */
const OverflowButton = /* @__PURE__ */ forwardRef(function OverflowButton(
  { size, label, isDisabled, hidden, onPress, onKeyDown, ...aria }: OverflowButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const stateLayer = useStateLayer();
  const { buttonProps, isPressed } = useButton(
    {
      isDisabled,
      ...defined({ onPress, onKeyDown }),
      onPressStart: stateLayer.onPressStart,
      onPressEnd: stateLayer.onPressEnd,
    },
    ref,
  );
  const { focusProps } = useFocusRing();
  const { hoverProps } = useHover({ isDisabled });
  return (
    <TooltipTrigger>
      <button
        {...mergeProps(buttonProps, focusProps, hoverProps, stateLayer.stateLayerProps, aria, {
          className: cx(
            'm3e-icon-button',
            'm3e-icon-button--filled',
            `m3e-icon-button--size-${size}`,
            'm3e-icon-button--width-default',
            'm3e-icon-button--round',
            'm3e-button-group__overflow',
          ),
          'aria-label': label,
          'data-spring': '',
          'data-pressed': isPressed ? '' : undefined,
        })}
        hidden={hidden || undefined}
        ref={ref}
      >
        <Icon name="more_vert" />
      </button>
      <PlainTooltip>{label}</PlainTooltip>
    </TooltipTrigger>
  );
});

/**
 * Button group (COMPONENT_SPEC §3): standard (a pressed item grows by ExpandedRatio while its
 * neighbors shrink, on the fast spatial spring) or connected (a segmented row whose items only
 * morph their own corners). React Aria provides the buttons (`useButton`, or
 * `useToggleButtonGroupItem` with react-stately `useToggleGroupState` when selectable); the
 * motion, roving tabindex and overflow measurement come from m3e-elements' ButtonGroupLayout, the
 * same code `<m3e-button-group>` runs. The overflow menu is a baseline `<Menu>` (Compose
 * DropdownMenu) listing the hidden items; its button has Compose's built-in plain tooltip.
 */
export const ButtonGroup = /* @__PURE__ */ forwardRef(function ButtonGroup(
  props: ButtonGroupProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    children,
    variant = 'standard',
    size = 's',
    shape = 'round',
    buttonVariant = 'filled',
    selectionMode = 'none',
    selectedKeys,
    defaultSelectedKeys,
    onSelectionChange,
    disallowEmptySelection = false,
    onAction,
    overflow = false,
    overflowLabel = MORE_OPTIONS,
    isDisabled = false,
    className,
    ...rest
  } = props;
  const ref = useObjectRef(forwardedRef);
  const items = collectItems(children);
  const state = useToggleGroupState({
    selectionMode: selectionMode === 'multiple' ? 'multiple' : 'single',
    disallowEmptySelection,
    isDisabled,
    ...defined({ selectedKeys, defaultSelectedKeys, onSelectionChange }),
  });
  const overflowing = overflow && variant === 'standard';
  const [visible, setVisible] = useState(Number.POSITIVE_INFINITY);
  const shown = overflowing ? visible : Number.POSITIVE_INFINITY;
  const layoutRef = useRef<ButtonGroupLayout | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    layoutRef.current ??= new ButtonGroupLayout(el, { onVisibleCountChange: setVisible });
    layoutRef.current.update();
  });
  useLayoutEffect(
    () => () => {
      layoutRef.current?.destroy();
      layoutRef.current = null;
    },
    [],
  );

  const activate = (key: Key) => {
    items.find((i) => i.key === key)?.props.onPress?.();
    onAction?.(key);
  };
  const itemClass = (item: ItemData) =>
    buttonClassName(
      { variant: item.props.variant ?? buttonVariant, size, shape },
      'm3e-button-group__item',
    );
  const hiddenItems = items.slice(Math.min(shown, items.length));

  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'm3e-button-group',
        `m3e-button-group--${variant}`,
        `m3e-button-group--size-${size}`,
        overflowing && 'm3e-button-group--overflow',
        className,
      )}
      role={selectionMode === 'single' ? 'radiogroup' : 'group'}
    >
      {items.map((item, i) => {
        const common = {
          item,
          className: itemClass(item),
          isDisabled: isDisabled || Boolean(item.props.isDisabled),
          hidden: i >= shown,
          onAction: activate,
        };
        return selectionMode === 'none' ? (
          <PlainItem key={item.key} {...common} />
        ) : (
          <ToggleItem key={item.key} {...common} state={state} />
        );
      })}
      {overflowing ? (
        <MenuTrigger isDisabled={isDisabled}>
          <OverflowButton
            size={size}
            label={overflowLabel}
            isDisabled={isDisabled}
            hidden={hiddenItems.length === 0}
          />
          <Menu
            variant="baseline"
            {...(selectionMode === 'none'
              ? {}
              : {
                  selectionMode,
                  selectedKeys: [...state.selectedKeys].filter((k) =>
                    hiddenItems.some((i) => i.key === k),
                  ),
                })}
            onAction={(key) => {
              if (selectionMode !== 'none') state.toggleKey(key);
              activate(key);
            }}
            disabledKeys={hiddenItems
              .filter((i) => isDisabled || i.props.isDisabled)
              .map((i) => i.key)}
          >
            {hiddenItems.map((item) => (
              <MenuItem
                key={item.key}
                id={item.key}
                textValue={menuLabel(item)}
                {...defined({
                  icon: item.props.icon,
                  checkedIcon: selectionMode === 'none' ? undefined : 'check',
                })}
              >
                {item.props.children ?? menuLabel(item)}
              </MenuItem>
            ))}
          </Menu>
        </MenuTrigger>
      ) : null}
    </div>
  );
});
