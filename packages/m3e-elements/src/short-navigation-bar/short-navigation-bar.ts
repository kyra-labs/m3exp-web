import { M3eNavigationContainer } from '../navigation-item/navigation-item.js';

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
}
