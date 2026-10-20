---
'@kyralabs/m3exp-web': patch
'@kyralabs/m3e-elements': patch
'@kyralabs/m3e-react': patch
---

Keyboard and focus fixes from the M11 accessibility decisions (DECISIONS D20 (5), D20 (9), D21;
no API change), identical in elements and React. A rich tooltip with an action no longer traps
Tab (WCAG 2.1.2): Tab from its last control moves to the tab stop after the anchor, Shift+Tab
from its first returns to the anchor, and focus leaving it hides it unless it is persistent;
Shift+Tab on the anchor is the browser's again. In a partially expanded bottom sheet, keyboard
focus on something the sheet clips below its visible part (the peek sheet's controls) expands the
sheet, asking first through `value-change` / `onValueChange` (WCAG 2.4.11); under reduced motion
it jumps. The bottom sheet's drag handle announces its ArrowUp / ArrowDown keys with
`aria-keyshortcuts` while gestures are enabled, and the docked date picker's month and year menu
buttons announce the popup's Shift+M / Shift+Y with `aria-keyshortcuts`.
