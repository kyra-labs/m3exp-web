# ROADMAP.md — m3exp-web

Each milestone ships when its Definition of Done (DoD) is met **and** the owner signs off on the manual review. Deprecated components (D4) ship in the same milestone as their replacement, marked `@deprecated`.

## M1 — Monorepo, tooling, CI, CLAUDE.md
- **Scope:** pnpm workspaces; strict tsconfig; tsup builds (ESM + d.ts); ESLint + stylelint with a "no literal values" rule; Vitest; Playwright (Chromium/Firefox/WebKit); axe; size-limit; Changesets; `LICENSE` + `NOTICE` per D9; GitHub Actions (lint, test, visual, size, build); Astro docs app skeleton; `DECISIONS.md` and `CLAUDE.md` committed; `M3eElement` zero-dependency base class (D7) with tests.
- **DoD:** CI green on an empty package of each layer; `pnpm build` emits JS + d.ts; `@kyralabs/m3exp-web` umbrella re-exports build.
- **Review:** repo layout, CLAUDE.md rules, NOTICE wording, base-class API.

## M2 — Tokens, fonts, icons
- **Scope:** `m3e-codegen` fetches pinned androidx token files, parses `get() =` value-class lines and references, emits CSS vars + JS objects for shape, type, elevation, state and component tokens; MCU color for all variants × light/dark × contrast, default `specVersion` = latest shipped (D3). Theme CLI + `createTheme`. **Fonts (D1):** pin Google Sans Flex, verify axes/license, self-host woff2, generate `fonts.css` with `@font-face` and `size-adjust` fallbacks, map typescale → axes. **Icons (D5):** bundle Material Symbols, `m3e-icons subset` CLI. Every `TODO(verify)` from token files is resolved here.
- **DoD:** generator re-run is byte-identical; color snapshots match MCU for 5 seeds × 9 variants × 2 modes × 3 contrasts; token parity table generated; fonts load offline in the playground; subset CLI output renders the requested glyphs; TODO register items 2–17 closed.
- **Review:** color swatches vs Material Theme Builder / Compose catalog for the same seed; typescale specimen vs m3.material.io with Google Sans Flex.

## M3 — Motion + shapes math
- **Scope:** `m3e-motion` (spring solver matching Compose `SpringSimulation`, damping conversion, `linear()` sampler, bezier fallback tokens); `m3e-shapes` (graphics-shapes port + 35 MaterialShapes + Morph → SVG path).
- **DoD:** Vitest spring positions match Compose reference samples (JVM harness export) within 1e-4; shape cubics match Kotlin reference dump within 1e-4; morph midpoints match.
- **Review:** playground page with all 35 shapes and a morph scrubber vs the Compose catalog.

## M4 — Kyra Labs org-site minimum set (early milestone)
- **Scope:** Surface/Icon/StateLayer/FocusRing primitives, Button (all variants/sizes), Icon button, Card, Top app bar (small), Navigation bar + rail (static, incl. deprecated legacy variants), Divider, Chips (assist), Loading indicator.
- **Delivery:** all layers, playground pages, visual tests, Astro example site using `client:only` islands (D6).
- **DoD:** the Astro org site builds with zero client JS except LoadingIndicator/nav islands; Lighthouse a11y = 100; budgets (D2) re-measured and confirmed or amended in DECISIONS.md.
- **Review:** button press morph and sizes vs Compose catalog; dark mode; reduced motion; font rendering on Windows/macOS/Android.

## M5 — Actions II
- Button group, Split button, FAB (incl. deprecated small), Extended FAB, FAB menu, Menus.
- **DoD:** interruptible springs verified by Playwright traces.
- **Review:** FAB menu open/close feel; button-group width bounce.

## M6 — Progress & toolbars
- Linear/circular flat + wavy progress, Floating toolbar, Docked toolbar (+ deprecated BottomAppBar), flexible Top app bars, Search/AppBarWithSearch.
- **Review:** wave speed/amplitude; toolbar scroll behavior.

## M7 — Navigation & adaptive
- ShortNavigationBar, WideNavigationRail (+modal), Drawer, Navigation suite, Tabs, window size class utilities, canonical layouts.
- **Review:** resize from 360→1800px.

## M8 — Selection & input
- Checkbox, Radio, Switch, Slider (all sizes/vertical), Text fields, Chips (all), Lists (incl. segmented; deprecated non-expressive ListItem).
- **Review:** form keyboarding; slider handle morph.

## M9 — Containment & feedback
- Dialogs, Bottom sheets, **Side sheets (D8)**, Snackbar, Tooltips, Badge, Carousel, Pull to refresh, deprecated Segmented button.
- **Review:** side sheets vs m3.material.io (sole reference); sheet drag feel.

## M10 — Pickers
- Date picker, Time picker (dial/input/scroll).

## M11 — Hardening
- Docs completeness, API review, bundle audit, a11y audit, TODO(verify) register at zero, deprecation notices documented with 2.0 removal plan. No version gate: 1.0.0 shipped after M4 (D16), and breaking changes wait for 2.0.

## Per-component DoD (all milestones)
- css + elements/react as specified.
- Playground page with every variant/size/state.
- Visual baselines light/dark × 3 browsers.
- axe clean.
- Acceptance checklist all ticked.
- Docs entry with sources.
