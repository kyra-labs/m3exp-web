import { M3eElement } from '../base/M3eElement.js';
import { attachRipple } from '../base/ripple.js';
import { TypeSelect } from '../base/type-select.js';
import { type MenuAnchorPosition, MenuPopup } from '../menu-popup/menu-popup.js';
import type { OpenChangeDetail } from '../base/events.js';

/** Where focus goes when a menu opens: an item, or the menu itself (pointer opens). */
export type MenuFocusStrategy = 'first' | 'last' | null;

/** React Aria useSubmenuTrigger's default hover delay before a submenu opens. */
const SUBMENU_DELAY_MS = 200;

let nextId = 0;
/** Ids for the rendered contract (labels, items, the menu itself). */
const uid = () => `m3e-menu-${String(++nextId)}`;

const isItem = (el: Element | null): el is HTMLElement =>
  el instanceof HTMLElement && el.classList.contains('m3e-menu__item');
const isDisabled = (el: Element) => el.getAttribute('aria-disabled') === 'true';

/**
 * `<m3e-menu-item value="edit" icon="edit" supporting-text="…" trailing-text="⌘E">Edit</m3e-menu-item>`
 * — data for one item of a `<m3e-menu>` (it renders nothing itself; the menu renders
 * `.m3e-menu__item`). `type="checkbox"` / `type="radio"` make it checkable / selectable
 * (`checked`); `checked-icon` replaces `icon` while checked (alone, it expands in);
 * `submenu="<id>"` opens another `<m3e-menu>`. The label is the text content.
 */
export class M3eMenuItem extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    value: {},
    type: {},
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean },
    icon: {},
    checkedIcon: {},
    trailingIcon: {},
    trailingText: {},
    supportingText: {},
    submenu: {},
  }))();

  declare value: string | null | undefined;
  declare type: string | null | undefined;
  declare checked: boolean | undefined;
  declare disabled: boolean | undefined;
  declare icon: string | null | undefined;
  declare checkedIcon: string | null | undefined;
  declare trailingIcon: string | null | undefined;
  declare trailingText: string | null | undefined;
  declare supportingText: string | null | undefined;
  declare submenu: string | null | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
  }

  protected override update(): void {
    this.closest<M3eMenu>('m3e-menu')?.requestUpdate();
  }
}

/** `action` detail of a `<m3e-menu-item>` (it bubbles through its `<m3e-menu>`). */
export interface MenuActionDetail {
  /** The item's `value`, else its label. */
  value: string;
  /** A checkbox or radio item's state after the activation; null for a plain item. */
  checked: boolean | null;
}

/** Events of `<m3e-menu-item>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eMenuItemEventMap extends HTMLElementEventMap {
  /** Activated (it bubbles to the menu). */
  action: CustomEvent<MenuActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eMenuItem {
  addEventListener<K extends keyof M3eMenuItemEventMap>(
    type: K,
    listener: (this: M3eMenuItem, ev: M3eMenuItemEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eMenuItemEventMap>(
    type: K,
    listener: (this: M3eMenuItem, ev: M3eMenuItemEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

/**
 * `<m3e-menu-group label="Navigation" divider>` — a group of `<m3e-menu-item>`s (Compose
 * DropdownMenuGroup): its own surface, separated from the next group by a gap. Without `label`,
 * give it an `aria-label`. `divider` draws a divider under the label.
 */
export class M3eMenuGroup extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    label: {},
    divider: { type: Boolean },
    groupLabel: { attribute: 'aria-label' },
  }))();

  declare label: string | null | undefined;
  declare divider: boolean | undefined;
  declare groupLabel: string | null | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
  }

  protected override update(): void {
    this.closest<M3eMenu>('m3e-menu')?.requestUpdate();
  }
}

interface ItemRecord {
  el: HTMLDivElement;
  labelId: string;
  extraId: string;
  trailingId: string;
}

/**
 * `<m3e-menu anchor="more-button" variant="vibrant" label="Edit">` (COMPONENT_SPEC §21). Renders
 * the m3e-css `.m3e-menu` contract inside itself (the host is `display: contents`) from its
 * `<m3e-menu-item>` / `<m3e-menu-group>` children, as a `popover="manual"` placed and animated by
 * {@link MenuPopup} (Compose DropdownMenuPositionProvider + open/close springs).
 *
 * - `anchor`: id of the trigger. It gets `aria-haspopup`, `aria-expanded` and `aria-controls`;
 *   a click toggles the menu, Enter/Space/ArrowDown open it on the first item, ArrowUp on the last.
 *   `anchorElement` sets the trigger directly.
 * - `open` (reflected), `variant` (`standard` | `vibrant` | `baseline`), `position` (`below` |
 *   `above` | `start` | `end` | `left` | `right`), `label` (the menu's accessible name; default:
 *   labelled by the anchor).
 * - Keyboard (APG menu, as React Aria's useMenu): ArrowUp/Down (wrapping), Home/End, typeahead,
 *   Enter/Space activate, Escape closes and returns focus to the trigger, Tab closes and moves on,
 *   ArrowRight (ArrowLeft in RTL) opens a submenu and ArrowLeft closes it.
 * - Events: `action` on the `<m3e-menu-item>` (bubbles) with `detail: { value, checked }`;
 *   `open-change` on the menu with `detail: { open }`.
 */
export class M3eMenu extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    open: { type: Boolean, reflect: true },
    anchor: {},
    variant: {},
    position: {},
    label: {},
  }))();

  declare open: boolean | undefined;
  declare anchor: string | null | undefined;
  declare variant: string | null | undefined;
  declare position: string | null | undefined;
  declare label: string | null | undefined;

  /** The menu root (`.m3e-menu`). */
  #root: HTMLDivElement | undefined;
  #popup: MenuPopup | undefined;
  #items = new Map<M3eMenuItem, ItemRecord>();
  #groups = new Map<M3eMenuGroup, { el: HTMLDivElement; labelId: string }>();
  #observer: MutationObserver | undefined;
  #anchorEl: HTMLElement | null = null;
  #anchorOverride: HTMLElement | null = null;
  #anchorAbort: AbortController | undefined;
  #parent: M3eMenu | null = null;
  #openSubmenu: M3eMenu | null = null;
  #focusOnOpen: MenuFocusStrategy = null;
  #shown = false;
  #typeahead = new TypeSelect();
  #submenuTimer = 0;
  #keyboard = false;
  #keysBound = false;

  /** The trigger element (overrides `anchor`). Submenus get their parent item here. */
  get anchorElement(): HTMLElement | null {
    return this.#anchorOverride ?? this.#anchorEl;
  }

  set anchorElement(el: HTMLElement | null) {
    this.#anchorOverride = el;
    this.requestUpdate('anchor');
  }

  /** The rendered `.m3e-menu` element. */
  get menuElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Item/group children and label text changing re-render (the menu's own DOM is skipped).
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => !this.#root?.contains(r.target) && r.target !== this.#root)) {
        this.requestUpdate();
      }
    });
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#anchorAbort?.abort();
    this.#popup?.destroy();
    this.#shown = false;
    this.#typeahead.reset();
    clearTimeout(this.#submenuTimer);
  }

  /** Opens the menu, focusing its first or last item, or the menu itself (null). */
  show(focus: MenuFocusStrategy = null): void {
    this.#focusOnOpen = focus;
    if (this.open) this.#focusInitial();
    this.open = true;
  }

  /** Closes the menu (and its open submenu). */
  hide(): void {
    this.open = false;
  }

  toggle(focus: MenuFocusStrategy = null): void {
    if (this.open) this.hide();
    else this.show(focus);
  }

  protected override update(changed: ReadonlySet<string>): void {
    const root = this.#render();
    if (changed.has('anchor')) this.#bindAnchor();
    this.#syncAnchor();
    if (this.open && !this.#shown) this.#doShow(root);
    else if (!this.open && this.#shown) this.#doHide();
    else if (this.#shown) this.#popup?.position();
  }

  // --- Rendering --------------------------------------------------------------------------

  #render(): HTMLDivElement {
    const doc = this.ownerDocument;
    if (!this.#root) {
      this.#root = doc.createElement('div');
      trackHover(this.#root);
    }
    const root = this.#root;
    if (root.parentNode !== this) this.append(root);
    root.id ||= uid();
    const variant = this.variant === 'vibrant' || this.variant === 'baseline' ? this.variant : null;
    root.className = variant ? `m3e-menu m3e-menu--${variant}` : 'm3e-menu';
    root.setAttribute('role', 'menu');
    root.setAttribute('popover', 'manual');
    const anchor = this.label ? null : this.anchorElement;
    if (anchor) anchor.id ||= uid();
    attr(root, 'aria-label', this.label);
    attr(root, 'aria-labelledby', anchor?.id);

    const children: HTMLElement[] = [];
    const seenItems = new Set<M3eMenuItem>();
    const seenGroups = new Set<M3eMenuGroup>();
    for (const child of this.children) {
      if (child instanceof M3eMenuGroup) {
        seenGroups.add(child);
        children.push(this.#renderGroup(child, seenItems));
      } else if (child instanceof M3eMenuItem) {
        seenItems.add(child);
        children.push(this.#renderItem(child));
      }
    }
    for (const item of this.#items.keys()) if (!seenItems.has(item)) this.#items.delete(item);
    for (const group of this.#groups.keys()) if (!seenGroups.has(group)) this.#groups.delete(group);
    replaceChildrenIfChanged(root, children);

    // Roving tabindex (React Aria: the focused item is 0, the menu is 0 until an item is).
    const focused =
      this.#items.size > 0 && root.contains(doc.activeElement) && isItem(doc.activeElement);
    root.tabIndex = focused ? -1 : 0;
    for (const { el } of this.#items.values()) {
      if (isDisabled(el)) el.removeAttribute('tabindex');
      else el.tabIndex = el === doc.activeElement ? 0 : -1;
    }
    return root;
  }

  #renderGroup(group: M3eMenuGroup, seenItems: Set<M3eMenuItem>): HTMLDivElement {
    const doc = this.ownerDocument;
    let record = this.#groups.get(group);
    if (!record) {
      record = { el: doc.createElement('div'), labelId: uid() };
      this.#groups.set(group, record);
      trackHover(record.el);
    }
    const { el, labelId } = record;
    el.className = 'm3e-menu__group';
    el.setAttribute('role', 'group');
    attr(el, 'aria-labelledby', group.label ? labelId : null);
    attr(el, 'aria-label', group.label ? null : group.groupLabel);
    const parts: HTMLElement[] = [];
    // Reused, so an unchanged group keeps its children (and a focused item its focus).
    if (group.label) {
      const label =
        el.querySelector<HTMLElement>(':scope > .m3e-menu__label') ??
        create(doc, 'div', 'm3e-menu__label', { role: 'presentation', id: labelId });
      label.textContent = group.label;
      parts.push(label);
    }
    if (group.divider) {
      parts.push(
        el.querySelector<HTMLElement>(':scope > .m3e-menu__divider') ??
          create(doc, 'div', 'm3e-menu__divider', { role: 'separator' }),
      );
    }
    for (const child of group.children) {
      if (child instanceof M3eMenuItem) {
        seenItems.add(child);
        parts.push(this.#renderItem(child));
      }
    }
    replaceChildrenIfChanged(el, parts);
    return el;
  }

  #renderItem(item: M3eMenuItem): HTMLDivElement {
    const doc = this.ownerDocument;
    let record = this.#items.get(item);
    if (!record) {
      const el = doc.createElement('div');
      record = {
        el,
        labelId: uid(),
        extraId: uid(),
        trailingId: uid(),
      };
      el.id = uid();
      this.#items.set(item, record);
      attachRipple(el, new AbortController().signal);
      // Pointer and virtual (screen reader) clicks; Enter/Space are handled on keydown.
      el.addEventListener('click', () => {
        this.#activate(item, null);
      });
      el.addEventListener('pointerenter', (e) => {
        this.#onItemHover(item, el, e);
      });
    }
    const { el, labelId, extraId, trailingId } = record;
    const type = item.type === 'checkbox' || item.type === 'radio' ? item.type : null;
    const checked = type !== null && Boolean(item.checked);
    const submenu = item.submenu ? this.#submenuFor(item) : null;
    const expanded = submenu !== null && this.#openSubmenu === submenu;
    el.className = 'm3e-menu__item';
    el.setAttribute('role', type ? `menuitem${type}` : 'menuitem');
    attr(el, 'aria-checked', type && String(checked));
    attr(el, 'aria-disabled', item.disabled && 'true');
    el.setAttribute('aria-labelledby', labelId);
    attr(el, 'aria-haspopup', submenu && 'menu');
    attr(el, 'aria-expanded', submenu && String(expanded));
    attr(el, 'aria-controls', expanded ? submenu.#root?.id : null);

    const parts: Node[] = [];
    const leading =
      checked && item.checkedIcon ? item.checkedIcon : (item.icon ?? item.checkedIcon);
    if (leading) {
      const toggle = !item.icon && item.checkedIcon ? ' m3e-menu__item-leading--toggle' : '';
      parts.push(create(doc, 'span', `m3e-menu__item-leading${toggle}`, {}, icon(doc, leading)));
    }
    const described: string[] = [];
    const text = create(
      doc,
      'span',
      'm3e-menu__item-text',
      {},
      create(doc, 'span', 'm3e-menu__item-label', { id: labelId }, labelText(item)),
    );
    if (item.supportingText) {
      text.append(
        create(doc, 'span', 'm3e-menu__item-supporting', { id: extraId }, item.supportingText),
      );
      described.push(extraId);
    }
    parts.push(text);
    if (item.trailingText) {
      parts.push(
        create(doc, 'span', 'm3e-menu__item-trailing', { id: trailingId }, item.trailingText),
      );
      described.push(trailingId);
    } else if (item.trailingIcon) {
      parts.push(create(doc, 'span', 'm3e-menu__item-trailing', {}, icon(doc, item.trailingIcon)));
    }
    attr(el, 'aria-describedby', described.join(' '));
    el.replaceChildren(...parts);
    return el;
  }

  // --- Anchor ----------------------------------------------------------------------------

  #bindAnchor(): void {
    this.#anchorAbort?.abort();
    this.#anchorAbort = undefined;
    const root = this.getRootNode() as Document | ShadowRoot;
    this.#anchorEl =
      this.anchor && 'getElementById' in root ? root.getElementById(this.anchor) : null;
    const anchor = this.#anchorEl;
    if (!anchor || this.#anchorOverride) return;
    const controller = new AbortController();
    this.#anchorAbort = controller;
    const { signal } = controller;
    anchor.addEventListener(
      'click',
      (e) => {
        // A keyboard click on a <button> (Enter/Space) has detail 0: focus the first item.
        this.toggle(e.detail === 0 ? 'first' : null);
      },
      { signal },
    );
    anchor.addEventListener(
      'keydown',
      (e) => {
        const button = anchor instanceof HTMLButtonElement;
        if (
          e.key === 'ArrowDown' ||
          e.key === 'ArrowUp' ||
          (!button && (e.key === 'Enter' || e.key === ' '))
        ) {
          e.preventDefault();
          this.show(e.key === 'ArrowUp' ? 'last' : 'first');
        }
      },
      { signal },
    );
  }

  #syncAnchor(): void {
    const anchor = this.anchorElement;
    if (!anchor || this.#parent) return;
    anchor.setAttribute('aria-haspopup', 'true');
    anchor.setAttribute('aria-expanded', String(Boolean(this.open)));
    if (this.open && this.#root) anchor.setAttribute('aria-controls', this.#root.id);
    else anchor.removeAttribute('aria-controls');
  }

  // --- Open / close ----------------------------------------------------------------------

  #doShow(root: HTMLDivElement): void {
    const anchor = this.anchorElement;
    if (!anchor) return;
    this.#shown = true;
    const parent = this.#parent;
    this.#popup ??= new MenuPopup(root, parent ? (parent.#popup ?? null) : null);
    if (!this.#keysBound) {
      this.#keysBound = true;
      this.listen(root, 'keydown', (e) => {
        this.#onKeyDown(e);
      });
      this.listen(root, 'pointermove', () => {
        this.#keyboard = false;
      });
    }
    this.#popup.open({
      anchor,
      position: (this.position as MenuAnchorPosition | null) ?? (this.#parent ? 'end' : 'below'),
      onDismiss: this.#parent
        ? undefined
        : () => {
            this.hide();
          },
    });
    this.#focusInitial();
    this.emit('open-change', { open: true });
  }

  #doHide(): void {
    this.#shown = false;
    this.#closeSubmenu();
    clearTimeout(this.#submenuTimer);
    const root = this.#root;
    if (root?.contains(this.ownerDocument.activeElement)) {
      this.anchorElement?.focus({ preventScroll: true });
    }
    this.#popup?.close();
    this.emit('open-change', { open: false });
  }

  #focusInitial(): void {
    const items = this.#enabledItems();
    const target =
      this.#focusOnOpen === 'first'
        ? items[0]
        : this.#focusOnOpen === 'last'
          ? items.at(-1)
          : (items.find((i) => i.getAttribute('aria-checked') === 'true') ?? this.#root);
    this.#focus(target ?? this.#root);
  }

  #focus(el: HTMLElement | undefined): void {
    if (!el) return;
    // Focus moving to another item closes the open submenu (React Aria useSubmenuTrigger).
    if (this.#openSubmenu && el !== this.#openSubmenu.anchorElement) this.#closeSubmenu();
    el.focus({ preventScroll: true });
    if (this.#root) {
      this.#root.tabIndex = isItem(el) ? -1 : 0;
      for (const { el: item } of this.#items.values()) {
        if (!isDisabled(item)) item.tabIndex = item === el ? 0 : -1;
      }
    }
  }

  /** The root menu of this chain. */
  #rootMenu(): M3eMenu {
    return this.#parent ? this.#parent.#rootMenu() : this;
  }

  /** Closes the whole chain and returns focus to the root trigger. */
  #closeAll(): void {
    const root = this.#rootMenu();
    root.anchorElement?.focus({ preventScroll: true });
    root.hide();
  }

  // --- Items -----------------------------------------------------------------------------

  #enabledItems(): HTMLElement[] {
    return [...(this.#root?.querySelectorAll<HTMLElement>('.m3e-menu__item') ?? [])].filter(
      (el) => !isDisabled(el),
    );
  }

  #configFor(el: Element): M3eMenuItem | undefined {
    for (const [item, record] of this.#items) if (record.el === el) return item;
    return undefined;
  }

  #submenuFor(item: M3eMenuItem): M3eMenu | null {
    const root = this.getRootNode() as Document | ShadowRoot;
    const el = item.submenu && 'getElementById' in root ? root.getElementById(item.submenu) : null;
    return el instanceof M3eMenu && el !== this ? el : null;
  }

  /** React Aria useMenuItem: what activating an item does, and whether the menu closes. */
  #activate(item: M3eMenuItem, key: 'Enter' | ' ' | null): void {
    if (item.disabled) return;
    const submenu = this.#submenuFor(item);
    if (submenu) {
      this.#openSubmenuFor(item, key ? 'first' : null);
      return;
    }
    const type = item.type === 'checkbox' || item.type === 'radio' ? item.type : null;
    if (type === 'checkbox') item.checked = !item.checked;
    else if (type === 'radio' && !item.checked) {
      for (const sibling of item.parentElement?.children ?? []) {
        if (sibling instanceof M3eMenuItem && sibling.type === 'radio') sibling.checked = false;
      }
      item.checked = true;
    }
    this.requestUpdate();
    item.dispatchEvent(
      new CustomEvent('action', {
        bubbles: true,
        composed: true,
        detail: {
          value: item.value ?? labelText(item),
          checked: type ? Boolean(item.checked) : null,
        },
      }),
    );
    // Pointer: close unless checkable; keyboard: Enter closes, Space only closes plain items.
    const close = key === null ? type !== 'checkbox' : key === 'Enter' || type === null;
    if (close) this.#closeAll();
  }

  #onItemHover(item: M3eMenuItem, el: HTMLElement, e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || item.disabled) return;
    if (!this.#keyboard) this.#focus(el);
    clearTimeout(this.#submenuTimer);
    const submenu = this.#submenuFor(item);
    if (submenu === this.#openSubmenu) return;
    this.#closeSubmenu();
    if (submenu) {
      this.#submenuTimer = window.setTimeout(() => {
        this.#openSubmenuFor(item, null);
      }, SUBMENU_DELAY_MS);
    }
  }

  #openSubmenuFor(item: M3eMenuItem, focus: MenuFocusStrategy): void {
    const submenu = this.#submenuFor(item);
    const el = this.#items.get(item)?.el;
    if (!submenu || !el) return;
    clearTimeout(this.#submenuTimer);
    if (this.#openSubmenu !== submenu) this.#closeSubmenu();
    this.#openSubmenu = submenu;
    submenu.#parent = this;
    submenu.anchorElement = el;
    submenu.show(focus);
    this.requestUpdate();
  }

  #closeSubmenu(): void {
    const submenu = this.#openSubmenu;
    if (!submenu) return;
    this.#openSubmenu = null;
    submenu.hide();
    this.requestUpdate();
  }

  // --- Keyboard ----------------------------------------------------------------------------

  #onKeyDown(e: KeyboardEvent): void {
    this.#keyboard = true;
    const root = this.#root;
    if (!root) return;
    const target = e.target as HTMLElement;
    // Keys from a submenu rendered inside this menu's DOM are its own business.
    if (target.closest('.m3e-menu') !== root) return;
    const items = this.#enabledItems();
    const current = isItem(target) ? target : null;
    const index = current ? items.indexOf(current) : -1;
    const rtl = getComputedStyle(root).direction === 'rtl';
    const config = current ? this.#configFor(current) : undefined;
    const move = (i: number) => {
      e.preventDefault();
      this.#focus(items[(i + items.length) % items.length]);
    };
    switch (e.key) {
      case 'ArrowDown':
        move(index + 1);
        return;
      case 'ArrowUp':
        move(index === -1 ? -1 : index - 1);
        return;
      case 'Home':
        move(0);
        return;
      case 'End':
        move(-1);
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (this.#parent) {
          const parentItem = this.anchorElement;
          this.hide();
          parentItem?.focus({ preventScroll: true });
        } else {
          this.anchorElement?.focus({ preventScroll: true });
          this.hide();
        }
        return;
      case 'Tab':
        this.#closeAll();
        return;
      case 'Enter':
        if (config) {
          e.preventDefault();
          this.#activate(config, 'Enter');
        }
        return;
      case 'ArrowRight':
      case 'ArrowLeft': {
        const forward = (e.key === 'ArrowRight') !== rtl;
        if (forward && config && this.#submenuFor(config)) {
          e.preventDefault();
          this.#openSubmenuFor(config, 'first');
        } else if (!forward && this.#parent) {
          e.preventDefault();
          const parentItem = this.anchorElement;
          this.hide();
          parentItem?.focus({ preventScroll: true });
        }
        return;
      }
      default:
        break;
    }
    if (e.key === ' ' && !this.#typeahead.active) {
      if (config) {
        e.preventDefault();
        this.#activate(config, ' ');
      }
      return;
    }
    // React Aria useTypeSelect + ListKeyboardDelegate.getKeyForSearch.
    const texts = items.map((el) => el.querySelector('.m3e-menu__item-label')?.textContent ?? '');
    const found = this.#typeahead.type(e, texts, current ? items.indexOf(current) : -1);
    if (found >= 0) {
      e.preventDefault();
      this.#focus(items[found]);
    }
  }
}

/** Events of `<m3e-menu>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eMenuEventMap extends HTMLElementEventMap {
  /** Opened or closed (after the change). */
  'open-change': CustomEvent<OpenChangeDetail>;
  /** An item was activated (from the `<m3e-menu-item>`, bubbling). */
  action: CustomEvent<MenuActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eMenu {
  addEventListener<K extends keyof M3eMenuEventMap>(
    type: K,
    listener: (this: M3eMenu, ev: M3eMenuEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eMenuEventMap>(
    type: K,
    listener: (this: M3eMenu, ev: M3eMenuEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

const labelText = (item: M3eMenuItem) => item.textContent.trim();

/**
 * `data-hovered` once the pointer entered a surface (Compose `hasBeenHovered`): a group, or a root
 * that is its own surface (not grouped, not baseline), takes the inactive shape when left.
 */
function trackHover(surface: HTMLElement): void {
  surface.addEventListener('pointerenter', () => {
    if (
      surface.classList.contains('m3e-menu__group') ||
      !(
        surface.querySelector(':scope > .m3e-menu__group') ||
        surface.classList.contains('m3e-menu--baseline')
      )
    ) {
      surface.setAttribute('data-hovered', '');
    }
  });
}

/** Sets `name`, or removes it when `value` is empty. */
function attr(el: Element, name: string, value: string | false | null | undefined): void {
  if (value) el.setAttribute(name, value);
  else el.removeAttribute(name);
}

function create(
  doc: Document,
  tag: string,
  className: string,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElement {
  const el = doc.createElement(tag);
  el.className = className;
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  el.append(...children);
  return el;
}

/** The `.m3e-icon` contract (decorative), as `<m3e-icon>` and m3e-react's `<Icon>` render it. */
const icon = (doc: Document, name: string) =>
  create(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' }, name);

/** Replaces `parent`'s children only when they differ, so a focused item keeps focus. */
function replaceChildrenIfChanged(parent: HTMLElement, children: readonly HTMLElement[]): void {
  const current = parent.children;
  if (current.length === children.length && children.every((c, i) => current[i] === c)) return;
  parent.replaceChildren(...children);
}
