---
'@kyralabs/m3exp-web': patch
'@kyralabs/m3e-tokens': patch
'@kyralabs/m3e-css': patch
'@kyralabs/m3e-elements': patch
'@kyralabs/m3e-react': patch
'@kyralabs/m3e-motion': patch
---

The owner's picks for the last open `TODO(verify)` register items (M11, DECISIONS D19; the
register is at zero). The keyboard focus ring now animates like Compose's inset ring: it grows on
the fast spatial spring and shrinks on the fast effects spring (no motion under
`prefers-reduced-motion`); at rest and when focused it looks as before. A component that sets its
own `transition` on a ring element lists `var(--_m3e-focus-ring-transition, outline-width,
outline-offset)` first. The feed layout's gap is 8dp (`--m3e-comp-feed-gap`, m3.material.io Cards
"Padding between cards 8dp max"; was 16dp). The side sheet divider is outline-variant
(`--m3e-comp-side-sheet-divider-color`, the divider token and the color legend; was outline). A
touch long press shows a tooltip after 400ms, Android's default long-press timeout that Compose
reads (was 500ms), in `<m3e-tooltip>` and `<TooltipTrigger>` alike. Docs: the Theme page notes
that `variant: 'fidelity'` is the closest to Material Theme Builder, and the snackbar page notes
WCAG 2.2.1 and m3.material.io's web requirement for timed snackbars.
