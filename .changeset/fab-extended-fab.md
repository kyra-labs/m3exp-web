---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

FAB and extended FAB (COMPONENT_SPEC §5). m3e-css `fab.css`: `.m3e-fab` (baseline 56dp, `--size-medium` 80dp, `--size-large` 96dp; `--size-small` 40dp is deprecated, D4) and `.m3e-extended-fab` (small 56dp, `--size-medium`, `--size-large`, `--collapsed`, `__label`), six color styles (`--primary-container` default, `--secondary-container`, `--tertiary-container`, `--primary`, `--secondary`, `--tertiary`), Level3 elevation with Level4 on hover. m3e-react: `<Fab>`, `<ExtendedFab>` (collapses to its icon with an interruptible width spring when `expanded={false}`; the label stays its accessible name) and `useExtendedFabScroll()`; `<Fab size="small">` warns once in development. m3e-tokens: `components/fab-defaults.css` with the `FloatingActionButtonDefaults` values Compose renders that are not in the token files. The plain-HTML ripple (`ripple.js`) covers both FABs.
