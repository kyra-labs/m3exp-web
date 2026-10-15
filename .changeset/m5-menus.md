---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-motion': minor
---

Menus (COMPONENT_SPEC §21): the expressive vertical menu in standard and vibrant colors, segmented with groups, checkable and selectable items, submenus, and Compose's baseline `DropdownMenu`.

- `@kyralabs/m3e-tokens`: `components/menu-defaults.css` (and `menuDefaults` in `./components`) with the `Menu.kt` / `MenuDefaults.kt` values Compose renders that are not in `Menu*Tokens`.
- `@kyralabs/m3e-css`: `menu.css` (`.m3e-menu`, `--vibrant`, `--baseline`, `__group`, `__label`, `__divider`, `__item` and its parts). Menu items join the state layer and get an inward focus ring.
- `@kyralabs/m3e-elements`: `<m3e-menu>`, `<m3e-menu-item>` and `<m3e-menu-group>` (`menu.js`), and `MenuPopup` (`menu-popup.js`): Compose's `DropdownMenuPositionProvider` placement (flips above when there is no room) and the interruptible open/close scale and fade springs.
- `@kyralabs/m3e-react`: `MenuTrigger`, `Menu`, `MenuItem` and `MenuSection` (React Aria `useMenu`, typeahead, `selectionMode`, `submenu`).
- `@kyralabs/m3e-motion`: `menuPosition` and `menuTransformOrigin`, ports of `DropdownMenuPositionProvider` and `calculateTransformOrigin`.
