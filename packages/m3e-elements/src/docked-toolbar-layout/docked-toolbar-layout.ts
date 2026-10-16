import { ExitOnScroll, readSpringTokens } from '../base/scroll.js';
import { RovingFocus } from '../roving-focus/roving-focus.js';

/**
 * How the bar reacts to its scroll container: `exit-always`
 * (BottomAppBarDefaults.exitAlwaysScrollBehavior: hides on scroll down, returns on scroll up).
 */
export type DockedToolbarLayoutScrollBehavior = 'exit-always';

export interface DockedToolbarScrollOptions {
  behavior?: DockedToolbarLayoutScrollBehavior | null | undefined;
  /** The scrolling element the bar is docked under. Default: the document (window scrolling). */
  target?: HTMLElement | Window | null | undefined;
}

/** The snap spring (BottomAppBarDefaults.snapAnimationSpec), shared by both bars. */
const SNAP = '--m3e-comp-docked-toolbar-defaults-snap';

/**
 * The focus and scroll handling of a rendered `.m3e-docked-toolbar` (COMPONENT_SPEC §10; Compose
 * FlexibleBottomAppBar) or legacy `.m3e-bottom-app-bar` (@deprecated, D4; Compose BottomAppBar),
 * shared by `<m3e-docked-toolbar>` and m3e-react's `<DockedToolbar>` / `<BottomAppBar>` so the
 * layers write the same DOM. Call `update()` after every render.
 *
 * - **Roving focus** (RovingFocus, as the floating toolbar): one tab stop, ArrowLeft / ArrowRight
 *   (mirrored in RTL), Home / End, no wrapping.
 * - **Scroll** (`setScroll`): `exit-always` (m3e-elements ExitOnScroll, shared with the floating
 *   toolbar; math in m3e-motion, Compose BottomAppBarState) writes `data-scroll-behavior` and
 *   `--_m3e-docked-toolbar-offset` (`--_m3e-bottom-app-bar-offset`): 0 to minus the bar's height
 *   (heightOffsetLimit = -placeable.height), following every scroll delta. When scrolling ends a
 *   partly hidden bar snaps to shown (collapsed fraction < 0.5) or hidden on
 *   BottomAppBarDefaults.snapAnimationSpec (fast spatial, `--m3e-comp-docked-toolbar-defaults-snap-*`;
 *   jumps under reduced motion), interruptibly. The bar stays in the tab order (Compose has no
 *   focus rule for it): focus moving into a hidden bar brings it back, and it does not hide while
 *   it holds focus (WCAG 2.4.11).
 */
export class DockedToolbarLayout {
  readonly root: HTMLElement;
  readonly focus: RovingFocus;
  #exit: ExitOnScroll | null = null;
  #destroyed = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.focus = new RovingFocus(root);
  }

  /** The private offset property of the rendered bar. */
  get #offsetProperty(): string {
    const block = this.root.classList.contains('m3e-bottom-app-bar')
      ? 'm3e-bottom-app-bar'
      : 'm3e-docked-toolbar';
    return `--_${block}-offset`;
  }

  /** Call after (re)rendering. */
  update(): void {
    if (this.#destroyed) return;
    this.focus.update();
  }

  /** Attaches (or with `behavior: null` detaches) the scroll behavior. */
  setScroll(options: DockedToolbarScrollOptions): void {
    this.#detachScroll();
    const behavior = options.behavior ?? null;
    if (behavior === null || this.#destroyed) return;
    const root = this.root;
    root.setAttribute('data-scroll-behavior', behavior);
    this.#exit = new ExitOnScroll(root, {
      target: options.target ?? window,
      distance: () => root.offsetHeight,
      spring: () => readSpringTokens(getComputedStyle(root), SNAP),
      write: (offset) => {
        if (offset === 0) root.style.removeProperty(this.#offsetProperty);
        else root.style.setProperty(this.#offsetProperty, `${String(offset)}px`);
        if (!root.getAttribute('style')) root.removeAttribute('style');
      },
    });
  }

  destroy(): void {
    this.#destroyed = true;
    this.#detachScroll();
    this.focus.destroy();
  }

  #detachScroll(): void {
    if (!this.#exit) return;
    this.#exit.destroy();
    this.#exit = null;
    this.root.removeAttribute('data-scroll-behavior');
  }
}
