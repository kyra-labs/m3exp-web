---
'@kyralabs/m3e-tokens': patch
'@kyralabs/m3e-css': patch
'@kyralabs/m3e-elements': patch
'@kyralabs/m3e-react': patch
'@kyralabs/m3exp-web': patch
---

Checkbox: an unchecked checkbox now shows a state layer on hover, focus and press. With the flag-on styling Compose ripples in the box color, which is transparent while unchecked; by owner decision the unchecked states use the m3.material.io token DB colors instead (`md.comp.checkbox.unselected.{hover,focus}.state-layer.color` on-surface, `unselected.pressed` primary; with `aria-invalid` the `error.*` colors, error), at the existing state layer opacities. New `components/checkbox-defaults.css` tokens `--m3e-comp-checkbox-state-layer-color-{unselected,error}-{hover,focus,pressed}`. Checked and indeterminate checkboxes are unchanged (the box color).
