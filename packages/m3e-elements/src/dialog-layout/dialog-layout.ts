import { ModalSession } from '../base/modal.js';

export interface DialogLayoutOptions {
  /** The initial state (opened without animating). */
  open?: boolean;
  /**
   * The dialog asks to close: Escape, a press on the scrim, the full-screen close button or a
   * browser close request (Compose's onDismissRequest). Return `false` to keep it open; without
   * it the dialog closes itself. Controlled callers then call `setOpen(false)` (a no-op when the
   * dialog is already closing). Also called with `false`, unvetoable, when the `<dialog>` was
   * closed natively (a `<form method="dialog">`).
   */
  onOpenChange?: (open: boolean) => boolean | undefined;
}

const DIALOG = 'm3e-dialog';

/** Waits for the dialog's own CSS animations (`m3e-dialog-*`) on `el` and its subtree. */
function animationsSettled(el: Element): Promise<void> {
  if (typeof el.getAnimations !== 'function') return Promise.resolve();
  const running = el.getAnimations({ subtree: true }).filter((a) => {
    // CSS transitions (the buttons' state layers) have no animationName.
    const name = (a as { animationName?: unknown }).animationName;
    return typeof name === 'string' && name.startsWith(`${DIALOG}-`);
  });
  return Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
}

/**
 * Behavior of a `<dialog class="m3e-dialog">` (COMPONENT_SPEC §29), shared by `<m3e-dialog>` and
 * m3e-react's dialogs so both layers write one DOM contract.
 *
 * - Open: `showModal()` (the top layer; the rest of the page inert), the page scroll locks, focus
 *   moves to the `[autofocus]` element or the first tab stop, and `data-motion="enter"` runs the
 *   open animations (dialog.css) until they end.
 * - Close: `data-motion="exit"` runs the close animations, then `close()`; focus returns to the
 *   element that had it when the dialog opened. Reopening while it closes starts the open again.
 * - While open, Tab stays inside the dialog and Escape, a press on the scrim, the full-screen
 *   close button (`.m3e-dialog__close`) and the `<dialog>`'s close requests (`cancel`) ask to close
 *   through `onOpenChange` (Compose's onDismissRequest).
 * - Full-screen: `data-scrolled` while the content is scrolled (the header's on-scroll color).
 */
export class DialogLayout {
  readonly dialog: HTMLDialogElement;
  #options: DialogLayoutOptions;
  #session: ModalSession;
  #abort = new AbortController();
  #open = false;
  /** Bumped on every open / close, so a stale animation end does nothing. */
  #generation = 0;

  constructor(dialog: HTMLDialogElement, options: DialogLayoutOptions = {}) {
    this.dialog = dialog;
    this.#options = options;
    this.#session = new ModalSession(dialog, {
      onEscape: () => {
        this.requestClose();
      },
    });
    const { signal } = this.#abort;
    dialog.addEventListener('click', this.#onClick, { signal });
    dialog.addEventListener('cancel', this.#onCancel, { signal });
    dialog.addEventListener('close', this.#onClose, { signal });
    dialog.addEventListener('scroll', this.#onScroll, { signal, capture: true, passive: true });
    if (options.open) this.setOpen(true, false);
  }

  /** The state the dialog is in or heading to. */
  get isOpen(): boolean {
    return this.#open;
  }

  /** Opens / closes with the motion (`animate = false` jumps). */
  setOpen(open: boolean, animate = true): void {
    if (open === this.#open) return;
    this.#open = open;
    const generation = ++this.#generation;
    const dialog = this.dialog;
    if (open) {
      this.#session.start();
      if (!dialog.open) {
        if (dialog.isConnected && typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
      this.#session.focusFirst();
      this.#updateScrolled();
      if (animate) this.#animate('enter', generation);
      else dialog.removeAttribute('data-motion');
      return;
    }
    if (animate && dialog.open) this.#animate('exit', generation);
    else this.#finishClose();
  }

  /** Asks to close (Escape, the scrim, the close button): the caller decides, or it closes. */
  requestClose(): void {
    if (!this.#open) return;
    const handler = this.#options.onOpenChange;
    if (handler && handler(false) === false) return;
    this.setOpen(false);
  }

  destroy(): void {
    this.#abort.abort();
    this.#generation++;
    this.#open = false;
    this.#finishClose();
  }

  #animate(motion: 'enter' | 'exit', generation: number): void {
    const dialog = this.dialog;
    // Restart the CSS animations when the value is the same (an open interrupting an open).
    if (dialog.getAttribute('data-motion') === motion) {
      dialog.removeAttribute('data-motion');
      dialog.getBoundingClientRect();
    }
    dialog.setAttribute('data-motion', motion);
    void animationsSettled(dialog).then(() => {
      if (generation !== this.#generation) return;
      if (motion === 'exit') this.#finishClose();
      else dialog.removeAttribute('data-motion');
    });
  }

  #finishClose(): void {
    const dialog = this.dialog;
    dialog.removeAttribute('data-motion');
    dialog.removeAttribute('data-scrolled');
    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
    this.#session.end();
  }

  #onClick = (e: MouseEvent): void => {
    const target = e.target as Element | null;
    if (!target || !this.#open) return;
    if (target.classList.contains(`${DIALOG}__scrim`) || target.closest(`.${DIALOG}__close`)) {
      this.requestClose();
    }
  };

  /** A browser close request (Escape is handled first by the session; this covers the others). */
  #onCancel = (e: Event): void => {
    if (e.target !== this.dialog) return;
    e.preventDefault();
    this.requestClose();
  };

  /** Closed natively (`<form method="dialog">`, an uncancelable close request): follow it. */
  #onClose = (e: Event): void => {
    if (e.target !== this.dialog || !this.#open) return;
    this.#open = false;
    this.#generation++;
    this.#finishClose();
    this.#options.onOpenChange?.(false);
  };

  #onScroll = (e: Event): void => {
    const target = e.target as Element | null;
    if (target?.classList.contains(`${DIALOG}__content`)) this.#updateScrolled(target);
  };

  #updateScrolled(content = this.dialog.querySelector(`.${DIALOG}__content`)): void {
    const scrolled =
      this.dialog.classList.contains(`${DIALOG}--full-screen`) && (content?.scrollTop ?? 0) > 0;
    this.dialog.toggleAttribute('data-scrolled', scrolled);
  }
}
