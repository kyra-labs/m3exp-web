---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Badges (M9, COMPONENT_SPEC §34; Compose `Badge` and `BadgedBox`): the 6dp dot and the 16dp large badge (label small, 4dp padding, up to four characters) in the error colors, placed on the anchor's top-end corner as `BadgedBox` places them (the dot 6dp inside it, a large badge 12dp before the end and 2dp above the top; mirrored in RTL), with a CSS hook for the `badgeBounds()` rulers that navigation items and tabs will use. m3e-react `<Badge count max>` writes counts above 999 as `999+` (m3e-motion `badgeText`) and `<BadgedBox badge>` wraps the anchor. The badge carries visually hidden text that joins the accessible name of its item ("New notification" for the dot, the count otherwise, or `label`); the visible digits are `aria-hidden`. New `components/badge-defaults.css` tokens (the `Badge.kt` values Compose renders) and m3e-css `badge.css`. No custom element: navigation bar, rail, suite and tab badges follow separately.
