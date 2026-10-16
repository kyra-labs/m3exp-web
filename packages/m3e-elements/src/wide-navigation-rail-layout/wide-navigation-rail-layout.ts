import {
  WideNavigationRailAnimation,
  type WideNavigationRailMetrics,
  type WideNavigationRailSpecs,
  wideNavigationRailWidth,
} from '@kyralabs/m3e-motion';
import { lockScroll, tabStops, trapTab, unlockScroll } from '../base/modal.js';
import { readSpringTokens } from '../base/scroll.js';

export interface WideNavigationRailLayoutOptions {
  /** The initial target state (rendered without animating). */
  expanded?: boolean;
  /**
   * Modal only: the rail asks to collapse (Escape, a press on the scrim). Without it the rail
   * collapses itself; with it the caller decides (controlled), e.g. by calling `setExpanded`.
   */
  onExpandedChange?: (expanded: boolean) => void;
  /** Modal only: the window's accessible name (Compose `Strings.WideNavigationRailPaneTitle`). */
  dialogLabel?: string;
}

const RAIL = 'm3e-wide-navigation-rail';
const MODAL = 'm3e-modal-wide-navigation-rail';
const VARS = ['--_m3e-wnr-progress', '--_m3e-wnr-layout', '--_m3e-wnr-inline-size'] as const;
const ROOT_VARS = ['--_m3e-wnr-scrim', '--_m3e-wnr-slide'] as const;
/** Compose m3c_wide_navigation_rail_pane_title (androidMain res/values/strings.xml L142). */
const PANE_TITLE = 'Navigation rail';

const num = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name)) || 0;
const round = (v: number) => String(Math.round(v * 1e4) / 1e4);
const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const canPopover = (el: HTMLElement) => typeof el.showPopover === 'function';

/**
 * Behavior of a `.m3e-wide-navigation-rail` (COMPONENT_SPEC §14), shared by
 * `<m3e-wide-navigation-rail>` / `<m3e-modal-wide-navigation-rail>` and m3e-react's
 * `<WideNavigationRail>` / `<ModalWideNavigationRail>` so both layers write one DOM contract.
 * `root` is the `<nav>` (WideNavigationRail) or the `.m3e-modal-wide-navigation-rail` around it.
 *
 * - Expand / collapse (WideNavigationRailState): the caller renders the target state
 *   (`m3e-wide-navigation-rail--expanded`) and calls `setExpanded`; m3e-motion's
 *   WideNavigationRailAnimation runs Compose's springs (wide-navigation-rail.css lists them;
 *   spatial springs jump under reduced motion) and each frame writes `--_m3e-wnr-progress`,
 *   `--_m3e-wnr-layout` and `--_m3e-wnr-inline-size` (wideNavigationRailWidth) with
 *   `data-animating`, and nothing else. Sizes come from a ResizeObserver, so no layout is read
 *   while it animates and the browser lays the rail out once per frame. A new target starts from
 *   the current values and velocities.
 * - Modal (ModalWideNavigationRail): while positionProgress > 0 the root gets `data-open`,
 *   `role="dialog"`, `aria-modal` and a label, and the rail and the `__scrim` move into the top
 *   layer (`popover="manual"`; fixed positioning where the Popover API is missing) while the root
 *   keeps the collapsed rail's place; the document scroll locks, focus moves into the rail (its
 *   current item, else its first stop) and Tab stays there; Escape or a press on the scrim ask to
 *   collapse (`onExpandedChange(false)`), and collapsing returns focus to the element that had it
 *   when the rail expanded. `--hide-on-collapse` slides an expanded rail in instead.
 */
export class WideNavigationRailLayout {
  readonly root: HTMLElement;
  readonly modal: boolean;
  readonly hideOnCollapse: boolean;
  #options: WideNavigationRailLayoutOptions;
  #animation: WideNavigationRailAnimation;
  #abort = new AbortController();
  #openAbort: AbortController | null = null;
  #frame = 0;
  #observer: ResizeObserver | null = null;
  #sizes = new WeakMap<Element, number>();
  #observed = new Set<Element>();
  #metrics: WideNavigationRailMetrics | null = null;
  /** The last width written, or the resting width the observer saw. */
  #width = 0;
  /** WideNavigationRailLayout's actualMaxExpandedWidth > 0. */
  #wide = false;
  #animating = false;
  #open = false;
  #locked = false;
  #opener: HTMLElement | null = null;

  constructor(root: HTMLElement, options: WideNavigationRailLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.modal = root.classList.contains(MODAL);
    this.hideOnCollapse = this.modal && root.classList.contains(`${MODAL}--hide-on-collapse`);
    const expanded =
      options.expanded ?? this.rail?.classList.contains(`${RAIL}--expanded`) ?? false;
    this.#animation = new WideNavigationRailAnimation({
      expanded,
      modal: this.modal,
      hideOnCollapse: this.hideOnCollapse,
    });
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const size = entry.borderBoxSize[0];
          const value = size ? size.inlineSize : entry.contentRect.width;
          this.#sizes.set(entry.target, value);
          if (entry.target === this.rail && !this.#animating) this.#width = value;
          if (entry.target === this.root && this.modal) {
            this.#sizes.set(entry.target, size ? size.blockSize : entry.contentRect.height);
          }
        }
      });
    }
    this.update();
    if (this.modal && expanded) this.#show();
  }

  /** WideNavigationRailState.targetValue. */
  get expanded(): boolean {
    return this.#animation.expanded;
  }

  /** The `<nav>`. */
  get rail(): HTMLElement | null {
    return this.root.classList.contains(RAIL)
      ? this.root
      : this.root.querySelector<HTMLElement>(`:scope > .${RAIL}`);
  }

  get #scrim(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${MODAL}__scrim`);
  }

  get #items(): HTMLElement[] {
    return [...(this.rail?.querySelectorAll<HTMLElement>(':scope > .m3e-navigation-item') ?? [])];
  }

  /** Re-reads the DOM after a render (items or header added / removed). */
  update(): void {
    const observer = this.#observer;
    const rail = this.rail;
    if (!observer || !rail) return;
    const targets = new Set<Element>([rail]);
    if (this.modal) targets.add(this.root);
    const header = rail.querySelector(`:scope > .${RAIL}__header`);
    if (header) targets.add(header);
    for (const item of this.#items) {
      const content = item.querySelector('.m3e-navigation-item__content');
      if (content) targets.add(content);
    }
    for (const el of this.#observed) {
      if (!targets.has(el)) {
        observer.unobserve(el);
        this.#observed.delete(el);
      }
    }
    for (const el of targets) {
      if (!this.#observed.has(el)) {
        observer.observe(el);
        this.#observed.add(el);
      }
    }
  }

  /** Animates (or jumps, `animate = false`) to `expanded`. */
  setExpanded(expanded: boolean, animate = true): void {
    if (expanded === this.#animation.expanded) return;
    const doc = this.root.ownerDocument;
    if (expanded && this.modal) {
      const active = doc.activeElement;
      this.#opener = active instanceof HTMLElement && active !== doc.body ? active : null;
    }
    if (!animate) {
      this.#animation.snapTo(expanded);
      if (this.modal) {
        if (expanded) this.#show();
        else this.#hide();
      }
      this.#rest();
      return;
    }
    if (!expanded && this.#open) this.#returnFocus();
    this.#animation.setExpanded(expanded, this.#specs(), performance.now());
    this.#tick(performance.now());
  }

  /** Asks to collapse (Escape, the scrim): the caller decides, or the rail collapses itself. */
  requestCollapse(): void {
    if (!this.#animation.expanded) return;
    if (this.#options.onExpandedChange) this.#options.onExpandedChange(false);
    else this.setExpanded(false);
  }

  destroy(): void {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#observer?.disconnect();
    this.#observed.clear();
    this.#hide();
    this.#rest();
  }

  // --- Animation ------------------------------------------------------------------------------

  #specs(): WideNavigationRailSpecs {
    const style = getComputedStyle(this.rail ?? this.root);
    const spring = (name: string) => readSpringTokens(style, `--m3e-comp-${name}`);
    this.#metrics = {
      collapsedWidth: num(style, '--m3e-comp-navigation-rail-collapsed-container-width'),
      expandedMinWidth: num(style, '--m3e-comp-navigation-rail-expanded-container-width-minimum'),
      expandedMaxWidth: num(style, '--m3e-comp-navigation-rail-expanded-container-width-maximum'),
      itemHorizontalPadding: num(style, '--m3e-comp-wide-navigation-rail-item-horizontal-padding'),
      iconSize: num(style, '--m3e-comp-navigation-rail-baseline-item-icon-size'),
      iconLabelSpace: num(style, '--m3e-comp-navigation-rail-horizontal-item-icon-label-space'),
      collapsedIndicatorPadding:
        (num(style, '--m3e-comp-navigation-rail-vertical-item-active-indicator-width') -
          num(style, '--m3e-comp-navigation-rail-baseline-item-icon-size')) /
        2,
      expandedIndicatorPadding: num(
        style,
        '--m3e-comp-navigation-rail-horizontal-item-full-width-leading-space',
      ),
    };
    return {
      width: spring('wide-navigation-rail-width'),
      modalWidth: spring('wide-navigation-rail-modal-width'),
      iconPosition: spring('wide-navigation-rail-icon-position'),
      position: spring('modal-wide-navigation-rail-position'),
      scrim: spring('modal-wide-navigation-rail-scrim'),
      slide: spring('modal-wide-navigation-rail-slide'),
    };
  }

  #tick(now: number): void {
    const s = this.#animation.sample(now);
    if (this.modal) {
      if (s.open && !this.#open) {
        this.#wide = false;
        this.#show();
      } else if (!s.open && this.#open) {
        this.#hide();
      }
    }
    if (!s.running) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      this.#rest();
      return;
    }
    this.#write(s.item, s.layout, s.width, s.railExpanded, s.scrim, s.slide);
    if (this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  #write(
    item: number,
    layout: number,
    widthProgress: number,
    railExpanded: boolean,
    scrim: number,
    slide: number,
  ): void {
    const rail = this.rail;
    const metrics = this.#metrics;
    if (this.modal) {
      this.root.style.setProperty('--_m3e-wnr-scrim', round(scrim));
      this.root.style.setProperty('--_m3e-wnr-slide', round(slide));
    }
    // hideOnCollapse: the rail stays expanded; only the slide and the scrim move.
    if (!rail || !metrics || this.hideOnCollapse) return;
    const header = rail.querySelector(`:scope > .${RAIL}__header`);
    const items = this.#items.map((el) => {
      if (!el.querySelector('.m3e-navigation-item__label')) return null;
      const content = el.querySelector('.m3e-navigation-item__content');
      return content ? (this.#sizes.get(content) ?? null) : null;
    });
    const { width, wide } = wideNavigationRailWidth({
      expanded: railExpanded,
      widthProgress,
      itemProgress: item,
      items,
      header: header ? (this.#sizes.get(header) ?? 0) : 0,
      previousWidth: this.#width || metrics.collapsedWidth,
      wide: this.#wide || (!railExpanded && this.#width > metrics.expandedMinWidth),
      metrics,
    });
    this.#wide = wide;
    this.#width = width;
    this.#animating = true;
    rail.toggleAttribute('data-animating', true);
    rail.style.setProperty('--_m3e-wnr-progress', round(item));
    rail.style.setProperty('--_m3e-wnr-layout', round(layout));
    rail.style.setProperty('--_m3e-wnr-inline-size', px(width));
  }

  /** At rest: the classes alone describe the rail. */
  #rest(): void {
    this.#animating = false;
    const rail = this.rail;
    if (rail) {
      rail.removeAttribute('data-animating');
      for (const name of VARS) rail.style.removeProperty(name);
      if (rail.getAttribute('style') === '') rail.removeAttribute('style');
    }
    if (this.modal) {
      for (const name of ROOT_VARS) this.root.style.removeProperty(name);
      if (this.root.getAttribute('style') === '') this.root.removeAttribute('style');
    }
  }

  // --- Modal window -----------------------------------------------------------------------------

  #show(): void {
    const rail = this.rail;
    if (this.#open || !rail) return;
    this.#open = true;
    const root = this.root;
    const doc = root.ownerDocument;
    // The root keeps the collapsed rail's height while the rail is in the top layer.
    const height = this.#sizes.get(root);
    if (height && !this.hideOnCollapse) root.style.minBlockSize = px(height);
    root.setAttribute('data-open', '');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', this.#options.dialogLabel ?? PANE_TITLE);
    for (const el of [this.#scrim, rail]) {
      if (el && canPopover(el)) {
        el.setAttribute('popover', 'manual');
        if (!el.matches(':popover-open')) el.showPopover();
      }
    }
    lockScroll(doc);
    this.#locked = true;
    this.#openAbort = new AbortController();
    const { signal } = this.#openAbort;
    root.addEventListener(
      'keydown',
      (e) => {
        if (e.defaultPrevented || !this.#animation.expanded) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          this.requestCollapse();
        } else if (e.key === 'Tab') {
          trapTab(e, rail);
        }
      },
      { signal },
    );
    this.#scrim?.addEventListener(
      'click',
      () => {
        this.requestCollapse();
      },
      { signal },
    );
    const active = doc.activeElement;
    if (!active || !rail.contains(active)) {
      const target =
        rail.querySelector<HTMLElement>(':scope > .m3e-navigation-item[aria-current]') ??
        tabStops(rail)[0];
      target?.focus({ preventScroll: true });
    }
  }

  #hide(): void {
    if (!this.#open) return;
    this.#open = false;
    this.#openAbort?.abort();
    this.#openAbort = null;
    const root = this.root;
    for (const el of [this.rail, this.#scrim]) {
      if (!el) continue;
      if (typeof el.hidePopover === 'function' && el.matches(':popover-open')) el.hidePopover();
      el.removeAttribute('popover');
    }
    root.removeAttribute('data-open');
    root.removeAttribute('role');
    root.removeAttribute('aria-modal');
    root.removeAttribute('aria-label');
    root.style.removeProperty('min-block-size');
    if (root.getAttribute('style') === '') root.removeAttribute('style');
    if (this.#locked) {
      unlockScroll(root.ownerDocument);
      this.#locked = false;
    }
    this.#returnFocus();
  }

  /** Focus inside the window (or lost to the body) goes back to the opener. */
  #returnFocus(): void {
    const doc = this.root.ownerDocument;
    const active = doc.activeElement;
    const opener = this.#opener;
    if (!opener?.isConnected || opener === active) return;
    if (active && active !== doc.body && !this.root.contains(active)) return;
    opener.focus({ preventScroll: true });
  }
}
