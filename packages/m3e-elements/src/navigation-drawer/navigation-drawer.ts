import {
  M3eNavigationContainer,
  M3eNavigationItem,
  type M3eNavigationContainerEventMap,
} from '../navigation-item/navigation-item.js';
import {
  NavigationDrawerLayout,
  type NavigationDrawerVariant,
} from '../navigation-drawer-layout/navigation-drawer-layout.js';
import { createDrawerItemElement, fillDrawerItemElement } from './drawer-item.js';
import type { OpenChangeDetail } from '../base/events.js';

const DRAWER = 'm3e-navigation-drawer';
const VARIANTS: readonly NavigationDrawerVariant[] = ['permanent', 'dismissible', 'modal'];

/**
 * `<m3e-navigation-drawer variant="modal" label="Main" selected="inbox">` (COMPONENT_SPEC §15;
 * Compose PermanentNavigationDrawer / DismissibleNavigationDrawer / ModalNavigationDrawer with
 * their drawer sheet and NavigationDrawerItem). Renders the m3e-css `.m3e-navigation-drawer`
 * contract inside itself (the host is `display: contents`): a `<nav>` sheet of its
 * `<m3e-navigation-item>` children (`value`, `icon` optional, `href`, `badge`) as
 * `.m3e-navigation-drawer-item`s; other children (a `.m3e-navigation-drawer__headline`, a
 * `.m3e-navigation-drawer__divider`, any header content) move into the sheet in their order.
 * Opening and closing animate on Compose's springs, drags on the open sheet / scrim close it, and
 * the modal drawer opens as a dialog over a scrim (m3e-elements NavigationDrawerLayout, shared with
 * m3e-react).
 *
 * - Attributes: `variant` (`permanent`, the default, `dismissible` or `modal`), `open`
 *   (reflected; ignored by the permanent drawer), `label` (the `<nav>`'s name), `selected`
 *   (the selected item's value), `dialog-label` (the modal window's name, default
 *   "Navigation menu", Compose Strings.NavigationMenu).
 * - Methods: `show()`, `close()`, `toggle()` (DrawerState.open() / close()).
 * - Events: `selection-change` (`detail: { value }`, cancelable); `open-change`
 *   (`detail: { open }`) from the methods and, cancelable (`preventDefault()` keeps the state),
 *   when Escape, the scrim or a drag ask to change it.
 */
export class M3eNavigationDrawer extends M3eNavigationContainer {
  static override properties = {
    ...M3eNavigationContainer.properties,
    variant: { reflect: true },
    open: { type: Boolean, reflect: true },
    dialogLabel: {},
  };

  declare variant: string | null | undefined;
  declare open: boolean | undefined;
  declare dialogLabel: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #nav: HTMLElement | undefined;
  #scrim: HTMLDivElement | undefined;
  #layout: NavigationDrawerLayout | undefined;
  #sequence: Element[] = [];

  get navElement(): HTMLElement | undefined {
    return this.#nav;
  }

  /** The rendered `.m3e-navigation-drawer`. */
  get drawerElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** DrawerState.open(). */
  show(): void {
    this.#set(true);
  }

  /** DrawerState.close(). */
  close(): void {
    this.#set(false);
  }

  toggle(): void {
    this.#set(!this.open);
  }

  #set(open: boolean): void {
    if (Boolean(this.open) === open) return;
    this.open = open;
    this.emit('open-change', { open });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  #variant(): NavigationDrawerVariant {
    const v = this.variant as NavigationDrawerVariant | null | undefined;
    return v && VARIANTS.includes(v) ? v : 'permanent';
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const variant = this.#variant();
    if (this.#layout && this.#layout.variant !== variant) {
      // The layout reads the variant once: start over.
      this.#layout.destroy();
      this.#layout = undefined;
    }
    const open = variant !== 'permanent' && Boolean(this.open);
    const root = (this.#root ??= doc.createElement('div'));
    root.className = [
      DRAWER,
      variant === 'permanent' ? '' : `${DRAWER}--${variant}`,
      open ? `${DRAWER}--open` : '',
    ]
      .filter(Boolean)
      .join(' ');
    const nav = (this.#nav ??= doc.createElement('nav'));
    nav.className = `${DRAWER}__sheet`;
    if (this.label) nav.setAttribute('aria-label', this.label);
    else nav.removeAttribute('aria-label');
    this.#renderSheet(nav);
    let children: Element[] = [nav];
    if (variant === 'modal') {
      if (!this.#scrim) {
        this.#scrim = doc.createElement('div');
        this.#scrim.className = `${DRAWER}__scrim`;
        this.#scrim.setAttribute('aria-hidden', 'true');
      }
      children = [this.#scrim, nav];
    }
    const current = [...root.children];
    if (current.length !== children.length || children.some((c, i) => current[i] !== c)) {
      root.replaceChildren(...children);
    }
    if (root.parentNode !== this) this.append(root);
    if (!this.#layout) {
      this.#layout = new NavigationDrawerLayout(root, {
        open,
        ...(this.dialogLabel ? { dialogLabel: this.dialogLabel } : {}),
        onOpenChange: (value) => {
          if (!this.emit('open-change', { open: value }, { cancelable: true })) return false;
          this.open = value;
          return true;
        },
      });
    } else {
      this.#layout.update();
      this.#layout.setOpen(open);
    }
  }

  /**
   * The sheet's content in order: items (rendered) and the other children (moved in). Children
   * already moved keep their place; new ones go after their previous sibling.
   */
  #renderSheet(nav: HTMLElement): void {
    const root = this.#root;
    const sequence = this.#sequence.filter((el) =>
      el instanceof M3eNavigationItem ? el.parentElement === this : el.parentElement === nav,
    );
    for (const child of this.children) {
      if (child === root || sequence.includes(child)) continue;
      let previous = child.previousElementSibling;
      while (previous && !sequence.includes(previous)) previous = previous.previousElementSibling;
      sequence.splice(previous ? sequence.indexOf(previous) + 1 : 0, 0, child);
    }
    this.#sequence = sequence;
    const items = sequence.filter((el): el is M3eNavigationItem => el instanceof M3eNavigationItem);
    const rendered = this.renderItemElements(items);
    const expected = sequence.map((el) =>
      el instanceof M3eNavigationItem ? (rendered[items.indexOf(el)] ?? el) : el,
    );
    const current = [...nav.children];
    if (current.length !== expected.length || expected.some((e, i) => current[i] !== e)) {
      nav.replaceChildren(...expected);
    }
  }

  protected override createItemElement(_doc: Document, el: HTMLElement, signal: AbortSignal): void {
    createDrawerItemElement(el, signal);
  }

  /** NavigationDrawerItem: [icon] label [badge]. */
  protected override fillItemElement(
    doc: Document,
    item: M3eNavigationItem,
    el: HTMLElement,
    selected: boolean,
  ): void {
    fillDrawerItemElement(doc, item, el, selected);
  }
}

/** Events of `<m3e-navigation-drawer>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eNavigationDrawerEventMap extends M3eNavigationContainerEventMap {
  /** Opened or closed; cancelable when the drawer asks (scrim, Escape, a drag). */
  'open-change': CustomEvent<OpenChangeDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eNavigationDrawer {
  addEventListener<K extends keyof M3eNavigationDrawerEventMap>(
    type: K,
    listener: (this: M3eNavigationDrawer, ev: M3eNavigationDrawerEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eNavigationDrawerEventMap>(
    type: K,
    listener: (this: M3eNavigationDrawer, ev: M3eNavigationDrawerEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
