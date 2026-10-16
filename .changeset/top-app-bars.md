---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Top app bars (M6, COMPONENT_SPEC §11): center-aligned (Compose `CenterAlignedTopAppBar`, or any bar with `titleHorizontalAlignment` center), medium and large flexible (`MediumFlexibleTopAppBar`, `LargeFlexibleTopAppBar`, with title + subtitle) and two-rows (`TwoRowsTopAppBar`: custom heights, per-row titles), plus the exit-until-collapsed scroll behavior: the expanded row collapses with the scroll to the 64dp small bar, the titles crossfade and the container color follows the collapsed fraction, as Compose computes them. `components/top-app-bar-defaults.css` gains the TopAppBarDefaults heights, the title bottom paddings, the snap spring and the two-rows easings; m3e-css adds `.m3e-top-app-bar--center-aligned`, `--medium-flexible`, `--large-flexible`, `--two-rows` and the `__expanded` part; m3e-motion adds `exit-until-collapsed` to `scrollAppBar`, `twoRowsFrame` and `cubicBezierEasing`; `attachTopAppBarScroll` accepts `behavior: 'exit-until-collapsed'` and drives two-rows bars; `<TopAppBar>` accepts `variant` `'center-aligned' | 'medium-flexible' | 'large-flexible' | 'two-rows'`, `titleHorizontalAlignment`, `collapsedHeight` / `expandedHeight` and per-row `title` / `subtitle` functions. The small bar's DOM and classes are unchanged; its snap now jumps under `prefers-reduced-motion` (spatial motion off, CAC) and reads the generated `--m3e-comp-top-app-bar-snap-*` spring (still default effects).
