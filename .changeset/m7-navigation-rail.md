---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Navigation bar and rails (M7, COMPONENT_SPEC §13/§14; Compose `ShortNavigationBar`, `WideNavigationRail`, `ModalWideNavigationRail`): the wide navigation rail now animates between collapsed and expanded on Compose's springs (width, item spacing and icon position on the default spatial spring, label color on the default effects spring), interruptible and laid out once per frame; the new modal wide navigation rail opens over a scrim as a dialog (focus trap, Escape and scrim dismissal, focus return; `hideOnCollapse` slides it in). New `components/navigation-defaults.css` tokens (the springs, modal colors / shape and `expandedHeaderTopPadding` Compose renders), m3e-css `.m3e-modal-wide-navigation-rail` (the static rail classes are unchanged), m3e-motion `WideNavigationRailAnimation`, `wideNavigationRailWidth` and `wideNavigationRailItemWidth`, m3e-elements `<m3e-short-navigation-bar>`, `<m3e-wide-navigation-rail>`, `<m3e-modal-wide-navigation-rail>` and `<m3e-navigation-item>` plus the `wide-navigation-rail-layout.js` (WideNavigationRailLayout) entry, `attachRipple`'s optional `trigger`, and m3e-react `<ModalWideNavigationRail>` (`<WideNavigationRail isExpanded>` now animates). Fidelity: the wide rail's selection indicator grows from the pill's start, as Compose's AnimatedNavigationItem places it; its labels stay on one line (ellipsized).
