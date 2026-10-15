# @kyralabs/m3e-tokens

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

## 1.2.0

### Minor Changes

- c4ea9a0: New opt-in Google Sans Flex profile `@kyralabs/m3e-tokens/fonts-rond.css` (D15): wght + opsz + ROND variable, with wdth and slnt fixed at their defaults (latin chunk 205.2 KiB, all chunks 468.1 KiB). Import it instead of `fonts.css`, not beside it: it registers the same `"Google Sans Flex"` family and renders identically until you set `font-variation-settings: "ROND" <0–100>`. `fonts.css` stays the default, `fonts-full.css` is unchanged and the typescale tokens do not use ROND.

## 1.1.0

### Minor Changes

- 1aa96fa: `createTheme` accepts optional core colors, like Material Theme Builder: `coreColors: { secondary, tertiary, neutral, neutralVariant, error }`. Each one replaces the palette the variant would derive from the seed with `TonalPalette.fromInt(color)`, so a red seed can keep grey surfaces (`coreColors: { neutral: '#808080', neutralVariant: '#808080' }`). The `m3e-theme` CLI takes the same colors as `--secondary`, `--tertiary`, `--neutral`, `--neutral-variant` and `--error`, and `tokens.coreColors` reports them. Themes without core colors are unchanged.

## 1.0.1

No changes in this release.

## 1.0.0

### Major Changes

- cefe6f4: publish initial version
