import { M3eBottomSheet } from './bottom-sheet.js';

// Only the class (m3e-react exports its own bottom sheet components; one name per package in the
// umbrella). BottomSheetLayout has its own entry (bottom-sheet-layout.js).
export { M3eBottomSheet } from './bottom-sheet.js';

M3eBottomSheet.define('m3e-bottom-sheet');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-bottom-sheet': M3eBottomSheet;
  }
}
