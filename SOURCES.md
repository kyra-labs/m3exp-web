# SOURCES.md — m3exp-web

## Pinned versions (as of 2026-10-11)
| Source | Version | Link | Notes |
|---|---|---|---|
| Compose Material3 | 1.5.0-beta01 (Oct 7, 2026) | developer.android.com/jetpack/androidx/releases/compose-material3 | Stable 1.4.0 lacks the M3E set |
| androidx source commit | `19991f2c0858aadfcb442ce02b2c8e4743c96898` (end of the 1.5.0-beta01 commit range `b2b5ae7b…19991f2c` on android.googlesource.com, linked from the release notes) | developer.android.com/jetpack/androidx/releases/compose-material3#1.5.0-beta01 | Recorded in `/SOURCE_PIN`. The earlier third-party candidate `23327507…` is discarded |
| androidx graphics-shapes | 1.1.0 | developer.android.com/jetpack/androidx/releases/graphics | Morph.calculateBounds added |
| material-color-utilities (npm) | 0.4.0 | npmjs.com/package/@material/material-color-utilities | Apache-2.0. Bundled into `@kyralabs/m3e-tokens` (its ESM has extensionless imports Node cannot load) |
| Material Web | 2.5.0 (2026-07-14) | github.com/material-components/material-web/releases | Secondary only; labs expressive components |
| m3.material.io | live, accessed 2026-10; token DB "Google Material 3" v38.2.9 (`_dsm/data/dsdb-m3/2026-09-23_06-10-05`) | m3.material.io | Motion specs table; component specs; side sheets (sole reference, D8) |
| Google Sans Flex (D1) | `TODO(verify)`: version + license from github.com/google/fonts (METADATA.pb) | fonts.google.com | Self-hosted; axes `TODO(verify)` |
| Material Symbols (D5) | `TODO(verify)`: version from github.com/google/material-design-icons | Apache-2.0 | Variable font bundled; subset CLI |
| React Aria | `TODO(verify)`: latest react-aria on npm | | |
| Motion (motion.dev) | `TODO(verify)`: latest "motion" on npm | | |
| Astro | 7.3.8 (npm latest, 2026-10-11) | npmjs.com/package/astro | Docs/playground app (M1) |
| Tooling | pnpm 12.11.2, Vitest 5.0.3 (+ happy-dom 20.14.6), Playwright 1.64.0 (image `mcr.microsoft.com/playwright:v1.64.0-noble`), @axe-core/playwright 4.13.0, size-limit 14.2.0, Changesets 3.0.3, tsup 8.5.1, ESLint 10.12.0, typescript-eslint 8.71.1, stylelint 17.16.0, Prettier 3.9.10 (npm latest, 2026-10-11) | npmjs.com | Exact versions in `pnpm-lock.yaml` |
| TypeScript | 6.0.3 — not npm latest (7.0.2): typescript-eslint 8.71.1 supports `>=4.8.4 <6.1.0` | npmjs.com/package/typescript | Bump to 7.x when typescript-eslint and tsup support it |

## Key source files (androidx `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`)
- MotionScheme.kt, tokens/StandardMotionTokens.kt, tokens/ExpressiveMotionTokens.kt, tokens/MotionTokens.kt.
- tokens/ShapeTokens.kt, MaterialShapes.kt, tokens/TypographyTokens.kt, TypeScaleTokens.kt, TypefaceTokens.kt, StateTokens.kt, ElevationTokens.kt, ScrimTokens.kt, ColorScheme.kt.
- Component files: Button.kt, IconButton.kt, ButtonGroup.kt, SplitButton.kt, FloatingActionButton.kt, FloatingActionButtonMenu.kt, LoadingIndicator.kt, ProgressIndicator.kt, WavyProgressIndicator.kt, FloatingToolbar.kt, AppBar.kt, SearchBar.kt, NavigationBar.kt, WideNavigationRail.kt, Menu.kt, ListItem.kt, Slider.kt, TimePicker.kt, plus their `tokens/*Tokens.kt`.
- graphics-shapes: `graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/` (RoundedPolygon.kt, CornerRounding.kt, Shapes.kt, Cubic.kt, Features.kt, FeatureDetector.kt, Morph.kt, FeatureMapping.kt, PolygonMeasure.kt, SvgPathParser.kt).

## Secondary and caution sources
- Third-party ports (jethac/slint, floor/mtrl, minop1205/m3-expressive-react, LanHuangJG/m3e, kanso-labs/kanso-ui) were used only to locate values, never as authority. Every value they supplied is in the register below.
- Material Web: m3.material.io/develop/web states it is in maintenance mode and that M3 Expressive is not implemented on web, conflicting with the labs additions in 2.5.0. Treat labs as non-normative.
- Ignored: a blog claiming "@material/web v3 with Material Expressive support"; no evidence in releases.

## Licensing (D9)
- Repo: Apache 2.0 (`LICENSE`).
- `NOTICE`: lists AndroidX Compose Material3 (tokens, component logic), AndroidX graphics-shapes, material-color-utilities — each "Copyright (C) The Android Open Source Project, licensed under the Apache License, Version 2.0" — and states that portions were modified/ported to TypeScript by Kyra Labs.
- Ported files: original Google header retained, plus `// Ported to TypeScript by Kyra Labs from <path>@<commit>`.
- Fonts: `packages/m3e-tokens/fonts/LICENSE-material-symbols.txt` (Apache 2.0), `LICENSE-google-sans-flex.txt` (`TODO(verify)` license type).
- Not legal advice; owner may seek review before 1.0.

## TODO(verify) register
1. ~~androidx commit hash for 1.5.0-beta01~~ — resolved: `19991f2c0858aadfcb442ce02b2c8e4743c96898` (see `/SOURCE_PIN`).
2. ~~All 12 spring constants~~ — resolved: `tokens/StandardMotionTokens.kt@19991f2c` L20–L31, `tokens/ExpressiveMotionTokens.kt@19991f2c` L22–L33 (generated; Vitest reference test).
3. ~~Corner scale values~~ — resolved: `tokens/ShapeTokens.kt@19991f2c` L28–L81 (generated).
4. ~~Line heights and tracking~~ — resolved: `tokens/TypeScaleTokens.kt@19991f2c` (generated). Differs from FOUNDATIONS §2 (now corrected): display-large −0.2, body-medium 0.2, title-medium 0.2.
5. ~~Emphasized weights~~ — resolved: `tokens/TypeScaleTokens.kt@19991f2c` L249 onward; still under upstream `// TODO update with the generated tokens once available` (provisional upstream; re-check at each pin bump). Emphasized tracking differs from the base styles.
6. ~~Compose TypefaceTokens default~~ — resolved: `tokens/TypefaceTokens.kt@19991f2c` L25–L29 = `FontFamily.SansSerif` (not Roboto); D1 overrides it.
7. Google Sans Flex: axes, ranges, version, license (google/fonts METADATA.pb).
8. Google Sans Flex fallback metrics for `size-adjust`.
9. Material Symbols: version, axis ranges, default style used by M3E (Rounded vs Outlined).
10. ~~SPEC_2025 extra roles and negative contrast~~ — resolved in npm 0.4.0: spec 2025 adds `primary/secondary/tertiary/error-dim` (spec 2021 returns undefined, `dynamiccolor/color_spec_2021.js`); spec 2025 treats negative contrast as 0. Guarded by tests.
11. ~~Enumerate SpecVersion~~ — resolved: `SpecVersion = '2021' | '2025'` (`dynamiccolor/color_spec.d.ts` L21); no 2026. D3 default = 2025.
12. ~~ScrimTokens opacity~~ — resolved: `tokens/ScrimTokens.kt@19991f2c` L25 = 0.32.
13. ~~ElevationTokens~~ — resolved: `tokens/ElevationTokens.kt@19991f2c` L24–L40 = 0/1/3/6/8/12 dp.
14. ~~StateTokens and disabled opacities~~ — resolved: `tokens/StateTokens.kt@19991f2c` L22–L25 (hover 0.08, focus 0.1, pressed 0.1, dragged 0.16); per-component `Disabled*Opacity` generated from each `*Tokens.kt`.
15. ~~Focus ring thickness/offset~~ — resolved from m3.material.io (no androidx token at the pin): `md.sys.state.focus-indicator` thickness 3dp, outer-offset 2dp, inner-offset −3dp (m3 token DB v38.2.9); matches material-web v2.5.0 `tokens/versions/latest/sass/_md-sys-state-focus-indicator.scss` L18–23. Color: every androidx `*Tokens.FocusIndicatorColor` = `Secondary`. Shape and motion → item 61.
16. ~~Spacing tokens~~ — resolved from m3.material.io: `md.sys.measurement.space0…space900` on an 8dp base (m3 token DB v38.2.9, m3.material.io/styles/spacing); matches material-web v2.5.0 `labs/gb/styles/space/md-space-tokens.scss` L6–27. Not present in Compose Material3 at the pin.
17. ~~Density rules~~ — resolved (rules): m3.material.io/foundations/layout/grids-spacing/density — scale 0, −1, −2, −3; "decreasing the top and bottom padding or overall height by 4dp"; opt-in only; targets stay ≥48×48; no automatic change across breakpoints. Per-component values → item 60.
18. Button size tokens, all fields × 5 sizes.
19. Button color roles per variant and toggle state.
20. Icon button size/width table.
21. Button group tokens for M/L/XL; ExpandedRatio 0.15.
22. Split button tokens.
23. FAB sizes/icons/radii, elevation, extended FAB heights.
24. FAB menu tokens and item-count guidance.
25. Loading indicator timings and determinate polygon list.
26. Wavy progress defaults and progress animation spec.
27. Floating toolbar tokens and animationSpec.
28. Docked toolbar tokens; BottomAppBar deprecation annotation.
29. Top app bar flexible variants: heights and type.
30. Search tokens.
31. ShortNavigationBar tokens.
32. WideNavigationRail tokens.
33. Navigation drawer tokens.
34. Tabs tokens.
35. Chip tokens and expressive morph properties.
36. Card tokens.
37. List/segmented list tokens.
38. Menu tokens.
39. Checkbox tokens.
40. Radio tokens.
41. Switch tokens.
42. Slider sizes and inset icon.
43. Text field tokens.
44. Date picker tokens.
45. Time picker tokens.
46. Dialog tokens.
47. Bottom sheet tokens.
48. Side sheet values from m3.material.io specs (no Compose source).
49. Snackbar tokens.
50. Tooltip tokens.
51. Badge tokens.
52. Divider tokens.
53. Carousel tokens.
54. Segmented button guidance.
55. Pull-to-refresh indicator.
56. Final component inventory diff against the package-summary.
57. `linear()` browser support — resolved (Chrome/Edge 113, Firefox 112, Safari 17.2); recheck at each release.
58. React Aria and Motion versions (pin in M4). Astro and tooling resolved 2026-10-11 — see the pinned versions table.
59. ~~expressiveLightColorScheme()~~ — resolved: `ColorScheme.kt@19991f2c` L1172–1179 (four `on*Container = PaletteTokens.*30` overrides); vendored and parsed by m3e-codegen.
60. Which components support density and their per-step values (m3.material.io shows only button and text field; spacing page image shows 0 to −4 vs 0 to −3 on the density page).
61. Focus ring shape (no token; material-web legacy ring uses corner-full) and focus ring motion (material-web labs: 150ms + 450ms `cubic-bezier(0.2, 0, 0, 1)`; Compose inset ring uses springs, `Ripple.kt@19991f2c` L852–853).
