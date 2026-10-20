// The date picker's layout (COMPONENT_SPEC §27), imported by <m3e-date-picker> on first render
// and by m3e-react's <DatePicker>, with what the date pickers share. Registers nothing. The range
// and docked layouts have their own entries (date-range-picker-layout.js,
// docked-date-picker-layout.js).
export { type DatePickerBaseOptions, DatePickerBase } from './base.js';
export { DatePickerLayout, type DatePickerLayoutOptions } from './picker.js';
export { DATE_PICKER_STRINGS, type DatePickerStrings } from './strings.js';
export { parseIsoDate, parseYearRange, toIsoDate } from './locale.js';
// The date pickers' option types (Compose's, from m3e-motion), for `selectableDates`, `year-range`
// and `display-mode` (M15). m3e-react re-exports these symbols.
export type { DatePickerDisplayMode, SelectableDates, YearRange } from '@kyralabs/m3e-motion';
// The date pickers' shared events (M1).
export type {
  DisplayModeChangeDetail,
  DisplayedMonthChangeDetail,
  M3eDatePickerElementEventMap,
} from './element.js';
