import { M3eElement } from '../base/M3eElement.js';
import { badgeContent, nameWithBadge, renderBadgedBox } from '../base/badge.js';
import { attachRipple } from '../base/ripple.js';
import { TabsLayout } from '../tabs-layout/tabs-layout.js';
import type { SelectionChangeDetail } from '../base/events.js';

const BLOCK = 'm3e-tabs';
const TAB = 'm3e-tab';

let instances = 0;

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

const span = (doc: Document, className: string): HTMLSpanElement => {
  const el = doc.createElement('span');
  el.className = className;
  return el;
};

/** Asks the `<m3e-tabs>` parent to re-render. */
const requestParentUpdate = (el: Element) => {
  const parent = el.parentElement;
  if (parent instanceof M3eTabs) parent.requestUpdate();
};

/**
 * `<m3e-tab value="photos" icon="photo">Photos</m3e-tab>` — data for one tab of a `<m3e-tabs>`
 * (it renders nothing itself; the row renders the `.m3e-tab` contract): `value` (default: the
 * label), `icon` (Material Symbols, filled while selected), `disabled`, `label-hidden` (icon only;
 * the label becomes the accessible name), `badge` (a Compose Badge on the label; on the icon when
 * the label is hidden or sits under the icon (a stacked tab, D20 (1)): `""` the dot, digits a
 * count — `999+` above 999 — other text as is) and `badge-label` (its visually hidden text, read
 * after the label: default "New notification" for the dot, the shown text otherwise; `""` leaves
 * it out). The label is the text content.
 */
export class M3eTab extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    value: {},
    icon: {},
    disabled: { type: Boolean },
    labelHidden: { type: Boolean },
    badge: {},
    badgeLabel: {},
  }))();

  declare value: string | null | undefined;
  declare icon: string | null | undefined;
  declare disabled: boolean | undefined;
  declare labelHidden: boolean | undefined;
  declare badge: string | null | undefined;
  declare badgeLabel: string | null | undefined;

  /** The tab's key: `value`, else its label. */
  get key(): string {
    return this.value ?? this.textContent.trim();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
  }

  protected override update(): void {
    requestParentUpdate(this);
  }
}

/**
 * `<m3e-tab-panel value="photos">…</m3e-tab-panel>` — the content of the `<m3e-tab>` with the
 * same value, a child of the `<m3e-tabs>`. The row makes it the tab's `role="tabpanel"`
 * (`.m3e-tab-panel`, labelled by the tab, focusable) and hides it while the tab is not selected.
 */
export class M3eTabPanel extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    value: {},
  }))();

  declare value: string | null | undefined;

  protected override update(): void {
    requestParentUpdate(this);
  }
}

/**
 * `<m3e-tabs label="Media" selected="photos">` (COMPONENT_SPEC §17; Compose PrimaryTabRow /
 * SecondaryTabRow / PrimaryScrollableTabRow / SecondaryScrollableTabRow with Tab /
 * LeadingIconTab). Renders the m3e-css `.m3e-tabs` contract inside itself (the host is
 * `display: contents`) from its `<m3e-tab>` children, the DOM m3e-react's `<Tabs>` renders, and
 * wires its `<m3e-tab-panel>` children as the APG tab panels. m3e-elements' TabsLayout (shared
 * with m3e-react) moves the focus with the arrow keys, slides the indicator on Compose's spring
 * and scrolls a scrollable row to the selected tab.
 *
 * - Attributes: `variant` (`primary`, the default, or `secondary`), `scrollable`,
 *   `icon-position` (`top`, the default: icon above the label, or `leading`: Compose
 *   LeadingIconTab), `label` (the tablist's accessible name), `selected` (the selected tab's
 *   value, reflected; default: the first enabled tab). The host's `id` prefixes the tab and panel
 *   ids.
 * - Activation is manual (Compose, m3.material.io): arrows move the focus, a press, Enter or
 *   Space selects.
 * - Events: `selection-change` (`detail: { value }`) when another tab is pressed; cancelable:
 *   `preventDefault()` keeps the selection (controlled), otherwise `selected` follows.
 */
export class M3eTabs extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    variant: {},
    scrollable: { type: Boolean },
    iconPosition: {},
    label: {},
    selected: { reflect: true },
  }))();

  declare variant: string | null | undefined;
  declare scrollable: boolean | undefined;
  declare iconPosition: string | null | undefined;
  declare label: string | null | undefined;
  declare selected: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #list: HTMLDivElement | undefined;
  #layout: TabsLayout | undefined;
  #rendered = new Map<M3eTab, HTMLButtonElement>();
  #keys = new WeakMap<HTMLElement, string>();
  #ripples = new WeakMap<HTMLElement, AbortController>();
  #observer: MutationObserver | undefined;
  #instance = ++instances;

  /** The rendered `.m3e-tabs`. */
  get rootElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** TabsLayout's tab row behavior, while connected. */
  get layout(): TabsLayout | undefined {
    return this.#layout;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver((records) => {
      const root = this.#root;
      // Changes to the tabs, not to what this element rendered (or the panels' attributes).
      if (records.some((r) => !root?.contains(r.target) && r.type !== 'attributes')) {
        this.requestUpdate();
      }
    });
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const root = (this.#root ??= doc.createElement('div'));
    const list = (this.#list ??= doc.createElement('div'));
    const variant = this.variant === 'secondary' ? 'secondary' : 'primary';
    root.className = [
      BLOCK,
      `${BLOCK}--${variant}`,
      this.scrollable ? `${BLOCK}--scrollable` : '',
      this.iconPosition === 'leading' ? `${BLOCK}--leading-icon` : '',
    ]
      .filter(Boolean)
      .join(' ');
    list.className = `${BLOCK}__list`;
    setAttr(list, 'role', 'tablist');
    setAttr(list, 'aria-label', this.label ?? null);
    if (list.parentNode !== root) root.append(list);
    if (root.parentNode !== this) this.prepend(root);

    const tabs = [...this.children].filter((c): c is M3eTab => c instanceof M3eTab);
    const panels = [...this.children].filter((c): c is M3eTabPanel => c instanceof M3eTabPanel);
    const keys = tabs.map((t) => t.key);
    const selected =
      this.selected != null && keys.includes(this.selected)
        ? this.selected
        : (tabs.find((t) => !t.disabled)?.key ?? null);
    const base = this.id || `m3e-tabs-${String(this.#instance)}`;
    const panelOf = (key: string) => panels.find((p) => (p.value ?? '') === key);

    for (const [tab, el] of [...this.#rendered]) {
      if (!tabs.includes(tab)) {
        this.#ripples.get(el)?.abort();
        this.#rendered.delete(tab);
      }
    }
    const buttons = tabs.map((tab, index) => {
      let el = this.#rendered.get(tab);
      if (!el) {
        el = doc.createElement('button');
        el.className = TAB;
        el.append(span(doc, `${TAB}__content`));
        const abort = new AbortController();
        attachRipple(el, abort.signal);
        this.#ripples.set(el, abort);
        el.addEventListener('click', this.#onClick);
        this.#rendered.set(tab, el);
      }
      const key = tab.key;
      const panel = panelOf(key);
      this.#fill(doc, tab, el, {
        id: `${base}-tab-${String(index)}`,
        selected: key === selected,
        controls: panel ? panel.id || `${base}-panel-${String(index)}` : null,
      });
      this.#keys.set(el, key);
      return el;
    });
    const current = [...list.children];
    if (current.length !== buttons.length || buttons.some((b, i) => current[i] !== b)) {
      list.replaceChildren(...buttons);
    }

    for (const panel of panels) {
      const index = keys.indexOf(panel.value ?? '');
      if (!panel.classList.contains('m3e-tab-panel')) panel.classList.add('m3e-tab-panel');
      setAttr(panel, 'role', 'tabpanel');
      setAttr(panel, 'tabindex', '0');
      if (index < 0) {
        setAttr(panel, 'aria-labelledby', null);
        panel.hidden = true;
        continue;
      }
      if (!panel.id) panel.id = `${base}-panel-${String(index)}`;
      setAttr(panel, 'aria-labelledby', `${base}-tab-${String(index)}`);
      const hidden = keys[index] !== selected;
      if (panel.hidden !== hidden) panel.hidden = hidden;
    }

    this.#layout ??= new TabsLayout(root);
    this.#layout.update();
  }

  /** Writes a tab's attributes (React Aria's tab attributes) and content. */
  #fill(
    doc: Document,
    tab: M3eTab,
    el: HTMLButtonElement,
    { id, selected, controls }: { id: string; selected: boolean; controls: string | null },
  ): void {
    const label = tab.textContent.trim();
    setAttr(el, 'type', 'button');
    setAttr(el, 'role', 'tab');
    setAttr(el, 'id', id);
    setAttr(el, 'aria-selected', String(selected));
    setAttr(el, 'aria-controls', controls);
    setAttr(el, 'aria-disabled', tab.disabled ? 'true' : null);
    const content = el.firstElementChild as HTMLElement;
    let icon: Element | null = null;
    if (tab.icon) {
      icon = content.querySelector(`.${TAB}__icon`);
      if (!icon) {
        icon = span(doc, `m3e-icon ${TAB}__icon`);
        icon.setAttribute('aria-hidden', 'true');
      }
      if (icon.textContent !== tab.icon) icon.textContent = tab.icon;
    }
    let text: Element | null = null;
    if (!tab.labelHidden) {
      text = content.querySelector(`.${TAB}__label`) ?? span(doc, `${TAB}__label`);
      if (text.textContent !== label) text.textContent = label;
    }
    // The badge is read after the label. A stacked tab (icon above the label) badges its icon and
    // puts the label first in the DOM (D20 (1)); others badge the label (the icon, label hidden).
    const stacked = icon !== null && text !== null && this.iconPosition !== 'leading';
    const anchor = tab.labelHidden || stacked ? icon : text;
    const badge = anchor ? badgeContent(tab.badge, tab.badgeLabel) : null;
    setAttr(el, 'aria-label', tab.labelHidden ? nameWithBadge(label, badge) : null);
    const parts: Element[] = [];
    if (anchor && badge) {
      const box = content.querySelector(':scope > .m3e-badged-box');
      if (stacked && text) parts.push(text);
      else if (icon && !tab.labelHidden) parts.push(icon);
      parts.push(renderBadgedBox(doc, box, anchor, badge, !tab.labelHidden));
    } else {
      parts.push(...[icon, text].filter((p): p is Element => p !== null));
    }
    const current = [...content.children];
    if (current.length !== parts.length || parts.some((p, i) => current[i] !== p)) {
      content.replaceChildren(...parts);
    }
  }

  #onClick = (e: MouseEvent): void => {
    const el = e.currentTarget as HTMLElement;
    if (el.getAttribute('aria-disabled') === 'true') return;
    const value = this.#keys.get(el);
    if (value === undefined || el.getAttribute('aria-selected') === 'true') return;
    if (this.emit('selection-change', { value }, { cancelable: true })) this.selected = value;
  };
}

/** Events of `<m3e-tabs>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eTabsEventMap extends HTMLElementEventMap {
  /** A tab was picked; cancelable: `preventDefault()` keeps the selection. */
  'selection-change': CustomEvent<SelectionChangeDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eTabs {
  addEventListener<K extends keyof M3eTabsEventMap>(
    type: K,
    listener: (this: M3eTabs, ev: M3eTabsEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eTabsEventMap>(
    type: K,
    listener: (this: M3eTabs, ev: M3eTabsEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
