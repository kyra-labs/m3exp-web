---
'@kyralabs/m3e-css': patch
'@kyralabs/m3e-elements': patch
'@kyralabs/m3e-react': patch
---

Package READMEs (M11 docs; no code change). m3e-react lists every component and hook, grouped by
COMPONENT_SPEC section, with the D4 deprecations and the props renamed in 1.8, and its usage
example now imports `material-symbols.css` (without it, icons render as their names). m3e-elements
documents `<m3e-bottom-sheet>` (`open`, `value`, `value-change`, `open-change`) and the top app bar
(`attachTopAppBarScroll` and the public `--m3e-comp-top-app-bar-container-{collapsed,expanded}-height`
properties). m3e-css lists every component file with its class, which ones need JavaScript, and its
deprecated classes.
