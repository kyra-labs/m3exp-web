import {
  type SpringSpec,
  SpringAnimatable,
  fabMenuItemVisible,
  menuNavigationTarget,
} from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import { attachRipple } from '../base/ripple.js';
import { renderIcon } from '../icon/icon.js';
import type { OpenChangeDetail } from '../base/events.js';

let nextId = 0;
const uid = () => `m3e-fab-menu-${String(++nextId)}`;

/** Spring tokens in fab-menu-defaults.css (FloatingActionButtonMenu.kt; lines in PARITY.md). */
const TOKENS = '--m3e-comp-fab-menu-defaults';

/**
 * A spring from its `--m3e-comp-fab-menu-defaults-<name>-*` tokens, or null when its duration
 * resolves to 0 (spatial springs under reduced motion): the value then jumps.
 */
function readSpring(style: CSSStyleDeclaration, name: string): SpringSpec | null {
  const read = (part: string) =>
    Number.parseFloat(style.getPropertyValue(`${TOKENS}-${name}-${part}`));
  if (read('duration') === 0) return null;
  const dampingRatio = read('damping-ratio');
  const stiffness = read('stiffness');
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}

interface FabMenuContract {
  open: boolean;
  size?: string | null | undefined;
  color?: string | null | undefined;
  align?: string | null | undefined;
}

/** The `.m3e-fab-menu` root classes (m3e-react's `fabMenuClassName` renders the same). */
function fabMenuClassName({ open, size, color, align }: FabMenuContract): string {
  return [
    'm3e-fab-menu',
    open && 'm3e-fab-menu--open',
    (size === 'medium' || size === 'large') && `m3e-fab-menu--size-${size}`,
    (color === 'secondary' || color === 'tertiary') && `m3e-fab-menu--${color}`,
    (align === 'start' || align === 'center') && `m3e-fab-menu--align-${align}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * `<m3e-fab-menu-item icon="mail" value="email">Email</m3e-fab-menu-item>` — data for one item of
 * an `<m3e-fab-menu>` (it renders nothing itself; the menu renders `.m3e-fab-menu__item`). The label
 * is the text content. Activating it fires `action` on this element (bubbles) with
 * `detail: { value }` and closes the menu.
 */
export class M3eFabMenuItem extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    icon: {},
    value: {},
  }))();

  declare icon: string | null | undefined;
  declare value: string | null | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
  }

  protected override update(): void {
    this.closest<M3eFabMenu>('m3e-fab-menu')?.requestUpdate();
  }
}

/** `action` detail of a `<m3e-fab-menu-item>` (it bubbles through its `<m3e-fab-menu>`). */
export interface FabMenuActionDetail {
  value: string | null;
}

/** Events of `<m3e-fab-menu-item>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eFabMenuItemEventMap extends HTMLElementEventMap {
  /** Activated (it bubbles to the FAB menu). */
  action: CustomEvent<FabMenuActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eFabMenuItem {
  addEventListener<K extends keyof M3eFabMenuItemEventMap>(
    type: K,
    listener: (this: M3eFabMenuItem, ev: M3eFabMenuItemEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eFabMenuItemEventMap>(
    type: K,
    listener: (this: M3eFabMenuItem, ev: M3eFabMenuItemEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface Parts {
  root: HTMLDivElement;
  toggle: HTMLButtonElement;
  menu: HTMLDivElement;
  /** The closed icon and the close icon. */
  icons: [HTMLSpanElement, HTMLSpanElement];
}

interface ItemRecord {
  el: HTMLButtonElement;
  icon: HTMLSpanElement;
  label: HTMLSpanElement;
  width: SpringAnimatable;
  alpha: SpringAnimatable;
  /** The item's natural width while its width springs. */
  full: number;
  visible: boolean;
  abort: AbortController;
}

/**
 * `<m3e-fab-menu label="Share" icon="share" open>` (COMPONENT_SPEC §6; Compose
 * FloatingActionButtonMenu + ToggleFloatingActionButton). Renders the m3e-css `.m3e-fab-menu`
 * contract inside itself (the host is `display: contents`) from its `<m3e-fab-menu-item>`
 * children: the toggle FAB (`.m3e-fab.m3e-fab-menu__toggle`, `aria-expanded`, `aria-controls`)
 * and a `role="menu"` of `menuitem`s.
 *
 * - Attributes: `open` (reflected), `label` (the toggle's accessible name; m3.material.io: it
 *   describes the menu), `icon` (default `add`) and `close-icon` (default `close`), `size`
 *   (`baseline` | `medium` | `large`: the FAB it opens from), `color` (`primary` | `secondary` |
 *   `tertiary` color set), `align` (`end` | `start` | `center`).
 * - Motion (FloatingActionButtonMenu.kt): the toggle's checked progress on the fast spatial
 *   spring; the items stagger in from the bottom on a slow-effects Int spring, each springing its
 *   width (fast spatial) and alpha (fast effects). Every spring is interruptible and keeps its
 *   velocity, like Compose's Animatable; spatial springs jump under reduced motion.
 * - Focus and keys (Compose FloatingActionButtonMenu.kt L138–152, m3.material.io FAB menu ›
 *   Initial focus): opening leaves focus on the toggle, now the close button. From it, ArrowDown or
 *   Tab moves to the top item and ArrowUp or Shift+Tab to the bottom one; among the items
 *   ArrowUp/Down (wrapping) and Home/End move; Tab and Shift+Tab from an item go back to the toggle,
 *   so focus stays in the menu while it is open. Escape, an outside press or activating an item
 *   closes it and returns focus to the toggle.
 * - Events: `open-change` (`detail: { open }`) when the user opens or closes it; `action` on the
 *   activated `<m3e-fab-menu-item>`.
 */
export class M3eFabMenu extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    open: { type: Boolean, reflect: true },
    label: {},
    icon: {},
    closeIcon: {},
    size: {},
    color: {},
    align: {},
  }))();

  declare open: boolean | undefined;
  declare label: string | null | undefined;
  declare icon: string | null | undefined;
  declare closeIcon: string | null | undefined;
  declare size: string | null | undefined;
  declare color: string | null | undefined;
  declare align: string | null | undefined;

  #parts: Parts | undefined;
  #items = new Map<M3eFabMenuItem, ItemRecord>();
  #order: ItemRecord[] = [];
  #observer: MutationObserver | undefined;
  #progress = new SpringAnimatable(0);
  #stagger = new SpringAnimatable(0, 1);
  #shown: boolean | null = null;
  #frame = 0;

  /** The rendered `.m3e-fab-menu` root. */
  get menuElement(): HTMLDivElement | undefined {
    return this.#parts?.root;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver((records) => {
      const root = this.#parts?.root;
      if (records.some((r) => !root?.contains(r.target) && r.target !== root)) {
        this.requestUpdate();
      }
    });
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true });
    this.listen(this.ownerDocument, 'pointerdown', (e) => {
      this.#onOutsidePress(e);
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    for (const record of this.#items.values()) record.abort.abort();
    this.#items.clear();
    this.#shown = null;
  }

  protected override update(): void {
    this.#render();
    const open = Boolean(this.open);
    if (this.#shown === open) return;
    const first = this.#shown === null;
    this.#shown = open;
    if (first) {
      this.#snap(open);
      return;
    }
    this.#animate(open);
  }

  /** Opens or closes as the user did it: fires `open-change`. */
  #setOpen(open: boolean, focusToggle = false): void {
    if (Boolean(this.open) === open) return;
    this.open = open;
    if (!open && focusToggle) this.#parts?.toggle.focus();
    this.emit('open-change', { open });
  }

  // --- Rendering --------------------------------------------------------------------------

  #render(): void {
    const { root, toggle, menu, icons } = (this.#parts ??= this.#create());
    if (root.parentNode !== this) this.append(root);

    root.className = fabMenuClassName({
      open: Boolean(this.open),
      size: this.size,
      color: this.color,
      align: this.align,
    });
    root.toggleAttribute('data-spring', true);
    toggle.type = 'button';
    toggle.tabIndex = 0; // as React Aria's useButton renders it
    toggle.className = 'm3e-fab m3e-fab-menu__toggle';
    if (this.label) toggle.setAttribute('aria-label', this.label);
    else toggle.removeAttribute('aria-label');
    toggle.setAttribute('aria-expanded', String(Boolean(this.open)));
    toggle.setAttribute('aria-haspopup', 'menu');
    toggle.setAttribute('aria-controls', menu.id);
    renderIcon(icons[0], { name: this.icon ?? 'add', fill: false });
    renderIcon(icons[1], { name: this.closeIcon ?? 'close', fill: false });

    menu.className = 'm3e-fab-menu__items';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-labelledby', toggle.id);

    const seen = new Set<M3eFabMenuItem>();
    const order: ItemRecord[] = [];
    for (const child of this.children) {
      if (!(child instanceof M3eFabMenuItem)) continue;
      seen.add(child);
      order.push(this.#renderItem(child));
    }
    for (const [item, record] of this.#items) {
      if (seen.has(item)) continue;
      record.abort.abort();
      this.#items.delete(item);
    }
    this.#order = order;
    const els = order.map((r) => r.el);
    if (els.length !== menu.children.length || els.some((el, i) => menu.children[i] !== el)) {
      menu.replaceChildren(...els);
    }
  }

  /** The root, toggle and menu, created once and kept across reconnects. */
  #create(): Parts {
    const doc = this.ownerDocument;
    const root = doc.createElement('div');
    const toggle = doc.createElement('button');
    const menu = doc.createElement('div');
    const icons: Parts['icons'] = [doc.createElement('span'), doc.createElement('span')];
    toggle.append(...icons);
    root.append(toggle, menu);
    toggle.id = uid();
    menu.id = uid();
    attachRipple(toggle, new AbortController().signal);
    toggle.addEventListener('click', () => {
      // Focus stays on the toggle (m3.material.io › Initial focus); Safari does not focus a
      // clicked button, so keys would not reach the menu otherwise.
      if (this.ownerDocument.activeElement !== toggle) toggle.focus({ preventScroll: true });
      this.#setOpen(!this.open);
    });
    toggle.addEventListener('keydown', (e) => {
      this.#onToggleKey(e);
    });
    menu.addEventListener('keydown', (e) => {
      this.#onMenuKey(e);
    });
    return { root, toggle, menu, icons };
  }

  #renderItem(item: M3eFabMenuItem): ItemRecord {
    let record = this.#items.get(item);
    if (!record) {
      const doc = this.ownerDocument;
      const el = doc.createElement('button');
      const icon = doc.createElement('span');
      const label = doc.createElement('span');
      const abort = new AbortController();
      const shown = Boolean(this.open) && this.#shown !== null;
      record = {
        el,
        icon,
        label,
        width: new SpringAnimatable(shown ? 1 : 0),
        alpha: new SpringAnimatable(shown ? 1 : 0),
        full: 0,
        visible: shown,
        abort,
      };
      this.#items.set(item, record);
      attachRipple(el, abort.signal);
      el.addEventListener(
        'click',
        () => {
          item.dispatchEvent(
            new CustomEvent('action', {
              bubbles: true,
              composed: true,
              detail: { value: item.value ?? null },
            }),
          );
          this.#setOpen(false, true);
        },
        { signal: abort.signal },
      );
    }
    const { el, icon, label } = record;
    el.type = 'button';
    el.className = 'm3e-fab-menu__item';
    el.setAttribute('role', 'menuitem');
    el.tabIndex = -1;
    label.className = 'm3e-fab-menu__label';
    label.textContent = item.textContent.trim();
    const parts = item.icon ? [icon, label] : [label];
    if (item.icon) renderIcon(icon, { name: item.icon, fill: false });
    if (parts.length !== el.children.length || parts.some((p, i) => el.children[i] !== p)) {
      el.replaceChildren(...parts);
    }
    return record;
  }

  // --- Motion -----------------------------------------------------------------------------

  #snap(open: boolean): void {
    this.#progress.snapTo(open ? 1 : 0);
    this.#stagger.snapTo(open ? this.#order.length : 0);
    for (const record of this.#order) {
      record.visible = open;
      record.width.snapTo(open ? 1 : 0);
      record.alpha.snapTo(open ? 1 : 0);
    }
    this.#write(performance.now());
  }

  #animate(open: boolean): void {
    const root = this.#parts?.root;
    if (!root) return;
    const style = getComputedStyle(root);
    const now = performance.now();
    // While closing, the item column stays until every item has sprung out.
    if (!open) root.toggleAttribute('data-closing', true);
    this.#progress.animateTo(open ? 1 : 0, readSpring(style, 'toggle-progress'), now);
    const threshold = Number.parseFloat(
      style.getPropertyValue(`${TOKENS}-stagger-visibility-threshold`),
    );
    if (Number.isFinite(threshold) && threshold !== this.#stagger.visibilityThreshold) {
      const value = this.#stagger.value;
      this.#stagger = new SpringAnimatable(value, threshold);
    }
    this.#stagger.animateTo(open ? this.#order.length : 0, readSpring(style, 'stagger'), now);
    this.#write(now);
  }

  /** Samples every spring at `now`, writes the styles, and keeps going until all rest. */
  #write(now: number): void {
    const root = this.#parts?.root;
    if (!root) return;
    const progress = this.#progress.sample(now);
    const stagger = this.#stagger.sample(now);
    const count = this.#order.length;
    let style: CSSStyleDeclaration | undefined;
    this.#order.forEach((record, index) => {
      const visible = fabMenuItemVisible(index, count, stagger);
      if (visible !== record.visible) {
        record.visible = visible;
        style ??= getComputedStyle(root);
        if (!record.width.isRunning) record.full = naturalWidth(record.el);
        record.width.animateTo(visible ? 1 : 0, readSpring(style, 'item-width'), now);
        record.alpha.animateTo(visible ? 1 : 0, readSpring(style, 'item-opacity'), now);
      }
      writeItem(record, record.width.sample(now), record.alpha.sample(now));
    });

    const running =
      this.#progress.isRunning ||
      this.#stagger.isRunning ||
      this.#order.some((r) => r.width.isRunning || r.alpha.isRunning);
    if (running) root.style.setProperty('--_m3e-fab-menu-progress', String(progress));
    else root.style.removeProperty('--_m3e-fab-menu-progress');
    if (!running) {
      root.removeAttribute('data-closing');
      if (!this.open) for (const record of this.#order) clearItem(record.el);
    }
    if (!root.getAttribute('style')) root.removeAttribute('style');
    // Keep a pending frame rather than re-requesting it, so it stays first in its frame.
    if (running && this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#write(Math.max(t, performance.now()));
      });
    } else if (!running && this.#frame !== 0) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }
  }

  // --- Keyboard, focus, light dismiss ------------------------------------------------------

  #onToggleKey(e: KeyboardEvent): void {
    if (!this.open) return;
    const items = this.#order.map((r) => r.el);
    if (e.key === 'Escape') {
      e.preventDefault();
      this.#setOpen(false, true);
    } else if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowDown') {
      e.preventDefault();
      items[0]?.focus();
    } else if ((e.key === 'Tab' && e.shiftKey) || e.key === 'ArrowUp') {
      e.preventDefault();
      items.at(-1)?.focus();
    }
  }

  #onMenuKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.#setOpen(false, true);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      this.#parts?.toggle.focus();
      return;
    }
    const items = this.#order.map((r) => r.el);
    const target = menuNavigationTarget(
      e.key,
      items.length,
      items.indexOf(e.target as HTMLButtonElement),
    );
    if (target !== null) {
      e.preventDefault();
      items[target]?.focus();
    }
  }

  #onOutsidePress(e: Event): void {
    const root = this.#parts?.root;
    if (!this.open || !root || root.contains(e.target as Node)) return;
    const active = this.ownerDocument.activeElement;
    this.#setOpen(false, root.contains(active));
  }
}

/** Events of `<m3e-fab-menu>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eFabMenuEventMap extends HTMLElementEventMap {
  /** The user opened or closed it (after the change). */
  'open-change': CustomEvent<OpenChangeDetail>;
  /** An item was activated (from the `<m3e-fab-menu-item>`, bubbling). */
  action: CustomEvent<FabMenuActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eFabMenu {
  addEventListener<K extends keyof M3eFabMenuEventMap>(
    type: K,
    listener: (this: M3eFabMenu, ev: M3eFabMenuEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eFabMenuEventMap>(
    type: K,
    listener: (this: M3eFabMenu, ev: M3eFabMenuEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
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

/**
 * Compose FloatingActionButtonMenuItem: width = full row width × max(progress, 0), alpha on its
 * own spring; at rest on screen the inline styles go, so m3e-css holds the layout.
 */
function writeItem(record: ItemRecord, width: number, alpha: number): void {
  const { el } = record;
  if (width === 1 && alpha === 1 && !record.width.isRunning && !record.alpha.isRunning) {
    clearItem(el);
    return;
  }
  el.toggleAttribute('data-animating', true);
  el.style.setProperty('inline-size', `${String(record.full * Math.max(width, 0))}px`);
  el.style.setProperty('opacity', String(Math.min(Math.max(alpha, 0), 1)));
}

function clearItem(el: HTMLElement): void {
  el.removeAttribute('data-animating');
  el.style.removeProperty('inline-size');
  el.style.removeProperty('opacity');
  if (!el.getAttribute('style')) el.removeAttribute('style');
}
