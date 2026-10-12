---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Small top app bar (M4).

- Tokens: `components/top-app-bar-defaults.css` — Compose's `TopAppBarHorizontalPadding` and `TopAppBarTitleInset` layout literals (AppBar.kt).
- Motion: `app-bar-scroll.ts` — Compose's `TopAppBarState` and the pinned / enter-always scroll behaviors, adapted to DOM scrolling.
- CSS: `top-app-bar.css` — navigation, headline (title + subtitle) and actions; scrolled container color; enter-always clipping driven by `--_m3e-top-app-bar-offset`.
- Elements: `attachTopAppBarScroll(bar, { behavior, target, signal })`.
- React: `<TopAppBar title subtitle navigationIcon actions scrollBehavior scrollTarget headingLevel>`.
