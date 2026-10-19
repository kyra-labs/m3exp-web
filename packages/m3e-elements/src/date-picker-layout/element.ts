import type { DatePickerDisplayMode, SelectableDates } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import type { DatePickerBase, DatePickerBaseOptions } from './base.js';
import { parseIsoDate, parseYearRange, toIsoDate } from './locale.js';
import type { DatePickerStrings } from './strings.js';

/**
 * What `<m3e-date-picker>`, `<m3e-date-range-picker>` and `<m3e-docked-date-picker>` share: the
 * attributes (`displayed-month`, `year-range="1900-2100"`, `display-mode="picker | input"`,
 * `hide-mode-toggle`, `no-title`, `no-headline`), the `labels` and `selectableDates` properties,
 * the `display-mode-change` / `displayed-month-change` events, and a root `<div>` inside the host
 * (`display: contents`) that the layout builds. Dates are ISO strings (`YYYY-MM-DD`, UTC).
 */
export abstract class M3eDatePickerElement<
  L extends DatePickerBase<O>,
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

  protected abstract createLayout(root: HTMLElement, options: O): L;

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
  }

  protected override update(): void {
    if (!this.#layout) {
      const root = this.ownerDocument.createElement('div');
      this.replaceChildren(root);
      this.#layout = this.createLayout(root, this.options());
    } else {
      this.#layout.update(this.options());
    }
  }
}
