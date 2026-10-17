---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Switch (M8, COMPONENT_SPEC §24; Compose `Switch`): a native `<input type="checkbox" role="switch">` with a 52 × 32dp track in a 48dp-high target, checked, unchecked and disabled, with optional icons in the handle. Pressing snaps the handle to 28dp (Compose `SnapSpec`) and releasing springs it back, or across when the press toggles, on the fast spatial spring; colors do not animate, and disabled colors are composited over surface as Compose does. Space toggles (Enter does not) with no JavaScript, and the state layer shows hover, focus and press around the handle in the content color. New `components/switch-defaults.css` tokens (the `Switch.kt` values Compose renders), m3e-css `switch.css` (`.m3e-switch` with `__input`, `__track`, `__handle`, `__icon` (`--checked` / `--unchecked`), `__state`, `__label`; added to the state-layer / focus-ring lists and the `ripple.js` triggers, Space only) and m3e-react `<Switch isSelected defaultSelected onChange isDisabled isReadOnly checkedIcon uncheckedIcon labelPosition name value>`. No custom element: the native input and CSS cover the behavior.
