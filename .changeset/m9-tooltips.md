---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Tooltips (M9, COMPONENT_SPEC §33; Compose `PlainTooltip`, `RichTooltip` and `TooltipBox`): plain tooltips (inverse surface, up to 200dp) and rich tooltips (subhead, supporting text and a text-button action, up to 320dp, level 2 shadow), with Compose's opt-in caret. Compose's behavior: mouse hover shows a tooltip and it stays while the anchor is hovered, leaving hides a non-persistent one; a touch long press shows it until the press ends (at least 1.5 s); keyboard focus shows it until focus leaves; Escape and a click outside hide it; one tooltip at a time (the global mutex and its priorities); `show()` hides a non-persistent tooltip after 1.5 s. Placement ports `TooltipPositionProviderImpl` (above by default, flipped below at the window top; below, left, right, start, end) and the caret placement, measured from the anchor's 48dp minimum interactive bounds; the tooltip scales in from 0.8 on the fast spatial spring and fades on the fast effects spring. New `components/tooltip-defaults.css` tokens (the `Tooltip.kt` / `internal/BasicTooltip.kt` values Compose renders), m3e-motion `tooltipPosition` / `tooltipCaret`, m3e-css `tooltip.css`, the m3e-elements `<m3e-tooltip>` and `tooltip-popup` (`TooltipController`, `TooltipPopup`) entries, and m3e-react `<TooltipTrigger>`, `<PlainTooltip>` and `<RichTooltip>`. Shared helper: the menu popup's popover, spring and reposition engine moves into `AnchoredPopup`, which `MenuPopup` now extends (no change to menus).
