import { isWidthAtLeastBreakpoint } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import { SideSheetLayout, type SideSheetVariant } from '../side-sheet-layout/side-sheet-layout.js';
import {
  SIDE_SHEET_BACK_LABEL,
  SIDE_SHEET_CLOSE_LABEL,
  SIDE_SHEET_LABEL,
} from '../side-sheet-layout/strings.js';
import { observeWindowSizeClass } from '../window-size-class/window-size-class.js';
import type { EmptyDetail, OpenChangeDetail } from '../base/events.js';

const SHEET = 'm3e-side-sheet';

/** `standard`, `modal`, or `adaptive` (modal below the medium window size class, owner decision M9 #17). */
export type SideSheetVariantOption = SideSheetVariant | 'adaptive';

let nextId = 0;

const el = <K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] => {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
};

const setAttr = (node: Element, name: string, value: string | null): void => {
  if (value === null) node.removeAttribute(name);
  else if (node.getAttribute(name) !== value) node.setAttribute(name, value);
};

/** Replaces `parent`'s children with `children` unless they are already those, in order. */
const ensureChildren = (parent: Element, children: readonly Node[]): void => {
  const current = [...parent.childNodes];
  if (current.length !== children.length || children.some((c, i) => current[i] !== c)) {
    parent.replaceChildren(...children);
  }
};

/** The root's class (side-sheet.css). */
export function sideSheetClass(
  variant: SideSheetVariant,
  open: boolean,
  detached: boolean,
  divider: boolean,
): string {
  return [
    SHEET,
    variant === 'modal' ? `${SHEET}--modal` : null,
    open ? `${SHEET}--open` : null,
    detached ? `${SHEET}--detached` : null,
    divider ? `${SHEET}--divider` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * The variant an `adaptive` sheet takes: standard from the medium window size class (600dp), modal
 * below (owner decision M9 #17; m3.material.io: standard sheets are "used mostly in medium to
 * expanded breakpoints", modal ones are "preferred in compact breakpoints").
 */
export function adaptiveSideSheetVariant(widthAtLeastMedium: boolean): SideSheetVariant {
  return widthAtLeastMedium ? 'standard' : 'modal';
}

/**
 * `<m3e-side-sheet variant="modal" headline="Filters" open>…</m3e-side-sheet>` (COMPONENT_SPEC
 * §31; D8: m3.material.io only). Renders the m3e-css `.m3e-side-sheet` contract inside itself (the
 * host is `display: contents`) and runs {@link SideSheetLayout} (shared with m3e-react).
 *
 * - `variant`: `standard` (default: an `<aside>` at the end of a flex row; opening it narrows the
 *   content beside it), `modal` (a `<dialog>` at the window's end edge over a scrim) or `adaptive`
 *   (modal below the medium window size class, 600dp, standard from it; owner decision M9 #17).
 * - `open` (reflected). `headline` (the title; it names the sheet), `label` (the name without a
 *   headline; default "Side sheet"), `close-label` (default "Close"), `back-button` (show the back
 *   icon button; `back-label`, default "Back"; `back` is its deprecated name, since 1.8, removed in
 *   2.0), `detached` (inset 16dp, all corners rounded; owner
 *   decision M9 #18), `divider` (standard: the line along its start edge; modal: above the
 *   actions).
 * - Children with `slot="actions"` are the bottom action buttons; the other child nodes are the
 *   content (it scrolls on its own).
 * - Methods `show()`, `close()`, `toggle()`. Events `open-change` (`detail: { open }`; cancelable
 *   when the sheet asks: the close button, Escape, the scrim, a close request) and `back`.
 */
export class M3eSideSheet extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    variant: { reflect: true },
    open: { type: Boolean, reflect: true },
    headline: {},
    label: {},
    closeLabel: {},
    backButton: { type: Boolean },
    back: { type: Boolean },
    backLabel: {},
    detached: { type: Boolean },
    divider: { type: Boolean },
  };

  declare variant: string | null | undefined;
  declare open: boolean | undefined;
  declare headline: string | null | undefined;
  declare label: string | null | undefined;
  declare closeLabel: string | null | undefined;
  /** Shows the back icon button (React's `backButton`); it fires `back`. */
  declare backButton: boolean | undefined;
  /**
   * Shows the back icon button.
   * @deprecated Since 1.8: use `backButton` (`back-button`); the `back` event stays. Removed in 2.0.
   */
  declare back: boolean | undefined;
  declare backLabel: string | null | undefined;
  declare detached: boolean | undefined;
  declare divider: boolean | undefined;

  #root: HTMLElement | undefined;
  #rootVariant: SideSheetVariant | undefined;
  #scrim: HTMLDivElement | undefined;
  #sheet: HTMLDivElement | undefined;
  #header: HTMLDivElement | undefined;
  #backButton: HTMLButtonElement | undefined;
  #headline: HTMLHeadingElement | undefined;
  #close: HTMLButtonElement | undefined;
  #content: HTMLDivElement | undefined;
  #actions: HTMLDivElement | undefined;
  #layout: SideSheetLayout | undefined;
  #observer: MutationObserver | undefined;
  #sizeAbort: AbortController | undefined;
  /** Adaptive: the window is at least medium (600dp). */
  #wide = false;
  #headlineId = `${SHEET}-${String(++nextId)}`;

  /** The rendered `.m3e-side-sheet` root (a `<dialog>` for the modal sheet). */
  get sheetElement(): HTMLElement | undefined {
    return this.#root;
  }

  /** The variant rendered now (`adaptive` resolved by the window size class). */
  get currentVariant(): SideSheetVariant {
    const v = this.variant;
    if (v === 'adaptive') return adaptiveSideSheetVariant(this.#wide);
    return v === 'modal' ? 'modal' : 'standard';
  }

  show(): void {
    this.#set(true);
  }

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

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
    // New child nodes move into the content (or the actions) on the next update.
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => r.target === this)) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#sizeAbort?.abort();
    this.#sizeAbort = undefined;
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  /** Adaptive: follows the window size class (one media query per breakpoint). */
  #observeSize(): void {
    if (this.variant !== 'adaptive') {
      this.#sizeAbort?.abort();
      this.#sizeAbort = undefined;
      return;
    }
    if (this.#sizeAbort) return;
    this.#sizeAbort = new AbortController();
    observeWindowSizeClass(
      (sizeClass) => {
        const wide = isWidthAtLeastBreakpoint(sizeClass, 'medium');
        if (wide === this.#wide) return;
        this.#wide = wide;
        this.requestUpdate();
      },
      { signal: this.#sizeAbort.signal },
    );
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    this.#observeSize();
    const variant = this.currentVariant;
    if (this.#root && this.#rootVariant !== variant) {
      // A variant switch rebuilds the root (an <aside> or a <dialog>); the parts move across and
      // the sheet keeps its state without animating.
      this.#layout?.destroy();
      this.#layout = undefined;
      this.#root.remove();
      this.#root = undefined;
    }
    const root = (this.#root ??= el(doc, variant === 'modal' ? 'dialog' : 'aside', SHEET));
    this.#rootVariant = variant;
    const open = Boolean(this.open);
    root.className = sideSheetClass(variant, open, Boolean(this.detached), Boolean(this.divider));

    // The host's own child nodes: `slot="actions"` elements are the actions (the attribute is
    // dropped, as <m3e-dialog> does), the rest the content.
    const sheet = (this.#sheet ??= el(doc, 'div', `${SHEET}__sheet`));
    const content = (this.#content ??= el(doc, 'div', `${SHEET}__content`));
    const actions = (this.#actions ??= el(doc, 'div', `${SHEET}__actions`));
    for (const node of [...this.childNodes]) {
      if (node === root) continue;
      if (node instanceof Element && node.getAttribute('slot') === 'actions') {
        node.removeAttribute('slot');
        actions.append(node);
      } else {
        content.append(node);
      }
    }
    if (root.parentNode !== this) this.append(root);

    // Header: [back] [headline] close.
    const header = (this.#header ??= el(doc, 'div', `${SHEET}__header`));
    const parts: Node[] = [];
    // The new name wins; the deprecated `back` attribute is the 1.x alias (D16).
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (this.backButton ?? this.back) {
      const back = (this.#backButton ??= this.#iconButton(doc, 'back', 'arrow_back'));
      setAttr(back, 'aria-label', this.backLabel ?? SIDE_SHEET_BACK_LABEL);
      parts.push(back);
    }
    const headlineText = this.headline ?? '';
    if (headlineText) {
      const headline = (this.#headline ??= el(doc, 'h2', `${SHEET}__headline`));
      headline.id = this.#headlineId;
      if (headline.textContent !== headlineText) headline.textContent = headlineText;
      parts.push(headline);
    }
    const close = (this.#close ??= this.#iconButton(doc, 'close', 'close'));
    setAttr(close, 'aria-label', this.closeLabel ?? SIDE_SHEET_CLOSE_LABEL);
    parts.push(close);
    ensureChildren(header, parts);
    const sheetParts: Node[] = [header, content];
    if (actions.childNodes.length > 0) sheetParts.push(actions);
    ensureChildren(sheet, sheetParts);

    // Name: the headline, else the label (m3.material.io: the role is Dialog; standard: <aside>).
    setAttr(root, 'aria-labelledby', headlineText ? this.#headlineId : null);
    setAttr(root, 'aria-label', headlineText ? null : (this.label ?? SIDE_SHEET_LABEL));

    if (variant === 'modal') {
      const scrim = (this.#scrim ??= el(doc, 'div', `${SHEET}__scrim`));
      scrim.setAttribute('aria-hidden', 'true');
      ensureChildren(root, [scrim, sheet]);
    } else {
      ensureChildren(root, [sheet]);
    }

    if (!this.#layout) {
      this.#layout = new SideSheetLayout(root, {
        open,
        onOpenChange: (value) => {
          if (!this.emit('open-change', { open: value }, { cancelable: true })) return false;
          this.open = value;
          return true;
        },
        onBack: () => {
          this.emit('back', {});
        },
      });
    } else {
      this.#layout.update();
      this.#layout.setOpen(open);
    }
  }

  /** A standard icon button (m3e-css icon-button.css) with a Material Symbols glyph. */
  #iconButton(doc: Document, part: 'back' | 'close', glyph: string): HTMLButtonElement {
    const button = el(doc, 'button', `m3e-icon-button ${SHEET}__${part}`);
    button.type = 'button';
    const icon = el(doc, 'span', 'm3e-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = glyph;
    button.append(icon);
    return button;
  }
}

/** Events of `<m3e-side-sheet>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eSideSheetEventMap extends HTMLElementEventMap {
  /**
   * Opened or closed; cancelable when the sheet asks (close button, Escape, scrim, a close
   * request).
   */
  'open-change': CustomEvent<OpenChangeDetail>;
  /** The back icon button (`back-button`) was pressed. */
  back: CustomEvent<EmptyDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eSideSheet {
  addEventListener<K extends keyof M3eSideSheetEventMap>(
    type: K,
    listener: (this: M3eSideSheet, ev: M3eSideSheetEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eSideSheetEventMap>(
    type: K,
    listener: (this: M3eSideSheet, ev: M3eSideSheetEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
