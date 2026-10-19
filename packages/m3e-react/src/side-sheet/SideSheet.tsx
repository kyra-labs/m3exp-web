import {
  SIDE_SHEET_BACK_LABEL,
  SIDE_SHEET_CLOSE_LABEL,
  SIDE_SHEET_LABEL,
  SideSheetLayout,
} from '@kyralabs/m3e-elements/side-sheet-layout.js';
import { isWidthAtLeastBreakpoint } from '@kyralabs/m3e-motion';
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
import { useWindowSizeClass } from '../window-size-class/useWindowSizeClass.js';

const SHEET = 'm3e-side-sheet';

export type SideSheetVariant = 'standard' | 'modal' | 'adaptive';

export interface SideSheetProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'title' | 'aria-label'
> {
  /**
   * `standard` (default: an `<aside>` at the end of a flex row, narrowing the content beside it),
   * `modal` (a `<dialog>` at the window's end edge over a scrim) or `adaptive` (modal below the
   * medium window size class, 600dp, standard from it; owner decision M9 #17).
   */
  variant?: SideSheetVariant;
  /** Shown (controlled). */
  isOpen?: boolean;
  /** Initially shown (uncontrolled). */
  defaultOpen?: boolean;
  /**
   * Called with `false` when the sheet asks to close (the close button, Escape, the scrim, a
   * browser close request). Controlled sheets close when `isOpen` does.
   */
  onOpenChange?: (isOpen: boolean) => void;
  /** The title; it names the sheet. */
  headline?: ReactNode;
  /** The name without a headline (default "Side sheet"). */
  'aria-label'?: string;
  /** The close icon button's name (default "Close"). m3.material.io requires the close button. */
  closeLabel?: string;
  /** Show the back icon button before the headline. */
  backButton?: boolean;
  /** The back icon button's name (default "Back"). */
  backLabel?: string;
  /** The back icon button was pressed. */
  onBack?: () => void;
  /** Inset by 16dp, all corners rounded (owner decision M9 #18). */
  detached?: boolean;
  /** Standard: the line along its start edge; modal: the line above the actions. */
  divider?: boolean;
  /** The bottom action buttons. */
  actions?: ReactNode;
  /** The content (it scrolls on its own). */
  children?: ReactNode;
}

/**
 * Side sheet (COMPONENT_SPEC §31; D8: m3.material.io only). Driven by m3e-elements'
 * SideSheetLayout (the code `<m3e-side-sheet>` runs): the navigation drawer's springs mirrored to
 * the end edge (owner decision M9 #16), and for the modal sheet a native `<dialog>` (the page
 * inert, scroll locked, Tab kept inside, focus moved in and returned to the opener). The close
 * button, Escape and the scrim ask to close (`onOpenChange(false)`). Other props go to the root.
 */
export const SideSheet = /* @__PURE__ */ forwardRef(function SideSheet(
  {
    variant = 'standard',
    isOpen: openProp,
    defaultOpen = false,
    onOpenChange,
    headline,
    'aria-label': ariaLabel,
    closeLabel = SIDE_SHEET_CLOSE_LABEL,
    backButton = false,
    backLabel = SIDE_SHEET_BACK_LABEL,
    onBack,
    detached = false,
    divider = false,
    actions,
    className,
    children,
    ...rest
  }: SideSheetProps,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const headlineId = useId();
  const sizeClass = useWindowSizeClass();
  const resolved =
    variant === 'adaptive'
      ? isWidthAtLeastBreakpoint(sizeClass, 'medium')
        ? 'standard'
        : 'modal'
      : variant === 'modal'
        ? 'modal'
        : 'standard';
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const controlled = openProp !== undefined;

  const layoutRef = useRef<SideSheetLayout | null>(null);
  const handlers = useRef({ onOpenChange, onBack, controlled });
  handlers.current = { onOpenChange, onBack, controlled };
  const openRef = useRef(open);
  openRef.current = open;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const layout = new SideSheetLayout(el, {
      open: openRef.current,
      onOpenChange: (next) => {
        if (!handlers.current.controlled) setUncontrolled(next);
        handlers.current.onOpenChange?.(next);
        return undefined;
      },
      onBack: () => {
        handlers.current.onBack?.();
      },
    });
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // One layout per root kind (an <aside> or a <dialog>); the state is synced below.
  }, [resolved]);
  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    layout.update();
    layout.setOpen(open);
  });

  const hasHeadline = headline !== undefined && headline !== null && headline !== '';
  const naming = hasHeadline
    ? { 'aria-labelledby': headlineId }
    : { 'aria-label': ariaLabel ?? SIDE_SHEET_LABEL };
  const rootClass = cx(
    SHEET,
    resolved === 'modal' && `${SHEET}--modal`,
    open && `${SHEET}--open`,
    detached && `${SHEET}--detached`,
    divider && `${SHEET}--divider`,
    className,
  );
  const hasActions = actions !== undefined && actions !== null && actions !== false;
  const sheet = (
    <div className={`${SHEET}__sheet`}>
      <div className={`${SHEET}__header`}>
        {backButton ? (
          <button type="button" className={`m3e-icon-button ${SHEET}__back`} aria-label={backLabel}>
            <Icon name="arrow_back" />
          </button>
        ) : null}
        {hasHeadline ? (
          <h2 className={`${SHEET}__headline`} id={headlineId}>
            {headline}
          </h2>
        ) : null}
        <button type="button" className={`m3e-icon-button ${SHEET}__close`} aria-label={closeLabel}>
          <Icon name="close" />
        </button>
      </div>
      <div className={`${SHEET}__content`}>{children}</div>
      {hasActions ? <div className={`${SHEET}__actions`}>{actions}</div> : null}
    </div>
  );
  if (resolved === 'modal') {
    return (
      <dialog
        {...rest}
        {...naming}
        ref={ref as React.RefObject<HTMLDialogElement>}
        className={rootClass}
      >
        <div className={`${SHEET}__scrim`} aria-hidden="true" />
        {sheet}
      </dialog>
    );
  }
  return (
    <aside {...rest} {...naming} ref={ref} className={rootClass}>
      {sheet}
    </aside>
  );
});
