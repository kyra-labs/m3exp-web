---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Tabs (M7, COMPONENT_SPEC §17; Compose `PrimaryTabRow`, `SecondaryTabRow`, `PrimaryScrollableTabRow`, `SecondaryScrollableTabRow`, `Tab`, `LeadingIconTab`): primary and secondary rows, fixed (equal tabs) or scrollable (52dp edge padding, tabs at least 90dp), with text, icon, icon + text (72dp) or leading-icon tabs. The indicator (primary: the selected tab's content width, at least 24dp, 3dp rounded; secondary: the whole tab) slides on the default spatial spring from its current position and velocity (Compose's `TabIndicatorOffsetNode`), and a scrollable row scrolls the selected tab to the centre; APG tabs with manual activation (arrow keys, Home / End, no wrapping; Space / Enter select) and `role="tabpanel"` wiring. New `components/tabs-defaults.css` tokens (the `TabRowDefaults` / `Tab.kt` values Compose renders: tab heights, paddings, edge padding, minimum widths, indicator defaults, divider, springs, label style and baseline placement), m3e-css `tabs.css` (`.m3e-tabs` with `--primary`, `--secondary`, `--scrollable`, `--leading-icon`, `__list`; `.m3e-tab` with `__content`, `__icon`, `__label`; `.m3e-tab-panel`; added to the state-layer / focus-ring lists and the `ripple.js` triggers), m3e-motion `TabIndicatorAnimation`, `TabScrollAnimation`, `tabPositions`, `tabIndicatorTarget`, `tabIndicatorShift` and `scrollableTabOffset`, m3e-elements `<m3e-tabs>`, `<m3e-tab>` and `<m3e-tab-panel>` plus the `tabs-layout.js` (TabsLayout) entry and `RovingFocus.reset()`, and m3e-react `<Tabs variant scrollable iconPosition items selectedKey onSelectionChange>`, `<Tab>` and `<TabPanel>`.
