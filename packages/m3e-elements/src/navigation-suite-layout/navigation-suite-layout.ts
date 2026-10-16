import { NavigationSuiteScaffoldAnimation, navigationSuiteOffset } from '@kyralabs/m3e-motion';
import { tabStops } from '../base/modal.js';
import { readSpringTokens } from '../base/scroll.js';

export interface NavigationSuiteLayoutOptions {
  /** The initial target state (rendered without animating). Default: the root's class. */
  navigationHidden?: boolean;
}

const SUITE = 'm3e-navigation-suite';
const ITEMS = '.m3e-navigation-item, .m3e-navigation-drawer-item';
const PRIMARY = `.${SUITE}__primary-action, .m3e-wide-navigation-rail__header`;
const SPRING = '--m3e-comp-navigation-suite-scaffold-visibility';

const px = (v: number) => `${String(v)}px`;

interface Focused {
  el: HTMLElement;
  /** Index among the navigation's items, or −1 for the primary action. */
  index: number;
}

/**
 * Behavior of a `.m3e-navigation-suite` (COMPONENT_SPEC §16), shared by `<m3e-navigation-suite>`
 * and m3e-react's `<NavigationSuiteScaffold>` so both layers write one DOM contract. The caller
 * renders the navigation for the current type (the bar, rail or drawer contract) and the target
 * state's `--navigation-hidden` class, then calls `update()` and `setNavigationHidden()`.
 *
 * - Show / hide (NavigationSuiteScaffoldState): m3e-motion's NavigationSuiteScaffoldAnimation runs
 *   Compose's state and layout springs (`--m3e-comp-navigation-suite-scaffold-visibility-*`; they
 *   jump under reduced motion) and each frame writes only `--_m3e-ns-offset` (px) with
 *   `data-animating`. The navigation's size comes from a ResizeObserver, so no layout is read while
 *   it moves. A new target starts from the current values and velocities.
 * - Switching type (bar ↔ rail ↔ drawer): the caller keeps the same item elements where the DOM
 *   allows (bar ↔ rail); when an item or the primary action that had focus is replaced or moved,
 *   `update()` gives focus to the same item (by position) or the primary action in the new
 *   navigation, without scrolling.
 */
export class NavigationSuiteLayout {
  readonly root: HTMLElement;
  #animation: NavigationSuiteScaffoldAnimation;
  #abort = new AbortController();
  #frame = 0;
  #observer: ResizeObserver | null = null;
  #observed: Element | null = null;
  #sizes = new WeakMap<Element, { inline: number; block: number }>();
  #focused: Focused | null = null;

  constructor(root: HTMLElement, options: NavigationSuiteLayoutOptions = {}) {
    this.root = root;
    this.#animation = new NavigationSuiteScaffoldAnimation(
      options.navigationHidden ?? root.classList.contains(`${SUITE}--navigation-hidden`),
    );
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const box = entry.borderBoxSize[0];
          this.#sizes.set(entry.target, {
            inline: box ? box.inlineSize : entry.contentRect.width,
            block: box ? box.blockSize : entry.contentRect.height,
          });
        }
      });
    }
    const { signal } = this.#abort;
    root.addEventListener(
      'focusin',
      (e) => {
        this.#focused = this.#locate(e.target);
      },
      { signal },
    );
    root.addEventListener(
      'focusout',
      (e) => {
        const target = e.target;
        // A removal (or move) may blur without saying so; update() runs before this check.
        queueMicrotask(() => {
          if (this.#focused?.el === target && root.ownerDocument.activeElement !== target) {
            this.#focused = null;
          }
        });
      },
      { signal },
    );
    this.update();
  }

  /** NavigationSuiteScaffoldState.targetValue == Hidden. */
  get navigationHidden(): boolean {
    return this.#animation.targetHidden;
  }

  /** The navigation component: the bar or rail `<nav>`, or the `.m3e-navigation-drawer`. */
  get navigation(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(':scope > nav, :scope > .m3e-navigation-drawer');
  }

  /** Re-reads the DOM after a render (another type, items added or removed). */
  update(): void {
    const nav = this.navigation;
    if (this.#observer && nav !== this.#observed) {
      if (this.#observed) this.#observer.unobserve(this.#observed);
      if (nav) this.#observer.observe(nav);
      this.#observed = nav;
    }
    this.#restoreFocus(nav);
  }

  /** Shows or hides the navigation, animated (`animate = false`: jumps). */
  setNavigationHidden(hidden: boolean, animate = true): void {
    if (hidden === this.#animation.targetHidden) return;
    const now = performance.now();
    const spec = animate ? readSpringTokens(getComputedStyle(this.root), SPRING) : null;
    if (hidden) this.#animation.hide(spec, now);
    else this.#animation.show(spec, now);
    this.#tick(now);
  }

  destroy(): void {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#observer?.disconnect();
    this.#observed = null;
    this.#rest();
  }

  // --- Show / hide ------------------------------------------------------------------------------

  /** The navigation's size along the axis it moves on (its height with a bar, else its width). */
  #size(nav: HTMLElement): number {
    const bar = this.root.classList.contains(`${SUITE}--bar`);
    let size = this.#sizes.get(nav);
    if (!size) {
      // Not observed yet (an animation right after a render): read it once.
      const rect = nav.getBoundingClientRect();
      size = { inline: rect.width, block: rect.height };
      this.#sizes.set(nav, size);
    }
    return bar ? size.block : size.inline;
  }

  #tick(now: number): void {
    const s = this.#animation.sample(now);
    const nav = this.navigation;
    if (!s.running) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      this.#rest();
      return;
    }
    this.root.toggleAttribute('data-animating', true);
    if (nav) {
      this.root.style.setProperty(
        '--_m3e-ns-offset',
        px(navigationSuiteOffset(this.#size(nav), s.progress)),
      );
    }
    if (this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  /** At rest: the classes alone describe the suite. */
  #rest(): void {
    const root = this.root;
    root.removeAttribute('data-animating');
    root.style.removeProperty('--_m3e-ns-offset');
    if (root.getAttribute('style') === '') root.removeAttribute('style');
  }

  // --- Focus across navigation switches ----------------------------------------------------------

  #locate(target: EventTarget | null): Focused | null {
    const nav = this.navigation;
    if (!(target instanceof HTMLElement) || !nav?.contains(target)) {
      // A bar's primary action sits beside the navigation.
      if (target instanceof HTMLElement && target.closest(`.${SUITE}__primary-action`)) {
        return { el: target, index: -1 };
      }
      return null;
    }
    const item = target.closest<HTMLElement>(ITEMS);
    if (item) return { el: target, index: [...nav.querySelectorAll(ITEMS)].indexOf(item) };
    return target.closest(PRIMARY) ? { el: target, index: -1 } : null;
  }

  #restoreFocus(nav: HTMLElement | null): void {
    const focused = this.#focused;
    if (!focused) return;
    const doc = this.root.ownerDocument;
    const active = doc.activeElement;
    if (active === focused.el || (active && active !== doc.body)) return;
    let next: HTMLElement | null | undefined;
    if (focused.index >= 0) {
      next = nav?.querySelectorAll<HTMLElement>(ITEMS)[focused.index];
    } else if (focused.el.isConnected && this.root.contains(focused.el)) {
      next = focused.el; // the same primary action, moved to its new place
    } else {
      const primary = this.root.querySelector<HTMLElement>(
        `:scope > .${SUITE}__primary-action, :scope > nav > .m3e-wide-navigation-rail__header, :scope > .m3e-navigation-drawer > nav > .${SUITE}__primary-action`,
      );
      next = primary ? tabStops(primary)[0] : null;
    }
    if (!next) return;
    next.focus({ preventScroll: true });
    this.#focused = { el: next, index: focused.index };
  }
}
