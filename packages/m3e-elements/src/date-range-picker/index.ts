import { M3eDateRangePicker } from './date-range-picker.js';

// Only the class (m3e-react exports the DateRangePicker component). Registers
// <m3e-date-range-picker>.
export {
  M3eDateRangePicker,
  type DateRangePickerChangeDetail,
  type M3eDateRangePickerEventMap,
} from './date-range-picker.js';

M3eDateRangePicker.define('m3e-date-range-picker');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-date-range-picker': M3eDateRangePicker;
  }
}
