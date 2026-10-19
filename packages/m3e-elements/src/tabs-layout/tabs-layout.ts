import {
  type SpringSpec,
  TAB_INDICATOR_MIN_WIDTH,
  TabIndicatorAnimation,
  type TabPosition,
  type TabRowVariant,
  TabScrollAnimation,
  scrollableTabOffset,
  tabIndicatorShift,
  tabIndicatorTarget,
  tabPositions,
} from '@kyralabs/m3e-motion';
import { readSpringTokens } from '../base/scroll.js';
import { RovingFocus } from '../roving-focus/roving-focus.js';

const ROOT = 'm3e-tabs';
const SHIFT = '--_m3e-tabs-indicator-shift';
const WIDTH = '--_m3e-tabs-indicator-width';

const num = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name)) || 0;
const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const isSelected = (tab: Element) => tab.getAttribute('aria-selected') === 'true';
const BOUNDS_END = '--_m3e-badged-box-bounds-end';
const BOUNDS_TOP = '--_m3e-badged-box-bounds-top';
/** A tab's badged box: its label (or, label hidden, its icon) with a badge. */
const badgedBox = (tab: Element) =>
  tab.querySelector<HTMLElement>(':scope > .m3e-tab__content > .m3e-badged-box');

/**
 * Behavior of a `.m3e-tabs` row (COMPONENT_SPEC §17), shared by `<m3e-tabs>` and m3e-react's
 * `<Tabs>` so both layers write one DOM contract. The caller renders the tabs (`role="tab"`,
 * `aria-selected`) and calls `update()` after every render; selecting is the caller's job (a press,
 * Enter or Space on a tab: manual activation, as Compose and m3.material.io).
 *
 * - Focus (APG tabs, m3e-elements RovingFocus): one tab stop, on the selected tab whenever focus
 *   enters the tablist; ArrowLeft / ArrowRight (mirrored in RTL), Home / End move focus without
 *   wrapping (m3.material.io: do not loop a tab set); aria-disabled tabs stay reachable.
 * - Indicator (Compose TabIndicatorOffsetNode, m3e-motion TabIndicatorAnimation): when the
 *   selection moves, the offset and width springs (`--m3e-comp-tabs-indicator-*`, DefaultSpatial;
 *   they jump under reduced motion) run from their current values and velocities to the new tab,
 *   and each frame writes only `--_m3e-tabs-indicator-shift` / `--_m3e-tabs-indicator-width` with
 *   `data-animating` on the root (the selected tab draws the indicator; the shift moves it from
 *   its resting place). Tab and content widths come from a ResizeObserver, so no layout is read
 *   while it animates. At rest the variables are removed.
 * - Scrollable rows (ScrollableTabData): a selection scrolls the row so the selected tab is
 *   centred (clamped), on `--m3e-comp-tabs-scroll-*` from rest; the first layout jumps there. A
 *   wheel, touch or pointer press on the row stops that scroll.
 * - Badges (Tab's badgeBounds()): on each resize, a tab's `.m3e-badged-box` gets the distances
 *   to the tab's end and top edges, so badge.css keeps the badge inside the tab.
 */
export class TabsLayout {
  readonly root: HTMLElement;
  #focus: RovingFocus | null = null;
  #abort = new AbortController();
  #observer: ResizeObserver | null = null;
  #observed = new Set<Element>();
  #sizes = new WeakMap<Element, number>();
  #indicator: TabIndicatorAnimation | null = null;
  #scroll: TabScrollAnimation | null = null;
  #selected = -1;
  #frame = 0;
  /** The row's scroll position (logical, ≥ 0), kept from scroll events and our own writes. */
  #scrollPosition = 0;
  #scrolling = false;
  #scrolled = false;
  /** Style-derived values, read when a selection or a resize starts (never per frame). */
  #edge = 0;
  #minWidth = TAB_INDICATOR_MIN_WIDTH;
  #rtl = false;

  constructor(root: HTMLElement) {
    this.root = root;
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const size = entry.borderBoxSize[0];
          this.#sizes.set(entry.target, size ? size.inlineSize : entry.contentRect.width);
        }
        this.#resized();
      });
    }
    this.update();
  }

  /** The `role="tablist"` element. */
  get list(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${ROOT}__list`);
  }

  /** The tabs, in order. */
  get tabs(): HTMLElement[] {
    return [...(this.list?.querySelectorAll<HTMLElement>(':scope > .m3e-tab') ?? [])];
  }

  get variant(): TabRowVariant {
    return this.root.classList.contains(`${ROOT}--secondary`) ? 'secondary' : 'primary';
  }

  get scrollable(): boolean {
    return this.root.classList.contains(`${ROOT}--scrollable`);
  }

  /** Re-reads the DOM after a render: tabs added / removed, the selection moved. */
  update(): void {
    const list = this.list;
    if (!list) return;
    if (!this.#focus) {
      this.#focus = new RovingFocus(list, {
        items: () => this.tabs,
        initial: (items) => items.find(isSelected),
      });
      const { signal } = this.#abort;
      list.addEventListener(
        'focusout',
        (e) => {
          const next = e.relatedTarget;
          if (!(next instanceof Node) || !list.contains(next)) this.#focus?.reset();
        },
        { signal },
      );
      list.addEventListener(
        'scroll',
        () => {
          if (!this.#scrolling) this.#scrollPosition = Math.abs(list.scrollLeft);
        },
        { passive: true, signal },
      );
      for (const type of ['wheel', 'touchstart', 'pointerdown'] as const) {
        list.addEventListener(
          type,
          () => {
            this.#stopScroll();
          },
          { passive: true, signal },
        );
      }
    }
    this.#observe(list);
    this.#focus.update();
    const selected = this.tabs.findIndex(isSelected);
    if (selected !== this.#selected) this.#select(selected);
  }

  destroy(): void {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#focus?.destroy();
    this.#focus = null;
    this.#observer?.disconnect();
    this.#observed.clear();
    this.#rest();
  }

  #observe(list: HTMLElement): void {
    const observer = this.#observer;
    if (!observer) return;
    const targets = new Set<Element>([list]);
    for (const tab of this.tabs) {
      targets.add(tab);
      const content = tab.querySelector(':scope > .m3e-tab__content');
      if (content) targets.add(content);
      // A new badged box gets its first observation (and so its bounds) after the next layout.
      const box = badgedBox(tab);
      if (box) targets.add(box);
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

  /** Reads the spring specs and the values the geometry needs from the computed style. */
  #readStyle(): { indicator: SpringSpec | null; scroll: SpringSpec | null } {
    const style = getComputedStyle(this.root);
    this.#edge = this.scrollable ? num(style, '--m3e-comp-tabs-scrollable-edge-padding') : 0;
    this.#minWidth = num(style, '--m3e-comp-tabs-indicator-min-width') || TAB_INDICATOR_MIN_WIDTH;
    this.#rtl = style.direction === 'rtl';
    return {
      indicator: readSpringTokens(style, '--m3e-comp-tabs-indicator'),
      scroll: readSpringTokens(style, '--m3e-comp-tabs-scroll'),
    };
  }

  /** TabPositions from the observed sizes, or null until every tab has been measured. */
  #positions(): TabPosition[] | null {
    const measures = [];
    for (const tab of this.tabs) {
      const width = this.#sizes.get(tab);
      const content = tab.querySelector(':scope > .m3e-tab__content');
      const contentWidth = content ? this.#sizes.get(content) : 0;
      if (width === undefined || contentWidth === undefined) return null;
      measures.push({ width, contentWidth });
    }
    return tabPositions(measures, this.#edge, this.#minWidth);
  }

  #select(index: number): void {
    this.#selected = index;
    const specs = this.#readStyle();
    const positions = this.#positions();
    const position = positions?.[index];
    if (!positions || !position) {
      // Not measured yet (the first layout snaps once it is) or nothing selected.
      this.#indicator = null;
      this.#rest();
      return;
    }
    const target = tabIndicatorTarget(position, this.variant);
    const now = performance.now();
    if (this.#indicator) {
      this.#indicator.animateTo(target.offset, target.width, specs.indicator, now);
    } else {
      this.#indicator = new TabIndicatorAnimation(target.offset, target.width);
    }
    if (this.scrollable) {
      this.#scrollTo(positions, position, this.#scrolled ? specs.scroll : undefined, now);
    }
    this.#tick(now);
  }

  /**
   * Compose Tab's `Modifier.badgeBounds()` (Tab.kt L110): a badge stays inside its tab. Writes
   * the badged box's `--_m3e-badged-box-bounds-end` / `-top` (badge.css: how far the tab's end and
   * top edges lie beyond the box's). LeadingIconTab has no badgeBounds (L152-193), so a badge in
   * a leading-icon tab with an icon and a label is never moved.
   */
  #badgeBounds(): void {
    const leading = this.root.classList.contains(`${ROOT}--leading-icon`);
    for (const tab of this.tabs) {
      const box = badgedBox(tab);
      if (!box) continue;
      const leadingIconTab =
        leading &&
        box.querySelector(':scope > .m3e-tab__label') !== null &&
        tab.querySelector('.m3e-tab__icon') !== null;
      if (leadingIconTab) {
        box.style.removeProperty(BOUNDS_END);
        box.style.removeProperty(BOUNDS_TOP);
        if (box.getAttribute('style') === '') box.removeAttribute('style');
        continue;
      }
      const t = tab.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      const end = this.#rtl ? b.left - t.left : t.right - b.right;
      box.style.setProperty(BOUNDS_END, px(Math.max(0, end)));
      box.style.setProperty(BOUNDS_TOP, px(Math.max(0, b.top - t.top)));
    }
  }

  /** New sizes: the first layout settles everything; later ones retarget (Compose re-measures). */
  #resized(): void {
    const specs = this.#readStyle();
    this.#badgeBounds();
    const positions = this.#positions();
    const position = positions?.[this.#selected];
    if (!positions || !position) return;
    const target = tabIndicatorTarget(position, this.variant);
    const indicator = this.#indicator;
    if (!indicator) {
      this.#indicator = new TabIndicatorAnimation(target.offset, target.width);
    } else if (indicator.running) {
      indicator.animateTo(target.offset, target.width, specs.indicator, performance.now());
    } else {
      indicator.snapTo(target.offset, target.width);
    }
    if (this.scrollable && !this.#scrolled) {
      this.#scrollTo(positions, position, undefined, performance.now());
    }
    if (this.#frame === 0 && this.#indicator?.running) this.#tick(performance.now());
  }

  /**
   * Scrolls the row to centre `position`: on `spec` from rest, or (undefined: the first layout)
   * at once. A null spec (reduced motion) jumps too.
   */
  #scrollTo(
    positions: readonly TabPosition[],
    position: TabPosition,
    spec: SpringSpec | null | undefined,
    now: number,
  ): void {
    const list = this.list;
    const visible = list ? this.#sizes.get(list) : undefined;
    if (!list || visible === undefined) return;
    const last = positions[positions.length - 1];
    const scrollWidth = last ? last.left + last.width + this.#edge : 0;
    const target = scrollableTabOffset(position, scrollWidth, visible);
    this.#scrolled = true;
    if (spec === undefined || spec === null) {
      this.#scroll = null;
      this.#scrolling = false;
      if (Math.abs(target - this.#scrollPosition) >= 0.5) this.#writeScroll(target);
      return;
    }
    this.#scroll ??= new TabScrollAnimation(this.#scrollPosition);
    this.#scroll.animateTo(this.#scrollPosition, target, spec, now);
    this.#scrolling = this.#scroll.value.isRunning;
  }

  #writeScroll(position: number): void {
    const list = this.list;
    if (!list) return;
    this.#scrollPosition = position;
    list.scrollLeft = this.#rtl ? -position : position;
  }

  #stopScroll(): void {
    if (!this.#scroll?.value.isRunning) return;
    this.#scroll.value.snapTo(this.#scroll.value.value);
    this.#scrolling = false;
  }

  #tick(now: number): void {
    const indicator = this.#indicator;
    const scroll = this.#scroll;
    const sample = indicator?.sample(now);
    const scrolling = scroll ? scroll.value.isRunning : false;
    if (scroll && this.#scrolling) {
      this.#writeScroll(scroll.value.sample(now));
      if (!scroll.value.isRunning) this.#scrolling = false;
    }
    if (sample?.running) this.#write(sample.offset, sample.width);
    else this.#rest();
    if (!sample?.running && !scrolling) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      return;
    }
    if (this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  #write(offset: number, width: number): void {
    const position = this.#positions()?.[this.#selected];
    if (!position) return;
    const shift = tabIndicatorShift({ offset }, position);
    this.root.toggleAttribute('data-animating', true);
    this.root.style.setProperty(SHIFT, px(this.#rtl ? -shift : shift));
    this.root.style.setProperty(WIDTH, px(width));
  }

  /** At rest: the selected tab draws the indicator from the CSS alone. */
  #rest(): void {
    const root = this.root;
    root.removeAttribute('data-animating');
    root.style.removeProperty(SHIFT);
    root.style.removeProperty(WIDTH);
    if (root.getAttribute('style') === '') root.removeAttribute('style');
  }
}
