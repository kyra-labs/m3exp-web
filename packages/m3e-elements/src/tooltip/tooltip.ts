import { M3eElement } from '../base/M3eElement.js';
import {
  type TooltipAnchorPosition,
  TooltipController,
  tooltipRepeatsName,
} from '../tooltip-popup/tooltip-popup.js';
import type { OpenChangeDetail } from '../base/events.js';

let nextId = 0;
const uid = () => `m3e-tooltip-${String(++nextId)}`;

const POSITIONS = new Set(['above', 'below', 'left', 'right', 'start', 'end']);

/**
 * `<m3e-tooltip anchor="favorite">Add to favorites</m3e-tooltip>` (COMPONENT_SPEC §33). Renders
 * the m3e-css `.m3e-tooltip` contract inside itself as a `popover="manual"`, moving its own child
 * nodes into it as the tooltip text, and runs Compose's TooltipBox behavior through
 * {@link TooltipController} (hover, keyboard focus, long press, Escape, a click outside, one
 * tooltip at a time) with the TooltipPositionProviderImpl placement and show / hide springs.
 *
 * - `anchor`: id of the element the tooltip describes (it gets `aria-describedby`, unless the
 *   tooltip text equals its accessible name: the tooltip is then `aria-hidden`);
 *   `anchorElement` sets it directly.
 * - `variant`: `plain` (default) | `rich`. A rich tooltip takes `subhead` (its title) and `action`
 *   (the label of a text button; clicking it fires `action` and, unless that is cancelled, hides
 *   the tooltip). A tooltip with an action is a non-modal `dialog` named by its subhead (or the
 *   anchor) that Tab from the anchor moves into.
 * - `position`: `above` (default) | `below` | `left` | `right` | `start` | `end`
 *   (TooltipAnchorPosition). `caret` draws TooltipDefaults.caretShape().
 * - `persistent`: TooltipState.isPersistent — stays until a click outside, Escape or `hide()`
 *   (leaving the anchor does not hide it, nor does the duration).
 * - `manual`: no hover / focus / long press handling (TooltipBox enableUserInput = false); only
 *   `open`, `show()` and `hide()` control it.
 * - `open` (reflected): whether it is shown. `show()` is TooltipState.show(): a non-persistent
 *   tooltip hides again after `--m3e-comp-tooltip-duration`. `hide()` is TooltipState.dismiss().
 * - Events: `open-change` with `detail: { open }`; `action` (cancelable) from the action button.
 */
export class M3eTooltip extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    open: { type: Boolean, reflect: true },
    anchor: {},
    variant: {},
    position: {},
    caret: { type: Boolean },
    persistent: { type: Boolean },
    manual: { type: Boolean },
    subhead: {},
    action: {},
  };

  declare open: boolean | undefined;
  declare anchor: string | null | undefined;
  declare variant: string | null | undefined;
  declare position: string | null | undefined;
  declare caret: boolean | undefined;
  declare persistent: boolean | undefined;
  declare manual: boolean | undefined;
  declare subhead: string | null | undefined;
  declare action: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #subhead: HTMLDivElement | undefined;
  /** The rich tooltip's supporting-text part (created with the root). */
  #text: HTMLDivElement | null = null;
  #actionSlot: HTMLDivElement | undefined;
  #actionButton: HTMLButtonElement | undefined;
  #controller: TooltipController | undefined;
  #observer: MutationObserver | undefined;
  #anchorEl: HTMLElement | null = null;
  #anchorOverride: HTMLElement | null = null;
  #describedAnchor: HTMLElement | null = null;
  #shown = false;

  /** The anchor element (overrides `anchor`). */
  get anchorElement(): HTMLElement | null {
    return this.#anchorOverride ?? this.#anchorEl;
  }

  set anchorElement(el: HTMLElement | null) {
    this.#anchorOverride = el;
    this.requestUpdate('anchor');
  }

  /** The rendered `.m3e-tooltip` element. */
  get tooltipElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // New child nodes (the tooltip text) move into the tooltip on the next update.
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => r.target === this)) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#controller?.destroy();
    this.#controller = undefined;
    this.#unlinkAnchor();
    this.#shown = false;
  }

  /** TooltipState.show(): shows it (a non-persistent tooltip hides after the duration). */
  show(): void {
    this.#render();
    this.#sync();
    this.#ensureController().show();
  }

  /** TooltipState.dismiss(). */
  hide(): void {
    if (this.#controller) this.#controller.dismiss();
    else this.open = false;
  }

  protected override update(changed: ReadonlySet<string>): void {
    this.#render();
    if (changed.has('anchor')) this.#bindAnchor();
    this.#sync();
    const controller = this.#ensureController();
    if (Boolean(this.open) !== this.#shown) {
      this.#shown = Boolean(this.open);
      controller.render(this.#shown);
      this.emit('open-change', { open: this.#shown });
    } else if (this.#shown) {
      controller.popup.position();
    }
  }

  #ensureController(): TooltipController {
    this.#controller ??= new TooltipController({
      tooltip: this.#render(),
      onVisibleChange: (visible) => {
        this.open = visible;
      },
    });
    return this.#controller;
  }

  /** Pushes the attributes into the controller and the anchor's ARIA. */
  #sync(): void {
    const controller = this.#ensureController();
    controller.isPersistent = Boolean(this.persistent);
    controller.hasAction = Boolean(this.#actionButton?.isConnected);
    controller.enableUserInput = !this.manual;
    controller.popup.placement = (
      this.position && POSITIONS.has(this.position) ? this.position : 'above'
    ) as TooltipAnchorPosition;
    controller.setAnchor(this.anchorElement);
    this.#linkAnchor();
  }

  // --- Rendering --------------------------------------------------------------------------

  #render(): HTMLDivElement {
    const doc = this.ownerDocument;
    this.#root ??= doc.createElement('div');
    this.#text ??= doc.createElement('div');
    const root = this.#root;
    const text = this.#text;
    // The host's own child nodes are the tooltip text.
    const incoming = [...this.childNodes].filter((n) => n !== root);
    if (root.parentNode !== this) this.append(root);
    const rich = this.variant === 'rich';
    root.id ||= uid();
    root.className = [
      'm3e-tooltip',
      rich ? 'm3e-tooltip--rich' : '',
      this.caret ? 'm3e-tooltip--caret' : '',
    ]
      .filter(Boolean)
      .join(' ');
    root.setAttribute('popover', 'manual');

    if (!rich) {
      // Plain: the text is the tooltip's content.
      if (text.parentNode === root) {
        for (const node of [...text.childNodes]) root.insertBefore(node, text);
        text.remove();
      }
      this.#subhead?.remove();
      this.#actionSlot?.remove();
      root.append(...incoming);
      root.setAttribute('role', 'tooltip');
      root.removeAttribute('aria-labelledby');
      return root;
    }

    text.className = 'm3e-tooltip__supporting-text';
    // Switching from plain: the text moves into the supporting-text part.
    const loose = [...root.childNodes].filter(
      (n) => n !== text && n !== this.#subhead && n !== this.#actionSlot,
    );
    text.append(...loose, ...incoming);

    const parts: HTMLElement[] = [];
    if (this.subhead) {
      this.#subhead ??= doc.createElement('div');
      this.#subhead.className = 'm3e-tooltip__subhead';
      this.#subhead.id ||= uid();
      this.#subhead.textContent = this.subhead;
      parts.push(this.#subhead);
    } else {
      this.#subhead?.remove();
    }
    parts.push(text);
    if (this.action) {
      if (!this.#actionSlot || !this.#actionButton) {
        this.#actionSlot = doc.createElement('div');
        this.#actionSlot.className = 'm3e-tooltip__action';
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'm3e-button m3e-button--text m3e-button--size-s m3e-button--round';
        // As m3e-react's <Button> (React Aria useButton + useStateLayer) renders it.
        button.tabIndex = 0;
        button.setAttribute('data-spring', '');
        button.setAttribute('data-ripple', '');
        button.addEventListener('click', () => {
          if (this.emit('action', null, { cancelable: true })) this.hide();
        });
        this.#actionButton = button;
        this.#actionSlot.append(button);
      }
      if (this.#actionButton.textContent !== this.action) {
        this.#actionButton.textContent = this.action;
      }
      parts.push(this.#actionSlot);
    } else {
      this.#actionSlot?.remove();
    }
    const current = [...root.children];
    if (current.length !== parts.length || parts.some((p, i) => current[i] !== p)) {
      root.replaceChildren(...parts);
    }

    // With an action it is not a description but a small non-modal dialog (it takes focus).
    if (this.action) {
      root.setAttribute('role', 'dialog');
      const anchor = this.anchorElement;
      if (anchor && !this.#subhead?.isConnected) anchor.id ||= uid();
      const labelledBy = this.#subhead?.isConnected ? this.#subhead.id : anchor?.id;
      if (labelledBy) root.setAttribute('aria-labelledby', labelledBy);
      else root.removeAttribute('aria-labelledby');
    } else {
      root.setAttribute('role', 'tooltip');
      root.removeAttribute('aria-labelledby');
    }
    return root;
  }

  // --- Anchor -------------------------------------------------------------------------------

  #bindAnchor(): void {
    const root = this.getRootNode() as Document | ShadowRoot;
    const el = this.anchor && 'getElementById' in root ? root.getElementById(this.anchor) : null;
    this.#anchorEl = el instanceof HTMLElement ? el : null;
  }

  /**
   * `aria-describedby` on the anchor, added to whatever it already lists, unless the tooltip only
   * repeats the anchor's name (then it is `aria-hidden`; owner decision M9 #2).
   */
  #linkAnchor(): void {
    const anchor = this.anchorElement;
    if (anchor !== this.#describedAnchor) this.#unlinkAnchor();
    const root = this.#root;
    const id = root?.id;
    if (!anchor || !root || !id) return;
    const repeats = !this.action && tooltipRepeatsName(anchor, root);
    if (repeats) root.setAttribute('aria-hidden', 'true');
    else root.removeAttribute('aria-hidden');
    if (repeats) {
      this.#unlinkAnchor();
      return;
    }
    const ids = (anchor.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    if (!ids.includes(id)) anchor.setAttribute('aria-describedby', [...ids, id].join(' '));
    this.#describedAnchor = anchor;
  }

  #unlinkAnchor(): void {
    const anchor = this.#describedAnchor;
    const id = this.#root?.id;
    this.#describedAnchor = null;
    if (!anchor || !id) return;
    const ids = (anchor.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((t) => t && t !== id);
    if (ids.length > 0) anchor.setAttribute('aria-describedby', ids.join(' '));
    else anchor.removeAttribute('aria-describedby');
  }
}

/** Events of `<m3e-tooltip>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eTooltipEventMap extends HTMLElementEventMap {
  /** Shown or hidden (after the change). */
  'open-change': CustomEvent<OpenChangeDetail>;
  /**
   * The rich tooltip's action button was pressed; cancelable (`preventDefault()` keeps it shown).
   */
  action: CustomEvent<null>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eTooltip {
  addEventListener<K extends keyof M3eTooltipEventMap>(
    type: K,
    listener: (this: M3eTooltip, ev: M3eTooltipEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eTooltipEventMap>(
    type: K,
    listener: (this: M3eTooltip, ev: M3eTooltipEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
