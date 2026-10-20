import { M3eElement } from '../base/M3eElement.js';
import type {
  BottomSheetLayout,
  BottomSheetVariant,
  SheetValue,
} from '../bottom-sheet-layout/bottom-sheet-layout.js';
import {
  BOTTOM_SHEET_DRAG_HANDLE_LABEL,
  BOTTOM_SHEET_PANE_TITLE,
} from '../bottom-sheet-layout/strings.js';
import type { TooltipController } from '../tooltip-popup/tooltip-popup.js';
import type { OpenChangeDetail } from '../base/events.js';

const SHEET = 'm3e-bottom-sheet';
const VALUES: readonly SheetValue[] = ['hidden', 'partially-expanded', 'expanded'];

let nextId = 0;
const uid = () => `${SHEET}-${String(++nextId)}`;

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

/** `value-change` detail of `<m3e-bottom-sheet>`. */
export interface SheetValueChangeDetail {
  value: SheetValue;
}

/** The root's class for a variant, a value and the peek option (bottom-sheet.css). */
export function bottomSheetClass(
  variant: BottomSheetVariant,
  value: SheetValue,
  peek: boolean,
): string {
  return [
    SHEET,
    variant === 'modal' ? `${SHEET}--modal` : null,
    peek ? `${SHEET}--peek` : null,
    value === 'hidden' ? null : `${SHEET}--${value}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * `<m3e-bottom-sheet variant="modal" value="partially-expanded">…</m3e-bottom-sheet>`
 * (COMPONENT_SPEC §30; Compose BottomSheet / ModalBottomSheet). Renders the m3e-css
 * `.m3e-bottom-sheet` contract inside itself (the host is `display: contents`; m3e-css places the
 * sheet at rest from its value) and runs {@link BottomSheetLayout} (shared with m3e-react): the
 * anchors and springs, drags, the drag handle, and for the modal sheet the dialog window. The
 * layout comes from the `bottom-sheet-layout.js` entry, imported when the element first renders
 * (D17: the two are measured apart; `ready` resolves once it runs); a request made before (a
 * method) still asks and sets `value`, which the layout then starts from.
 *
 * - `variant`: `standard` (default; Compose BottomSheet: fixed to the bottom of its positioned
 *   container, a region named `label`) or `modal` (ModalBottomSheet: a `<dialog>` named `label`
 *   over a scrim).
 * - `value` (reflected): `hidden` (default), `partially-expanded`, `expanded`. `open`
 *   (reflected): whether `value` is not `hidden`; setting it shows or hides the sheet.
 *   `skip-partially-expanded` drops the partially expanded state. `peek-height` (px; empty: 56,
 *   standard only) makes PartiallyExpanded show that much of the sheet (BottomSheetScaffold's
 *   sheetPeekHeight); `skip-hidden-state` then drops Hidden.
 * - `no-drag-handle` (Compose `dragHandle = null`), `drag-handle-label` (default "Drag handle"),
 *   `gestures-disabled` (no drags or handle arrow keys), `label` (default "Bottom Sheet").
 * - The child nodes are the content. The drag handle carries the plain tooltip Compose builds in
 *   (owner decision M9 #30): `<m3e-tooltip>`'s TooltipController, imported from the
 *   `tooltip-popup.js` entry when the handle is first rendered (outside this entry's D17 budget).
 *   The tooltip repeats the handle's name, so it is `aria-hidden` (owner decision M9 #2).
 * - Methods `show()`, `hide()`, `expand()`, `partialExpand()` (Compose SheetState); `ready`.
 *   Events
 *   `value-change` (`detail: { value }`), cancelable when the sheet asks (the handle, a drag,
 *   Escape, the scrim, the methods): `preventDefault()` keeps it (Compose confirmValueChange;
 *   `hidden` is onDismissRequest); then, when that shows or hides the sheet, `open-change`
 *   (`detail: { open }`, as the other modal elements; cancelable the same way).
 */
export class M3eBottomSheet extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    variant: { reflect: true },
    value: { reflect: true },
    open: { type: Boolean, reflect: true },
    skipPartiallyExpanded: { type: Boolean },
    peekHeight: {},
    skipHiddenState: { type: Boolean },
    noDragHandle: { type: Boolean },
    dragHandleLabel: {},
    gesturesDisabled: { type: Boolean },
    label: {},
  }))();

  declare variant: string | null | undefined;
  declare value: string | null | undefined;
  /**
   * Whether the sheet shows (reflected): `value` is not `hidden`. Setting it shows the sheet (as
   * `show()` would pick: partially expanded, or expanded when that is skipped) or hides it, like
   * setting `value` (no events).
   */
  declare open: boolean | undefined;
  declare skipPartiallyExpanded: boolean | undefined;
  declare peekHeight: string | null | undefined;
  declare skipHiddenState: boolean | undefined;
  declare noDragHandle: boolean | undefined;
  declare dragHandleLabel: string | null | undefined;
  declare gesturesDisabled: boolean | undefined;
  declare label: string | null | undefined;

  #root: HTMLElement | undefined;
  #rootVariant: BottomSheetVariant | undefined;
  #scrim: HTMLDivElement | undefined;
  #sheet: HTMLDivElement | undefined;
  #handle: HTMLButtonElement | undefined;
  #tip: HTMLDivElement | undefined;
  #tooltip: TooltipController | undefined;
  #tooltipLoading = false;
  #content: HTMLDivElement | undefined;
  #layout: BottomSheetLayout | undefined;
  #layoutLoad: Promise<void> | undefined;
  #observer: MutationObserver | undefined;
  #ids = { handle: uid(), tip: uid() };

  /** The rendered `.m3e-bottom-sheet` root (a `<dialog>` for the modal sheet). */
  get sheetElement(): HTMLElement | undefined {
    return this.#root;
  }

  /** The value it last settled on (SheetState.currentValue). */
  get currentValue(): SheetValue {
    return this.#layout?.currentValue ?? this.#value();
  }

  /** Resolves once the layout (the lazily imported bottom-sheet-layout entry) runs. */
  get ready(): Promise<void> {
    return (this.#layoutLoad ??= this.#loadLayout());
  }

  /** SheetState.show(): PartiallyExpanded, or Expanded when skipped. */
  show(): void {
    if (this.#layout) this.#layout.show();
    else this.#ask(this.skipPartiallyExpanded ? 'expanded' : 'partially-expanded');
  }

  /** SheetState.hide(). */
  hide(): void {
    if (this.#layout) this.#layout.hide();
    else if (!(this.skipHiddenState && this.peekHeight != null)) this.#ask('hidden');
  }

  /** SheetState.expand(). */
  expand(): void {
    if (this.#layout) this.#layout.expand();
    else this.#ask('expanded');
  }

  /** SheetState.partialExpand(). */
  partialExpand(): void {
    if (this.#layout) this.#layout.partialExpand();
    else if (!this.skipPartiallyExpanded) this.#ask('partially-expanded');
  }

  /**
   * Asks (cancelable `value-change`, then a cancelable `open-change` when the sheet shows or hides),
   * then takes the value: what the layout does once loaded.
   */
  #ask(value: SheetValue): boolean {
    const from = this.#value();
    if (value === from) return true;
    if (
      !this.emit('value-change', { value } satisfies SheetValueChangeDetail, { cancelable: true })
    )
      return false;
    const open = value !== 'hidden';
    if (
      open !== (from !== 'hidden') &&
      !this.emit('open-change', { open } satisfies OpenChangeDetail, { cancelable: true })
    )
      return false;
    this.value = value;
    return true;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
    // New child nodes move into the content on the next update.
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => r.target === this)) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#teardown();
  }

  #teardown(): void {
    this.#layout?.destroy();
    this.#layout = undefined;
    this.#layoutLoad = undefined;
    this.#tooltip?.destroy();
    this.#tooltip = undefined;
    this.#tooltipLoading = false;
  }

  #variant(): BottomSheetVariant {
    return this.variant === 'modal' ? 'modal' : 'standard';
  }

  #value(): SheetValue {
    const v = this.value as SheetValue | null | undefined;
    return v && VALUES.includes(v) ? v : 'hidden';
  }

  protected override update(changed: ReadonlySet<string>): void {
    const doc = this.ownerDocument;
    const variant = this.#variant();
    if (this.#root && this.#rootVariant !== variant) {
      // A variant switch rebuilds the root (a <div> or a <dialog>); the parts move across.
      this.#teardown();
      this.#root.remove();
      this.#root = undefined;
    }
    const root = (this.#root ??= el(doc, variant === 'modal' ? 'dialog' : 'div', SHEET));
    this.#rootVariant = variant;
    const sheet = (this.#sheet ??= el(doc, 'div', `${SHEET}__sheet`));
    const content = (this.#content ??= el(doc, 'div', `${SHEET}__content`));
    const peekText = this.peekHeight;
    const peek = variant === 'standard' && peekText !== null && peekText !== undefined;
    // `open` (a boolean view of `value`): setting it shows or hides the sheet, like `value`.
    if (
      changed.has('open') &&
      this.open !== undefined &&
      this.open !== (this.#value() !== 'hidden')
    ) {
      if (this.open) this.value = this.skipPartiallyExpanded ? 'expanded' : 'partially-expanded';
      else if (!(this.skipHiddenState && peek)) this.value = 'hidden';
    }
    const value = this.#value();
    if (this.open !== (value !== 'hidden')) this.open = value !== 'hidden';
    root.className = bottomSheetClass(variant, value, peek);
    const peekPx = peek ? Number.parseFloat(peekText) : Number.NaN;
    if (Number.isFinite(peekPx)) {
      root.style.setProperty('--m3e-comp-bottom-sheet-peek-height', `${String(peekPx)}px`);
    } else {
      root.style.removeProperty('--m3e-comp-bottom-sheet-peek-height');
    }
    if (root.getAttribute('style') === '') root.removeAttribute('style');

    // The host's own child nodes are the content.
    const incoming = [...this.childNodes].filter((n) => n !== root);
    content.append(...incoming);
    if (root.parentNode !== this) this.append(root);

    // Names: the modal dialog or the standard sheet (a region) is "Bottom Sheet".
    const label = this.label ?? BOTTOM_SHEET_PANE_TITLE;
    setAttr(root, 'aria-label', variant === 'modal' ? label : null);
    setAttr(sheet, 'role', variant === 'modal' ? null : 'region');
    setAttr(sheet, 'aria-label', variant === 'modal' ? null : label);

    const parts: Node[] = [];
    if (!this.noDragHandle) {
      const handle = (this.#handle ??= this.#createHandle(doc));
      const tip = (this.#tip ??= this.#createTip(doc));
      const handleLabel = this.dragHandleLabel ?? BOTTOM_SHEET_DRAG_HANDLE_LABEL;
      setAttr(handle, 'aria-label', handleLabel);
      if (tip.textContent !== handleLabel) tip.textContent = handleLabel;
      parts.push(handle, tip);
    }
    parts.push(content);
    ensureChildren(sheet, parts);
    if (variant === 'modal') {
      const scrim = (this.#scrim ??= el(doc, 'div', `${SHEET}__scrim`));
      scrim.setAttribute('aria-hidden', 'true');
      ensureChildren(root, [scrim, sheet]);
    } else {
      ensureChildren(root, [sheet]);
    }
    this.#bindTooltip();

    const options = {
      skipPartiallyExpanded: Boolean(this.skipPartiallyExpanded),
      skipHiddenState: Boolean(this.skipHiddenState),
      gesturesEnabled: !this.gesturesDisabled,
    };
    if (!this.#layout) {
      void this.ready;
    } else {
      this.#layout.update();
      if (
        changed.has('skipPartiallyExpanded') ||
        changed.has('skipHiddenState') ||
        changed.has('gesturesDisabled') ||
        changed.has('peekHeight')
      ) {
        this.#layout.setOptions(options);
      }
      this.#layout.setValue(value);
    }
  }

  #loadLayout(): Promise<void> {
    return import('@kyralabs/m3e-elements/bottom-sheet-layout.js').then(({ BottomSheetLayout }) => {
      const root = this.#root;
      if (this.#layout || !root || !this.isConnected) return;
      this.#layout = new BottomSheetLayout(root, {
        value: this.#value(),
        skipPartiallyExpanded: Boolean(this.skipPartiallyExpanded),
        skipHiddenState: Boolean(this.skipHiddenState),
        gesturesEnabled: !this.gesturesDisabled,
        onValueChange: (next) => this.#ask(next),
      });
    });
  }

  /** BottomSheetDefaults.DragHandle: a 32 × 48dp button around the 32 × 4dp bar. */
  #createHandle(doc: Document): HTMLButtonElement {
    const handle = el(doc, 'button', `${SHEET}__handle`);
    handle.type = 'button';
    handle.id = this.#ids.handle;
    handle.append(el(doc, 'span', `${SHEET}__handle-bar`));
    return handle;
  }

  /** DragHandleWithTooltip: TooltipBox(Above) with a PlainTooltip of the handle's name. */
  #createTip(doc: Document): HTMLDivElement {
    const tip = el(doc, 'div', 'm3e-tooltip');
    tip.id = this.#ids.tip;
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('popover', 'manual');
    // Its text is the handle's name (both come from drag-handle-label): not a description.
    tip.setAttribute('aria-hidden', 'true');
    return tip;
  }

  /** Binds the handle's tooltip (the controller is loaded on first use). */
  #bindTooltip(): void {
    const handle = this.noDragHandle ? null : (this.#handle ?? null);
    const tip = this.#tip;
    if (!handle || !tip) {
      this.#tooltip?.setAnchor(null);
      return;
    }
    if (this.#tooltip) {
      this.#tooltip.setAnchor(handle);
      return;
    }
    if (this.#tooltipLoading) return;
    this.#tooltipLoading = true;
    void import('@kyralabs/m3e-elements/tooltip-popup.js').then(({ TooltipController }) => {
      const tooltip = new TooltipController({
        tooltip: tip,
        onVisibleChange: (visible) => {
          tooltip.render(visible);
        },
      });
      this.#tooltip = tooltip;
      if (this.isConnected) this.#bindTooltip();
    });
  }
}

/** Events of `<m3e-bottom-sheet>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eBottomSheetEventMap extends HTMLElementEventMap {
  /** The sheet asks for a value; cancelable (Compose confirmValueChange). */
  'value-change': CustomEvent<SheetValueChangeDetail>;
  /** After `value-change`, when it shows or hides the sheet; cancelable. */
  'open-change': CustomEvent<OpenChangeDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eBottomSheet {
  addEventListener<K extends keyof M3eBottomSheetEventMap>(
    type: K,
    listener: (this: M3eBottomSheet, ev: M3eBottomSheetEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eBottomSheetEventMap>(
    type: K,
    listener: (this: M3eBottomSheet, ev: M3eBottomSheetEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
