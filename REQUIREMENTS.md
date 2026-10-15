# REQUIREMENTS.md — m3exp-web

## 1. Vision
**m3exp-web** (`@kyralabs/m3exp-web`, repo `kyralabs/m3exp-web`) is a production-grade, open-source implementation of Google's Material Design 3 Expressive (M3E) for the web. It aims to match the Compose Material3 catalog side by side. It is framework-free at its base and React-native at its top layer. It is not built on MUI, which follows Material 2.

Source of truth is Jetpack Compose Material3 **1.5.0-beta01** (the only complete code reference for M3E as of 2026-10-10; stable 1.4.0 lacks the Expressive set). See SOURCES.md.

## 2. Goals
1. Fidelity to Compose Material3 1.5.0-beta01 tokens, motion and shapes. Every value is traceable to a source file.
2. Zero-JS usage for everything CSS can express (tokens + CSS classes).
3. Accessible by default: WCAG 2.2 AA, plus APG keyboard patterns via React Aria.
4. Interruptible spring motion in JS layers. Precomputed `linear()` springs in CSS.
5. Generated tokens: dynamic color from a seed via `material-color-utilities`, all scheme variants, and contrast levels.
6. One API vocabulary across the CSS, Elements and React layers.
7. Ships as compiled ESM JS + `.d.ts` so plain React JS apps work without TypeScript.
8. Fonts and icons bundled and self-hosted (Google Sans Flex, Material Symbols) so consumers need no external font requests.

## 3. Non-goals
- Material 2 or MUI API compatibility.
- Wear OS, XR or TV-specific components.
- Wallpaper-based dynamic color. Browsers expose no wallpaper; seed or image extraction is the only path.
- Haptics parity (see §12).
- Vue, Svelte or Angular wrappers in v1. Web components cover non-React use.
- Pixel-identical font rasterization with Android.
- Server-side rendering / React Server Components in v1 (D6). Components must not break under SSR, but hydration parity is not tested or guaranteed.

## 4. Target users
- **Primary:** Kyra Labs products: existing React JS apps (no TS required), the organization site and landing pages (Astro static).
- **Secondary:** open-source users who want M3E on the web in React or plain HTML.

## 5. Architecture
pnpm monorepo, four published layers plus internal packages:

```
                    ┌──────────────────────────────┐
                    │ @kyralabs/m3e-react          │  React components
                    │ React Aria hooks + Motion    │  (springs, a11y)
                    └──────────────┬───────────────┘
                                   │ uses classes from
┌──────────────────────────────┐   │   ┌──────────────────────────────┐
│ @kyralabs/m3e-elements       │───┼──▶│ @kyralabs/m3e-css            │
│ zero-dependency custom       │   │   │ framework-free classes for   │
│ elements: menus, loading     │   │   │ every component/variant/     │
│ indicator, nav, shape morph  │   │   │ size/state                   │
└──────────────┬───────────────┘   │   └──────────────┬───────────────┘
               └───────────────────┴──────────────────┘
                                   │ consumes custom properties
                    ┌──────────────▼───────────────┐
                    │ @kyralabs/m3e-tokens         │  generated CSS vars
                    │ color/type/shape/elevation/  │  + JS token objects
                    │ spacing/motion, light/dark   │  + fonts (Google Sans
                    │                              │    Flex, Material Symbols)
                    └──────────────┬───────────────┘
                                   │ built by
     internal: @kyralabs/m3e-codegen (token generator from pinned androidx files + MCU)
               @kyralabs/m3e-motion (spring math, linear() sampler)
               @kyralabs/m3e-shapes (TS port of graphics-shapes + MaterialShapes)
               @kyralabs/m3e-icons  (Material Symbols subsetting CLI)
     umbrella: @kyralabs/m3exp-web (re-exports tokens + css + elements + react)
     apps/docs (Astro playground/docs), apps/visual (Playwright fixtures)
```

Rules:
- Dependencies point downward only.
- `m3e-css` never requires JS.
- `m3e-elements` has **no runtime dependencies** (D7). A ≤1 KB internal base class (`M3eElement`) provides attribute reflection, lifecycle and event helpers.
- `m3e-elements` and `m3e-react` both render the same DOM and class contract, so one Playwright baseline covers both.
- `m3e-motion` and `m3e-shapes` are published (internal-first) because both elements and react import them.
- `@kyralabs/m3exp-web` is a convenience umbrella; apps may depend on layer packages directly for smaller installs.

## 6. Browser support
- Latest 2 versions of Chrome, Edge, Firefox and Safari (desktop + iOS), evaluated at each release.
- Required platform features: CSS custom properties, `:focus-visible`, `@layer`, container queries, `color-mix()`, CSS `linear()` easing, `popover` attribute, `<dialog>`. `linear()` needs Chrome/Edge 113, Firefox 112 and Safari/iOS Safari 17.2 (Widely Available since 2026-06-11).
- Progressive enhancement: CSS anchor positioning and `@starting-style` are optional. Where they are missing, `m3e-elements` positions menus and tooltips in JS.
- `prefers-reduced-motion` and `forced-colors` must be honored.

## 7. Accessibility standard
- WCAG 2.2 AA, including 2.5.8 Target Size (Minimum) and 2.4.11 Focus Not Obscured.
- Interactive targets keep a ≥48×48 px hit area even when the visual is smaller (same rule M3 applies to XS/S buttons; m3.material.io button groups specs: "Extra small and small connected button groups have 48dp target areas").
- Keyboard and ARIA follow WAI-ARIA APG patterns. React uses React Aria; Elements re-implement the same patterns.
- axe-core runs with zero violations on every playground page in CI.

## 8. Performance budgets (D2)
| Package | Budget (min+brotli) |
|---|---|
| m3e-tokens (CSS, one theme light+dark; fonts excluded) | ≤ 12 KB |
| m3e-css (all components) | ≤ 45 KB; per-component entry ≤ 4 KB |
| m3e-elements (all) | ≤ 30 KB; per-element ≤ 8 KB |
| m3e-shapes (all 35 presets + Morph) | ≤ 14 KB |
| m3e-react (excluding peer deps) | ≤ 60 KB; tree-shakeable per component |
| Fonts | Google Sans Flex woff2 and Material Symbols are budgeted separately and reported in CI, not failed. Subsetting is the lever (§10). |

- CSS-only usage ships 0 bytes of JS.
- CI fails if a budget is exceeded (size-limit). Budgets are revisited after M4 with measured numbers.
- No layout thrash in springs: animate only transform/opacity/clip-path/`d` where possible.

## 9. Theming API
- **Inputs:** `seed` (hex), `variant` (`tonalSpot | neutral | vibrant | expressive | fidelity | content | rainbow | fruitSalad | monochrome`), `mode` (`light | dark | system`), `contrast` (number −1…1; presets `standard=0`, `medium=0.5`, `high=1`), `specVersion` (default = latest shipped by MCU 0.4.0, D3; older selectable), `motionScheme` (`expressive | standard`, default `expressive`, matching `MaterialExpressiveTheme`), optional `coreColors` (hex `secondary`, `tertiary`, `neutral`, `neutralVariant`, `error`; each replaces the palette derived from `seed`, like Material Theme Builder core colors), and optional overrides per role.
- **Build-time:** CLI `m3e-theme --seed "#6750A4" --variant expressive --out theme.css` emits `:root` + `[data-theme="dark"]` + `@media (prefers-color-scheme)` blocks.
- **Runtime (CSR):** `createTheme(options)` returns `{ cssText, tokens }`. `<ThemeProvider>` (React) and `<m3e-theme>` (element) set the CSS vars on a subtree. Nesting is allowed.
- **Image seed:** `seedFromImage(img)` uses the MCU quantizer + score.
- **Fonts:** `m3e-tokens/fonts.css` registers `@font-face` for Google Sans Flex and `m3e-tokens/material-symbols.css` for Material Symbols, both from the package. `fonts-rond.css` (adds the ROND axis, D15) and `fonts-full.css` (every axis, D11) replace `fonts.css` when imported instead of it. Consumers may override `--m3e-ref-typeface-brand` / `--m3e-ref-typeface-plain`.

## 10. Icons (D5)
- `@kyralabs/m3e-tokens` bundles the Material Symbols variable font (Rounded by default as a project brand choice, D12 — no M3 source names a default style; Outlined/Sharp available as separate entries: `material-symbols-outlined.css`, `material-symbols-sharp.css`).
- `<Icon name="home" fill weight grade opticalSize />` (React) and `<m3e-icon name="home" fill>` (element) set the `FILL`, `wght`, `GRAD`, `opsz` axes via `font-variation-settings`. CSS-only: `<span class="m3e-icon" data-fill>home</span>`.
- `m3e-icons subset --names home,search,menu --out icons.woff2` produces a subset font and matching CSS so production apps avoid the multi-MB full file.

## 11. Consumption
**React JSX (no TypeScript):**
```jsx
import '@kyralabs/m3e-tokens/fonts.css';
import '@kyralabs/m3e-tokens/theme.css';
import '@kyralabs/m3e-css/index.css';
import { ThemeProvider, Button, LoadingIndicator, Icon } from '@kyralabs/m3e-react';

export default function App() {
  return (
    <ThemeProvider seed="#3D5AFE" variant="expressive" mode="system">
      <Button variant="filled" size="medium" shape="round" icon={<Icon name="save" />} onPress={save}>Save</Button>
      <LoadingIndicator contained aria-label="Loading" />
    </ThemeProvider>
  );
}
```
**Plain HTML:**
```html
<link rel="stylesheet" href="https://unpkg.com/@kyralabs/m3e-tokens/fonts.css">
<link rel="stylesheet" href="https://unpkg.com/@kyralabs/m3e-tokens/theme.css">
<link rel="stylesheet" href="https://unpkg.com/@kyralabs/m3e-css/index.css">
<script type="module" src="https://unpkg.com/@kyralabs/m3e-elements/loading-indicator.js"></script>
<button class="m3e-button m3e-button--filled m3e-button--size-m m3e-button--round">
  <span class="m3e-icon">save</span> Save
</button>
<m3e-loading-indicator contained aria-label="Loading"></m3e-loading-indicator>
```
**Astro:**
```astro
---
import '@kyralabs/m3e-tokens/fonts.css';
import '@kyralabs/m3e-tokens/theme.css';
import '@kyralabs/m3e-css/index.css';
import { NavigationBar } from '@kyralabs/m3e-react';
---
<a class="m3e-button m3e-button--tonal m3e-button--size-l" href="/contact">Contact</a>
<NavigationBar client:only="react" items={items} />
```
Note: `client:only` (not `client:visible`) is the supported directive while v1 is CSR-only (D6).

## 12. Fidelity limits (global)
- **Ripple:** Compose draws an expanding ripple from the touch point. The web approximates it with a radial gradient on the state layer from the pointer position, animated with defaultEffects.
- **Haptics:** none (`navigator.vibrate` is unsupported on iOS and inappropriate on desktop). Documented as a no-op.
- **Fonts:** rasterization differs by OS, so visual tests compare per-browser baselines, not against Android pixels.
- **Dynamic color:** seed or image only.

## 13. Decisions
All previously open questions are resolved in `DECISIONS.md` (D0–D9). There are no open questions at this time. New questions are appended there, not here.
