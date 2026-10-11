# FOUNDATIONS_SPEC.md — m3exp-web

Convention: every concrete value cites its source. **Generated values win:** `packages/m3e-tokens/src/generated/PARITY.md` lists every token emitted from the pinned androidx sources with file:line; where a table below disagrees with it, the generated value is authoritative (CLAUDE.md source priority).

 Values marked `TODO(verify)` were located only through secondary sources and must be read from the pinned androidx file by `m3e-codegen` before use. The register of all TODOs lives in SOURCES.md.

## 1. Color
**Source:** `@material/material-color-utilities` 0.4.0 (npm), TypeScript `dynamiccolor/` + `scheme/`. Scheme classes take `(sourceColorHct, isDark, contrastLevel, specVersion?, platform?)`; e.g. `typescript/scheme/scheme_expressive.ts`: "A Dynamic Color theme that is intentionally detached from the source color."

**Roles (CSS var `--m3e-sys-color-<kebab>`):**
- Primary: primary, on-primary, primary-container, on-primary-container, inverse-primary, primary-fixed, primary-fixed-dim, on-primary-fixed, on-primary-fixed-variant.
- Secondary: the same roles for secondary (minus inverse).
- Tertiary: the same roles for tertiary (minus inverse).
- Error: error, on-error, error-container, on-error-container.
- Surfaces: surface, on-surface, surface-variant, on-surface-variant, surface-dim, surface-bright, surface-container-lowest, surface-container-low, surface-container, surface-container-high, surface-container-highest, surface-tint, inverse-surface, inverse-on-surface, background, on-background.
- Other: outline, outline-variant, shadow, scrim.
- Verified in the published 0.4.0 build: spec 2025 adds `primary-dim`, `secondary-dim`, `tertiary-dim`, `error-dim`; spec 2021 leaves them undefined (`dynamiccolor/color_spec_2021.js`, e.g. `primaryDim() { return undefined; }`). Roles are enumerated from `MaterialDynamicColors` (53 in spec 2025, 49 in spec 2021); Compose's `ColorSchemeKeyTokens` roles are a subset (test).

**Variants:** monochrome, neutral, tonalSpot (default), vibrant, expressive, fidelity, content, rainbow, fruitSalad (MCU `Variant` enum).

**Contrast:** `contrastLevel` runs from −1 to 1, where 0 is standard (MCU `DynamicScheme`). Web presets are 0 / 0.5 / 1. Verified: spec 2025 treats negative contrast as standard (0) — e.g. tonalSpot `#6750A4` primary is identical at −1, −0.5 and 0 — while spec 2021 lowers contrast (test).

**Spec versions (D3):** 0.4.0 ships `SpecVersion = '2021' | '2025'` (`dynamiccolor/color_spec.d.ts` L21; no 2026), so the default is **2025**. MCU's own `DynamicScheme.DEFAULT_SPEC_VERSION` is still "2021", so it is always passed explicitly. Both remain selectable via `specVersion`.

**Packaging:** 0.4.0's published ESM uses extensionless relative imports (e.g. `scheme/scheme_tonal_spot.js` → `'../dynamiccolor/dynamic_scheme'`) that plain Node cannot load, so `@kyralabs/m3e-tokens` bundles it (license headers kept) instead of depending on it at runtime.

**Expressive fallback scheme:** Compose `expressiveLightColorScheme()` = `lightColorScheme(onPrimaryContainer = Primary30, onSecondaryContainer = Secondary30, onTertiaryContainer = Tertiary30, onErrorContainer = Error30)` (verified: `ColorScheme.kt@19991f2c` L1172–1179; dark mode uses `darkColorScheme()`, L1166). Shipped as `@kyralabs/m3e-tokens/theme.css`, generated from `ColorLightTokens`/`ColorDarkTokens`/`PaletteTokens` plus the overrides parsed from the vendored `ColorScheme.kt`.

**Scrim:** container opacity 0.32 (`ScrimTokens.kt@19991f2c` L25; generated as `--m3e-comp-scrim-container-opacity`).

## 2. Typography
**Source:** `TypographyTokens.kt`, `TypeScaleTokens.kt`, `TypefaceTokens.kt` (androidx tokens dir). Sizes are in `sp` and are emitted as `rem` (1rem = 16px = 16sp) so they respect browser font scaling.

| Role | Size/Line (sp) | Weight | Tracking |
|---|---|---|---|
| display-large | 57/64 | 400 | −0.2 |
| display-medium | 45/52 | 400 | 0 |
| display-small | 36/44 | 400 | 0 |
| headline-large | 32/40 | 400 | 0 |
| headline-medium | 28/36 | 400 | 0 |
| headline-small | 24/32 | 400 | 0 |
| title-large | 22/28 | 400 | 0 |
| title-medium | 16/24 | 500 | 0.2 |
| title-small | 14/20 | 500 | 0.1 |
| body-large | 16/24 | 400 | 0.5 |
| body-medium | 14/20 | 400 | 0.2 |
| body-small | 12/16 | 400 | 0.4 |
| label-large | 14/20 | 500 | 0.1 |
| label-medium | 12/16 | 500 | 0.5 |
| label-small | 11/16 | 500 | 0.5 |

- Sizes and line heights for display → title-large: Android Developers "Material Design 3 in Compose" page.
- Base weights: MDC-Android `docs/theming/Typography.md`.
- Verified at the pin: every size, line height and tracking above is generated from `TypeScaleTokens.kt@19991f2c` (display-large, body-medium and title-medium tracking were corrected from secondary sources). Weights resolve through `TypefaceTokens` (`FontWeight.Normal/Medium/Bold` = 400/500/700, `FontWeight.kt` L60–66).

**Emphasized (15 styles, `*-emphasized`):** same size and line height; **tracking differs** from the base style for some roles (e.g. body-large 0.5 → 0.15, display-large −0.2 → 0, title-medium 0.2 → 0.15 — see PARITY.md). Weights are 500 (Medium), except label-large/medium/small and title-medium/small, which are 700 (Bold). Sources: summary of TypographyTokens.kt (jethac/slint issue #3); MDC-Android Typography.md. Caveat: the emphasized block in `TypeScaleTokens.kt@19991f2c` (L249) sits under `// TODO update with the generated tokens once available`, so it is provisional upstream — re-check at each pin bump.

**Fonts (D1):**
- Compose's `TypefaceTokens.Brand/Plain` is `FontFamily.SansSerif` at the pin (`TypefaceTokens.kt` L25–29), not Roboto. m3exp-web deliberately diverges: the default brand and plain typeface is **Google Sans Flex**, self-hosted from `@kyralabs/m3e-tokens/fonts/`.
- Verified (google/fonts@bd8f81dd `ofl/googlesansflex`, v5.000): SIL OFL 1.1, no Reserved Font Names. Axes: ROND 0–100, opsz 1–144 (registry default 18), slnt −10–0, wdth 25–151, wght 1–1000. **There is no GRAD axis.** `"Google Sans Flex"` is a Google trademark: use it only to name the font, never to imply affiliation.
- Packaging: per-script woff2 chunks with Google Fonts' own `unicode-range` splits. `@kyralabs/m3e-tokens/fonts.css` (default) keeps wght + opsz and instances wdth/ROND/slnt at their defaults (latin ≈ 139 KB); `fonts-full.css` keeps every axis (latin ≈ 1 MB).
- Typescale → axis mapping: `font-weight` for weight; `opsz` left to `font-optical-sizing: auto`; `wdth` 100 by default. Emphasized styles set `font-weight` only: GSF has no GRAD axis, and no source at the pin uses ROND/wdth for emphasized type, so no `-variation` token is emitted.
- Tokens: `--m3e-ref-typeface-brand`, `--m3e-ref-typeface-plain` (both `"Google Sans Flex", "Google Sans Flex Fallback", system-ui, sans-serif`), `--m3e-sys-typescale-<role>-{font|weight|size|line-height|tracking}`.
- Fallback: `"Google Sans Flex Fallback"` = `local("Arial")` with `size-adjust` and ascent/descent/line-gap overrides computed from the pinned TTF against Arial 7.07 (codegen; values in `fonts/manifest.json`), so the swap does not shift layout.
- **Icons:** Material Symbols variable font bundled (D5), axes FILL 0–1, wght 100–700, GRAD −25–200, opsz 20–48 (`TODO(verify)` ranges against the google/fonts METADATA.pb for Material Symbols). Default `opsz` 24, `wght` 400, `GRAD` 0, `FILL` 0; selected states set `FILL` 1.

## 3. Shape
**Corner scale (`ShapeTokens.kt`):**

| Token | Value |
|---|---|
| none | 0 |
| extra-small | 4px |
| small | 8px |
| medium | 12px |
| large | 16px |
| large-increased | 20px |
| extra-large | 28px |
| extra-large-increased | 32px |
| extra-extra-large | 48px |
| full | rendered as `border-radius: calc(infinity * 1px)` |

Partial variants generated: extra-small-top, large-top/start/end, extra-large-top. Source: `ShapeTokens.kt@19991f2c` L28–81 (generated; partial shapes become four logical-corner variables `-start-start`, `-start-end`, `-end-end`, `-end-start`). "Full" is a true pill, not 50% of the component size.

**MaterialShapes presets (35):** Circle, Square, Slanted, Arch, Fan, Arrow, SemiCircle, Oval, Pill, Triangle, Diamond, ClamShell, Pentagon, Gem, Sunny, VerySunny, Cookie4Sided, Cookie6Sided, Cookie7Sided, Cookie9Sided, Cookie12Sided, Ghostish, Clover4Leaf, Clover8Leaf, Burst, SoftBurst, Boom, SoftBoom, Flower, Puffy, PuffyDiamond, PixelCircle, PixelTriangle, Bun, Heart.
- Source: `MaterialShapes` API reference (developer.android.com, "Added in 1.5.0-alpha23"); file `MaterialShapes.kt`.
- Each preset is normalized to a unit square. The TS port must reproduce the `RoundedPolygon` construction parameters verbatim from `MaterialShapes.kt`.

**Morph rules:**
- Port of `androidx.graphics.shapes` 1.1.0: `RoundedPolygon`, `CornerRounding` (radius, smoothing), `Cubic`, `Feature`/`FeatureDetector`, `Morph`, `FeatureMapping`, `PolygonMeasure`, `SvgPathParser`.
- Morph maps curves between shapes by proximity, distance to vertices and concavity, splitting curves when counts differ (AndroidX API docs). `Morph.calculateBounds()` added in 1.1.0.
- Morph setup is cached per shape pair. Each frame only evaluates `asCubics(progress)` → SVG `d`.
- Corner-radius morphs on rectangles (button press/select) use plain `border-radius` animation, not Morph.

## 4. Motion
**Source:** `MotionScheme.kt`, `tokens/StandardMotionTokens.kt`, `tokens/ExpressiveMotionTokens.kt`. Verified at the pin (`StandardMotionTokens.kt` L20–31, `ExpressiveMotionTokens.kt` L22–33; generated, header `VERSION: v0_14_0`). Compose `Damping` is the damping ratio ζ.

| Token | Standard ζ / k | Expressive ζ / k | JS damping c = 2ζ√k (std / expr) |
|---|---|---|---|
| fastSpatial | 0.9 / 1400 | 0.6 / 800 | 67.35 / 33.94 |
| defaultSpatial | 0.9 / 700 | 0.8 / 380 | 47.62 / 31.19 |
| slowSpatial | 0.9 / 300 | 0.8 / 200 | 31.18 / 22.63 |
| fastEffects | 1.0 / 3800 | 1.0 / 3800 | 123.29 / 123.29 |
| defaultEffects | 1.0 / 1600 | 1.0 / 1600 | 80.00 / 80.00 |
| slowEffects | 1.0 / 800 | 1.0 / 800 | 56.57 / 56.57 |

The damping column is derived (mass = 1) and tested in Vitest.

**Usage rule:**
- **Spatial** springs drive position, size, scale, rotation, corner radius and shape morph.
- **Effects** springs drive color, opacity and elevation. They must not overshoot.
- Fast for small components and micro-interactions; default for most; slow for full-screen or large transitions (Material blog "Adding Motion Physics with Jetpack Compose").
- Components choose a token, never raw numbers.

**CSS `linear()` approach:**
- `m3e-motion` integrates the spring analytically from 0→1 at rest, until |x−1| and |v| fall below 0.001. It emits `--m3e-sys-motion-<scheme>-<token>-easing: linear(...)` (≤ 40 stops, adaptive) and a matching `-duration` equal to the settle time.
- **Limits:** no velocity carry-over on interruption, fixed duration, overshoot baked to 0→1. Mid-flight reversal restarts the curve. Interactions needing interruptibility (drag, rapid toggles, FAB menu) must use the JS layer.
- **Official fallback:** m3.material.io Motion specs "Web: Convert springs to curves" table: Expressive fast spatial `0.42, 1.67, 0.21, 0.90` 350ms; default spatial `0.38, 1.21, 0.22, 1.00` 500ms; slow spatial `0.39, 1.29, 0.35, 0.98` 650ms; fast/default/slow effects `0.31,0.94,0.34,1.00` 150ms, `0.34,0.80,0.34,1.00` 200ms, `0.34,0.88,0.34,1.00` 300ms; Standard spatial `0.27,1.06,0.18,1.00` at 350/500/750ms. Emit these as `--…-bezier` tokens.
- **Reduced motion:** spatial springs snap (duration 0). Effects keep animating at fastEffects.
- **Legacy tokens:** `MotionTokens.kt` durations/easings (e.g. EasingStandardCubicBezier `0.2,0,0,1`; `MotionTokens.kt@19991f2c`, generated as `--m3e-sys-motion-duration-*` / `--m3e-sys-motion-easing-*`) are emitted for components still on tweens.

## 5. Elevation
Levels 0–5 = 0, 1, 3, 6, 8, 12 dp (`ElevationTokens.kt@19991f2c` L24–40; generated as `--m3e-sys-elevation-level0…5`).

Rendered as two-layer `box-shadow` using the `shadow` role. Surface tint is not applied (tonal surface containers are used instead).

## 6. State layers

| State | Opacity |
|---|---|
| hover | 0.08 |
| focus | 0.10 |
| pressed | 0.10 |
| dragged | 0.16 |

- Source: `StateTokens.kt@19991f2c` L22–25 (generated). Disabled opacities are per component (`Disabled*Opacity` in each `*Tokens.kt`, generated).
- Older Material Web tokens use 0.12 for focus/pressed. Do not copy them.
- Disabled: per component, e.g. filled button container 0.1 and content 0.38 with `OnSurface`/`OnSurfaceVariant` (generated).
- Implementation: `::before` overlay with `background: currentColor-role; opacity: var(--state)`.
- Focus indicator: `--m3e-sys-state-focus-indicator-thickness` 3dp, `-outer-offset` 2dp, `-inner-offset` −3dp (m3.material.io token DB v38.2.9 `md.sys.state.focus-indicator`; matches material-web 2.5.0). Color: `secondary` (every androidx `*Tokens.FocusIndicatorColor`). Compose has no web-style ring by default (`Ripple.kt` L360 uses a state layer); shape and motion are `TODO(verify)` (SOURCES register #61).

## 7. Spacing
- 8dp-based spacing system introduced at I/O 2026 (m3.material.io blog). Material Web 2.5.0 added a "spacing system stylesheet".
- Verified: `md.sys.measurement.space0…space900` on an 8dp base, emitted as `--m3e-sys-space-<step>` (0, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 450, 500, 600, 700, 800, 900 → 0–72px). Source: m3.material.io token DB v38.2.9 / m3.material.io/styles/spacing; matches material-web 2.5.0 labs. Not in Compose Material3 at the pin.

## 8. Density
- `--m3e-density: 0 | -1 | -2 | -3`. Each step subtracts 4px from container heights of density-capable components (text fields, lists, chips, top app bar), with a 48px target retained.
- Verified (m3.material.io/foundations/layout/grids-spacing/density): scale 0, −1, −2, −3; each step decreases top/bottom padding or overall height by 4dp; opt-in only; targets stay ≥48×48; density does not change automatically across breakpoints. Off by default. `TODO(verify)`: which components support density and their values (SOURCES register #60).

## 9. Adaptive layout
**Window size classes (width):** compact < 600; medium 600–839; expanded 840–1199; large 1200–1599; extra-large ≥ 1600. **Heights:** compact < 480, medium 480–899, expanded ≥ 900. Source: Android Developers "Use window size classes".

- Canonical layouts: list-detail, supporting pane, feed.
- Panes: 1 at compact/medium, 2 at expanded/large, up to 3 at extra-large (m3.material.io "Breakpoints").
- Implementation: CSS container queries on `.m3e-layout` plus a `useWindowSizeClass()` hook. Navigation suite switches bar → rail → expanded rail by class.

## 10. Fidelity limits (global)
See REQUIREMENTS §12 (ripple, haptics, fonts, dynamic color).
