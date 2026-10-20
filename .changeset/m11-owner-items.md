---
'@kyralabs/m3exp-web': minor
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
---

M11 owner items (DECISIONS D20):

- Tabs (D20 (1)): a stacked tab (icon above the label) now puts its badge on the icon, overlapping
  it by 6dp (m3.material.io Tabs › Specs, "Overlap of badge on stacked icon";
  `--m3e-comp-tabs-stacked-badge-overlap`), with the label first in the DOM so the tab still reads
  "label, badge" (Compose `TabBaselineLayout` order, Tab.kt L298–305). `<m3e-tabs>` and React
  `<Tabs>` render the same markup; m3e-css keeps styling the earlier markup. Leading-icon,
  text-only and icon-only tabs are unchanged.
- Dialog (D20 (6), amends M9 #9): the open motion uses androidx's emphasized easing
  `cubic-bezier(0.2, 0, 0, 1)` (`--m3e-comp-dialog-enter-easing` is now
  `var(--m3e-sys-motion-easing-emphasized)`, `MotionTokens.kt` L40) instead of Material Web's
  `cubic-bezier(0.3, 0, 0, 1)` approximation; the timing is unchanged.
- Size limits (D20 (3)): the `date-picker-layout` entry may reach 12 kB and the date picker set
  16 kB (D18 (2), (3)); nothing in the bundles changes.
