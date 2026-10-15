---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3exp-web': minor
---

FAB menu (COMPONENT_SPEC §6). m3e-css `fab-menu.css`: `.m3e-fab-menu` with `--open`, the toggle `.m3e-fab.m3e-fab-menu__toggle` (shrinks from the FAB size to the 56dp close button, rounds to a circle, mixes to the color set's role and swaps its icon at half progress), `.m3e-fab-menu__items[role=menu]` and `.m3e-fab-menu__item` pills; `--size-medium` / `--size-large` (the FAB it opens from), `--secondary` / `--tertiary` color sets and `--align-start` / `--align-center`. m3e-elements: `<m3e-fab-menu>` with `<m3e-fab-menu-item>` children (`@kyralabs/m3e-elements/fab-menu.js`), events `open-change` and `action`. m3e-react: `<FabMenu items open onOpenChange icon closeIcon size color align>` and `fabMenuClassName()`. Both JS layers run Compose's interruptible springs (toggle on fast spatial, items staggered on slow effects with their own width and alpha springs), move focus to the top item on open, keep focus in the menu while open, and close on Escape, an outside press or an item press. m3e-tokens: `components/fab-menu-defaults.css` with the `FloatingActionButtonMenu.kt` values Compose renders that are not in `FabMenuBaselineTokens`. m3e-motion: `SpringAnimatable` (Compose Animatable semantics), `fabMenuItemVisible()` and `menuNavigationTarget()`.
