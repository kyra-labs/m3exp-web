import { M3eDatePickerElement } from '../date-picker-layout/element.js';
import { parseIsoDate, toIsoDate } from '../date-picker-layout/locale.js';
import type {
  DateRangePickerLayout,
  DateRangePickerLayoutOptions,
} from '../date-picker-layout/range.js';

/** `change` event detail: the range (ISO dates, UTC); `end` is null while only a start is set. */
export interface DateRangePickerChangeDetail {
  start: string | null;
  end: string | null;
}

/**
 * `<m3e-date-range-picker start="2025-08-10" end="2025-08-17">` (COMPONENT_SPEC §27; Compose
 * DateRangePicker): a scrolling list of months and the range input. Compose shows it full screen
 * (owner decision M10 D16: inside `<m3e-dialog variant="full-screen">`). Attributes `start`, `end`
 * (ISO dates) and those of M3eDatePickerElement. Event `change` (`detail: { start, end }`). The
 * DOM is m3e-css's `.m3e-date-picker--range` contract, built and run by
 * {@link DateRangePickerLayout} (shared with m3e-react).
 */
export class M3eDateRangePicker extends M3eDatePickerElement<
  DateRangePickerLayout,
  DateRangePickerLayoutOptions
> {
  static override properties = {
    ...M3eDatePickerElement.properties,
    start: {},
    end: {},
  };

  declare start: string | null | undefined;
  declare end: string | null | undefined;

  protected override options(): DateRangePickerLayoutOptions {
    return {
      ...super.options(),
      selectedStartDate: parseIsoDate(this.start),
      selectedEndDate: parseIsoDate(this.end),
      onChange: (startMillis: number | null, endMillis: number | null) => {
        const start = startMillis === null ? null : toIsoDate(startMillis);
        const end = endMillis === null ? null : toIsoDate(endMillis);
        this.start = start;
        this.end = end;
        this.emit('change', { start, end } satisfies DateRangePickerChangeDetail);
      },
    };
  }

  protected override loadLayout() {
    return import('@kyralabs/m3e-elements/date-range-picker-layout.js').then(
      ({ DateRangePickerLayout }) =>
        (root: HTMLElement, options: DateRangePickerLayoutOptions) =>
          new DateRangePickerLayout(root, options),
    );
  }
}
