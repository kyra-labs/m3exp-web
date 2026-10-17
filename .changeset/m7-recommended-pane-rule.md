---
'@kyralabs/m3e-css': patch
'@kyralabs/m3e-motion': patch
'@kyralabs/m3e-elements': patch
'@kyralabs/m3e-react': patch
---

Canonical layouts: m3.material.io's pane counts are now the default (owner decision, COMPONENT_SPEC §16a) — two panes at large (1200–1599px), three only from extra-large (1600px), when an extra pane exists. Compose's `calculatePaneScaffoldDirective` (three panes from 1200px) becomes the opt-in: `pane-rule="compose"` on `<m3e-list-detail-layout>` / `<m3e-supporting-pane-layout>`, `paneRule="compose"` on `<ListDetailPaneScaffold>` / `<SupportingPaneScaffold>`, the `.m3e-pane-scaffold--compose` modifier for the CSS-only layout (replacing the unreleased `--recommended` modifier), and `threePaneScaffoldDirective(sizeClass, { paneRule: 'compose' })` in m3e-motion, whose default is now `'recommended'`.
