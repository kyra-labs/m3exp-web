import { M3eNavigationContainer } from '../navigation-item/navigation-item.js';
import { WideNavigationRailLayout } from '../wide-navigation-rail-layout/wide-navigation-rail-layout.js';

const RAIL = 'm3e-wide-navigation-rail';

/** What the wide and the modal rail elements share: the `<nav>`, its header and the layout. */
export abstract class M3eWideRailBase extends M3eNavigationContainer {
  static override properties = {
    ...M3eNavigationContainer.properties,
    expanded: { type: Boolean, reflect: true },
  };

  declare expanded: boolean | undefined;

  protected nav: HTMLElement | undefined;
  #header: HTMLDivElement | undefined;
  protected layout: WideNavigationRailLayout | undefined;

  get navElement(): HTMLElement | undefined {
    return this.nav;
  }

  /** WideNavigationRailState.expand(). */
  expand(): void {
    this.#set(true);
  }

  /** WideNavigationRailState.collapse(). */
  collapse(): void {
    this.#set(false);
  }

  /** WideNavigationRailState.toggle(). */
  toggle(): void {
    this.#set(!this.expanded);
  }

  #set(expanded: boolean): void {
    if (Boolean(this.expanded) === expanded) return;
    this.expanded = expanded;
    this.emit('expanded-change', { expanded });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.layout?.destroy();
    this.layout = undefined;
  }

  /** Renders the `<nav>` (header + items) inside `parent`; `expandedClass`: its layout state. */
  protected renderRail(root: Element, expandedClass: boolean): HTMLElement {
    const doc = this.ownerDocument;
    const nav = (this.nav ??= doc.createElement('nav'));
    nav.className = expandedClass ? `${RAIL} ${RAIL}--expanded` : RAIL;
    if (this.label) nav.setAttribute('aria-label', this.label);
    else nav.removeAttribute('aria-label');
    const extras = this.extraChildren(root);
    if (extras.length > 0) {
      this.#header ??= doc.createElement('div');
      this.#header.className = `${RAIL}__header`;
      this.#header.append(...extras);
    }
    const header = this.#header?.childElementCount ? this.#header : null;
    this.renderItems(nav, header);
    return nav;
  }

  /** Creates the layout once, then animates to the `expanded` attribute. */
  protected syncLayout(root: HTMLElement, options: { dialogLabel?: string } = {}): void {
    const expanded = Boolean(this.expanded);
    if (!this.layout) {
      this.layout = new WideNavigationRailLayout(root, {
        expanded,
        ...options,
        onExpandedChange: (value) => {
          if (this.emit('expanded-change', { expanded: value }, { cancelable: true })) {
            this.expanded = value;
          }
        },
      });
    } else {
      this.layout.update();
      this.layout.setExpanded(expanded);
    }
  }
}

/**
 * `<m3e-wide-navigation-rail label="Main" selected="home">` (COMPONENT_SPEC §14; Compose
 * WideNavigationRail). Renders the m3e-css `.m3e-wide-navigation-rail` contract inside itself (the
 * host is `display: contents`): a `<nav>` of its `<m3e-navigation-item>` children; other children
 * (a menu button, a FAB) go to the header. Switching `expanded` animates the rail on Compose's
 * springs (m3e-elements WideNavigationRailLayout, shared with m3e-react).
 *
 * - Attributes: `label`, `selected` (see M3eNavigationContainer), `expanded` (reflected).
 * - Events: `selection-change` (`detail: { value }`, cancelable); `expanded-change`
 *   (`detail: { expanded }`) from `expand()` / `collapse()` / `toggle()`.
 */
export class M3eWideNavigationRail extends M3eWideRailBase {
  protected override update(): void {
    const nav = this.renderRail(this.nav ?? this, Boolean(this.expanded));
    if (nav.parentNode !== this) this.append(nav);
    this.syncLayout(nav);
  }
}
