import { createItemElement, fillItemElement } from '../navigation-item/item-element.js';
import {
  M3eNavigationContainer,
  type M3eNavigationItem,
  type M3eNavigationContainerEventMap,
} from '../navigation-item/navigation-item.js';

const BLOCK = 'm3e-short-navigation-bar';

/**
 * `<m3e-short-navigation-bar label="Main" selected="home">` (COMPONENT_SPEC §13; Compose
 * ShortNavigationBar). Renders the m3e-css `.m3e-short-navigation-bar` contract inside itself (the
 * host is `display: contents`): a `<nav>` of its `<m3e-navigation-item>` children, the DOM
 * m3e-react's `<ShortNavigationBar>` renders. The indicator animation is CSS.
 *
 * - Attributes: `label`, `selected` (see M3eNavigationContainer), `layout` (`vertical` default |
 *   `horizontal`: icons before labels, items centered).
 * - Events: `selection-change` (`detail: { value }`, cancelable).
 */
export class M3eShortNavigationBar extends M3eNavigationContainer {
  static override properties = {
    ...M3eNavigationContainer.properties,
    layout: {},
  };

  declare layout: string | null | undefined;

  #nav: HTMLElement | undefined;

  get navElement(): HTMLElement | undefined {
    return this.#nav;
  }

  protected override update(): void {
    const nav = (this.#nav ??= this.ownerDocument.createElement('nav'));
    if (nav.parentNode !== this) this.append(nav);
    nav.className = this.layout === 'horizontal' ? `${BLOCK} ${BLOCK}--horizontal` : BLOCK;
    if (this.label) nav.setAttribute('aria-label', this.label);
    else nav.removeAttribute('aria-label');
    this.renderItems(nav, null);
  }

  protected override createItemElement(doc: Document, el: HTMLElement, signal: AbortSignal): void {
    createItemElement(doc, el, signal);
  }

  protected override fillItemElement(
    doc: Document,
    item: M3eNavigationItem,
    el: HTMLElement,
    selected: boolean,
  ): void {
    fillItemElement(doc, item, el, selected);
  }
}

/** Events of `<m3e-short-navigation-bar>` (M1). */
export type M3eShortNavigationBarEventMap = M3eNavigationContainerEventMap;

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eShortNavigationBar {
  addEventListener<K extends keyof M3eShortNavigationBarEventMap>(
    type: K,
    listener: (this: M3eShortNavigationBar, ev: M3eShortNavigationBarEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eShortNavigationBarEventMap>(
    type: K,
    listener: (this: M3eShortNavigationBar, ev: M3eShortNavigationBarEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
