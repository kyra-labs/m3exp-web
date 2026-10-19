---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Snackbar (M9, COMPONENT_SPEC §32): Compose's `Snackbar` (inverse surface, extra-small corners, the level 3 shadow; the text, then an inverse-primary text-button action and a dismiss icon button with its built-in "Dismiss" tooltip at the end, or the action under the text; 48dp for one line, 68dp for two, at most 600dp wide; the padding-based `isSnackbarStylingFixEnabled` layout) and its host (Compose's `SnackbarHost` / `SnackbarHostState`): one snackbar at a time from a first-in, first-out queue, `showSnackbar()` resolving with `'action-performed'` or `'dismissed'`, 4s / 10s / indefinite durations (indefinite with an action), the timer paused while hovered or focused, Escape dismissing the focused snackbar, `focus()` to reach it from an app shortcut, focus returned when it leaves; the current snackbar scales and fades in on the fast springs while the previous one fades out. The host is a polite live region fixed to the bottom center of the window, raised by `--m3e-comp-snackbar-host-bottom-offset` (above a FAB). New `components/snackbar-defaults.css` tokens, m3e-css `snackbar.css`, the m3e-elements `<m3e-snackbar-host>` and `snackbar-layout` (`SnackbarHostState`, `SnackbarHostController`) entries, and m3e-react `useSnackbarHostState()`, `<SnackbarHost>` and `<Snackbar>`.
