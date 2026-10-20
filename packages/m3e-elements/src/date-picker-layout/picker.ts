import {
  type CalendarMonth,
  DatePickerModel,
  type DatePickerDisplayMode,
  SpringAnimatable,
  calendarMonth,
  calendarMonthOf,
  formatString,
  isSelectableYear,
  minusMonths,
  monthIndexIn,
  numberOfMonthsInRange,
  plusMonths,
  yearPickerInitialIndex,
} from '@kyralabs/m3e-motion';
import { pointerDrag } from '../base/drag.js';
import { attachRipple } from '../base/ripple.js';
import { readSpringTokens } from '../base/scroll.js';
import { el, setAttr, setText } from '../time-picker-layout/shared.js';
import { type DatePickerBaseOptions, DatePickerBase } from './base.js';
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
  updateMonth,
} from './calendar.js';
import type { DateField, DateFieldOptions } from './field.js';

export interface DatePickerLayoutOptions extends DatePickerBaseOptions {
  /** The selected date (UTC milliseconds of any time that day), or null. */
  selectedDate?: number | null | undefined;
  /** The user picked or entered a date (UTC midnight), or cleared it (null). */
  onChange?: ((dateMillis: number | null) => void) | undefined;
}

/** SnapFlingBehavior's MinFlingVelocityDp (dp/s): a faster swipe pages. */
const MIN_FLING_VELOCITY = 400;
const P = '--m3e-comp-date-picker';

interface Page {
  month: CalendarMonth;
  el: HTMLElement;
  days: HTMLElement[];
}

/**
 * Behavior of a `.m3e-date-picker` (COMPONENT_SPEC §27; Compose DatePicker), shared by
 * `<m3e-date-picker>` and m3e-react's `<DatePicker>`: it builds the m3e-css DOM inside the root.
 *
 * - The header (title, headline with the selection, mode toggle) and the picker / input switch
 *   (DatePickerBase).
 * - The calendar: the navigation row (the month and year button that opens the year grid, the
 *   previous / next month buttons, which page on LazyListState's spring()), the weekday row and
 *   the month grid, an APG grid (owner decision M10 D6): arrows, Home / End, Page Up / Down
 *   (Shift: a year), Enter / Space pick; crossing a month's edge pages. Touch and pen swipes page
 *   (one month per fling, the snap on DefaultEffects).
 * - The year grid (YearPicker): a listbox of the year range's years, three per row, opened at a
 *   row above the displayed year; arrows move, Enter / Space pick and close it.
 * - The input: a date field (DateInputContent) with Compose's validator and transformations, from
 *   the date-field entry, imported the first time the input mode shows.
 */
export class DatePickerLayout extends DatePickerBase<DatePickerLayoutOptions> {
  model: DatePickerModel;
  #yearButton!: HTMLButtonElement;
  #yearLabel!: HTMLElement;
  #prev!: HTMLButtonElement;
  #next!: HTMLButtonElement;
  #weekdays!: HTMLElement;
  #viewport!: HTMLElement;
  #years!: HTMLElement;
  #page: Page | null = null;
  #other: Page | null = null;
  #slide = new SpringAnimatable(0, 1 / 1000);
  #frame = 0;
  #focus: number | null = null;
  #field: DateField | null = null;

  constructor(root: HTMLElement, options: DatePickerLayoutOptions) {
    super(root, options);
    this.model = this.#newModel();
    this.root.replaceChildren(this.content);
    this.panes.input.hidden = this.model.displayMode !== 'input';
    this.panes.picker.hidden = !this.panes.input.hidden;
    void Promise.resolve(this.buildPane(this.model.displayMode)).then(() => {
      this.render();
    });
    this.render();
  }

  #newModel(): DatePickerModel {
    const o = this.options;
    return new DatePickerModel(
      o.selectedDate ?? null,
      o.displayedMonth ?? o.selectedDate ?? null,
      this.yearRange,
      o.displayMode ?? 'picker',
      this.firstDayOfWeek,
      this.today,
    );
  }

  protected get mode(): DatePickerDisplayMode {
    return this.model.displayMode;
  }

  protected set mode(mode: DatePickerDisplayMode) {
    this.model.displayMode = mode;
  }

  override update(options: DatePickerLayoutOptions): void {
    const before = this.options;
    this.options = options;
    this.resolve();
    const m = this.model;
    if (options.yearRange !== before.yearRange || m.firstDayOfWeek !== this.firstDayOfWeek) {
      this.model = this.#newModel();
    } else {
      if (options.selectedDate !== undefined && options.selectedDate !== m.selectedDateMillis) {
        m.selectedDateMillis = options.selectedDate;
        if (options.selectedDate !== null) this.#field?.setDate(m.selectedDateMillis);
      }
      if (options.displayedMonth != null && options.displayedMonth !== before.displayedMonth) {
        m.displayedMonthMillis = options.displayedMonth;
      }
    }
    super.update(options);
  }

  override destroy(): void {
    super.destroy();
    cancelAnimationFrame(this.#frame);
  }

  // --- Building -----------------------------------------------------------------------------

  protected buildPane(mode: DatePickerDisplayMode): Promise<void> | void {
    const pane = this.panes[mode];
    if (pane.firstChild) return;
    if (mode === 'picker') {
      this.#buildPicker(pane);
      return;
    }
    return this.options.loadDateField().then((Field) => {
      if (pane.firstChild) return;
      const wrap = el(this.root.ownerDocument, 'div', `${ROOT}__input`);
      this.#field = new Field(this.root.ownerDocument, this.#fieldOptions(), this.abort.signal);
      this.#field.setDate(this.model.selectedDateMillis);
      wrap.append(this.#field.root);
      pane.append(wrap);
    });
  }

  #buildPicker(pane: HTMLElement): void {
    const doc = this.root.ownerDocument;
    const { signal } = this.abort;
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement,
      type: K,
      listener: (e: HTMLElementEventMap[K]) => void,
    ) => {
      target.addEventListener(type, listener, { signal });
    };
    const nav = el(doc, 'div', `${ROOT}__nav`);
    this.#yearButton = el(doc, 'button', `m3e-button m3e-button--text ${ROOT}__year-button`, {
      type: 'button',
      'aria-expanded': 'false',
    });
    this.#yearLabel = el(doc, 'span', '', { 'aria-live': 'polite' });
    this.#yearButton.append(
      this.#yearLabel,
      el(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' }),
    );
    setText(this.#yearButton.lastElementChild as HTMLElement, 'arrow_drop_down');
    attachRipple(this.#yearButton, signal);
    on(this.#yearButton, 'click', () => {
      this.#toggleYears(!this.root.hasAttribute('data-years'));
    });
    const arrows = el(doc, 'span', `${ROOT}__arrows`);
    const arrow = (icon: string, delta: number) => {
      const button = el(doc, 'button', 'm3e-icon-button', { type: 'button' });
      const glyph = el(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' });
      glyph.textContent = icon;
      button.append(glyph);
      attachRipple(button, signal);
      on(button, 'click', () => {
        this.#go(plusOrMinus(this.model.displayedMonth, delta, this.firstDayOfWeek), delta);
      });
      arrows.append(button);
      return button;
    };
    this.#prev = arrow('keyboard_arrow_left', -1);
    this.#next = arrow('keyboard_arrow_right', 1);
    nav.append(this.#yearButton, arrows);

    const body = el(doc, 'div', `${ROOT}__body`);
    const calendar = el(doc, 'div', `${ROOT}__calendar`, { role: 'grid' });
    this.#weekdays = el(doc, 'div', `${ROOT}__weekdays`, { role: 'row' });
    this.#viewport = el(doc, 'div', `${ROOT}__viewport`);
    calendar.append(this.#weekdays, this.#viewport);
    this.#years = el(doc, 'div', `${ROOT}__years`, { role: 'listbox' });
    body.append(calendar, this.#years);
    pane.append(nav, body);

    delegateRipple(this.#viewport, `.${ROOT}__day[data-date]`, signal);
    delegateRipple(this.#years, `.${ROOT}__year`, signal);
    on(this.#viewport, 'click', (e) => {
      const day = (e.target as Element).closest<HTMLElement>(`.${ROOT}__day[data-date]`);
      if (day) this.#pick(Number(day.dataset['date']));
    });
    on(this.#viewport, 'keydown', (e) => {
      this.#dayKey(e);
    });
    on(this.#years, 'click', (e) => {
      const year = (e.target as Element).closest<HTMLElement>(`.${ROOT}__year`);
      if (year) this.#pickYear(Number(year.dataset['year']));
    });
    on(this.#years, 'keydown', (e) => {
      this.#yearKey(e);
    });
    on(this.#years, 'animationend', () => {
      if (this.#years.dataset['state'] === 'closing') delete this.#years.dataset['state'];
    });
    pointerDrag(this.#viewport, {
      axis: 'x',
      accept: (e) => e.pointerType !== 'mouse',
      start: () => true,
      move: (delta) => {
        this.#drag(delta);
      },
      end: (velocity) => {
        this.#release(velocity);
      },
    });
  }

  #fieldOptions(): DateFieldOptions {
    return {
      label: this.strings.inputLabel,
      format: this.format,
      zeroDigit: this.zeroDigit,
      input: 'single' as const,
      validation: () => ({
        yearRange: this.yearRange,
        selectableDates: this.options.selectableDates,
        format: this.format,
        errors: {
          datePattern: this.strings.invalidPattern,
          outOfYearRange: this.strings.invalidYearRange,
          notAllowed: this.strings.invalidNotAllowed,
          invalidRange: this.strings.invalidRange,
        },
        formatDate: (ms: number) => this.formatDate(ms, 'yMMMd'),
        formatYear: this.formatYear,
      }),
      onSelection: (millis: number | null) => {
        this.#select(millis);
      },
    };
  }

  // --- Rendering ----------------------------------------------------------------------------

  protected render(): void {
    const { model, strings, root } = this;
    root.className = [ROOT, this.options.className ?? ''].filter(Boolean).join(' ');
    root.dataset['mode'] = model.displayMode;
    const input = model.displayMode === 'input';
    const selected = model.selectedDateMillis;
    this.renderHeader(
      input ? strings.inputTitle : strings.pickerTitle,
      [
        selected === null
          ? input
            ? strings.inputHeadline
            : strings.pickerHeadline
          : this.formatDate(selected, 'yMMMd'),
      ],
      formatString(
        input ? strings.inputHeadlineDescription : strings.headlineDescription,
        selected === null
          ? input
            ? strings.noInput
            : strings.noSelection
          : this.formatDate(selected, 'yMMMMEEEEd'),
      ),
    );
    if (this.#field) this.#field.update(this.#fieldOptions());
    if (this.panes.picker.firstChild === null) return;
    const month = model.displayedMonth;
    const open = root.hasAttribute('data-years');
    setText(this.#yearLabel, this.formatDate(month.startUtcTimeMillis, 'yMMMM'));
    setAttr(this.#yearButton, 'aria-expanded', String(open));
    setAttr(
      this.#yearButton,
      'aria-label',
      `${this.#yearLabel.textContent}, ${open ? strings.switchToDay : strings.switchToYear}`,
    );
    const index = monthIndexIn(month, this.yearRange);
    this.#prev.disabled = index <= 0;
    this.#next.disabled = index >= numberOfMonthsInRange(this.yearRange) - 1;
    setAttr(this.#prev, 'aria-label', strings.previousMonth);
    setAttr(this.#next, 'aria-label', strings.nextMonth);
    renderWeekdays(this.#weekdays, this.weekdays, this.firstDayOfWeek);
    if (this.#page?.month.startUtcTimeMillis !== month.startUtcTimeMillis) {
      this.#page?.el.remove();
      this.#page = this.#newPage(month);
      this.#viewport.append(this.#page.el);
    } else {
      updateMonth(this.#page.days, month, this.#state());
    }
    setAttr(this.#page.el, 'aria-label', this.#yearLabel.textContent);
    setRovingDay(this.#page.days, this.#focus ?? restingDay(month, this.#state()));
    if (open) this.#renderYears();
  }

  #state(): MonthState {
    return {
      todayMillis: this.today,
      start: this.model.selectedDateMillis,
      end: null,
      range: false,
      selectable: this.options.selectableDates,
      locale: this.locale,
      strings: this.strings,
      firstDayOfWeek: this.firstDayOfWeek,
    };
  }

  #newPage(month: CalendarMonth): Page {
    const page = el(this.root.ownerDocument, 'div', `${ROOT}__month`, { role: 'rowgroup' });
    return { month, el: page, days: renderMonth(page, month, this.#state()) };
  }

  // --- Selection ------------------------------------------------------------------------------

  #select(millis: number | null): void {
    const before = this.model.selectedDateMillis;
    this.model.selectedDateMillis = millis;
    if (this.model.selectedDateMillis !== before) {
      this.render();
      this.options.onChange?.(this.model.selectedDateMillis);
    }
  }

  #pick(millis: number): void {
    const day = this.#page?.days.find((d) => d.dataset['date'] === String(millis));
    if (!day || day.getAttribute('aria-disabled') === 'true') return;
    this.#focus = millis;
    this.#select(millis);
  }

  // --- Months -------------------------------------------------------------------------------

  /** Shows `month` (slid in from `direction`, 0: at once) and reports it. */
  #go(month: CalendarMonth, direction: number, focus?: number): void {
    const model = this.model;
    const from = model.displayedMonth;
    model.displayedMonthMillis = month.startUtcTimeMillis;
    if (model.displayedMonth.startUtcTimeMillis === from.startUtcTimeMillis) return;
    this.#focus = focus ?? null;
    const old = this.#page;
    this.#finishSlide();
    if (direction !== 0 && old) {
      // The outgoing page stays to slide away; render() puts the new one in.
      this.#page = null;
      this.#other = old;
      this.render();
      this.#slide.snapTo(direction * this.#viewport.clientWidth);
      this.#animate(0, `${P}-month-page`);
    } else {
      this.render();
    }
    if (focus !== undefined) this.#focusDay(focus);
    this.options.onDisplayedMonthChange?.(model.displayedMonthMillis);
  }

  #focusDay(millis: number): void {
    setRovingDay(this.#page?.days ?? [], millis)?.focus({ preventScroll: true });
  }

  /** Places the pages: the current one `offset` px along the paging direction. */
  #place(): void {
    const rtl = getComputedStyle(this.root).direction === 'rtl' ? -1 : 1;
    const width = this.#viewport.clientWidth;
    const offset = this.#slide.value;
    const at = (page: Page | null, x: number) => {
      if (page) page.el.style.transform = x === 0 ? '' : `translateX(${String(x * rtl)}px)`;
    };
    at(this.#page, offset);
    at(this.#other, offset - Math.sign(offset || 1) * width);
  }

  #animate(target: number, spring: string, velocity?: number): void {
    const now = performance.now();
    this.#slide.animateTo(
      target,
      readSpringTokens(getComputedStyle(this.root), spring),
      now,
      velocity,
    );
    this.#tick(now);
  }

  #tick(now: number): void {
    this.#slide.sample(now);
    this.#place();
    if (this.#slide.isRunning) {
      this.#frame = requestAnimationFrame((t) => {
        this.#tick(Math.max(t, performance.now()));
      });
    } else {
      this.#finishSlide();
    }
  }

  #finishSlide(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#slide.snapTo(0);
    this.#other?.el.remove();
    this.#other = null;
    this.#place();
  }

  /** A swipe: the current page follows; the neighbour on the revealed side comes in. */
  #drag(delta: number): void {
    if (this.#frame) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }
    const rtl = getComputedStyle(this.root).direction === 'rtl' ? -1 : 1;
    const offset = this.#slide.value + delta * rtl;
    const side = offset > 0 ? -1 : 1;
    const neighbour = plusOrMinus(this.model.displayedMonth, side, this.firstDayOfWeek);
    const index = monthIndexIn(neighbour, this.yearRange);
    if (index < 0 || index >= numberOfMonthsInRange(this.yearRange)) {
      this.#slide.snapTo(0);
      this.#place();
      return;
    }
    if (this.#other?.month.startUtcTimeMillis !== neighbour.startUtcTimeMillis) {
      this.#other?.el.remove();
      this.#other = this.#newPage(neighbour);
      this.#viewport.append(this.#other.el);
    }
    this.#slide.snapTo(offset);
    this.#place();
  }

  /** The swipe ended: a fling or more than half a page moves one month; else back. */
  #release(velocity: number): void {
    const rtl = getComputedStyle(this.root).direction === 'rtl' ? -1 : 1;
    const v = velocity * rtl;
    const offset = this.#slide.value;
    const width = this.#viewport.clientWidth;
    const fling = Math.abs(v) >= MIN_FLING_VELOCITY;
    const side = fling
      ? v > 0
        ? -1
        : 1
      : Math.abs(offset) > width / 2
        ? offset > 0
          ? -1
          : 1
        : 0;
    if (side === 0 || !this.#other) {
      this.#animate(0, `${P}-month-snap`, v);
      return;
    }
    // The neighbour becomes the current page, carried from where it is.
    const next = this.#other;
    this.#other = this.#page;
    this.#page = next;
    this.model.displayedMonthMillis = next.month.startUtcTimeMillis;
    this.#slide.snapTo(offset + side * width);
    this.render();
    this.#animate(0, `${P}-month-snap`, v);
    this.options.onDisplayedMonthChange?.(this.model.displayedMonthMillis);
  }

  #dayKey(e: KeyboardEvent): void {
    const day = (e.target as Element).closest<HTMLElement>(`.${ROOT}__day[data-date]`);
    if (!day) return;
    const millis = Number(day.dataset['date']);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.#pick(millis);
      return;
    }
    const rtl = getComputedStyle(this.root).direction === 'rtl';
    const raw = gridKeyTarget(e.key, e.shiftKey, millis, rtl, this.firstDayOfWeek);
    if (raw === null) return;
    e.preventDefault();
    const target = clampToYears(raw, this.yearRange);
    const month = calendarMonthOf(target, this.firstDayOfWeek);
    const current = this.model.displayedMonth;
    if (month.startUtcTimeMillis === current.startUtcTimeMillis) {
      this.#focus = target;
      this.#focusDay(target);
    } else {
      this.#go(month, month.startUtcTimeMillis > current.startUtcTimeMillis ? 1 : -1, target);
    }
  }

  // --- Years -----------------------------------------------------------------------------------

  #toggleYears(open: boolean): void {
    if (open) {
      this.root.toggleAttribute('data-years', true);
      this.#years.dataset['state'] = 'open';
      this.#renderYears(true);
    } else if (this.root.hasAttribute('data-years')) {
      this.root.removeAttribute('data-years');
      this.#years.dataset['state'] = 'closing';
    }
    this.render();
  }

  #renderYears(opening = false): void {
    const doc = this.root.ownerDocument;
    const [first, last] = this.yearRange;
    const displayed = this.model.displayedMonth.year;
    const current = calendarMonthOf(this.today, 1).year;
    if (this.#years.childElementCount !== last - first + 1) {
      const years: HTMLElement[] = [];
      for (let y = first; y <= last; y++) {
        const year = el(doc, 'span', `${ROOT}__year`, { role: 'option', 'data-year': String(y) });
        year.textContent = this.formatYear(y);
        years.push(year);
      }
      this.#years.replaceChildren(...years);
    }
    setAttr(this.#years, 'aria-label', this.strings.yearPickerTitle);
    for (const year of this.#years.children as HTMLCollectionOf<HTMLElement>) {
      const y = Number(year.dataset['year']);
      setAttr(year, 'aria-selected', String(y === displayed));
      setAttr(year, 'aria-current', y === current ? 'date' : null);
      setAttr(
        year,
        'aria-disabled',
        isSelectableYear(this.options.selectableDates, y) ? null : 'true',
      );
      setAttr(year, 'aria-label', formatString(this.strings.navigateToYear, this.formatYear(y)));
      year.tabIndex = y === displayed ? 0 : -1;
    }
    if (opening) {
      // A few rows above the displayed year (YearPicker's initial index), the year focused.
      const selected = this.#years.children[displayed - first] as HTMLElement | undefined;
      const row = Math.floor(yearPickerInitialIndex(displayed, this.yearRange) / 3);
      const firstOfRow = this.#years.children[row * 3] as HTMLElement | undefined;
      this.#years.scrollTop = firstOfRow ? firstOfRow.offsetTop - this.#years.offsetTop : 0;
      selected?.focus({ preventScroll: true });
    }
  }

  #pickYear(year: number): void {
    if (!isSelectableYear(this.options.selectableDates, year)) return;
    const month = this.model.displayedMonth;
    this.#toggleYears(false);
    this.#go(calendarMonth(year, month.month, this.firstDayOfWeek), 0);
    this.#yearButton.focus();
  }

  #yearKey(e: KeyboardEvent): void {
    const year = (e.target as Element).closest<HTMLElement>(`.${ROOT}__year`);
    if (!year) return;
    const y = Number(year.dataset['year']);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.#pickYear(y);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.#toggleYears(false);
      this.#yearButton.focus();
      return;
    }
    const rtl = getComputedStyle(this.root).direction === 'rtl' ? -1 : 1;
    const step: Record<string, number> = {
      ArrowLeft: -rtl,
      ArrowRight: rtl,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    const [first, last] = this.yearRange;
    let target = y + (step[e.key] ?? 0);
    if (e.key === 'Home') target = first;
    else if (e.key === 'End') target = last;
    else if (step[e.key] === undefined) return;
    e.preventDefault();
    target = Math.min(Math.max(target, first), last);
    for (const node of this.#years.children as HTMLCollectionOf<HTMLElement>) {
      node.tabIndex = Number(node.dataset['year']) === target ? 0 : -1;
    }
    (this.#years.children[target - first] as HTMLElement | undefined)?.focus();
  }
}

const plusOrMinus = (month: CalendarMonth, delta: number, firstDayOfWeek: number) =>
  delta >= 0
    ? plusMonths(month, delta, firstDayOfWeek)
    : minusMonths(month, -delta, firstDayOfWeek);
