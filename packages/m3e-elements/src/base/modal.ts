// Modal plumbing shared by the full-screen search views (SearchLayout), the modal wide navigation
// rail (WideNavigationRailLayout), the modal drawer and the dialogs (DialogLayout, through
// ModalSession, which later modals reuse): a document scroll lock, a Tab trap and focus return.
// Compose shows these in a dialog window, which blocks scrolling behind it and keeps focus inside.
// Internal: not exported from an entry of its own.

/** Tab stops (disabled controls and tabindex="-1" excluded). */
export const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

let locks = 0;
let savedOverflow = '';
let savedPadding = '';

/** Locks the document scroll (nested locks count); the scrollbar's width is kept as padding. */
export function lockScroll(doc: Document): void {
  if (locks++ > 0) return;
  const html = doc.documentElement;
  const scrollbar = (doc.defaultView?.innerWidth ?? html.clientWidth) - html.clientWidth;
  savedOverflow = html.style.overflow;
  savedPadding = html.style.paddingRight;
  html.style.overflow = 'hidden';
  if (scrollbar > 0) html.style.paddingRight = `${String(scrollbar)}px`;
}

/** Releases one {@link lockScroll}. */
export function unlockScroll(doc: Document): void {
  if (--locks > 0) return;
  const html = doc.documentElement;
  html.style.overflow = savedOverflow;
  html.style.paddingRight = savedPadding;
  if (html.getAttribute('style') === '') html.removeAttribute('style');
}

/** The rendered, non-inert tab stops inside `container`, in DOM order. */
export function tabStops(container: Element): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.getClientRects().length > 0 && !el.closest('[inert]'),
  );
}

/**
 * Keeps a Tab keydown inside `container`: from the last stop (or from outside) Tab wraps to the
 * first, Shift+Tab from the first (or from outside) to the last.
 */
export function trapTab(e: KeyboardEvent, container: Element): void {
  const focusables = tabStops(container);
  const first = focusables[0];
  const last = focusables.at(-1);
  if (!first || !last) return;
  const active = container.ownerDocument.activeElement;
  const outside = !active || !container.contains(active);
  if (e.shiftKey && (active === first || outside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || outside)) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * The element focused before a modal opens (its opener), unless focus is in `container` or on
 * the body.
 */
export function activeOpener(container: Element): HTMLElement | null {
  const doc = container.ownerDocument;
  const active = doc.activeElement;
  return active instanceof HTMLElement && active !== doc.body && !container.contains(active)
    ? active
    : null;
}

/** Focus inside `container` (or lost to the body) goes back to `opener`. */
export function returnFocus(opener: HTMLElement | null, container: Element): void {
  const doc = container.ownerDocument;
  const active = doc.activeElement;
  if (!opener?.isConnected || opener === active) return;
  if (active && active !== doc.body && !container.contains(active)) return;
  opener.focus({ preventScroll: true });
}

export interface ModalSessionOptions {
  /** Escape was pressed inside the modal (the session prevents its default first). */
  onEscape: () => void;
}

/**
 * One modal window's keyboard and page plumbing, for the dialogs and the modal sheets to come:
 * while active, the document scroll is locked, Tab stays inside `container` and Escape asks to
 * close (its default prevented, so a `<dialog>` gets no close request); `focusFirst()` moves focus
 * to `container`'s `[autofocus]` element or first tab stop (m3.material.io Dialogs ›
 * Accessibility: "focus should automatically land on the first interactive element"); `end()`
 * unlocks the scroll and returns focus to the element focused before `start()`.
 */
export class ModalSession {
  readonly container: HTMLElement;
  #options: ModalSessionOptions;
  #opener: HTMLElement | null = null;
  #abort: AbortController | null = null;

  constructor(container: HTMLElement, options: ModalSessionOptions) {
    this.container = container;
    this.#options = options;
  }

  get isActive(): boolean {
    return this.#abort !== null;
  }

  /** The element focus returns to. */
  get opener(): HTMLElement | null {
    return this.#opener;
  }

  /** Records the opener (the focused element); call it before the modal takes focus. */
  start(): void {
    if (this.#abort) return;
    this.#opener = activeOpener(this.container);
    this.#abort = new AbortController();
    lockScroll(this.container.ownerDocument);
    this.container.addEventListener('keydown', this.#onKeyDown, { signal: this.#abort.signal });
  }

  /** Moves focus into the container unless it is already there. */
  focusFirst(): void {
    const container = this.container;
    const active = container.ownerDocument.activeElement;
    if (active && active !== container && container.contains(active)) return;
    const target = container.querySelector<HTMLElement>('[autofocus]') ?? tabStops(container)[0];
    target?.focus({ preventScroll: true });
  }

  end(): void {
    if (!this.#abort) return;
    this.#abort.abort();
    this.#abort = null;
    unlockScroll(this.container.ownerDocument);
    returnFocus(this.#opener, this.container);
    this.#opener = null;
  }

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.#options.onEscape();
    } else if (e.key === 'Tab') {
      trapTab(e, this.container);
    }
  };
}
