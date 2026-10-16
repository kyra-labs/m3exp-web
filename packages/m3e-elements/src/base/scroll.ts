import {
  type FloatingToolbarScrollState,
  type SpringSpec,
  SpringAnimatable,
  floatingToolbarScrollState,
  scrollFloatingToolbar,
  toolbarSettleTarget,
  withToolbarOffset,
  withToolbarOffsetLimit,
} from '@kyralabs/m3e-motion';

// Scroll plumbing shared by the scroll behaviors of the top app bar (attachTopAppBarScroll), the
// floating toolbar (FloatingToolbarLayout) and the docked toolbar / legacy bottom app bar
// (DockedToolbarLayout). Internal: not exported from an entry of its own.

/**
 * Browsers without `scrollend` (older Safari) settle a bar once scrolling has been idle this long.
 * A scroll-detection heuristic, not a motion value.
 */
const SCROLL_IDLE_MS = 100;

export interface ScrollObserver {
  /** Called after every scroll: `delta` is the previous minus the new scroll position (positive
   * when the content is pulled down, like Compose's `consumed.y`), `top` the new position. */
  onScroll: (delta: number, top: number) => void;
  /** Called when scrolling ends (`scrollend`, or after an idle pause without it). */
  onSettle: () => void;
}

/**
 * Observes the scroll position of `target` (the window: the document's scrolling element) until
 * `signal` aborts. Positions are clamped to the scroll range (rubber-banding is ignored). Returns
 * the current position.
 */
export function observeScroll(
  target: HTMLElement | Window,
  observer: ScrollObserver,
  signal: AbortSignal,
): number {
  const scroller = target === window ? document.scrollingElement : (target as HTMLElement);
  const scrollTop = () => {
    if (!scroller) return 0;
    const max = scroller.scrollHeight - scroller.clientHeight;
    return Math.min(Math.max(scroller.scrollTop, 0), Math.max(max, 0));
  };
  let lastTop = scrollTop();
  let idle = 0;
  const hasScrollEnd = 'onscrollend' in window;
  const settle = () => {
    clearTimeout(idle);
    observer.onSettle();
  };
  const onScroll = () => {
    const top = scrollTop();
    const delta = lastTop - top;
    lastTop = top;
    observer.onScroll(delta, top);
    if (!hasScrollEnd) {
      clearTimeout(idle);
      idle = window.setTimeout(settle, SCROLL_IDLE_MS);
    }
  };
  const options = { passive: true, signal };
  target.addEventListener('scroll', onScroll, options);
  target.addEventListener('scrollend', settle, options);
  signal.addEventListener('abort', () => {
    clearTimeout(idle);
  });
  return lastTop;
}

export interface ExitOnScrollOptions {
  /** The scrolling element (default: the document). */
  target: HTMLElement | Window;
  /** How far the bar must travel to leave its place, measured without the current offset. */
  distance: () => number;
  /** The snap spring, or null to jump (e.g. a spatial spring under reduced motion). */
  spring: () => SpringSpec | null;
  /** Writes the offset (0 = in place, down to minus the distance) on every change. */
  write: (offset: number) => void;
}

/**
 * An exit-always scroll behavior (Compose FloatingToolbarDefaults.exitAlwaysScrollBehavior and
 * BottomAppBarDefaults.exitAlwaysScrollBehavior; math in m3e-motion floating-toolbar-scroll.ts):
 * the offset follows every scroll delta between 0 and minus `distance()`, and when scrolling stops
 * a partly hidden bar snaps to shown (collapsed fraction < 0.5) or hidden on `spring()`,
 * interruptibly (a new scroll takes over; a retarget keeps the velocity). A bar that holds focus
 * does not hide (WCAG 2.4.11 Focus Not Obscured), and focus moving into a hidden bar brings it
 * back.
 */
export class ExitOnScroll {
  readonly root: HTMLElement;
  #options: ExitOnScrollOptions;
  #state: FloatingToolbarScrollState = floatingToolbarScrollState();
  #offset = new SpringAnimatable(0);
  #frame = 0;
  #abort = new AbortController();

  constructor(root: HTMLElement, options: ExitOnScrollOptions) {
    this.root = root;
    this.#options = options;
    const { signal } = this.#abort;
    observeScroll(
      options.target,
      {
        onScroll: (delta) => {
          this.#onScroll(delta);
        },
        onSettle: () => {
          if (this.#offset.isRunning) return;
          const to = toolbarSettleTarget(this.#state);
          if (to !== null) this.#snap(to);
        },
      },
      signal,
    );
    // Focus moved into a hidden bar (a pointer, a script or the keyboard).
    root.addEventListener(
      'focusin',
      () => {
        if (this.#state.offset !== 0) this.#snap(0);
      },
      { signal },
    );
  }

  /** The current offset (0 = in place). */
  get offset(): number {
    return this.#state.offset;
  }

  /** Stops listening and puts the bar back in place. */
  destroy(): void {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#offset.snapTo(0);
    this.#state = floatingToolbarScrollState();
    this.#options.write(0);
  }

  #onScroll(delta: number): void {
    // A scroll event that did not move (a repeat at the same position) changes nothing and leaves
    // a running snap alone.
    if (delta === 0) return;
    const active = this.root.ownerDocument.activeElement;
    if (delta < 0 && active && this.root.contains(active)) {
      // Keep a focused bar in place (WCAG 2.4.11 Focus Not Obscured).
      this.#state = { ...this.#state, contentOffset: this.#state.contentOffset + delta };
      return;
    }
    // A scroll takes over from a running snap.
    this.#offset.snapTo(this.#state.offset);
    this.#state = scrollFloatingToolbar(
      withToolbarOffsetLimit(this.#state, this.#options.distance()),
      delta,
    );
    this.#offset.snapTo(this.#state.offset);
    this.#options.write(this.#state.offset);
  }

  #snap(to: number): void {
    const now = performance.now();
    // A running snap retargets from its value and velocity; from rest it starts at the offset.
    if (!this.#offset.isRunning) this.#offset.snapTo(this.#state.offset);
    this.#offset.animateTo(to, this.#options.spring(), now);
    this.#tick(now);
  }

  #tick(now: number): void {
    // The state setter coerces (Compose: `state.heightOffset = value` / `state.offset = value`), so
    // an overshooting spring rests at the edge instead of moving the bar past its place.
    this.#state = withToolbarOffset(this.#state, this.#offset.sample(now));
    this.#options.write(this.#state.offset);
    const running = this.#offset.isRunning;
    // Keep a pending frame rather than re-requesting it, so it stays first in its frame.
    if (running && this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    } else if (!running && this.#frame !== 0) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }
  }
}

/**
 * A component's spring `<prefix>-*` custom properties on `style` (`-duration`, `-damping-ratio`,
 * `-stiffness`), or null when its duration resolves to 0 (reduced motion snaps spatial springs).
 */
export function readSpringTokens(style: CSSStyleDeclaration, prefix: string): SpringSpec | null {
  const read = (part: string) => Number.parseFloat(style.getPropertyValue(`${prefix}-${part}`));
  if (read('duration') === 0) return null;
  const dampingRatio = read('damping-ratio');
  const stiffness = read('stiffness');
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}
