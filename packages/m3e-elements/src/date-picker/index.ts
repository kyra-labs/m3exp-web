import { M3eDatePicker } from './date-picker.js';

// Only the class (m3e-react exports the DatePicker component; one name per package in the
// umbrella). Registers <m3e-date-picker>. The layouts have their own entry (date-picker-layout.js).
export { M3eDatePicker, type DatePickerChangeDetail } from './date-picker.js';

M3eDatePicker.define('m3e-date-picker');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-date-picker': M3eDatePicker;
  }
}
