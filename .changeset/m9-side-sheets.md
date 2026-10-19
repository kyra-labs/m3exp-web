---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Side sheets (M9, COMPONENT_SPEC §31; D8: Compose has no side sheet, m3.material.io is the only reference and every value is `TODO(verify)` against it). The standard side sheet is an `<aside>` at the end of a flex row that takes its width from the row while open, so the content beside it shrinks; the modal side sheet is a native modal `<dialog>` at the window's end edge over the 0.32 scrim (the page inert and its scroll locked, Tab kept inside, focus on its first button and back to the opener); `adaptive` is modal below 600dp (the medium window size class) and standard from it. From the m3.material.io token DB and Specs: 256dp wide by default and at most 400dp, surface (standard) or surface-container-low with 16dp start corners and a level 1 shadow (modal), a `detached` option inset by 16dp with all corners rounded, an optional divider in outline, a header with an optional back button, the title-large headline and the required close button, and optional start-aligned bottom actions. The sheets open on the default spatial spring and close on the fast effects spring, the navigation drawer's motion mirrored to the end edge (no drags); the close button, Escape and the scrim ask to close. New `components/side-sheet-defaults.css` tokens, m3e-css `side-sheet.css`, the m3e-elements `<m3e-side-sheet>` and `side-sheet-layout` (`SideSheetLayout`) entries, and m3e-react `<SideSheet>`.
