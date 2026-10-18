import { type MenuAnchorPosition, menuPosition } from '@kyralabs/m3e-motion';
import { AnchoredPopup } from '../base/anchored-popup.js';
import { Spring, readSpring } from '../base/spring.js';

// Re-exported for the split button (and anything else that imported them from here).
export { Spring, readSpring };

export type { MenuAnchorPosition };

export interface MenuPopupOptions {
  /** The element the menu opens from (its bounds feed DropdownMenuPositionProvider). */
  anchor: Element;
  /** MenuAnchorPosition. Default `below`. */
  position?: MenuAnchorPosition | undefined;
  /** DpOffset in px; x is mirrored in RTL. */
  offset?: { x: number; y: number } | undefined;
  /**
   * Called when a pointer goes down outside this menu, its open submenus and the anchor (light
   * dismiss). Submenus usually leave this unset: their root menu dismisses the whole chain.
   */
  onDismiss?: (() => void) | undefined;
}

const readNumber = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name));

/** Open popups, for light dismiss across a menu and its submenus. */
const openPopups = new Set<MenuPopup>();

/**
 * Shows a `.m3e-menu` as a popover the way Compose's DropdownMenuPopup does: placed by the
 * DropdownMenuPositionProvider port (m3e-motion `menuPosition`: below the anchor, flipped above
 * when there is no room, kept `--m3e-comp-menu-vertical-margin` / the variant's horizontal margin
 * from the viewport edges), scaled from `--m3e-comp-menu-closed-scale` and faded in around the
 * transform origin facing the anchor on interruptible springs (fast spatial / fast effects,
 * velocity kept when reversed), and hidden once both springs settle after `close()`. Writes on the
 * menu: `data-driven`, `data-positioned`, `--_m3e-menu-x/-y`, `--_m3e-menu-origin-x/-y`,
 * `--_m3e-menu-scale` and `--_m3e-menu-opacity`. Repositions on scroll and resize while open.
 * `<m3e-menu>` and m3e-react's `<Menu>` both use it, so the layers share one contract.
 */
export class MenuPopup extends AnchoredPopup {
  readonly menu: HTMLElement;
  /** The popup this one is a submenu of, if any (light dismiss treats it as inside). */
  readonly parent: MenuPopup | null;
  #options: MenuPopupOptions | null = null;

  constructor(menu: HTMLElement, parent: MenuPopup | null = null) {
    // The scale and alpha springs of DropdownMenuPopupContent (Menu.kt): fast spatial, fast effects.
    super(menu, { name: 'menu', scaleSpring: 'fast-spatial', opacitySpring: 'fast-effects' });
    this.menu = menu;
    this.parent = parent;
  }

  /** Whether `node` is inside this menu or one of its open submenus. */
  contains(node: Node | null): boolean {
    if (!node) return false;
    if (this.menu.contains(node)) return true;
    for (const popup of openPopups) {
      if (popup !== this && popup.#isDescendantOf(this) && popup.menu.contains(node)) return true;
    }
    return false;
  }

  /** Shows (or keeps showing) the menu and springs it open. */
  open(options: MenuPopupOptions): void {
    this.#options = options;
    openPopups.add(this);
    this.show(options.anchor);
  }

  protected override place(anchor: Element, style: CSSStyleDeclaration): void {
    const options = this.#options;
    const box = anchor.getBoundingClientRect();
    const doc = this.menu.ownerDocument.documentElement;
    const { x, y, originX, originY } = menuPosition({
      anchor: box,
      window: { width: doc.clientWidth, height: doc.clientHeight },
      // offsetWidth/Height ignore the scale transform, like Compose's measured size.
      menu: { width: this.menu.offsetWidth, height: this.menu.offsetHeight },
      rtl: getComputedStyle(anchor).direction === 'rtl',
      position: options?.position ?? 'below',
      offset: options?.offset,
      verticalMargin: readNumber(style, '--_m3e-menu-margin-block') || 0,
      horizontalMargin: readNumber(style, '--_m3e-menu-margin-inline') || 0,
    });
    const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
    this.setProperty('--_m3e-menu-x', px(x));
    this.setProperty('--_m3e-menu-y', px(y));
    this.setProperty('--_m3e-menu-origin-x', String(Math.round(originX * 1e4) / 1e4));
    this.setProperty('--_m3e-menu-origin-y', String(Math.round(originY * 1e4) / 1e4));
  }

  protected override onPointerDown(e: PointerEvent): void {
    const onDismiss = this.#options?.onDismiss;
    if (!onDismiss) return;
    const target = e.composedPath()[0] as Node | undefined;
    if (!target || this.contains(target) || this.#options?.anchor.contains(target)) return;
    onDismiss();
  }

  protected override onHidden(): void {
    openPopups.delete(this);
  }

  #isDescendantOf(other: MenuPopup): boolean {
    for (let p = this.parent; p; p = p.parent) if (p === other) return true;
    return false;
  }
}
