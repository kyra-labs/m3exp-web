import { fabMenuItemVisible, menuNavigationTarget } from '@kyralabs/m3e-motion';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type Key,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
} from 'react';
import { type PressEvent, mergeProps, useInteractOutside, useObjectRef } from 'react-aria';
import { useOverlayTriggerState } from 'react-stately';
import { useFabButton } from '../fab/Fab.js';
import { Icon } from '../icon/Icon.js';
import { type SpringSpec, ValueSpring, readSpringVars } from '../motion/shape-spring.js';
import { cx } from '../utils/cx.js';
import { isDev } from '../utils/dev.js';

/** The FAB the menu opens from (ToggleFloatingActionButtonDefaults.containerSize / …Medium / …Large). */
export type FabMenuSize = 'baseline' | 'medium' | 'large';

/**
 * Color set (m3.material.io FAB menu › Color): the close button takes the role, the items its
 * container role. Pair it with the FAB's color style (primary or primary container → primary).
 */
export type FabMenuColor = 'primary' | 'secondary' | 'tertiary';

/** Item alignment (Compose `horizontalAlignment`, default `Alignment.End`). */
export type FabMenuAlign = 'end' | 'start' | 'center';

/** Classes for a FAB menu root (the m3e-css contract). */
export const fabMenuClassName = (
  {
    open = false,
    size = 'baseline',
    color = 'primary',
    align = 'end',
  }: {
    open?: boolean | undefined;
    size?: FabMenuSize | undefined;
    color?: FabMenuColor | undefined;
    align?: FabMenuAlign | undefined;
  },
  className?: string,
): string =>
  cx(
    'm3e-fab-menu',
    open && 'm3e-fab-menu--open',
    size !== 'baseline' && `m3e-fab-menu--size-${size}`,
    color !== 'primary' && `m3e-fab-menu--${color}`,
    align !== 'end' && `m3e-fab-menu--align-${align}`,
    className,
  );

export interface FabMenuItem {
  /** Stable key; default: the index. */
  key?: Key;
  /** Icon name (Material Symbols) or an element such as `<Icon name="mail" />`. */
  icon?: ReactNode;
  /** The visible label, also the item's accessible name. */
  label: ReactNode;
  /** Called when the item is activated; the menu then closes. */
  onPress?: (e: PressEvent) => void;
}

export interface FabMenuProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'className' | 'color' | 'aria-label'
> {
  /** 2–6 related actions (m3.material.io FAB menu › Guidelines). */
  items: readonly FabMenuItem[];
  /** Controlled open state (Compose `expanded`). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The toggle's icon while closed; default `add`. A name or an element. */
  icon?: ReactNode;
  /** The close icon it swaps to at half progress; default `close`. */
  closeIcon?: ReactNode;
  /** The FAB size it opens from; default `baseline`. The close button is always 56dp. */
  size?: FabMenuSize;
  /** Color set; default `primary`. */
  color?: FabMenuColor;
  /** Item alignment; default `end`. */
  align?: FabMenuAlign;
  /** The toggle's accessible name; it should describe the menu (m3.material.io). Required. */
  'aria-label'?: string;
  className?: string;
}

const iconNode = (icon: ReactNode): ReactNode =>
  typeof icon === 'string' ? <Icon name={icon} /> : icon;

/** Spring tokens in fab-menu-defaults.css (FloatingActionButtonMenu.kt; lines in PARITY.md). */
const TOKENS = '--m3e-comp-fab-menu-defaults';

const warned = new Set<string>();
function warnOnce(key: string, message: string): void {
  if (!isDev() || warned.has(key)) return;
  warned.add(key);
  console.warn(`[m3exp-web] ${message}`);
}

interface ItemMotion {
  el: HTMLElement | null;
  width: ValueSpring;
  alpha: ValueSpring;
  full: number;
  visible: boolean;
}

/**
 * Compose's FAB menu choreography (FloatingActionButtonMenu.kt) on Motion springs: the toggle's
 * checked progress (fast spatial, L456–461) written to `--_m3e-fab-menu-progress` (m3e-css derives
 * size, corners, colors and icon from it); an Int stagger 0 ↔ item count on the slow effects
 * spring with visibility threshold 1 (L202–262); each item's width (fast spatial) and alpha
 * (fast effects) when its visibility flips (L339–376). Every spring keeps its velocity when
 * retargeted. At rest the inline styles are removed, so m3e-css holds the settled layout.
 */
class FabMenuMotion {
  readonly #root: HTMLElement;
  readonly #progress: ValueSpring;
  readonly #stagger: ValueSpring;
  #items: ItemMotion[] = [];

  constructor(root: HTMLElement) {
    this.#root = root;
    const settle = () => {
      this.#settle();
    };
    this.#progress = new ValueSpring((p) => {
      root.style.setProperty('--_m3e-fab-menu-progress', String(p));
    }, settle);
    this.#stagger = new ValueSpring((value) => {
      this.#onStagger(value);
    }, settle);
  }

  /** Matches the item list to the rendered buttons. */
  sync(els: readonly (HTMLElement | null)[], open: boolean): void {
    const settle = () => {
      this.#settle();
    };
    this.#items = els.map((el, i) => {
      const existing = this.#items[i];
      if (existing) {
        existing.el = el;
        return existing;
      }
      const item: ItemMotion = {
        el,
        full: 0,
        visible: open,
        width: new ValueSpring(() => {
          this.#write(item);
        }, settle),
        alpha: new ValueSpring(() => {
          this.#write(item);
        }, settle),
      };
      item.width.snap(open ? 1 : 0);
      item.alpha.snap(open ? 1 : 0);
      return item;
    });
  }

  snap(open: boolean): void {
    this.#progress.snap(open ? 1 : 0);
    this.#stagger.snap(open ? this.#items.length : 0);
  }

  animate(open: boolean): void {
    const style = getComputedStyle(this.#root);
    if (!open) this.#root.toggleAttribute('data-closing', true);
    // Items still hidden keep their slot at zero width until the stagger reaches them.
    for (const item of this.#items) if (!item.visible) this.#write(item);
    this.#progress.to(open ? 1 : 0, readSpringVars(style, `${TOKENS}-toggle-progress`));
    const stagger = readSpringVars(style, `${TOKENS}-stagger`);
    const threshold = Number.parseFloat(
      style.getPropertyValue(`${TOKENS}-stagger-visibility-threshold`),
    );
    const spec: SpringSpec | null =
      stagger && Number.isFinite(threshold)
        ? { ...stagger, visibilityThreshold: threshold }
        : stagger;
    this.#stagger.to(open ? this.#items.length : 0, spec);
  }

  stop(): void {
    this.#progress.stop();
    this.#stagger.stop();
    for (const item of this.#items) {
      item.width.stop();
      item.alpha.stop();
    }
  }

  get #running(): boolean {
    return (
      this.#progress.isAnimating ||
      this.#stagger.isAnimating ||
      this.#items.some((i) => i.width.isAnimating || i.alpha.isAnimating)
    );
  }

  #onStagger(value: number): void {
    const count = this.#items.length;
    let style: CSSStyleDeclaration | undefined;
    this.#items.forEach((item, index) => {
      const visible = fabMenuItemVisible(index, count, value);
      if (visible === item.visible) return;
      item.visible = visible;
      style ??= getComputedStyle(this.#root);
      if (!item.width.isAnimating && item.el) item.full = naturalWidth(item.el);
      item.width.to(visible ? 1 : 0, readSpringVars(style, `${TOKENS}-item-width`));
      item.alpha.to(visible ? 1 : 0, readSpringVars(style, `${TOKENS}-item-opacity`));
    });
  }

  #write(item: ItemMotion): void {
    const { el } = item;
    if (!el) return;
    const width = item.width.value ?? 0;
    const alpha = item.alpha.value ?? 0;
    el.toggleAttribute('data-animating', true);
    el.style.setProperty('inline-size', `${String(item.full * Math.max(width, 0))}px`);
    el.style.setProperty('opacity', String(Math.min(Math.max(alpha, 0), 1)));
  }

  #settle(): void {
    if (this.#running) return;
    const root = this.#root;
    root.style.removeProperty('--_m3e-fab-menu-progress');
    if (!root.getAttribute('style')) root.removeAttribute('style');
    root.removeAttribute('data-closing');
    for (const item of this.#items) if (item.el) clearItem(item.el);
  }
}

/** The item's width with no spring styles (its m3e-css layout). */
function naturalWidth(el: HTMLElement): number {
  const width = el.style.getPropertyValue('inline-size');
  const animating = el.hasAttribute('data-animating');
  el.style.removeProperty('inline-size');
  el.removeAttribute('data-animating');
  const full = el.getBoundingClientRect().width;
  if (width) el.style.setProperty('inline-size', width);
  el.toggleAttribute('data-animating', animating);
  return full;
}

function clearItem(el: HTMLElement): void {
  el.removeAttribute('data-animating');
  el.style.removeProperty('inline-size');
  el.style.removeProperty('opacity');
  if (!el.getAttribute('style')) el.removeAttribute('style');
}

function useFabMenuMotion(
  rootRef: RefObject<HTMLDivElement | null>,
  itemRefs: RefObject<(HTMLButtonElement | null)[]>,
  open: boolean,
  count: number,
): void {
  const motion = useRef<FabMenuMotion | null>(null);
  const shown = useRef<boolean | null>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctl = (motion.current ??= new FabMenuMotion(root));
    ctl.sync(itemRefs.current.slice(0, count), shown.current ?? open);
    if (shown.current === null) {
      shown.current = open;
      ctl.snap(open);
      return;
    }
    if (shown.current === open) return;
    shown.current = open;
    ctl.animate(open);
  }, [rootRef, itemRefs, open, count]);

  useLayoutEffect(
    () => () => {
      motion.current?.stop();
    },
    [],
  );
}

interface FabMenuItemButtonProps {
  item: FabMenuItem;
  index: number;
  itemRefs: RefObject<(HTMLButtonElement | null)[]>;
  onAction: () => void;
}

function FabMenuItemButton({ item, index, itemRefs, onAction }: FabMenuItemButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const buttonProps = useFabButton(
    {
      onPress: (e) => {
        item.onPress?.(e);
        onAction();
      },
    },
    ref,
  );
  return (
    <button
      {...mergeProps(buttonProps, {
        className: 'm3e-fab-menu__item',
        role: 'menuitem',
        tabIndex: -1,
      })}
      ref={(el) => {
        ref.current = el;
        itemRefs.current[index] = el;
      }}
    >
      {item.icon != null && iconNode(item.icon)}
      <span className="m3e-fab-menu__label">{item.label}</span>
    </button>
  );
}

/**
 * FAB menu (COMPONENT_SPEC §6; Compose `FloatingActionButtonMenu` with a
 * `ToggleFloatingActionButton` and `FloatingActionButtonMenuItem`s): a toggle FAB that turns into
 * the close button and opens a `role="menu"` of items, on the m3e-css `.m3e-fab-menu` classes.
 *
 * Opening leaves focus on the toggle, now the close button (Compose FloatingActionButtonMenu.kt
 * L138–152, m3.material.io FAB menu › Initial focus): ArrowDown or Tab moves to the top item,
 * ArrowUp or Shift+Tab to the bottom one; among the items ArrowUp/Down (wrapping) and Home/End move,
 * and Tab / Shift+Tab return to the toggle, so focus stays in the menu while it is open. Escape, a
 * press outside or activating an item closes the menu and returns focus to the toggle. Motion
 * follows Compose's springs and keeps velocity when interrupted.
 */
export const FabMenu = /* @__PURE__ */ forwardRef(function FabMenu(
  props: FabMenuProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    items,
    open,
    defaultOpen,
    onOpenChange,
    icon = 'add',
    closeIcon = 'close',
    size,
    color,
    align,
    'aria-label': label,
    className,
    ...rest
  } = props;
  if (!label) warnOnce('label', '<FabMenu> needs an aria-label: the toggle shows only an icon.');
  if (items.length < 2 || items.length > 6) {
    warnOnce('count', '<FabMenu> should have 2–6 items (m3.material.io FAB menu guidelines).');
  }
  const state = useOverlayTriggerState({
    ...(open === undefined ? {} : { isOpen: open }),
    ...(defaultOpen === undefined ? {} : { defaultOpen }),
    ...(onOpenChange === undefined ? {} : { onOpenChange }),
  });
  const rootRef = useObjectRef(forwardedRef);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const toggleId = useId();
  const menuId = useId();
  useFabMenuMotion(rootRef, itemRefs, state.isOpen, items.length);

  const close = (focusToggle: boolean) => {
    state.close();
    if (focusToggle) toggleRef.current?.focus();
  };

  useInteractOutside({
    ref: rootRef,
    isDisabled: !state.isOpen,
    onInteractOutside: () => {
      const active = document.activeElement;
      close(active === document.body || Boolean(rootRef.current?.contains(active)));
    },
  });

  const toggleProps = useFabButton(
    {
      onPress: () => {
        // Focus stays on the toggle (m3.material.io › Initial focus); Safari does not focus a
        // pressed button, so keys would not reach the menu otherwise.
        const toggle = toggleRef.current;
        if (toggle && document.activeElement !== toggle) toggle.focus({ preventScroll: true });
        state.toggle();
      },
    },
    toggleRef,
  );

  const itemEls = () => itemRefs.current.slice(0, items.length);
  const onToggleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!state.isOpen) return;
    const els = itemEls();
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowDown') {
      e.preventDefault();
      els[0]?.focus();
    } else if ((e.key === 'Tab' && e.shiftKey) || e.key === 'ArrowUp') {
      e.preventDefault();
      els.at(-1)?.focus();
    }
  };
  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      toggleRef.current?.focus();
      return;
    }
    const els = itemEls();
    const target = menuNavigationTarget(
      e.key,
      els.length,
      els.indexOf(e.target as HTMLButtonElement),
    );
    if (target !== null) {
      e.preventDefault();
      els[target]?.focus();
    }
  };

  return (
    <div
      {...rest}
      className={fabMenuClassName({ open: state.isOpen, size, color, align }, className)}
      data-spring=""
      ref={rootRef}
    >
      <button
        {...mergeProps(toggleProps, {
          className: 'm3e-fab m3e-fab-menu__toggle',
          id: toggleId,
          'aria-label': label,
          'aria-expanded': state.isOpen,
          'aria-haspopup': 'menu' as const,
          'aria-controls': menuId,
          onKeyDown: onToggleKeyDown,
        })}
        ref={toggleRef}
      >
        {iconNode(icon)}
        {iconNode(closeIcon)}
      </button>
      <div
        className="m3e-fab-menu__items"
        role="menu"
        id={menuId}
        aria-labelledby={toggleId}
        onKeyDown={onMenuKeyDown}
      >
        {items.map((item, index) => (
          <FabMenuItemButton
            key={item.key ?? index}
            item={item}
            index={index}
            itemRefs={itemRefs}
            onAction={() => {
              close(true);
            }}
          />
        ))}
      </div>
    </div>
  );
});
