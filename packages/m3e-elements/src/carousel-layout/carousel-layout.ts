import {
  type CarouselLayoutName,
  SpringAnimatable,
  type Strategy,
  calculateMaxScrollOffset,
  carouselCurrentItem,
  carouselItemLayout,
  carouselItemScrollOffset,
  carouselStrategy,
  toolbarNavigationTarget,
} from '@kyralabs/m3e-motion';
import { readSpringTokens } from '../base/scroll.js';

const ROOT = 'm3e-carousel';
const P = '--m3e-comp-carousel';

/** The `.m3e-carousel--<layout>` modifiers; `full-screen` is CSS only (no keylines). */
export type CarouselLayoutType = CarouselLayoutName | 'full-screen';

const LAYOUTS: readonly CarouselLayoutType[] = [
  'multi-browse',
  'uncontained',
  'hero',
  'centered-hero',
  'full-screen',
];

const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const num = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name));

/** Sets (or, for null, removes) a style property, touching the DOM only when it changes. */
const setVar = (el: HTMLElement, name: string, value: string | null): void => {
  if (value === null) el.style.removeProperty(name);
  else if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
};

const ITEM_VARS = [
  '--_m3e-carousel-snap',
  '--_m3e-carousel-inset',
  '--_m3e-carousel-translate',
  '--_m3e-carousel-z',
] as const;

/**
 * Behavior of a `.m3e-carousel` (COMPONENT_SPEC §36), shared by `<m3e-carousel>` and m3e-react's
 * `<Carousel>` so both layers write one DOM contract. The caller renders the items and calls
 * `update()` after every render (and after changing the carousel's custom properties).
 *
 * - Keylines (m3e-motion carousel.ts, Compose's Strategy): the layout's keyline list for the
 *   container width, the item width (`--m3e-comp-carousel-item-width`: multi-browse and hero
 *   `preferredItemWidth`, uncontained `itemWidth`; hero without it fills the container), the
 *   spacing, padding and small item bounds (`--m3e-comp-carousel-*`). Items are laid out end to
 *   end at the focal size (`--_m3e-carousel-item-size`), each snapping to its keyline
 *   (`--_m3e-carousel-snap`, KeylineSnapPosition); on every scroll frame each item's mask inset,
 *   translation and z-index follow Modifier.carouselItem (`[data-keylines]`). Invalid (no item
 *   width, a zero-width container) or full-screen: the CSS layout alone.
 * - Reduced motion (owner decision M9 #24): the focal size for every item, no masks.
 * - Keys (owner decision M9 #26): every item keeps its tab stop (the item, or its link /
 *   button); ArrowLeft / ArrowRight (mirrored in RTL; ArrowUp / ArrowDown for full screen), Home
 *   and End move between them without wrapping. A focused item scrolls to its snap position on
 *   CarouselState.animateScrollToItem's spring (`--m3e-comp-carousel-scroll-*`, snapping off
 *   meanwhile, `[data-scrolling]`; it jumps under reduced motion); a wheel, touch or press stops it.
 *   Flings are the browser's (owner decision M9 #23).
 */
export class CarouselLayout {
  readonly root: HTMLElement;
  #abort = new AbortController();
  #resize: ResizeObserver | null = null;
  #mutations: MutationObserver | null = null;
  #reduced: MediaQueryList | null = null;
  #width = 0;
  #strategy: Strategy | null = null;
  #keylines = false;
  #max = 0;
  #rests: number[] = [];
  #frame = 0;
  #rtl = false;
  #scroll: SpringAnimatable | null = null;
  #scrollFrame = 0;
  #viewport: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    if (typeof ResizeObserver !== 'undefined') {
      this.#resize = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const size = entry.contentBoxSize[0];
          this.#width = size ? size.inlineSize : entry.contentRect.width;
        }
        this.#compute();
      });
      this.#resize.observe(root);
    }
    if (typeof matchMedia === 'function') {
      this.#reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.#reduced.addEventListener(
        'change',
        () => {
          this.#compute();
        },
        { signal: this.#abort.signal },
      );
    }
    this.update();
  }

  /** The `.m3e-carousel__viewport` (the scroll container). */
  get viewport(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${ROOT}__viewport`);
  }

  /** The `.m3e-carousel__item`s, in order. */
  get items(): HTMLElement[] {
    return [...(this.viewport?.querySelectorAll<HTMLElement>(`:scope > .${ROOT}__item`) ?? [])];
  }

  /** The layout modifier on the root (default multi-browse). */
  get layout(): CarouselLayoutType {
    return LAYOUTS.find((l) => this.root.classList.contains(`${ROOT}--${l}`)) ?? 'multi-browse';
  }

  /** The item the carousel rests on (Compose's current page): the nearest to its snap position. */
  get currentItem(): number {
    const items = this.items;
    if (this.#keylines && this.#strategy) {
      return carouselCurrentItem(this.#strategy, items.length, this.#position());
    }
    let best = 0;
    let bestDistance = Infinity;
    items.forEach((_, i) => {
      const d = Math.abs(this.#target(i) - this.#position());
      if (d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    });
    return best;
  }

  /** Re-reads the DOM and the custom properties after a render. */
  update(): void {
    const viewport = this.viewport;
    if (viewport !== this.#viewport) {
      this.#viewport = viewport;
      this.#mutations?.disconnect();
      if (viewport) this.#listen(viewport);
    }
    if (this.#width === 0) this.#width = this.root.clientWidth;
    this.#compute();
  }

  /**
   * Scrolls item `index` to its snap position (CarouselState.animateScrollToItem): on the
   * carousel's scroll spring, or at once with `animate` false.
   */
  scrollToItem(index: number, animate = true): void {
    const viewport = this.viewport;
    const count = this.items.length;
    if (!viewport || count === 0) return;
    const target = this.#target(Math.min(Math.max(index, 0), count - 1));
    const spec = animate ? readSpringTokens(getComputedStyle(this.root), `${P}-scroll`) : null;
    this.#stopScroll();
    if (!spec) {
      this.#setPosition(target);
      return;
    }
    const scroll = (this.#scroll ??= new SpringAnimatable(this.#position(), 1));
    scroll.snapTo(this.#position());
    scroll.animateTo(target, spec, performance.now(), 0);
    this.root.setAttribute('data-scrolling', '');
    const step = (now: number) => {
      const value = scroll.sample(now);
      this.#setPosition(value);
      if (scroll.isRunning) this.#scrollFrame = requestAnimationFrame(step);
      else this.#stopScroll();
    };
    this.#scrollFrame = requestAnimationFrame(step);
  }

  destroy(): void {
    this.#abort.abort();
    this.#resize?.disconnect();
    this.#mutations?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#stopScroll();
    this.#clear();
  }

  #listen(viewport: HTMLElement): void {
    const { signal } = this.#abort;
    viewport.addEventListener(
      'scroll',
      () => {
        if (this.#keylines && this.#frame === 0) {
          this.#frame = requestAnimationFrame(() => {
            this.#frame = 0;
            this.#place();
          });
        }
      },
      { passive: true, signal },
    );
    for (const type of ['wheel', 'touchstart', 'pointerdown'] as const) {
      viewport.addEventListener(
        type,
        () => {
          this.#stopScroll();
        },
        { passive: true, signal },
      );
    }
    viewport.addEventListener(
      'keydown',
      (e) => {
        this.#onKeyDown(e);
      },
      { signal },
    );
    viewport.addEventListener(
      'focusin',
      (e) => {
        const index = this.#itemIndexOf(e.target, false);
        if (index >= 0) this.scrollToItem(index);
      },
      { signal },
    );
    if (typeof MutationObserver !== 'undefined') {
      this.#mutations = new MutationObserver(() => {
        this.#compute();
      });
      this.#mutations.observe(viewport, { childList: true });
    }
  }

  /** The vertical full-screen layout scrolls along y; the others along x. */
  get #vertical(): boolean {
    return this.layout === 'full-screen';
  }

  /** The scroll position along the main axis, logical (≥ 0 in RTL too). */
  #position(): number {
    const viewport = this.viewport;
    if (!viewport) return 0;
    return this.#vertical ? viewport.scrollTop : Math.abs(viewport.scrollLeft);
  }

  #setPosition(value: number): void {
    const viewport = this.viewport;
    if (!viewport) return;
    if (this.#vertical) viewport.scrollTop = value;
    else viewport.scrollLeft = this.#rtl ? -value : value;
  }

  /** The scroll position at which item `index` rests. */
  #target(index: number): number {
    const viewport = this.viewport;
    const item = this.items[index];
    if (!viewport || !item) return 0;
    if (this.#keylines) return this.#rests[index] ?? 0;
    // The CSS layout: the item's start at the scroll padding (its snap position).
    const style = getComputedStyle(viewport);
    const v = viewport.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    let delta: number;
    if (this.#vertical) delta = r.top - v.top - num(style, 'scroll-padding-top');
    else if (this.#rtl) delta = v.right - r.right - num(style, 'scroll-padding-right');
    else delta = r.left - v.left - num(style, 'scroll-padding-left');
    const range = this.#vertical
      ? viewport.scrollHeight - viewport.clientHeight
      : viewport.scrollWidth - viewport.clientWidth;
    return Math.min(Math.max(this.#position() + (delta || 0), 0), Math.max(range, 0));
  }

  #stopScroll(): void {
    cancelAnimationFrame(this.#scrollFrame);
    this.#scrollFrame = 0;
    this.root.removeAttribute('data-scrolling');
  }

  /** The strategy for the current width and custom properties, or null for the CSS layout. */
  #compute(): void {
    const items = this.items;
    const style = getComputedStyle(this.root);
    this.#rtl = style.direction === 'rtl';
    const layout = this.layout;
    let strategy: Strategy | null = null;
    if (layout !== 'full-screen' && this.#width > 0 && items.length > 0) {
      const itemSize = num(style, `${P}-item-width`);
      try {
        strategy = carouselStrategy({
          layout,
          availableSpace: this.#width,
          itemSize: Number.isFinite(itemSize) ? itemSize : null,
          itemSpacing: num(style, `${P}-item-spacing`) || 0,
          itemCount: items.length,
          minSmallItemSize: num(style, `${P}-min-small-item-width`) || undefined,
          maxSmallItemSize: num(style, `${P}-max-small-item-width`) || undefined,
          beforeContentPadding: num(style, `${P}-content-padding-start`) || 0,
          afterContentPadding: num(style, `${P}-content-padding-end`) || 0,
        });
      } catch {
        // An empty small item range (min > max) throws upstream too: the CSS layout.
        strategy = null;
      }
      if (strategy && !strategy.isValid) strategy = null;
    }
    this.#strategy = strategy;
    if (!strategy) {
      this.#clear();
      return;
    }
    setVar(this.root, '--_m3e-carousel-item-size', px(strategy.itemMainAxisSize));
    this.#keylines = !(this.#reduced?.matches ?? false);
    if (!this.#keylines) {
      this.root.removeAttribute('data-keylines');
      for (const item of items) for (const name of ITEM_VARS) setVar(item, name, null);
      return;
    }
    this.root.setAttribute('data-keylines', '');
    this.#max = calculateMaxScrollOffset(strategy, items.length);
    this.#rests = items.map((_, i) =>
      Math.min(Math.max(carouselItemScrollOffset(strategy, i, items.length), 0), this.#max),
    );
    items.forEach((item, i) => {
      // The rest position as a scroll margin: start − margin = rest.
      setVar(
        item,
        '--_m3e-carousel-snap',
        px(i * (strategy.itemMainAxisSize + strategy.itemSpacing) - (this.#rests[i] ?? 0)),
      );
    });
    this.#place();
  }

  /** Modifier.carouselItem for every item at the current scroll offset. */
  #place(): void {
    const strategy = this.#strategy;
    if (!strategy || !this.#keylines) return;
    const items = this.items;
    const offset = Math.min(this.#position(), this.#max);
    const current = carouselCurrentItem(strategy, items.length, offset);
    const dir = this.#rtl ? -1 : 1;
    items.forEach((item, i) => {
      const placed = carouselItemLayout(strategy, i, offset, this.#max);
      setVar(item, '--_m3e-carousel-inset', placed.clipped ? px(placed.maskStart) : null);
      setVar(item, '--_m3e-carousel-translate', px(dir * placed.translation));
      setVar(item, '--_m3e-carousel-z', String(items.length - Math.abs(i - current)));
    });
  }

  #clear(): void {
    this.#keylines = false;
    this.root.removeAttribute('data-keylines');
    setVar(this.root, '--_m3e-carousel-item-size', null);
    for (const item of this.items) for (const name of ITEM_VARS) setVar(item, name, null);
  }

  /**
   * The index of the item `target` belongs to; with `tabStop`, only when `target` is the item's
   * own tab stop (the item, or its link / button), not a control inside it.
   */
  #itemIndexOf(target: EventTarget | null, tabStop: boolean): number {
    if (!(target instanceof Element)) return -1;
    return this.items.findIndex((item) =>
      tabStop ? target === this.#tabStop(item) : item.contains(target),
    );
  }

  #tabStop(item: HTMLElement): HTMLElement | null {
    return item.hasAttribute('tabindex')
      ? item
      : item.querySelector<HTMLElement>(`:scope > .${ROOT}__action`);
  }

  #onKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const index = this.#itemIndexOf(e.target, true);
    if (index < 0) return;
    const items = this.items;
    const next = toolbarNavigationTarget(
      e.key,
      items.length,
      index,
      this.#vertical ? 'vertical' : 'horizontal',
      this.#rtl,
      false,
    );
    if (next === null) return;
    e.preventDefault();
    if (next === index) return;
    const item = items[next];
    const stop = item ? this.#tabStop(item) : null;
    stop?.focus({ preventScroll: true });
  }
}
