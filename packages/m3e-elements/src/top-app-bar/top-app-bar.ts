import {
  type AppBarScrollBehavior,
  type AppBarScrollState,
  type SpringSpec,
  appBarScrollState,
  collapsedFraction,
  isScrolledUnder,
  scrollAppBar,
  settleTarget,
  springDurationMillis,
  springValue,
  twoRowsFrame,
  withHeight,
  withHeightOffset,
} from '@kyralabs/m3e-motion';
import { observeScroll, readSpringTokens } from '../base/scroll.js';

export type { AppBarScrollBehavior };

export interface TopAppBarScrollOptions {
  /**
   * `pinned` (default): only the container color reacts. `enter-always`: the bar (a two-rows bar:
   * its expanded row) also collapses on scroll down and returns on any scroll up.
   * `exit-until-collapsed`: it collapses on scroll down and expands when the content comes back to
   * its start.
   */
  behavior?: AppBarScrollBehavior;
  /** The scrolling element the bar sits over. Default: the document (window scrolling). */
  target?: HTMLElement | Window;
  signal: AbortSignal;
}

/** TopAppBarDefaults.snapAnimationSpec (default effects, AppBar.kt L1540); 0ms under reduced motion. */
const SNAP_SPRING = '--m3e-comp-top-app-bar-snap';
const OFFSET = '--_m3e-top-app-bar-offset';
const COLLAPSED_ALPHA = '--_m3e-top-app-bar-collapsed-title-opacity';
const EXPANDED_ALPHA = '--_m3e-top-app-bar-expanded-title-opacity';
const COLOR_FRACTION = '--_m3e-top-app-bar-color-fraction';

const readSpring = (el: Element): SpringSpec | null =>
  readSpringTokens(getComputedStyle(el), SNAP_SPRING);

/**
 * Scroll behaviors for a `.m3e-top-app-bar` (COMPONENT_SPEC §11), ported from Compose's
 * TopAppBarDefaults.pinnedScrollBehavior / enterAlwaysScrollBehavior /
 * exitUntilCollapsedScrollBehavior (math in m3e-motion app-bar-scroll.ts). Writes on the bar,
 * until `signal` aborts:
 * - `data-scroll-behavior`,
 * - `data-scrolled` while content is scrolled under it (single-row container color),
 * - `--_m3e-top-app-bar-offset` (enter-always, exit-until-collapsed): the height offset in px, 0 to
 *   minus the collapsible height: the whole bar, or a two-rows bar's `__expanded` row,
 * - on a two-rows bar (one with a `__expanded` row), what TwoRowsTopAppBar derives from the
 *   collapsed fraction: `--_m3e-top-app-bar-collapsed-title-opacity`,
 *   `--_m3e-top-app-bar-expanded-title-opacity`, `--_m3e-top-app-bar-color-fraction`, and
 *   `aria-hidden` on whichever headline Compose hides from accessibility (the collapsed one below
 *   half collapsed, the expanded one from half).
 * A partially collapsed bar snaps open or closed when scrolling stops (settleAppBar), and opens
 * when focus moves into a hidden part. m3e-react's `<TopAppBar scrollBehavior>` calls this, so both
 * layers write one contract.
 */
export function attachTopAppBarScroll(bar: HTMLElement, options: TopAppBarScrollOptions): void {
  const { behavior = 'pinned', target = window, signal } = options;
  const moves = behavior !== 'pinned';
  // TwoRowsTopAppBar collapses its bottom row only (adjustHeightOffsetLimit on that row).
  const expanded = bar.querySelector<HTMLElement>(':scope > .m3e-top-app-bar__expanded');
  const collapsedHeadline = expanded && bar.querySelector(':scope > .m3e-top-app-bar__headline');
  const expandedHeadline = expanded?.querySelector(':scope > .m3e-top-app-bar__headline');
  const collapsible = expanded ?? bar;

  let state: AppBarScrollState = appBarScrollState(collapsible.offsetHeight);
  let frameId = 0;
  let snapTarget: number | null = null;
  let hidden: boolean | null = null;

  const setHidden = (collapsedHidden: boolean) => {
    if (hidden === collapsedHidden) return;
    hidden = collapsedHidden;
    const [shown, gone] = collapsedHidden
      ? [expandedHeadline, collapsedHeadline]
      : [collapsedHeadline, expandedHeadline];
    shown?.removeAttribute('aria-hidden');
    gone?.setAttribute('aria-hidden', 'true');
  };

  const apply = () => {
    bar.toggleAttribute('data-scrolled', isScrolledUnder(state));
    if (moves) bar.style.setProperty(OFFSET, `${String(state.heightOffset)}px`);
    if (expanded) {
      const frame = twoRowsFrame(collapsedFraction(state));
      bar.style.setProperty(COLLAPSED_ALPHA, String(frame.collapsedTitleAlpha));
      bar.style.setProperty(EXPANDED_ALPHA, String(frame.expandedTitleAlpha));
      bar.style.setProperty(COLOR_FRACTION, String(frame.containerColorFraction));
      setHidden(frame.collapsedTitleHidden);
    }
  };

  const stopSnap = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    snapTarget = null;
  };

  // Compose's settleAppBar snaps from rest (AnimationState(initialValue = heightOffset)).
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
    if (!moves || snapTarget !== null) return;
    const to = settleTarget(state);
    if (to !== null) snapTo(to);
  };

  const onScroll = (delta: number, top: number) => {
    // An upward scroll (e.g. the browser revealing a focused control) would open the bar anyway:
    // let a snap that is opening it finish. Any other scroll takes over from the snap.
    if (snapTarget === 0 && delta >= 0) {
      state = scrollAppBar(state, 'pinned', top, delta);
    } else {
      stopSnap();
      state = scrollAppBar(state, behavior, top, delta);
    }
    apply();
  };

  state = scrollAppBar(
    state,
    'pinned',
    observeScroll(target, { onScroll, onSettle: settle }, signal),
    0,
  );
  bar.setAttribute('data-scroll-behavior', behavior);
  apply();
  if (moves) {
    // A keyboard user tabbing into a hidden part (a two-rows bar keeps its top row) gets it back.
    bar.addEventListener(
      'focusin',
      (event) => {
        const inside = !expanded || expanded.contains(event.target as Node);
        if (inside && state.heightOffset !== 0) snapTo(0);
      },
      { signal },
    );
  }
  const resize = new ResizeObserver(() => {
    state = withHeight(state, collapsible.offsetHeight);
    apply();
  });
  resize.observe(collapsible);

  signal.addEventListener(
    'abort',
    () => {
      stopSnap();
      resize.disconnect();
      setHidden(true);
      bar.removeAttribute('data-scroll-behavior');
      bar.removeAttribute('data-scrolled');
      for (const property of [OFFSET, COLLAPSED_ALPHA, EXPANDED_ALPHA, COLOR_FRACTION])
        bar.style.removeProperty(property);
    },
    { once: true },
  );
}
