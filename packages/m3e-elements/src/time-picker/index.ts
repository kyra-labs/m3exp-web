import { M3eTimePicker } from './time-picker.js';

// Only the class (m3e-react exports the TimePicker component; one name per package in the
// umbrella). Registers <m3e-time-picker>. The layouts have their own entry (time-picker-layout.js).
export { M3eTimePicker, type M3eTimePickerEventMap } from './time-picker.js';

M3eTimePicker.define('m3e-time-picker');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-time-picker': M3eTimePicker;
  }
}
