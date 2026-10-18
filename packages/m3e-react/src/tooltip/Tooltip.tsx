import { TooltipController } from '@kyralabs/m3e-elements/tooltip-popup.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';
import { mergeProps, useId, useObjectRef } from 'react-aria';
import { Button } from '../button/Button.js';
import { cx } from '../utils/cx.js';
import { TooltipContext, type TooltipContextValue } from './context.js';

export interface PlainTooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** The tooltip text. */
  children: ReactNode;
  /** TooltipDefaults.caretShape(): a caret on the edge facing the anchor. */
  caret?: boolean;
}

export interface RichTooltipProps extends PlainTooltipProps {
  /** The title (RichTooltip `title`). */
  subhead?: ReactNode;
  /** The label of the action (a text button). With it the tooltip is a non-modal dialog. */
  action?: ReactNode;
  /** The action was pressed (the tooltip then hides). */
  onAction?: () => void;
}

/**
 * Creates the shared TooltipController for the rendered `.m3e-tooltip` and keeps it in step with
 * the trigger's state (it asks to show / hide through `setOpen`; `render` applies `isOpen`).
 */
function useTooltipController(
  ref: React.RefObject<HTMLDivElement | null>,
  context: TooltipContextValue | null,
  hasAction: boolean,
): React.RefObject<TooltipController | null> {
  const controllerRef = useRef<TooltipController | null>(null);
  const setOpenRef = useRef(context?.setOpen);
  setOpenRef.current = context?.setOpen;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !context) return;
    const controller = (controllerRef.current ??= new TooltipController({
      tooltip: el,
      onVisibleChange: (visible) => {
        setOpenRef.current?.(visible);
      },
    }));
    controller.isPersistent = context.isPersistent;
    controller.hasAction = hasAction;
    controller.enableUserInput = !context.isDisabled;
    controller.popup.placement = context.position;
    controller.setAnchor(context.anchorRef.current);
    if (controller.popup.isOpen !== context.isOpen || context.isOpen) {
      controller.render(context.isOpen);
    }
  });

  useLayoutEffect(
    () => () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    },
    [],
  );
  return controllerRef;
}

/**
 * Plain tooltip (COMPONENT_SPEC §33; Compose PlainTooltip): a short description of its anchor, in
 * a `<TooltipTrigger>`. Inverse surface, extra-small corners, bodySmall, up to 200dp wide.
 */
export const PlainTooltip = /* @__PURE__ */ forwardRef(function PlainTooltip(
  props: PlainTooltipProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const { children, caret = false, className, ...rest } = props;
  const context = useContext(TooltipContext);
  const ref = useObjectRef(forwardedRef);
  useTooltipController(ref, context, false);
  return (
    <div
      {...mergeProps(rest, {
        className: cx('m3e-tooltip', caret && 'm3e-tooltip--caret', className),
        role: 'tooltip',
        ...(context ? { id: context.tooltipId, popover: 'manual' } : {}),
      })}
      ref={ref}
    >
      {children}
    </div>
  );
});

/**
 * Rich tooltip (COMPONENT_SPEC §33; Compose RichTooltip): an optional subhead, the supporting
 * text and an optional action, in a `<TooltipTrigger>` (usually `isPersistent`). Surface
 * container, medium corners, a level 2 shadow, up to 320dp wide. With an action it is a
 * non-modal dialog named by the subhead (or the anchor) that Tab from the anchor moves into.
 */
export const RichTooltip = /* @__PURE__ */ forwardRef(function RichTooltip(
  props: RichTooltipProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const { children, caret = false, subhead, action, onAction, className, ...rest } = props;
  const context = useContext(TooltipContext);
  const ref = useObjectRef(forwardedRef);
  const subheadId = useId();
  const hasAction = action !== undefined && action !== null && action !== false;
  const controllerRef = useTooltipController(ref, context, hasAction);
  const hasSubhead = subhead !== undefined && subhead !== null && subhead !== false;
  const dialog = hasAction
    ? { role: 'dialog', 'aria-labelledby': hasSubhead ? subheadId : context?.anchorId }
    : { role: 'tooltip' };
  return (
    <div
      {...mergeProps(rest, {
        className: cx('m3e-tooltip', 'm3e-tooltip--rich', caret && 'm3e-tooltip--caret', className),
        ...dialog,
        ...(context ? { id: context.tooltipId, popover: 'manual' } : {}),
      })}
      ref={ref}
    >
      {hasSubhead && (
        <div className="m3e-tooltip__subhead" id={subheadId}>
          {subhead}
        </div>
      )}
      <div className="m3e-tooltip__supporting-text">{children}</div>
      {hasAction && (
        <div className="m3e-tooltip__action">
          <Button
            variant="text"
            onPress={() => {
              onAction?.();
              controllerRef.current?.dismiss();
            }}
          >
            {action}
          </Button>
        </div>
      )}
    </div>
  );
});
