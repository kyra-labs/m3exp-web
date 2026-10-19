---
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Badges on navigation destinations and tabs (M9 B2; COMPONENT_SPEC §13, §14, §16, §17, §34): `badge` (the dot for `""` / `true`, a count with `999+` above 999, or short text) and `badge-label` / `badgeLabel` (the visually hidden text, read after the label: "Inbox 8", "Chat New notification") on `<m3e-navigation-item>` and `<m3e-tab>`, and on the React `NavigationDestination` (short navigation bar, wide and modal rails, navigation suite, the legacy bar and rail) and `TabItem` / `<Tab>`. A Compose `Badge` sits on the destination's icon (`BadgedBox`, as `NavigationSuiteScaffold` builds it) and at the end of a tab's label (on the icon when the label is hidden), kept inside narrow items and tabs like Compose's `badgeBounds()` (CSS for the navigation items, TabsLayout for tabs; a leading-icon tab's badge is not clamped, as `LeadingIconTab` has no bounds). The navigation suite's drawer type keeps showing `badge` as trailing text. m3e-motion adds `badgeValueText`, `badgeLabelText` and the `BadgeValue` type.
