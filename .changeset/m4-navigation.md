---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Navigation bar and rail (M4).

- Tokens: `components/navigation-defaults.css` — layout literals Compose's navigation bars and rails render (`ShortNavigationBar.kt`, `WideNavigationRail.kt`, legacy `NavigationBar.kt` / `NavigationRail.kt`) and the short bar's Centered arrangement per item count.
- CSS: `short-navigation-bar.css` (vertical items; `--horizontal` for icon-start items, centered), `wide-navigation-rail.css` (collapsed; `--expanded`; `__header`), and the deprecated (D4) `navigation-bar.css` / `navigation-rail.css`, all built on a shared `.m3e-navigation-item`. The indicator grows on Compose's spring when `aria-current` moves; the state layer and focus ring sit on the indicator pill.
- React: `<ShortNavigationBar>`, `<WideNavigationRail>`, and the deprecated `<NavigationBar>` / `<NavigationRail>` (one-time dev warning), taking `items`, `selectedKey` / `defaultSelectedKey` and `onSelectionChange`.
