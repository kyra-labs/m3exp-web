// Modal plumbing shared by the full-screen search views (SearchLayout) and the modal wide
// navigation rail (WideNavigationRailLayout): a document scroll lock and a Tab trap. Compose shows
// both in a dialog window, which blocks scrolling behind it and keeps focus inside. Internal: not
// exported from an entry of its own.

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
