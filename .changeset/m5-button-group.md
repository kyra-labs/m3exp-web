---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3exp-web': minor
---

Button group (COMPONENT_SPEC §3): standard and connected groups, sizes XS–XL, round/square, single/multiple selection and an overflow menu. m3e-css `button-group.css` (`.m3e-button-group`, `--connected`, `--size-*`, `--overflow`, `__item`, `__overflow`; `.m3e-button` with `aria-checked` now styles as a toggle). m3e-elements `<m3e-button-group>` / `<m3e-button-group-item>` (events `change`, `action`) and the `button-group-layout.js` entry (`ButtonGroupLayout`: press width springs with Compose's `ExpandedRatio`, interruptible corner springs, roving tabindex, overflow measurement). m3e-react `<ButtonGroup>` / `<ButtonGroupItem>`. m3e-motion `buttonGroupWidths` and `buttonGroupVisibleCount` (ports of `ButtonGroupMeasurePolicy`). m3e-tokens `components/button-group-defaults.css`: `ButtonGroupDefaults` values Compose renders plus the per-size m3.material.io token DB values Compose lacks (XS between-space 18dp, M/L/XL 8dp, connected corners per size).
