import {
  NAVIGATION_SUITE_EXPANDED_FROM,
  NAVIGATION_SUITE_TYPES,
  type NavigationSuiteType,
  type NavigationSuiteTypeOptions,
  WINDOW_WIDTH_BREAKPOINTS,
  type WindowSizeClass,
  type WindowWidthSizeClass,
  isNavigationBarType,
  navigationSuiteType,
  windowSizeClass,
} from '@kyralabs/m3e-motion';
import {
  createDrawerItemElement,
  fillDrawerItemElement,
} from '../navigation-drawer/drawer-item.js';
import { M3eNavigationContainer, M3eNavigationItem } from '../navigation-item/navigation-item.js';
import { NavigationSuiteLayout } from '../navigation-suite-layout/navigation-suite-layout.js';
import {
  currentWindowSizeClass,
  observeWindowSizeClass,
} from '../window-size-class/window-size-class.js';

const SUITE = 'm3e-navigation-suite';
const BAR = 'm3e-short-navigation-bar';
const RAIL = 'm3e-wide-navigation-rail';
const DRAWER = 'm3e-navigation-drawer';
const ALIGNMENTS = ['start', 'center', 'end'];

/** `expanded-from`: absent → the scaffold default (large); `none` → never; a class or a px bound. */
function parseExpandedFrom(
  value: string | null | undefined,
): NavigationSuiteTypeOptions['expandedFrom'] {
  if (value === null || value === undefined || value === '') return NAVIGATION_SUITE_EXPANDED_FROM;
  if (value === 'none') return null;
  if (value in WINDOW_WIDTH_BREAKPOINTS) return value as WindowWidthSizeClass;
  const px = Number.parseFloat(value);
  return Number.isFinite(px) ? px : NAVIGATION_SUITE_EXPANDED_FROM;
}

/**
 * `<m3e-navigation-suite label="Main" selected="home">` (COMPONENT_SPEC §16; Compose
 * NavigationSuiteScaffold). Renders the m3e-css `.m3e-navigation-suite` contract inside itself (the
 * host is `display: contents`): its `<m3e-navigation-item>` children as the navigation the window
 * size class calls for — a short navigation bar below 600px (horizontal items at compact height),
 * a collapsed wide navigation rail from 600px, the expanded rail from 1200px — and every other
 * child in the content area. A child with `slot="primary-action"` (e.g. a FAB) floats above a bar
 * and heads the rail or drawer. Switching keeps the selection, the item elements (bar ↔ rail) and
 * keyboard focus. Show / hide animates on Compose's spring (m3e-elements NavigationSuiteLayout,
 * shared with m3e-react).
 *
 * - Attributes: `label` (the `<nav>`'s name), `selected` (the selected item's value), `layout-type`
 *   (a fixed NavigationSuiteType: `short-navigation-bar-compact`, `short-navigation-bar-medium`,
 *   `wide-navigation-rail-collapsed`, `wide-navigation-rail-expanded`, `navigation-drawer` or
 *   `none`; default: adaptive), `expanded-from` (where the adaptive rule expands: a width class or
 *   px bound, `none` for Compose's own rule; default `large`), `expanded-type`
 *   (`wide-navigation-rail-expanded` default, or `navigation-drawer`), `navigation-hidden`
 *   (reflected; switching it animates), `primary-action-alignment` (`start` | `center` | `end`,
 *   the default: where the primary action sits above a bar).
 * - Property `navigationSuiteType`: a function of the window size class that replaces the adaptive
 *   rule (`layout-type` still wins). Read-only `type`: the type shown.
 * - Methods: `showNavigation()`, `hideNavigation()`, `toggleNavigation()`
 *   (NavigationSuiteScaffoldState.show / hide / toggle).
 * - Events: `selection-change` (`detail: { value }`, cancelable); `navigation-hidden-change`
 *   (`detail: { hidden }`) from the methods; `navigation-suite-type-change` (`detail: { type }`)
 *   when the window size (or a property) changes the type.
 */
export class M3eNavigationSuite extends M3eNavigationContainer {
  static override properties = {
    ...M3eNavigationContainer.properties,
    layoutType: {},
    expandedFrom: {},
    expandedType: {},
    navigationHidden: { type: Boolean, reflect: true },
    primaryActionAlignment: {},
  };

  declare layoutType: string | null | undefined;
  declare expandedFrom: string | null | undefined;
  declare expandedType: string | null | undefined;
  declare navigationHidden: boolean | undefined;
  declare primaryActionAlignment: string | null | undefined;

  #rule: ((sizeClass: WindowSizeClass) => NavigationSuiteType) | null = null;
  #sizeClass: WindowSizeClass | null = null;
  #observing: AbortController | undefined;
  #type: NavigationSuiteType | null = null;
  /** Which item DOM the rendered items have: the bar / rail item or the drawer item. */
  #drawerItems = false;
  #root: HTMLDivElement | undefined;
  #nav: HTMLElement | undefined;
  #header: HTMLDivElement | undefined;
  #drawer: HTMLDivElement | undefined;
  #drawerNav: HTMLElement | undefined;
  #primary: HTMLDivElement | undefined;
  #content: HTMLDivElement | undefined;
  #primaryNodes: Element[] = [];
  #layout: NavigationSuiteLayout | undefined;

  /** Replaces the adaptive rule (NavigationSuiteScaffold's `navigationSuiteType` argument). */
  get navigationSuiteType(): ((sizeClass: WindowSizeClass) => NavigationSuiteType) | null {
    return this.#rule;
  }

  set navigationSuiteType(rule: ((sizeClass: WindowSizeClass) => NavigationSuiteType) | null) {
    this.#rule = rule;
    this.requestUpdate();
  }

  /** The type shown (NavigationSuiteType), or null before the first render. */
  get type(): NavigationSuiteType | null {
    return this.#type;
  }

  get navElement(): HTMLElement | undefined {
    return this.#type === 'navigation-drawer' ? this.#drawerNav : this.#nav;
  }

  /** The rendered `.m3e-navigation-suite`. */
  get suiteElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** NavigationSuiteScaffoldState.show(). */
  showNavigation(): void {
    this.#setHidden(false);
  }

  /** NavigationSuiteScaffoldState.hide(). */
  hideNavigation(): void {
    this.#setHidden(true);
  }

  /** NavigationSuiteScaffoldState.toggle(). */
  toggleNavigation(): void {
    this.#setHidden(!this.navigationHidden);
  }

  #setHidden(hidden: boolean): void {
    if (Boolean(this.navigationHidden) === hidden) return;
    this.navigationHidden = hidden;
    this.emit('navigation-hidden-change', { hidden });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observing = new AbortController();
    observeWindowSizeClass(
      (sizeClass) => {
        this.#sizeClass = sizeClass;
        this.requestUpdate();
      },
      { signal: this.#observing.signal },
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observing?.abort();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  protected override isRendered(node: Node): boolean {
    return this.#root?.contains(node) ?? false;
  }

  #resolveType(): NavigationSuiteType {
    const fixed = this.layoutType as NavigationSuiteType | null | undefined;
    if (fixed && NAVIGATION_SUITE_TYPES.includes(fixed)) return fixed;
    const sizeClass =
      this.#sizeClass ?? currentWindowSizeClass() ?? windowSizeClass({ width: 0, height: 0 });
    if (this.#rule) return this.#rule(sizeClass);
    return navigationSuiteType(sizeClass, {
      expandedFrom: parseExpandedFrom(this.expandedFrom),
      expandedType:
        this.expandedType === 'navigation-drawer'
          ? 'navigation-drawer'
          : 'wide-navigation-rail-expanded',
    });
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const type = this.#resolveType();
    const previous = this.#type;
    this.#type = type;
    const bar = isNavigationBarType(type);
    const drawer = type === 'navigation-drawer';
    const rail =
      type === 'wide-navigation-rail-collapsed' || type === 'wide-navigation-rail-expanded';
    if ((bar || rail || drawer) && drawer !== this.#drawerItems) {
      // The drawer item is another DOM than the bar / rail item.
      this.resetItemElements();
      this.#drawerItems = drawer;
    }
    const hidden = Boolean(this.navigationHidden);
    const alignment = ALIGNMENTS.includes(this.primaryActionAlignment ?? '')
      ? this.primaryActionAlignment
      : 'end';
    const root = (this.#root ??= doc.createElement('div'));
    root.className = [
      SUITE,
      `${SUITE}--${bar ? 'bar' : rail ? 'rail' : drawer ? 'drawer' : 'none'}`,
      hidden ? `${SUITE}--navigation-hidden` : '',
      alignment === 'end' ? '' : `${SUITE}--primary-action-${String(alignment)}`,
    ]
      .filter(Boolean)
      .join(' ');

    const primary = this.#primaryChildren();
    const wrapper = (this.#primary ??= doc.createElement('div'));
    wrapper.className = `${SUITE}__primary-action`;
    const content = (this.#content ??= doc.createElement('div'));
    content.className = `${SUITE}__content`;
    // Everything else the host holds is content (moved once; later children follow).
    const loose = [...this.childNodes].filter(
      (node) =>
        node !== root &&
        !(node instanceof M3eNavigationItem) &&
        !primary.includes(node as Element) &&
        !(node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()),
    );
    if (loose.length > 0) content.append(...loose);

    const items = this.items();
    let navigation: HTMLElement | null = null;
    if (bar || rail) {
      const nav = (this.#nav ??= doc.createElement('nav'));
      nav.className = bar
        ? type === 'short-navigation-bar-medium'
          ? `${BAR} ${BAR}--horizontal`
          : BAR
        : type === 'wide-navigation-rail-expanded'
          ? `${RAIL} ${RAIL}--expanded`
          : RAIL;
      this.#label(nav);
      let header: HTMLDivElement | null = null;
      if (rail && primary.length > 0) {
        header = this.#header ??= doc.createElement('div');
        header.className = `${RAIL}__header`;
        setChildren(header, primary);
      }
      setChildren(nav, [...(header ? [header] : []), ...this.renderItemElements(items)]);
      navigation = nav;
    } else if (drawer) {
      const sheet = (this.#drawerNav ??= doc.createElement('nav'));
      sheet.className = `${DRAWER}__sheet`;
      this.#label(sheet);
      if (primary.length > 0) setChildren(wrapper, primary);
      setChildren(sheet, [
        ...(primary.length > 0 ? [wrapper] : []),
        ...this.renderItemElements(items),
      ]);
      const drawerRoot = (this.#drawer ??= doc.createElement('div'));
      drawerRoot.className = DRAWER;
      setChildren(drawerRoot, [sheet]);
      navigation = drawerRoot;
    } else {
      // `none`: no navigation (Compose places no primary action either).
      if (primary.length > 0) setChildren(wrapper, primary);
    }
    if (bar && primary.length > 0) setChildren(wrapper, primary);
    setChildren(root, [
      ...(navigation ? [navigation] : []),
      ...(bar && primary.length > 0 ? [wrapper] : []),
      content,
    ]);
    if (root.parentNode !== this) this.append(root);

    if (!this.#layout) {
      this.#layout = new NavigationSuiteLayout(root, { navigationHidden: hidden });
    } else {
      this.#layout.update();
      this.#layout.setNavigationHidden(hidden);
    }
    if (previous !== null && previous !== type) {
      this.emit('navigation-suite-type-change', { type });
    }
  }

  /** `slot="primary-action"` children, wherever they were placed (the order they came in). */
  #primaryChildren(): Element[] {
    const placed = new Set<Node | null | undefined>([this, this.#header, this.#primary]);
    const kept = this.#primaryNodes.filter((el) => placed.has(el.parentNode));
    for (const child of this.children) {
      if (child.getAttribute('slot') === 'primary-action' && !kept.includes(child))
        kept.push(child);
    }
    this.#primaryNodes = kept;
    return kept;
  }

  #label(nav: HTMLElement): void {
    if (this.label) nav.setAttribute('aria-label', this.label);
    else nav.removeAttribute('aria-label');
  }

  protected override createItemElement(doc: Document, el: HTMLElement, signal: AbortSignal): void {
    if (this.#drawerItems) createDrawerItemElement(el, signal);
    else super.createItemElement(doc, el, signal);
  }

  protected override fillItemElement(
    doc: Document,
    item: M3eNavigationItem,
    el: HTMLElement,
    selected: boolean,
  ): void {
    if (this.#drawerItems) fillDrawerItemElement(doc, item, el, selected);
    else super.fillItemElement(doc, item, el, selected);
  }
}

/** Replaces `parent`'s children with `children` unless they already are, in order. */
function setChildren(parent: Element, children: readonly Element[]): void {
  const current = [...parent.children];
  if (current.length !== children.length || children.some((c, i) => current[i] !== c)) {
    parent.replaceChildren(...children);
  }
}
