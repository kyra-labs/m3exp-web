import {
  type NavigationOrientation,
  type ToolbarOrientation,
  toolbarNavigationTarget,
} from '@kyralabs/m3e-motion';

export type { NavigationOrientation, ToolbarOrientation };

/** Elements that can take focus (the toolbar items). */
const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]';
/** Containers whose descendants are not toolbar items: hidden parts and nested popups. */
const EXCLUDED = '[inert], [hidden], [popover], dialog, [role="menu"], [role="listbox"]';
/** Text entry keeps its own arrow keys (APG toolbar: a text field's Left/Right edit the text). */
const TEXT_ENTRY =
  'input:not([type="button"], [type="checkbox"], [type="radio"], [type="reset"], [type="submit"]), textarea, [contenteditable]:not([contenteditable="false"])';

export interface RovingFocusOptions {
  /** The items in focus order. Default: the focusable, visible descendants of the root. */
  items?: (() => HTMLElement[]) | undefined;
  /**
   * Which arrow keys move focus. Default `horizontal` (ArrowLeft / ArrowRight); `both` takes both
   * pairs (Down / Right next, Up / Left previous).
   */
  orientation?: (() => NavigationOrientation) | undefined;
  /**
   * Whether the arrow keys wrap from the last item to the first and back. Default false (the APG
   * toolbar); an interactive list wraps (m3.material.io Lists › Accessibility).
   */
  wrap?: (() => boolean) | undefined;
  /**
   * The item that holds the tab stop before any has been focused. Default: the first. (A radio
   * group would pass its checked item.)
   */
  initial?: ((items: readonly HTMLElement[]) => HTMLElement | undefined) | undefined;
}

/**
 * Roving tabindex for a composite widget (WAI-ARIA APG toolbar pattern), shared by
 * `<m3e-floating-toolbar>`, m3e-react's `<FloatingToolbar>` and the docked toolbar:
 *
 * - **One tab stop:** every item gets `tabindex="-1"` except one `tabindex="0"`: the last focused
 *   item while it can still take focus, else `initial(items)`, else the first. Natively disabled
 *   items are skipped; `aria-disabled` ones stay in the arrow-key order (APG) but only hold the
 *   stop once focused.
 * - **Keys** (m3e-motion `toolbarNavigationTarget`): ArrowRight / ArrowLeft (mirrored in RTL) when
 *   horizontal, ArrowDown / ArrowUp when vertical, both pairs for `both`, Home / End; no wrapping
 *   unless `wrap()`. Text inputs keep their arrow keys.
 * - **`tabbable = false`** takes the whole widget out of the tab order (all `-1`), e.g. a floating
 *   toolbar that has scrolled off screen (Compose: `focusProperties { canFocus = false }`).
 *
 * Re-syncs on child, `disabled`, `hidden` and `inert` changes; call `update()` after rendering.
 */
export class RovingFocus {
  readonly root: HTMLElement;
  #options: RovingFocusOptions;
  #current: HTMLElement | null = null;
  #tabbable = true;
  #listeners = new AbortController();
  #mutations: MutationObserver;

  constructor(root: HTMLElement, options: RovingFocusOptions = {}) {
    this.root = root;
    this.#options = options;
    const { signal } = this.#listeners;
    root.addEventListener(
      'focusin',
      (e) => {
        const item = this.#itemFor(e.target);
        if (item) {
          this.#current = item;
          this.update();
        }
      },
      { signal },
    );
    root.addEventListener(
      'keydown',
      (e) => {
        this.#onKeyDown(e);
      },
      { signal },
    );
    this.#mutations = new MutationObserver(() => {
      this.update();
    });
    this.#mutations.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'hidden', 'inert'],
    });
    this.update();
  }

  /** False takes every item out of the tab order. */
  get tabbable(): boolean {
    return this.#tabbable;
  }

  set tabbable(value: boolean) {
    if (this.#tabbable === value) return;
    this.#tabbable = value;
    this.update();
  }

  /** The items in focus order. */
  items(): HTMLElement[] {
    if (this.#options.items) return this.#options.items();
    return [...this.root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) =>
        !(el as HTMLButtonElement).disabled &&
        !el.closest(EXCLUDED) &&
        (typeof el.checkVisibility !== 'function' ||
          el.checkVisibility({ visibilityProperty: true })),
    );
  }

  /** Re-syncs the tab stop. */
  update(): void {
    const items = this.items();
    const enabled = items.filter((el) => el.getAttribute('aria-disabled') !== 'true');
    let stop = this.#current && items.includes(this.#current) ? this.#current : null;
    stop ??= this.#options.initial?.(enabled) ?? enabled[0] ?? items[0] ?? null;
    if (!this.#tabbable) stop = null;
    for (const el of items) {
      const value = el === stop ? '0' : '-1';
      if (el.getAttribute('tabindex') !== value) el.setAttribute('tabindex', value);
    }
  }

  /**
   * Forgets the last focused item, so the tab stop returns to `initial(items)` (a tablist when
   * focus leaves it: APG puts the next entry on the selected tab).
   */
  reset(): void {
    this.#current = null;
    this.update();
  }

  destroy(): void {
    this.#listeners.abort();
    this.#mutations.disconnect();
  }

  #itemFor(target: EventTarget | null): HTMLElement | undefined {
    if (!(target instanceof Element)) return undefined;
    return this.items().find((el) => el === target || el.contains(target));
  }

  #onKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target instanceof Element && e.target.matches(TEXT_ENTRY)) return;
    const items = this.items();
    const index = items.findIndex((el) => el === e.target);
    if (index < 0) return;
    const orientation = this.#options.orientation?.() ?? 'horizontal';
    const rtl = getComputedStyle(this.root).direction === 'rtl';
    const wrap = this.#options.wrap?.() ?? false;
    const next = toolbarNavigationTarget(e.key, items.length, index, orientation, rtl, wrap);
    if (next === null) return;
    e.preventDefault();
    if (next !== index) items[next]?.focus();
  }
}
