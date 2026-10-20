import {
  type CalendarDate,
  type DateInputFormat,
  type DateInputIdentifier,
  type DateInputValidation,
  dateOutputTransform,
  digitValue,
  formatWithPattern,
  parseDate,
  validateDateInput,
} from '@kyralabs/m3e-motion';
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

let ids = 0;

/** The separators a typed date may use (m3.material.io Date pickers › Accessibility). */
const SEPARATORS = /[\s./-]+/u;

/**
 * The text as the pattern's digits ("8-14-2025" → "08142025" for MMddyyyy), or null while it is
 * not a whole date: either the pattern's digits alone (Compose's entry), or its three fields in
 * order between separators, a month or day of one digit padded with 0 (owner decision M10 D5).
 */
export function lenientDateDigits(text: string, pattern: string, delimiter: string): string | null {
  let ascii = '';
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    const d = digitValue(c);
    ascii += d < 0 ? (c === delimiter ? '/' : c) : String(d);
  }
  // Separators at the ends go too (a locale's "2025. 08. 14.").
  ascii = ascii.replace(/^[\s./-]+|[\s./-]+$/gu, '');
  if (/^\d+$/u.test(ascii)) return ascii.length === pattern.length ? ascii : null;
  const groups = ascii.split(SEPARATORS);
  const fields = pattern.match(/(.)\1*/gu) ?? [];
  if (groups.length !== fields.length) return null;
  let digits = '';
  for (let i = 0; i < fields.length; i++) {
    const group = groups[i] ?? '';
    const size = fields[i]?.length ?? 0;
    const year = fields[i]?.startsWith('y') ?? false;
    if (!/^\d+$/u.test(group) || group.length > size || (year && group.length !== size)) {
      return null;
    }
    digits += group.padStart(size, '0');
  }
  return digits;
}

/**
 * An outlined m3e-css text field for one date (DateInputTextField), with the pattern as its
 * placeholder ("MM/DD/YYYY") and Compose's validator (m3e-motion's port). The text stays as typed
 * (owner decision M10 D5, m3.material.io: no input mask): a whole date selects as soon as it
 * parses, and Enter or leaving the field puts it in the pattern's form; the validator's error
 * shows under it for a whole date, and the pattern error for other text once committed.
 */
export class DateField {
  readonly root: HTMLElement;
  readonly input: HTMLInputElement;
  #label: HTMLLabelElement;
  #notch: HTMLElement;
  #o: DateFieldOptions;
  #committed = false;
  #supporting: HTMLElement | null = null;
  constructor(doc: Document, options: DateFieldOptions, signal: AbortSignal) {
    this.#o = options;
    const id = `m3e-date-field-${String(++ids)}`;
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
      'input',
      () => {
        this.#edit();
      },
      { signal },
    );
    // Enter or leaving the field formats the date (no mask while typing, owner decision M10 D5).
    this.input.addEventListener(
      'change',
      () => {
        this.#commit();
      },
      { signal },
    );
    this.input.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter') this.#commit();
      },
      { signal },
    );
    this.update(options);
  }

  update(options: DateFieldOptions): void {
    this.#o = options;
    const pattern = options.format.patternWithDelimiters.toUpperCase();
    setText(this.#label, options.label);
    setText(this.#notch, options.label);
    setAttr(this.input, 'placeholder', pattern);
    // The label's description (DateInput.kt L90–95): "Date, MM/DD/YYYY".
    setAttr(this.input, 'aria-label', `${options.label}, ${pattern}`);
    this.#renderError();
  }

  /**
   * LaunchedEffect(initialDateMillis) (L235–244): a date set from outside replaces the text,
   * unless the text already is that date.
   */
  setDate(millis: number | null): void {
    if (millis === null || this.#parse()?.utcTimeMillis === millis) return;
    this.input.value = this.#format(millis);
    this.#committed = false;
    this.#renderError();
  }

  clear(): void {
    this.input.value = '';
    this.#committed = false;
    this.#renderError();
  }

  /** The text as a date, or null while it is not a whole one. */
  #parse(): CalendarDate | null {
    const { patternWithoutDelimiters, delimiter } = this.#o.format;
    const digits = lenientDateDigits(this.input.value, patternWithoutDelimiters, delimiter);
    return digits === null ? null : parseDate(digits, patternWithoutDelimiters);
  }

  /** The date in the locale's pattern and digits ("08/14/2025"). */
  #format(millis: number): string {
    const { format, zeroDigit } = this.#o;
    return dateOutputTransform(
      formatWithPattern(millis, format.patternWithoutDelimiters, zeroDigit),
      format,
    );
  }

  /** onDateSelectionChange: a whole, valid date, else null (DateInputTransformation L393–420). */
  #edit(): void {
    this.#committed = false;
    const parsed = this.#parse();
    const valid =
      parsed !== null && validateDateInput(parsed, this.#o.input, this.#o.validation()) === '';
    this.#renderError();
    this.#o.onSelection(valid ? parsed.utcTimeMillis : null);
  }

  /** Enter or blur: a date takes the pattern's form; anything else shows the pattern error. */
  #commit(): void {
    const parsed = this.#parse();
    if (parsed !== null) {
      const text = this.#format(parsed.utcTimeMillis);
      if (this.input.value !== text) this.input.value = text;
    }
    this.#committed = this.input.value.trim() !== '';
    this.#renderError();
  }

  /**
   * The error the field shows (DateInputTextField L136–155): the validator's for a whole date (a
   * date that does not exist, like 02/30, is the pattern error); once committed, the pattern
   * error for text that is not a date.
   */
  error(): string {
    const { patternWithoutDelimiters, delimiter } = this.#o.format;
    const digits = lenientDateDigits(this.input.value, patternWithoutDelimiters, delimiter);
    if (digits === null && !this.#committed) return '';
    const parsed = digits === null ? null : parseDate(digits, patternWithoutDelimiters);
    return validateDateInput(parsed, this.#o.input, this.#o.validation());
  }

  #renderError(): void {
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
