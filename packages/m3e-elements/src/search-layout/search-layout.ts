import {
  SearchBarAnimation,
  type SearchBarSpecs,
  type SearchViewMetrics,
  type SearchViewVariant,
  type TweenSpec,
  parseCubicBezier,
  searchNavigationTarget,
  searchViewFrame,
} from '@kyralabs/m3e-motion';
import { attachRipple } from '../base/ripple.js';
import { lockScroll, trapTab, unlockScroll } from '../base/modal.js';
import { readSpringTokens } from '../base/scroll.js';

export type { SearchViewVariant };

export interface SearchLayoutOptions {
  /** Called when the target state changes (SearchBarState.targetValue). */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Enter without an active result (the IME's Search action). Return `false` to stay expanded;
   * otherwise the view collapses, as the Compose samples' `onSearch` does.
   */
  onSearch?: (query: string) => unknown;
  /** A result was activated (click, or Enter on the active one). Return `false` to stay expanded. */
  onSelect?: (option: HTMLElement) => unknown;
}

const P = '--_m3e-search-';
const VARIANTS: readonly SearchViewVariant[] = [
  'full-screen-contained',
  'docked-with-gap',
  'docked',
];

const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const num = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name)) || 0;
/** A resolved `calc(a / b)` ratio token (custom properties keep the expression). */
const ratio = (style: CSSStyleDeclaration, name: string) => {
  const raw = style.getPropertyValue(name).trim();
  const m = /^calc\(\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)$/.exec(raw);
  return m ? Number(m[1]) / Number(m[2]) : Number.parseFloat(raw) || 0;
};
const ms = (style: CSSStyleDeclaration, name: string) => {
  const raw = style.getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return raw.endsWith('ms') ? value : raw.endsWith('s') ? value * 1000 : value;
};

/**
 * Behavior of a `.m3e-search` (COMPONENT_SPEC §12), shared by `<m3e-search>` and m3e-react's
 * `<SearchBar>` so both layers write one DOM contract:
 *
 * - Expand / collapse (Compose SearchBarState): a click on the field, typing, ArrowDown or
 *   `expand()` expand it; Escape, the `.m3e-search__back` button, a light dismiss (docked: a
 *   pointer down outside, focus leaving; docked with gap: the scrim), a search or a selection
 *   collapse it. The view (`.m3e-search__view`) moves into the top layer (`popover="manual"`) and
 *   follows m3e-motion's SearchBarAnimation on the variant's springs and fades
 *   (search-defaults.css; spatial springs jump under reduced motion) and searchViewFrame's
 *   geometry, written as `--_m3e-search-*` px each frame. Root attributes: `data-expanded`
 *   (target), `data-open` (shown), `data-dropdown` (with gap: the results box is shown).
 * - Combobox (React Aria's / the APG list-autocomplete model, virtual focus): the input keeps DOM
 *   focus and gets `aria-expanded`, `aria-controls` (expanded) and `aria-activedescendant`;
 *   ArrowDown / ArrowUp move the active `[role="option"]` (`aria-selected`, `data-focus-visible`),
 *   Enter activates it or searches. Options get the press ripple.
 * - Full-screen views trap Tab inside the view and lock the document scroll while open; focus
 *   returns to the input when the view closes with focus inside it.
 */
export class SearchLayout {
  readonly root: HTMLElement;
  #options: SearchLayoutOptions;
  #animation = new SearchBarAnimation();
  #expanded = false;
  #open = false;
  #frame = 0;
  #abort = new AbortController();
  #openAbort: AbortController | null = null;
  #rippled = new WeakSet<Element>();
  #active: HTMLElement | null = null;
  #lastLength = 0;
  #locked = false;
  #written: string[] = [];

  constructor(root: HTMLElement, options: SearchLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    const { signal } = this.#abort;
    root.addEventListener('click', this.#onClick, { signal });
    root.addEventListener('mousedown', this.#onMouseDown, { signal });
    root.addEventListener('keydown', this.#onKeyDown, { signal });
    root.addEventListener('input', this.#onInput, { signal });
    root.addEventListener('focusout', this.#onFocusOut, { signal });
    this.update();
  }

  /** SearchBarState.targetValue. */
  get expanded(): boolean {
    return this.#expanded;
  }

  get variant(): SearchViewVariant {
    return VARIANTS.find((v) => this.root.classList.contains(`m3e-search--${v}`)) ?? 'full-screen';
  }

  get #view() {
    return this.root.querySelector<HTMLElement>(':scope > .m3e-search__view');
  }
  get #input() {
    return this.root.querySelector<HTMLInputElement>('.m3e-search__input');
  }
  get #results() {
    return this.root.querySelector<HTMLElement>('.m3e-search__results');
  }
  #optionsList(): HTMLElement[] {
    return [...(this.#results?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
  }

  /** Re-reads the DOM after a render: combobox attributes, option ripples, a stale active option. */
  update(): void {
    const input = this.#input;
    const results = this.#results;
    if (input) {
      input.setAttribute('aria-expanded', String(this.#expanded));
      if (this.#expanded && results?.id) input.setAttribute('aria-controls', results.id);
      else input.removeAttribute('aria-controls');
      this.#lastLength = input.value.length;
    }
    const back = this.root.querySelector<HTMLElement>('.m3e-search__back');
    for (const host of [...this.#optionsList(), ...(back ? [back] : [])]) {
      if (host.getAttribute('role') === 'option' && !host.hasAttribute('aria-selected')) {
        host.setAttribute('aria-selected', 'false');
      }
      if (!this.#rippled.has(host)) {
        this.#rippled.add(host);
        attachRipple(host, this.#abort.signal);
      }
    }
    if (this.#active && !this.#active.isConnected) this.#setActive(null);
    if (this.#open) this.#write();
  }

  /** animateToExpanded(). Focuses the input (the expanded view's FocusRequester). */
  expand(): void {
    const input = this.#input;
    if (this.#expanded || input?.disabled) return;
    this.#expanded = true;
    this.root.setAttribute('data-expanded', '');
    this.#show();
    this.#animation.expand(this.#specs(), performance.now());
    this.update();
    input?.focus({ preventScroll: true });
    this.#tick(performance.now());
    this.#options.onExpandedChange?.(true);
  }

  /** animateToCollapsed(). */
  collapse(): void {
    if (!this.#expanded) return;
    this.#expanded = false;
    this.root.removeAttribute('data-expanded');
    this.#setActive(null);
    this.#animation.collapse(this.#specs(), performance.now());
    this.update();
    const active = this.root.ownerDocument.activeElement;
    // A focused control that the collapsed bar does not render (the back button) hands focus to
    // the input; the full-screen views also leave the trap.
    if (active && this.#view?.contains(active) && active !== this.#input) {
      this.#input?.focus({ preventScroll: true });
    }
    this.#tick(performance.now());
    this.#options.onExpandedChange?.(false);
  }

  /** Jumps to a state without animating (initial render). */
  setExpanded(expanded: boolean, animate = true): void {
    if (animate) {
      if (expanded) this.expand();
      else this.collapse();
      return;
    }
    if (expanded === this.#expanded) return;
    this.#expanded = expanded;
    this.root.toggleAttribute('data-expanded', expanded);
    this.#animation.snapTo(expanded);
    if (expanded) this.#show();
    this.update();
    this.#tick(performance.now());
  }

  destroy(): void {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#hide();
    this.root.removeAttribute('data-expanded');
  }

  // --- Animation and geometry --------------------------------------------------------------

  #specs(): SearchBarSpecs {
    const style = getComputedStyle(this.root);
    const prefix =
      this.variant === 'full-screen-contained'
        ? '--m3e-comp-search-contained'
        : this.variant === 'docked-with-gap'
          ? '--m3e-comp-search-with-gap'
          : '--m3e-comp-search';
    const fades = this.variant === 'full-screen-contained' || this.variant === 'docked-with-gap';
    const tween = (dir: 'in' | 'out'): TweenSpec | null => {
      const easing = parseCubicBezier(
        style.getPropertyValue(`--m3e-comp-search-content-fade-${dir}-easing`),
      );
      const duration = ms(style, `--m3e-comp-search-content-fade-${dir}-duration`);
      if (!easing || duration <= 0) return null;
      const delay = dir === 'in' ? ms(style, '--m3e-comp-search-content-fade-in-delay') : 0;
      return { duration, delay, easing };
    };
    return {
      expand: readSpringTokens(style, `${prefix}-expand`),
      collapse: readSpringTokens(style, `${prefix}-collapse`),
      // rememberSearchBarState's content animatable snaps; contained / with-gap fade it.
      contentFadeIn: fades ? tween('in') : null,
      contentFadeOut: fades ? tween('out') : null,
    };
  }

  #metrics(style: CSSStyleDeclaration): SearchViewMetrics {
    return {
      verticalPadding: num(style, '--m3e-comp-search-vertical-padding'),
      containedTopPadding: num(style, '--m3e-comp-search-app-bar-vertical-padding'),
      containedHorizontalPadding: num(style, '--m3e-comp-search-contained-horizontal-padding'),
      cornerRadius: num(style, '--m3e-comp-search-collapsed-corner-radius'),
      dockedMinHeight: num(style, '--m3e-comp-search-docked-min-height'),
      dockedMaxHeightRatio: ratio(style, '--m3e-comp-search-docked-max-height-ratio'),
      withGapMaxHeightRatio: ratio(style, '--m3e-comp-search-docked-with-gap-max-height-ratio'),
      dropdownGap: num(style, '--m3e-comp-search-dropdown-gap'),
    };
  }

  #show(): void {
    if (this.#open) return;
    const view = this.#view;
    if (!view) return;
    this.#open = true;
    // Measured before anything moves: the collapsed bar's place stays reserved by the root.
    this.#write();
    this.root.setAttribute('data-open', '');
    if (typeof view.showPopover === 'function') {
      view.setAttribute('popover', 'manual');
      if (!view.matches(':popover-open')) view.showPopover();
    }
    if (this.variant.startsWith('full-screen')) {
      lockScroll(this.root.ownerDocument);
      this.#locked = true;
      view.setAttribute('role', 'dialog');
      view.setAttribute('aria-modal', 'true');
      const label = this.#input?.getAttribute('aria-label');
      if (label) view.setAttribute('aria-label', label);
    }
    this.#openAbort = new AbortController();
    const { signal } = this.#openAbort;
    const doc = this.root.ownerDocument;
    const win = doc.defaultView;
    const relayout = () => {
      if (this.#open) this.#write();
    };
    win?.addEventListener('resize', relayout, { signal, passive: true });
    win?.addEventListener('scroll', relayout, { signal, passive: true, capture: true });
    doc.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.#expanded) return;
        const target = e.composedPath()[0] as Node | undefined;
        if (!target) return;
        // Docked: anything outside the panel. With gap: the scrim (the view itself).
        if (this.variant === 'docked' && !view.contains(target)) this.collapse();
        if (this.variant === 'docked-with-gap' && target === view) this.collapse();
      },
      { signal, capture: true },
    );
  }

  #hide(): void {
    if (!this.#open) return;
    this.#open = false;
    this.#openAbort?.abort();
    this.#openAbort = null;
    const view = this.#view;
    const doc = this.root.ownerDocument;
    const hadFocus = view?.contains(doc.activeElement) ?? false;
    if (view) {
      if (typeof view.hidePopover === 'function' && view.matches(':popover-open')) {
        view.hidePopover();
      }
      view.removeAttribute('popover');
      view.removeAttribute('role');
      view.removeAttribute('aria-modal');
      view.removeAttribute('aria-label');
    }
    if (this.#locked) {
      unlockScroll(doc);
      this.#locked = false;
    }
    this.root.removeAttribute('data-open');
    this.root.removeAttribute('data-dropdown');
    for (const name of this.#written) this.root.style.removeProperty(name);
    this.#written = [];
    if (this.root.getAttribute('style') === '') this.root.removeAttribute('style');
    if (hadFocus && doc.activeElement !== this.#input) this.#input?.focus({ preventScroll: true });
  }

  #write(now = performance.now()): void {
    const style = getComputedStyle(this.root);
    const results = this.#results;
    const gap = this.variant === 'docked-with-gap';
    const sample = this.#animation.sample(now, gap ? (results?.offsetHeight ?? 0) : undefined);
    const box = this.root.getBoundingClientRect();
    const html = this.root.ownerDocument.documentElement;
    const frame = searchViewFrame({
      variant: this.variant,
      collapsed: { x: box.left, y: box.top, width: box.width, height: box.height },
      window: { width: html.clientWidth, height: html.clientHeight },
      insetTop: num(style, `${P}inset-top`),
      sample,
      metrics: this.#metrics(style),
    });
    const round = (v: number) => String(Math.round(v * 1e4) / 1e4);
    const { surface: s, field: f, results: r } = frame;
    const opacity =
      this.variant === 'docked'
        ? 1
        : this.variant === 'full-screen'
          ? sample.progress
          : sample.contentProgress;
    const values: Record<string, string> = {
      'surface-x': px(s.x),
      'surface-y': px(s.y),
      'surface-width': px(s.width),
      'surface-height': px(s.height),
      'surface-radius': px(s.radius),
      'surface-opacity': round(s.alpha),
      'surface-min-height': px(s.minHeight),
      'surface-max-height': px(s.maxHeight),
      'field-x': px(f.x),
      'field-y': px(f.y),
      'field-width': px(f.width),
      'results-x': px(r.x),
      'results-y': px(r.y),
      'results-width': px(r.width),
      'results-max-height': px(r.maxHeight),
      'results-opacity': round(opacity),
      slide: px(sample.slide),
    };
    this.#written = [];
    for (const [name, value] of Object.entries(values)) {
      this.#written.push(P + name);
      this.root.style.setProperty(P + name, value);
    }
    this.root.toggleAttribute('data-dropdown', gap && sample.dropdownShown);
  }

  #tick(now: number): void {
    if (!this.#open) return;
    this.#write(now);
    const running = this.#animation.isRunning;
    if (!running && !this.#expanded) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      this.#hide();
      return;
    }
    if (running && this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  // --- Combobox ------------------------------------------------------------------------------

  #setActive(option: HTMLElement | null): void {
    const previous = this.#active;
    if (previous) {
      previous.removeAttribute('data-focus-visible');
      previous.setAttribute('aria-selected', 'false');
    }
    this.#active = option;
    const input = this.#input;
    if (option) {
      option.setAttribute('data-focus-visible', '');
      option.setAttribute('aria-selected', 'true');
      if (option.id) input?.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    } else {
      input?.removeAttribute('aria-activedescendant');
    }
  }

  #select(option: HTMLElement): void {
    if (option.getAttribute('aria-disabled') === 'true') return;
    if (this.#options.onSelect?.(option) !== false) this.collapse();
  }

  #onClick = (e: MouseEvent): void => {
    const target = e.target as Element;
    if (target.closest('.m3e-search__back')) {
      this.collapse();
      return;
    }
    const option = target.closest<HTMLElement>('[role="option"]');
    if (option && this.#results?.contains(option)) {
      this.#select(option);
      return;
    }
    // A press on the input field (not on one of its buttons) expands it (Compose's
    // DetectClickFromInteractionSource); its trailing IconButtons consume their own clicks.
    if (target.closest('.m3e-search__field') && !target.closest('button, a, [role="button"]')) {
      this.expand();
    }
  };

  /** Keeps DOM focus in the input when a result is pressed (virtual focus). */
  #onMouseDown = (e: MouseEvent): void => {
    if ((e.target as Element).closest('[role="option"]')) e.preventDefault();
  };

  #onInput = (e: Event): void => {
    const input = this.#input;
    if (e.target !== input || !input) return;
    const grew = input.value.length > this.#lastLength;
    this.#lastLength = input.value.length;
    this.#setActive(null);
    if (grew && !this.#expanded) this.expand();
  };

  #onFocusOut = (e: FocusEvent): void => {
    if (!this.#expanded || this.variant !== 'docked') return;
    const next = e.relatedTarget as Node | null;
    if (next && !this.root.contains(next)) this.collapse();
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented || e.isComposing) return;
    const input = this.#input;
    if (e.key === 'Escape' && this.#expanded) {
      e.preventDefault();
      this.collapse();
      return;
    }
    if (e.key === 'Tab' && this.#open && this.variant.startsWith('full-screen')) {
      this.#trapTab(e);
      return;
    }
    if (e.target !== input || !input) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!this.#expanded) {
        // Compose: the down key expands (non-touch); ArrowUp is left to the caret.
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.expand();
        }
        return;
      }
      const options = this.#optionsList();
      const next = searchNavigationTarget(
        e.key,
        options.map((o) => o.getAttribute('aria-disabled') !== 'true'),
        this.#active ? options.indexOf(this.#active) : -1,
      );
      if (next === null) return;
      e.preventDefault();
      this.#setActive(options[next] ?? null);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.#active) {
        this.#select(this.#active);
        return;
      }
      if (this.#options.onSearch?.(input.value) !== false) this.collapse();
    }
  };

  #trapTab(e: KeyboardEvent): void {
    const view = this.#view;
    if (view) trapTab(e, view);
  }
}
