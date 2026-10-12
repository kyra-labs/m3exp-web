import {
  type AppBarScrollBehavior,
  type AppBarScrollState,
  type SpringSpec,
  appBarScrollState,
  isScrolledUnder,
  scrollAppBar,
  settleTarget,
  springDurationMillis,
  springValue,
  withHeight,
  withHeightOffset,
} from '@kyralabs/m3e-motion';

export type { AppBarScrollBehavior };

export interface TopAppBarScrollOptions {
  /** `pinned` (default): only the container color reacts. `enter-always`: the bar also hides. */
  behavior?: AppBarScrollBehavior;
  /** The scrolling element the bar sits over. Default: the document (window scrolling). */
  target?: HTMLElement | Window;
  signal: AbortSignal;
}

/**
 * Browsers without `scrollend` (older Safari) settle the bar once scrolling has been idle this
 * long. A scroll-detection heuristic, not a motion value.
 */
const SCROLL_IDLE_MS = 100;

/** Compose's TopAppBarDefaults.snapAnimationSpec is the default effects spring (AppBar.kt L1540). */
const SNAP_SPRING = 'default-effects';

function readSpring(el: Element): SpringSpec | null {
  const style = getComputedStyle(el);
  const read = (part: string) =>
    Number.parseFloat(style.getPropertyValue(`--m3e-sys-motion-spring-${SNAP_SPRING}-${part}`));
  if (read('duration') === 0) return null;
  const dampingRatio = read('damping-ratio');
  const stiffness = read('stiffness');
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}

/**
 * Scroll behaviors for a `.m3e-top-app-bar` (COMPONENT_SPEC §11), ported from Compose's
 * TopAppBarDefaults.pinnedScrollBehavior / enterAlwaysScrollBehavior (math in m3e-motion
 * app-bar-scroll.ts). Writes on the bar, until `signal` aborts:
 * - `data-scroll-behavior`,
 * - `data-scrolled` while content is scrolled under it (container color),
 * - `--_m3e-top-app-bar-offset` (enter-always): the height offset in px, 0 to minus the height.
 * A partially hidden bar snaps open or closed when scrolling stops, and opens when focus moves
 * into it. m3e-react's `<TopAppBar scrollBehavior>` calls this, so both layers write one contract.
 */
export function attachTopAppBarScroll(bar: HTMLElement, options: TopAppBarScrollOptions): void {
  const { behavior = 'pinned', target = window, signal } = options;
  const scroller = target === window ? document.scrollingElement : (target as HTMLElement);
  const scrollTop = () => {
    if (!scroller) return 0;
    const max = scroller.scrollHeight - scroller.clientHeight;
    return Math.min(Math.max(scroller.scrollTop, 0), Math.max(max, 0));
  };

  let state: AppBarScrollState = appBarScrollState(bar.offsetHeight);
  let lastTop = scrollTop();
  state = scrollAppBar(state, 'pinned', lastTop, 0);
  let frameId = 0;
  let snapTarget: number | null = null;
  let idleTimer = 0;
  const hasScrollEnd = 'onscrollend' in window;

  const apply = () => {
    bar.toggleAttribute('data-scrolled', isScrolledUnder(state));
    if (behavior === 'enter-always') {
      bar.style.setProperty('--_m3e-top-app-bar-offset', `${String(state.heightOffset)}px`);
    }
  };

  const stopSnap = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    snapTarget = null;
  };

  const snapTo = (to: number) => {
    stopSnap();
    const from = state.heightOffset;
    const spec = readSpring(bar);
    if (spec === null || from === to) {
      state = withHeightOffset(state, to);
      apply();
      return;
    }
    const duration = springDurationMillis(spec, from, to);
    const start = performance.now();
    const step = (now: number) => {
      // rAF timestamps can precede `start` on the first frame.
      const elapsed = Math.max(0, Math.round(now - start));
      const done = elapsed >= duration;
      state = withHeightOffset(state, done ? to : springValue(spec, elapsed, from, to));
      apply();
      if (done) stopSnap();
      else frameId = requestAnimationFrame(step);
    };
    snapTarget = to;
    frameId = requestAnimationFrame(step);
  };

  const settle = () => {
    clearTimeout(idleTimer);
    if (behavior !== 'enter-always' || snapTarget !== null) return;
    const to = settleTarget(state);
    if (to !== null) snapTo(to);
  };

  const onScroll = () => {
    const top = scrollTop();
    const delta = lastTop - top;
    lastTop = top;
    // An upward scroll (e.g. the browser revealing a focused control) would open the bar anyway:
    // let a snap that is opening it finish. Any other scroll takes over from the snap.
    if (snapTarget === 0 && delta >= 0) {
      state = scrollAppBar(state, 'pinned', top, delta);
    } else {
      stopSnap();
      state = scrollAppBar(state, behavior, top, delta);
    }
    apply();
    if (!hasScrollEnd) {
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(settle, SCROLL_IDLE_MS);
    }
  };

  bar.setAttribute('data-scroll-behavior', behavior);
  apply();
  const listenOptions = { passive: true, signal };
  target.addEventListener('scroll', onScroll, listenOptions);
  target.addEventListener('scrollend', settle, listenOptions);
  if (behavior === 'enter-always') {
    // A keyboard user tabbing into a hidden bar gets it back.
    bar.addEventListener(
      'focusin',
      () => {
        if (state.heightOffset !== 0) snapTo(0);
      },
      { signal },
    );
  }
  const resize = new ResizeObserver(() => {
    state = withHeight(state, bar.offsetHeight);
    apply();
  });
  resize.observe(bar);

  signal.addEventListener(
    'abort',
    () => {
      stopSnap();
      clearTimeout(idleTimer);
      resize.disconnect();
      bar.removeAttribute('data-scroll-behavior');
      bar.removeAttribute('data-scrolled');
      bar.style.removeProperty('--_m3e-top-app-bar-offset');
    },
    { once: true },
  );
}
