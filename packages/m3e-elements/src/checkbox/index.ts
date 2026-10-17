import { M3eCheckbox } from './checkbox.js';

// Only the class and helpers (m3e-react exports the Checkbox component; one name per package in
// the umbrella). Registers <m3e-checkbox>.
export {
  CHECKBOX_SEGMENT_PATH,
  M3eCheckbox,
  checkboxState,
  renderCheckbox,
  type CheckboxState,
} from './checkbox.js';

M3eCheckbox.define('m3e-checkbox');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-checkbox': M3eCheckbox;
  }
}
