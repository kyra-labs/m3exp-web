---
'@kyralabs/m3e-elements': patch
---

`attachAutoRipple` (the `ripple.js` entry) now keeps `data-ripple` on a host after its first press, like `attachRipple` and m3e-react, and only toggles `data-pressed` and the ripple variables per press. It tracks the hosts it adopted privately, so they keep working on later presses while hosts whose `data-ripple` came from m3e-react or `attachRipple` stay skipped. Aborting the signal removes `data-ripple`, `data-pressed` and the ripple variables from every adopted host.
