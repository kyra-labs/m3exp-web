import {
  BOTTOM_SHEET_DRAG_HANDLE_LABEL,
  BOTTOM_SHEET_HANDLE_KEYS,
  BOTTOM_SHEET_PANE_TITLE,
  BottomSheetLayout,
  type SheetValue,
} from '@kyralabs/m3e-elements/bottom-sheet-layout.js';
import {
  type CSSProperties,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useObjectRef } from 'react-aria';
import { PlainTooltip } from '../tooltip/Tooltip.js';
import { TooltipTrigger } from '../tooltip/TooltipTrigger.js';
import { cx } from '../utils/cx.js';

const SHEET = 'm3e-bottom-sheet';

interface SheetCommonProps {
  /** No PartiallyExpanded state (Compose `enabledValues` without it). */
  skipPartiallyExpanded?: boolean;
  /** Render the drag handle (Compose `dragHandle`; default true). */
  dragHandle?: boolean;
  /** The drag handle's name and tooltip (default "Drag handle", Compose's description). */
  dragHandleLabel?: string;
  /** Drags and the handle's arrow keys move the sheet (Compose `gesturesEnabled`; default true). */
  gesturesEnabled?: boolean;
  /** The sheet's name (default "Bottom Sheet", Compose's pane title). */
  'aria-label'?: string;
  /** The content (Compose `content`). */
  children?: ReactNode;
}

/** The root's classes (bottom-sheet.css). */
function rootClass(modal: boolean, value: SheetValue, peek: boolean, className?: string) {
  return cx(
    SHEET,
    modal && `${SHEET}--modal`,
    peek && `${SHEET}--peek`,
    value !== 'hidden' && `${SHEET}--${value}`,
    className,
  );
}

/** The `.m3e-bottom-sheet__sheet` surface: the drag handle with its tooltip, then the content. */
function sheetParts(
  dragHandle: boolean,
  dragHandleLabel: string,
  gesturesEnabled: boolean,
  children: ReactNode,
): ReactNode {
  return (
    <>
      {dragHandle ? (
        // DragHandleWithTooltip: TooltipBox(Above) { DragHandle } with a PlainTooltip. The arrow
        // keys (Compose's expand / collapse / dismiss actions) are announced (DECISIONS D20 (9)).
        <TooltipTrigger>
          <button
            type="button"
            className={`${SHEET}__handle`}
            aria-label={dragHandleLabel}
            aria-keyshortcuts={gesturesEnabled ? BOTTOM_SHEET_HANDLE_KEYS : undefined}
          >
            <span className={`${SHEET}__handle-bar`} />
          </button>
          <PlainTooltip>{dragHandleLabel}</PlainTooltip>
        </TooltipTrigger>
      ) : null}
      <div className={`${SHEET}__content`}>{children}</div>
    </>
  );
}

/** Creates the BottomSheetLayout once and keeps it in step with the rendered value and options. */
function useBottomSheetLayout(
  ref: React.RefObject<HTMLElement | null>,
  value: SheetValue,
  options: {
    skipPartiallyExpanded: boolean;
    skipHiddenState: boolean;
    gesturesEnabled: boolean;
    dismissOnClickOutside: boolean;
    onValueChange: (value: SheetValue) => void;
  },
  key: string,
): void {
  const layoutRef = useRef<BottomSheetLayout | null>(null);
  const handler = useRef(options.onValueChange);
  handler.current = options.onValueChange;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const layout = new BottomSheetLayout(el, {
      value,
      skipPartiallyExpanded: options.skipPartiallyExpanded,
      skipHiddenState: options.skipHiddenState,
      gesturesEnabled: options.gesturesEnabled,
      dismissOnClickOutside: options.dismissOnClickOutside,
      onValueChange: (next) => {
        handler.current(next);
        return undefined;
      },
    });
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // Created once per root kind; the value and options are synced below.
  }, [key]);
  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    layout.update();
    layout.setOptions({
      skipPartiallyExpanded: options.skipPartiallyExpanded,
      skipHiddenState: options.skipHiddenState,
      gesturesEnabled: options.gesturesEnabled,
      dismissOnClickOutside: options.dismissOnClickOutside,
    });
    layout.setValue(value);
  });
}

type StandardAttributes = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'defaultValue' | 'aria-label'
>;

export interface BottomSheetProps extends SheetCommonProps, StandardAttributes {
  /** The value (controlled): `hidden`, `partially-expanded` or `expanded`. */
  value?: SheetValue;
  /** The initial value (uncontrolled; default `hidden`, Compose's rememberBottomSheetState). */
  defaultValue?: SheetValue;
  /**
   * The sheet asks for a value: the drag handle, a drag, Escape (Compose confirmValueChange;
   * `hidden` is onDismissRequest). Controlled sheets move when `value` does.
   */
  onValueChange?: (value: SheetValue) => void;
  /**
   * BottomSheetScaffold's sheetPeekHeight, px (`true`: 56dp, the default): PartiallyExpanded shows
   * this much of the sheet (owner decision M9 #13).
   */
  peekHeight?: number | boolean;
  /** With a peek height: no Hidden state (BottomSheetScaffold's default). */
  skipHiddenState?: boolean;
}

/**
 * Standard bottom sheet (COMPONENT_SPEC §30; Compose BottomSheet, owner decision M9 #13): fixed to
 * the bottom of its positioned container (`position: relative`), at most 640dp wide and centered,
 * a region named "Bottom Sheet". Driven by m3e-elements' BottomSheetLayout (the code
 * `<m3e-bottom-sheet>` runs): Compose's anchors and springs, drags with its thresholds, the drag
 * handle (a click and the arrow keys move between the values; its built-in tooltip). Other props go
 * to the root.
 */
export const BottomSheet = /* @__PURE__ */ forwardRef(function BottomSheet(
  {
    value: valueProp,
    defaultValue = 'hidden',
    onValueChange,
    peekHeight,
    skipHiddenState = false,
    skipPartiallyExpanded = false,
    dragHandle = true,
    dragHandleLabel = BOTTOM_SHEET_DRAG_HANDLE_LABEL,
    gesturesEnabled = true,
    'aria-label': ariaLabel = BOTTOM_SHEET_PANE_TITLE,
    className,
    style,
    children,
    ...rest
  }: BottomSheetProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const [uncontrolled, setUncontrolled] = useState<SheetValue>(defaultValue);
  const value = valueProp ?? uncontrolled;
  const controlled = valueProp !== undefined;
  const peek = peekHeight !== undefined && peekHeight !== false;
  useBottomSheetLayout(
    ref,
    value,
    {
      skipPartiallyExpanded,
      skipHiddenState: peek && skipHiddenState,
      gesturesEnabled,
      dismissOnClickOutside: true,
      onValueChange: (next) => {
        if (!controlled) setUncontrolled(next);
        onValueChange?.(next);
      },
    },
    'standard',
  );
  const peekStyle =
    typeof peekHeight === 'number'
      ? ({ '--m3e-comp-bottom-sheet-peek-height': `${String(peekHeight)}px` } as CSSProperties)
      : undefined;
  return (
    <div
      {...rest}
      ref={ref}
      className={rootClass(false, value, peek, className)}
      style={peekStyle || style ? { ...peekStyle, ...style } : undefined}
    >
      <div className={`${SHEET}__sheet`} role="region" aria-label={ariaLabel}>
        {sheetParts(dragHandle, dragHandleLabel, gesturesEnabled, children)}
      </div>
    </div>
  );
});

type ModalAttributes = Omit<HTMLAttributes<HTMLDialogElement>, 'children' | 'open' | 'aria-label'>;

export interface ModalBottomSheetProps extends SheetCommonProps, ModalAttributes {
  /** Shown (controlled). */
  isOpen?: boolean;
  /** Initially shown (uncontrolled). */
  defaultOpen?: boolean;
  /**
   * Called with `false` when the sheet asks to hide (the handle of an expanded sheet, a drag,
   * Escape, the scrim: Compose's onDismissRequest). Controlled sheets hide when `isOpen` does.
   */
  onOpenChange?: (isOpen: boolean) => void;
  /** The value changed (expanded / partially expanded / hidden), e.g. through the handle. */
  onValueChange?: (value: SheetValue) => void;
  /** A press on the scrim hides it (ModalBottomSheetProperties.shouldDismissOnClickOutside). */
  shouldDismissOnClickOutside?: boolean;
}

/**
 * Modal bottom sheet (COMPONENT_SPEC §30; Compose ModalBottomSheet): a native `<dialog>` named
 * "Bottom Sheet" over a scrim, opened with `showModal()` (the page inert, scroll locked, Tab kept
 * inside, focus on the drag handle and back to the opener), entering partially expanded (or
 * expanded with `skipPartiallyExpanded`); Escape partially expands an expanded sheet, else hides
 * it, as the scrim does. Same drags and handle as `<BottomSheet>`. Other props go to the
 * `<dialog>`.
 */
export const ModalBottomSheet = /* @__PURE__ */ forwardRef(function ModalBottomSheet(
  {
    isOpen: openProp,
    defaultOpen = false,
    onOpenChange,
    onValueChange,
    shouldDismissOnClickOutside = true,
    skipPartiallyExpanded = false,
    dragHandle = true,
    dragHandleLabel = BOTTOM_SHEET_DRAG_HANDLE_LABEL,
    gesturesEnabled = true,
    'aria-label': ariaLabel = BOTTOM_SHEET_PANE_TITLE,
    className,
    children,
    ...rest
  }: ModalBottomSheetProps,
  forwardedRef: ForwardedRef<HTMLDialogElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const showValue: SheetValue = skipPartiallyExpanded ? 'expanded' : 'partially-expanded';
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const [detent, setDetent] = useState<SheetValue>(showValue);
  const value: SheetValue = open ? detent : 'hidden';
  useBottomSheetLayout(
    ref,
    value,
    {
      skipPartiallyExpanded,
      skipHiddenState: false,
      gesturesEnabled,
      dismissOnClickOutside: shouldDismissOnClickOutside,
      onValueChange: (next) => {
        onValueChange?.(next);
        if (next === 'hidden') {
          // The next show() enters at the show value again.
          setDetent(showValue);
          if (openProp === undefined) setUncontrolledOpen(false);
          onOpenChange?.(false);
        } else {
          setDetent(next);
        }
      },
    },
    'modal',
  );
  useLayoutEffect(() => {
    if (!open) setDetent(showValue);
  }, [open, showValue]);
  return (
    <dialog
      {...rest}
      ref={ref}
      className={rootClass(true, value, false, className)}
      aria-label={ariaLabel}
    >
      <div className={`${SHEET}__scrim`} aria-hidden="true" />
      <div className={`${SHEET}__sheet`}>
        {sheetParts(dragHandle, dragHandleLabel, gesturesEnabled, children)}
      </div>
    </dialog>
  );
});
