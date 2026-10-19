import { M3eDockedDatePicker } from './docked-date-picker.js';

// Only the class (m3e-react exports the DockedDatePicker component). Registers
// <m3e-docked-date-picker>.
export { M3eDockedDatePicker } from './docked-date-picker.js';

M3eDockedDatePicker.define('m3e-docked-date-picker');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-docked-date-picker': M3eDockedDatePicker;
  }
}
