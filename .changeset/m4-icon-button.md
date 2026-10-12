---
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Icon button and icon toggle button (M4).

- CSS: `icon-button.css` — standard (inherits the content color, as Compose's LocalContentColor), filled, tonal, outlined, plus `--vibrant` token colors; sizes XS–XL; narrow/default/wide widths; round and square; toggles via `aria-pressed` with a filled icon and the selected shape; press and selection morph on the default effects spring; 48dp touch target in both axes.
- React: `<IconButton>` (a toggle when given `isSelected`/`defaultSelected`) and `<IconToggleButton>`; dev warning when there is no accessible name. The corner spring now caps at half the smaller side (CircleShape) for all components.
