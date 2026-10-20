import { M3eElement } from '../base/M3eElement.js';
import type { SelectionChangeDetail } from '../base/events.js';

/**
 * `<m3e-navigation-item value="home" icon="home" href="/">Home</m3e-navigation-item>` — data for
 * one destination of a `<m3e-short-navigation-bar>`, `<m3e-wide-navigation-rail>` or
 * `<m3e-modal-wide-navigation-rail>` (it renders nothing itself; the container renders the
 * `.m3e-navigation-item` contract): `value` (default: the label), `icon` (Material Symbols,
 * filled while selected), `href` (renders a link; otherwise a button that only selects),
 * `disabled`, `label-hidden` (icon only; the label becomes the accessible name), `badge` (a
 * Compose Badge on the icon, as NavigationSuiteScaffold's NavigationItemIcon builds it: `""` the
 * dot, digits a count — `999+` above 999 — other text as is) and `badge-label` (the badge's
 * visually hidden text, read after the label: default "New notification" for the dot, the shown
 * text otherwise; `""` leaves it out). The label is the text content. In a
 * `<m3e-navigation-drawer>` (Compose NavigationDrawerItem) the icon is optional and `badge` is the
 * trailing badge text instead (`badge-label` unused).
 */
export class M3eNavigationItem extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    value: {},
    icon: {},
    href: {},
    disabled: { type: Boolean },
    labelHidden: { type: Boolean },
    badge: {},
    badgeLabel: {},
  };

  declare value: string | null | undefined;
  declare icon: string | null | undefined;
  declare href: string | null | undefined;
  declare disabled: boolean | undefined;
  declare labelHidden: boolean | undefined;
  declare badge: string | null | undefined;
  declare badgeLabel: string | null | undefined;

  /** The destination's key: `value`, else its label. */
  get key(): string {
    return this.value ?? this.textContent.trim();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
  }

  protected override update(): void {
    this.parentElement?.closest<M3eNavigationContainer>('[data-m3e-navigation]')?.requestUpdate();
  }
}

/** A `<span class>`, `aria-hidden` unless `hidden` is false. */
export function span(
  doc: Document,
  className: string,
  text?: string,
  hidden = true,
): HTMLSpanElement {
  const el = doc.createElement('span');
  el.className = className;
  if (hidden) el.setAttribute('aria-hidden', 'true');
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
export const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

/**
 * React Aria's link / button attributes for an item element: useLink keeps href (tabindex 0)
 * unless disabled; useButton disables the button. Plus `aria-current="page"` when selected.
 */
export function setItemAttributes(
  el: HTMLElement,
  item: M3eNavigationItem,
  selected: boolean,
): void {
  const disabled = Boolean(item.disabled);
  const link = el.localName === 'a';
  setAttr(el, 'href', link && !disabled ? (item.href ?? '') : null);
  setAttr(el, 'tabindex', disabled ? null : '0');
  setAttr(el, 'type', link ? null : 'button');
  setAttr(el, 'disabled', !link && disabled ? '' : null);
  setAttr(el, 'aria-disabled', disabled ? 'true' : null);
  setAttr(el, 'aria-current', selected ? 'page' : null);
}

/**
 * Base of the navigation bar / rail / drawer / suite elements: renders their
 * `<m3e-navigation-item>` children as items — the m3e-css `.m3e-navigation-item` contract
 * (item-element.js), exactly as m3e-react's NavigationItem does (React Aria's link / button
 * attributes included), or the drawer item (drawer-item.js) — and tracks the selection.
 *
 * - Attributes: `label` (the `<nav>`'s accessible name), `selected` (the selected item's value,
 *   reflected; exactly one item gets `aria-current="page"`).
 * - Events: `selection-change` (`detail: { value }`) when an item is pressed; cancelable:
 *   `preventDefault()` keeps the selection (controlled), otherwise `selected` follows.
 */
export abstract class M3eNavigationContainer extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    label: {},
    selected: { reflect: true },
  };

  declare label: string | null | undefined;
  declare selected: string | null | undefined;

  #rendered = new Map<M3eNavigationItem, HTMLElement>();
  #keys = new WeakMap<HTMLElement, string>();
  #ripples = new WeakMap<HTMLElement, AbortController>();
  #observer: MutationObserver | undefined;

  /** The rendered `<nav>`. */
  abstract get navElement(): HTMLElement | undefined;

  override connectedCallback(): void {
    this.setAttribute('data-m3e-navigation', '');
    super.connectedCallback();
    this.#observer = new MutationObserver((records) => {
      // Changes to the items (or the header content), not to what this element rendered.
      if (records.some((r) => !this.isRendered(r.target))) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** Whether `node` is inside what this element rendered (its mutations need no update). */
  protected isRendered(node: Node): boolean {
    return this.navElement?.contains(node) ?? false;
  }

  /** Drops every rendered item element (the next render creates new ones, e.g. another DOM). */
  protected resetItemElements(): void {
    for (const el of this.#rendered.values()) this.#ripples.get(el)?.abort();
    this.#rendered.clear();
  }

  /** Light-DOM children that are not items (a rail's header content). */
  protected extraChildren(root: Element): Element[] {
    return [...this.children].filter(
      (child) => child !== root && !(child instanceof M3eNavigationItem),
    );
  }

  /** The `<m3e-navigation-item>` children, in order. */
  protected items(): M3eNavigationItem[] {
    return [...this.children].filter((c): c is M3eNavigationItem => c instanceof M3eNavigationItem);
  }

  /** Renders the items into `nav` after `after` (the header) and wires their presses. */
  protected renderItems(nav: HTMLElement, after: Element | null): void {
    const rows = this.renderItemElements(this.items());
    const expected = after ? [after, ...rows] : rows;
    const current = [...nav.children];
    if (current.length !== expected.length || expected.some((e, i) => current[i] !== e)) {
      nav.replaceChildren(...expected);
    }
  }

  /**
   * Renders (creating or reusing) one element per item, drops the ones of removed items and
   * returns them in order. The DOM comes from {@link createItemElement} / {@link fillItemElement}.
   */
  protected renderItemElements(items: readonly M3eNavigationItem[]): HTMLElement[] {
    const doc = this.ownerDocument;
    for (const [item, el] of [...this.#rendered]) {
      if (!items.includes(item)) {
        this.#ripples.get(el)?.abort();
        this.#rendered.delete(item);
      }
    }
    const selected = this.selected ?? null;
    return items.map((item) => {
      const link = Boolean(item.href);
      let el = this.#rendered.get(item);
      if (el && (el.localName === 'a') !== link) {
        this.#ripples.get(el)?.abort();
        el = undefined;
      }
      if (!el) {
        el = doc.createElement(link ? 'a' : 'button');
        const abort = new AbortController();
        this.createItemElement(doc, el, abort.signal);
        this.#ripples.set(el, abort);
        el.addEventListener('click', this.#onClick);
        this.#rendered.set(item, el);
      }
      this.fillItemElement(doc, item, el, item.key === selected);
      this.#keys.set(el, item.key);
      return el;
    });
  }

  /**
   * Builds a new item's fixed DOM inside `el` (`<a>` or `<button>`) and its ripple: the bar /
   * rail item (`item-element.js`) or the drawer item (`drawer-item.js`).
   */
  protected abstract createItemElement(doc: Document, el: HTMLElement, signal: AbortSignal): void;

  /** Writes an item's attributes (React Aria's link / button attributes) and content. */
  protected abstract fillItemElement(
    doc: Document,
    item: M3eNavigationItem,
    el: HTMLElement,
    selected: boolean,
  ): void;

  #onClick = (e: MouseEvent): void => {
    const el = e.currentTarget as HTMLElement;
    if (el.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      return;
    }
    const value = this.#keys.get(el);
    if (value === undefined) return;
    if (this.emit('selection-change', { value }, { cancelable: true })) this.selected = value;
  };
}

/** Events of the navigation containers (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eNavigationContainerEventMap extends HTMLElementEventMap {
  /** A destination was picked; cancelable: `preventDefault()` keeps the selection. */
  'selection-change': CustomEvent<SelectionChangeDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eNavigationContainer {
  addEventListener<K extends keyof M3eNavigationContainerEventMap>(
    type: K,
    listener: (this: M3eNavigationContainer, ev: M3eNavigationContainerEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eNavigationContainerEventMap>(
    type: K,
    listener: (this: M3eNavigationContainer, ev: M3eNavigationContainerEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
