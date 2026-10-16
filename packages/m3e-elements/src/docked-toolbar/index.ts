import { M3eDockedToolbar } from './docked-toolbar.js';

// Only the class: m3e-react exports the DockedToolbar types (one name per package in the
// umbrella). DockedToolbarLayout and RovingFocus have their own entries.
export { M3eDockedToolbar } from './docked-toolbar.js';

M3eDockedToolbar.define('m3e-docked-toolbar');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-docked-toolbar': M3eDockedToolbar;
  }
}
