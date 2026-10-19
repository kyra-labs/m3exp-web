import { M3eSideSheet } from './side-sheet.js';

// Only the class (m3e-react exports its own side sheet component; one name per package in the
// umbrella). SideSheetLayout has its own entry (side-sheet-layout.js).
export { M3eSideSheet } from './side-sheet.js';

M3eSideSheet.define('m3e-side-sheet');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-side-sheet': M3eSideSheet;
  }
}
