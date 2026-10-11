---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-icons': minor
'@kyralabs/m3exp-web': minor
---

Primitives (M4): surface, icon, state layer and focus ring.

- Tokens: `--m3e-sys-color-shadow` (Compose `DefaultShadowColor`), `--m3e-sys-elevation-level0…5-shadow` (two-layer shadows, Material Web 2.5.0 geometry), Material Symbols axis defaults (`--m3e-ref-typeface-icon-*`) and `--m3e-ref-typeface-icon`, which every Material Symbols stylesheet sets.
- CSS: `surface.css` (tonal containers, elevation, shape), `icon.css` (`.m3e-icon`), `state-layer.css` (the shared hover/focus/pressed/dragged overlay with a press-point ripple) and `focus-ring.css` (`:focus-visible` outline).
- Elements: `<m3e-icon>` (`@kyralabs/m3e-elements/icon.js`), `attachRipple`; `@kyralabs/m3e-elements/base.js` exports the base class without registering elements.
- React: `<Icon>`, `<Surface>` and `useStateLayer` (React Aria press events drive the ripple). `<Icon>` and `<m3e-icon>` render identical DOM.
- Icons: `m3e-icons subset` CSS points `.m3e-icon` at the subset family.
