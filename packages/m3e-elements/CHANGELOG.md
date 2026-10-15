# @kyralabs/m3e-elements

## 1.2.0

### Patch Changes

- d874a9c: `attachAutoRipple` (the `ripple.js` entry) now keeps `data-ripple` on a host after its first press, like `attachRipple` and m3e-react, and only toggles `data-pressed` and the ripple variables per press. It tracks the hosts it adopted privately, so they keep working on later presses while hosts whose `data-ripple` came from m3e-react or `attachRipple` stay skipped. Aborting the signal removes `data-ripple`, `data-pressed` and the ripple variables from every adopted host.

## 1.1.0

### Minor Changes

- 95cd4d2: Add the `@kyralabs/m3e-elements/ripple.js` entry: importing it gives plain-HTML m3e-css buttons, icon buttons, assist chips, `.m3e-state-layer` hosts, interactive cards and navigation items the press ripple through one set of delegated listeners on `document`. Hosts already driven by m3e-react or `attachRipple` (they carry `data-ripple`) are skipped. `attachAutoRipple(root, signal)` (package root, no side effect) scopes and stops it.

## 1.0.1

No changes in this release.

## 1.0.0

### Major Changes

- cefe6f4: publish initial version
