---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Radio button (M8, COMPONENT_SPEC §23; Compose `RadioButton`): native `<input type="radio">`s in a 48dp target with a 20dp ring, selected, unselected and disabled, grouped in a `role="radiogroup"` (or a `fieldset`) so arrow keys move the selection with no JavaScript. Selecting grows the dot on the fast spatial spring (it overshoots under the expressive scheme) while the ring and dot fade to primary on default effects; the state layer shows hover, focus and press in the content color, as Compose's ripple. New `components/radio-button-defaults.css` tokens (the `RadioButton.kt` values Compose renders and the `RadioGroupSample` rows), m3e-css `radio-button.css` (`.m3e-radio-group` with an optional `--horizontal` modifier, `.m3e-radio-button` with `__input`, `__icon`, `__state`, `__label`; added to the state-layer / focus-ring lists and the `ripple.js` triggers, Space only) and m3e-react `<RadioGroup value defaultValue onChange orientation isDisabled isReadOnly isRequired name>` with `<Radio value isDisabled>`. No custom element: native radios already select, submit and keyboard.
