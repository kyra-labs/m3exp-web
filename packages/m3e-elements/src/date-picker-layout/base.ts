import {
  DATE_PICKER_YEAR_RANGE,
  type DateInputFormat,
  type DatePickerDisplayMode,
  type SelectableDates,
  type YearRange,
} from '@kyralabs/m3e-motion';
import { attachRipple } from '../base/ripple.js';
import { el, localNumber, localeOf, setAttr, setText } from '../time-picker-layout/shared.js';
import { ROOT } from './calendar.js';
import {
  firstDayOfWeek,
  formatSkeleton,
  inputFormatOf,
  todayMillis,
  weekdayNames,
  zeroDigitOf,
} from './locale.js';
import { DATE_PICKER_STRINGS, type DatePickerStrings } from './strings.js';

/** What every date picker layout takes (Compose's states and DatePicker parameters, plus the web's locale). */
export interface DatePickerBaseOptions {
  /** The years shown (DatePickerDefaults.YearRange: 1900–2100). */
  yearRange?: YearRange | undefined;
  /** The month shown first (UTC milliseconds of any day in it); default: the selection's or today's. */
  displayedMonth?: number | null | undefined;
  displayMode?: DatePickerDisplayMode | undefined;
  /** The header's mode toggle (`showModeToggle`, default true). */
  showModeToggle?: boolean | undefined;
  /** The header title; null: none. Default: Compose's ("Select date"). */
  title?: string | null | undefined;
  /** The header headline (default true). */
  headline?: boolean | undefined;
  /** Which dates and years can be picked (SelectableDates). */
  selectableDates?: SelectableDates | undefined;
  /** BCP 47 locale for the calendar, names and digits; default: the root's `lang`. */
  locale?: string | undefined;
  labels?: Partial<DatePickerStrings> | undefined;
  /** Extra classes for the root (m3e-react's className). */
  className?: string | undefined;
  onDisplayModeChange?: ((mode: DatePickerDisplayMode) => void) | undefined;
  onDisplayedMonthChange?: ((monthMillis: number) => void) | undefined;
}

/**
 * State shared by the layouts: the root, the resolved locale / strings / calendar data, the
 * header (DateEntryContainer's title, headline, mode toggle and divider), and the switch between
 * the picker and input panes (SwitchableDateEntryContent).
 */
export abstract class DatePickerBase<O extends DatePickerBaseOptions> {
  readonly root: HTMLElement;
  options: O;
  protected readonly abort = new AbortController();
  protected locale = 'en';
  protected strings: DatePickerStrings = DATE_PICKER_STRINGS;
  protected firstDayOfWeek = 1;
  protected weekdays: [string, string][] = [];
  protected today = todayMillis();
  protected format!: DateInputFormat;
  protected zeroDigit = '0';
  protected readonly header: HTMLElement;
  protected readonly title: HTMLElement;
  protected readonly headline: HTMLElement;
  protected readonly toggle: HTMLButtonElement;
  #toggleIcon: HTMLElement;
  protected readonly content: HTMLElement;
  protected readonly panes: Record<DatePickerDisplayMode, HTMLElement>;
  #switching: Animation[] = [];

  constructor(root: HTMLElement, options: O) {
    this.root = root;
    this.options = options;
    this.resolve();
    const doc = root.ownerDocument;
    this.header = el(doc, 'div', `${ROOT}__header`);
    this.title = el(doc, 'div', `${ROOT}__title`);
    this.headline = el(doc, 'div', `${ROOT}__headline`, { 'aria-live': 'polite' });
    this.toggle = el(doc, 'button', `m3e-icon-button ${ROOT}__mode-toggle`, { type: 'button' });
    this.#toggleIcon = el(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' });
    this.toggle.append(this.#toggleIcon);
    attachRipple(this.toggle, this.abort.signal);
    this.toggle.addEventListener(
      'click',
      () => {
        this.setMode(this.mode === 'picker' ? 'input' : 'picker', true);
      },
      { signal: this.abort.signal },
    );
    this.content = el(doc, 'div', `${ROOT}__content`);
    this.panes = {
      picker: el(doc, 'div', `${ROOT}__pane`, { 'data-pane': 'picker' }),
      input: el(doc, 'div', `${ROOT}__pane`, { 'data-pane': 'input' }),
    };
    this.content.append(this.panes.picker, this.panes.input);
  }

  /** Locale data for the options (re-read on update). */
  protected resolve(): void {
    const locale = this.options.locale ?? localeOf(this.root);
    this.strings = { ...DATE_PICKER_STRINGS, ...this.options.labels };
    if (locale !== this.locale || !this.weekdays.length) {
      this.locale = locale;
      this.firstDayOfWeek = firstDayOfWeek(locale);
      this.weekdays = weekdayNames(locale);
      this.format = inputFormatOf(locale);
      this.zeroDigit = zeroDigitOf(locale);
    }
  }

  get yearRange(): YearRange {
    return this.options.yearRange ?? DATE_PICKER_YEAR_RANGE;
  }

  /** The current display mode (the model's). */
  protected abstract get mode(): DatePickerDisplayMode;
  protected abstract set mode(mode: DatePickerDisplayMode);
  protected abstract render(): void;
  /** Builds a pane's content the first time it shows. */
  protected abstract buildPane(mode: DatePickerDisplayMode): void;

  update(options: O): void {
    this.options = options;
    this.resolve();
    if (options.displayMode && options.displayMode !== this.mode)
      this.setMode(options.displayMode, false);
    this.render();
  }

  destroy(): void {
    this.abort.abort();
    for (const a of this.#switching) a.cancel();
  }

  /** A UTC date in the locale (DatePickerFormatter). */
  protected formatDate(millis: number, skeleton: 'yMMMM' | 'yMMMd' | 'yMMMMEEEEd'): string {
    return formatSkeleton(millis, skeleton, this.locale);
  }

  protected formatYear = (year: number): string => localNumber(year, this.locale);

  /**
   * The header (DateEntryContainer L1368–1439): the title, the headline (`parts`, with a live
   * region named `description`), the mode toggle and the divider; nothing when all are off.
   */
  protected renderHeader(title: string, parts: readonly string[], description: string): void {
    const { options, header } = this;
    const showTitle = options.title !== null;
    const showHeadline = options.headline !== false;
    const showToggle = options.showModeToggle !== false;
    const row = header.lastElementChild?.classList.contains(`${ROOT}__headline-row`)
      ? (header.lastElementChild as HTMLElement)
      : el(this.root.ownerDocument, 'div', `${ROOT}__headline-row`);
    setText(this.title, options.title ?? title);
    const spans = parts.map((p, i) => {
      const span =
        (this.headline.children[i] as HTMLElement | undefined) ??
        el(this.root.ownerDocument, 'span', '');
      setText(span, p);
      return span;
    });
    if (
      this.headline.children.length !== spans.length ||
      [...this.headline.children].some((c, i) => c !== spans[i])
    ) {
      this.headline.replaceChildren(...spans);
    }
    setAttr(this.headline, 'aria-label', description);
    setAttr(this.headline, 'role', 'status');
    const input = this.mode === 'input';
    setText(this.#toggleIcon, input ? 'date_range' : 'edit');
    setAttr(this.toggle, 'aria-label', input ? this.strings.toCalendar : this.strings.toInput);
    row.replaceChildren(
      ...(showHeadline ? [this.headline] : []),
      ...(showToggle ? [this.toggle] : []),
    );
    header.replaceChildren(
      ...(showTitle ? [this.title] : []),
      ...(showHeadline || showToggle ? [row] : []),
    );
    const show = showTitle || showHeadline || showToggle;
    if (show && header.parentNode !== this.root) this.root.prepend(header);
    if (!show) header.remove();
  }

  /**
   * Switches the display mode (DisplayMode setter: the selection's month shows), animated as
   * SwitchableDateEntryContent (L1485–1537) when `animate`: the incoming pane slides and fades in,
   * the outgoing one fades out and slides away, the content's height follows (SizeTransform).
   */
  protected setMode(to: DatePickerDisplayMode, animate: boolean): void {
    const from = this.mode;
    if (from === to) return;
    this.mode = to;
    this.buildPane(to);
    for (const a of this.#switching) a.finish();
    const incoming = this.panes[to];
    const outgoing = this.panes[from];
    const before = this.content.offsetHeight;
    incoming.hidden = false;
    outgoing.toggleAttribute('data-leaving', true);
    this.render();
    if (animate) this.options.onDisplayModeChange?.(to);
    const after = this.content.offsetHeight;
    const content = this.content;
    const done = () => {
      outgoing.hidden = true;
      for (const node of [content, incoming, outgoing]) {
        node.removeAttribute('data-switch');
        node.removeAttribute('data-leaving');
        node.removeAttribute('data-entering');
      }
      this.#switching = [];
    };
    if (!animate) {
      done();
      return;
    }
    // date-picker.css runs the keyframes on the spring tokens; the layout gives the lengths.
    const px = (v: number) => `${String(v)}px`;
    content.style.setProperty('--_m3e-date-picker-from', px(before));
    content.style.setProperty('--_m3e-date-picker-to', px(after));
    content.setAttribute('data-switch', to);
    incoming.setAttribute('data-entering', '');
    outgoing.setAttribute('data-leaving', '');
    this.#switching = content.getAnimations({ subtree: true });
    void Promise.all(this.#switching.map((a) => a.finished)).then(done, done);
  }
}

export { weekdayNames };
