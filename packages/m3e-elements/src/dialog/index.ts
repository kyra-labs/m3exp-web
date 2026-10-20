import { M3eDialog } from './dialog.js';

// Only the class (m3e-react exports its own dialog components; one name per package in the
// umbrella). DialogLayout has its own entry (dialog-layout.js).
export { M3eDialog, type M3eDialogEventMap } from './dialog.js';

M3eDialog.define('m3e-dialog');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-dialog': M3eDialog;
  }
}
