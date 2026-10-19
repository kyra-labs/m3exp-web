---
'@kyralabs/m3exp-web': minor
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-motion': minor
---

Time pickers (COMPONENT_SPEC §28, M10): Compose's dial `TimePicker` (baseline and vibrant,
vertical and horizontal), `TimeInput` (baseline, vibrant, uncontained with the side column) and
the expressive `TimeScroll` wheels, with the updated AM/PM toggle buttons. m3e-tokens generates
the vibrant, side column, scroll field, dialog and motion values (`time-picker-defaults.css`);
m3e-css adds `time-picker.css` (dial, fields, wheels and the `.m3e-time-picker-dialog` surface);
m3e-motion ports `TimePickerState` / `AnalogTimePickerState`, `CircularLayout`'s placement,
`TimeInputTransformation` and `ScrollField`'s paging (checked against a JVM run of the vendored
Kotlin); m3e-elements adds `<m3e-time-picker>`, `<m3e-time-input>`, `<m3e-time-scroll>` and the
shared `time-picker-layout` entry; m3e-react adds `TimePicker`, `TimeInput`, `TimeScroll`,
`TimePickerModeToggle`, `TimePickerDialog` and `VibrantTimePickerDialog`.
