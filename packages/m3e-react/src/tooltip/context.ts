import type { TooltipAnchorPosition } from '@kyralabs/m3e-motion';
import { type RefObject, createContext } from 'react';

/** What a `<PlainTooltip>` / `<RichTooltip>` needs from its `<TooltipTrigger>`. */
export interface TooltipContextValue {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
  /** The id the tooltip gets (the anchor's `aria-describedby` points at it). */
  tooltipId: string;
  /** The anchor's id (names a rich tooltip with an action that has no subhead). */
  anchorId: string;
  position: TooltipAnchorPosition;
  isPersistent: boolean;
  /** TooltipBox enableUserInput = false. */
  isDisabled: boolean;
}

export const TooltipContext = /* @__PURE__ */ createContext<TooltipContextValue | null>(null);
