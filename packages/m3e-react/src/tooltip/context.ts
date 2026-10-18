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
  /**
   * The tooltip text equals the anchor's accessible name (owner decision M9 #2): the anchor then
   * does not point `aria-describedby` at it and the tooltip is `aria-hidden`.
   */
  repeatsName: boolean;
  setRepeatsName: (repeats: boolean) => void;
}

export const TooltipContext = /* @__PURE__ */ createContext<TooltipContextValue | null>(null);
