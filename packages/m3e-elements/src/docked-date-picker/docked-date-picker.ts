import type { SelectableDates } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import type {
  DockedDatePickerLayout,
  DockedDatePickerLayoutOptions,
} from '../date-picker-layout/docked.js';
import { parseIsoDate, parseYearRange, toIsoDate } from '../date-picker-layout/locale.js';
import type { DatePickerStrings } from '../date-picker-layout/strings.js';

/**
 * `<m3e-docked-date-picker value="2025-08-17" label="Date">` (COMPONENT_SPEC §27; m3.material.io's
 * docked date picker, owner decision M10 D1): a date field whose calendar drops down below it.
 * Attributes `value` (ISO date), `label`, `year-range`; properties `labels`, `selectableDates`.
 * Methods `show()` / `close()`. Event `change` (`detail: { value }`). The DOM is m3e-css's
 * `.m3e-docked-date-picker` contract, built and run by {@link DockedDatePickerLayout} (shared
 * with m3e-react).
 */
export class M3eDockedDatePicker extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    value: {},
    label: {},
    yearRange: {},
    labels: { attribute: false as const },
    selectableDates: { attribute: false as const },
  };

  declare value: string | null | undefined;
  declare label: string | null | undefined;
  declare yearRange: string | null | undefined;
  declare labels: Partial<DatePickerStrings> | null | undefined;
  declare selectableDates: SelectableDates | null | undefined;

  #layout: DockedDatePickerLayout | undefined;
  #loading: Promise<void> | null = null;

  /** Resolves once the layout has rendered (its entry is imported on first render). */
  get ready(): Promise<void> {
    return this.#loading ?? Promise.resolve();
  }

  get controller(): DockedDatePickerLayout | undefined {
    return this.#layout;
  }

  /** Opens the calendar. */
  show(): void {
    this.#layout?.toggle(true);
  }

  /** Closes the calendar. */
  close(): void {
    this.#layout?.toggle(false);
  }

  #options(): DockedDatePickerLayoutOptions {
    return {
      selectedDate: parseIsoDate(this.value),
      yearRange: parseYearRange(this.yearRange),
      label: this.label ?? undefined,
      labels: this.labels ?? undefined,
      selectableDates: this.selectableDates ?? undefined,
      onChange: (millis: number | null) => {
        const value = millis === null ? null : toIsoDate(millis);
        this.value = value;
        this.emit('change', { value });
      },
    };
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
      this.#layout.update(this.#options());
      return;
    }
    this.#loading ??= import('@kyralabs/m3e-elements/docked-date-picker-layout.js').then(
      ({ DockedDatePickerLayout }) => {
        this.#loading = null;
        if (this.#layout || !this.isConnected) return;
        const root = this.ownerDocument.createElement('div');
        this.replaceChildren(root);
        this.#layout = new DockedDatePickerLayout(root, this.#options());
      },
    );
  }
}
