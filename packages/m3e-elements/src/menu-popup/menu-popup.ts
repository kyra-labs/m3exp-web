import { type MenuAnchorPosition, menuPosition } from '@kyralabs/m3e-motion';
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

/** The scale and alpha springs of DropdownMenuPopupContent (Menu.kt): fast spatial, fast effects. */
const SCALE_SPRING = 'fast-spatial';
const OPACITY_SPRING = 'fast-effects';

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
export class MenuPopup {
  readonly menu: HTMLElement;
  /** The popup this one is a submenu of, if any (light dismiss treats it as inside). */
  readonly parent: MenuPopup | null;
  #options: MenuPopupOptions | null = null;
  #open = false;
  #frame = 0;
  #scale: Spring | null = null;
  #opacity: Spring | null = null;
  #onClosed: (() => void) | null = null;
  #listeners: AbortController | null = null;
  #resize: ResizeObserver | null = null;

  constructor(menu: HTMLElement, parent: MenuPopup | null = null) {
    this.menu = menu;
    this.parent = parent;
  }

  get isOpen(): boolean {
    return this.#open;
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
    const wasShown = this.#scale !== null;
    this.#open = true;
    this.#onClosed = null;
    openPopups.add(this);
    const style = getComputedStyle(this.menu);
    if (!wasShown) {
      this.#scale = new Spring(readNumber(style, '--m3e-comp-menu-closed-scale') || 0);
      this.#opacity = new Spring(readNumber(style, '--m3e-comp-menu-closed-opacity') || 0);
      this.menu.setAttribute('data-driven', '');
      this.#write();
      if (this.menu.hasAttribute('popover') && typeof this.menu.showPopover === 'function') {
        if (!this.menu.matches(':popover-open')) this.menu.showPopover();
      }
      this.#listen();
    }
    this.position();
    this.#animate(1, 1, style);
  }

  /** Springs the menu closed; hides it and calls `onClosed` once both springs settle. */
  close(onClosed?: () => void): void {
    if (!this.#open && this.#scale === null) {
      onClosed?.();
      return;
    }
    this.#open = false;
    this.#onClosed = onClosed ?? null;
    const style = getComputedStyle(this.menu);
    this.#animate(
      readNumber(style, '--m3e-comp-menu-closed-scale') || 0,
      readNumber(style, '--m3e-comp-menu-closed-opacity') || 0,
      style,
    );
  }

  /** Recomputes the placement from the current anchor and menu sizes. */
  position(): void {
    const options = this.#options;
    if (!options) return;
    const style = getComputedStyle(this.menu);
    const box = options.anchor.getBoundingClientRect();
    const doc = this.menu.ownerDocument.documentElement;
    const { x, y, originX, originY } = menuPosition({
      anchor: box,
      window: { width: doc.clientWidth, height: doc.clientHeight },
      // offsetWidth/Height ignore the scale transform, like Compose's measured size.
      menu: { width: this.menu.offsetWidth, height: this.menu.offsetHeight },
      rtl: getComputedStyle(options.anchor).direction === 'rtl',
      position: options.position ?? 'below',
      offset: options.offset,
      verticalMargin: readNumber(style, '--_m3e-menu-margin-block') || 0,
      horizontalMargin: readNumber(style, '--_m3e-menu-margin-inline') || 0,
    });
    const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
    this.menu.setAttribute('data-positioned', '');
    this.menu.style.setProperty('--_m3e-menu-x', px(x));
    this.menu.style.setProperty('--_m3e-menu-y', px(y));
    this.menu.style.setProperty('--_m3e-menu-origin-x', String(Math.round(originX * 1e4) / 1e4));
    this.menu.style.setProperty('--_m3e-menu-origin-y', String(Math.round(originY * 1e4) / 1e4));
  }

  /** Hides immediately and removes everything this popup wrote. */
  destroy(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#hide();
  }

  #isDescendantOf(other: MenuPopup): boolean {
    for (let p = this.parent; p; p = p.parent) if (p === other) return true;
    return false;
  }

  #animate(scale: number, opacity: number, style: CSSStyleDeclaration): void {
    const now = performance.now();
    this.#scale?.to(scale, readSpring(style, SCALE_SPRING), now);
    this.#opacity?.to(opacity, readSpring(style, OPACITY_SPRING), now);
    this.#write();
    if (this.#frame === 0) this.#frame = requestAnimationFrame(this.#tick);
  }

  #tick = (now: number): void => {
    this.#frame = 0;
    const moving = [this.#scale?.step(now), this.#opacity?.step(now)].some(Boolean);
    this.#write();
    if (moving) this.#frame = requestAnimationFrame(this.#tick);
    else if (!this.#open) this.#hide();
  };

  #write(): void {
    if (!this.#scale || !this.#opacity) return;
    const round = (v: number) => String(Math.round(v * 1e4) / 1e4);
    this.menu.style.setProperty('--_m3e-menu-scale', round(this.#scale.value));
    this.menu.style.setProperty('--_m3e-menu-opacity', round(this.#opacity.value));
  }

  #hide(): void {
    openPopups.delete(this);
    this.#listeners?.abort();
    this.#listeners = null;
    this.#resize?.disconnect();
    this.#resize = null;
    if (typeof this.menu.hidePopover === 'function' && this.menu.matches(':popover-open')) {
      this.menu.hidePopover();
    }
    for (const name of ['x', 'y', 'origin-x', 'origin-y', 'scale', 'opacity']) {
      this.menu.style.removeProperty(`--_m3e-menu-${name}`);
    }
    if (this.menu.getAttribute('style') === '') this.menu.removeAttribute('style');
    this.menu.removeAttribute('data-driven');
    this.menu.removeAttribute('data-positioned');
    this.#scale = null;
    this.#opacity = null;
    this.#open = false;
    const done = this.#onClosed;
    this.#onClosed = null;
    done?.();
  }

  #listen(): void {
    const controller = new AbortController();
    this.#listeners = controller;
    const { signal } = controller;
    const win = this.menu.ownerDocument.defaultView;
    const reposition = () => {
      if (this.#open) this.position();
    };
    win?.addEventListener('resize', reposition, { signal, passive: true });
    win?.addEventListener('scroll', reposition, { signal, passive: true, capture: true });
    this.#resize = new ResizeObserver(reposition);
    this.#resize.observe(this.menu);
    this.menu.ownerDocument.addEventListener(
      'pointerdown',
      (e) => {
        const onDismiss = this.#options?.onDismiss;
        if (!onDismiss || !this.#open) return;
        const target = e.composedPath()[0] as Node | undefined;
        if (!target || this.contains(target) || this.#options?.anchor.contains(target)) return;
        onDismiss();
      },
      { signal, capture: true },
    );
  }
}
