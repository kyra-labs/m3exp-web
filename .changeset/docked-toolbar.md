---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Docked toolbar (M6, COMPONENT_SPEC §10; Compose `FlexibleBottomAppBar`): spread, center, space-around and space-evenly arrangements, standard and vibrant colors, exit-on-scroll on the fast spatial snap spring. New `components/docked-toolbar-defaults.css` and `components/bottom-app-bar-defaults.css` tokens (the BottomAppBarDefaults values Compose renders), m3e-css `docked-toolbar.css`, m3e-elements `<m3e-docked-toolbar>` plus the `docked-toolbar-layout.js` (DockedToolbarLayout) entry, and m3e-react `<DockedToolbar>`. The legacy bottom app bar ships deprecated (D4): m3e-css `bottom-app-bar.css` and m3e-react `<BottomAppBar>` (one-time dev warning). The exit-always scroll code is now shared by the floating toolbar, the docked toolbar and the top app bar (no behavior change).
