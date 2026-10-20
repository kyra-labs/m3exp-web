import { M3eElement } from '../base/M3eElement.js';
import { DockedToolbarLayout } from '../docked-toolbar-layout/docked-toolbar-layout.js';

const BLOCK = 'm3e-docked-toolbar';
/** `spread` (the default, Arrangement.SpaceBetween) has no modifier. */
const ARRANGEMENTS: readonly string[] = ['center', 'space-around', 'space-evenly'];

/**
 * `<m3e-docked-toolbar label="Actions">` (COMPONENT_SPEC §10; Compose FlexibleBottomAppBar).
 * Renders the m3e-css `.m3e-docked-toolbar` contract inside itself (the host is
 * `display: contents`) and moves its children (usually `.m3e-icon-button`s) into it.
 *
 * - Attributes: `arrangement` (`spread` default | `center` | `space-around` | `space-evenly`),
 *   `color-style` (`standard` | `vibrant`), `label` (the toolbar's accessible name),
 *   `scroll-behavior` (`exit-always`), `scroll-target` (id of the scrolling element; default the
 *   document).
 * - Behavior (m3e-elements DockedToolbarLayout, shared with m3e-react): `role="toolbar"` with
 *   roving focus (one tab stop, ArrowLeft / ArrowRight, Home / End) and the exit-always scroll
 *   behavior (hides on scroll down, returns on scroll up, snaps on the fast spatial spring).
 */
export class M3eDockedToolbar extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    arrangement: {},
    colorStyle: {},
    label: {},
    scrollBehavior: {},
    scrollTarget: {},
  }))();

  declare arrangement: string | null | undefined;
  declare colorStyle: string | null | undefined;
  declare label: string | null | undefined;
  declare scrollBehavior: string | null | undefined;
  declare scrollTarget: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #layout: DockedToolbarLayout | undefined;
  #observer: MutationObserver | undefined;

  /** The rendered `.m3e-docked-toolbar` root. */
  get toolbarElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver(() => {
      this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  protected override update(changed: ReadonlySet<string>): void {
    const root = (this.#root ??= this.ownerDocument.createElement('div'));
    // New light-DOM children become items; earlier ones already live inside the contract.
    const items = [...this.children].filter((child) => child !== root);
    if (items.length > 0) root.append(...items);
    if (root.parentNode !== this) this.append(root);

    const arrangement = ARRANGEMENTS.includes(this.arrangement ?? '') ? this.arrangement : null;
    root.className = [
      BLOCK,
      arrangement && `${BLOCK}--${arrangement}`,
      this.colorStyle === 'vibrant' && `${BLOCK}--vibrant`,
    ]
      .filter(Boolean)
      .join(' ');
    root.setAttribute('role', 'toolbar');
    if (this.label) root.setAttribute('aria-label', this.label);
    else root.removeAttribute('aria-label');

    const firstLayout = !this.#layout;
    this.#layout ??= new DockedToolbarLayout(root);
    this.#layout.update();
    if (firstLayout || changed.has('scrollBehavior') || changed.has('scrollTarget')) {
      const target = this.scrollTarget
        ? this.ownerDocument.getElementById(this.scrollTarget)
        : null;
      this.#layout.setScroll({
        behavior: this.scrollBehavior === 'exit-always' ? 'exit-always' : null,
        target,
      });
    }
  }
}
