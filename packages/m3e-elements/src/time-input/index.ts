import { M3eTimeInput } from './time-input.js';

// Only the class (m3e-react exports the TimeInput component). Registers <m3e-time-input>.
export { M3eTimeInput, type M3eTimeInputEventMap } from './time-input.js';

M3eTimeInput.define('m3e-time-input');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-time-input': M3eTimeInput;
  }
}
