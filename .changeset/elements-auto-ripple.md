---
'@kyralabs/m3e-elements': minor
---

Add the `@kyralabs/m3e-elements/ripple.js` entry: importing it gives plain-HTML m3e-css buttons, icon buttons, assist chips, `.m3e-state-layer` hosts, interactive cards and navigation items the press ripple through one set of delegated listeners on `document`. Hosts already driven by m3e-react or `attachRipple` (they carry `data-ripple`) are skipped. `attachAutoRipple(root, signal)` (package root, no side effect) scopes and stops it.
