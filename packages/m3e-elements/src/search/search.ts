import { M3eElement } from '../base/M3eElement.js';
import { SearchLayout } from '../search-layout/search-layout.js';
import type { ExpandedChangeDetail } from '../base/events.js';

const BLOCK = 'm3e-search';
const VARIANTS: readonly string[] = ['full-screen-contained', 'docked', 'docked-with-gap'];

let nextId = 0;
const uid = () => `m3e-search-${String(++nextId)}`;

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
/** `value`, or `fallback` when it is missing or empty. */
const or = (value: string | null | undefined, fallback: string) =>
  value?.length ? value : fallback;

const icon = (doc: Document, name: string) =>
  create(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' }, name);

/**
 * `<m3e-search-result value="apple" icon="history" supporting-text="Fruit">Apple</m3e-search-result>`
 * — data for one result of a `<m3e-search>` (it renders nothing itself; the search renders
 * `.m3e-search__result`): `value` (default: the label), `icon` / `trailing-icon` (Material
 * Symbols), `supporting-text`, `disabled`. The label is the text content.
 */
export class M3eSearchResult extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    value: {},
    icon: {},
    trailingIcon: {},
    supportingText: {},
    disabled: { type: Boolean },
  };

  declare value: string | null | undefined;
  declare icon: string | null | undefined;
  declare trailingIcon: string | null | undefined;
  declare supportingText: string | null | undefined;
  declare disabled: boolean | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
  }

  protected override update(): void {
    this.closest<M3eSearch>('m3e-search')?.requestUpdate();
  }
}

/**
 * `<m3e-search variant="docked" placeholder="Search">` (COMPONENT_SPEC §12; Compose SearchBar +
 * SearchBarDefaults.InputField with ExpandedFullScreenSearchBar / ExpandedFullScreenContainedSearchBar
 * / ExpandedDockedSearchBar / ExpandedDockedSearchBarWithGap). Renders the m3e-css `.m3e-search`
 * contract inside itself (the host is `display: contents`): `role="search"` around a combobox
 * input and a listbox of its `<m3e-search-result>` children. Other children (icon buttons, an
 * `img.m3e-search__avatar`) go to the trailing slot. Behavior: m3e-elements SearchLayout (shared
 * with m3e-react).
 *
 * - Attributes: `variant` (`full-screen` default | `full-screen-contained` | `docked` |
 *   `docked-with-gap`), `placeholder`, `value`, `label` (the input's accessible name, default
 *   "Search", Compose Strings.SearchBarSearch), `results-label` (the listbox's, default
 *   "Suggestions"), `leading-icon` (default `search`), `back-label` (the expanded view's back
 *   button, default "Back"), `expanded` (reflected), `disabled`.
 * - Events: `expanded-change` (`detail: { expanded }`); `search` (`detail: { value }`, Enter
 *   without an active result; cancelable: `preventDefault()` keeps the view expanded); `select`
 *   (`detail: { value, label }`, a result activated; cancelable: by default the input takes the
 *   label and the view collapses, as the Compose samples do; the input's native `select` does not
 *   reach the host). The native `input` event bubbles.
 * - `expand()` / `collapse()`.
 */
export class M3eSearch extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    variant: {},
    placeholder: {},
    value: {},
    label: {},
    resultsLabel: {},
    leadingIcon: {},
    backLabel: {},
    expanded: { type: Boolean, reflect: true },
    disabled: { type: Boolean },
  };

  declare variant: string | null | undefined;
  declare placeholder: string | null | undefined;
  declare value: string | null | undefined;
  declare label: string | null | undefined;
  declare resultsLabel: string | null | undefined;
  declare leadingIcon: string | null | undefined;
  declare backLabel: string | null | undefined;
  declare expanded: boolean | undefined;
  declare disabled: boolean | undefined;

  #root: HTMLDivElement | undefined;
  #view!: HTMLDivElement;
  #field!: HTMLDivElement;
  #leading!: HTMLElement;
  #input!: HTMLInputElement;
  #trailing!: HTMLElement;
  #results!: HTMLDivElement;
  #options = new Map<M3eSearchResult, HTMLDivElement>();
  #layout: SearchLayout | undefined;
  #observer: MutationObserver | undefined;
  #shownExpanded: boolean | null = null;

  /** The rendered `.m3e-search` root. */
  get searchElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** The rendered input. */
  get inputElement(): HTMLInputElement | undefined {
    return this.#root ? this.#input : undefined;
  }

  expand(): void {
    if (this.#layout) this.#layout.expand();
    else this.expanded = true;
  }

  collapse(): void {
    if (this.#layout) this.#layout.collapse();
    else this.expanded = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => !this.#root?.contains(r.target) || r.target === this.#root)) {
        this.requestUpdate();
      }
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  #render(): HTMLDivElement {
    const doc = this.ownerDocument;
    this.#input = create(doc, 'input', `${BLOCK}__input`, {
      type: 'text',
      role: 'combobox',
      'aria-autocomplete': 'list',
      autocomplete: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      enterkeyhint: 'search',
      id: uid(),
    }) as HTMLInputElement;
    this.#leading = create(doc, 'span', `${BLOCK}__leading`);
    this.#trailing = create(doc, 'span', `${BLOCK}__trailing`);
    this.#field = create(
      doc,
      'div',
      `${BLOCK}__field`,
      {},
      this.#leading,
      this.#input,
    ) as HTMLDivElement;
    this.#results = create(doc, 'div', `${BLOCK}__results`, {
      role: 'listbox',
      id: uid(),
      // Virtual focus: the scrolling listbox is not a tab stop of its own.
      tabindex: '-1',
    }) as HTMLDivElement;
    this.#view = create(
      doc,
      'div',
      `${BLOCK}__view`,
      {},
      this.#field,
      this.#results,
    ) as HTMLDivElement;
    const root = create(doc, 'div', BLOCK, { role: 'search' }, this.#view) as HTMLDivElement;
    // The input's native `select` (text selected; it bubbles) stops at the root: the host's
    // `select` is only this element's CustomEvent with `detail`. The root lives as long as the host.
    root.addEventListener('select', (e) => {
      e.stopPropagation();
    });
    return root;
  }

  protected override update(changed: ReadonlySet<string>): void {
    const doc = this.ownerDocument;
    const root = (this.#root ??= this.#render());
    if (root.parentNode !== this) this.append(root);

    // Light-DOM children: results are data; anything else goes to the trailing slot.
    const extras = [...this.children].filter(
      (child) => child !== root && !(child instanceof M3eSearchResult),
    );
    if (extras.length > 0) this.#trailing.append(...extras);
    const hasTrailing = this.#trailing.childElementCount > 0;
    if (hasTrailing && this.#trailing.parentNode !== this.#field)
      this.#field.append(this.#trailing);
    if (!hasTrailing) this.#trailing.remove();

    const variant = VARIANTS.includes(this.variant ?? '') ? this.variant : null;
    root.className = [BLOCK, variant && `${BLOCK}--${variant}`].filter(Boolean).join(' ');

    const input = this.#input;
    // The landmark and the combobox share the label (landmark names must be unique on a page).
    root.setAttribute('aria-label', or(this.label, 'Search'));
    input.setAttribute('aria-label', or(this.label, 'Search'));
    if (this.placeholder) input.setAttribute('placeholder', this.placeholder);
    else input.removeAttribute('placeholder');
    input.disabled = Boolean(this.disabled);
    if (changed.has('value') && this.value != null && input.value !== this.value) {
      input.value = this.value;
    }
    this.#results.setAttribute('aria-label', or(this.resultsLabel, 'Suggestions'));

    this.#renderResults(doc);

    this.#layout ??= new SearchLayout(root, {
      onExpandedChange: (expanded) => {
        this.expanded = expanded;
        this.emit('expanded-change', { expanded });
      },
      onSearch: (value) =>
        this.emit('search', { value }, { cancelable: true }) ? undefined : false,
      onSelect: (option) => {
        const result = [...this.#options].find(([, el]) => el === option)?.[0];
        const label = (result?.textContent ?? option.textContent).trim();
        const value = result?.value ?? label;
        if (!this.emit('select', { value, label }, { cancelable: true })) return false;
        input.value = label;
        return undefined;
      },
    });
    const expanded = Boolean(this.expanded);
    if (expanded !== this.#layout.expanded)
      this.#layout.setExpanded(expanded, this.#shownExpanded !== null);
    this.#renderLeading(doc, expanded);
    this.#shownExpanded = expanded;
    this.#layout.update();
  }

  /** Compose sample: a search icon while collapsed, a back button while expanded. */
  #renderLeading(doc: Document, expanded: boolean): void {
    if (this.#shownExpanded === expanded && this.#leading.firstChild) {
      const back = this.#leading.querySelector('.m3e-search__back');
      if (back) back.setAttribute('aria-label', or(this.backLabel, 'Back'));
      else if (this.#leading.firstElementChild) {
        this.#leading.firstElementChild.textContent = or(this.leadingIcon, 'search');
      }
      return;
    }
    this.#leading.replaceChildren(
      expanded
        ? create(
            doc,
            'button',
            'm3e-icon-button m3e-search__back',
            { type: 'button', 'aria-label': or(this.backLabel, 'Back') },
            icon(doc, 'arrow_back'),
          )
        : icon(doc, or(this.leadingIcon, 'search')),
    );
  }

  #renderResults(doc: Document): void {
    const results = [...this.children].filter(
      (c): c is M3eSearchResult => c instanceof M3eSearchResult,
    );
    for (const result of [...this.#options.keys()]) {
      if (!results.includes(result)) this.#options.delete(result);
    }
    const rows = results.map((result) => {
      let el = this.#options.get(result);
      if (!el) {
        el = create(doc, 'div', `${BLOCK}__result`, {
          role: 'option',
          id: uid(),
        }) as HTMLDivElement;
        this.#options.set(result, el);
      }
      const label = result.textContent.trim();
      const parts: HTMLElement[] = [];
      if (result.icon) {
        parts.push(create(doc, 'span', `${BLOCK}__result-leading`, {}, icon(doc, result.icon)));
      }
      const text = create(
        doc,
        'span',
        `${BLOCK}__result-text`,
        {},
        create(doc, 'span', `${BLOCK}__result-label`, {}, label),
      );
      if (result.supportingText) {
        text.append(create(doc, 'span', `${BLOCK}__result-supporting`, {}, result.supportingText));
      }
      parts.push(text);
      if (result.trailingIcon) {
        parts.push(
          create(doc, 'span', `${BLOCK}__result-trailing`, {}, icon(doc, result.trailingIcon)),
        );
      }
      if (el.innerHTML !== parts.map((p) => p.outerHTML).join('')) el.replaceChildren(...parts);
      if (result.disabled) el.setAttribute('aria-disabled', 'true');
      else el.removeAttribute('aria-disabled');
      return el;
    });
    const current = this.#results.children;
    if (current.length !== rows.length || rows.some((r, i) => current[i] !== r)) {
      this.#results.replaceChildren(...rows);
    }
  }
}

/** `search` detail of `<m3e-search>`: the query. */
export interface SearchDetail {
  value: string;
}

/** `select` detail of `<m3e-search>`: the activated result. */
export interface SearchSelectDetail {
  /** The result's `value`, else its label. */
  value: string;
  label: string;
}

/** Events of `<m3e-search>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eSearchEventMap extends HTMLElementEventMap {
  /** Expanded or collapsed. */
  'expanded-change': CustomEvent<ExpandedChangeDetail>;
  /** Enter without an active result; cancelable (`preventDefault()` keeps the view expanded). */
  search: CustomEvent<SearchDetail>;
  /** A result was activated; cancelable. The input's native `select` never reaches the host. */
  select: CustomEvent<SearchSelectDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eSearch {
  addEventListener<K extends keyof M3eSearchEventMap>(
    type: K,
    listener: (this: M3eSearch, ev: M3eSearchEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eSearchEventMap>(
    type: K,
    listener: (this: M3eSearch, ev: M3eSearchEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
