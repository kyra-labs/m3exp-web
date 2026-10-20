import { M3eElement } from '../base/M3eElement.js';
import { attachRipple } from '../base/ripple.js';
import { ButtonGroupLayout } from '../button-group-layout/button-group-layout.js';
import type { M3eMenu, M3eMenuItem } from '../menu/menu.js';
import type { TooltipController } from '../tooltip-popup/tooltip-popup.js';

/**
 * Compose `Strings.ButtonGroupMoreOptions` (androidMain res/values/strings.xml L19).
 * @internal Shared with m3e-react; not part of the public API.
 */
export const BUTTON_GROUP_MORE_OPTIONS = 'More options';

const VARIANTS = new Set(['standard', 'connected']);
const SIZES = new Set(['xs', 's', 'm', 'l', 'xl']);
const BUTTON_VARIANTS = new Set(['filled', 'tonal', 'elevated', 'outlined', 'text']);

const pick = (value: string | null | undefined, allowed: Set<string>, fallback: string) =>
  value && allowed.has(value) ? value : fallback;

/** Sets `name`, or removes it when `value` is empty. */
function attr(el: Element, name: string, value: string | false | null | undefined): void {
  if (value) el.setAttribute(name, value);
  else el.removeAttribute(name);
}

/** The `.m3e-icon` contract (decorative), as `<m3e-icon>` and m3e-react's `<Icon>` render it. */
function icon(doc: Document, name: string): HTMLSpanElement {
  const el = doc.createElement('span');
  el.className = 'm3e-icon';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = name;
  return el;
}

/** Replaces `parent`'s children only when they differ, so a focused item keeps focus. */
function replaceChildrenIfChanged(parent: Element, children: readonly Element[]): void {
  const current = parent.children;
  if (current.length === children.length && children.every((c, i) => current[i] === c)) return;
  parent.replaceChildren(...children);
}

/** `selection-change` (and the deprecated `change`) detail of `<m3e-button-group>`. */
export interface ButtonGroupChangeDetail {
  /** The item that changed. */
  value: string;
  /** Whether it is now selected. */
  selected: boolean;
  /** Every selected item's value. */
  values: string[];
}

/** `action` detail of a `<m3e-button-group-item>` (it bubbles to the group). */
export interface ButtonGroupActionDetail {
  value: string;
}

/**
 * `<m3e-button-group-item value="bold" icon="format_bold" selected>Bold</m3e-button-group-item>` —
 * data for one button of a `<m3e-button-group>` (it renders nothing itself). The label is the
 * text content; an icon-only item needs `label` (its accessible name). `variant` overrides the
 * group's `button-variant` for this item.
 */
export class M3eButtonGroupItem extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    value: {},
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean },
    icon: {},
    variant: {},
    label: {},
  };

  declare value: string | null | undefined;
  declare selected: boolean | undefined;
  declare disabled: boolean | undefined;
  declare icon: string | null | undefined;
  declare variant: string | null | undefined;
  declare label: string | null | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
  }

  protected override update(): void {
    this.closest<M3eButtonGroup>('m3e-button-group')?.requestUpdate();
  }
}

/** Events of `<m3e-button-group-item>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eButtonGroupItemEventMap extends HTMLElementEventMap {
  /** Activated (it bubbles to the group). */
  action: CustomEvent<ButtonGroupActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eButtonGroupItem {
  addEventListener<K extends keyof M3eButtonGroupItemEventMap>(
    type: K,
    listener: (this: M3eButtonGroupItem, ev: M3eButtonGroupItemEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eButtonGroupItemEventMap>(
    type: K,
    listener: (this: M3eButtonGroupItem, ev: M3eButtonGroupItemEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

let nextId = 0;

const valueOf = (item: M3eButtonGroupItem, index: number) =>
  item.value ?? (item.textContent.trim() || String(index));

/**
 * `<m3e-button-group variant="connected" size="m" selection-mode="single" label="View">`
 * (COMPONENT_SPEC §3). Renders the m3e-css `.m3e-button-group` contract inside itself (the host
 * is `display: contents`) from its `<m3e-button-group-item>` children; {@link ButtonGroupLayout}
 * adds the press width springs (standard groups), the interruptible shape springs, roving focus
 * and overflow measurement.
 *
 * - `variant`: `standard` (default) | `connected`. `size`: `xs` | `s` (default) | `m` | `l` | `xl`.
 *   `shape`: `round` (default) | `square`. `button-variant`: `filled` (default) | `tonal` |
 *   `elevated` | `outlined` | `text`.
 * - `selection-mode`: `none` (default; plain buttons), `single` (`role="radiogroup"`, radio items
 *   with `aria-checked`), `multiple` (toggle buttons with `aria-pressed`).
 *   `disallow-empty-selection` keeps one item selected (`selection-required` is its deprecated
 *   name, since 1.8; removed in 2.0). `disabled` disables every item. `label`: the group's accessible name.
 * - `overflow` (standard groups): trailing items that do not fit collapse into a menu opened from
 *   a "More options" icon button (`overflow-label` renames it). The menu is `<m3e-menu
 *   variant="baseline">`, loaded on first use. The button carries the plain tooltip Compose builds
 *   into ButtonGroupDefaults.OverflowIndicator (owner decision M9 #30): its name, above it
 *   (`<m3e-tooltip>`'s TooltipController, imported from the `tooltip-popup.js` entry when the
 *   button is first rendered). It repeats the button's name, so it is `aria-hidden` (owner
 *   decision M9 #2).
 * - Keyboard: Tab enters on one item (the last focused, else the checked one, else the first);
 *   ArrowLeft/ArrowRight (mirrored in RTL), Home and End move focus; Enter/Space activate.
 * - Events: `selection-change` on the group when the selection changes, `detail: { value,
 *   selected, values }` (`change` carries the same detail and is deprecated since 1.8, removed in
 *   2.0); `action` on the `<m3e-button-group-item>` (bubbles) when it is activated,
 *   `detail: { value }`.
 */
export class M3eButtonGroup extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    variant: {},
    size: {},
    shape: {},
    buttonVariant: {},
    selectionMode: {},
    disallowEmptySelection: { type: Boolean },
    selectionRequired: { type: Boolean },
    overflow: { type: Boolean },
    overflowLabel: {},
    label: {},
    disabled: { type: Boolean },
  };

  declare variant: string | null | undefined;
  declare size: string | null | undefined;
  declare shape: string | null | undefined;
  declare buttonVariant: string | null | undefined;
  declare selectionMode: string | null | undefined;
  /** Keeps one item selected (React Aria's `disallowEmptySelection`). */
  declare disallowEmptySelection: boolean | undefined;
  /**
   * Keeps one item selected.
   * @deprecated Since 1.8: use `disallowEmptySelection` (`disallow-empty-selection`). Removed in 2.0.
   */
  declare selectionRequired: boolean | undefined;
  declare overflow: boolean | undefined;
  declare overflowLabel: string | null | undefined;
  declare label: string | null | undefined;
  declare disabled: boolean | undefined;

  #root: HTMLDivElement | undefined;
  #layout: ButtonGroupLayout | undefined;
  #buttons = new Map<M3eButtonGroupItem, HTMLButtonElement>();
  #trigger: HTMLButtonElement | undefined;
  #tip: HTMLDivElement | undefined;
  #tooltip: TooltipController | undefined;
  #tooltipLoading = false;
  #menu: M3eMenu | undefined;
  #observer: MutationObserver | undefined;
  #visible = Number.POSITIVE_INFINITY;

  /** The rendered `.m3e-button-group` element. */
  get groupElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** Values of the selected items. */
  get values(): string[] {
    return this.#items()
      .map((item, i) => (item.selected ? valueOf(item, i) : null))
      .filter((v): v is string => v !== null);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Item children and label text changing re-render (the group's own DOM is skipped).
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
    this.#layout?.destroy();
    this.#layout = undefined;
    this.#tooltip?.destroy();
    this.#tooltip = undefined;
    this.#tooltipLoading = false;
  }

  protected override update(): void {
    const root = this.#render();
    this.#bindTooltip();
    if (!this.#layout) {
      this.#layout = new ButtonGroupLayout(root, {
        onVisibleCountChange: (count) => {
          if (count === this.#visible) return;
          this.#visible = count;
          this.#render();
        },
      });
    }
    this.#layout.update();
  }

  #items(): M3eButtonGroupItem[] {
    return [...this.children].filter(
      (c): c is M3eButtonGroupItem => c instanceof M3eButtonGroupItem,
    );
  }

  #mode(): 'none' | 'single' | 'multiple' {
    return this.selectionMode === 'single' || this.selectionMode === 'multiple'
      ? this.selectionMode
      : 'none';
  }

  // --- Rendering --------------------------------------------------------------------------

  #render(): HTMLDivElement {
    const doc = this.ownerDocument;
    const root = (this.#root ??= doc.createElement('div'));
    if (root.parentNode !== this) this.append(root);
    const variant = pick(this.variant, VARIANTS, 'standard');
    const size = pick(this.size, SIZES, 's');
    const overflow = Boolean(this.overflow) && variant === 'standard';
    const mode = this.#mode();
    root.className = [
      'm3e-button-group',
      `m3e-button-group--${variant}`,
      `m3e-button-group--size-${size}`,
      ...(overflow ? ['m3e-button-group--overflow'] : []),
    ].join(' ');
    root.setAttribute('role', mode === 'single' ? 'radiogroup' : 'group');
    attr(root, 'aria-label', this.label);

    const items = this.#items();
    const visible = overflow ? this.#visible : Number.POSITIVE_INFINITY;
    const buttons = items.map((item) => this.#renderItem(item, size, mode));
    buttons.forEach((button, i) => {
      button.toggleAttribute('hidden', i >= visible);
    });
    const parts: Element[] = [...buttons];
    for (const item of this.#buttons.keys()) if (!items.includes(item)) this.#buttons.delete(item);
    if (overflow) {
      const trigger = this.#renderTrigger(size, visible >= items.length);
      parts.push(trigger, this.#renderTip(trigger));
      const hidden = items.slice(Math.min(visible, items.length));
      if (hidden.length > 0) parts.push(this.#renderMenu(hidden, items, mode));
      else if (this.#menu) parts.push(this.#menu);
    }
    replaceChildrenIfChanged(root, parts);
    return root;
  }

  #renderItem(
    item: M3eButtonGroupItem,
    size: string,
    mode: 'none' | 'single' | 'multiple',
  ): HTMLButtonElement {
    const doc = this.ownerDocument;
    let button = this.#buttons.get(item);
    if (!button) {
      button = doc.createElement('button');
      button.type = 'button';
      button.setAttribute('data-spring', '');
      attachRipple(button, new AbortController().signal);
      button.addEventListener('click', () => {
        this.#activate(item);
      });
      this.#buttons.set(item, button);
    }
    const buttonVariant = pick(item.variant ?? this.buttonVariant, BUTTON_VARIANTS, 'filled');
    const shape = this.shape === 'square' ? 'square' : 'round';
    button.className = [
      'm3e-button',
      `m3e-button--${buttonVariant}`,
      `m3e-button--size-${size}`,
      `m3e-button--${shape}`,
      'm3e-button-group__item',
    ].join(' ');
    const selected = mode !== 'none' && Boolean(item.selected);
    attr(button, 'role', mode === 'single' && 'radio');
    attr(button, 'aria-checked', mode === 'single' && String(selected));
    attr(button, 'aria-pressed', mode === 'multiple' && String(selected));
    button.disabled = item.disabled === true || this.disabled === true;
    attr(button, 'aria-label', item.label);
    const label = item.textContent.trim();
    const children: Node[] = [];
    if (item.icon) children.push(icon(doc, item.icon));
    if (label) children.push(doc.createTextNode(label));
    const same =
      button.childNodes.length === children.length &&
      children.every((c, i) => {
        const current = button.childNodes.item(i);
        return current.nodeType === c.nodeType && current.textContent === c.textContent;
      });
    if (!same) button.replaceChildren(...children);
    return button;
  }

  #renderTrigger(size: string, hidden: boolean): HTMLButtonElement {
    const doc = this.ownerDocument;
    let trigger = this.#trigger;
    if (!trigger) {
      trigger = doc.createElement('button');
      trigger.type = 'button';
      trigger.id = `m3e-button-group-${String(++nextId)}`;
      trigger.setAttribute('data-spring', '');
      trigger.append(icon(doc, 'more_vert'));
      attachRipple(trigger, new AbortController().signal);
      // <m3e-menu> keeps these in sync once it is loaded (as React Aria useMenuTrigger renders them).
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      this.#trigger = trigger;
    }
    trigger.className = [
      'm3e-icon-button',
      'm3e-icon-button--filled',
      `m3e-icon-button--size-${size}`,
      'm3e-icon-button--width-default',
      'm3e-icon-button--round',
      'm3e-button-group__overflow',
    ].join(' ');
    trigger.setAttribute('aria-label', this.overflowLabel ?? BUTTON_GROUP_MORE_OPTIONS);
    trigger.disabled = Boolean(this.disabled);
    trigger.hidden = hidden;
    return trigger;
  }

  /**
   * OverflowIndicator's TooltipBox(TooltipAnchorPosition.Above, rememberTooltipState()) with
   * PlainTooltipInternal(contentDescription): the button's name as a plain tooltip.
   */
  #renderTip(trigger: HTMLButtonElement): HTMLDivElement {
    let tip = this.#tip;
    if (!tip) {
      tip = this.ownerDocument.createElement('div');
      tip.className = 'm3e-tooltip';
      tip.id = `m3e-button-group-${String(++nextId)}`;
      tip.setAttribute('role', 'tooltip');
      tip.setAttribute('popover', 'manual');
      this.#tip = tip;
    }
    const label = this.overflowLabel ?? BUTTON_GROUP_MORE_OPTIONS;
    if (tip.textContent !== label) tip.textContent = label;
    // Its text is the button's name (owner decision M9 #2): not a description, unless it is empty
    // (then it describes the button, as m3e-react's <TooltipTrigger> does).
    const repeats = label.trim() !== '';
    attr(tip, 'aria-hidden', repeats && 'true');
    attr(trigger, 'aria-describedby', !repeats && tip.id);
    return tip;
  }

  /** Binds the overflow button's tooltip (the controller is loaded on first use). */
  #bindTooltip(): void {
    const trigger = this.#trigger;
    const tip = this.#tip;
    if (!trigger || !tip?.isConnected) {
      this.#tooltip?.setAnchor(null);
      return;
    }
    if (this.#tooltip) {
      this.#tooltip.setAnchor(trigger);
      return;
    }
    if (this.#tooltipLoading) return;
    this.#tooltipLoading = true;
    void import('@kyralabs/m3e-elements/tooltip-popup.js').then(({ TooltipController }) => {
      // Disconnected meanwhile, or a reconnect's load got there first.
      if (this.#tooltip || !this.isConnected) return;
      const tooltip = new TooltipController({
        tooltip: tip,
        onVisibleChange: (visible) => {
          tooltip.render(visible);
        },
      });
      this.#tooltip = tooltip;
      this.#bindTooltip();
    });
  }

  /** `<m3e-menu variant="baseline">` with the hidden items (Compose: DropdownMenu + DropdownMenuItem). */
  #renderMenu(
    hidden: readonly M3eButtonGroupItem[],
    all: readonly M3eButtonGroupItem[],
    mode: 'none' | 'single' | 'multiple',
  ): M3eMenu {
    const doc = this.ownerDocument;
    if (!this.#menu) {
      // The <m3e-menu> entry loads on first use (keeps this entry within its size budget).
      void import('@kyralabs/m3e-elements/menu.js');
      const menu = doc.createElement('m3e-menu');
      menu.setAttribute('variant', 'baseline');
      menu.addEventListener('action', (e) => {
        const target = e.target as M3eMenuItem;
        const index = Number(target.dataset['index']);
        const item = all[index] ?? this.#items()[index];
        if (item) this.#activate(item);
      });
      this.#menu = menu;
    }
    const menu = this.#menu;
    attr(menu, 'anchor', this.#trigger?.id);
    const items = this.#items();
    const nodes = hidden.map((item) => {
      const index = items.indexOf(item);
      const el =
        menu.querySelector<M3eMenuItem>(`:scope > [data-index="${String(index)}"]`) ??
        doc.createElement('m3e-menu-item');
      el.dataset['index'] = String(index);
      attr(el, 'value', valueOf(item, index));
      attr(el, 'type', mode === 'single' ? 'radio' : mode === 'multiple' ? 'checkbox' : null);
      el.toggleAttribute('checked', mode !== 'none' && Boolean(item.selected));
      el.toggleAttribute('disabled', item.disabled === true || this.disabled === true);
      attr(el, 'icon', item.icon);
      attr(el, 'checked-icon', mode === 'none' ? null : 'check');
      const text = item.textContent.trim() || (item.label ?? '');
      if (el.textContent !== text) el.textContent = text;
      return el;
    });
    const current = [...menu.children].filter((c) => c.localName === 'm3e-menu-item');
    if (current.length !== nodes.length || nodes.some((n, i) => current[i] !== n)) {
      for (const c of current) if (!nodes.includes(c as M3eMenuItem)) c.remove();
      menu.append(...nodes.filter((n) => n.parentNode !== menu));
      // Keep document order matching the items.
      for (const n of nodes) menu.append(n);
    }
    return menu;
  }

  // --- Selection --------------------------------------------------------------------------

  #activate(item: M3eButtonGroupItem): void {
    if (item.disabled || this.disabled) return;
    const items = this.#items();
    const index = items.indexOf(item);
    const value = valueOf(item, index);
    item.dispatchEvent(
      new CustomEvent('action', {
        bubbles: true,
        composed: true,
        detail: { value } satisfies ButtonGroupActionDetail,
      }),
    );
    const mode = this.#mode();
    if (mode === 'none') return;
    let selected: boolean;
    if (mode === 'single') {
      if (item.selected) {
        if (this.#required()) return;
        selected = false;
      } else {
        selected = true;
        for (const other of items) if (other !== item) other.selected = false;
      }
    } else {
      selected = !item.selected;
      if (!selected && this.#required() && this.values.length <= 1) return;
    }
    item.selected = selected;
    this.requestUpdate();
    const detail: ButtonGroupChangeDetail = { value, selected, values: this.values };
    this.emit('selection-change', detail);
    this.emit('change', { ...detail });
  }

  /** `disallow-empty-selection`, else the deprecated `selection-required` (the new name wins). */
  #required(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias (D16)
    return Boolean(this.disallowEmptySelection ?? this.selectionRequired);
  }
}

/** Events of `<m3e-button-group>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eButtonGroupEventMap extends HTMLElementEventMap {
  /** The selection changed. */
  'selection-change': CustomEvent<ButtonGroupChangeDetail>;
  /** @deprecated Since 1.8: listen to `selection-change` (same detail). Removed in 2.0. */
  change: CustomEvent<ButtonGroupChangeDetail>;
  /** An item was activated (from the `<m3e-button-group-item>`, bubbling). */
  action: CustomEvent<ButtonGroupActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eButtonGroup {
  addEventListener<K extends keyof M3eButtonGroupEventMap>(
    type: K,
    listener: (this: M3eButtonGroup, ev: M3eButtonGroupEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eButtonGroupEventMap>(
    type: K,
    listener: (this: M3eButtonGroup, ev: M3eButtonGroupEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
