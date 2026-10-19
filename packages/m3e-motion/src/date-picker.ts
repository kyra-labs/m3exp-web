/*
 * Copyright 2022 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/{DatePicker,DateRangePicker,DateInput,internal/CalendarModel}.kt and compose/material3/material3/src/androidMain/kotlin/androidx/compose/material3/internal/CalendarModelImpl.android.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// Date picker (COMPONENT_SPEC §27), shared by m3e-elements' date picker layouts and therefore by
// the date picker elements and m3e-react's date pickers:
// - the calendar model (CalendarModel.kt, CalendarModelImpl.android.kt, the java.time model of API
//   26+): CalendarDate / CalendarMonth with UTC-midnight milliseconds, getCanonicalDate (L86–94),
//   getMonth (L201–228: the first day of the week comes from the locale, see the layouts),
//   plusMonths / minusMonths (L114–128), indexIn / endUtcTimeMillis (CalendarModel.kt L258–264),
//   datePatternAsInputFormat (L299–313), parse / formatWithPattern (L130–156, L170–180: java.time's
//   DateTimeFormatter.ofPattern with the SMART resolver, which clamps a day past the month's end);
// - DatePickerModel / DateRangePickerModel: BaseDatePickerStateImpl, DatePickerStateImpl
//   (DatePicker.kt L1147–1262), DateRangePickerStateImpl (DateRangePicker.kt L565–669);
// - the month grid: numberOfMonthsInRange (DatePicker.kt L2087–2088), getFirstEnabledDay /
//   getLastEnabledDay (L2181–2214), dayContentDescription (L2216–2239), YearPicker's first index
//   (L2329); the range: updateDateSelection (DateRangePicker.kt L945–964), SelectedRangeInfo
//   (L975–1031) and drawRangeBackground (L1039–1115);
// - the date input: DateInputValidator.validate (DateInput.kt L302–347), DateInputTransformation
//   (L384–421) and DateOutputTransformation (L427–444).
// Checked against a JVM run of the vendored Kotlin (`pnpm reference:date-picker`). Locale data
// (the first day of the week, names, the SHORT date pattern, the digits) is the layouts' job (Intl);
// everything here takes it as arguments. No module-level state.

const f = Math.fround;

/** DaysInWeek (CalendarModel.kt L315). */
export const DAYS_IN_WEEK = 7;
/** MillisecondsIn24Hours (CalendarModel.kt L316). */
export const MILLISECONDS_IN_24_HOURS = 86_400_000;
/** MaxCalendarRows (DatePicker.kt L2631): a month is always drawn on six rows. */
export const MAX_CALENDAR_ROWS = 6;
/** YearsInRow (DatePicker.kt L2632): the year grid's columns. */
export const YEARS_IN_ROW = 3;

/** An inclusive year range (Kotlin's IntRange). */
export type YearRange = readonly [first: number, last: number];

/** DatePickerDefaults.YearRange (DatePicker.kt L787). */
export const DATE_PICKER_YEAR_RANGE: YearRange = [1900, 2100];

/** DisplayMode (DatePicker.kt L350–370). */
export type DatePickerDisplayMode = 'picker' | 'input';

/** CalendarDate (CalendarModel.kt L220–233). */
export interface CalendarDate {
  year: number;
  /** 1–12. */
  month: number;
  dayOfMonth: number;
  /** The day's start in UTC milliseconds from the epoch. */
  utcTimeMillis: number;
}

/** CalendarMonth (CalendarModel.kt L245–268). */
export interface CalendarMonth {
  year: number;
  /** 1–12. */
  month: number;
  numberOfDays: number;
  /** Empty cells before the 1st (the first day of the week comes first). */
  daysFromStartOfWeekToFirstOfMonth: number;
  startUtcTimeMillis: number;
  /** The month's last millisecond. */
  endUtcTimeMillis: number;
}

/** SelectableDates (DatePicker.kt L303–316); both default to true. */
export interface SelectableDates {
  isSelectableDate?(utcTimeMillis: number): boolean;
  isSelectableYear?(year: number): boolean;
}

export const isSelectableDate = (s: SelectableDates | undefined, utcTimeMillis: number): boolean =>
  s?.isSelectableDate?.(utcTimeMillis) ?? true;

export const isSelectableYear = (s: SelectableDates | undefined, year: number): boolean =>
  s?.isSelectableYear?.(year) ?? true;

export const yearRangeContains = (range: YearRange, year: number): boolean =>
  year >= range[0] && year <= range[1];

/** A UTC midnight (setUTCFullYear: Date.UTC maps years 0–99 to 1900–1999). */
const utcMidnight = (year: number, month: number, day: number): number => {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return d.getTime();
};

/** ISO day of the week, Monday 1 … Sunday 7 (java.time DayOfWeek.value). */
const isoDayOfWeek = (utcMillis: number): number => ((new Date(utcMillis).getUTCDay() + 6) % 7) + 1;

/** getCanonicalDate (CalendarModelImpl.android.kt L86–94): the date of a UTC instant. */
export function calendarDate(timeInMillis: number): CalendarDate {
  const day = Math.floor(timeInMillis / MILLISECONDS_IN_24_HOURS);
  const d = new Date(day * MILLISECONDS_IN_24_HOURS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    dayOfMonth: d.getUTCDate(),
    utcTimeMillis: day * MILLISECONDS_IN_24_HOURS,
  };
}

/** getDayOfWeek: ISO 1 (Monday) … 7 (Sunday). */
export const calendarDayOfWeek = (date: CalendarDate): number => isoDayOfWeek(date.utcTimeMillis);

/**
 * getMonth(year, month) (CalendarModelImpl.android.kt L201–228) for a locale whose week starts on
 * `firstDayOfWeek` (ISO: 1 Monday … 7 Sunday; WeekFields.of(locale).firstDayOfWeek).
 */
export function calendarMonth(year: number, month: number, firstDayOfWeek: number): CalendarMonth {
  const start = utcMidnight(year, month, 1);
  const numberOfDays = Math.round(
    (utcMidnight(year, month + 1, 1) - start) / MILLISECONDS_IN_24_HOURS,
  );
  const difference = isoDayOfWeek(start) - firstDayOfWeek;
  return {
    year,
    month,
    numberOfDays,
    daysFromStartOfWeekToFirstOfMonth: difference < 0 ? difference + DAYS_IN_WEEK : difference,
    startUtcTimeMillis: start,
    endUtcTimeMillis: start + numberOfDays * MILLISECONDS_IN_24_HOURS - 1,
  };
}

/** getMonth(timeInMillis): the month of a UTC instant. */
export function calendarMonthOf(timeInMillis: number, firstDayOfWeek: number): CalendarMonth {
  const d = calendarDate(timeInMillis);
  return calendarMonth(d.year, d.month, firstDayOfWeek);
}

const addMonths = (from: CalendarMonth, n: number, firstDayOfWeek: number): CalendarMonth => {
  const index = from.year * 12 + (from.month - 1) + n;
  return calendarMonth(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1, firstDayOfWeek);
};

/** plusMonths (CalendarModelImpl.android.kt L114–120): `from` itself for n ≤ 0. */
export const plusMonths = (
  from: CalendarMonth,
  n: number,
  firstDayOfWeek: number,
): CalendarMonth => (n <= 0 ? from : addMonths(from, n, firstDayOfWeek));

/** minusMonths (L122–128): `from` itself for n ≤ 0. */
export const minusMonths = (
  from: CalendarMonth,
  n: number,
  firstDayOfWeek: number,
): CalendarMonth => (n <= 0 ? from : addMonths(from, -n, firstDayOfWeek));

/** CalendarMonth.indexIn (CalendarModel.kt L261–263): the month's page in the year range. */
export const monthIndexIn = (month: CalendarMonth, years: YearRange): number =>
  (month.year - years[0]) * 12 + month.month - 1;

/** numberOfMonthsInRange (DatePicker.kt L2087–2088). */
export const numberOfMonthsInRange = (years: YearRange): number => (years[1] - years[0] + 1) * 12;

// --- Date input format ---------------------------------------------------------------------------

/** DateInputFormat (CalendarModel.kt L276–279). */
export interface DateInputFormat {
  /** E.g. "MM/dd/yyyy". */
  patternWithDelimiters: string;
  delimiter: string;
  /** E.g. "MMddyyyy". */
  patternWithoutDelimiters: string;
}

export const dateInputFormat = (
  patternWithDelimiters: string,
  delimiter: string,
): DateInputFormat => ({
  patternWithDelimiters,
  delimiter,
  patternWithoutDelimiters: patternWithDelimiters.replaceAll(delimiter, ''),
});

/**
 * datePatternAsInputFormat (CalendarModel.kt L299–313): a locale's SHORT date pattern as a
 * ten-character input pattern (dd, MM, yyyy and one delimiter). Throws where Kotlin's `!!` would
 * (no delimiter).
 */
export function datePatternAsInputFormat(localeFormat: string): DateInputFormat {
  let pattern = localeFormat
    .replace(/[^dMy/\-.]/g, '')
    .replace(/d{1,2}/g, 'dd')
    .replace(/M{1,2}/g, 'MM')
    .replace(/y{1,4}/g, 'yyyy')
    .replaceAll('My', 'M/y'); // Edge case for the Kako locale
  if (pattern.endsWith('.')) pattern = pattern.slice(0, -1);
  const delimiter = /[/\-.]/.exec(pattern)?.[0];
  if (delimiter === undefined) throw new Error(`no date delimiter in "${localeFormat}"`);
  return dateInputFormat(pattern, delimiter);
}

const isDigit = (char: string): boolean => /^\p{Nd}$/u.test(char);

/**
 * The value of a UTF-16 unit that is a Unicode decimal digit (Character.digit), or -1. Decimal digit
 * blocks run zero … nine on consecutive code points.
 */
export function digitValue(char: string): number {
  if (!isDigit(char)) return -1;
  const code = char.charCodeAt(0);
  let value = 0;
  while (value < 9 && isDigit(String.fromCharCode(code - value - 1))) value++;
  return value;
}

/**
 * parse (CalendarModelImpl.android.kt L136–156): `date` in an input pattern without delimiters
 * ("MMddyyyy"), as DateTimeFormatter.ofPattern(pattern) parses it with its default SMART resolver:
 * day 1–31 and month 1–12 or no date, year-of-era ≥ 1, and a day past the month's end clamped to
 * the last day. Digits are read by value from any script (Kotlin strings: UTF-16 units).
 */
export function parseDate(date: string, pattern: string): CalendarDate | null {
  if (date.length !== pattern.length) return null;
  const fields: Record<string, number> = {};
  for (let i = 0; i < pattern.length;) {
    const letter = pattern.charAt(i);
    let value = 0;
    for (; pattern.charAt(i) === letter; i++) {
      const d = digitValue(date.charAt(i));
      if (d < 0) return null;
      value = value * 10 + d;
    }
    fields[letter] = value;
  }
  const { y: year = 0, M: month = 0, d: day = 0 } = fields;
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const length = calendarMonth(year, month, 1).numberOfDays;
  return calendarDate(utcMidnight(year, month, Math.min(day, length)));
}

/**
 * formatWithPattern (CalendarModelImpl.android.kt L170–180) for an input pattern without
 * delimiters: dd, MM (two digits) and yyyy (year-of-era, at least four), in the digits of
 * `zeroDigit`'s script.
 */
export function formatWithPattern(utcTimeMillis: number, pattern: string, zeroDigit = '0'): string {
  const date = calendarDate(utcTimeMillis);
  const zero = zeroDigit.charCodeAt(0);
  const digits = (value: number, width: number) =>
    String(value)
      .padStart(width, '0')
      .replace(/\d/g, (c) => String.fromCharCode(zero + Number(c)));
  return pattern
    .replace(/y+/g, (m) => digits(date.year > 0 ? date.year : 1 - date.year, m.length))
    .replace(/M+/g, (m) => digits(date.month, m.length))
    .replace(/d+/g, (m) => digits(date.dayOfMonth, m.length));
}

/**
 * DateOutputTransformation.transformOutput (DateInput.kt L427–444): the delimiters shown while the
 * digits are typed (the field holds digits only).
 */
export function dateOutputTransform(digits: string, format: DateInputFormat): string {
  const first = format.patternWithDelimiters.indexOf(format.delimiter);
  const second = format.patternWithDelimiters.lastIndexOf(format.delimiter);
  let text = digits;
  if (first >= 0 && first <= text.length) text = insertAt(text, first, format.delimiter);
  if (second > first && second <= text.length) text = insertAt(text, second, format.delimiter);
  return text;
}

const insertAt = (text: string, index: number, value: string): string =>
  text.slice(0, index) + value + text.slice(index);

/** InputIdentifier (DateInput.kt L353–378). */
export type DateInputIdentifier = 'single' | 'start' | 'end';

/** DateInputValidator's error templates (`%1$s` arguments, as Compose's strings). */
export interface DateInputErrors {
  /** The input doesn't match the pattern: `%1$s` = the pattern ("MM/DD/YYYY"). */
  datePattern: string;
  /** Out of the year range: `%1$s`–`%2$s`. */
  outOfYearRange: string;
  /** Not selectable: `%1$s` = the formatted date. */
  notAllowed: string;
  /** A range's start after its end (or the reverse). */
  invalidRange: string;
}

export interface DateInputValidation {
  yearRange: YearRange;
  selectableDates?: SelectableDates | undefined;
  format: DateInputFormat;
  errors: DateInputErrors;
  /** DatePickerFormatter.formatDate (no content description). */
  formatDate: (utcTimeMillis: number) => string;
  /** Int.toLocalString in the picker's locale. */
  formatYear: (year: number) => string;
  /** The range's other date (the start when validating the end, and the reverse). */
  currentStartDateMillis?: number | null | undefined;
  currentEndDateMillis?: number | null | undefined;
}

/** Compose's formatString for `%1$s`-style templates. */
export function formatString(template: string, ...args: unknown[]): string {
  let next = 0;
  return template.replace(/%(?:(\d+)\$)?([sd%])/g, (_, index: string | undefined, kind: string) =>
    kind === '%' ? '%' : String(args[index ? Number(index) - 1 : next++]),
  );
}

/**
 * DateInputValidator.validate (DateInput.kt L302–347): an error message, or "" for a valid date
 * (`null`: the text didn't parse).
 */
export function validateDateInput(
  date: CalendarDate | null,
  input: DateInputIdentifier,
  v: DateInputValidation,
): string {
  if (date === null) {
    return formatString(v.errors.datePattern, v.format.patternWithDelimiters.toUpperCase());
  }
  if (!yearRangeContains(v.yearRange, date.year)) {
    return formatString(
      v.errors.outOfYearRange,
      v.formatYear(v.yearRange[0]),
      v.formatYear(v.yearRange[1]),
    );
  }
  if (
    !isSelectableYear(v.selectableDates, date.year) ||
    !isSelectableDate(v.selectableDates, date.utcTimeMillis)
  ) {
    return formatString(v.errors.notAllowed, v.formatDate(date.utcTimeMillis));
  }
  if (
    (input === 'start' && date.utcTimeMillis > (v.currentEndDateMillis ?? Infinity)) ||
    (input === 'end' && date.utcTimeMillis < (v.currentStartDateMillis ?? -Infinity))
  ) {
    return v.errors.invalidRange;
  }
  return '';
}

export interface DateInputTransformResult {
  /** The field's digits after the edit (the original text when reverted). */
  text: string;
  reverted: boolean;
  /**
   * onDateSelectionChange's argument: the parsed, valid date, or null; undefined when it is not
   * called (a reverted edit).
   */
  selection: number | null | undefined;
}

/**
 * DateInputTransformation.transformInput (DateInput.kt L393–420): digits only, at most the
 * pattern's length; a complete, valid date selects it, anything else clears the selection.
 */
export function dateInputTransform(
  original: string,
  edited: string,
  input: DateInputIdentifier,
  v: DateInputValidation,
): DateInputTransformResult {
  let digits = true;
  for (let i = 0; i < edited.length; i++) digits &&= isDigit(edited.charAt(i));
  if (edited.length > v.format.patternWithoutDelimiters.length || !digits) {
    return { text: original, reverted: true, selection: undefined };
  }
  if (edited.length < v.format.patternWithoutDelimiters.length) {
    return { text: edited, reverted: false, selection: null };
  }
  const parsed = parseDate(edited, v.format.patternWithoutDelimiters);
  const error = validateDateInput(parsed, input, v);
  return {
    text: edited,
    reverted: false,
    selection: error === '' ? (parsed?.utcTimeMillis ?? null) : null,
  };
}

// --- States -------------------------------------------------------------------------------------

/**
 * BaseDatePickerStateImpl (DatePicker.kt L1147–1183): the displayed month, kept within the year
 * range (an initial month out of it shows today's month; a later one is ignored).
 */
class BaseDatePickerModel {
  readonly yearRange: YearRange;
  readonly firstDayOfWeek: number;
  #displayedMonth: CalendarMonth;

  constructor(
    initialDisplayedMonthMillis: number | null,
    yearRange: YearRange,
    firstDayOfWeek: number,
    todayMillis: number,
  ) {
    this.yearRange = yearRange;
    this.firstDayOfWeek = firstDayOfWeek;
    let month = calendarMonthOf(initialDisplayedMonthMillis ?? todayMillis, firstDayOfWeek);
    if (!yearRangeContains(yearRange, month.year))
      month = calendarMonthOf(todayMillis, firstDayOfWeek);
    this.#displayedMonth = month;
  }

  get displayedMonth(): CalendarMonth {
    return this.#displayedMonth;
  }

  get displayedMonthMillis(): number {
    return this.#displayedMonth.startUtcTimeMillis;
  }

  set displayedMonthMillis(monthMillis: number) {
    const month = calendarMonthOf(monthMillis, this.firstDayOfWeek);
    if (yearRangeContains(this.yearRange, month.year)) this.#displayedMonth = month;
  }

  /** A date in the year range, or null (DateRangePickerStateImpl.getDate L651–662). */
  protected dateInRange(dateMillis: number | null): CalendarDate | null {
    if (dateMillis === null) return null;
    const date = calendarDate(dateMillis);
    return yearRangeContains(this.yearRange, date.year) ? date : null;
  }
}

/** DatePickerStateImpl (DatePicker.kt L1206–1262). */
export class DatePickerModel extends BaseDatePickerModel {
  #selected: CalendarDate | null;
  #displayMode: DatePickerDisplayMode;

  constructor(
    initialSelectedDateMillis: number | null,
    initialDisplayedMonthMillis: number | null,
    yearRange: YearRange,
    initialDisplayMode: DatePickerDisplayMode,
    firstDayOfWeek: number,
    todayMillis: number,
  ) {
    super(initialDisplayedMonthMillis, yearRange, firstDayOfWeek, todayMillis);
    this.#selected = this.dateInRange(initialSelectedDateMillis);
    this.#displayMode = initialDisplayMode;
  }

  get selectedDate(): CalendarDate | null {
    return this.#selected;
  }

  get selectedDateMillis(): number | null {
    return this.#selected?.utcTimeMillis ?? null;
  }

  set selectedDateMillis(dateMillis: number | null) {
    this.#selected = this.dateInRange(dateMillis);
  }

  get displayMode(): DatePickerDisplayMode {
    return this.#displayMode;
  }

  /** Switching modes shows the selected date's month. */
  set displayMode(mode: DatePickerDisplayMode) {
    const selected = this.selectedDateMillis;
    if (selected !== null)
      this.displayedMonthMillis = calendarMonthOf(selected, this.firstDayOfWeek).startUtcTimeMillis;
    this.#displayMode = mode;
  }
}

/** DateRangePickerStateImpl (DateRangePicker.kt L565–669). */
export class DateRangePickerModel extends BaseDatePickerModel {
  #start: CalendarDate | null = null;
  #end: CalendarDate | null = null;
  #displayMode: DatePickerDisplayMode;

  constructor(
    initialSelectedStartDateMillis: number | null,
    initialSelectedEndDateMillis: number | null,
    initialDisplayedMonthMillis: number | null,
    yearRange: YearRange,
    initialDisplayMode: DatePickerDisplayMode,
    firstDayOfWeek: number,
    todayMillis: number,
  ) {
    super(initialDisplayedMonthMillis, yearRange, firstDayOfWeek, todayMillis);
    this.#displayMode = initialDisplayMode;
    this.setSelection(initialSelectedStartDateMillis, initialSelectedEndDateMillis);
  }

  get selectedStartDate(): CalendarDate | null {
    return this.#start;
  }

  get selectedEndDate(): CalendarDate | null {
    return this.#end;
  }

  get selectedStartDateMillis(): number | null {
    return this.#start?.utcTimeMillis ?? null;
  }

  get selectedEndDateMillis(): number | null {
    return this.#end?.utcTimeMillis ?? null;
  }

  /** setSelection (L630–649): an end needs a start on or before it, else both clear. */
  setSelection(startDateMillis: number | null, endDateMillis: number | null): void {
    const start = this.dateInRange(startDateMillis);
    const end = this.dateInRange(endDateMillis);
    if (start !== null && (end === null || start.utcTimeMillis <= end.utcTimeMillis)) {
      this.#start = start;
      this.#end = end;
    } else {
      this.#start = null;
      this.#end = null;
    }
  }

  get displayMode(): DatePickerDisplayMode {
    return this.#displayMode;
  }

  /** Switching modes shows the start date's month. */
  set displayMode(mode: DatePickerDisplayMode) {
    const start = this.selectedStartDateMillis;
    if (start !== null)
      this.displayedMonthMillis = calendarMonthOf(start, this.firstDayOfWeek).startUtcTimeMillis;
    this.#displayMode = mode;
  }
}

/**
 * updateDateSelection (DateRangePicker.kt L945–964): a click starts a new range, ends the open
 * one, or restarts it from an earlier date. Returns the new [start, end].
 */
export function updateDateSelection(
  dateInMillis: number,
  currentStartDateMillis: number | null,
  currentEndDateMillis: number | null,
): [start: number | null, end: number | null] {
  if (
    (currentStartDateMillis === null && currentEndDateMillis === null) ||
    (currentStartDateMillis !== null && currentEndDateMillis !== null)
  ) {
    return [dateInMillis, null];
  }
  if (currentStartDateMillis !== null && dateInMillis >= currentStartDateMillis) {
    return [currentStartDateMillis, dateInMillis];
  }
  return [dateInMillis, null];
}

/** SelectedRangeInfo (DateRangePicker.kt L975–1031): the range's cells in a month's 7 × 6 grid. */
export interface SelectedRangeInfo {
  /** [column, row] of the first highlighted cell. */
  gridStartCoordinates: readonly [number, number];
  gridEndCoordinates: readonly [number, number];
  /** The range starts in this month (its first cell is rounded). */
  firstIsSelectionStart: boolean;
  lastIsSelectionEnd: boolean;
}

/** SelectedRangeInfo.calculateRangeInfo: null when the range misses the month. */
export function selectedRangeInfo(
  month: CalendarMonth,
  startDate: CalendarDate,
  endDate: CalendarDate,
): SelectedRangeInfo | null {
  if (
    startDate.utcTimeMillis > month.endUtcTimeMillis ||
    endDate.utcTimeMillis < month.startUtcTimeMillis
  ) {
    return null;
  }
  const firstIsSelectionStart = startDate.utcTimeMillis >= month.startUtcTimeMillis;
  const lastIsSelectionEnd = endDate.utcTimeMillis <= month.endUtcTimeMillis;
  const start = firstIsSelectionStart
    ? month.daysFromStartOfWeekToFirstOfMonth + startDate.dayOfMonth - 1
    : month.daysFromStartOfWeekToFirstOfMonth;
  const end = lastIsSelectionEnd
    ? month.daysFromStartOfWeekToFirstOfMonth + endDate.dayOfMonth - 1
    : month.daysFromStartOfWeekToFirstOfMonth + month.numberOfDays - 1;
  return {
    gridStartCoordinates: [start % DAYS_IN_WEEK, Math.floor(start / DAYS_IN_WEEK)],
    gridEndCoordinates: [end % DAYS_IN_WEEK, Math.floor(end / DAYS_IN_WEEK)],
    firstIsSelectionStart,
    lastIsSelectionEnd,
  };
}

/**
 * drawRangeBackground (DateRangePicker.kt L1039–1115) at density 1: the rectangles Compose draws
 * behind a month `width` wide ([x, y, width, height]; RTL widths are negative, as drawRect's).
 * `cell` is RecommendedSizeForAccessibility (48dp), `stateLayer` DateStateLayerHeight (40dp).
 */
export function dateRangeBackground(
  info: SelectedRangeInfo,
  width: number,
  rtl: boolean,
  cell = 48,
  stateLayer = 40,
): [number, number, number, number][] {
  const w = f(width);
  const verticalPadding = f(f(cell - stateLayer) / 2);
  const space = f(f(w - f(DAYS_IN_WEEK * cell)) / DAYS_IN_WEEK);
  const [x1, y1] = info.gridStartCoordinates;
  const [x2, y2] = info.gridEndCoordinates;
  let startX = f(
    f(f(x1 * f(cell + space)) + (info.firstIsSelectionStart ? f(cell / 2) : 0)) + f(space / 2),
  );
  const startY = f(f(y1 * cell) + verticalPadding);
  let endX = f(
    f(f(x2 * f(cell + space)) + (info.lastIsSelectionEnd ? f(cell / 2) : cell)) + f(space / 2),
  );
  const endY = f(f(y2 * cell) + verticalPadding);
  if (rtl) {
    startX = f(w - startX);
    endX = f(w - endX);
  }
  const rects: [number, number, number, number][] = [
    [startX, startY, y1 === y2 ? f(endX - startX) : rtl ? -startX : f(w - startX), stateLayer],
  ];
  if (y1 !== y2) {
    for (let y = y2 - y1 - 1; y >= 1; y--) rects.push([0, f(startY + f(y * cell)), w, stateLayer]);
    rects.push([rtl ? w : 0, endY, rtl ? f(endX - w) : endX, stateLayer]);
  }
  return rects;
}

/** getFirstEnabledDay (DatePicker.kt L2181–2196): the first enabled cell's index. */
export function firstEnabledDay(month: CalendarMonth, selectable?: SelectableDates): number {
  let firstCell = month.daysFromStartOfWeekToFirstOfMonth;
  const lastCell = month.daysFromStartOfWeekToFirstOfMonth + month.numberOfDays - 1;
  if (isSelectableYear(selectable, month.year)) {
    let day = 0;
    while (
      !isSelectableDate(selectable, month.startUtcTimeMillis + day * MILLISECONDS_IN_24_HOURS) &&
      firstCell <= lastCell
    ) {
      day++;
      firstCell++;
    }
  }
  return firstCell;
}

/** getLastEnabledDay (L2198–2214): the last enabled cell's index. */
export function lastEnabledDay(month: CalendarMonth, selectable?: SelectableDates): number {
  const firstCell = month.daysFromStartOfWeekToFirstOfMonth;
  let lastCell = month.daysFromStartOfWeekToFirstOfMonth + month.numberOfDays - 1;
  if (isSelectableYear(selectable, month.year)) {
    let day = 0;
    while (
      !isSelectableDate(selectable, month.endUtcTimeMillis - day * MILLISECONDS_IN_24_HOURS) &&
      lastCell >= firstCell
    ) {
      day++;
      lastCell--;
    }
  }
  return lastCell;
}

/** A day cell's state in a month (Month, DatePicker.kt L1997–2041). */
export interface DayCell {
  dayNumber: number;
  utcTimeMillis: number;
  isToday: boolean;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
  enabled: boolean;
}

/**
 * Month's day cells (L1997–2041): today, the selection (a single picker passes its date as the
 * start), the range (only with an end date) and the enabled state (selectable year and date).
 */
export function monthDays(
  month: CalendarMonth,
  todayMillis: number,
  startDateMillis: number | null,
  endDateMillis: number | null,
  rangeSelection: boolean,
  selectable?: SelectableDates,
): DayCell[] {
  const days: DayCell[] = [];
  const yearSelectable = isSelectableYear(selectable, month.year);
  for (let dayNumber = 0; dayNumber < month.numberOfDays; dayNumber++) {
    const utcTimeMillis = month.startUtcTimeMillis + dayNumber * MILLISECONDS_IN_24_HOURS;
    days.push({
      dayNumber,
      utcTimeMillis,
      isToday: utcTimeMillis === todayMillis,
      isStart: utcTimeMillis === startDateMillis,
      isEnd: utcTimeMillis === endDateMillis,
      inRange:
        rangeSelection &&
        utcTimeMillis >= (startDateMillis ?? Infinity) &&
        utcTimeMillis <= (endDateMillis ?? -Infinity),
      enabled: yearSelectable && isSelectableDate(selectable, utcTimeMillis),
    });
  }
  return days;
}

/** dayContentDescription's labels (Compose's strings). */
export interface DayDescriptionStrings {
  start: string;
  end: string;
  inRange: string;
  today: string;
}

/**
 * dayContentDescription (DatePicker.kt L2216–2239): "Start date, Today" etc., or null; Month joins
 * it to the date with ", ".
 */
export function dayContentDescription(
  rangeSelection: boolean,
  cell: Pick<DayCell, 'isToday' | 'isStart' | 'isEnd' | 'inRange'>,
  strings: DayDescriptionStrings,
): string | null {
  const parts: string[] = [];
  if (rangeSelection) {
    if (cell.isStart) parts.push(strings.start);
    else if (cell.isEnd) parts.push(strings.end);
    else if (cell.inRange) parts.push(strings.inRange);
  }
  if (cell.isToday) parts.push(strings.today);
  return parts.length > 0 ? parts.join(', ') : null;
}

/** YearPicker's first visible year (L2329): a few rows before the displayed year. */
export const yearPickerInitialIndex = (displayedYear: number, years: YearRange): number =>
  Math.max(0, displayedYear - years[0] - YEARS_IN_ROW);
