---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3exp-web': minor
---

Color theming. `@kyralabs/m3e-tokens/theme.css` ships the Compose baseline expressive scheme (light + dark, `prefers-color-scheme` and `data-theme`). `@kyralabs/m3e-tokens/theme` adds `createTheme()` for all nine material-color-utilities variants, light/dark/system, contrast −1…1 (presets standard/medium/high) and spec 2021/2025 (default 2025, D3); the `m3e-theme` CLI writes the same CSS. `@kyralabs/m3exp-web/css/index.css` now includes tokens and the baseline theme, and `@kyralabs/m3exp-web/theme` re-exports the theme API.
