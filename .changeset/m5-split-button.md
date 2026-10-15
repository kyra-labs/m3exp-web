---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Split button (COMPONENT_SPEC §4): a leading button for the primary action and a trailing button that opens a menu, in filled, tonal, elevated and outlined, sizes XS–XL. m3e-css `split-button.css`: `.m3e-split-button` around two `.m3e-button`s (`__leading`, `__trailing`) with the SplitButton*Tokens paddings, inner corners (pressed; full while open, `aria-expanded="true"`), trailing icon size and rotation, and Compose's optical centering of the trailing icon. m3e-elements: `<m3e-split-button label icon menu-label variant size>` (`@kyralabs/m3e-elements/split-button.js`) anchors its `<m3e-menu>` child to the trailing button and emits `press`. m3e-react: `<SplitButton variant size icon onPress menu={<Menu>…</Menu>} menuLabel>`. Both spring the inner corners (default effects) and the icon (Compose samples' `spring()`) with their velocity kept. m3e-tokens: `components/split-button-defaults.css` with the `SplitButtonDefaults` values Compose renders that are not in the token files.
