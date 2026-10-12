---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Assist chip (M4).

- Tokens: `components/assist-chip-defaults.css` — the `AssistChipDefaults` content padding and icon/label spacing Compose renders (literals in `Chip.kt`, not in `AssistChipTokens`).
- CSS: `assist-chip.css` — `.m3e-assist-chip` (flat: outline drawn inside the shape) and `--elevated`, leading/trailing icons, hover/focus/pressed/dragged elevation with Compose's ElevationDefaults tweens, disabled, 48dp touch target, forced colors.
- React: `<AssistChip>` (button or link) with `variant`, `leadingIcon`, `trailingIcon`, `isDisabled`, `focusableWhenDisabled`.
