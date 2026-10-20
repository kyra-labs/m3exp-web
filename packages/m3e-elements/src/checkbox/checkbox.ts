import { M3eElement } from '../base/M3eElement.js';
import { attachRipple } from '../base/ripple.js';

const BLOCK = 'm3e-checkbox';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Each check segment's path: a straight line as long as the 48dp target (checkbox.css).
 * @internal Shared with m3e-react; not part of the public API.
 */
export const CHECKBOX_SEGMENT_PATH = 'M0 0H48';

/** A checkbox presses (and ripples) on Space only: Enter does not toggle it. */
const SPACE: ReadonlySet<string> = new Set([' ']);

/** The three Compose `ToggleableState`s, as the checkbox shows them. */
export type CheckboxState = 'unchecked' | 'checked' | 'indeterminate';

const span = (doc: Document, className: string): HTMLSpanElement => {
  const el = doc.createElement('span');
  el.className = className;
  return el;
};

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

/**
 * Builds the `.m3e-checkbox` contract (m3e-css checkbox.css) inside `root` (a `<label>`):
 * the native input, the box with its mark, the state layer circle and, for a non-empty `text`,
 * the label. Returns the input. m3e-react's `<Checkbox>` renders the same DOM.
 * @internal Shared with m3e-react; not part of the public API.
 */
export function renderCheckbox(root: HTMLLabelElement, text: string): HTMLInputElement {
  const doc = root.ownerDocument;
  root.className = BLOCK;
  const input = doc.createElement('input');
  input.className = `${BLOCK}__input`;
  input.type = 'checkbox';
  const box = span(doc, `${BLOCK}__box`);
  box.setAttribute('aria-hidden', 'true');
  // The check mark: one SVG path per segment of Compose's drawCheck path (checkbox.css).
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `${BLOCK}__mark`);
  svg.setAttribute('focusable', 'false');
  for (let i = 0; i < 2; i++) {
    const path = doc.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', `${BLOCK}__stroke`);
    path.setAttribute('d', CHECKBOX_SEGMENT_PATH);
    svg.append(path);
  }
  box.append(svg);
  const state = span(doc, `${BLOCK}__state`);
  state.setAttribute('aria-hidden', 'true');
  root.replaceChildren(input, box, state);
  if (text) {
    const label = span(doc, `${BLOCK}__label`);
    label.textContent = text;
    root.append(label);
  }
  return input;
}

/**
 * The state a checkbox shows: indeterminate wins over checked (`ToggleableState`).
 * @internal Shared with m3e-react; not part of the public API.
 */
export const checkboxState = (checked: boolean, indeterminate: boolean): CheckboxState =>
  indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked';

/**
 * `<m3e-checkbox checked indeterminate disabled invalid required name value label>Label</m3e-checkbox>`
 * (COMPONENT_SPEC §22): renders the m3e-css checkbox inside itself (the host is
 * `display: contents`) around a native `<input type="checkbox">`, which takes part in forms and
 * fires the native `input` / `change` events. It exists for what HTML cannot declare:
 *
 * - `indeterminate` is only an input property; the attribute sets it.
 * - `data-from` on the `.m3e-checkbox` root keeps the previous state, so a checkbox that turns
 *   indeterminate from unchecked draws the dash instead of morphing the check (Compose snaps the
 *   gravitation there).
 * - The ripple (the 40dp circle, pressed from the label or the input; Space only).
 *
 * The text content is the label (else name it with `label`, the input's `aria-label`).
 * `invalid` sets `aria-invalid` (error colors), `required` `aria-required`. A user toggle updates `checked` and clears
 * `indeterminate`, as the native input does.
 */
export class M3eCheckbox extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    checked: { type: Boolean },
    indeterminate: { type: Boolean },
    disabled: { type: Boolean },
    invalid: { type: Boolean },
    required: { type: Boolean },
    name: {},
    value: {},
    label: {},
  };

  declare checked: boolean | undefined;
  declare indeterminate: boolean | undefined;
  declare disabled: boolean | undefined;
  declare invalid: boolean | undefined;
  declare required: boolean | undefined;
  declare name: string | null | undefined;
  declare value: string | null | undefined;
  declare label: string | null | undefined;

  #root: HTMLLabelElement | undefined;
  #input: HTMLInputElement | undefined;
  #state: CheckboxState | undefined;
  #abort: AbortController | undefined;

  /** The native input (after the first render). */
  get input(): HTMLInputElement | undefined {
    return this.#input;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#abort?.abort();
    this.#abort = undefined;
  }

  protected override update(): void {
    // First render (a microtask after connection, so parsed children exist): keep the text.
    const root = (this.#root ??= this.ownerDocument.createElement('label'));
    const input = (this.#input ??= renderCheckbox(root, this.textContent.trim()));
    if (root.parentNode !== this || this.childNodes.length !== 1) this.replaceChildren(root);
    if (!this.#abort) {
      const abort = (this.#abort = new AbortController());
      input.addEventListener(
        'change',
        () => {
          this.checked = input.checked;
          this.indeterminate = false;
        },
        { signal: abort.signal },
      );
      const layer = root.querySelector<HTMLElement>(`.${BLOCK}__state`);
      if (layer) attachRipple(layer, abort.signal, root, SPACE);
    }
    const checked = this.checked ?? false;
    const indeterminate = this.indeterminate ?? false;
    // The initial state is also the default (form reset), as React renders `checked` at creation.
    if (this.#state === undefined) input.defaultChecked = checked;
    input.checked = checked;
    input.indeterminate = indeterminate;
    input.disabled = this.disabled ?? false;
    setAttr(input, 'tabindex', input.disabled ? null : '0'); // as React Aria's useFocusable
    // React Aria's default (validationBehavior "aria"): aria-required / aria-invalid.
    setAttr(input, 'aria-required', this.required ? 'true' : null);
    setAttr(input, 'aria-invalid', this.invalid ? 'true' : null);
    setAttr(input, 'name', this.name ?? null);
    setAttr(input, 'value', this.value ?? null);
    setAttr(input, 'aria-label', this.label ?? null);
    const state = checkboxState(checked, indeterminate);
    if (this.#state !== undefined && this.#state !== state) setAttr(root, 'data-from', this.#state);
    this.#state = state;
  }
}
