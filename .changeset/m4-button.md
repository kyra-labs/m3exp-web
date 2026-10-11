---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Button and toggle button (M4).

- Tokens: `components/button-defaults.css` with the Compose `ButtonDefaults` / `ToggleButtonDefaults` values that are not in `Button*Tokens` (minimum width, XS padding and icon spacing, vertical paddings, small toggle pressed shape, 48dp minimum interactive size); every component elevation token gains a `…-shadow` companion.
- CSS: `button.css` — filled, tonal, elevated, outlined and text; sizes XS–XL; round and square; toggle buttons via `aria-pressed` (round ↔ square on selection); press morph; 48dp touch target; forced colors.
- React: `<Button>` (also renders links with `href`) and `<ToggleButton>` on React Aria, with interruptible corner springs (Motion's spring generator, velocity kept when interrupted).
