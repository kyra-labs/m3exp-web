# SOURCES.md — m3exp-web

## Pinned versions (as of 2026-10-11)
| Source | Version | Link | Notes |
|---|---|---|---|
| Compose Material3 | 1.5.0-beta01 (Oct 7, 2026) | developer.android.com/jetpack/androidx/releases/compose-material3 | Stable 1.4.0 lacks the M3E set |
| androidx source commit | `19991f2c0858aadfcb442ce02b2c8e4743c96898` (end of the 1.5.0-beta01 commit range `b2b5ae7b…19991f2c` on android.googlesource.com, linked from the release notes) | developer.android.com/jetpack/androidx/releases/compose-material3#1.5.0-beta01 | Recorded in `/SOURCE_PIN`. The earlier third-party candidate `23327507…` is discarded |
| androidx graphics-shapes | 1.0.1 (Google Maven `androidx.graphics:graphics-shapes:1.0.1` sources jar, sha256 `80389b7b…ee241`) | developer.android.com/jetpack/androidx/releases/graphics#graphics-shapes-1.0.1 | The version Material3 1.5.0-beta01 depends on: `material3/build.gradle@19991f2c` L58 `api("androidx.graphics:graphics-shapes:1.0.1")`. Vendored from the published sources jar: the release notes link 1.0.0 and 1.0.1 to the same range (`217941670a79…594e7b6ae3c3`), and `libraryversions.toml@594e7b6a` still says 1.0.0; the jar differs from that commit only in KMP plumbing (`kotlin.jvm` imports, `kotlin.math.PI`, `Format.kt` debug formatting). 1.1.0 (androidx-graphics-shapes-release) is not used: it measures Morph outlines by length (`LengthMeasurer`) instead of angle, fixes the center estimate and adds FeatureDetector/SvgPathParser. Recorded in `/SOURCE_PIN` |
| material-color-utilities (npm) | 0.4.0 | npmjs.com/package/@material/material-color-utilities | Apache-2.0. Bundled into `@kyralabs/m3e-tokens` (its ESM has extensionless imports Node cannot load) |
| Material Web | 2.5.0 (2026-07-14) | github.com/material-components/material-web/releases | Secondary only; labs expressive components. Elevation shadow geometry (`elevation/internal/_elevation.scss`: per-level key/ambient table, opacity 0.3/0.15) is vendored from the npm tarball (registry sha512 verified) because Compose draws platform shadows and has no shadow values |
| m3.material.io | live, accessed 2026-10; token DB "Google Material 3" v38.2.9 (`_dsm/data/dsdb-m3/2026-09-23_06-10-05`) | m3.material.io | Motion specs table; component specs; side sheets (sole reference, D8) |
| Google Sans Flex (D1) | 5.000 (google/fonts@bd8f81dd `ofl/googlesansflex`, "Adding latest GSF v5.000", 2026-10-09) | github.com/google/fonts/tree/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/googlesansflex | SIL OFL 1.1, no Reserved Font Names; trademarks per TRADEMARKS.md. Axes ROND 0–100, opsz 1–144 (default 18), slnt −10–0, wdth 25–151, wght 1–1000 (no GRAD). Chunk unicode ranges from the Google Fonts CSS2 API (vendored). Recorded in `/SOURCE_PIN` |
| Material Symbols (D5) | 2.975 (google/material-design-icons@49d4db35 `variablefont/`, "Update Symbols", 2026-10-09; version from the font name table) | github.com/google/material-design-icons/tree/49d4db35df873165d6bd6ba09b063c7dafbac2f4/variablefont | Apache-2.0. Rounded/Outlined/Sharp woff2 shipped byte-exact; axes FILL 0–1, GRAD −50–200, opsz 20–48, wght 100–700. Recorded in `/SOURCE_PIN` |
| React Aria | `react-aria` 3.53.1 (npm latest, published 2026-10-09) | npmjs.com/package/react-aria | Apache-2.0. Runtime dependency of `@kyralabs/m3e-react` (behavior/a11y hooks) |
| Motion (motion.dev) | `motion` 14.1.0 (npm latest, published 2026-10-09) | npmjs.com/package/motion | MIT. `@kyralabs/m3e-react` uses its `spring` generator and frame loop (≈2 kB) for interruptible springs; `react-stately` 3.51.0 (react-aria's own version) for toggle state |
| Astro | 7.3.8 (npm latest, 2026-10-11) | npmjs.com/package/astro | Docs/playground app (M1) |
| Kotlin (JVM reference harnesses) | 2.4.21 (JetBrains release, sha256-verified by `tools/jvm/kotlin.mjs`) | github.com/JetBrains/kotlin/releases/tag/v2.4.21 | Compiles vendored androidx sources unmodified to export reference fixtures (ROADMAP M3) |
| Tooling | pnpm 12.11.2, Vitest 5.0.3 (+ happy-dom 20.14.6), Playwright 1.64.0 (image `mcr.microsoft.com/playwright:v1.64.0-noble`), @axe-core/playwright 4.13.0, size-limit 14.2.0, Changesets 3.0.3, tsup 8.5.1, ESLint 10.12.0, typescript-eslint 8.71.1, stylelint 17.16.0, Prettier 3.9.10 (npm latest, 2026-10-11) | npmjs.com | Exact versions in `pnpm-lock.yaml` |
| TypeScript | 6.0.3 — not npm latest (7.0.2): typescript-eslint 8.71.1 supports `>=4.8.4 <6.1.0` | npmjs.com/package/typescript | Bump to 7.x when typescript-eslint and tsup support it |

## Key source files (androidx `compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`)
- MotionScheme.kt, tokens/StandardMotionTokens.kt, tokens/ExpressiveMotionTokens.kt, tokens/MotionTokens.kt.
- tokens/ShapeTokens.kt, MaterialShapes.kt, tokens/TypographyTokens.kt, TypeScaleTokens.kt, TypefaceTokens.kt, StateTokens.kt, ElevationTokens.kt, ScrimTokens.kt, ColorScheme.kt.
- Component files: Button.kt, IconButton.kt, ButtonGroup.kt, SplitButton.kt, FloatingActionButton.kt, FloatingActionButtonMenu.kt, LoadingIndicator.kt, ProgressIndicator.kt, WavyProgressIndicator.kt, FloatingToolbar.kt, AppBar.kt, SearchBar.kt, NavigationBar.kt, WideNavigationRail.kt, Menu.kt, ListItem.kt, Slider.kt, TimePicker.kt, plus their `tokens/*Tokens.kt`.
- graphics-shapes 1.0.1 sources jar: `commonMain/androidx/graphics/shapes/` (RoundedPolygon.kt, CornerRounding.kt, Shapes.kt, Cubic.kt, Features.kt, Morph.kt, FeatureMapping.kt, FloatMapping.kt, PolygonMeasure.kt, Point.kt, Utils.kt, Format.kt) and `jvmMain/…/Format.jvm.kt`. FeatureDetector.kt and SvgPathParser.kt arrive in 1.1.0 and are out of scope.

## Secondary and caution sources
- Third-party ports (jethac/slint, floor/mtrl, minop1205/m3-expressive-react, LanHuangJG/m3e, kanso-labs/kanso-ui) were used only to locate values, never as authority. Every value they supplied is in the register below.
- Material Web: m3.material.io/develop/web states it is in maintenance mode and that M3 Expressive is not implemented on web, conflicting with the labs additions in 2.5.0. Treat labs as non-normative.
- Ignored: a blog claiming "@material/web v3 with Material Expressive support"; no evidence in releases.

## Licensing (D9)
- Repo: Apache 2.0 (`LICENSE`).
- `NOTICE`: lists AndroidX Compose Material3 (tokens, component logic), AndroidX graphics-shapes, material-color-utilities — each "Copyright (C) The Android Open Source Project, licensed under the Apache License, Version 2.0" — and states that portions were modified/ported to TypeScript by Kyra Labs.
- Ported files: original Google header retained, plus `// Ported to TypeScript by Kyra Labs from <path>@<commit>` (for graphics-shapes, which is vendored from its Maven sources jar, `<path in the jar>@androidx.graphics:graphics-shapes:1.0.1`).
- Fonts: `packages/m3e-tokens/fonts/LICENSE-material-symbols.txt` (Apache 2.0), `LICENSE-google-sans-flex.txt` (SIL OFL 1.1, verbatim from google/fonts) and `TRADEMARKS-google-sans-flex.md`.
- Not legal advice; owner may seek review before 1.0.

## TODO(verify) register
1. ~~androidx commit hash for 1.5.0-beta01~~ — resolved: `19991f2c0858aadfcb442ce02b2c8e4743c96898` (see `/SOURCE_PIN`).
2. ~~All 12 spring constants~~ — resolved: `tokens/StandardMotionTokens.kt@19991f2c` L20–L31, `tokens/ExpressiveMotionTokens.kt@19991f2c` L22–L33 (generated; Vitest reference test).
3. ~~Corner scale values~~ — resolved: `tokens/ShapeTokens.kt@19991f2c` L28–L81 (generated).
4. ~~Line heights and tracking~~ — resolved: `tokens/TypeScaleTokens.kt@19991f2c` (generated). Differs from FOUNDATIONS §2 (now corrected): display-large −0.2, body-medium 0.2, title-medium 0.2.
5. ~~Emphasized weights~~ — resolved: `tokens/TypeScaleTokens.kt@19991f2c` L249 onward; still under upstream `// TODO update with the generated tokens once available` (provisional upstream; re-check at each pin bump). Emphasized tracking differs from the base styles.
6. ~~Compose TypefaceTokens default~~ — resolved: `tokens/TypefaceTokens.kt@19991f2c` L25–L29 = `FontFamily.SansSerif` (not Roboto); D1 overrides it.
7. ~~Google Sans Flex axes, ranges, version, license~~ — resolved: google/fonts@bd8f81dd `ofl/googlesansflex` METADATA.pb: `license: "OFL"`, axes ROND 0–100, opsz 1–144, slnt −10–0, wdth 25–151, wght 1–1000 (no GRAD); version 5.000 from the TTF name table. TRADEMARKS.md: no RFNs; the marks may not imply Google affiliation or be part of a product name.
8. ~~Fallback metrics for `size-adjust`~~ — resolved: computed by m3e-codegen from the pinned TTF (hhea ascent/descent/lineGap, mean advance over U+0020–007E) against Arial 7.07 measured the same way; see `packages/m3e-tokens/fonts/manifest.json`.
9. ~~Material Symbols version, axes, default style~~ — resolved: 2.975 (google/material-design-icons@49d4db35 `variablefont/`); fvar axes FILL 0–1 (0), GRAD −50–200 (0), opsz 20–48 (24), wght 100–700 (400), identical across styles. **No M3/M3E source names a default style** (m3.material.io /styles/icons presents Outlined, Rounded and Sharp as brand choices; Google tooling — fonts.google.com/icons, Google Fonts docs, the repo README, Material Web 2.5.0 — defaults to Outlined). Rounded is a project choice (D12). m3.material.io: FILL 1 for selected toggles/destinations, grade −25 for light-on-dark icons, opsz 20 for dense/desktop and 40–48 for emphasis.
10. ~~SPEC_2025 extra roles and negative contrast~~ — resolved in npm 0.4.0: spec 2025 adds `primary/secondary/tertiary/error-dim` (spec 2021 returns undefined, `dynamiccolor/color_spec_2021.js`); spec 2025 treats negative contrast as 0. Guarded by tests.
11. ~~Enumerate SpecVersion~~ — resolved: `SpecVersion = '2021' | '2025'` (`dynamiccolor/color_spec.d.ts` L21); no 2026. D3 default = 2025.
12. ~~ScrimTokens opacity~~ — resolved: `tokens/ScrimTokens.kt@19991f2c` L25 = 0.32.
13. ~~ElevationTokens~~ — resolved: `tokens/ElevationTokens.kt@19991f2c` L24–L40 = 0/1/3/6/8/12 dp.
14. ~~StateTokens and disabled opacities~~ — resolved: `tokens/StateTokens.kt@19991f2c` L22–L25 (hover 0.08, focus 0.1, pressed 0.1, dragged 0.16); per-component `Disabled*Opacity` generated from each `*Tokens.kt`.
15. ~~Focus ring thickness/offset~~ — resolved from m3.material.io (no androidx token at the pin): `md.sys.state.focus-indicator` thickness 3dp, outer-offset 2dp, inner-offset −3dp (m3 token DB v38.2.9); matches material-web v2.5.0 `tokens/versions/latest/sass/_md-sys-state-focus-indicator.scss` L18–23. Color: every androidx `*Tokens.FocusIndicatorColor` = `Secondary`. Shape and motion → item 61.
16. ~~Spacing tokens~~ — resolved from m3.material.io: `md.sys.measurement.space0…space900` on an 8dp base (m3 token DB v38.2.9, m3.material.io/styles/spacing); matches material-web v2.5.0 `labs/gb/styles/space/md-space-tokens.scss` L6–27. Not present in Compose Material3 at the pin.
17. ~~Density rules~~ — resolved (rules): m3.material.io/foundations/layout/grids-spacing/density — scale 0, −1, −2, −3; "decreasing the top and bottom padding or overall height by 4dp"; opt-in only; targets stay ≥48×48; no automatic change across breakpoints. Per-component values → item 60.
18. ~~Button size tokens, all fields × 5 sizes~~ — resolved: `Button{XSmall,Small,Medium,Large,XLarge}Tokens.kt@19991f2c` (generated). Compose `ButtonDefaults` overrides some (`Button.kt@19991f2c`: XS padding 12dp and icon spacing 4dp, upstream TODO pending a token correction; vertical paddings 6/10/16/32/48dp; MinWidth 58dp; label styles labelLarge/labelLarge/titleMedium/headlineSmall/headlineLarge via `textStyleFor` L1640); small toggle pressed shape 6dp (`ToggleButton.kt` `pressedShape`). Generated as `components/button-defaults.css`.
19. ~~Button color roles per variant and toggle state~~ — resolved from the objects Compose reads: `Button.kt` (FilledButtonTokens, ElevatedButtonTokens, FilledTonalButtonTokens, OutlinedButtonTokens; text button content = ColorScheme Primary, L1414, upstream TODO over TextButtonTokens.LabelColor) and `ToggleButton.kt` (Filled/Elevated Unselected*/Selected*, TonalButtonTokens, OutlinedButtonTokens; selected outlined toggles have no border).
20. ~~Icon button size/width table~~ — resolved: `{XSmall,Small,Medium,Large,XLarge}IconButtonTokens.kt@19991f2c` (generated); width = IconSize + leading + trailing space per `IconButtonDefaults.*ContainerSize` (`IconButtonDefaults.kt`; Uniform uses the default leading space twice, LargeIconButtonTokens calls it UniformLeadingSpace). Colors per `IconButtonDefaults`: standard/outlined content and outline = LocalContentColor (inherited), vibrant variants use the tokens.
21. Button group tokens for M/L/XL; ExpandedRatio 0.15.
22. Split button tokens.
23. FAB sizes/icons/radii, elevation, extended FAB heights.
24. FAB menu tokens and item-count guidance.
25. ~~Loading indicator timings and determinate polygon list~~ — resolved: `LoadingIndicator.kt@19991f2c` (vendored): morph spring ζ 0.6 / k 200 / visibility threshold 0.1 (L401), `MorphIntervalMillis` 650 (L681), `GlobalRotationDurationMillis` 4666 (L680) → generated `components/loading-indicator-motion.css`; `DeterminateIndicatorPolygons` = Circle rotated 360°/20 + SoftBurst (L560–566). Geometry ported float32-faithfully to `m3e-shapes/src/loading-indicator.ts` and checked bit-exact against `pnpm reference:loading-indicator`.
26. Wavy progress defaults and progress animation spec.
27. Floating toolbar tokens and animationSpec.
28. Docked toolbar tokens; BottomAppBar deprecation annotation.
29. Top app bar flexible variants: heights and type.
30. Search tokens.
31. ~~ShortNavigationBar tokens~~ — resolved: `ShortNavigationBar.kt@19991f2c` reads `NavigationBarTokens`, `NavigationBarVerticalItemTokens`, `NavigationBarHorizontalItemTokens` (generated; no ShortNavigationBar*Tokens.kt exists); `TopIconIndicatorToLabelPadding` and the Centered arrangement (`calculateCenteredContentHorizontalPadding`, `CenteredContentMeasurePolicy`) generated into `components/navigation-defaults.css`; indicator motion from `NavigationItem.kt` (animateIndicatorProgressAsState, DefaultSpatial). Legacy `NavigationBar.kt` literals generated likewise.
32. ~~WideNavigationRail tokens~~ — resolved: `NavigationRail{Collapsed,Expanded,Color,BaselineItem,VerticalItem,HorizontalItem}Tokens.kt@19991f2c` (generated) as read by `WideNavigationRail.kt` (WideNavigationRailLayout, WideNavigationRailItemDefaults); `WNRItemHorizontalPadding` generated into `components/navigation-defaults.css`. Legacy `NavigationRail.kt` literals generated likewise. Modal rail values stay for M7.
33. Navigation drawer tokens.
34. Tabs tokens.
35. Chip tokens and expressive morph properties — partly resolved: assist chip from `AssistChipTokens.kt@19991f2c` (generated) and the `AssistChipDefaults` literals Compose renders (`Chip.kt` L1962, L2918 via `DefaultHorizontalArrangement` L4306; generated into `components/assist-chip-defaults.css`). Still open: filter/input/suggestion chip tokens and the selection morph (`ChipsTokens` shapes through `shapeByInteraction`, `Chip.kt` L3288–3346), to be verified when those chips land.
36. ~~Card tokens~~ — resolved: `{Filled,Elevated,Outlined}CardTokens.kt@19991f2c` (generated) as read by `CardDefaults` (`Card.kt`): content = contentColorFor(container) = onSurface (`ColorScheme.kt` L1108–1116); outlined cards keep their default elevation on press/focus/hover (`outlinedCardElevation`); disabled colors composited per `CardDefaults` with `DisabledAlpha` 0.38 (`ColorScheme.kt` L1544). Elevation changes use the `ElevationDefaults` tweens (`internal/Elevation.kt` L107–113; FastOutSlowInEasing from animation-core `Easing.kt` L50), now also used by buttons.
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
52. ~~Divider tokens~~ — resolved: `DividerTokens.kt@19991f2c` (generated; Thickness 1dp, Color OutlineVariant) as read by `DividerDefaults` (`Divider.kt` L111–118).
53. Carousel tokens.
54. Segmented button guidance.
55. Pull-to-refresh indicator.
56. Final component inventory diff against the package-summary.
57. `linear()` browser support — resolved (Chrome/Edge 113, Firefox 112, Safari 17.2); recheck at each release.
58. ~~React Aria and Motion versions~~ — resolved 2026-10-12: react-aria 3.53.1, motion 14.1.0. Astro and tooling resolved 2026-10-11 — see the pinned versions table.
59. ~~expressiveLightColorScheme()~~ — resolved: `ColorScheme.kt@19991f2c` L1172–1179 (four `on*Container = PaletteTokens.*30` overrides); vendored and parsed by m3e-codegen.
60. Which components support density and their per-step values (m3.material.io shows only button and text field; spacing page image shows 0 to −4 vs 0 to −3 on the density page).
61. Focus ring shape (no token; material-web legacy ring uses corner-full) and focus ring motion (material-web labs: 150ms + 450ms `cubic-bezier(0.2, 0, 0, 1)`; Compose inset ring uses springs, `Ripple.kt@19991f2c` L852–853).
62. Material Theme Builder's mapping from a custom core color (secondary, tertiary, neutral, neutral variant, error) to a tonal palette. No m3.material.io page or MCU 0.4.0 file documents it, and Theme Builder's source is not public. `createTheme({ coreColors })` uses `TonalPalette.fromInt(color)` (the color's own hue and chroma; `palettes/tonal_palette.js` L27–L37) passed to `new DynamicScheme({ …, secondaryPalette, … })` (`dynamiccolor/dynamic_scheme.d.ts` L56–L69, `dynamic_scheme.js` L50–L68), the same mapping as Google's Angular Material `theme-color` schematic (`src/material/schematics/ng-generate/theme-color/index.ts@angular/components 3521e20c` L130–L175: `TonalPalette.fromHct` for each given color, on MCU `^0.4.0`). MCU's deprecated `CorePalette.fromColors` instead keeps the role's fixed chroma (secondary 16, neutral 4, neutral variant 8; `palettes/core_palette.js` L64–L105), which would tint a grey neutral. Compare Theme Builder exports for the same inputs before relying on exact parity.
