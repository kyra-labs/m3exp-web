import { M3eWideRailBase } from '../wide-navigation-rail/wide-navigation-rail.js';

const MODAL = 'm3e-modal-wide-navigation-rail';

/**
 * `<m3e-modal-wide-navigation-rail label="Main">` (COMPONENT_SPEC §14; Compose
 * ModalWideNavigationRail). Renders the `.m3e-modal-wide-navigation-rail` contract: the rail (as
 * `<m3e-wide-navigation-rail>`) and the scrim. Collapsed it is a collapsed rail; `expanded`
 * opens it as a modal window (`dialog` semantics, focus trapped, Escape or the scrim collapse it,
 * focus returns to the opener) over the page; `hide-on-collapse` shows nothing while collapsed
 * and slides the expanded rail in.
 *
 * - Attributes: `label`, `selected`, `expanded` (reflected), `hide-on-collapse`, `dialog-label`
 *   (the window's accessible name, default "Navigation rail", Compose
 *   Strings.WideNavigationRailPaneTitle).
 * - Events: `selection-change`; `expanded-change` (`detail: { expanded }`) from the methods and
 *   when Escape or the scrim collapse it (cancelable: `preventDefault()` keeps it open).
 */
export class M3eModalWideNavigationRail extends M3eWideRailBase {
  static override properties = {
    ...M3eWideRailBase.properties,
    hideOnCollapse: { type: Boolean },
    dialogLabel: {},
  };

  declare hideOnCollapse: boolean | undefined;
  declare dialogLabel: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #scrim: HTMLDivElement | undefined;
  #hide: boolean | null = null;

  /** The rendered `.m3e-modal-wide-navigation-rail`. */
  get modalElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const hide = Boolean(this.hideOnCollapse);
    if (this.#hide !== null && this.#hide !== hide) {
      // The layout reads the variant once: start over.
      this.layout?.destroy();
      this.layout = undefined;
    }
    this.#hide = hide;
    const root = (this.#root ??= doc.createElement('div'));
    root.className = hide ? `${MODAL} ${MODAL}--hide-on-collapse` : MODAL;
    if (!this.#scrim) {
      this.#scrim = doc.createElement('div');
      this.#scrim.className = `${MODAL}__scrim`;
      this.#scrim.setAttribute('aria-hidden', 'true');
    }
    const nav = this.renderRail(root, hide || Boolean(this.expanded));
    if (nav.parentNode !== root || this.#scrim.previousElementSibling !== nav) {
      root.replaceChildren(nav, this.#scrim);
    }
    if (root.parentNode !== this) this.append(root);
    this.syncLayout(root, this.dialogLabel ? { dialogLabel: this.dialogLabel } : {});
  }
}
