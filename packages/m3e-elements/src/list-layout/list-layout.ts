// The list DOM contract both layers write (m3e-css list.css): item class names, the selection
// indicator markup (a checkbox, radio button or switch that shows an option's state), and the
// listbox behavior of <m3e-list> (ListLayout). m3e-react renders the same DOM from React Aria's
// useListBox / useOption and reads the class names and indicator markup from here.
import { attachRipple } from '../base/ripple.js';
import { TypeSelect } from '../base/type-select.js';
import { RovingFocus } from '../roving-focus/roving-focus.js';

/** Selection behavior of an interactive list (React Aria's SelectionMode). */
export type ListSelectionMode = 'none' | 'single' | 'multiple';

/** A selection indicator in an item's leading or trailing slot. */
export type ListItemControl = 'checkbox' | 'radio' | 'switch';

const BLOCK = 'm3e-list-item';
const ITEM = `.${BLOCK}`;
const CONTROL_INPUT = '.m3e-checkbox__input, .m3e-radio-button__input, .m3e-switch__input';
const CONTROL_ROOT = '.m3e-checkbox, .m3e-radio-button, .m3e-switch';

/** What decides an item's classes. */
export interface ListItemShape {
  readonly segmented?: boolean | undefined;
  readonly interactive?: boolean | undefined;
  readonly threeLine?: boolean | undefined;
  /** A static item shown disabled (an option takes aria-disabled instead). */
  readonly disabled?: boolean | undefined;
  /** The legacy (@deprecated, D4) item. */
  readonly baseline?: boolean | undefined;
}

/** `.m3e-list-item` and its modifiers. */
export function listItemClassName({
  segmented,
  interactive,
  threeLine,
  disabled,
  baseline,
}: ListItemShape): string {
  const classes = [BLOCK];
  if (baseline) classes.push(`${BLOCK}--baseline`);
  if (segmented) classes.push(`${BLOCK}--segmented`);
  if (interactive) classes.push(`${BLOCK}--interactive`);
  if (threeLine) classes.push(`${BLOCK}--three-line`);
  if (disabled) classes.push(`${BLOCK}--disabled`);
  return classes.join(' ');
}

/** A node of indicator markup: [tag, attributes, children]. */
export type ListControlNode = readonly [
  string,
  Readonly<Record<string, string>>,
  ListControlNode[],
];

/** One stroke of the checkbox's check mark (m3e-css checkbox.css). */
const SEGMENT = 'M0 0H48';

/**
 * The indicator markup (m3e-css checkbox.css / radio-button.css / switch.css) without the input's
 * state: the JS layers set `checked` and `disabled`, and make the root `inert` (the option is the
 * control; Compose's samples pass onClick = null).
 */
export function listControlTree(control: ListItemControl): ListControlNode {
  const hidden = { 'aria-hidden': 'true' };
  switch (control) {
    case 'checkbox':
      return [
        'span',
        { class: 'm3e-checkbox' },
        [
          ['input', { class: 'm3e-checkbox__input', type: 'checkbox' }, []],
          [
            'span',
            { class: 'm3e-checkbox__box', ...hidden },
            [
              [
                'svg',
                { class: 'm3e-checkbox__mark', focusable: 'false' },
                [
                  ['path', { class: 'm3e-checkbox__stroke', d: SEGMENT }, []],
                  ['path', { class: 'm3e-checkbox__stroke', d: SEGMENT }, []],
                ],
              ],
            ],
          ],
          ['span', { class: 'm3e-checkbox__state', ...hidden }, []],
        ],
      ];
    case 'radio':
      return [
        'span',
        { class: 'm3e-radio-button' },
        [
          ['input', { class: 'm3e-radio-button__input', type: 'radio' }, []],
          ['span', { class: 'm3e-radio-button__icon', ...hidden }, []],
          ['span', { class: 'm3e-radio-button__state', ...hidden }, []],
        ],
      ];
    case 'switch':
      return [
        'span',
        { class: 'm3e-switch' },
        [
          ['input', { class: 'm3e-switch__input', type: 'checkbox', role: 'switch' }, []],
          [
            'span',
            { class: 'm3e-switch__track', ...hidden },
            [
              [
                'span',
                { class: 'm3e-switch__handle' },
                [['span', { class: 'm3e-switch__state' }, []]],
              ],
            ],
          ],
        ],
      ];
  }
}

const SVG = 'http://www.w3.org/2000/svg';

/** Builds an indicator (`listControlTree`) as DOM, its root `inert`. */
export function createListControl(doc: Document, control: ListItemControl): HTMLElement {
  const build = ([tag, attrs, children]: ListControlNode, svg: boolean): Element => {
    const inSvg = svg || tag === 'svg';
    const node = inSvg ? doc.createElementNS(SVG, tag) : doc.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    for (const child of children) node.append(build(child, inSvg));
    return node;
  };
  const root = build(listControlTree(control), false) as HTMLElement;
  root.setAttribute('inert', '');
  return root;
}

/** React Aria's option id: `<listbox id>-option-<key without whitespace>`. */
export const listOptionId = (listId: string, key: string): string =>
  `${listId}-option-${key.replace(/\s*/g, '')}`;

/** The id list of the parts that exist (undefined when none). */
export function listIdRefs(...ids: (string | null | undefined)[]): string | undefined {
  const list = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return list.length > 0 ? list.join(' ') : undefined;
}

/** An item's key: `data-value`, else its headline (as React Aria keys an item by its text). */
export const listItemValue = (item: Element): string =>
  item.getAttribute('data-value') ?? listItemText(item);

/** The text typeahead matches: the headline (React Aria's textValue). */
export const listItemText = (item: Element): string =>
  (
    item.querySelector(`:scope > .${BLOCK}__content > .${BLOCK}__headline`)?.textContent ?? ''
  ).trim();

let lists = 0;

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null | undefined): void => {
  if (value === null || value === undefined) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

const isDisabled = (item: Element): boolean => item.getAttribute('aria-disabled') === 'true';

export interface ListLayoutOptions {
  /** The selection mode. Default `none` (actionable options, Compose's clickable items). */
  selection?: (() => ListSelectionMode) | undefined;
  /** Whether the last selected option may not be deselected (React Aria). */
  disallowEmptySelection?: (() => boolean) | undefined;
  /**
   * The selection is to become `values` (`value`: the toggled option, or null for select-all /
   * clear). Return false to keep the current one.
   */
  onSelectionChange?: ((values: string[], value: string | null) => boolean) | undefined;
  /** An option was activated (selection `none`: click or Enter). */
  onAction?: ((value: string) => void) | undefined;
  /** The listbox id (also the option ids' prefix). Default: a unique one. */
  id?: (() => string | undefined) | undefined;
}

/**
 * Behavior of an interactive `.m3e-list` (COMPONENT_SPEC §20; owner decisions M8 #13 and #15),
 * the DOM React Aria's useListBox / useOption write in m3e-react's `<List selectionMode>`:
 *
 * - **Roles:** the root is a `role="listbox"` (`aria-orientation="vertical"`,
 *   `aria-multiselectable` when multiple), its `.m3e-list-item` children `role="option"`s with
 *   React Aria's ids and `data-key`, `aria-selected` unless the mode is `none`,
 *   `aria-labelledby` = the overline and headline, `aria-describedby` = the supporting text. The
 *   items become `.m3e-list-item--interactive` and draw the ripple.
 * - **Focus** (m3.material.io Lists › Accessibility): one tab stop. Until an option has had focus
 *   the listbox itself is the stop and passes focus to the first selected option (else the first);
 *   then the last focused option keeps it. Down / Right next, Up / Left previous (Left / Right
 *   mirrored in RTL), wrapping (m3e-elements RovingFocus `wrap`, `both`), Home / End, typeahead.
 *   Disabled options are skipped and take no tabindex (React Aria).
 * - **Selection** (React Aria's toggle behavior): click, Space or Enter toggles an option (single:
 *   replaces the selection, a second press deselects unless `disallowEmptySelection`);
 *   Ctrl/Cmd+A selects all (multiple) and Escape clears. A checkbox, radio button or switch
 *   inside an option is made `inert` and shows its state.
 * - **Action** (mode `none`): click or Enter calls `onAction`.
 *
 * Call `update()` after the items change (it also runs on child-list and state mutations).
 */
export class ListLayout {
  readonly root: HTMLElement;
  #options: ListLayoutOptions;
  #focus: RovingFocus;
  #abort = new AbortController();
  #mutations: MutationObserver;
  #ripples = new WeakSet<HTMLElement>();
  #typeahead = new TypeSelect();
  #id = `m3e-list-${String(++lists)}`;
  #entered = false;

  constructor(root: HTMLElement, options: ListLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.#focus = new RovingFocus(root, {
      items: () => this.enabledItems(),
      orientation: () => 'both',
      wrap: () => true,
    });
    this.#focus.tabbable = false;
    const { signal } = this.#abort;
    root.addEventListener(
      'focus',
      () => {
        // React Aria: focusing the listbox moves focus to the first selected option, else the
        // first one.
        const items = this.enabledItems();
        const target = items.find((el) => el.getAttribute('aria-selected') === 'true') ?? items[0];
        target?.focus();
      },
      { signal },
    );
    root.addEventListener(
      'focusin',
      (e) => {
        if (e.target === root || this.#entered) return;
        this.#entered = true;
        this.#focus.tabbable = true;
        setAttr(root, 'tabindex', '-1');
      },
      { signal },
    );
    root.addEventListener(
      'click',
      (e) => {
        const item = this.#itemFor(e.target);
        if (item && !isDisabled(item)) this.#activate(item);
      },
      { signal },
    );
    root.addEventListener(
      'keydown',
      (e) => {
        this.#onKeyDown(e);
      },
      { signal },
    );
    this.#mutations = new MutationObserver(() => {
      this.update();
    });
    this.#mutations.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-disabled', 'aria-selected', 'hidden', 'data-value'],
    });
    this.update();
  }

  /** The selection mode. */
  get selection(): ListSelectionMode {
    return this.#options.selection?.() ?? 'none';
  }

  /** The `.m3e-list-item` options, in order. */
  items(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(`:scope > ${ITEM}`)].filter(
      (el) => !el.hidden,
    );
  }

  /** The options focus can reach. */
  enabledItems(): HTMLElement[] {
    return this.items().filter((el) => !isDisabled(el));
  }

  /** The selected options' values. */
  selectedValues(): string[] {
    return this.items()
      .filter((el) => el.getAttribute('aria-selected') === 'true')
      .map(listItemValue);
  }

  /** Selects exactly the options whose values are in `values` (no event). */
  setSelectedValues(values: Iterable<string>): void {
    const set = new Set(values);
    for (const item of this.items()) {
      item.setAttribute('aria-selected', String(set.has(listItemValue(item))));
    }
    this.update();
  }

  /** Re-wires roles, ids, selection state, indicators and the tab stop. */
  update(): void {
    const root = this.root;
    const mode = this.selection;
    const custom = this.#options.id?.();
    const id = custom === undefined || custom === '' ? this.#id : custom;
    setAttr(root, 'id', id);
    setAttr(root, 'role', 'listbox');
    setAttr(root, 'aria-orientation', 'vertical');
    setAttr(root, 'aria-multiselectable', mode === 'multiple' ? 'true' : null);
    if (!this.#entered) setAttr(root, 'tabindex', '0');
    let seenSelected = false;
    for (const item of this.items()) {
      const key = listItemValue(item);
      const optionId = listOptionId(id, key);
      const disabled = isDisabled(item);
      item.classList.add(`${BLOCK}--interactive`);
      setAttr(item, 'role', 'option');
      setAttr(item, 'id', optionId);
      setAttr(item, 'data-key', key);
      let selected = item.getAttribute('aria-selected') === 'true';
      if (mode === 'single' && selected) {
        if (seenSelected) selected = false;
        seenSelected ||= selected;
      }
      setAttr(item, 'aria-selected', mode === 'none' ? null : String(selected));
      if (disabled) item.removeAttribute('tabindex');
      const part = (name: string) =>
        item.querySelector<HTMLElement>(`:scope > .${BLOCK}__content > .${BLOCK}__${name}`);
      const ids = (['overline', 'headline', 'supporting'] as const).map((name) => {
        const el = part(name);
        if (!el) return undefined;
        const partId = el.id || `${optionId}-${name}`;
        setAttr(el, 'id', partId);
        return partId;
      });
      setAttr(item, 'aria-labelledby', listIdRefs(ids[0], ids[1]));
      setAttr(item, 'aria-describedby', listIdRefs(ids[2]));
      for (const control of item.querySelectorAll<HTMLElement>(CONTROL_ROOT)) {
        if (!control.hasAttribute('inert')) control.setAttribute('inert', '');
      }
      for (const input of item.querySelectorAll<HTMLInputElement>(CONTROL_INPUT)) {
        input.checked = selected;
        input.defaultChecked = selected;
        input.disabled = disabled;
      }
      if (!this.#ripples.has(item)) {
        this.#ripples.add(item);
        attachRipple(item, this.#abort.signal);
      }
    }
    this.#focus.update();
  }

  destroy(): void {
    this.#abort.abort();
    this.#mutations.disconnect();
    this.#focus.destroy();
    this.#typeahead.reset();
  }

  #itemFor(target: EventTarget | null): HTMLElement | undefined {
    if (!(target instanceof Element)) return undefined;
    const item = target.closest<HTMLElement>(ITEM);
    return item?.parentElement === this.root ? item : undefined;
  }

  #activate(item: HTMLElement): void {
    const value = listItemValue(item);
    const mode = this.selection;
    if (mode === 'none') {
      this.#options.onAction?.(value);
      return;
    }
    const selected = item.getAttribute('aria-selected') === 'true';
    const current = this.selectedValues();
    let next: string[];
    if (selected) {
      next = current.filter((v) => v !== value);
      if (next.length === 0 && this.#options.disallowEmptySelection?.()) return;
    } else {
      next = mode === 'single' ? [value] : [...current, value];
    }
    this.#change(next, value);
  }

  #change(next: string[], value: string | null): void {
    if (this.#options.onSelectionChange?.(next, value) === false) return;
    this.setSelectedValues(next);
  }

  #onKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    const item = this.#itemFor(e.target);
    const mode = this.selection;
    if (e.key === ' ' && this.#typeahead.active) {
      // Space belongs to the typed string (React Aria useTypeSelect).
    } else if (item && (e.key === 'Enter' || (e.key === ' ' && mode !== 'none'))) {
      e.preventDefault();
      if (!e.repeat && !isDisabled(item)) this.#activate(item);
      return;
    }
    if (mode === 'multiple' && e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.#change(
        this.items()
          .filter((el) => !isDisabled(el))
          .map(listItemValue),
        null,
      );
      return;
    }
    if (e.key === 'Escape' && mode !== 'none' && this.selectedValues().length > 0) {
      if (this.#options.disallowEmptySelection?.()) return;
      e.preventDefault();
      this.#change([], null);
      return;
    }
    const items = this.enabledItems();
    const from = item ? items.indexOf(item) : -1;
    const found = this.#typeahead.type(e, items.map(listItemText), from);
    if (found >= 0) {
      e.preventDefault();
      items[found]?.focus();
    }
  }
}
