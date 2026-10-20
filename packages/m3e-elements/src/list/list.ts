import { M3eElement } from '../base/M3eElement.js';
import { ListLayout, type ListSelectionMode } from '../list-layout/list-layout.js';

const BLOCK = 'm3e-list';

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

const MODES: ReadonlySet<string> = new Set(['none', 'single', 'multiple']);

/** Detail of the `selection-change` event. */
export interface ListSelectionChangeDetail {
  /** The selected options' values after the change. */
  values: string[];
  /** The option that was toggled, or null (select all, clear). */
  value: string | null;
}

/** Detail of the `action` event. */
export interface ListActionDetail {
  /** The option's `data-value`, else its headline. */
  value: string;
}

/**
 * `<m3e-list label="Pets" selection-mode="single">…items…</m3e-list>`: an interactive list
 * (COMPONENT_SPEC §20; owner decisions M8 #13 and #15). Renders the m3e-css `.m3e-list` contract
 * inside itself (the host is `display: contents`) and moves its children, `.m3e-list-item`s in the
 * m3e-css markup (`data-value` keys them; `aria-selected="true"` / `aria-disabled="true"` set the
 * initial state), into it. It exists for what CSS cannot do (m3e-elements ListLayout; m3e-react's
 * `<List selectionMode>` renders the same DOM with React Aria):
 *
 * - a `role="listbox"` of options with one tab stop, arrow keys that wrap (Down / Right next,
 *   Up / Left previous), Home / End and typeahead;
 * - selection (`selection-mode="single" | "multiple"`): click, Space or Enter toggles an option, a
 *   checkbox, radio button or switch inside it shows the state; `selection-change`
 *   (`detail: { values, value }`, cancelable: `preventDefault()` keeps the selection);
 * - `selection-mode="none"` (the default): actionable options (Compose's clickable ListItem); click or
 *   Enter emits `action` (`detail: { value }`).
 *
 * Static lists need no element: `<ul class="m3e-list">` of `<li class="m3e-list-item">`.
 *
 * Attributes: `label` (the listbox's accessible name), `selection-mode` (`selection` is its
 * deprecated name, since 1.8; removed in 2.0), `disallow-empty-selection`. Property `selectedValues` (string[]).
 */
export class M3eList extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    label: {},
    selectionMode: {},
    selection: { default: 'none' },
    disallowEmptySelection: { type: Boolean },
  }))();

  declare label: string | null | undefined;
  /** `none` (default) | `single` | `multiple` (React's `selectionMode`). */
  declare selectionMode: ListSelectionMode | null | undefined;
  /**
   * The selection mode.
   * @deprecated Since 1.8: use `selectionMode` (`selection-mode`). Removed in 2.0.
   */
  declare selection: ListSelectionMode;
  declare disallowEmptySelection: boolean | undefined;

  #root: HTMLDivElement | undefined;
  #layout: ListLayout | undefined;
  #observer: MutationObserver | undefined;

  /** The rendered `.m3e-list`. */
  get listElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** ListLayout's behavior, while connected. */
  get layout(): ListLayout | undefined {
    return this.#layout;
  }

  /** The selected options' values. */
  get selectedValues(): string[] {
    return this.#layout?.selectedValues() ?? [];
  }

  set selectedValues(values: readonly string[]) {
    this.#layout?.setSelectedValues(values);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
    // Items added to the host (not to the rendered list) are moved in on the next update.
    this.#observer = new MutationObserver(() => {
      if ([...this.childNodes].some((n) => n !== this.#root)) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  protected override update(): void {
    const root = (this.#root ??= this.ownerDocument.createElement('div'));
    root.className = BLOCK;
    const moved = [...this.childNodes].filter((n) => n !== root);
    if (root.parentNode !== this) this.prepend(root);
    if (moved.length > 0) root.append(...moved);
    setAttr(root, 'aria-label', this.label ?? null);
    this.#layout ??= new ListLayout(root, {
      selection: () => {
        // The new name wins; the deprecated `selection` is the 1.x alias (D16).
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const mode = this.selectionMode ?? this.selection;
        return MODES.has(mode) ? mode : 'none';
      },
      disallowEmptySelection: () => this.disallowEmptySelection === true,
      onSelectionChange: (values, value) => {
        const detail: ListSelectionChangeDetail = { values, value };
        return this.emit('selection-change', detail, { cancelable: true });
      },
      onAction: (value) => {
        const detail: ListActionDetail = { value };
        this.emit('action', detail);
      },
      id: () => (this.id ? `${this.id}-listbox` : undefined),
    });
    this.#layout.update();
  }
}

/** Events of `<m3e-list>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eListEventMap extends HTMLElementEventMap {
  /** The selection changes; cancelable. */
  'selection-change': CustomEvent<ListSelectionChangeDetail>;
  /** An option was activated (`selection-mode="none"`). */
  action: CustomEvent<ListActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eList {
  addEventListener<K extends keyof M3eListEventMap>(
    type: K,
    listener: (this: M3eList, ev: M3eListEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eListEventMap>(
    type: K,
    listener: (this: M3eList, ev: M3eListEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
