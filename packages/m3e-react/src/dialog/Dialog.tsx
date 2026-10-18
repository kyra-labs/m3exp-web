import { DialogLayout } from '@kyralabs/m3e-elements/dialog-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useObjectRef } from 'react-aria';
import { Icon } from '../icon/Icon.js';
import { cx } from '../utils/cx.js';

/** Compose `Strings.Dialog`, BasicAlertDialog's pane title (material3 res strings.xml L21). */
const PANE_TITLE = 'Dialog';
/** The full-screen close affordance's name (m3.material.io: the close "X" icon button). */
const CLOSE_LABEL = 'Close';

interface DialogStateProps {
  /** Open (controlled). */
  isOpen?: boolean;
  /** The initial open state (uncontrolled). */
  defaultOpen?: boolean;
  /**
   * Called when the dialog asks to close (Escape, a press on the scrim, the full-screen close
   * button, a browser close request: Compose's onDismissRequest) with `false`. Controlled dialogs
   * close when `isOpen` becomes false; leave it true to keep the dialog open.
   */
  onOpenChange?: (isOpen: boolean) => void;
}

type DialogAttributes = Omit<HTMLAttributes<HTMLDialogElement>, 'children' | 'title' | 'open'>;

interface DialogFrameProps extends DialogStateProps, DialogAttributes {
  variant: 'alert' | 'custom' | 'full-screen';
  children: ReactNode;
}

/** The `<dialog class="m3e-dialog">` + scrim + container, driven by DialogLayout. */
const DialogFrame = /* @__PURE__ */ forwardRef(function DialogFrame(
  {
    variant,
    isOpen: openProp,
    defaultOpen = false,
    onOpenChange,
    className,
    children,
    ...rest
  }: DialogFrameProps,
  forwardedRef: ForwardedRef<HTMLDialogElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const layoutRef = useRef<DialogLayout | null>(null);
  const handlers = useRef({ onOpenChange, controlled: openProp !== undefined });
  handlers.current = { onOpenChange, controlled: openProp !== undefined };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const layout = new DialogLayout(el, {
      open,
      onOpenChange: (next) => {
        if (!handlers.current.controlled) setUncontrolled(next);
        handlers.current.onOpenChange?.(next);
        // Controlled: the dialog follows isOpen (synced below).
        return handlers.current.controlled ? false : undefined;
      },
    });
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // Created once; `open` is synced below.
  }, []);
  useLayoutEffect(() => {
    layoutRef.current?.setOpen(open);
  });
  return (
    <dialog
      {...rest}
      ref={ref}
      className={cx('m3e-dialog', variant !== 'alert' && `m3e-dialog--${variant}`, className)}
    >
      <div className="m3e-dialog__scrim" aria-hidden="true" />
      <div className="m3e-dialog__container">{children}</div>
    </dialog>
  );
});

export interface AlertDialogProps extends DialogStateProps, DialogAttributes {
  /** The title (Compose `title`); it names the dialog. */
  headline?: ReactNode;
  /** A Material Symbols name shown above the headline, which is then centered. */
  icon?: string;
  /** The confirming action (Compose `confirmButton`), usually a text `<Button>`. */
  confirmButton?: ReactNode;
  /** The dismissing action (Compose `dismissButton`); rendered before the confirm button. */
  dismissButton?: ReactNode;
  /** The dialog's name when it has no headline (default "Dialog", Compose's pane title). */
  'aria-label'?: string;
  /** The supporting text (Compose `text`); it describes the dialog. */
  children?: ReactNode;
}

/**
 * Alert dialog (COMPONENT_SPEC §29; Compose `AlertDialog`): an optional icon, a headline, the
 * supporting text and the actions (the dismiss button, then the confirm button: end-aligned, the
 * confirm button on top when they stack) in a 280–560dp surface over a scrim. A native
 * `<dialog role="alertdialog">` (m3.material.io's web role) opened with `showModal()` by
 * m3e-elements' DialogLayout (the code `<m3e-dialog>` runs): the page is inert, Tab stays inside,
 * focus starts on the first control and returns to the opener; Escape and the scrim ask to close
 * (`onOpenChange(false)`). Other props go to the `<dialog>`.
 */
export const AlertDialog = /* @__PURE__ */ forwardRef(function AlertDialog(
  {
    headline,
    icon,
    confirmButton,
    dismissButton,
    children,
    'aria-label': ariaLabel,
    ...rest
  }: AlertDialogProps,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  const id = useId();
  const headlineId = `${id}-headline`;
  const contentId = `${id}-content`;
  const hasHeadline = headline !== undefined && headline !== null && headline !== '';
  const hasContent = children !== undefined && children !== null && children !== '';
  const hasActions = Boolean(confirmButton ?? dismissButton);
  return (
    <DialogFrame
      {...rest}
      ref={ref}
      variant="alert"
      role="alertdialog"
      aria-labelledby={hasHeadline ? headlineId : undefined}
      aria-label={hasHeadline ? undefined : (ariaLabel ?? PANE_TITLE)}
      aria-describedby={hasContent ? contentId : undefined}
    >
      {icon ? <Icon name={icon} className="m3e-dialog__icon" /> : null}
      {hasHeadline ? (
        <h2 className="m3e-dialog__headline" id={headlineId}>
          {headline}
        </h2>
      ) : null}
      {hasContent ? (
        <div className="m3e-dialog__content" id={contentId}>
          {children}
        </div>
      ) : null}
      {hasActions ? (
        <div className="m3e-dialog__actions">
          {dismissButton}
          {confirmButton}
        </div>
      ) : null}
    </DialogFrame>
  );
});

export interface BasicAlertDialogProps extends DialogStateProps, DialogAttributes {
  /** The dialog's name (default "Dialog", Compose's pane title). */
  'aria-label'?: string;
  /** The whole dialog: it draws its own surface (e.g. a `<Surface>`). */
  children?: ReactNode;
}

/**
 * Dialog with custom content (COMPONENT_SPEC §29; Compose `BasicAlertDialog`): the children, sized
 * 280–560dp, over a scrim, in a plain modal `<dialog>` named by `aria-label` (default "Dialog").
 * Same behavior as `<AlertDialog>`.
 */
export const BasicAlertDialog = /* @__PURE__ */ forwardRef(function BasicAlertDialog(
  { children, 'aria-label': ariaLabel, ...rest }: BasicAlertDialogProps,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  return (
    <DialogFrame
      {...rest}
      ref={ref}
      variant="custom"
      aria-label={rest['aria-labelledby'] ? undefined : (ariaLabel ?? PANE_TITLE)}
    >
      {children}
    </DialogFrame>
  );
});

export interface FullScreenDialogProps extends DialogStateProps, DialogAttributes {
  /** The title in the header; it names the dialog. */
  headline?: ReactNode;
  /** The confirming action at the end of the header (m3.material.io: a text button, e.g. Save). */
  action?: ReactNode;
  /** The close button's name (default "Close"). */
  closeLabel?: string;
  /** The dialog's name when it has no headline (default "Dialog"). */
  'aria-label'?: string;
  /** The content (scrolls under the header). */
  children?: ReactNode;
}

/**
 * Full-screen dialog (COMPONENT_SPEC §29; m3.material.io only, Compose has none): a header with a
 * close button, the headline and the confirming action, then the content. Below 600dp (the medium
 * window size class) it fills the window and the header takes the on-scroll color while the
 * content scrolls; from 600dp it is laid out as a basic dialog (m3.material.io: "For medium and
 * expanded breakpoints, use a basic dialog"). A plain modal `<dialog>`; the close button, Escape
 * and the scrim ask to close (`onOpenChange(false)`). Same behavior as `<AlertDialog>`.
 */
export const FullScreenDialog = /* @__PURE__ */ forwardRef(function FullScreenDialog(
  {
    headline,
    action,
    closeLabel = CLOSE_LABEL,
    children,
    'aria-label': ariaLabel,
    ...rest
  }: FullScreenDialogProps,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  const id = useId();
  const headlineId = `${id}-headline`;
  const hasHeadline = headline !== undefined && headline !== null && headline !== '';
  return (
    <DialogFrame
      {...rest}
      ref={ref}
      variant="full-screen"
      aria-labelledby={hasHeadline ? headlineId : undefined}
      aria-label={hasHeadline ? undefined : (ariaLabel ?? PANE_TITLE)}
    >
      <div className="m3e-dialog__header">
        <button type="button" className="m3e-icon-button m3e-dialog__close" aria-label={closeLabel}>
          <Icon name="close" />
        </button>
        {hasHeadline ? (
          <h2 className="m3e-dialog__headline" id={headlineId}>
            {headline}
          </h2>
        ) : null}
      </div>
      <div className="m3e-dialog__content">{children}</div>
      {action ? <div className="m3e-dialog__actions">{action}</div> : null}
    </DialogFrame>
  );
});
