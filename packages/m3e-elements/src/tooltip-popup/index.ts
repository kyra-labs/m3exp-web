// Tooltip placement, show / hide springs and the TooltipBox behavior for `.m3e-tooltip`
// (registers no element). m3e-react's <TooltipTrigger> imports this entry, so both layers behave
// alike and write the same attributes and custom properties.
export {
  type TooltipAnchorPosition,
  type TooltipControllerOptions,
  type TooltipShowPriority,
  LONG_PRESS_TIMEOUT_MS,
  TooltipController,
  TooltipPopup,
  accessibleName,
  anchorBounds,
  tooltipRepeatsName,
} from './tooltip-popup.js';
