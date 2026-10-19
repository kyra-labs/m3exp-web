import {
  type TimeInputText,
  type TimePickerSelection,
  timeInputShouldSwitchToMinute,
  timeInputTransform,
} from '@kyralabs/m3e-motion';
import { TimePickerFieldsBase } from './side.js';
import {
  type TimePickerBaseOptions,
  el,
  localNumber,
  numberDescription,
  setAttr,
  setText,
} from './shared.js';

export interface TimeInputLayoutOptions extends TimePickerBaseOptions {
  /**
   * The uncontained variant (Compose's TimeInput with a `toggle`): taller fields and a side column
   * of AM, PM and a mode toggle button, which calls `onModeToggle` (owner decision M10 T1).
   */
  uncontained?: boolean;
  /** The side column's mode toggle was pressed (switch to the scroll picker). */
  onModeToggle?: () => void;
}

const ROOT = 'm3e-time-input';

interface Field {
  selection: TimePickerSelection;
  wrap: HTMLElement;
  input: HTMLInputElement;
  supporting: HTMLElement;
  /** The text and selection before the current edit (InputTransformation's original*). */
  original: TimeInputText;
  /** The field's userOverride Ref (TimeInputImpl L2057–2058). */
  userOverride: { value: boolean | undefined };
  /** The state value (hour / minute) the text last followed (the LaunchedEffect key). */
  shown: number;
}

/**
 * Behavior of a `.m3e-time-input` (COMPONENT_SPEC §28; Compose TimeInput), shared by
 * `<m3e-time-input>` and m3e-react's `<TimeInput>`: it builds the m3e-css DOM inside the root.
 *
 * - Two `<input inputmode="numeric">` fields. Every edit goes through m3e-motion's port of
 *   TimeInputTransformation (digits only, at most two, the hour read in the current period,
 *   typing over two digits replaces them, the auto advance to minutes; invalid values are kept
 *   and shown in the error colors with Compose's message). The hour field also moves on to the
 *   minutes on a digit typed after two valid digits (shouldSwitchFocusToMinute) and on Enter
 *   (ImeAction.Next).
 * - Focusing a field selects it (Compose: an unselected field is a TimeSelector that selects it).
 * - Up / Down step the focused field by one, wrapping (a web spinbutton, owner decision M10 T4).
 * - 12-hour: the AM/PM toggle beside the fields, or, uncontained, the side column.
 */
export class TimeInputLayout extends TimePickerFieldsBase<TimeInputLayoutOptions> {
  #fields!: [Field, Field];

  constructor(root: HTMLElement, options: TimeInputLayoutOptions = {}) {
    super(root, options);
    this.#build();
    this.render();
  }

  #build(): void {
    const doc = this.root.ownerDocument;
    const { signal } = this.abort;
    const fields = el(doc, 'div', `${ROOT}__fields`);
    const make = (selection: TimePickerSelection): Field => {
      const wrap = el(doc, 'div', `${ROOT}__field`);
      const input = el(doc, 'input', `${ROOT}__input`, {
        type: 'text',
        inputmode: 'numeric',
        role: 'spinbutton',
        autocomplete: 'off',
        spellcheck: 'false',
      });
      const supporting = el(doc, 'span', `${ROOT}__supporting`);
      wrap.append(input, supporting);
      const field: Field = {
        selection,
        wrap,
        input,
        supporting,
        original: { text: '', start: 0, end: 0 },
        userOverride: { value: undefined },
        shown: Number.NaN,
      };
      const remember = () => {
        field.original = {
          text: input.value,
          start: input.selectionStart ?? input.value.length,
          end: input.selectionEnd ?? input.value.length,
        };
      };
      input.addEventListener(
        'focus',
        () => {
          this.select(selection);
        },
        { signal },
      );
      input.addEventListener('beforeinput', remember, { signal });
      input.addEventListener(
        'input',
        () => {
          this.#edit(field);
        },
        { signal },
      );
      input.addEventListener(
        'keydown',
        (e) => {
          this.#key(field, e);
        },
        { signal },
      );
      return field;
    };
    this.#fields = [make('hour'), make('minute')];
    const separator = el(doc, 'span', `${ROOT}__separator`, { 'aria-hidden': 'true' });
    separator.textContent = ':';
    fields.append(this.#fields[0].wrap, separator, this.#fields[1].wrap);
    this.buildPeriod('m3e-time-picker__period');
    this.root.replaceChildren(fields);
  }

  protected override setTime(hour: number, minute: number): void {
    super.setTime(hour, minute);
    // The LaunchedEffect(hour / minute) "manual overrides": the text follows the state.
    for (const field of this.#fields) field.userOverride.value = true;
  }

  /** The text a field shows (hourTextValue / minuteTextValue, L2040–2052). */
  #text(selection: TimePickerSelection): string {
    const state = this.model;
    const locale = this.locale;
    if (selection === 'hour') {
      return localNumber(
        state.isHourInputValid ? state.hourForDisplay : state.hourInput,
        locale,
        2,
      );
    }
    return localNumber(state.isMinuteInputValid ? state.minute : state.minuteInput, locale, 2);
  }

  #edit(field: Field): void {
    const input = field.input;
    const state = this.model;
    const before = { hour: state.hour, minute: state.minute, selection: state.selection };
    const result = timeInputTransform(
      field.selection,
      state,
      field.original,
      {
        text: input.value,
        start: input.selectionStart ?? input.value.length,
        end: input.selectionEnd ?? input.value.length,
      },
      false,
      field.userOverride,
    );
    if (input.value !== result.text) input.value = result.text;
    input.setSelectionRange(result.start, result.end);
    field.original = { text: result.text, start: result.start, end: result.end };
    if (state.selection !== before.selection) {
      this.options.onSelectionChange?.(state.selection);
    }
    this.render();
    if (state.hour !== before.hour || state.minute !== before.minute) {
      this.options.onChange?.(state.hour, state.minute);
    }
    if (state.selection !== before.selection) this.#focusSelection();
  }

  #key(field: Field, e: KeyboardEvent): void {
    const state = this.model;
    const input = field.input;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.#step(field.selection, e.key === 'ArrowUp' ? 1 : -1);
      return;
    }
    if (field.selection === 'hour') {
      if (e.key === 'Enter' && state.isHourInputValid) {
        e.preventDefault();
        this.select('minute');
        this.#focusSelection();
        return;
      }
      const isDigit = e.key.length === 1 && e.key >= '0' && e.key <= '9';
      const hour: TimeInputText = {
        text: input.value,
        start: input.selectionStart ?? 0,
        end: input.selectionEnd ?? 0,
      };
      if (timeInputShouldSwitchToMinute(isDigit, hour, state.is24Hour) && state.isHourInputValid) {
        // The digit goes on to the minute field, which takes the focus now.
        this.select('minute');
        this.#focusSelection();
      }
    }
  }

  /** Up / Down: the next / previous hour (in the period) or minute, wrapping. */
  #step(selection: TimePickerSelection, delta: number): void {
    const state = this.model;
    if (selection === 'hour') {
      const base = state.isHourInputValid ? state.hour : state.isPm ? 12 : 0;
      state.hour = state.is24Hour
        ? (base + delta + 24) % 24
        : (((base % 12) + delta + 12) % 12) + (state.isPm ? 12 : 0);
    } else {
      const base = state.isMinuteInputValid ? state.minute : 0;
      state.minute = (base + delta + 60) % 60;
    }
    this.changed();
    const field = this.#fields[selection === 'hour' ? 0 : 1];
    field.input.setSelectionRange(0, 0);
  }

  #focusSelection(): void {
    const field = this.#fields.find((f) => f.selection === this.model.selection);
    if (field && field.input.ownerDocument.activeElement !== field.input) {
      field.input.focus();
      field.input.setSelectionRange(0, 0);
    }
  }

  protected override render(): void {
    const state = this.model;
    const strings = this.strings;
    const locale = this.locale;
    const vibrant = Boolean(this.options.vibrant);
    const uncontained = Boolean(this.options.uncontained);
    this.root.className = [
      ROOT,
      vibrant || uncontained ? `${ROOT}--vibrant` : '',
      uncontained ? `${ROOT}--uncontained` : '',
      state.is24Hour ? `${ROOT}--24h` : '',
      this.options.className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    this.root.dataset['selection'] = state.selection;

    for (const field of this.#fields) {
      const { selection, input, wrap, supporting } = field;
      const hour = selection === 'hour';
      const valid = hour ? state.isHourInputValid : state.isMinuteInputValid;
      const text = this.#text(selection);
      const selected = state.selection === selection;
      const key = hour ? state.hour : state.minute;
      // An unselected field is a TimeSelector (the value); the selected text field follows the
      // state when it changes from elsewhere (LaunchedEffect(hour / minute), userOverride).
      if (!selected || (key !== field.shown && field.userOverride.value !== false)) {
        if (input.value !== text) input.value = text;
      }
      field.shown = key;
      field.userOverride.value = true;
      wrap.toggleAttribute('data-selected', selected);
      wrap.toggleAttribute('data-invalid', !valid);
      setAttr(input, 'aria-label', hour ? strings.hourTextField : strings.minuteTextField);
      const value = hour ? state.hourForDisplay : state.minute;
      setAttr(input, 'aria-valuenow', String(value));
      setAttr(input, 'aria-valuemin', hour && !state.is24Hour ? '1' : '0');
      setAttr(input, 'aria-valuemax', hour ? (state.is24Hour ? '23' : '12') : '59');
      setAttr(
        input,
        'aria-valuetext',
        numberDescription(strings, selection, state.is24Hour, value, locale),
      );
      setAttr(input, 'aria-invalid', valid ? null : 'true');
      // SupportingText: "Hour" / "Minute" (baseline), or the error (a polite live region).
      const message = valid
        ? hour
          ? strings.hour
          : strings.minute
        : hour
          ? state.is24Hour
            ? strings.hour24Error
            : strings.hourError
          : strings.minuteError;
      setText(supporting, message);
      supporting.hidden = valid && (vibrant || uncontained);
      setAttr(supporting, 'aria-hidden', valid ? 'true' : null);
      setAttr(supporting, 'aria-live', valid ? null : 'polite');
    }
    this.renderSide(uncontained, this.options.onModeToggle);
  }

  /** ScrollDisplayModeToggle in Input mode: to the scroll picker (TimePickerDialog.kt). */
  protected override toggleIcon(): string {
    return 'swipe_vertical';
  }

  protected override toggleLabel(): string {
    return this.strings.toggleScroll;
  }
}
