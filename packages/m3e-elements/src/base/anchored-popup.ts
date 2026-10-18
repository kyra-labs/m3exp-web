import { Spring, readSpring } from './spring.js';

const readNumber = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name));

export interface AnchoredPopupConfig {
  /**
   * The component name: the popup writes `--_m3e-<name>-scale` / `-opacity` and reads its closed
   * state from `--m3e-comp-<name>-closed-scale` / `-opacity`.
   */
  readonly name: string;
  /** Motion-scheme spring tokens (`--m3e-sys-motion-spring-<token>-*`) for scale and opacity. */
  readonly scaleSpring: string;
  readonly opacitySpring: string;
}

/**
 * A `popover` shown next to an anchor the way Compose shows a Popup whose content scales and fades
 * in on interruptible springs (velocity kept when reversed): placed by the subclass (`place`),
 * repositioned on scroll and resize while open, hidden once both springs settle after `close()`.
 * Writes on the popup: `data-driven`, `data-positioned`, `--_m3e-<name>-scale` /
 * `--_m3e-<name>-opacity` and whatever `place` writes through `setPosition`. MenuPopup (menus)
 * and TooltipPopup (tooltips) extend it, so the element and React layers share one contract.
 */
export abstract class AnchoredPopup {
  readonly element: HTMLElement;
  readonly #config: AnchoredPopupConfig;
  #anchor: Element | null = null;
  #open = false;
  #frame = 0;
  #scale: Spring | null = null;
  #opacity: Spring | null = null;
  #onClosed: (() => void) | null = null;
  #listeners: AbortController | null = null;
  #resize: ResizeObserver | null = null;
  #written = new Set<string>();

  constructor(element: HTMLElement, config: AnchoredPopupConfig) {
    this.element = element;
    this.#config = config;
  }

  get isOpen(): boolean {
    return this.#open;
  }

  /** The anchor of the current (or last) `show`. */
  get anchor(): Element | null {
    return this.#anchor;
  }

  /** Recomputes the placement from the current anchor and popup sizes. */
  position(): void {
    if (!this.#anchor) return;
    this.place(this.#anchor, getComputedStyle(this.element));
    this.element.setAttribute('data-positioned', '');
  }

  /** Springs the popup closed; hides it and calls `onClosed` once both springs settle. */
  close(onClosed?: () => void): void {
    if (!this.#open && this.#scale === null) {
      onClosed?.();
      return;
    }
    this.#open = false;
    this.#onClosed = onClosed ?? null;
    const style = getComputedStyle(this.element);
    this.#animate(this.#closed(style, 'scale'), this.#closed(style, 'opacity'), style);
  }

  /** Hides immediately and removes everything this popup wrote. */
  destroy(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#hide();
  }

  /** Shows (or keeps showing) the popup next to `anchor` and springs it open. */
  protected show(anchor: Element): void {
    this.#anchor = anchor;
    const wasShown = this.#scale !== null;
    this.#open = true;
    this.#onClosed = null;
    const style = getComputedStyle(this.element);
    if (!wasShown) {
      this.#scale = new Spring(this.#closed(style, 'scale'));
      this.#opacity = new Spring(this.#closed(style, 'opacity'));
      this.element.setAttribute('data-driven', '');
      this.#write();
      if (this.element.hasAttribute('popover') && typeof this.element.showPopover === 'function') {
        if (!this.element.matches(':popover-open')) this.element.showPopover();
      }
      this.#listen();
    }
    this.position();
    this.#animate(1, 1, style);
  }

  /** Writes the placement: physical viewport px (the subclass's own `--_m3e-…` properties). */
  protected abstract place(anchor: Element, style: CSSStyleDeclaration): void;

  /** A pointer went down anywhere while open (light dismiss is the subclass's call). */
  protected onPointerDown(_event: PointerEvent): void {
    // Subclasses decide.
  }

  /** Called when the popup is hidden (after the close springs settle, or `destroy`). */
  protected onHidden(): void {
    // Subclasses clean up.
  }

  /** Sets a private custom property (removed again when the popup hides). */
  protected setProperty(name: string, value: string): void {
    this.#written.add(name);
    this.element.style.setProperty(name, value);
  }

  #closed(style: CSSStyleDeclaration, which: 'scale' | 'opacity'): number {
    return readNumber(style, `--m3e-comp-${this.#config.name}-closed-${which}`) || 0;
  }

  #animate(scale: number, opacity: number, style: CSSStyleDeclaration): void {
    const now = performance.now();
    this.#scale?.to(scale, readSpring(style, this.#config.scaleSpring), now);
    this.#opacity?.to(opacity, readSpring(style, this.#config.opacitySpring), now);
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
    const { name } = this.#config;
    this.setProperty(`--_m3e-${name}-scale`, round(this.#scale.value));
    this.setProperty(`--_m3e-${name}-opacity`, round(this.#opacity.value));
  }

  #hide(): void {
    this.onHidden();
    this.#listeners?.abort();
    this.#listeners = null;
    this.#resize?.disconnect();
    this.#resize = null;
    const el = this.element;
    if (typeof el.hidePopover === 'function' && el.matches(':popover-open')) el.hidePopover();
    for (const name of this.#written) el.style.removeProperty(name);
    this.#written.clear();
    if (el.getAttribute('style') === '') el.removeAttribute('style');
    el.removeAttribute('data-driven');
    el.removeAttribute('data-positioned');
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
    const doc = this.element.ownerDocument;
    const win = doc.defaultView;
    const reposition = () => {
      if (this.#open) this.position();
    };
    win?.addEventListener('resize', reposition, { signal, passive: true });
    win?.addEventListener('scroll', reposition, { signal, passive: true, capture: true });
    this.#resize = new ResizeObserver(reposition);
    this.#resize.observe(this.element);
    doc.addEventListener(
      'pointerdown',
      (e) => {
        if (this.#open) this.onPointerDown(e);
      },
      { signal, capture: true },
    );
  }
}
