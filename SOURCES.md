# SOURCES.md — m3exp-web

## Pinned versions (as of 2026-10-11)
| Source | Version | Link | Notes |
|---|---|---|---|
| Compose Material3 | 1.5.0-beta01 (Oct 7, 2026) | developer.android.com/jetpack/androidx/releases/compose-material3 | Stable 1.4.0 lacks the M3E set |
| androidx source commit | `TODO(verify)`: commit for the 1.5.0-beta01 release | android.googlesource.com / github.com/androidx/androidx | Candidate `23327507f7fc7d5b19d65fec4b090f60c970079b` (token header `VERSION: 14_1_0`) seen in a third-party project with a conflicting alpha label. Do not use until resolved |
| androidx graphics-shapes | 1.1.0 | developer.android.com/jetpack/androidx/releases/graphics | Morph.calculateBounds added |
| material-color-utilities (npm) | 0.4.0 | npmjs.com/package/@material/material-color-utilities | Apache-2.0 |
| Material Web | 2.5.0 (2026-07-14) | github.com/material-components/material-web/releases | Secondary only; labs expressive components |
| m3.material.io | live, accessed 2026-10 | m3.material.io | Motion specs table; component specs; side sheets (sole reference, D8) |
| Google Sans Flex (D1) | `TODO(verify)`: version + license from github.com/google/fonts (METADATA.pb) | fonts.google.com | Self-hosted; axes `TODO(verify)` |
| Material Symbols (D5) | `TODO(verify)`: version from github.com/google/material-design-icons | Apache-2.0 | Variable font bundled; subset CLI |
| React Aria | `TODO(verify)`: latest react-aria on npm | | |
| Motion (motion.dev) | `TODO(verify)`: latest "motion" on npm | | |
| Astro | `TODO(verify)`: latest astro on npm | | |
| Vitest / Playwright / Changesets / pnpm / size-limit | `TODO(verify)` latest each | | |

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
1. androidx commit hash for 1.5.0-beta01.
2. All 12 spring constants (ζ, k) in Standard/ExpressiveMotionTokens.kt.
3. Corner scale values in ShapeTokens.kt.
4. Line heights (title-medium and below) and all tracking in TypeScaleTokens.kt.
5. Emphasized weights and their provisional status.
6. Compose TypefaceTokens default (Roboto) — informational only since D1 overrides it.
7. Google Sans Flex: axes, ranges, version, license (google/fonts METADATA.pb).
8. Google Sans Flex fallback metrics for `size-adjust`.
9. Material Symbols: version, axis ranges, default style used by M3E (Rounded vs Outlined).
10. SPEC_2025 extra roles (dim roles) and negative-contrast behavior.
11. Enumerate SpecVersion in npm 0.4.0 (is SPEC_2026 present?) — decides D3 default.
12. ScrimTokens opacity 0.32.
13. ElevationTokens 0/1/3/6/8/12 dp.
14. StateTokens.kt 8/10/10/16% and 0.38 disabled; per-component disabled opacities.
15. Focus ring thickness/offset.
16. Spacing tokens (Material Web 2.5.0 labs spacing stylesheet).
17. Density rules.
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
58. React Aria, Motion, Astro and tooling versions.
59. expressiveLightColorScheme() definition in ColorScheme.kt.
