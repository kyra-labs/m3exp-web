import { M3eFloatingToolbar } from './floating-toolbar.js';

// Only the class: m3e-react exports the FloatingToolbar types (one name per package in the
// umbrella). FloatingToolbarLayout and RovingFocus have their own entries.
export { M3eFloatingToolbar } from './floating-toolbar.js';

M3eFloatingToolbar.define('m3e-floating-toolbar');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-floating-toolbar': M3eFloatingToolbar;
  }
}
