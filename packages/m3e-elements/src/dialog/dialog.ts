import { M3eElement } from '../base/M3eElement.js';
import { DialogLayout } from '../dialog-layout/dialog-layout.js';

export type DialogVariant = 'alert' | 'custom' | 'full-screen';

const DIALOG = 'm3e-dialog';
const VARIANTS: readonly DialogVariant[] = ['alert', 'custom', 'full-screen'];
/** Compose `Strings.Dialog`, BasicAlertDialog's pane title (material3 res strings.xml L21). */
export const DIALOG_PANE_TITLE = 'Dialog';
/** The full-screen close affordance's name (m3.material.io: the close "X" icon button). */
export const DIALOG_CLOSE_LABEL = 'Close';

let nextId = 0;
const uid = () => `${DIALOG}-${String(++nextId)}`;

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

/**
 * `<m3e-dialog headline="Title" open>Text<button slot="actions">OK</button></m3e-dialog>`
 * (COMPONENT_SPEC §29; Compose AlertDialog / BasicAlertDialog and m3.material.io's full-screen
 * dialog). Renders the m3e-css `.m3e-dialog` contract inside itself (a native `<dialog>`; the host
 * is `display: contents`) and runs {@link DialogLayout} (shared with m3e-react): `showModal()`,
 * the open / close motion, Tab kept inside, Escape / the scrim / the close button asking to close,
 * focus returned to the opener.
 *
 * - `variant`: `alert` (default; `role="alertdialog"`, m3.material.io's web role, named by the
 *   headline and described by the content), `custom` (BasicAlertDialog: the children are the whole
 *   dialog, which draws its own surface; a plain `<dialog>`), `full-screen` (a header with a close
 *   button and the headline; full-screen below 600dp, a basic dialog above; a plain `<dialog>`).
 * - `headline`, `icon` (alert: a Material Symbols name above the headline), `label` (the dialog's
 *   name when it has no headline; default "Dialog", Compose's pane title), `close-label`
 *   (full-screen: the close button's name, default "Close").
 * - Children with `slot="actions"` (text buttons; the dismiss button first) go into the actions
 *   row; the other child nodes are the content (the supporting text).
 * - `open` (reflected). Methods `show()`, `close()`. Event `open-change` (`detail: { open }`),
 *   cancelable when Escape, the scrim, the close button or a browser close request asks to close
 *   (`preventDefault()` keeps it open; Compose's onDismissRequest).
 */
export class M3eDialog extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    open: { type: Boolean, reflect: true },
    variant: { reflect: true },
    headline: {},
    icon: {},
    label: {},
    closeLabel: {},
  };

  declare open: boolean | undefined;
  declare variant: string | null | undefined;
  declare headline: string | null | undefined;
  declare icon: string | null | undefined;
  declare label: string | null | undefined;
  declare closeLabel: string | null | undefined;

  #dialog: HTMLDialogElement | undefined;
  #scrim: HTMLDivElement | undefined;
  #container: HTMLDivElement | undefined;
  #icon: HTMLSpanElement | undefined;
  #header: HTMLDivElement | undefined;
  #close: HTMLButtonElement | undefined;
  #headline: HTMLHeadingElement | undefined;
  #content: HTMLDivElement | undefined;
  #actions: HTMLDivElement | undefined;
  #layout: DialogLayout | undefined;
  #observer: MutationObserver | undefined;
  #ids = { headline: uid(), content: uid() };

  /** The rendered `<dialog class="m3e-dialog">`. */
  get dialogElement(): HTMLDialogElement | undefined {
    return this.#dialog;
  }

  /** Opens it (`open-change`). */
  show(): void {
    this.#set(true);
  }

  /** Closes it (`open-change`). */
  close(): void {
    this.#set(false);
  }

  #set(open: boolean): void {
    if (Boolean(this.open) === open) return;
    this.open = open;
    this.emit('open-change', { open });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
    // New child nodes move into the dialog on the next update.
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => r.target === this)) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  #variant(): DialogVariant {
    const v = this.variant as DialogVariant | null | undefined;
    return v && VARIANTS.includes(v) ? v : 'alert';
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const variant = this.#variant();
    const dialog = (this.#dialog ??= el(doc, 'dialog', DIALOG));
    const scrim = (this.#scrim ??= el(doc, 'div', `${DIALOG}__scrim`));
    scrim.setAttribute('aria-hidden', 'true');
    const container = (this.#container ??= el(doc, 'div', `${DIALOG}__container`));
    const content = (this.#content ??= el(doc, 'div', `${DIALOG}__content`));
    const actions = (this.#actions ??= el(doc, 'div', `${DIALOG}__actions`));
    dialog.className = variant === 'alert' ? DIALOG : `${DIALOG} ${DIALOG}--${variant}`;

    // Custom content lives in the container, other variants' content in __content: a variant
    // switch moves it across.
    const movable = [this.#icon, this.#header, this.#headline, content, actions];
    if (variant === 'custom') {
      for (const part of movable) if (part?.parentNode === container) part.remove();
      container.append(...content.childNodes);
    } else {
      const loose = [...container.childNodes].filter((n) => !movable.includes(n as HTMLElement));
      content.prepend(...loose);
    }
    // The host's own child nodes: actions (slot="actions") and content.
    const incoming = [...this.childNodes].filter((n) => n !== dialog);
    for (const node of incoming) {
      if (node instanceof Element && node.getAttribute('slot') === 'actions') {
        node.removeAttribute('slot');
        actions.append(node);
      } else {
        (variant === 'custom' ? container : content).append(node);
      }
    }
    if (dialog.parentNode !== this) this.append(dialog);

    const headlineText = this.headline ?? '';
    let headline: HTMLHeadingElement | null = null;
    if (variant !== 'custom' && headlineText) {
      headline = this.#headline ??= el(doc, 'h2', `${DIALOG}__headline`);
      headline.id = this.#ids.headline;
      if (headline.textContent !== headlineText) headline.textContent = headlineText;
    }
    const hasContent = content.childNodes.length > 0;
    const hasActions = actions.childNodes.length > 0;
    const parts: Node[] = [];
    if (variant === 'custom') {
      // BasicAlertDialog: the children are the dialog (moved in above).
    } else if (variant === 'full-screen') {
      const header = (this.#header ??= el(doc, 'div', `${DIALOG}__header`));
      const close = (this.#close ??= this.#closeButton(doc));
      setAttr(close, 'aria-label', this.closeLabel ?? DIALOG_CLOSE_LABEL);
      ensureChildren(header, headline ? [close, headline] : [close]);
      parts.push(header, content);
      if (hasActions) parts.push(actions);
      ensureChildren(container, parts);
    } else {
      if (this.icon) {
        const icon = (this.#icon ??= el(doc, 'span', `m3e-icon ${DIALOG}__icon`));
        icon.setAttribute('aria-hidden', 'true');
        if (icon.textContent !== this.icon) icon.textContent = this.icon;
        parts.push(icon);
      }
      if (headline) parts.push(headline);
      if (hasContent) parts.push(content);
      if (hasActions) parts.push(actions);
      ensureChildren(container, parts);
    }
    ensureChildren(dialog, [scrim, container]);

    // Names: alertdialog (m3.material.io web) named by the headline, described by the text.
    content.id = variant === 'alert' && hasContent ? this.#ids.content : '';
    if (!content.id) content.removeAttribute('id');
    setAttr(dialog, 'role', variant === 'alert' ? 'alertdialog' : null);
    setAttr(dialog, 'aria-labelledby', headline ? headline.id : null);
    setAttr(dialog, 'aria-label', headline ? null : (this.label ?? DIALOG_PANE_TITLE));
    setAttr(dialog, 'aria-describedby', variant === 'alert' && hasContent ? content.id : null);

    const open = Boolean(this.open);
    if (!this.#layout) {
      this.#layout = new DialogLayout(dialog, {
        open,
        onOpenChange: (value) => {
          if (!this.emit('open-change', { open: value }, { cancelable: true })) return false;
          this.open = value;
          return true;
        },
      });
    } else {
      this.#layout.setOpen(open);
    }
  }

  /** A standard icon button with the close icon (m3e-css icon-button.css). */
  #closeButton(doc: Document): HTMLButtonElement {
    const button = el(doc, 'button', `m3e-icon-button ${DIALOG}__close`);
    button.type = 'button';
    const icon = el(doc, 'span', 'm3e-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'close';
    button.append(icon);
    return button;
  }
}
