---
'@kyralabs/m3exp-web': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
---

API review fixes (M11, D16: additive; every old name keeps working, is `@deprecated` and goes in
2.0). m3e-elements: the inner inputs' native `input` / `change` no longer reach the host of
`<m3e-time-input>`, `<m3e-docked-date-picker>` and the date pickers' input mode, nor the input's
native `select` the host of `<m3e-search>`, so host listeners see only the element's `CustomEvent`;
every element with events exports an `M3e<Name>EventMap` with typed `addEventListener` /
`removeEventListener` (type-only) and its detail types (`OpenChangeDetail`, `ExpandedChangeDetail`,
`ValueDetail`, …); `<m3e-button-group>` fires `selection-change` and takes
`disallow-empty-selection` (`change`, `selection-required` deprecated), `<m3e-list selection-mode>`
(`selection` deprecated), carousel items fire a bubbling `action` (`item-click` deprecated),
`<m3e-slider variant orientation>` (`centered`, `vertical` deprecated), `<m3e-side-sheet
back-button>` (the `back` attribute deprecated), `<m3e-bottom-sheet open>` with `open-change`,
the time pickers' `selection-change` detail gains `value`; `SelectableDates`, `YearRange`,
`DatePickerDisplayMode` and `SideSheetVariantOption` are exported; the helpers shared with
m3e-react are tagged `@internal`. m3e-css: two-rows top app bars read the public
`--m3e-comp-top-app-bar-container-collapsed-height` / `-expanded-height`. m3e-react: `FabMenu
isOpen`, `isExpanded` on `FloatingToolbar`, `SearchBar` and `ExtendedFab`,
`scrollBehavior="exit-always"` on the toolbars, `DatePicker` / `DateRangePicker showHeadline` (the
old names warn once in development), `onDisplayModeChange(next)` / `onModeToggle(next)` on the
time pickers, and type exports for the prop types it used without exporting (`SliderSize`,
`SheetValue`, `BadgeValue`, `RoundedPolygon`, `IconButtonStyle`, …); the D4 `*Props` types are
`@deprecated` and `fabClassName({ size: 'small' })` warns like `<Fab size="small">`.
