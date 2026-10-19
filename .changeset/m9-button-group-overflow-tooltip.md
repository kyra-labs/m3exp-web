---
'@kyralabs/m3e-elements': patch
'@kyralabs/m3e-react': patch
'@kyralabs/m3exp-web': patch
---

Button group (M9 follow-up T2, fidelity fix): the overflow ("More options") icon button now has the plain tooltip Compose builds into `ButtonGroupDefaults.OverflowIndicator` — the button's name (`overflow-label` / `overflowLabel`), above it, shown on hover, keyboard focus or a long press and hidden 1.5s after the pointer leaves, as every tooltip does. It repeats the button's name, so it is `aria-hidden` and not an `aria-describedby` target. `<m3e-button-group>` renders the `.m3e-tooltip` after the overflow button and imports the `tooltip-popup` entry when that button first renders; m3e-react's `<ButtonGroup>` uses `<TooltipTrigger>` + `<PlainTooltip>`.
