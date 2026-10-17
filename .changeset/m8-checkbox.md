---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Checkbox (M8, COMPONENT_SPEC §22; Compose `Checkbox` and `TriStateCheckbox`): a native `<input type="checkbox">` in a 48dp target with an 18dp box, checked, unchecked and indeterminate, error (`aria-invalid`) and disabled. Checking draws the check along Compose's path (stroke-dashoffset on the default spatial spring), the check slides into the indeterminate dash (cross-centre gravitation), unchecking fades it and snaps it away after 100ms, and a dash entered from unchecked draws from its start. New `components/checkbox-defaults.css` tokens (the `Checkbox.kt` values Compose renders, both branches of `ComposeMaterial3Flags.isCheckboxStylingFixEnabled`, selected by `--m3e-comp-checkbox-styling-fix`: 1 = the flag-on styling, which matches `CheckboxTokens` and m3.material.io; 0 = Compose's default flag-off styling), m3e-css `checkbox.css` (`.m3e-checkbox` with `__input`, `__box`, the SVG `__mark` with two `__stroke` paths, `__state`, `__label`; added to the state-layer / focus-ring lists and the `ripple.js` triggers), the m3e-elements `<m3e-checkbox>` entry (the `indeterminate` attribute, the previous state for the dash, the ripple; `attachRipple` gains an optional `keys` argument) and m3e-react `<Checkbox isSelected defaultSelected onChange isIndeterminate isDisabled isInvalid isRequired>`.
