import {
  type CalendarMonth,
  DATE_PICKER_YEAR_RANGE,
  DatePickerModel,
  type SelectableDates,
  type YearRange,
  calendarMonth,
  calendarMonthOf,
  isSelectableYear,
  minusMonths,
  monthIndexIn,
  numberOfMonthsInRange,
  plusMonths,
} from '@kyralabs/m3e-motion';
import { attachRipple } from '../base/ripple.js';
import { el, localeOf, setAttr, setText } from '../time-picker-layout/shared.js';
import {
  type MonthState,
  ROOT,
  clampToYears,
  delegateRipple,
  gridKeyTarget,
  renderMonth,
  renderWeekdays,
  restingDay,
  setRovingDay,
} from './calendar.js';
import { DateField } from './field.js';
import {
  firstDayOfWeek,
  formatSkeleton,
  inputFormatOf,
  todayMillis,
  weekdayNames,
  zeroDigitOf,
} from './locale.js';
import { DATE_PICKER_STRINGS, type DatePickerStrings } from './strings.js';

export interface DockedDatePickerLayoutOptions {
  /** The selected date (UTC milliseconds of any time that day), or null. */
  selectedDate?: number | null | undefined;
  yearRange?: YearRange | undefined;
  selectableDates?: SelectableDates | undefined;
  /** The field's label (default: Compose's "Date"). */
  label?: string | undefined;
  locale?: string | undefined;
  labels?: Partial<DatePickerStrings> | undefined;
  className?: string | undefined;
  onChange?: ((dateMillis: number | null) => void) | undefined;
}

type Menu = 'month' | 'year' | null;

/**
 * Behavior of a `.m3e-docked-date-picker` (COMPONENT_SPEC §27; m3.material.io's docked date picker,
 * owner decision M10 D1; Compose has none), shared by `<m3e-docked-date-picker>` and m3e-react's
 * `<DockedDatePicker>`: a date field (Compose's validator and transformations) whose calendar
 * drops down below it, from a click on the field or its calendar button. The calendar's navigation
 * row has the month and the year, each between its arrows and with a menu that replaces the
 * calendar; the days of the neighbouring months are dimmed (owner decision M10 D15). Picking a day
 * fills the field and closes the calendar; Escape or a click outside closes it.
 */
export class DockedDatePickerLayout {
  readonly root: HTMLElement;
  options: DockedDatePickerLayoutOptions;
  model: DatePickerModel;
  readonly #abort = new AbortController();
  #locale = 'en';
  #strings: DatePickerStrings = DATE_PICKER_STRINGS;
  #firstDay = 1;
  #today = todayMillis();
  readonly #field: DateField;
  readonly #popup: HTMLElement;
  readonly #button: HTMLButtonElement;
  readonly #monthButton: HTMLButtonElement;
  readonly #yearButton: HTMLButtonElement;
  readonly #arrows: HTMLButtonElement[] = [];
  readonly #weekdays: HTMLElement;
  readonly #viewport: HTMLElement;
  readonly #calendar: HTMLElement;
  readonly #menu: HTMLElement;
  #days: HTMLElement[] = [];
  #shown: CalendarMonth | null = null;
  #open: Menu = null;
  #focus: number | null = null;

  constructor(root: HTMLElement, options: DockedDatePickerLayoutOptions = {}) {
    this.root = root;
    this.options = options;
    this.#resolve();
    this.model = this.#newModel();
    const doc = root.ownerDocument;
    const { signal } = this.#abort;
    const on = <K extends keyof HTMLElementEventMap>(
      target: EventTarget,
      type: K,
      listener: (e: HTMLElementEventMap[K]) => void,
    ) => {
      target.addEventListener(type, listener as EventListener, { signal });
    };
    this.#field = new DateField(doc, this.#fieldOptions(), signal);
    this.#field.setDate(this.model.selectedDateMillis);
    // The calendar button at the field's end (an icon button in the text field contract).
    const trailing = el(doc, 'span', 'm3e-text-field__trailing');
    this.#button = this.#iconButton('calendar_today', () => {
      this.toggle(this.#popup.hidden !== false);
    });
    setAttr(this.#button, 'aria-haspopup', 'dialog');
    trailing.append(this.#button);
    const container = this.#field.input.parentElement;
    container?.insertBefore(trailing, container.lastElementChild);

    this.#popup = el(doc, 'div', `${ROOT} ${ROOT}--docked`, { role: 'dialog' });
    this.#popup.hidden = true;
    const nav = el(doc, 'div', `${ROOT}__docked-nav`);
    const group = (menu: 'month' | 'year', step: number) => {
      const span = el(doc, 'span', '');
      const prev = this.#iconButton('keyboard_arrow_left', () => {
        this.#step(-step);
      });
      const button = el(doc, 'button', `${ROOT}__menu-button`, {
        type: 'button',
        'aria-expanded': 'false',
        'aria-haspopup': 'listbox',
      });
      const arrow = el(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' });
      arrow.textContent = 'arrow_drop_down';
      button.append(el(doc, 'span', ''), arrow);
      attachRipple(button, signal);
      on(button, 'click', () => {
        this.#toggleMenu(this.#open === menu ? null : menu);
      });
      const next = this.#iconButton('keyboard_arrow_right', () => {
        this.#step(step);
      });
      this.#arrows.push(prev, next);
      span.append(prev, button, next);
      nav.append(span);
      return button;
    };
    this.#monthButton = group('month', 1);
    this.#yearButton = group('year', 12);
    this.#calendar = el(doc, 'div', `${ROOT}__calendar`, { role: 'grid' });
    this.#weekdays = el(doc, 'div', `${ROOT}__weekdays`, { role: 'row' });
    this.#viewport = el(doc, 'div', `${ROOT}__viewport`);
    this.#calendar.append(this.#weekdays, this.#viewport);
    this.#menu = el(doc, 'ul', `${ROOT}__menu`, { role: 'listbox' });
    this.#menu.hidden = true;
    this.#popup.append(nav, this.#calendar, this.#menu);
    root.replaceChildren(this.#field.root, this.#popup);

    delegateRipple(this.#viewport, `.${ROOT}__day[data-date]`, signal);
    delegateRipple(this.#menu, `.${ROOT}__menu-item`, signal);
    // A click on the field shows the calendar but leaves the focus there for typing.
    on(this.#field.input, 'click', () => {
      this.toggle(true, false, false);
    });
    on(this.#viewport, 'click', (e) => {
      const day = (e.target as Element).closest<HTMLElement>(`.${ROOT}__day[data-date]`);
      if (day) this.#pick(Number(day.dataset['date']));
    });
    on(this.#viewport, 'keydown', (e) => {
      this.#key(e);
    });
    on(this.#menu, 'click', (e) => {
      const item = (e.target as Element).closest<HTMLElement>(`.${ROOT}__menu-item`);
      if (item) this.#pickMenu(Number(item.dataset['value']));
    });
    on(this.#menu, 'keydown', (e) => {
      this.#menuKey(e);
    });
    on(root, 'keydown', (e) => {
      if (e.key === 'Escape' && !this.#popup.hidden) {
        e.preventDefault();
        if (this.#open) this.#toggleMenu(null);
        else this.toggle(false, true);
      }
    });
    on(doc, 'pointerdown', (e) => {
      if (!this.#popup.hidden && !root.contains(e.target as Node)) this.toggle(false);
    });
    this.#render();
  }

  #resolve(): void {
    const locale = this.options.locale ?? localeOf(this.root);
    this.#strings = { ...DATE_PICKER_STRINGS, ...this.options.labels };
    this.#locale = locale;
    this.#firstDay = firstDayOfWeek(locale);
  }

  #newModel(): DatePickerModel {
    const o = this.options;
    return new DatePickerModel(
      o.selectedDate ?? null,
      o.selectedDate ?? null,
      o.yearRange ?? DATE_PICKER_YEAR_RANGE,
      'picker',
      this.#firstDay,
      this.#today,
    );
  }

  #iconButton(icon: string, click: () => void): HTMLButtonElement {
    const doc = this.root.ownerDocument;
    const button = el(doc, 'button', 'm3e-icon-button', { type: 'button' });
    const glyph = el(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' });
    glyph.textContent = icon;
    button.append(glyph);
    attachRipple(button, this.#abort.signal);
    button.addEventListener('click', click, { signal: this.#abort.signal });
    return button;
  }

  #fieldOptions() {
    const locale = this.#locale;
    const format = inputFormatOf(locale);
    const strings = this.#strings;
    return {
      label: this.options.label ?? strings.inputLabel,
      format,
      zeroDigit: zeroDigitOf(locale),
      input: 'single' as const,
      validation: () => ({
        yearRange: this.model.yearRange,
        selectableDates: this.options.selectableDates,
        format,
        errors: {
          datePattern: strings.invalidPattern,
          outOfYearRange: strings.invalidYearRange,
          notAllowed: strings.invalidNotAllowed,
          invalidRange: strings.invalidRange,
        },
        formatDate: (ms: number) => formatSkeleton(ms, 'yMMMd', locale),
        formatYear: (year: number) => String(year),
      }),
      onSelection: (millis: number | null) => {
        this.#select(millis);
        if (millis !== null) this.model.displayedMonthMillis = millis;
        this.#render();
      },
    };
  }

  update(options: DockedDatePickerLayoutOptions): void {
    const before = this.options;
    this.options = options;
    this.#resolve();
    // The field's text changes only with the date (a re-render keeps what is being typed).
    if (options.yearRange !== before.yearRange || this.model.firstDayOfWeek !== this.#firstDay) {
      this.model = this.#newModel();
      this.#field.setDate(this.model.selectedDateMillis);
    } else if (
      options.selectedDate !== undefined &&
      options.selectedDate !== this.model.selectedDateMillis
    ) {
      this.model.selectedDateMillis = options.selectedDate;
      if (options.selectedDate !== null) this.model.displayedMonthMillis = options.selectedDate;
      this.#field.setDate(this.model.selectedDateMillis);
    }
    this.#field.update(this.#fieldOptions());
    this.#shown = null;
    this.#render();
  }

  destroy(): void {
    this.#abort.abort();
  }

  /**
   * Opens (focusing the resting day unless `focusDay` is false) or closes the calendar
   * (`refocus`: back to the field).
   */
  toggle(open: boolean, refocus = false, focusDay = true): void {
    if (open === !this.#popup.hidden) return;
    this.#popup.hidden = !open;
    if (!open) this.#open = null;
    this.#render();
    if (open && focusDay) this.#days.find((d) => d.tabIndex === 0)?.focus({ preventScroll: true });
    else if (!open && refocus) this.#field.input.focus();
  }

  #select(millis: number | null): void {
    const before = this.model.selectedDateMillis;
    this.model.selectedDateMillis = millis;
    if (this.model.selectedDateMillis !== before)
      this.options.onChange?.(this.model.selectedDateMillis);
  }

  #pick(millis: number): void {
    const day = this.#days.find((d) => d.dataset['date'] === String(millis));
    if (!day || day.getAttribute('aria-disabled') === 'true') return;
    this.#select(millis);
    this.#field.setDate(millis);
    this.toggle(false, true);
  }

  #step(months: number): void {
    const m = this.model.displayedMonth;
    const target =
      months > 0 ? plusMonths(m, months, this.#firstDay) : minusMonths(m, -months, this.#firstDay);
    this.model.displayedMonthMillis = target.startUtcTimeMillis;
    this.#render();
  }

  #toggleMenu(menu: Menu): void {
    this.#open = menu;
    this.#render();
    if (menu)
      (
        this.#menu.querySelector<HTMLElement>('[aria-selected="true"]') ??
        (this.#menu.firstElementChild as HTMLElement | null)
      )?.focus();
    else (this.#open === null ? this.#monthButton : this.#yearButton).focus();
  }

  #pickMenu(value: number): void {
    const m = this.model.displayedMonth;
    const target =
      this.#open === 'month'
        ? calendarMonth(m.year, value, this.#firstDay)
        : calendarMonth(value, m.month, this.#firstDay);
    if (this.#open === 'year' && !isSelectableYear(this.options.selectableDates, value)) return;
    const button = this.#open === 'month' ? this.#monthButton : this.#yearButton;
    this.model.displayedMonthMillis = target.startUtcTimeMillis;
    this.#open = null;
    this.#render();
    button.focus();
  }

  #state(): MonthState {
    return {
      todayMillis: this.#today,
      start: this.model.selectedDateMillis,
      end: null,
      range: false,
      selectable: this.options.selectableDates,
      locale: this.#locale,
      strings: this.#strings,
      firstDayOfWeek: this.#firstDay,
      outside: true,
    };
  }

  #render(): void {
    const { model, root } = this;
    const strings = this.#strings;
    root.className = ['m3e-docked-date-picker', this.options.className ?? '']
      .filter(Boolean)
      .join(' ');
    setAttr(this.#button, 'aria-expanded', String(!this.#popup.hidden));
    setAttr(this.#button, 'aria-label', this.#strings.pickerTitle);
    if (this.#popup.hidden) return;
    setAttr(this.#popup, 'aria-label', strings.pickerTitle);
    const month = model.displayedMonth;
    const index = monthIndexIn(month, model.yearRange);
    const count = numberOfMonthsInRange(model.yearRange);
    const labels = [
      strings.previousMonth,
      strings.nextMonth,
      strings.previousYear,
      strings.nextYear,
    ];
    this.#arrows.forEach((arrow, i) => {
      setAttr(arrow, 'aria-label', labels[i] ?? '');
      const forward = i % 2 === 1;
      const step = i < 2 ? 1 : 12;
      arrow.disabled =
        this.#open !== null || (forward ? index + step > count - 1 : index - step < 0);
    });
    const name = (button: HTMLButtonElement, text: string, menu: Menu) => {
      const label = button.firstElementChild;
      if (label) setText(label, text);
      setAttr(button, 'aria-expanded', String(this.#open === menu));
      button.disabled = this.#open !== null && this.#open !== menu;
    };
    name(
      this.#monthButton,
      formatSkeleton(month.startUtcTimeMillis, 'yMMMM', this.#locale)
        .replace(/\s*\d+\s*/, ' ')
        .trim() || String(month.month),
      'month',
    );
    name(this.#yearButton, String(month.year), 'year');
    this.#calendar.hidden = this.#open !== null;
    this.#menu.hidden = this.#open === null;
    if (this.#open) {
      this.#renderMenu();
      return;
    }
    renderWeekdays(this.#weekdays, weekdayNames(this.#locale), this.#firstDay);
    if (this.#shown?.startUtcTimeMillis !== month.startUtcTimeMillis) {
      const page = el(root.ownerDocument, 'div', `${ROOT}__month`, { role: 'rowgroup' });
      this.#days = renderMonth(page, month, this.#state());
      this.#viewport.replaceChildren(page);
      this.#shown = month;
    } else {
      this.#days = renderMonth(
        this.#viewport.firstElementChild as HTMLElement,
        month,
        this.#state(),
      );
    }
    setAttr(
      this.#calendar,
      'aria-label',
      formatSkeleton(month.startUtcTimeMillis, 'yMMMM', this.#locale),
    );
    setRovingDay(this.#days, this.#focus ?? restingDay(month, this.#state()));
  }

  #renderMenu(): void {
    const doc = this.root.ownerDocument;
    const m = this.model.displayedMonth;
    const [first, last] = this.model.yearRange;
    const items: HTMLElement[] = [];
    const month = this.#open === 'month';
    const format = new Intl.DateTimeFormat(this.#locale, { month: 'long', timeZone: 'UTC' });
    for (let v = month ? 1 : first; v <= (month ? 12 : last); v++) {
      const selected = v === (month ? m.month : m.year);
      const item = el(doc, 'li', `${ROOT}__menu-item`, {
        role: 'option',
        'data-value': String(v),
        'aria-selected': String(selected),
        tabindex: selected ? '0' : '-1',
      });
      if (selected) {
        const check = el(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' });
        check.textContent = 'check';
        item.append(check);
      }
      item.append(month ? format.format(Date.UTC(2024, v - 1, 1)) : String(v));
      if (!month && !isSelectableYear(this.options.selectableDates, v))
        setAttr(item, 'aria-disabled', 'true');
      items.push(item);
    }
    this.#menu.replaceChildren(...items);
    setAttr(
      this.#menu,
      'aria-label',
      month ? this.#monthButton.textContent : this.#yearButton.textContent,
    );
    this.#menu.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
  }

  #key(e: KeyboardEvent): void {
    const day = (e.target as Element).closest<HTMLElement>(`.${ROOT}__day[data-date]`);
    if (!day) return;
    const millis = Number(day.dataset['date']);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.#pick(millis);
      return;
    }
    const rtl = getComputedStyle(this.root).direction === 'rtl';
    const raw = gridKeyTarget(e.key, e.shiftKey, millis, rtl, this.#firstDay);
    if (raw === null) return;
    e.preventDefault();
    const target = clampToYears(raw, this.model.yearRange);
    this.#focus = target;
    this.model.displayedMonthMillis = calendarMonthOf(target, this.#firstDay).startUtcTimeMillis;
    this.#render();
    setRovingDay(this.#days, target)?.focus();
  }

  #menuKey(e: KeyboardEvent): void {
    const item = (e.target as Element).closest<HTMLElement>(`.${ROOT}__menu-item`);
    if (!item) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.#pickMenu(Number(item.dataset['value']));
      return;
    }
    const next =
      e.key === 'ArrowDown'
        ? item.nextElementSibling
        : e.key === 'ArrowUp'
          ? item.previousElementSibling
          : e.key === 'Home'
            ? this.#menu.firstElementChild
            : e.key === 'End'
              ? this.#menu.lastElementChild
              : null;
    if (!(next instanceof HTMLElement)) return;
    e.preventDefault();
    item.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  }
}
