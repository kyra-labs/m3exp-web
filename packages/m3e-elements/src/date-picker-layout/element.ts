import type { DatePickerDisplayMode, SelectableDates } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import type { DatePickerBaseOptions } from './base.js';
import { parseIsoDate, parseYearRange, toIsoDate } from './locale.js';
import type { DatePickerStrings } from './strings.js';

const stopPropagation = (e: Event): void => {
  e.stopPropagation();
};

/**
 * What `<m3e-date-picker>`, `<m3e-date-range-picker>` and `<m3e-docked-date-picker>` share: the
 * attributes (`displayed-month`, `year-range="1900-2100"`, `display-mode="picker | input"`,
 * `hide-mode-toggle`, `no-title`, `no-headline`), the `labels` and `selectableDates` properties,
 * the `display-mode-change` / `displayed-month-change` events, and a root `<div>` inside the host
 * (`display: contents`) that the layout builds. Dates are ISO strings (`YYYY-MM-DD`, UTC).
 */
export abstract class M3eDatePickerElement<
  L extends { update(options: O): void; destroy(): void },
  O extends DatePickerBaseOptions,
> extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    displayedMonth: {},
    yearRange: {},
    displayMode: { reflect: true },
    hideModeToggle: { type: Boolean },
    noTitle: { type: Boolean },
    noHeadline: { type: Boolean },
    labels: { attribute: false as const },
    selectableDates: { attribute: false as const },
  };

  declare displayedMonth: string | null | undefined;
  declare yearRange: string | null | undefined;
  declare displayMode: string | null | undefined;
  declare hideModeToggle: boolean | undefined;
  declare noTitle: boolean | undefined;
  declare noHeadline: boolean | undefined;
  /** String overrides (DATE_PICKER_STRINGS keys), e.g. for other languages. */
  declare labels: Partial<DatePickerStrings> | null | undefined;
  /** Which dates and years can be picked (Compose's SelectableDates; UTC milliseconds). */
  declare selectableDates: SelectableDates | null | undefined;

  #layout: L | undefined;

  /** The layout (shared with m3e-react) that builds and runs the picker. */
  get controller(): L | undefined {
    return this.#layout;
  }

  /** Imports the layout's entry (on first render) and creates the layout. */
  protected abstract loadLayout(): Promise<(root: HTMLElement, options: O) => L>;

  #loading: Promise<void> | null = null;

  /** Resolves once the layout has rendered (its entry is imported on first render). */
  get ready(): Promise<void> {
    return this.#loading ?? Promise.resolve();
  }

  /** The element's options for the layout (subclasses add theirs). */
  protected options(): O {
    return {
      displayedMonth: parseIsoDate(this.displayedMonth),
      yearRange: parseYearRange(this.yearRange),
      displayMode: this.displayMode === 'input' ? 'input' : 'picker',
      showModeToggle: !this.hideModeToggle,
      ...(this.noTitle ? { title: null } : {}),
      headline: !this.noHeadline,
      selectableDates: this.selectableDates ?? undefined,
      labels: this.labels ?? undefined,
      onDisplayModeChange: (mode: DatePickerDisplayMode) => {
        this.displayMode = mode;
        this.emit('display-mode-change', { mode });
      },
      onDisplayedMonthChange: (month: number) => {
        this.emit('displayed-month-change', { month: toIsoDate(month).slice(0, 7) });
      },
      loadDateField: () =>
        import('@kyralabs/m3e-elements/date-field.js').then(({ DateField }) => DateField),
    } as O;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#layout?.destroy();
    this.#layout = undefined;
    this.#loading = null;
  }

  protected override update(): void {
    if (this.#layout) {
      this.#layout.update(this.options());
      return;
    }
    this.#loading ??= this.loadLayout().then((create) => {
      this.#loading = null;
      if (this.#layout || !this.isConnected) return;
      const root = this.ownerDocument.createElement('div');
      this.replaceChildren(root);
      // The date field's native `input` / `change` stop at the root (the layout's own listeners
      // have run by then): the host's `change` is only this element's CustomEvent with `detail`.
      for (const type of ['input', 'change']) this.listen(root, type, stopPropagation);
      this.#layout = create(root, this.options());
    });
  }
}

/** `display-mode-change` detail of the date pickers. */
export interface DisplayModeChangeDetail {
  mode: DatePickerDisplayMode;
}

/** `displayed-month-change` detail of the date pickers: the month shown (`YYYY-MM`). */
export interface DisplayedMonthChangeDetail {
  month: string;
}

/** Events of the date pickers (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eDatePickerElementEventMap extends HTMLElementEventMap {
  /** The mode toggle switched between the calendar and the input. */
  'display-mode-change': CustomEvent<DisplayModeChangeDetail>;
  /** The calendar shows another month. */
  'displayed-month-change': CustomEvent<DisplayedMonthChangeDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eDatePickerElement<
  L extends { update(options: O): void; destroy(): void },
  O extends DatePickerBaseOptions,
> {
  addEventListener<K extends keyof M3eDatePickerElementEventMap>(
    type: K,
    listener: (this: M3eDatePickerElement<L, O>, ev: M3eDatePickerElementEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eDatePickerElementEventMap>(
    type: K,
    listener: (this: M3eDatePickerElement<L, O>, ev: M3eDatePickerElementEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
