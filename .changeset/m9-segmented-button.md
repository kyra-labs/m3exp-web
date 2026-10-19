---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Segmented button (M9, COMPONENT_SPEC §37), deprecated from the start (DECISIONS D4: shipped until 2.0 for migration; use the connected button group): Compose Material3's `SingleChoiceSegmentedButtonRow` / `MultiChoiceSegmentedButtonRow` with `SegmentedButton` on native radios and checkboxes (no custom element). Equal-width buttons overlapping by their 1dp outline in a 48dp row, full corners on the outer ends, secondary container when selected; the check fades and scales in on the springs while the label slides aside, and leaves at once; an icon shown while unselected cross-fades with it. New `components/segmented-button-defaults.css` tokens (the `SegmentedButton.kt` values Compose renders), m3e-css `segmented-button.css` (with the state-layer, focus-ring and `ripple.js` hooks), and m3e-react `SingleChoiceSegmentedButtonRow`, `MultiChoiceSegmentedButtonRow` and `SegmentedButton`, marked `@deprecated` and warning once in development.
