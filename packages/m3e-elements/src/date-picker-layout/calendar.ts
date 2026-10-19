import {
  type CalendarMonth,
  DAYS_IN_WEEK,
  MAX_CALENDAR_ROWS,
  MILLISECONDS_IN_24_HOURS,
  type SelectableDates,
  type YearRange,
  calendarDate,
  calendarMonth,
  dateRangeBackground,
  dayContentDescription,
  firstEnabledDay,
  monthDays,
  selectedRangeInfo,
} from '@kyralabs/m3e-motion';
import { PRESS_KEYS, isRippleDisabled, pressRipple, releaseRipple } from '../base/ripple.js';
import { el, localNumber, setAttr, setText } from '../time-picker-layout/shared.js';
import { formatSkeleton } from './locale.js';
import type { DatePickerStrings } from './strings.js';

export const ROOT = 'm3e-date-picker';

/** What a month grid shows (Month, DatePicker.kt L1941–2084). */
export interface MonthState {
  todayMillis: number;
  /** The selected date (a single picker) or the range start. */
  start: number | null;
  end: number | null;
  /** A range picker: the words "Start date" / "End date" / "In range" and the band. */
  range: boolean;
  selectable?: SelectableDates | undefined;
  locale: string;
  strings: DatePickerStrings;
  firstDayOfWeek: number;
  /** Docked (owner decision M10 D15): the other months' days dimmed, not blank. */
  outside?: boolean;
}

/**
 * Builds a month's six rows of seven cells into `month` (a `__month` rowgroup): the days are
 * gridcells with the day number, the empty cells blank (Spacers) or, docked, the neighbouring
 * months' days dimmed. Returns the day cells in order.
 */
export function renderMonth(month: HTMLElement, m: CalendarMonth, s: MonthState): HTMLElement[] {
  const doc = month.ownerDocument;
  const rows: HTMLElement[] = [];
  const days: HTMLElement[] = [];
  let cell = 0;
  for (let row = 0; row < MAX_CALENDAR_ROWS; row++) {
    const week = el(doc, 'div', `${ROOT}__week`, { role: 'row' });
    for (let column = 0; column < DAYS_IN_WEEK; column++, cell++) {
      const day = el(doc, 'span', `${ROOT}__day`, { role: 'gridcell' });
      const number = cell - m.daysFromStartOfWeekToFirstOfMonth;
      if (number >= 0 && number < m.numberOfDays) {
        day.dataset['date'] = String(m.startUtcTimeMillis + number * MILLISECONDS_IN_24_HOURS);
        day.textContent = localNumber(number + 1, s.locale);
        days.push(day);
      } else if (s.outside) {
        const date = calendarDate(m.startUtcTimeMillis + number * MILLISECONDS_IN_24_HOURS);
        day.textContent = localNumber(date.dayOfMonth, s.locale);
        day.dataset['outside'] = '';
        setAttr(day, 'aria-hidden', 'true');
      }
      week.append(day);
    }
    rows.push(week);
  }
  month.replaceChildren(...rows);
  updateMonth(days, m, s);
  return days;
}

/** Writes the days' states and names (selection, today, range, enabled). */
export function updateMonth(days: readonly HTMLElement[], m: CalendarMonth, s: MonthState): void {
  const cells = monthDays(m, s.todayMillis, s.start, s.end, s.range, s.selectable);
  cells.forEach((c, i) => {
    const day = days[i];
    if (!day) return;
    const selected = c.isStart || c.isEnd;
    setAttr(day, 'aria-selected', String(selected));
    setAttr(day, 'aria-current', c.isToday ? 'date' : null);
    setAttr(day, 'aria-disabled', c.enabled ? null : 'true');
    day.toggleAttribute('data-in-range', c.inRange && !selected);
    day.toggleAttribute('data-start', c.isStart);
    day.toggleAttribute('data-end', c.isEnd);
    const description = dayContentDescription(s.range, c, {
      start: s.strings.start,
      end: s.strings.end,
      inRange: s.strings.inRange,
      today: s.strings.today,
    });
    const date = formatSkeleton(c.utcTimeMillis, 'yMMMMEEEEd', s.locale);
    setAttr(day, 'aria-label', description === null ? date : `${description}, ${date}`);
  });
}

/**
 * The range band behind a month (drawRangeBackground, DateRangePicker.kt L1039–1115): absolutely
 * placed rectangles from m3e-motion's port, in the month's width.
 */
export function renderBand(month: HTMLElement, m: CalendarMonth, s: MonthState): void {
  for (const band of month.querySelectorAll(`:scope > .${ROOT}__band`)) band.remove();
  if (s.start === null || s.end === null) return;
  const info = selectedRangeInfo(m, calendarDate(s.start), calendarDate(s.end));
  if (!info) return;
  const rtl = getComputedStyle(month).direction === 'rtl';
  const style = getComputedStyle(month);
  const cell = Number.parseFloat(style.getPropertyValue('--_m3e-date-picker-cell')) || 48;
  const layer =
    Number.parseFloat(
      style.getPropertyValue('--m3e-comp-date-picker-modal-date-state-layer-height'),
    ) || 40;
  const width = month.clientWidth;
  for (const [x, y, w] of dateRangeBackground(info, width, rtl, cell, layer)) {
    // A negative (RTL) width draws leftwards from x.
    const left = w < 0 ? x + w : x;
    const band = el(month.ownerDocument, 'span', `${ROOT}__band`, {
      'aria-hidden': 'true',
      style: `left: ${String(left)}px; top: ${String(y)}px; width: ${String(Math.abs(w))}px`,
    });
    month.prepend(band);
  }
}

/** The day the grid's roving tabindex rests on: the selection, today, or the first enabled day. */
export function restingDay(m: CalendarMonth, s: MonthState): number {
  const inMonth = (ms: number | null) =>
    ms !== null && ms >= m.startUtcTimeMillis && ms <= m.endUtcTimeMillis ? ms : null;
  return (
    inMonth(s.start) ??
    inMonth(s.todayMillis) ??
    m.startUtcTimeMillis +
      Math.min(
        firstEnabledDay(m, s.selectable) - m.daysFromStartOfWeekToFirstOfMonth,
        m.numberOfDays - 1,
      ) *
        MILLISECONDS_IN_24_HOURS
  );
}

/** Sets the roving tabindex on the day `millis` (or the first day). */
export function setRovingDay(
  days: readonly HTMLElement[],
  millis: number,
): HTMLElement | undefined {
  const target = days.find((d) => d.dataset['date'] === String(millis)) ?? days[0];
  for (const day of days) day.tabIndex = day === target ? 0 : -1;
  return target;
}

/**
 * The APG date grid's keys (owner decision M10 D6; Compose moves only left / right): the date a
 * key moves the focus to, or null. Arrows ±1 day (mirrored in RTL) / ±1 week, Home / End the week's
 * start / end, Page Up / Down ±1 month (Shift: ±1 year), the day clamped to the month's length.
 */
export function gridKeyTarget(
  key: string,
  shift: boolean,
  from: number,
  rtl: boolean,
  firstDayOfWeek: number,
): number | null {
  const day = MILLISECONDS_IN_24_HOURS;
  const date = calendarDate(from);
  const iso = ((new Date(from).getUTCDay() + 6) % 7) + 1;
  const back = (iso - firstDayOfWeek + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  switch (key) {
    case 'ArrowLeft':
      return from + (rtl ? day : -day);
    case 'ArrowRight':
      return from + (rtl ? -day : day);
    case 'ArrowUp':
      return from - DAYS_IN_WEEK * day;
    case 'ArrowDown':
      return from + DAYS_IN_WEEK * day;
    case 'Home':
      return from - back * day;
    case 'End':
      return from + (DAYS_IN_WEEK - 1 - back) * day;
    case 'PageUp':
    case 'PageDown': {
      const step = (key === 'PageUp' ? -1 : 1) * (shift ? 12 : 1);
      const index = date.year * 12 + date.month - 1 + step;
      const target = calendarMonth(Math.floor(index / 12), (index % 12) + 1, firstDayOfWeek);
      return target.startUtcTimeMillis + (Math.min(date.dayOfMonth, target.numberOfDays) - 1) * day;
    }
    default:
      return null;
  }
}

/** Keeps `millis` within the year range. */
export function clampToYears(millis: number, years: YearRange): number {
  const first = calendarMonth(years[0], 1, 1).startUtcTimeMillis;
  const last = calendarMonth(years[1], 12, 1).endUtcTimeMillis - MILLISECONDS_IN_24_HOURS + 1;
  return Math.min(Math.max(millis, first), last);
}

/** The weekday header: narrow names, the full name for assistive technology (WeekDays L1890). */
export function renderWeekdays(
  row: HTMLElement,
  names: readonly [string, string][],
  firstDayOfWeek: number,
): void {
  const doc = row.ownerDocument;
  const cells: HTMLElement[] = [];
  for (let i = 0; i < DAYS_IN_WEEK; i++) {
    const name = names[(firstDayOfWeek - 1 + i) % DAYS_IN_WEEK];
    if (!name) continue;
    const [full, narrow] = name;
    const cell = el(doc, 'span', `${ROOT}__weekday`, { role: 'columnheader', 'aria-label': full });
    setText(cell, narrow);
    cells.push(cell);
  }
  row.replaceChildren(...cells);
}

/**
 * The state layer's press ripple for every `selector` inside `container` (days, years, menu
 * items), from one set of listeners.
 */
export function delegateRipple(
  container: HTMLElement,
  selector: string,
  signal: AbortSignal,
): void {
  let pressed: HTMLElement | null = null;
  const release = () => {
    if (pressed) releaseRipple(pressed);
    pressed = null;
  };
  const press = (target: EventTarget | null, point: { x: number; y: number } | null) => {
    const host = target instanceof Element ? target.closest<HTMLElement>(selector) : null;
    if (!host || isRippleDisabled(host)) return;
    release();
    host.setAttribute('data-ripple', '');
    pressRipple(host, point);
    pressed = host;
  };
  const options = { signal };
  container.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button === 0) press(e.target, { x: e.clientX, y: e.clientY });
    },
    options,
  );
  for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'focusout', 'keyup'] as const) {
    container.addEventListener(type, release, options);
  }
  container.addEventListener(
    'keydown',
    (e) => {
      if (PRESS_KEYS.has(e.key) && !e.repeat) press(e.target, null);
    },
    options,
  );
}
