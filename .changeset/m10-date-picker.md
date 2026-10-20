---
'@kyralabs/m3exp-web': minor
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-motion': minor
---

Date pickers (COMPONENT_SPEC §27, M10): Compose's `DatePicker` (calendar with month paging and
the year grid, switchable to the date input), `DateRangePicker` (a scrolling month list with the
range band, switchable to start / end inputs) and `DatePickerDialog`, plus m3.material.io's
docked date picker. m3e-tokens generates the date picker's Compose values, state layers, docked
values and motion (`date-picker-defaults.css`); m3e-css adds `date-picker.css`; m3e-motion ports
the calendar model, `DatePickerState` / `DateRangePickerState`, the input's pattern, parser and
validator and `drawRangeBackground` (checked against a JVM run of the vendored Kotlin);
m3e-elements adds `<m3e-date-picker>`, `<m3e-date-range-picker>`, `<m3e-docked-date-picker>`,
their layout entries and the lazily loaded `date-field` entry; m3e-react adds `DatePicker`,
`DateRangePicker`, `DockedDatePicker` and `DatePickerDialog`.
