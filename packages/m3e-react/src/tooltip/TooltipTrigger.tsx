import type { TooltipAnchorPosition } from '@kyralabs/m3e-motion';
import {
  Children,
  type ReactElement,
  type ReactNode,
  type Ref,
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { mergeRefs, useId } from 'react-aria';
import { useOverlayTriggerState } from 'react-stately';
import { defined } from '../utils/cx.js';
import { TooltipContext, type TooltipContextValue } from './context.js';

export interface TooltipTriggerProps {
  /**
   * Two children: the anchor (a component that forwards its ref to a DOM element, such as
   * `<IconButton>` or `<Button>`) and a `<PlainTooltip>` or `<RichTooltip>`.
   */
  children: [ReactElement, ReactElement] | ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** TooltipAnchorPosition. Default `above` (flips below at the window top). */
  position?: TooltipAnchorPosition;
  /**
   * TooltipState.isPersistent: stays until a click outside or Escape (leaving the anchor does not
   * hide it, nor does the duration). Default false, as rememberTooltipState.
   */
  isPersistent?: boolean;
  /** No hover / focus / long-press handling (TooltipBox enableUserInput = false). */
  isDisabled?: boolean;
}

interface AnchorElementProps {
  ref?: Ref<HTMLElement>;
  id?: string;
  'aria-describedby'?: string;
}

/**
 * Attaches a tooltip to an anchor (COMPONENT_SPEC §33; Compose TooltipBox). Mouse hover, keyboard
 * focus and a touch long press show it, Escape and a click outside hide it, and only one tooltip
 * is shown at a time — the m3e-elements TooltipController, shared with `<m3e-tooltip>`. The anchor
 * gets `aria-describedby`.
 */
export function TooltipTrigger({
  children,
  isOpen,
  defaultOpen,
  onOpenChange,
  position = 'above',
  isPersistent = false,
  isDisabled = false,
}: TooltipTriggerProps): ReactNode {
  const state = useOverlayTriggerState(defined({ isOpen, defaultOpen, onOpenChange }));
  const anchorRef = useRef<HTMLElement | null>(null);
  const tooltipId = useId();
  const generatedAnchorId = useId();
  const [anchor, tooltip] = Children.toArray(children) as [ReactElement, ReactElement];
  const anchorProps = isValidElement<AnchorElementProps>(anchor) ? anchor.props : null;
  const anchorId = anchorProps?.id ?? generatedAnchorId;

  const open = state.isOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      state.setOpen(next);
    },
    [state],
  );
  const context = useMemo<TooltipContextValue>(
    () => ({
      isOpen: open,
      setOpen,
      anchorRef,
      tooltipId,
      anchorId,
      position,
      isPersistent,
      isDisabled,
    }),
    [open, setOpen, tooltipId, anchorId, position, isPersistent, isDisabled],
  );

  if (!anchorProps) return children as ReactNode;
  // React 19 passes `ref` as a prop; React 18 keeps it on the element.
  const childRef = anchorProps.ref ?? (anchor as unknown as { ref?: Ref<HTMLElement> }).ref;
  const describedBy = [anchorProps['aria-describedby'], tooltipId].filter(Boolean).join(' ');
  return (
    <TooltipContext.Provider value={context}>
      {cloneElement(anchor, {
        ref: mergeRefs(childRef, anchorRef),
        id: anchorId,
        'aria-describedby': describedBy,
      } as AnchorElementProps & Record<string, unknown>)}
      {tooltip}
    </TooltipContext.Provider>
  );
}
