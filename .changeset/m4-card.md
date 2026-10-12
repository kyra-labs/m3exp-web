---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Cards (M4).

- Tokens: `components/elevation-motion.css` (Compose's ElevationDefaults tweens for elevation changes on interaction) and `--m3e-sys-state-disabled-alpha` (Compose `DisabledAlpha`).
- CSS: `card.css` — filled (default), elevated, outlined; interactive cards with one stretched `.m3e-card__action` (state layer, elevation and focus ring on the card, secondary controls still clickable); disabled via an `aria-disabled` action; dragged. Buttons now animate elevation with the same tweens as Compose.
- React: `<Card>` and `<CardAction>` (link or button); the card's ripple starts from the press point on the card (`useStateLayer(hostRef)`).
