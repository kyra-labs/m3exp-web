import { M3eElement } from '../base/M3eElement.js';
import {
  TEXT_FIELD_COUNTER_LABEL,
  type TextFieldLabelPosition,
  type TextFieldVariant,
  growTextFieldInput,
  textFieldClassName,
  textFieldCounterText,
  textFieldDescribedBy,
} from '../text-field-layout/text-field-layout.js';

const BLOCK = 'm3e-text-field';

let instances = 0;

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

const el = <K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] => {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
};

/** What the field holds; a change rebuilds it (the input itself is kept unless multiline flips). */
export interface TextFieldParts {
  readonly id: string;
  readonly variant: TextFieldVariant;
  readonly labelPosition: TextFieldLabelPosition | undefined;
  readonly multiline: boolean;
  readonly label: string;
  readonly leadingIcon: string;
  readonly trailingIcon: string;
  readonly prefix: string;
  readonly suffix: string;
  /** The supporting line's message (supporting text, or the error text while invalid). */
  readonly message: string;
  readonly error: boolean;
  readonly counter: boolean;
  readonly counterLabel: string;
}

/** The ids of a field's parts (the input's id is `parts.id`). */
export const textFieldIds = (id: string) =>
  ({
    label: `${id}-label`,
    supporting: `${id}-supporting`,
    counter: `${id}-counter`,
  }) as const;

/**
 * Builds the `.m3e-text-field` children (m3e-css text-field.css) inside `root` in contract order:
 * the container (leading icon, label, prefix, the input, suffix, trailing icon and, outlined, the
 * outline fieldset with the notch legend), then the supporting row (message, counter). Reuses
 * `input` when its element type still fits. Returns the input. m3e-react's `<TextField>` renders
 * the same DOM.
 */
export function renderTextField(
  root: HTMLElement,
  parts: TextFieldParts,
  input?: HTMLInputElement | HTMLTextAreaElement,
): HTMLInputElement | HTMLTextAreaElement {
  const doc = root.ownerDocument;
  const ids = textFieldIds(parts.id);
  root.className = textFieldClassName(parts);
  const container = el(doc, 'div', `${BLOCK}__container`);
  const icon = (slot: 'leading' | 'trailing', name: string) => {
    const box = el(doc, 'span', `${BLOCK}__${slot}`);
    box.setAttribute('aria-hidden', 'true');
    const glyph = el(doc, 'span', 'm3e-icon');
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = name;
    box.append(glyph);
    return box;
  };
  if (parts.leadingIcon) container.append(icon('leading', parts.leadingIcon));
  if (parts.label) {
    const label = el(doc, 'label', `${BLOCK}__label`);
    label.id = ids.label;
    label.htmlFor = parts.id;
    label.textContent = parts.label;
    container.append(label);
  }
  if (parts.prefix) {
    const prefix = el(doc, 'span', `${BLOCK}__prefix`);
    prefix.textContent = parts.prefix;
    container.append(prefix);
  }
  const tag = parts.multiline ? 'textarea' : 'input';
  const field = input?.localName === tag ? input : el(doc, tag, `${BLOCK}__input`);
  field.className = `${BLOCK}__input`;
  container.append(field);
  if (parts.suffix) {
    const suffix = el(doc, 'span', `${BLOCK}__suffix`);
    suffix.textContent = parts.suffix;
    container.append(suffix);
  }
  if (parts.trailingIcon) container.append(icon('trailing', parts.trailingIcon));
  if (parts.variant === 'outlined') {
    const outline = el(doc, 'fieldset', `${BLOCK}__outline`);
    outline.setAttribute('aria-hidden', 'true');
    if (parts.label && parts.labelPosition !== 'above') {
      const notch = el(doc, 'legend', `${BLOCK}__notch`);
      const text = doc.createElement('span');
      text.textContent = parts.label;
      notch.append(text);
      outline.append(notch);
    }
    container.append(outline);
  }
  const children: Element[] = [container];
  if (parts.message || parts.counter) {
    const supporting = el(doc, 'div', `${BLOCK}__supporting`);
    if (parts.message) {
      const message = el(doc, 'span', `${BLOCK}__supporting-text`);
      message.id = ids.supporting;
      // m3.material.io: the error message has the "alert" role.
      if (parts.error) message.setAttribute('role', 'alert');
      message.textContent = parts.message;
      supporting.append(message);
    }
    if (parts.counter) {
      const counter = el(doc, 'span', `${BLOCK}__counter`);
      counter.id = ids.counter;
      const a11y = el(doc, 'span', `${BLOCK}__a11y`);
      a11y.textContent = `${parts.counterLabel}, `;
      counter.append(a11y, doc.createTextNode(''));
      supporting.append(counter);
    }
    children.push(supporting);
  }
  root.replaceChildren(...children);
  return field;
}

/**
 * `<m3e-text-field label="Email" variant="outlined">` (COMPONENT_SPEC §26): renders the m3e-css
 * text field inside itself (the host is `display: contents`) around a native `<input>` (or, with
 * `multiline`, a `<textarea>`) that takes part in forms and fires the native `input` / `change`
 * events. The label float, colors and outlined notch are CSS; the element adds what CSS cannot:
 *
 * - the live character counter (`maxlength`: "n/max", read as "Character count, n/max");
 * - a growing textarea where CSS `field-sizing: content` is missing (Compose's multi-line field
 *   grows with its lines);
 * - the `value` property kept in step with what the user types.
 *
 * Attributes: `variant` (filled, the default, or outlined), `label`, `label-position` (`above`;
 * inside / cutout follow the variant), `value`, `placeholder`, `type`, `name`, `autocomplete`,
 * `inputmode`, `supporting-text`, `error-text` (shown instead of the supporting text while
 * `invalid`), `invalid` (aria-invalid: error colors), `disabled`, `readonly`, `required`
 * (aria-required and the "*"), `maxlength` (with the counter), `multiline`, `leading-icon`,
 * `trailing-icon` (Material Symbols names), `prefix-text`, `suffix-text`, `counter-label`.
 */
export class M3eTextField extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    variant: {},
    label: {},
    labelPosition: {},
    value: {},
    placeholder: {},
    type: {},
    name: {},
    autocomplete: {},
    inputmode: {},
    supportingText: {},
    errorText: {},
    invalid: { type: Boolean },
    disabled: { type: Boolean },
    readonly: { type: Boolean },
    required: { type: Boolean },
    maxlength: { type: Number },
    multiline: { type: Boolean },
    leadingIcon: {},
    trailingIcon: {},
    prefixText: {},
    suffixText: {},
    counterLabel: {},
  };

  declare variant: string | null | undefined;
  declare label: string | null | undefined;
  declare labelPosition: string | null | undefined;
  declare value: string | null | undefined;
  declare placeholder: string | null | undefined;
  declare type: string | null | undefined;
  declare name: string | null | undefined;
  declare autocomplete: string | null | undefined;
  declare inputmode: string | null | undefined;
  declare supportingText: string | null | undefined;
  declare errorText: string | null | undefined;
  declare invalid: boolean | undefined;
  declare disabled: boolean | undefined;
  declare readonly: boolean | undefined;
  declare required: boolean | undefined;
  declare maxlength: number | null | undefined;
  declare multiline: boolean | undefined;
  declare leadingIcon: string | null | undefined;
  declare trailingIcon: string | null | undefined;
  declare prefixText: string | null | undefined;
  declare suffixText: string | null | undefined;
  declare counterLabel: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #input: HTMLInputElement | HTMLTextAreaElement | undefined;
  #parts = '';
  #id = `${BLOCK}-${String(++instances)}`;
  #abort: AbortController | undefined;
  #initialized = false;

  /** The native input (or textarea), after the first render. */
  get input(): HTMLInputElement | HTMLTextAreaElement | undefined {
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

  #maxLength(): number | undefined {
    const max = this.maxlength;
    return typeof max === 'number' && Number.isFinite(max) && max >= 0 ? max : undefined;
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const root = (this.#root ??= doc.createElement('div'));
    if (root.parentNode !== this || this.childNodes.length !== 1) this.replaceChildren(root);
    const max = this.#maxLength();
    const error = (this.invalid ?? false) && Boolean(this.errorText);
    const parts: TextFieldParts = {
      id: this.#id,
      variant: this.variant === 'outlined' ? 'outlined' : 'filled',
      labelPosition: this.labelPosition === 'above' ? 'above' : undefined,
      multiline: this.multiline ?? false,
      label: this.label ?? '',
      leadingIcon: this.leadingIcon ?? '',
      trailingIcon: this.trailingIcon ?? '',
      prefix: this.prefixText ?? '',
      suffix: this.suffixText ?? '',
      message: (error ? this.errorText : this.supportingText) ?? '',
      error,
      counter: max !== undefined,
      counterLabel: this.counterLabel ?? TEXT_FIELD_COUNTER_LABEL,
    };
    const key = JSON.stringify(parts);
    if (key !== this.#parts) {
      this.#parts = key;
      const focused = this.#input !== undefined && doc.activeElement === this.#input;
      const input = renderTextField(root, parts, this.#input);
      if (input !== this.#input) {
        this.#input = input;
        this.#abort?.abort();
        this.#abort = undefined;
      }
      if (focused) input.focus();
    }
    const input = this.#input;
    if (!input) return;
    if (!this.#abort) {
      const abort = (this.#abort = new AbortController());
      input.addEventListener(
        'input',
        () => {
          this.value = input.value;
        },
        { signal: abort.signal },
      );
    }
    this.#syncInput(input, parts, max);
  }

  #syncInput(
    input: HTMLInputElement | HTMLTextAreaElement,
    parts: TextFieldParts,
    max: number | undefined,
  ): void {
    const ids = textFieldIds(parts.id);
    input.id = parts.id;
    if (input instanceof HTMLInputElement) setAttr(input, 'type', this.type ?? 'text');
    else setAttr(input, 'rows', '1');
    // Without placeholder text, " ": the resting label reads :placeholder-shown (text-field.css).
    setAttr(input, 'placeholder', this.placeholder ?? ' ');
    setAttr(input, 'name', this.name ?? null);
    setAttr(input, 'autocomplete', this.autocomplete ?? null);
    setAttr(input, 'inputmode', this.inputmode ?? null);
    setAttr(input, 'maxlength', max === undefined ? null : String(max));
    setAttr(input, 'aria-labelledby', parts.label ? ids.label : null);
    setAttr(
      input,
      'aria-describedby',
      textFieldDescribedBy(
        parts.message ? ids.supporting : undefined,
        parts.counter ? ids.counter : undefined,
      ) ?? null,
    );
    setAttr(input, 'aria-invalid', this.invalid ? 'true' : null);
    setAttr(input, 'aria-required', this.required ? 'true' : null);
    input.disabled = this.disabled ?? false;
    input.readOnly = this.readonly ?? false;
    const value = this.value ?? '';
    // The first value is also the default (form reset), as React renders `value` at creation.
    if (!this.#initialized) {
      this.#initialized = true;
      input.defaultValue = value;
    }
    if (input.value !== value) input.value = value;
    if (max !== undefined) {
      const counter = this.#root?.querySelector(`.${BLOCK}__counter`);
      const text = counter?.lastChild;
      if (text && text.textContent !== textFieldCounterText(input.value.length, max)) {
        text.textContent = textFieldCounterText(input.value.length, max);
      }
    }
    growTextFieldInput(input);
  }
}
