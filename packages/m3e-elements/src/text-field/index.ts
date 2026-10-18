import { M3eTextField } from './text-field.js';

// Only the class and its DOM builder (m3e-react exports TextField; one name per package in the
// umbrella). Registers <m3e-text-field>. The contract helpers have their own entry
// (text-field-layout.js).
export {
  M3eTextField,
  type TextFieldParts,
  renderTextField,
  textFieldIds,
} from './text-field.js';

M3eTextField.define('m3e-text-field');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-text-field': M3eTextField;
  }
}
