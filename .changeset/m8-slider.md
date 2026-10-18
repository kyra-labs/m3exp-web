---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3exp-web': minor
---

Slider (M8, COMPONENT_SPEC §25; Compose `Slider`, `VerticalSlider`, `RangeSlider` and `SliderDefaults.CenteredTrack`): standard, range (two thumbs that meet but never cross), centered and vertical (minimum at the bottom) sliders, continuous or with stops (ticks), in sizes XS (default), S, M, L and XL from the m3.material.io token DB, with an inset icon on M–XL standard sliders, end stop indicators and a value indicator while dragged or keyboard focused; pressing, dragging or keyboard focus halves the handle at once. New `components/slider-defaults.css` tokens (the `Slider.kt` values Compose renders, the per-size track, handle, corner and icon values, the value indicator container), m3e-css `slider.css` (`.m3e-slider` drawn from `--m3e-comp-slider-value`, `--m3e-comp-slider-start-value` and `--m3e-comp-slider-steps`; the focus ring around the handle), m3e-motion slider math (steps, snapping, thumb bounds, Compose's key steps and pages, the drawTrack geometry), the m3e-elements `<m3e-slider>` entry (pointer, keyboard, `input` / `change` events) and `slider-layout` entry, and m3e-react `<Slider>` / `<RangeSlider>` (React Aria `useSlider` / `useSliderThumb`).
