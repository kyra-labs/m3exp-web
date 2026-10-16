---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Window size class utilities (M7, FOUNDATIONS §9; androidx window-core `WindowSizeClass` and Compose Material3 adaptive): new `--m3e-sys-window-{width,height}-*` tokens and the `windowBreakpoints` JS tokens (min-width 600 / 840 / 1200 / 1600, min-height 480 / 900), m3e-motion `windowSizeClass`, `windowWidthSizeClass`, `windowHeightSizeClass`, `isWidthAtLeastBreakpoint`, `isHeightAtLeastBreakpoint`, `isAtLeastBreakpoint`, `sameWindowSizeClass`, `paneScaffoldDirective` (Compose `calculatePaneScaffoldDirective`), `navigationSuiteType` (`NavigationSuiteScaffoldDefaults.navigationSuiteType`) and `WINDOW_WIDTH_BREAKPOINTS` / `WINDOW_HEIGHT_BREAKPOINTS`, m3e-elements `observeWindowSizeClass` and `currentWindowSizeClass` (viewport via `matchMedia`, or an element's content box via ResizeObserver) in a new `window-size-class.js` entry that also re-exports the classification, and the m3e-react `useWindowSizeClass` hook.
