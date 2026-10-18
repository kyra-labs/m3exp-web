---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Text fields (M8, COMPONENT_SPEC §26; Compose `TextField` and `OutlinedTextField`): filled and outlined fields on a native `<input>` or (multi-line) `<textarea>` with a `<label for>`, leading / trailing icons, prefix / suffix, placeholder, supporting text, a character counter, error (`aria-invalid`), disabled and read-only states, and the Inside, Cutout and Above label positions. The label floats with no JavaScript (`:focus` / `:not(:placeholder-shown)`), its type style lerped from body large to body small on the fast spatial spring as Compose lerps the label TextStyle; the outlined notch is a fieldset legend (writing direction and forced colors included). New `components/text-field-defaults.css` tokens (the `TextField.kt` / `OutlinedTextField.kt` / `TextFieldDefaults` / `TextFieldImpl.kt` values Compose renders: paddings, min sizes, indicator and outline thicknesses, the cutout, type styles, motion, both color sets and the selection color), m3e-css `text-field.css`, the m3e-elements `<m3e-text-field>` entry (live counter, textarea growth where `field-sizing` is missing) and `text-field-layout` entry, and m3e-react `<TextField>` (React Aria `useTextField`).
