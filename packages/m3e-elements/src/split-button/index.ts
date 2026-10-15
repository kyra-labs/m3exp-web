import { M3eSplitButton } from './split-button.js';

export { M3eSplitButton } from './split-button.js';

M3eSplitButton.define('m3e-split-button');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-split-button': M3eSplitButton;
  }
}
