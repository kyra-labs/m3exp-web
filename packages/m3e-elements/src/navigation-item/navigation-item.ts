import { M3eElement } from '../base/M3eElement.js';
import { attachRipple } from '../base/ripple.js';

const ITEM = 'm3e-navigation-item';

/**
 * `<m3e-navigation-item value="home" icon="home" href="/">Home</m3e-navigation-item>` — data for
 * one destination of a `<m3e-short-navigation-bar>`, `<m3e-wide-navigation-rail>` or
 * `<m3e-modal-wide-navigation-rail>` (it renders nothing itself; the container renders the
 * `.m3e-navigation-item` contract): `value` (default: the label), `icon` (Material Symbols,
 * filled while selected), `href` (renders a link; otherwise a button that only selects),
 * `disabled`, `label-hidden` (icon only; the label becomes the accessible name). The label is the
 * text content.
 */
export class M3eNavigationItem extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    value: {},
    icon: {},
    href: {},
    disabled: { type: Boolean },
    labelHidden: { type: Boolean },
  };

  declare value: string | null | undefined;
  declare icon: string | null | undefined;
  declare href: string | null | undefined;
  declare disabled: boolean | undefined;
  declare labelHidden: boolean | undefined;

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

function span(doc: Document, className: string, text?: string, hidden = true): HTMLSpanElement {
  const el = doc.createElement('span');
  el.className = className;
  if (hidden) el.setAttribute('aria-hidden', 'true');
  if (text !== undefined) el.textContent = text;
  return el;
}

const setAttr = (el: Element, name: string, value: string | null) => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

/**
 * Base of the navigation bar / rail elements: renders their `<m3e-navigation-item>` children as
 * the m3e-css `.m3e-navigation-item` contract, exactly as m3e-react's NavigationItem does (React
 * Aria's link / button attributes included), and tracks the selection.
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
      const nav = this.navElement;
      // Changes to the items (or the header content), not to what this element rendered.
      if (records.some((r) => !nav?.contains(r.target))) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** Light-DOM children that are not items (a rail's header content). */
  protected extraChildren(root: Element): Element[] {
    return [...this.children].filter(
      (child) => child !== root && !(child instanceof M3eNavigationItem),
    );
  }

  /** Renders the items into `nav` after `after` (the header) and wires their presses. */
  protected renderItems(nav: HTMLElement, after: Element | null): void {
    const doc = this.ownerDocument;
    const items = [...this.children].filter(
      (c): c is M3eNavigationItem => c instanceof M3eNavigationItem,
    );
    for (const [item, el] of [...this.#rendered]) {
      if (!items.includes(item)) {
        this.#ripples.get(el)?.abort();
        this.#rendered.delete(item);
      }
    }
    const selected = this.selected ?? null;
    const rows = items.map((item) => {
      const link = Boolean(item.href);
      let el = this.#rendered.get(item);
      if (el && (el.localName === 'a') !== link) {
        this.#ripples.get(el)?.abort();
        el = undefined;
      }
      if (!el) {
        el = doc.createElement(link ? 'a' : 'button');
        el.className = ITEM;
        const content = span(doc, `${ITEM}__content`, undefined, false);
        const state = span(doc, `${ITEM}__state`);
        content.append(span(doc, `${ITEM}__indicator`), state);
        el.append(content);
        const abort = new AbortController();
        attachRipple(state, abort.signal, el);
        this.#ripples.set(el, abort);
        el.addEventListener('click', this.#onClick);
        this.#rendered.set(item, el);
      }
      this.#renderItem(doc, item, el, item.key === selected);
      this.#keys.set(el, item.key);
      return el;
    });
    const expected = after ? [after, ...rows] : rows;
    const current = [...nav.children];
    if (current.length !== expected.length || expected.some((e, i) => current[i] !== e)) {
      nav.replaceChildren(...expected);
    }
  }

  #renderItem(doc: Document, item: M3eNavigationItem, el: HTMLElement, selected: boolean): void {
    const disabled = Boolean(item.disabled);
    const label = item.textContent.trim();
    const link = el.localName === 'a';
    // React Aria: useLink keeps href (tabindex 0) unless disabled; useButton disables the button.
    setAttr(el, 'href', link && !disabled ? (item.href ?? '') : null);
    setAttr(el, 'tabindex', disabled ? null : '0');
    setAttr(el, 'type', link ? null : 'button');
    setAttr(el, 'disabled', !link && disabled ? '' : null);
    setAttr(el, 'aria-disabled', disabled ? 'true' : null);
    setAttr(el, 'aria-current', selected ? 'page' : null);
    setAttr(el, 'aria-label', item.labelHidden ? label : null);
    const content = el.firstElementChild;
    if (!content) return;
    let icon = content.querySelector(`:scope > .${ITEM}__icon`);
    if (!icon) {
      icon = span(doc, `m3e-icon ${ITEM}__icon`);
      content.append(icon);
    }
    if (icon.textContent !== (item.icon ?? '')) icon.textContent = item.icon ?? '';
    let text = content.querySelector(`:scope > .${ITEM}__label`);
    if (item.labelHidden) {
      text?.remove();
    } else {
      if (!text) {
        text = span(doc, `${ITEM}__label`, undefined, false);
        content.append(text);
      }
      if (text.textContent !== label) text.textContent = label;
    }
  }

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
