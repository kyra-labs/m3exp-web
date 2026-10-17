# @kyralabs/m3exp-web

## 1.5.0

### Minor Changes

- 1e86a0b: Canonical layouts (M7, COMPONENT_SPEC §16a; Compose `ListDetailPaneScaffold`, `SupportingPaneScaffold`, `ThreePaneScaffold` and their navigators, plus the m3.material.io feed): list-detail and supporting-pane layouts that show one pane below 840px of their own width, two from 840px and three (with an extra pane) from 1600px — m3.material.io's Breakpoints; `pane-rule="compose"` / `paneRule="compose"` follows Compose's `calculatePaneScaffoldDirective`, three panes from 1200px — sized by a container query on `.m3e-layout`, so they adapt inside a navigation suite's content area. Navigation between panes follows Compose's navigator (`navigateTo`, `navigateBack` with the four back behaviors, history awareness), moves panes on Compose's pane motion (spring 0.8 / 380, the default enter / exit transitions, interruptible) and moves focus to the new destination and back. A pane expansion drag handle (`drag-handle` / `hasDragHandle`) splits two panes and settles on anchors. New `components/pane-scaffold-defaults.css` tokens (partition spacer, default pane sizes, pane motion spring, feed margins / gap / column width), m3e-css `layout.css` (`.m3e-layout`, `.m3e-pane-scaffold` with `--list-detail`, `--supporting-pane`, `--compose`, `__pane--primary|secondary|tertiary`, `__drag-handle`; `.m3e-feed` with `__item--wide`) and `vertical-drag-handle.css` (`.m3e-vertical-drag-handle`), m3e-motion `three-pane-scaffold` ports (`calculateThreePaneScaffoldValue`, `ThreePaneScaffoldNavigator`, `threePaneScaffoldDirective`, `threePaneScaffoldLayout`, `calculatePaneMotion`, `paneTransitions`, `ThreePaneScaffoldAnimation`, pane expansion anchors, `ListDetailPaneScaffoldRole`, `SupportingPaneScaffoldRole`), m3e-elements `<m3e-list-detail-layout>`, `<m3e-supporting-pane-layout>` and the `pane-scaffold-layout.js` (PaneScaffoldLayout), `pane-motion.js` and `pane-expansion.js` entries, and m3e-react `<ListDetailPaneScaffold>`, `<SupportingPaneScaffold>`, `<FeedLayout>`, `useListDetailPaneScaffoldNavigator`, `useSupportingPaneScaffoldNavigator`.
- 00f2747: Navigation drawer (M7, COMPONENT_SPEC §15; Compose `PermanentNavigationDrawer`, `DismissibleNavigationDrawer`, `ModalNavigationDrawer`, their drawer sheets and `NavigationDrawerItem`): permanent, dismissible and modal drawers. Opening runs on the default spatial spring and closing on the fast effects spring (Compose's `DrawerState`), interruptible with the velocity kept; a drag on the open sheet (or the modal scrim) follows the pointer and settles with Compose's thresholds (50% of the width, 400dp/s) on its decay or 256ms tween; the modal drawer opens over the 32% scrim as a dialog (focus trap, Escape and scrim dismissal, focus return); arrow keys move between items. New `components/navigation-drawer-defaults.css` tokens (item and sheet literals, the inherited body-large label style, the scrim, springs, settle tween and thresholds Compose renders, plus the m3.material.io headline row and divider inset / color), m3e-css `navigation-drawer.css` (`.m3e-navigation-drawer` with `--dismissible`, `--modal`, `--open`, `__sheet`, `__headline`, `__divider`, `__scrim`, and `.m3e-navigation-drawer-item` with `__icon`, `__label`, `__badge`; added to the state-layer / focus-ring lists and the `ripple.js` triggers), m3e-motion `DrawerAnimation`, `drawerSettlesOpen` and `exponentialDecayTarget` (and an optional initial velocity on `SpringAnimatable.animateTo`), m3e-elements `<m3e-navigation-drawer>` plus the `navigation-drawer-layout.js` (NavigationDrawerLayout) entry and a `badge` attribute on `<m3e-navigation-item>`, and m3e-react `<NavigationDrawer variant items selectedKey onSelectionChange isOpen onOpenChange header />`.
- a984af0: Navigation bar and rails (M7, COMPONENT_SPEC §13/§14; Compose `ShortNavigationBar`, `WideNavigationRail`, `ModalWideNavigationRail`): the wide navigation rail now animates between collapsed and expanded on Compose's springs (width, item spacing and icon position on the default spatial spring, label color on the default effects spring), interruptible and laid out once per frame; the new modal wide navigation rail opens over a scrim as a dialog (focus trap, Escape and scrim dismissal, focus return; `hideOnCollapse` slides it in). New `components/navigation-defaults.css` tokens (the springs, modal colors / shape and `expandedHeaderTopPadding` Compose renders), m3e-css `.m3e-modal-wide-navigation-rail` (the static rail classes are unchanged), m3e-motion `WideNavigationRailAnimation`, `wideNavigationRailWidth` and `wideNavigationRailItemWidth`, m3e-elements `<m3e-short-navigation-bar>`, `<m3e-wide-navigation-rail>`, `<m3e-modal-wide-navigation-rail>` and `<m3e-navigation-item>` plus the `wide-navigation-rail-layout.js` (WideNavigationRailLayout) entry, `attachRipple`'s optional `trigger`, and m3e-react `<ModalWideNavigationRail>` (`<WideNavigationRail isExpanded>` now animates). Fidelity: the wide rail's selection indicator grows from the pill's start, as Compose's AnimatedNavigationItem places it; its labels stay on one line (ellipsized).
- 90935e5: Navigation suite scaffold (M7, COMPONENT_SPEC §16; Compose `NavigationSuiteScaffold`, `NavigationSuiteScaffoldLayout`, `NavigationSuite`, `NavigationSuiteScaffoldState`): one set of destinations shown as the navigation the window size class calls for — a short navigation bar below 600px (horizontal items at compact height), a collapsed wide navigation rail from 600px and, by default, the expanded wide navigation rail from 1200px (m3.material.io guidance; Compose keeps the collapsed rail) — with the content beside or above it. Switching on resize keeps the selection, the item elements (bar ↔ rail share one `<nav>`, as Compose's `movableContentOf` keeps its items) and keyboard focus. Override with a fixed type (`layout-type` / `layoutType`, incl. `navigation-drawer` and `none`), `expanded-from` / `expandedFrom` (`none` / `null`: Compose's own rule), `expanded-type` / `expandedType` (a permanent drawer at large widths) or a function of the window size class. Show / hide animates on Compose's spring(0.9, 700) with its state semantics. New `components/navigation-suite-defaults.css` tokens (scaffold colors, primary action alignment / padding, the show / hide spring), m3e-css `navigation-suite.css` (`.m3e-navigation-suite` with `--bar`, `--rail`, `--drawer`, `--none`, `--navigation-hidden`, `--primary-action-start` / `--primary-action-center`, `--adaptive` for a no-JavaScript fallback, `__content`, `__primary-action`), m3e-motion `NavigationSuiteScaffoldAnimation`, `navigationSuiteOffset`, `isNavigationBarType`, `NAVIGATION_SUITE_TYPES`, `NAVIGATION_SUITE_EXPANDED_FROM` and the `expandedFrom` / `expandedType` options of `navigationSuiteType` (whose type now includes the expanded rail, the drawer and `none`), m3e-elements `<m3e-navigation-suite>` plus the `navigation-suite-layout.js` (NavigationSuiteLayout) entry, and m3e-react `<NavigationSuiteScaffold items selectedKey onSelectionChange layoutType navigationSuiteType expandedFrom expandedType isNavigationHidden primaryAction>`. React `<NavigationDrawer>` destinations gain `isDisabled` (the element already rendered disabled items).
- 0fd53c5: Tabs (M7, COMPONENT_SPEC §17; Compose `PrimaryTabRow`, `SecondaryTabRow`, `PrimaryScrollableTabRow`, `SecondaryScrollableTabRow`, `Tab`, `LeadingIconTab`): primary and secondary rows, fixed (equal tabs) or scrollable (52dp edge padding, tabs at least 90dp), with text, icon, icon + text (72dp) or leading-icon tabs. The indicator (primary: the selected tab's content width, at least 24dp, 3dp rounded; secondary: the whole tab) slides on the default spatial spring from its current position and velocity (Compose's `TabIndicatorOffsetNode`), and a scrollable row scrolls the selected tab to the centre; APG tabs with manual activation (arrow keys, Home / End, no wrapping; Space / Enter select) and `role="tabpanel"` wiring. New `components/tabs-defaults.css` tokens (the `TabRowDefaults` / `Tab.kt` values Compose renders: tab heights, paddings, edge padding, minimum widths, indicator defaults, divider, springs, label style and baseline placement), m3e-css `tabs.css` (`.m3e-tabs` with `--primary`, `--secondary`, `--scrollable`, `--leading-icon`, `__list`; `.m3e-tab` with `__content`, `__icon`, `__label`; `.m3e-tab-panel`; added to the state-layer / focus-ring lists and the `ripple.js` triggers), m3e-motion `TabIndicatorAnimation`, `TabScrollAnimation`, `tabPositions`, `tabIndicatorTarget`, `tabIndicatorShift` and `scrollableTabOffset`, m3e-elements `<m3e-tabs>`, `<m3e-tab>` and `<m3e-tab-panel>` plus the `tabs-layout.js` (TabsLayout) entry and `RovingFocus.reset()`, and m3e-react `<Tabs variant scrollable iconPosition items selectedKey onSelectionChange>`, `<Tab>` and `<TabPanel>`.
- 2c741a7: Window size class utilities (M7, FOUNDATIONS §9; androidx window-core `WindowSizeClass` and Compose Material3 adaptive): new `--m3e-sys-window-{width,height}-*` tokens and the `windowBreakpoints` JS tokens (min-width 600 / 840 / 1200 / 1600, min-height 480 / 900), m3e-motion `windowSizeClass`, `windowWidthSizeClass`, `windowHeightSizeClass`, `isWidthAtLeastBreakpoint`, `isHeightAtLeastBreakpoint`, `isAtLeastBreakpoint`, `sameWindowSizeClass`, `paneScaffoldDirective` (Compose `calculatePaneScaffoldDirective`), `navigationSuiteType` (`NavigationSuiteScaffoldDefaults.navigationSuiteType`) and `WINDOW_WIDTH_BREAKPOINTS` / `WINDOW_HEIGHT_BREAKPOINTS`, m3e-elements `observeWindowSizeClass` and `currentWindowSizeClass` (viewport via `matchMedia`, or an element's content box via ResizeObserver) in a new `window-size-class.js` entry that also re-exports the classification, and the m3e-react `useWindowSizeClass` hook.

### Patch Changes

- Updated dependencies [1e86a0b]
- Updated dependencies [00f2747]
- Updated dependencies [a984af0]
- Updated dependencies [90935e5]
- Updated dependencies [16220b4]
- Updated dependencies [0fd53c5]
- Updated dependencies [2c741a7]
  - @kyralabs/m3e-tokens@1.5.0
  - @kyralabs/m3e-css@1.5.0
  - @kyralabs/m3e-elements@1.5.0
  - @kyralabs/m3e-react@1.5.0

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
  - @kyralabs/m3e-tokens@1.4.0
  - @kyralabs/m3e-css@1.4.0
  - @kyralabs/m3e-elements@1.4.0
  - @kyralabs/m3e-react@1.4.0

## 1.3.0

### Minor Changes

- 1fe7143: FAB and extended FAB (COMPONENT_SPEC §5). m3e-css `fab.css`: `.m3e-fab` (baseline 56dp, `--size-medium` 80dp, `--size-large` 96dp; `--size-small` 40dp is deprecated, D4) and `.m3e-extended-fab` (small 56dp, `--size-medium`, `--size-large`, `--collapsed`, `__label`), six color styles (`--primary-container` default, `--secondary-container`, `--tertiary-container`, `--primary`, `--secondary`, `--tertiary`), Level3 elevation with Level4 on hover. m3e-react: `<Fab>`, `<ExtendedFab>` (collapses to its icon with an interruptible width spring when `expanded={false}`; the label stays its accessible name) and `useExtendedFabScroll()`; `<Fab size="small">` warns once in development. m3e-tokens: `components/fab-defaults.css` with the `FloatingActionButtonDefaults` values Compose renders that are not in the token files. The plain-HTML ripple (`ripple.js`) covers both FABs.
- c3c2227: FAB menu (COMPONENT_SPEC §6). m3e-css `fab-menu.css`: `.m3e-fab-menu` with `--open`, the toggle `.m3e-fab.m3e-fab-menu__toggle` (shrinks from the FAB size to the 56dp close button, rounds to a circle, mixes to the color set's role and swaps its icon at half progress), `.m3e-fab-menu__items[role=menu]` and `.m3e-fab-menu__item` pills; `--size-medium` / `--size-large` (the FAB it opens from), `--secondary` / `--tertiary` color sets and `--align-start` / `--align-center`. m3e-elements: `<m3e-fab-menu>` with `<m3e-fab-menu-item>` children (`@kyralabs/m3e-elements/fab-menu.js`), events `open-change` and `action`. m3e-react: `<FabMenu items open onOpenChange icon closeIcon size color align>` and `fabMenuClassName()`. Both JS layers run Compose's interruptible springs (toggle on fast spatial, items staggered on slow effects with their own width and alpha springs), leave focus on the close button when opening (ArrowDown/Tab enter the items, as in Compose), keep focus in the menu while open, and close on Escape, an outside press or an item press. m3e-tokens: `components/fab-menu-defaults.css` with the `FloatingActionButtonMenu.kt` values Compose renders that are not in `FabMenuBaselineTokens`. m3e-motion: `SpringAnimatable` (Compose Animatable semantics), `fabMenuItemVisible()` and `menuNavigationTarget()`.
- e80d775: Button group (COMPONENT_SPEC §3): standard and connected groups, sizes XS–XL, round/square, single/multiple selection and an overflow menu. m3e-css `button-group.css` (`.m3e-button-group`, `--connected`, `--size-*`, `--overflow`, `__item`, `__overflow`; `.m3e-button` with `aria-checked` now styles as a toggle). m3e-elements `<m3e-button-group>` / `<m3e-button-group-item>` (events `change`, `action`) and the `button-group-layout.js` entry (`ButtonGroupLayout`: press width springs with Compose's `ExpandedRatio`, interruptible corner springs, roving tabindex, overflow measurement). m3e-react `<ButtonGroup>` / `<ButtonGroupItem>`. m3e-motion `buttonGroupWidths` and `buttonGroupVisibleCount` (ports of `ButtonGroupMeasurePolicy`). m3e-tokens `components/button-group-defaults.css`: `ButtonGroupDefaults` values Compose renders plus the per-size m3.material.io token DB values Compose lacks (XS between-space 18dp, M/L/XL 8dp, connected corners per size).
- 2540c01: Split button (COMPONENT_SPEC §4): a leading button for the primary action and a trailing button that opens a menu, in filled, tonal, elevated and outlined, sizes XS–XL. m3e-css `split-button.css`: `.m3e-split-button` around two `.m3e-button`s (`__leading`, `__trailing`) with the SplitButton*Tokens paddings, inner corners (pressed; full while open, `aria-expanded="true"`), trailing icon size and rotation, and Compose's optical centering of the trailing icon. m3e-elements: `<m3e-split-button label icon menu-label variant size>` (`@kyralabs/m3e-elements/split-button.js`) anchors its `<m3e-menu>` child to the trailing button and emits `press`. m3e-react: `<SplitButton variant size icon onPress menu={<Menu>…</Menu>} menuLabel>`. Both spring the inner corners (default effects) and the icon (Compose samples' `spring()`) with their velocity kept. m3e-tokens: `components/split-button-defaults.css` with the `SplitButtonDefaults` values Compose renders that are not in the token files.

### Patch Changes

- Updated dependencies [1fe7143]
- Updated dependencies [c3c2227]
- Updated dependencies [e80d775]
- Updated dependencies [2d5f9f0]
- Updated dependencies [2540c01]
  - @kyralabs/m3e-tokens@1.3.0
  - @kyralabs/m3e-css@1.3.0
  - @kyralabs/m3e-elements@1.3.0
  - @kyralabs/m3e-react@1.3.0

## 1.2.0

### Patch Changes

- Updated dependencies [d874a9c]
- Updated dependencies [c4ea9a0]
  - @kyralabs/m3e-elements@1.2.0
  - @kyralabs/m3e-tokens@1.2.0
  - @kyralabs/m3e-css@1.2.0
  - @kyralabs/m3e-react@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [95cd4d2]
- Updated dependencies [e364cab]
- Updated dependencies [1aa96fa]
  - @kyralabs/m3e-elements@1.1.0
  - @kyralabs/m3e-css@1.1.0
  - @kyralabs/m3e-tokens@1.1.0
  - @kyralabs/m3e-react@1.1.0

## 1.0.1

### Patch Changes

- Updated dependencies [54a6f5b]
- Updated dependencies [c7b731c]
  - @kyralabs/m3e-react@1.0.1
  - @kyralabs/m3e-css@1.0.1
  - @kyralabs/m3e-elements@1.0.1
  - @kyralabs/m3e-tokens@1.0.1

## 1.0.0

### Major Changes

- cefe6f4: publish initial version

### Patch Changes

- Updated dependencies [cefe6f4]
  - @kyralabs/m3e-css@1.0.0
  - @kyralabs/m3e-elements@1.0.0
  - @kyralabs/m3e-react@1.0.0
  - @kyralabs/m3e-tokens@1.0.0
