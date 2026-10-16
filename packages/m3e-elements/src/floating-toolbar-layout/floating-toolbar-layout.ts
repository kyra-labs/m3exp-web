import {
  type FloatingToolbarExitDirection,
  type ToolbarExpansionScroll,
  SpringAnimatable,
  scrollToolbarExpansion,
  toolbarExpansionScroll,
} from '@kyralabs/m3e-motion';
import { ExitOnScroll, observeScroll, readSpringTokens } from '../base/scroll.js';
import { RovingFocus } from '../roving-focus/roving-focus.js';

/**
 * How the toolbar reacts to its scroll container: `exit-always`
 * (FloatingToolbarDefaults.exitAlwaysScrollBehavior: hides on scroll down, returns on scroll up) or
 * `collapse` (floatingToolbarVerticalNestedScroll: collapses on scroll down, expands on scroll up,
 * reported through `onExpandedChange`).
 */
export type FloatingToolbarLayoutScrollBehavior = 'exit-always' | 'collapse';

export interface FloatingToolbarLayoutOptions {
  /** Called when the `collapse` scroll behavior wants the toolbar expanded or collapsed. */
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
}

export interface FloatingToolbarScrollOptions {
  behavior?: FloatingToolbarLayoutScrollBehavior | null | undefined;
  /** `exit-always` only. Default `bottom` (horizontal) / `end` (vertical), as Compose's samples. */
  exitDirection?: FloatingToolbarExitDirection | null | undefined;
  /** The scrolling element the toolbar floats over. Default: the document (window scrolling). */
  target?: HTMLElement | Window | null | undefined;
}

const BLOCK = 'm3e-floating-toolbar';
const TOKENS = '--m3e-comp-floating-toolbar-defaults';

interface Slot {
  el: HTMLElement;
  /** Natural size along the toolbar (measured when an animation starts from rest). */
  full: number;
}

interface Scroll {
  abort: AbortController;
  /** The exit-always behavior (null for `collapse`). */
  exit: ExitOnScroll | null;
}

/**
 * The motion, focus and scroll handling of a rendered `.m3e-floating-toolbar` (COMPONENT_SPEC §9;
 * Compose FloatingToolbar.kt), shared by `<m3e-floating-toolbar>` and m3e-react's
 * `<FloatingToolbar>` so both layers write the same DOM. It reads the state from the m3e-css
 * classes the layer rendered (`--collapsed`, `--vertical`, `--with-fab`); call `update()` after
 * every render.
 *
 * - **Expand / collapse** on `FloatingToolbarDefaults.animationSpec()` (fast spatial; tokens
 *   `--m3e-comp-floating-toolbar-defaults-animation-*`), interruptible with its velocity kept
 *   (m3e-motion SpringAnimatable, Compose Animatable semantics). While it runs the root has
 *   `data-animating` and an inline `--_m3e-floating-toolbar-progress` (the with-FAB fold is pure
 *   m3e-css from it); without a FAB the leading / trailing parts get an inline size of their
 *   natural size × progress (AnimatedVisibility expand/shrink). At rest every inline style goes.
 * - **Hidden parts are `inert`** (Compose's sample: `focusProperties { canFocus = expanded }`): the
 *   leading / trailing parts, or the toolbar beside a FAB, as soon as it collapses; focus inside
 *   moves to the FAB, else the first remaining item.
 * - **Roving focus** (RovingFocus): one tab stop, arrows along the orientation, Home / End.
 * - **Scroll** (`setScroll`): `exit-always` (m3e-elements ExitOnScroll, shared with the docked
 *   toolbar) writes `data-exit-direction` and `--_m3e-floating-toolbar-offset` (0 to minus the
 *   distance off the offset parent / viewport), snaps a partly hidden toolbar on the snap spring
 *   (default effects; jumps under reduced motion) when scrolling ends, and takes it out of the tab
 *   order while it is off its place (Compose: an offscreen toolbar is not focusable). It does not hide while it holds focus (WCAG 2.4.11) and
 *   returns when focus moves into it. `collapse` reports the expanded state through
 *   `onExpandedChange` after `--m3e-comp-floating-toolbar-defaults-scroll-distance-threshold`.
 */
export class FloatingToolbarLayout {
  readonly root: HTMLElement;
  readonly focus: RovingFocus;
  #options: FloatingToolbarLayoutOptions;
  #expanded: boolean | null = null;
  #progress = new SpringAnimatable(1);
  #slots: Slot[] = [];
  #frame = 0;
  #scroll: Scroll | null = null;
  #expansion: ToolbarExpansionScroll | null = null;
  #destroyed = false;

  constructor(root: HTMLElement, options: FloatingToolbarLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.focus = new RovingFocus(root, {
      orientation: () => (this.#vertical ? 'vertical' : 'horizontal'),
    });
  }

  get #vertical(): boolean {
    return this.root.classList.contains(`${BLOCK}--vertical`);
  }

  get #withFab(): boolean {
    return this.root.classList.contains(`${BLOCK}--with-fab`);
  }

  /** Call after (re)rendering: starts the expand/collapse spring when the state changed. */
  update(): void {
    if (this.#destroyed) return;
    const expanded = !this.root.classList.contains(`${BLOCK}--collapsed`);
    this.root.toggleAttribute('data-spring', true);
    this.#syncInert(expanded);
    if (this.#expanded !== expanded) {
      const first = this.#expanded === null;
      this.#expanded = expanded;
      if (this.#expansion) {
        this.#expansion = toolbarExpansionScroll(
          expanded,
          this.#threshold(),
          this.#threshold(),
          this.#expansion.contentOffset,
        );
      }
      if (first) this.#progress.snapTo(expanded ? 1 : 0);
      else this.#animate(expanded);
    }
    this.focus.update();
  }

  /** Attaches (or with `behavior: null` detaches) a scroll behavior. */
  setScroll(options: FloatingToolbarScrollOptions): void {
    const behavior = options.behavior ?? null;
    const direction = options.exitDirection ?? (this.#vertical ? 'end' : 'bottom');
    const target = options.target ?? window;
    this.#detachScroll();
    if (behavior === null || this.#destroyed) return;
    const abort = new AbortController();
    this.root.setAttribute('data-scroll-behavior', behavior);
    if (behavior === 'exit-always') {
      this.root.setAttribute('data-exit-direction', direction);
      const exit: ExitOnScroll = new ExitOnScroll(this.root, {
        target,
        distance: (): number => this.#exitDistance(direction, exit.offset),
        spring: () => readSpringTokens(getComputedStyle(this.root), `${TOKENS}-snap`),
        write: (offset) => {
          this.#writeOffset(offset);
        },
      });
      this.#scroll = { abort, exit };
      return;
    }
    this.#scroll = { abort, exit: null };
    this.#expansion = toolbarExpansionScroll(
      this.#expanded ?? true,
      this.#threshold(),
      this.#threshold(),
    );
    observeScroll(
      target,
      {
        onScroll: (delta) => {
          this.#onCollapseScroll(delta);
        },
        onSettle: () => undefined,
      },
      abort.signal,
    );
  }

  destroy(): void {
    this.#destroyed = true;
    this.#detachScroll();
    this.focus.destroy();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  // --- Expand / collapse ---------------------------------------------------------------------

  /** The parts that hide when collapsed. */
  #hiding(): HTMLElement[] {
    const bar = this.root.querySelector<HTMLElement>(`:scope > .${BLOCK}__bar`);
    if (!bar) return [];
    if (this.#withFab) return [bar];
    return [
      ...bar.querySelectorAll<HTMLElement>(`:scope > :is(.${BLOCK}__leading, .${BLOCK}__trailing)`),
    ];
  }

  #syncInert(expanded: boolean): void {
    const parts = this.#hiding();
    const active = this.root.ownerDocument.activeElement;
    if (!expanded && active && parts.some((p) => p.contains(active))) {
      const fallback = this.focus.items().find((el) => !parts.some((p) => p.contains(el)));
      fallback?.focus();
    }
    for (const part of parts) {
      if (part.inert !== !expanded) part.inert = !expanded;
    }
  }

  #animate(expanded: boolean): void {
    const now = performance.now();
    const style = getComputedStyle(this.root);
    this.root.toggleAttribute('data-animating', true);
    if (!this.#progress.isRunning && !this.#withFab) {
      const size = this.#vertical ? 'offsetHeight' : 'offsetWidth';
      this.#slots = this.#hiding().map((el) => {
        el.style.removeProperty(this.#sizeProperty);
        return { el, full: el[size] };
      });
    }
    this.#progress.animateTo(expanded ? 1 : 0, readSpringTokens(style, `${TOKENS}-animation`), now);
    this.#tick(now);
  }

  get #sizeProperty(): 'inline-size' | 'block-size' {
    return this.#vertical ? 'block-size' : 'inline-size';
  }

  // --- Frame loop (expand/collapse progress) ---------------------------------------------------

  #tick(now: number): void {
    const root = this.root;
    const progress = this.#progress.sample(now);
    const animating = this.#progress.isRunning;
    if (animating) {
      root.style.setProperty('--_m3e-floating-toolbar-progress', String(progress));
      for (const slot of this.#slots) {
        slot.el.style.setProperty(
          this.#sizeProperty,
          `${String(slot.full * Math.max(progress, 0))}px`,
        );
      }
    } else {
      root.style.removeProperty('--_m3e-floating-toolbar-progress');
      root.removeAttribute('data-animating');
      for (const slot of this.#slots) {
        slot.el.style.removeProperty('inline-size');
        slot.el.style.removeProperty('block-size');
        if (!slot.el.getAttribute('style')) slot.el.removeAttribute('style');
      }
      this.#slots = [];
    }
    if (!root.getAttribute('style')) root.removeAttribute('style');
    const running = animating;
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

  // --- Scroll behaviors ------------------------------------------------------------------------

  #threshold(): number {
    const value = Number.parseFloat(
      getComputedStyle(this.root).getPropertyValue(`${TOKENS}-scroll-distance-threshold`),
    );
    return Number.isFinite(value) ? value : 0;
  }

  #onCollapseScroll(delta: number): void {
    if (!this.#expansion) return;
    const threshold = this.#threshold();
    const { state, change } = scrollToolbarExpansion(this.#expansion, delta, threshold, threshold);
    this.#expansion = state;
    const next = change === 'expand' ? true : change === 'collapse' ? false : null;
    if (next !== null && next !== this.#expanded) this.#options.onExpandedChange?.(next);
  }

  /**
   * How far the toolbar travels to leave its offset parent (or the viewport) in its direction,
   * measured without its current `offset`.
   */
  #exitDistance(direction: FloatingToolbarExitDirection, offset: number): number {
    const rtl = getComputedStyle(this.root).direction === 'rtl';
    const tx =
      direction === 'start'
        ? rtl
          ? -offset
          : offset
        : direction === 'end'
          ? rtl
            ? offset
            : -offset
          : 0;
    const ty = direction === 'bottom' ? -offset : direction === 'top' ? offset : 0;
    const r = this.root.getBoundingClientRect();
    const left = r.left - tx;
    const right = r.right - tx;
    const top = r.top - ty;
    const bottom = r.bottom - ty;
    const parent = this.root.offsetParent?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
    switch (direction) {
      case 'bottom':
        return parent.bottom - top;
      case 'top':
        return bottom - parent.top;
      case 'start':
        return rtl ? parent.right - left : right - parent.left;
      case 'end':
        return rtl ? right - parent.left : parent.right - left;
    }
  }

  #writeOffset(offset: number): void {
    if (offset === 0) this.root.style.removeProperty('--_m3e-floating-toolbar-offset');
    else this.root.style.setProperty('--_m3e-floating-toolbar-offset', `${String(offset)}px`);
    if (!this.root.getAttribute('style')) this.root.removeAttribute('style');
    this.focus.tabbable = offset === 0;
  }

  #detachScroll(): void {
    if (!this.#scroll) return;
    this.#scroll.abort.abort();
    this.#scroll.exit?.destroy();
    this.#scroll = null;
    this.#expansion = null;
    this.root.removeAttribute('data-scroll-behavior');
    this.root.removeAttribute('data-exit-direction');
    this.#writeOffset(0);
  }
}
