import { TimePickerModel, type TimePickerSelection } from '@kyralabs/m3e-motion';
import { attachRipple } from '../base/ripple.js';
import { TIME_PICKER_STRINGS, type TimePickerStrings } from './strings.js';

/** What every time picker layout takes (Compose's TimePickerState plus the web's locale). */
export interface TimePickerBaseOptions {
  /** 0–23. */
  hour?: number;
  /** 0–59. */
  minute?: number;
  /** 24-hour clock; undefined follows the locale (owner decision M10 T5). */
  is24Hour?: boolean;
  /** Which of hour / minute is being picked (TimePickerState.selection). */
  selection?: TimePickerSelection;
  /** Compose's vibrant (expressive) overloads (owner decision M10 T2). */
  vibrant?: boolean;
  /** BCP 47 locale for the digits and the default clock; default: the root's `lang`. */
  locale?: string;
  /** String overrides (TIME_PICKER_STRINGS). */
  labels?: Partial<TimePickerStrings>;
  /** Extra classes for the root (m3e-react's className). */
  className?: string;
  /** The time changed by the user (hour 0–23, minute 0–59). */
  onChange?: (hour: number, minute: number) => void;
  /** The selection changed by the user. */
  onSelectionChange?: (selection: TimePickerSelection) => void;
}

/**
 * The locale of `el`: the closest `lang`, else the document's, else the browser's.
 * @internal Shared with m3e-react; not part of the public API.
 */
export function localeOf(el: Element): string {
  const lang = el.closest('[lang]')?.getAttribute('lang');
  if (lang) return lang;
  return typeof navigator === 'undefined' ? 'en' : navigator.language;
}

/**
 * Whether `locale` uses a 24-hour clock: Intl's hour cycle (h23 / h24), Compose's
 * `is24HourFormat` system setting on the web (owner decision M10 T5).
 * @internal Shared with m3e-react; not part of the public API.
 */
export function is24HourLocale(locale: string): boolean {
  try {
    const { hourCycle } = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
    return hourCycle === 'h23' || hourCycle === 'h24';
  } catch {
    return false;
  }
}

const formats = /* @__PURE__ */ new Map<string, Intl.NumberFormat>();

/**
 * `Int.toLocalString(minDigits)` (CalendarLocale.jvmAndAndroid.kt): locale digits, no grouping.
 * @internal Shared with m3e-react; not part of the public API.
 */
export function localNumber(value: number, locale: string, minDigits = 1): string {
  const key = `${locale}|${String(minDigits)}`;
  let format = formats.get(key);
  if (!format) {
    try {
      format = new Intl.NumberFormat(locale, {
        minimumIntegerDigits: minDigits,
        useGrouping: false,
      });
    } catch {
      format = new Intl.NumberFormat('en', { minimumIntegerDigits: minDigits, useGrouping: false });
    }
    formats.set(key, format);
  }
  return format.format(value);
}

/** `getString(id, number)`: the `%1$d` of `template` as a locale number. */
export const formatString = (template: string, value: number, locale: string): string =>
  template.replace('%1$d', localNumber(value, locale));

/** `numberContentDescription` (TimePicker.kt L3976–3991). */
export function numberDescription(
  strings: TimePickerStrings,
  selection: TimePickerSelection,
  is24Hour: boolean,
  value: number,
  locale: string,
): string {
  const template =
    selection === 'minute'
      ? strings.minuteSuffix
      : is24Hour
        ? strings.hour24Suffix
        : strings.hourSuffix;
  return formatString(template, value, locale);
}

export const el = <K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
  attrs: Readonly<Record<string, string>> = {},
): HTMLElementTagNameMap[K] => {
  const node = doc.createElement(tag);
  node.className = className;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
};

export const setAttr = (node: Element, name: string, value: string | null): void => {
  if (value === null) node.removeAttribute(name);
  else if (node.getAttribute(name) !== value) node.setAttribute(name, value);
};

export const setText = (node: Node, text: string): void => {
  if (node.textContent !== text) node.textContent = text;
};

/**
 * State shared by the three layouts: the model (Compose's TimePickerStateImpl), the options, the
 * resolved locale / clock / strings, and the AM/PM toggle.
 */
export abstract class TimePickerBase<O extends TimePickerBaseOptions> {
  readonly root: HTMLElement;
  protected options: O;
  protected model: TimePickerModel;
  protected abort = new AbortController();
  protected period!: HTMLElement;
  protected periodItems!: [HTMLButtonElement, HTMLButtonElement];

  constructor(root: HTMLElement, options: O) {
    this.root = root;
    this.options = options;
    this.model = new TimePickerModel(
      clampHour(options.hour),
      clampMinute(options.minute),
      this.is24Hour,
      options.selection ?? 'hour',
    );
  }

  protected get locale(): string {
    return this.options.locale ?? localeOf(this.root);
  }

  protected get is24Hour(): boolean {
    return this.options.is24Hour ?? is24HourLocale(this.options.locale ?? localeOf(this.root));
  }

  protected get strings(): TimePickerStrings {
    return { ...TIME_PICKER_STRINGS, ...this.options.labels };
  }

  /** The current time. */
  get hour(): number {
    return this.model.hour;
  }

  get minute(): number {
    return this.model.minute;
  }

  get selection(): TimePickerSelection {
    return this.model.selection;
  }

  /** New options (the element's attributes, React's props); re-renders. */
  update(options: Partial<O>): void {
    const before = { hour: this.model.hour, minute: this.model.minute };
    this.options = { ...this.options, ...options };
    const is24Hour = this.is24Hour;
    const structural = is24Hour !== this.model.is24Hour;
    this.model.is24Hour = is24Hour;
    if (options.selection !== undefined) this.model.selection = options.selection;
    const hour = options.hour === undefined ? before.hour : clampHour(options.hour);
    const minute = options.minute === undefined ? before.minute : clampMinute(options.minute);
    if (hour !== before.hour || minute !== before.minute) this.setTime(hour, minute);
    this.render(structural);
  }

  destroy(): void {
    this.abort.abort();
  }

  /** The time set from outside (props, attributes): no change event. */
  protected setTime(hour: number, minute: number): void {
    this.model.hour = hour;
    this.model.minute = minute;
  }

  protected abstract render(structural?: boolean): void;

  /** The user changed the time: notify, re-render. */
  protected changed(): void {
    this.render();
    this.options.onChange?.(this.model.hour, this.model.minute);
  }

  protected select(selection: TimePickerSelection): void {
    if (this.model.selection === selection) return;
    this.model.selection = selection;
    this.render();
    this.options.onSelectionChange?.(selection);
  }

  /** The AM/PM toggle (PeriodToggleImpl): a radio group of two buttons. */
  protected buildPeriod(className: string): HTMLElement {
    const doc = this.root.ownerDocument;
    const group = el(doc, 'div', className, { role: 'radiogroup' });
    const item = (pm: boolean) => {
      const button = el(doc, 'button', 'm3e-time-picker__period-item', {
        type: 'button',
        role: 'radio',
      });
      attachRipple(button, this.abort.signal);
      button.addEventListener(
        'click',
        () => {
          this.setPm(pm);
        },
        { signal: this.abort.signal },
      );
      button.addEventListener(
        'keydown',
        (e) => {
          this.#periodKey(e, pm);
        },
        { signal: this.abort.signal },
      );
      return button;
    };
    this.periodItems = [item(false), item(true)];
    group.append(...this.periodItems);
    this.period = group;
    return group;
  }

  /** A web radio group: the arrow keys move to the other period and check it. */
  #periodKey(e: KeyboardEvent, pm: boolean): void {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    this.setPm(!pm);
    this.periodItems[pm ? 0 : 1].focus();
  }

  protected renderPeriod(): void {
    const strings = this.strings;
    setAttr(this.period, 'aria-label', strings.periodToggle);
    const pm = this.model.isPm;
    this.periodItems.forEach((item, i) => {
      setText(item, i === 0 ? strings.am : strings.pm);
      const checked = i === 1 ? pm : !pm;
      setAttr(item, 'aria-checked', String(checked));
      item.tabIndex = checked ? 0 : -1;
    });
  }

  /** The AM/PM toggle's onClick (L2821–2843): only with a valid hour. */
  protected setPm(pm: boolean): void {
    const state = this.model;
    if (state.isPm === pm || !state.isHourInputValid) return;
    state.hour += pm ? 12 : -12;
    this.changed();
  }
}

const clampHour = (hour: number | undefined) =>
  Math.min(Math.max(Math.trunc(Number.isFinite(hour) ? (hour ?? 0) : 0), 0), 23);
const clampMinute = (minute: number | undefined) =>
  Math.min(Math.max(Math.trunc(Number.isFinite(minute) ? (minute ?? 0) : 0), 0), 59);
