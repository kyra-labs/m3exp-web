import { M3eElement } from '../base/M3eElement.js';
import { attachRipple } from '../base/ripple.js';
import type { CarouselLayout, CarouselLayoutType } from '../carousel-layout/carousel-layout.js';
import { carouselItemLabel } from '../carousel-layout/strings.js';

const ROOT = 'm3e-carousel';
const LAYOUTS: readonly CarouselLayoutType[] = [
  'multi-browse',
  'uncontained',
  'hero',
  'centered-hero',
  'full-screen',
];

/** The layout a `layout` value names (default multi-browse). */
export function carouselLayoutType(value: string | null | undefined): CarouselLayoutType {
  return LAYOUTS.find((l) => l === value) ?? 'multi-browse';
}

/** The root's custom properties for the item width, spacing and padding (px; unset: the tokens). */
export function carouselStyle(
  itemWidth: number | null | undefined,
  itemSpacing: number | null | undefined,
  contentPadding: number | null | undefined,
): Record<string, string> {
  const style: Record<string, string> = {};
  const px = (v: number) => `${String(v)}px`;
  if (itemWidth != null && Number.isFinite(itemWidth)) {
    style['--m3e-comp-carousel-item-width'] = px(itemWidth);
  }
  if (itemSpacing != null && Number.isFinite(itemSpacing)) {
    style['--m3e-comp-carousel-item-spacing'] = px(itemSpacing);
  }
  if (contentPadding != null && Number.isFinite(contentPadding)) {
    style['--m3e-comp-carousel-content-padding-start'] = px(contentPadding);
    style['--m3e-comp-carousel-content-padding-end'] = px(contentPadding);
  }
  return style;
}

const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

/** Asks the `<m3e-carousel>` parent to re-render. */
const requestParentUpdate = (el: Element) => {
  const parent = el.parentElement;
  if (parent instanceof M3eCarousel) parent.requestUpdate();
};

/** `action` (and the deprecated `item-click`) detail: the activated item's index. */
export interface CarouselActionDetail {
  index: number;
}

/**
 * `<m3e-carousel-item>…</m3e-carousel-item>` — one item of a `<m3e-carousel>`: its child nodes
 * move into the rendered item's mask. `href` makes the item a link, `action` a button (activating
 * it dispatches `action`, `detail: { index }`, from the item; it bubbles); both draw the state layer and ripple (owner decision M9 #25).
 * `label` replaces the default name ("2 of 5").
 */
export class M3eCarouselItem extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    href: {},
    target: {},
    action: { type: Boolean },
    label: {},
  };

  declare href: string | null | undefined;
  declare target: string | null | undefined;
  declare action: boolean | undefined;
  declare label: string | null | undefined;

  #observer: MutationObserver | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.hidden = true;
    this.#observer = new MutationObserver(() => {
      if (this.childNodes.length > 0) requestParentUpdate(this);
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  protected override update(): void {
    requestParentUpdate(this);
  }
}

/** Events of `<m3e-carousel-item>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eCarouselItemEventMap extends HTMLElementEventMap {
  /** An `action` item was activated (it bubbles to the carousel). */
  action: CustomEvent<CarouselActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eCarouselItem {
  addEventListener<K extends keyof M3eCarouselItemEventMap>(
    type: K,
    listener: (this: M3eCarouselItem, ev: M3eCarouselItemEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eCarouselItemEventMap>(
    type: K,
    listener: (this: M3eCarouselItem, ev: M3eCarouselItemEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface Rendered {
  item: HTMLDivElement;
  mask: HTMLElement;
  kind: 'static' | 'link' | 'button';
  ripple: AbortController | null;
}

/**
 * `<m3e-carousel layout="multi-browse" item-width="186" label="Featured">` (COMPONENT_SPEC §36;
 * Compose HorizontalMultiBrowseCarousel / HorizontalUncontainedCarousel /
 * HorizontalCenteredHeroCarousel, owner decisions M9 #22–#26). Renders the m3e-css
 * `.m3e-carousel` contract inside itself (the host is `display: contents`) from its
 * `<m3e-carousel-item>` children, the DOM m3e-react's `<Carousel>` renders, and runs
 * CarouselLayout (shared with m3e-react; the carousel-layout entry, imported when the element
 * first renders, `ready`): Compose's keylines, masks and snap positions, the arrow keys and the
 * scroll to a focused item.
 *
 * - `layout`: `multi-browse` (default), `uncontained`, `hero` (start-aligned),
 *   `centered-hero` or `full-screen` (CSS only: one item filling the carousel, scrolling
 *   vertically).
 * - `item-width` (px): multi-browse and hero `preferredItemWidth` (hero without it fills the
 *   carousel but for the small items), uncontained `itemWidth`. Multi-browse and uncontained need
 *   it. `item-spacing`, `content-padding` (px; default CarouselDefaults' 0dp).
 * - `label`: the carousel's accessible name (APG carousel: `role="region"`,
 *   `aria-roledescription="carousel"`); items are `role="group"` slides named "n of N".
 * - `scrollToItem(index)`, `currentItem`. Event `action` (`detail: { index }`), dispatched by an
 *   `action` item and bubbling through the carousel; `item-click` (same detail, on the carousel)
 *   is deprecated since 1.8 and removed in 2.0.
 */
export class M3eCarousel extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    layout: { reflect: true },
    itemWidth: { type: Number },
    itemSpacing: { type: Number },
    contentPadding: { type: Number },
    label: {},
  };

  declare layout: string | null | undefined;
  declare itemWidth: number | null | undefined;
  declare itemSpacing: number | null | undefined;
  declare contentPadding: number | null | undefined;
  declare label: string | null | undefined;

  /** Item names: "n of N" by default (replace it for other languages). */
  itemLabel: (index: number, count: number) => string = carouselItemLabel;

  #root: HTMLDivElement | undefined;
  #viewport: HTMLDivElement | undefined;
  #layout: CarouselLayout | undefined;
  #rendered = new Map<M3eCarouselItem, Rendered>();
  #observer: MutationObserver | undefined;
  #layoutLoad: Promise<void> | undefined;

  /** The rendered `.m3e-carousel`. */
  get rootElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** Resolves once the layout (the lazily imported carousel-layout entry) runs. */
  get ready(): Promise<void> {
    return (this.#layoutLoad ??= this.#loadLayout());
  }

  /** The item the carousel rests on. */
  get currentItem(): number {
    return this.#layout?.currentItem ?? 0;
  }

  /** Scrolls item `index` to its snap position (on the carousel's spring unless `animate` is false). */
  scrollToItem(index: number, animate = true): void {
    this.#layout?.scrollToItem(index, animate);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => r.target === this)) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
    this.#layoutLoad = undefined;
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const root = (this.#root ??= doc.createElement('div'));
    const viewport = (this.#viewport ??= doc.createElement('div'));
    root.className = `${ROOT} ${ROOT}--${carouselLayoutType(this.layout)}`;
    setAttr(root, 'role', 'region');
    setAttr(root, 'aria-roledescription', 'carousel');
    setAttr(root, 'aria-label', this.label ?? null);
    const style = carouselStyle(this.itemWidth, this.itemSpacing, this.contentPadding);
    for (const name of [
      '--m3e-comp-carousel-item-width',
      '--m3e-comp-carousel-item-spacing',
      '--m3e-comp-carousel-content-padding-start',
      '--m3e-comp-carousel-content-padding-end',
    ]) {
      const value = style[name];
      if (value === undefined) root.style.removeProperty(name);
      else if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    }
    viewport.className = `${ROOT}__viewport`;
    setAttr(viewport, 'tabindex', '-1');
    if (viewport.parentNode !== root) root.append(viewport);
    if (root.parentNode !== this) this.append(root);

    const sources = [...this.children].filter(
      (c): c is M3eCarouselItem => c instanceof M3eCarouselItem,
    );
    for (const [source, r] of [...this.#rendered]) {
      if (!sources.includes(source)) {
        r.ripple?.abort();
        this.#rendered.delete(source);
      }
    }
    const items = sources.map((source, index) =>
      this.#renderItem(doc, source, index, sources.length),
    );
    const current = [...viewport.children];
    if (current.length !== items.length || items.some((el, i) => current[i] !== el)) {
      viewport.replaceChildren(...items);
    }

    if (this.#layout) this.#layout.update();
    else void this.ready;
  }

  #loadLayout(): Promise<void> {
    return import('@kyralabs/m3e-elements/carousel-layout.js').then(({ CarouselLayout }) => {
      const root = this.#root;
      if (this.#layout || !root || !this.isConnected) return;
      this.#layout = new CarouselLayout(root);
    });
  }

  #renderItem(doc: Document, source: M3eCarouselItem, index: number, count: number): HTMLElement {
    const kind = source.href ? 'link' : source.action ? 'button' : 'static';
    let r = this.#rendered.get(source);
    if (!r) {
      const item = doc.createElement('div');
      r = { item, mask: item, kind, ripple: null };
      this.#rendered.set(source, r);
    }
    if (r.mask === r.item || r.kind !== kind) {
      const mask = doc.createElement(kind === 'link' ? 'a' : kind === 'button' ? 'button' : 'div');
      if (r.mask !== r.item) mask.append(...r.mask.childNodes);
      r.ripple?.abort();
      r.ripple = null;
      if (kind !== 'static') {
        r.ripple = new AbortController();
        attachRipple(mask, r.ripple.signal);
      }
      if (kind === 'button') {
        mask.addEventListener('click', () => {
          const i = this.#indexOf(mask);
          if (i < 0) return;
          const detail: CarouselActionDetail = { index: i };
          source.dispatchEvent(
            new CustomEvent('action', { bubbles: true, composed: true, detail }),
          );
          this.emit('item-click', { ...detail });
        });
      }
      r.mask = mask;
      r.kind = kind;
    }
    const { item, mask } = r;
    item.className = `${ROOT}__item`;
    setAttr(item, 'role', 'group');
    setAttr(item, 'aria-roledescription', 'slide');
    setAttr(item, 'aria-label', source.label ?? this.itemLabel(index, count));
    setAttr(item, 'tabindex', kind === 'static' ? '0' : null);
    mask.className = kind === 'static' ? `${ROOT}__mask` : `${ROOT}__mask ${ROOT}__action`;
    if (kind === 'link') {
      setAttr(mask, 'href', source.href ?? null);
      setAttr(mask, 'target', source.target ?? null);
    }
    if (kind === 'button') setAttr(mask, 'type', 'button');
    // The tab stop (React Aria's pressable writes it too: one DOM contract).
    if (kind !== 'static') setAttr(mask, 'tabindex', '0');
    // The item's own child nodes move into the mask.
    if (source.childNodes.length > 0) mask.append(...source.childNodes);
    if (mask.parentNode !== item) item.replaceChildren(mask);
    return item;
  }

  #indexOf(mask: HTMLElement): number {
    const viewport = this.#viewport;
    if (!viewport) return -1;
    return [...viewport.children].findIndex((item) => item.contains(mask));
  }
}

/** Events of `<m3e-carousel>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eCarouselEventMap extends HTMLElementEventMap {
  /** An `action` item was activated (from the `<m3e-carousel-item>`, bubbling). */
  action: CustomEvent<CarouselActionDetail>;
  /** @deprecated Since 1.8: listen to `action`. Removed in 2.0. */
  'item-click': CustomEvent<CarouselActionDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eCarousel {
  addEventListener<K extends keyof M3eCarouselEventMap>(
    type: K,
    listener: (this: M3eCarousel, ev: M3eCarouselEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eCarouselEventMap>(
    type: K,
    listener: (this: M3eCarousel, ev: M3eCarouselEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
