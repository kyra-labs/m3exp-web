import { DrawerAnimation, type DrawerSpecs } from '@kyralabs/m3e-motion';
import { ModalSession, activeOpener, returnFocus, tabStops } from '../base/modal.js';
import { readSpringTokens } from '../base/scroll.js';

export type SideSheetVariant = 'standard' | 'modal';

/**
 * Every value `variant` takes (`<m3e-side-sheet variant>`, m3e-react's `<SideSheet variant>`):
 * the rendered variants plus `adaptive` (modal below the medium window size class, standard from it).
 */
export type SideSheetVariantOption = SideSheetVariant | 'adaptive';

export interface SideSheetLayoutOptions {
  /** The initial state (rendered without animating). */
  open?: boolean;
  /**
   * The sheet asks to close: the close button, Escape, a press on the scrim, a browser close
   * request. Return `false` to keep it open; without it the sheet closes itself. Controlled callers
   * then call `setOpen(false)` (a no-op when it already heads there). Also called with `false`,
   * unvetoable, when the modal `<dialog>` was closed natively (a `<form method="dialog">`).
   */
  onOpenChange?: (open: boolean) => boolean | undefined;
  /** The back icon button was pressed (m3.material.io: it moves within or out of the sheet). */
  onBack?: () => void;
}

const SHEET = 'm3e-side-sheet';
const VARS = [
  '--_m3e-ss-offset',
  '--_m3e-ss-stretch',
  '--_m3e-ss-fraction',
  '--_m3e-ss-inline-size',
] as const;

const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const round = (v: number) => String(Math.round(v * 1e4) / 1e4);

/**
 * Behavior of a `.m3e-side-sheet` (COMPONENT_SPEC §31), shared by `<m3e-side-sheet>` and
 * m3e-react's `<SideSheet>` so both layers write one DOM contract. The variant comes from the
 * root's class (`--modal`: a `<dialog>`; else the standard `<aside>`); the caller renders the
 * target state (`m3e-side-sheet--open`) and calls `setOpen`.
 *
 * - Motion (owner decision M9 #16): the navigation drawer's (m3e-motion DrawerAnimation, Compose
 *   DrawerState) mirrored to the end edge, without drags: open on the default spatial spring, close
 *   on the fast effects spring (both jump under reduced motion), from the current offset and
 *   velocity. Each frame writes only `--_m3e-ss-offset`, `--_m3e-ss-stretch` and, modal,
 *   `--_m3e-ss-fraction` (the scrim alpha) or, standard, `--_m3e-ss-inline-size` (the space it
 *   takes: the content beside it is pushed), with `data-animating`; `data-open` while visible.
 *   The width comes from a ResizeObserver (the sheet and its end margin).
 * - Modal: `showModal()` (the page inert), the page scroll locked, Tab kept inside, focus moved to
 *   the first stop and returned to the opener after it closes (`ModalSession`); Escape, a press
 *   on the scrim and the close button ask to close; the `<dialog>` closes once the sheet is out.
 * - Standard: the close button and Escape in the sheet ask to close; opening moves focus to the
 *   sheet's first stop, closing returns it to where it was (the dismissible drawer's behavior).
 * - The back button calls `onBack`. Content taller than the sheet is a focusable scroll region.
 */
export class SideSheetLayout {
  readonly root: HTMLElement;
  readonly variant: SideSheetVariant;
  #options: SideSheetLayoutOptions;
  #animation: DrawerAnimation;
  #abort = new AbortController();
  #frame = 0;
  #observer: ResizeObserver | null = null;
  #observed: Element[] = [];
  #session: ModalSession | null = null;
  #opener: HTMLElement | null = null;
  #shown = false;

  constructor(root: HTMLElement, options: SideSheetLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.variant = root.classList.contains(`${SHEET}--modal`) ? 'modal' : 'standard';
    const open = options.open ?? root.classList.contains(`${SHEET}--open`);
    this.#animation = new DrawerAnimation(false, 0);
    const { signal } = this.#abort;
    if (this.variant === 'modal') {
      this.#session = new ModalSession(root, {
        onEscape: () => {
          this.requestClose();
        },
      });
      root.addEventListener('cancel', this.#onCancel, { signal });
      root.addEventListener('close', this.#onClose, { signal });
    }
    root.addEventListener('click', this.#onClick, { signal });
    root.addEventListener('keydown', this.#onKeyDown, { signal });
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver(() => {
        this.#measure();
        this.#updateScrolls();
      });
    }
    this.update();
    if (open) {
      this.#animation.snapTo(true);
      this.#show(this.variant === 'modal');
    }
  }

  /** The target state (DrawerState.targetValue === Open). */
  get isOpen(): boolean {
    return this.#animation.isOpen;
  }

  /** The `.m3e-side-sheet__sheet` surface. */
  get sheet(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${SHEET}__sheet`);
  }

  get #scrim(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${SHEET}__scrim`);
  }

  get #content(): HTMLElement | null {
    return this.sheet?.querySelector<HTMLElement>(`:scope > .${SHEET}__content`) ?? null;
  }

  /** New options (the callbacks). */
  setOptions(options: SideSheetLayoutOptions): void {
    this.#options = { ...this.#options, ...options };
  }

  /** Re-reads the DOM after a render (the sheet or its content replaced). */
  update(): void {
    const targets = [this.sheet, this.#content].filter((el): el is HTMLElement => el !== null);
    if (this.#observer && targets.some((el, i) => this.#observed[i] !== el)) {
      this.#observer.disconnect();
      for (const el of targets) this.#observer.observe(el);
      this.#observed = targets;
    }
  }

  /** Opens / closes (the caller decided; nothing is asked). `animate = false` jumps. */
  setOpen(open: boolean, animate = true): void {
    if (open === this.#animation.isOpen) return;
    const now = performance.now();
    if (open) this.#show(true);
    else if (this.variant === 'standard') this.#returnFocus();
    if (!animate) {
      this.#animation.snapTo(open);
      if (!open) this.#hide();
      this.#rest();
      return;
    }
    this.#animation.animateTo(open, this.#specs(), now);
    this.#tick(now);
  }

  /** Asks to close (the close button, Escape, the scrim): the caller decides, or it closes. */
  requestClose(): void {
    if (!this.#animation.isOpen) return;
    if (this.#confirm(false)) this.setOpen(false);
  }

  destroy(): void {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#observer?.disconnect();
    this.#rest();
    this.#hide();
  }

  #confirm(open: boolean): boolean {
    const handler = this.#options.onOpenChange;
    return handler ? handler(open) !== false : true;
  }

  // --- Animation ------------------------------------------------------------------------------

  #specs(): DrawerSpecs {
    const style = getComputedStyle(this.root);
    return {
      open: readSpringTokens(style, '--m3e-comp-side-sheet-open'),
      close: readSpringTokens(style, '--m3e-comp-side-sheet-close'),
      settle: null,
    };
  }

  /** The distance the sheet travels: its width and its end margin (detached). */
  #measure(): void {
    const sheet = this.sheet;
    if (!sheet) return;
    const width = sheet.getBoundingClientRect().width;
    if (width <= 0) return;
    const margin = Number.parseFloat(getComputedStyle(sheet).marginInlineEnd) || 0;
    this.#animation.setWidth(width + margin);
  }

  #tick(now: number): void {
    const s = this.#animation.sample(now);
    if (!s.running) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      if (!this.#animation.isOpen) this.#hide();
      this.#rest();
      return;
    }
    const style = this.root.style;
    this.root.toggleAttribute('data-animating', true);
    style.setProperty('--_m3e-ss-offset', px(s.offset));
    style.setProperty('--_m3e-ss-stretch', px(Math.max(0, s.offset)));
    if (this.variant === 'modal') {
      style.setProperty('--_m3e-ss-fraction', round(s.fraction));
    } else {
      style.setProperty('--_m3e-ss-inline-size', px(Math.max(0, this.#animation.width + s.offset)));
    }
    if (this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  /** At rest: the classes alone describe the sheet. */
  #rest(): void {
    this.root.removeAttribute('data-animating');
    for (const name of VARS) this.root.style.removeProperty(name);
    if (this.root.getAttribute('style') === '') this.root.removeAttribute('style');
    this.#updateScrolls();
  }

  /** Overflowing content is a keyboard-focusable scroll region (`tabindex="0"`). */
  #updateScrolls(): void {
    const content = this.#content;
    if (!content) return;
    if (content.scrollHeight > content.clientHeight) content.setAttribute('tabindex', '0');
    else if (content.getAttribute('tabindex') === '0') content.removeAttribute('tabindex');
  }

  // --- Visibility -----------------------------------------------------------------------------

  #show(focus: boolean): void {
    if (this.#shown) return;
    this.#shown = true;
    const root = this.root;
    root.setAttribute('data-open', '');
    if (this.variant === 'modal') {
      this.#session?.start();
      const dialog = root as HTMLDialogElement;
      if (!dialog.open) {
        if (dialog.isConnected && typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
    } else {
      const sheet = this.sheet;
      this.#opener = sheet ? activeOpener(sheet) : null;
    }
    // Laid out now (a closed modal had no box): the closed anchor before the spring starts.
    this.#measure();
    if (!focus) return;
    if (this.#session) this.#session.focusFirst();
    else {
      const sheet = this.sheet;
      const active = root.ownerDocument.activeElement;
      if (sheet && (!active || !sheet.contains(active))) {
        tabStops(sheet)[0]?.focus({ preventScroll: true });
      }
    }
  }

  #hide(): void {
    if (!this.#shown) return;
    this.#shown = false;
    const root = this.root;
    root.removeAttribute('data-open');
    if (this.variant === 'modal') {
      const dialog = root as HTMLDialogElement;
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      this.#session?.end();
    } else {
      this.#returnFocus();
      this.#opener = null;
    }
  }

  /** Standard: focus inside the sheet (or lost to the body) goes back to the opener. */
  #returnFocus(): void {
    const sheet = this.sheet;
    if (sheet && this.variant === 'standard') returnFocus(this.#opener, sheet);
  }

  // --- Requests -------------------------------------------------------------------------------

  #onClick = (e: MouseEvent): void => {
    const target = e.target as Element | null;
    if (!target) return;
    const sheet = this.sheet;
    if (target.closest(`.${SHEET}__close`)?.closest(`.${SHEET}__sheet`) === sheet) {
      this.requestClose();
    } else if (target.closest(`.${SHEET}__back`)?.closest(`.${SHEET}__sheet`) === sheet) {
      this.#options.onBack?.();
    } else if (target === this.#scrim) {
      this.requestClose();
    }
  };

  /** Standard: Escape in the sheet asks to close (the modal's goes through its session). */
  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented || this.variant === 'modal') return;
    if (e.key === 'Escape' && this.#animation.isOpen) {
      e.preventDefault();
      this.requestClose();
    }
  };

  /** A browser close request (Escape is handled first by the session; this covers the others). */
  #onCancel = (e: Event): void => {
    if (e.target !== this.root) return;
    e.preventDefault();
    this.requestClose();
  };

  /** Closed natively (`<form method="dialog">`, an uncancelable close request): follow it. */
  #onClose = (e: Event): void => {
    if (e.target !== this.root || !this.#shown) return;
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#animation.snapTo(false);
    this.#rest();
    this.#hide();
    this.#options.onOpenChange?.(false);
  };
}
