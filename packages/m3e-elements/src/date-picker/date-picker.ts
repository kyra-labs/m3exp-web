import {
  M3eDatePickerElement,
  type M3eDatePickerElementEventMap,
} from '../date-picker-layout/element.js';
import { parseIsoDate, toIsoDate } from '../date-picker-layout/locale.js';
import type { DatePickerLayout, DatePickerLayoutOptions } from '../date-picker-layout/picker.js';

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

  protected override loadLayout() {
    return import('@kyralabs/m3e-elements/date-picker-layout.js').then(
      ({ DatePickerLayout }) =>
        (root: HTMLElement, options: DatePickerLayoutOptions) =>
          new DatePickerLayout(root, options),
    );
  }
}

/** Events of `<m3e-date-picker>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eDatePickerEventMap extends M3eDatePickerElementEventMap {
  /** The user picked or entered a date, or cleared the input. */
  change: CustomEvent<DatePickerChangeDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eDatePicker {
  addEventListener<K extends keyof M3eDatePickerEventMap>(
    type: K,
    listener: (this: M3eDatePicker, ev: M3eDatePickerEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eDatePickerEventMap>(
    type: K,
    listener: (this: M3eDatePicker, ev: M3eDatePickerEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
