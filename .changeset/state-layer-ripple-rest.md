---
'@kyralabs/m3e-css': patch
---

State layer: hover, focus and dragged overlays are visible again on hosts with `data-ripple` (every m3e-react component and m3e-elements `attachRipple` hosts). A press now grows the ripple circle from the press point over the resting layer, and release fades back instead of shrinking the circle.
