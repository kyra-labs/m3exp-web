import {
  type DateInputFormat,
  type DateInputIdentifier,
  type DateInputValidation,
  dateInputTransform,
  dateOutputTransform,
  formatWithPattern,
  parseDate,
  validateDateInput,
} from '@kyralabs/m3e-motion';
import { uid } from '../base/uid.js';
import { el, setAttr, setText } from '../time-picker-layout/shared.js';

const TF = 'm3e-text-field';

/** What a date field needs (DateInputTextField, DateInput.kt L111–244). */
export interface DateFieldOptions {
  /** "Date", "Start date", "End date". */
  label: string;
  format: DateInputFormat;
  /** The locale's zero digit (formatWithPattern's DecimalStyle). */
  zeroDigit: string;
  input: DateInputIdentifier;
  /** The validator's state now (the other range date changes it). */
  validation: () => DateInputValidation;
  /** onDateSelectionChange: a complete, valid date, or null. */
  onSelection: (millis: number | null) => void;
}

/**
 * An outlined m3e-css text field for one date: the field holds digits only and shows the
 * delimiters (DateInputTransformation / DateOutputTransformation over m3e-motion's port), the
 * pattern as its placeholder ("MM/DD/YYYY"), and the validator's error under it once complete.
 */
export class DateField {
  readonly root: HTMLElement;
  readonly input: HTMLInputElement;
  #label: HTMLLabelElement;
  #notch: HTMLElement;
  #o: DateFieldOptions;
  #digits = '';
  #before = { digits: '', caret: 0 };
  #supporting: HTMLElement | null = null;

  constructor(doc: Document, options: DateFieldOptions, signal: AbortSignal) {
    this.#o = options;
    const id = uid('m3e-date-field');
    this.root = el(doc, 'div', `${TF} ${TF}--outlined`);
    const container = el(doc, 'div', `${TF}__container`);
    const label = el(doc, 'label', `${TF}__label`, { for: id });
    this.input = el(doc, 'input', `${TF}__input`, {
      id,
      type: 'text',
      inputmode: 'numeric',
      autocomplete: 'off',
      spellcheck: 'false',
    });
    const outline = el(doc, 'fieldset', `${TF}__outline`, { 'aria-hidden': 'true' });
    const notch = el(doc, 'legend', `${TF}__notch`);
    this.#label = label;
    this.#notch = el(doc, 'span', '');
    notch.append(this.#notch);
    outline.append(notch);
    container.append(label, this.input, outline);
    this.root.append(container);
    this.input.addEventListener(
      'beforeinput',
      () => {
        this.#before = { digits: this.#digits, caret: this.input.selectionStart ?? 0 };
      },
      { signal },
    );
    this.input.addEventListener(
      'input',
      (e) => {
        this.#edit(e);
      },
      { signal },
    );
    this.update(options);
  }

  get digits(): string {
    return this.#digits;
  }

  update(options: DateFieldOptions): void {
    this.#o = options;
    const pattern = options.format.patternWithDelimiters.toUpperCase();
    setText(this.#label, options.label);
    setText(this.#notch, options.label);
    setAttr(this.input, 'placeholder', pattern);
    // The label's description (DateInput.kt L90–95): "Date, MM/DD/YYYY".
    setAttr(this.input, 'aria-label', `${options.label}, ${pattern}`);
    this.#render(this.input.selectionStart);
  }

  /** LaunchedEffect(initialDateMillis) (L235–244): a date set from outside replaces the text. */
  setDate(millis: number | null): void {
    if (millis === null) return;
    const digits = formatWithPattern(
      millis,
      this.#o.format.patternWithoutDelimiters,
      this.#o.zeroDigit,
    );
    if (digits !== this.#digits) {
      this.#digits = digits;
      this.#render(null);
    }
  }

  clear(): void {
    this.#digits = '';
    this.#render(null);
  }

  #edit(e: Event): void {
    const type = e instanceof InputEvent ? e.inputType : '';
    const { delimiter } = this.#o.format;
    const raw = this.input.value;
    const caretRaw = this.input.selectionStart ?? raw.length;
    let edited = raw.replaceAll(delimiter, '');
    let caret = raw.slice(0, caretRaw).replaceAll(delimiter, '').length;
    // Deleting a shown delimiter deletes the digit beside it (the field holds digits only).
    if (edited === this.#before.digits && type.startsWith('delete')) {
      const at = type.endsWith('Forward') ? caret : caret - 1;
      if (at >= 0 && at < edited.length) {
        edited = edited.slice(0, at) + edited.slice(at + 1);
        caret = at;
      }
    }
    const r = dateInputTransform(this.#before.digits, edited, this.#o.input, this.#o.validation());
    if (r.reverted) {
      this.#digits = this.#before.digits;
      this.#render(this.#before.caret, true);
      return;
    }
    this.#digits = r.text;
    this.#render(caret);
    if (r.selection !== undefined) this.#o.onSelection(r.selection);
  }

  /** The error the field shows (DateInputTextField L136–155): only for a complete text. */
  error(): string {
    const pattern = this.#o.format.patternWithoutDelimiters;
    const text = this.#digits.trim();
    if (text.length !== pattern.length) return '';
    return validateDateInput(parseDate(text, pattern), this.#o.input, this.#o.validation());
  }

  /** Shows the digits with their delimiters, the caret after `caretDigits` digits, the error. */
  #render(caretDigits: number | null, displayCaret = false): void {
    const { delimiter } = this.#o.format;
    const text = dateOutputTransform(this.#digits, this.#o.format);
    if (this.input.value !== text) this.input.value = text;
    if (caretDigits !== null && this.input.ownerDocument.activeElement === this.input) {
      let at = text.length;
      if (displayCaret) at = Math.min(caretDigits, text.length);
      else if (caretDigits < this.#digits.length) {
        let seen = 0;
        at = 0;
        while (at < text.length && seen < caretDigits) if (text[at++] !== delimiter) seen++;
      }
      this.input.setSelectionRange(at, at);
    }
    const error = this.error();
    setAttr(this.input, 'aria-invalid', error ? 'true' : null);
    if (error) {
      if (!this.#supporting) {
        const doc = this.root.ownerDocument;
        const line = el(doc, 'div', `${TF}__supporting`);
        this.#supporting = el(doc, 'span', `${TF}__supporting-text`, {
          id: `${this.input.id}-error`,
          role: 'alert',
        });
        line.append(this.#supporting);
        this.root.append(line);
        setAttr(this.input, 'aria-describedby', this.#supporting.id);
      }
      setText(this.#supporting, error);
    } else if (this.#supporting) {
      this.#supporting.parentElement?.remove();
      this.#supporting = null;
      setAttr(this.input, 'aria-describedby', null);
    }
  }
}
