import {
  WINDOW_HEIGHT_BREAKPOINTS,
  WINDOW_WIDTH_BREAKPOINTS,
  type WindowSizeClass,
  type WindowSizeClassOptions,
  sameWindowSizeClass,
  windowSizeClass,
} from '@kyralabs/m3e-motion';

export interface WindowSizeClassTargetOptions extends WindowSizeClassOptions {
  /**
   * Element whose content box is classified (container-based sizing, like an `@container` query
   * on it). Default: the viewport, like an `@media` query (Compose's window container size).
   */
  target?: Element | undefined;
}

export interface ObserveWindowSizeClassOptions extends WindowSizeClassTargetOptions {
  /** Stops observing when aborted. */
  signal: AbortSignal;
}

interface Size {
  width: number;
  height: number;
}

/** The content box of `el` in CSS px (what ResizeObserver's contentRect and `@container` use). */
function contentBox(el: Element): Size {
  const style = getComputedStyle(el);
  const pad = (a: string, b: string) =>
    (parseFloat(style.getPropertyValue(a)) || 0) + (parseFloat(style.getPropertyValue(b)) || 0);
  return {
    width: Math.max(0, el.clientWidth - pad('padding-left', 'padding-right')),
    height: Math.max(0, el.clientHeight - pad('padding-top', 'padding-bottom')),
  };
}

/** One `(min-width)` / `(min-height)` media query per breakpoint, or null without matchMedia. */
function viewportQueries(): {
  width: [number, MediaQueryList][];
  height: [number, MediaQueryList][];
} | null {
  if (typeof matchMedia !== 'function') return null;
  const query = (feature: string, b: number): [number, MediaQueryList] => [
    b,
    matchMedia(`(${feature}: ${String(b)}px)`),
  ];
  const bounds = (table: Readonly<Record<string, number>>) =>
    Object.values(table).filter((b) => b > 0);
  return {
    width: bounds(WINDOW_WIDTH_BREAKPOINTS).map((b) => query('min-width', b)),
    height: bounds(WINDOW_HEIGHT_BREAKPOINTS).map((b) => query('min-height', b)),
  };
}

/** The largest breakpoint whose query matches (0 when none does). */
const matched = (queries: readonly [number, MediaQueryList][]) =>
  queries.reduce((size, [b, mql]) => (mql.matches ? Math.max(size, b) : size), 0);

function viewportSize(queries: ReturnType<typeof viewportQueries>): Size {
  // The media queries classify exactly as a CSS `@media (min-width: …px)` rule does, including at
  // fractional viewport sizes (page zoom); innerWidth/innerHeight are the fallback.
  return queries
    ? { width: matched(queries.width), height: matched(queries.height) }
    : { width: window.innerWidth, height: window.innerHeight };
}

/**
 * The current size class of the viewport, or of `target`'s content box. `null` without a DOM
 * (Node, a server render).
 */
export function currentWindowSizeClass(
  options: WindowSizeClassTargetOptions = {},
): WindowSizeClass | null {
  if (typeof window === 'undefined') return null;
  const size = options.target ? contentBox(options.target) : viewportSize(viewportQueries());
  return windowSizeClass(size, options);
}

/**
 * Calls `callback` with the current window size class (androidx `WindowSizeClass`, m3e-motion
 * `windowSizeClass`) right away, then each time the width or height class changes, until
 * `signal` aborts. Without `target` it follows the viewport through one `matchMedia` query per
 * breakpoint, so it wakes only when a breakpoint is crossed; with `target` it follows that
 * element's content box through a ResizeObserver (container-based layouts). Does nothing without
 * a DOM or when `signal` is already aborted. Registers no element (D7).
 */
export function observeWindowSizeClass(
  callback: (sizeClass: WindowSizeClass) => void,
  options: ObserveWindowSizeClassOptions,
): void {
  const { target, signal } = options;
  if (typeof window === 'undefined' || signal.aborted) return;
  let current: WindowSizeClass | null = null;
  const update = (size: Size) => {
    const next = windowSizeClass(size, options);
    if (current && sameWindowSizeClass(current, next)) return;
    current = next;
    callback(next);
  };

  if (target) {
    update(contentBox(target));
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1]?.contentRect;
      if (rect) update({ width: rect.width, height: rect.height });
    });
    observer.observe(target);
    signal.addEventListener('abort', () => {
      observer.disconnect();
    });
    return;
  }

  const queries = viewportQueries();
  const onChange = () => {
    update(viewportSize(queries));
  };
  onChange();
  if (queries) {
    for (const [, mql] of [...queries.width, ...queries.height]) {
      mql.addEventListener('change', onChange, { signal });
    }
  } else {
    window.addEventListener('resize', onChange, { signal });
  }
}
