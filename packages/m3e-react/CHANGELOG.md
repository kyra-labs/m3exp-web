# @kyralabs/m3e-react

## 1.4.0

### Minor Changes

- 8a15a95: Docked toolbar (M6, COMPONENT_SPEC §10; Compose `FlexibleBottomAppBar`): spread, center, space-around and space-evenly arrangements, standard and vibrant colors, exit-on-scroll on the fast spatial snap spring. New `components/docked-toolbar-defaults.css` and `components/bottom-app-bar-defaults.css` tokens (the BottomAppBarDefaults values Compose renders), m3e-css `docked-toolbar.css`, m3e-elements `<m3e-docked-toolbar>` plus the `docked-toolbar-layout.js` (DockedToolbarLayout) entry, and m3e-react `<DockedToolbar>`. The legacy bottom app bar ships deprecated (D4): m3e-css `bottom-app-bar.css` and m3e-react `<BottomAppBar>` (one-time dev warning). The exit-always scroll code is now shared by the floating toolbar, the docked toolbar and the top app bar (no behavior change).
- b47dd0b: Floating toolbar (M6, COMPONENT_SPEC §9): horizontal and vertical, standard and vibrant, with a FAB, expanded/collapsed and exit-on-scroll. New `components/floating-toolbar-defaults.css` tokens (the FloatingToolbarDefaults values Compose renders), m3e-css `floating-toolbar.css`, m3e-motion floating toolbar scroll math and `toolbarNavigationTarget`, m3e-elements `<m3e-floating-toolbar>` plus the `floating-toolbar-layout.js` (FloatingToolbarLayout) and `roving-focus.js` (RovingFocus) entries, and m3e-react `<FloatingToolbar>`.
- fb3fa26: Progress indicators (COMPONENT_SPEC §8): linear and circular, flat and wavy, determinate and indeterminate, default (4dp) and thick (8dp). m3e-css `linear-progress.css` / `circular-progress.css`: flat indicators in CSS only (the value is `--m3e-comp-progress-indicator-value`, 0–1; indeterminate lines and arcs run Compose's keyframes), modifiers `--wavy`, `--thick`. m3e-elements: `<m3e-linear-progress>` / `<m3e-circular-progress>` (`value`, `shape`, `thickness`, `amplitude`, `wavelength`, `wave-speed`, `label`) and the shared `@kyralabs/m3e-elements/progress-indicator.js` drivers: values spring on `ProgressIndicatorDefaults.ProgressAnimationSpec` with their velocity kept, wavy indicators draw Compose's wave (linear quadratic wave, circular star morphed from a circle) every frame, travelling one wavelength per second, with the determinate amplitude ramp. m3e-react: `<LinearProgress>` / `<CircularProgress>` with the same props. m3e-tokens: `components/progress-indicator-defaults.css` (the ProgressIndicator / WavyProgressIndicator values Compose renders that are not in the token files, and the indeterminate keyframes). m3e-motion: `cubicBezier`, the progress timelines and `AmplitudeAnimation`. m3e-shapes: `PathMeasure`, `LinearWavyPathCache`, `CircularWavyPathCache` and `Q` path commands.
- 0cda9f5: Search (M6, COMPONENT_SPEC §12; Compose `SearchBar`, `SearchBarDefaults.InputField`, `AppBarWithSearch` and the four expanded views): the collapsed search bar, the full-screen, full-screen contained, docked and docked-with-gap expanded views (expand / collapse on Compose's SearchBarState springs and fades, interruptible), the ARIA combobox (virtual focus over a results listbox), light dismiss and the full-screen focus trap, and AppBarWithSearch with its enter-always scroll behavior and scrolled colors. New `components/search-defaults.css` tokens (the SearchBarDefaults / SearchBar.kt values Compose renders), m3e-css `search.css`, m3e-motion `SearchBarAnimation`, `searchViewFrame` and `searchNavigationTarget`, m3e-elements `<m3e-search>` / `<m3e-search-result>` plus the `search-layout.js` (SearchLayout) entry, and m3e-react `<SearchBar>`, `<SearchResult>` and `<AppBarWithSearch>`.
- 38b31d0: Top app bars (M6, COMPONENT_SPEC §11): center-aligned (Compose `CenterAlignedTopAppBar`, or any bar with `titleHorizontalAlignment` center), medium and large flexible (`MediumFlexibleTopAppBar`, `LargeFlexibleTopAppBar`, with title + subtitle) and two-rows (`TwoRowsTopAppBar`: custom heights, per-row titles), plus the exit-until-collapsed scroll behavior: the expanded row collapses with the scroll to the 64dp small bar, the titles crossfade and the container color follows the collapsed fraction, as Compose computes them. `components/top-app-bar-defaults.css` gains the TopAppBarDefaults heights, the title bottom paddings, the snap spring and the two-rows easings; m3e-css adds `.m3e-top-app-bar--center-aligned`, `--medium-flexible`, `--large-flexible`, `--two-rows` and the `__expanded` part; m3e-motion adds `exit-until-collapsed` to `scrollAppBar` and `twoRowsFrame` (on the shared `cubicBezier`); `attachTopAppBarScroll` accepts `behavior: 'exit-until-collapsed'` and drives two-rows bars; `<TopAppBar>` accepts `variant` `'center-aligned' | 'medium-flexible' | 'large-flexible' | 'two-rows'`, `titleHorizontalAlignment`, `collapsedHeight` / `expandedHeight` and per-row `title` / `subtitle` functions. The small bar's DOM and classes are unchanged; its snap now jumps under `prefers-reduced-motion` (spatial motion off, CAC) and reads the generated `--m3e-comp-top-app-bar-snap-*` spring (still default effects).

### Patch Changes

- Updated dependencies [8a15a95]
- Updated dependencies [b47dd0b]
- Updated dependencies [fb3fa26]
- Updated dependencies [0cda9f5]
- Updated dependencies [38b31d0]
  - @kyralabs/m3e-motion@1.4.0
  - @kyralabs/m3e-shapes@1.4.0

## 1.3.0

### Minor Changes

- 1fe7143: FAB and extended FAB (COMPONENT_SPEC §5). m3e-css `fab.css`: `.m3e-fab` (baseline 56dp, `--size-medium` 80dp, `--size-large` 96dp; `--size-small` 40dp is deprecated, D4) and `.m3e-extended-fab` (small 56dp, `--size-medium`, `--size-large`, `--collapsed`, `__label`), six color styles (`--primary-container` default, `--secondary-container`, `--tertiary-container`, `--primary`, `--secondary`, `--tertiary`), Level3 elevation with Level4 on hover. m3e-react: `<Fab>`, `<ExtendedFab>` (collapses to its icon with an interruptible width spring when `expanded={false}`; the label stays its accessible name) and `useExtendedFabScroll()`; `<Fab size="small">` warns once in development. m3e-tokens: `components/fab-defaults.css` with the `FloatingActionButtonDefaults` values Compose renders that are not in the token files. The plain-HTML ripple (`ripple.js`) covers both FABs.
- c3c2227: FAB menu (COMPONENT_SPEC §6). m3e-css `fab-menu.css`: `.m3e-fab-menu` with `--open`, the toggle `.m3e-fab.m3e-fab-menu__toggle` (shrinks from the FAB size to the 56dp close button, rounds to a circle, mixes to the color set's role and swaps its icon at half progress), `.m3e-fab-menu__items[role=menu]` and `.m3e-fab-menu__item` pills; `--size-medium` / `--size-large` (the FAB it opens from), `--secondary` / `--tertiary` color sets and `--align-start` / `--align-center`. m3e-elements: `<m3e-fab-menu>` with `<m3e-fab-menu-item>` children (`@kyralabs/m3e-elements/fab-menu.js`), events `open-change` and `action`. m3e-react: `<FabMenu items open onOpenChange icon closeIcon size color align>` and `fabMenuClassName()`. Both JS layers run Compose's interruptible springs (toggle on fast spatial, items staggered on slow effects with their own width and alpha springs), leave focus on the close button when opening (ArrowDown/Tab enter the items, as in Compose), keep focus in the menu while open, and close on Escape, an outside press or an item press. m3e-tokens: `components/fab-menu-defaults.css` with the `FloatingActionButtonMenu.kt` values Compose renders that are not in `FabMenuBaselineTokens`. m3e-motion: `SpringAnimatable` (Compose Animatable semantics), `fabMenuItemVisible()` and `menuNavigationTarget()`.
- e80d775: Button group (COMPONENT_SPEC §3): standard and connected groups, sizes XS–XL, round/square, single/multiple selection and an overflow menu. m3e-css `button-group.css` (`.m3e-button-group`, `--connected`, `--size-*`, `--overflow`, `__item`, `__overflow`; `.m3e-button` with `aria-checked` now styles as a toggle). m3e-elements `<m3e-button-group>` / `<m3e-button-group-item>` (events `change`, `action`) and the `button-group-layout.js` entry (`ButtonGroupLayout`: press width springs with Compose's `ExpandedRatio`, interruptible corner springs, roving tabindex, overflow measurement). m3e-react `<ButtonGroup>` / `<ButtonGroupItem>`. m3e-motion `buttonGroupWidths` and `buttonGroupVisibleCount` (ports of `ButtonGroupMeasurePolicy`). m3e-tokens `components/button-group-defaults.css`: `ButtonGroupDefaults` values Compose renders plus the per-size m3.material.io token DB values Compose lacks (XS between-space 18dp, M/L/XL 8dp, connected corners per size).
- 2d5f9f0: Menus (COMPONENT_SPEC §21): the expressive vertical menu in standard and vibrant colors, segmented with groups, checkable and selectable items, submenus, and Compose's baseline `DropdownMenu`.
  
  - `@kyralabs/m3e-tokens`: `components/menu-defaults.css` (and `menuDefaults` in `./components`) with the `Menu.kt` / `MenuDefaults.kt` values Compose renders that are not in `Menu*Tokens`.
  - `@kyralabs/m3e-css`: `menu.css` (`.m3e-menu`, `--vibrant`, `--baseline`, `__group`, `__label`, `__divider`, `__item` and its parts). Menu items join the state layer and get an inward focus ring.
  - `@kyralabs/m3e-elements`: `<m3e-menu>`, `<m3e-menu-item>` and `<m3e-menu-group>` (`menu.js`), and `MenuPopup` (`menu-popup.js`): Compose's `DropdownMenuPositionProvider` placement (flips above when there is no room) and the interruptible open/close scale and fade springs.
  - `@kyralabs/m3e-react`: `MenuTrigger`, `Menu`, `MenuItem` and `MenuSection` (React Aria `useMenu`, typeahead, `selectionMode`, `submenu`).
  - `@kyralabs/m3e-motion`: `menuPosition` and `menuTransformOrigin`, ports of `DropdownMenuPositionProvider` and `calculateTransformOrigin`.
- 2540c01: Split button (COMPONENT_SPEC §4): a leading button for the primary action and a trailing button that opens a menu, in filled, tonal, elevated and outlined, sizes XS–XL. m3e-css `split-button.css`: `.m3e-split-button` around two `.m3e-button`s (`__leading`, `__trailing`) with the SplitButton*Tokens paddings, inner corners (pressed; full while open, `aria-expanded="true"`), trailing icon size and rotation, and Compose's optical centering of the trailing icon. m3e-elements: `<m3e-split-button label icon menu-label variant size>` (`@kyralabs/m3e-elements/split-button.js`) anchors its `<m3e-menu>` child to the trailing button and emits `press`. m3e-react: `<SplitButton variant size icon onPress menu={<Menu>…</Menu>} menuLabel>`. Both spring the inner corners (default effects) and the icon (Compose samples' `spring()`) with their velocity kept. m3e-tokens: `components/split-button-defaults.css` with the `SplitButtonDefaults` values Compose renders that are not in the token files.

### Patch Changes

- Updated dependencies [c3c2227]
- Updated dependencies [e80d775]
- Updated dependencies [2d5f9f0]
  - @kyralabs/m3e-motion@1.3.0
  - @kyralabs/m3e-shapes@1.3.0

## 1.2.0

### Patch Changes

- @kyralabs/m3e-motion@1.2.0
  - @kyralabs/m3e-shapes@1.2.0

## 1.1.0

### Patch Changes

- @kyralabs/m3e-motion@1.1.0
  - @kyralabs/m3e-shapes@1.1.0

## 1.0.1

### Patch Changes

- 54a6f5b: Dev-only console warnings no longer fire in production builds: the D4 deprecation warnings (NavigationBar, NavigationRail) and the missing-label warning (IconButton, IconToggleButton). The library build had baked `process.env.NODE_ENV` in as "development", and the guard also stayed on in browser bundles that define `process.env.NODE_ENV` but not `process` (Vite, webpack 5). `process.env.NODE_ENV` is now left for the consumer's bundler; unbundled ESM still warns.
- c7b731c: Single-component imports now tree-shake (REQUIREMENTS §8). Top-level `forwardRef`/`createContext`
  calls in m3e-react and m3e-shapes' module constants carry `/* @__PURE__ */`, so
  `import { Icon } from '@kyralabs/m3e-react'` drops the other components, react-aria, motion and
  m3e-shapes (26.7 kB → 0.3 kB min+brotli). No API or behavior change.
- Updated dependencies [c7b731c]
  - @kyralabs/m3e-shapes@1.0.1
  - @kyralabs/m3e-motion@1.0.1

## 1.0.0

### Major Changes

- cefe6f4: publish initial version

### Patch Changes

- Updated dependencies [cefe6f4]
  - @kyralabs/m3e-motion@1.0.0
  - @kyralabs/m3e-shapes@1.0.0
