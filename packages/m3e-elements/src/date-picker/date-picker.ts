import { M3eDatePickerElement } from '../date-picker-layout/element.js';
import { parseIsoDate, toIsoDate } from '../date-picker-layout/locale.js';
import { DatePickerLayout, type DatePickerLayoutOptions } from '../date-picker-layout/picker.js';

/** `change` event detail: the date the user picked or entered (ISO, UTC), or null. */
export interface DatePickerChangeDetail {
  value: string | null;
}

/**
 * `<m3e-date-picker value="2025-08-17">` (COMPONENT_SPEC §27; Compose DatePicker): the calendar,
 * the year grid and the date input in one, without a dialog (put it in `<m3e-dialog
 * variant="custom">` with a `.m3e-date-picker-dialog` surface for Compose's DatePickerDialog).
 * Attributes `value` (ISO date) and those of M3eDatePickerElement. Event `change`
 * (`detail: { value }`). The DOM is m3e-css's `.m3e-date-picker` contract, built and run by
 * {@link DatePickerLayout} (shared with m3e-react).
 */
export class M3eDatePicker extends M3eDatePickerElement<DatePickerLayout, DatePickerLayoutOptions> {
  static override properties = {
    ...M3eDatePickerElement.properties,
    value: {},
  };

  declare value: string | null | undefined;

  protected override options(): DatePickerLayoutOptions {
    return {
      ...super.options(),
      selectedDate: parseIsoDate(this.value),
      onChange: (millis: number | null) => {
        const value = millis === null ? null : toIsoDate(millis);
        this.value = value;
        this.emit('change', { value } satisfies DatePickerChangeDetail);
      },
    };
  }

  protected override createLayout(
    root: HTMLElement,
    options: DatePickerLayoutOptions,
  ): DatePickerLayout {
    return new DatePickerLayout(root, options);
  }
}
