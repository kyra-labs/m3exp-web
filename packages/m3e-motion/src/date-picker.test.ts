// The date picker port against Compose: the JVM reference dump (`pnpm reference:date-picker`,
// __fixtures__/date-picker-reference.json), which runs DatePicker.kt / DateRangePicker.kt /
// DateInput.kt@19991f2c's states, month bounds, range selection and drawn background, the date
// input's validator and transformations, and the java.time calendar model (CalendarModel.kt +
// CalendarModelImpl.android.kt) verbatim.
import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/date-picker-reference.json' with { type: 'json' };
import {
  DATE_PICKER_YEAR_RANGE,
  DAYS_IN_WEEK,
  DatePickerModel,
  DateRangePickerModel,
  MAX_CALENDAR_ROWS,
  MILLISECONDS_IN_24_HOURS,
  type SelectableDates,
  YEARS_IN_ROW,
  type YearRange,
  calendarDate,
  calendarDayOfWeek,
  calendarMonth,
  calendarMonthOf,
  dateInputFormat,
  dateInputTransform,
  dateOutputTransform,
  datePatternAsInputFormat,
  dateRangeBackground,
  dayContentDescription,
  digitValue,
  firstEnabledDay,
  formatString,
  formatWithPattern,
  lastEnabledDay,
  minusMonths,
  monthDays,
  monthIndexIn,
  numberOfMonthsInRange,
  parseDate,
  plusMonths,
  selectedRangeInfo,
  updateDateSelection,
  validateDateInput,
  yearPickerInitialIndex,
} from './date-picker.js';

const DAY = MILLISECONDS_IN_24_HOURS;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const weekday = (ms: number) => new Date(ms).getUTCDay(); // 0 Sunday … 6 Saturday

/** The harness's named SelectableDates. */
const selectable: Record<string, SelectableDates> = {
  all: {},
  weekdays: { isSelectableDate: (ms) => weekday(ms) !== 0 && weekday(ms) !== 6 },
  from2024: { isSelectableYear: (year) => year >= 2024 },
  mid: {
    isSelectableDate: (ms) => {
      const d = new Date(ms).getUTCDate();
      return d >= 10 && d <= 20;
    },
  },
  none: { isSelectableDate: () => false },
};

const usFormat = dateInputFormat('MM/dd/yyyy', '/');
const validation = (name: string, start: number | null, end: number | null) => ({
  yearRange: [2000, 2030] as YearRange,
  selectableDates: selectable[name],
  format: usFormat,
  errors: {
    datePattern: 'pattern %1$s',
    outOfYearRange: 'years %1$s-%2$s',
    notAllowed: 'notAllowed %1$s',
    invalidRange: 'invalidRange',
  },
  formatDate: (ms: number) => `date:${String(ms)}`,
  formatYear: (year: number) => String(year),
  currentStartDateMillis: start,
  currentEndDateMillis: end,
});

describe('constants', () => {
  it('match the Kotlin sources', () => {
    const c = reference.constants;
    expect([DAYS_IN_WEEK, DAY, MAX_CALENDAR_ROWS, YEARS_IN_ROW]).toEqual([
      c.daysInWeek,
      c.millisecondsIn24Hours,
      c.maxCalendarRows,
      c.yearsInRow,
    ]);
    expect(DATE_PICKER_YEAR_RANGE).toEqual(c.yearRange);
  });
});

describe('calendar model (CalendarModelImpl.android.kt)', () => {
  it('lays out every month for each first day of the week', () => {
    for (const { firstDayOfWeek, month } of reference.months) {
      expect(calendarMonth(month.year, month.month, firstDayOfWeek)).toEqual(month);
    }
  });

  it('getCanonicalDate / getMonth(millis) / getDayOfWeek', () => {
    for (const c of reference.canonical) {
      const date = calendarDate(c.millis);
      expect(date).toEqual(c.date);
      // The harness's model is en-US (Sunday first).
      expect(calendarMonthOf(c.millis, 7)).toEqual(c.month);
      expect(calendarDayOfWeek(date)).toBe(c.dayOfWeek);
    }
  });

  it('plusMonths / minusMonths', () => {
    for (const c of reference.plusMinus) {
      const from = calendarMonth(c.year, c.month, 7);
      expect(plusMonths(from, c.n, 7)).toEqual(c.plus);
      expect(minusMonths(from, c.n, 7)).toEqual(c.minus);
    }
  });

  it('indexIn / numberOfMonthsInRange', () => {
    for (const [y, m, first, last, index, count] of reference.indexIn) {
      const range: YearRange = [first!, last!];
      expect(monthIndexIn(calendarMonth(y!, m!, 7), range)).toBe(index);
      expect(numberOfMonthsInRange(range)).toBe(count);
    }
  });
});

describe('date input format', () => {
  it('datePatternAsInputFormat for every JDK locale SHORT pattern', () => {
    for (const [, pattern, expected, delimiter] of reference.inputFormats) {
      const format = datePatternAsInputFormat(pattern!);
      expect([format.patternWithDelimiters, format.delimiter]).toEqual([expected, delimiter]);
    }
    const us = reference.usInputFormat;
    expect(datePatternAsInputFormat('M/d/yy').patternWithDelimiters).toBe(us[0]);
  });

  it('parse (java.time SMART resolution: a day past the month end clamps)', () => {
    for (const [pattern, text, date] of reference.parse as [string, string, unknown][]) {
      expect(parseDate(text, pattern), `${pattern} ${text}`).toEqual(date);
    }
  });

  it('formatWithPattern', () => {
    for (const [pattern, ms, text] of reference.formatWithPattern as [string, number, string][]) {
      expect(formatWithPattern(ms, pattern)).toBe(text);
    }
    expect(formatWithPattern(utc(2024, 3, 9), 'ddMMyyyy', '٠')).toBe('٠٩٠٣٢٠٢٤');
  });

  it('reads digits of any script by value', () => {
    expect(['0', '9', '٠', '٩', '১', 'a', '５'].map(digitValue)).toEqual([0, 9, 0, 9, 1, -1, 5]);
    expect(parseDate('٠٢٢٩٢٠٢٤', 'MMddyyyy')?.utcTimeMillis).toBe(utc(2024, 2, 29));
  });

  it('DateInputValidator.validate', () => {
    const ids = ['single', 'start', 'end'] as const;
    for (const c of reference.validate) {
      expect(
        validateDateInput(c.date, ids[c.input]!, validation(c.selectable, c.start, c.end)),
      ).toBe(c.error);
    }
  });

  it('DateInputTransformation', () => {
    for (const c of reference.inputTransformation) {
      const r = dateInputTransform(
        c.original,
        c.edited,
        'single',
        validation('weekdays', null, null),
      );
      expect({
        text: r.text,
        reverted: r.reverted,
        calls: r.selection === undefined ? [] : [r.selection],
      }).toEqual({
        text: c.text,
        reverted: c.reverted,
        calls: c.calls,
      });
    }
  });

  it('DateOutputTransformation', () => {
    for (const [pattern, raw, text] of reference.outputTransformation) {
      const delimiter = /[/.-]/.exec(pattern!)![0];
      expect(dateOutputTransform(raw!, dateInputFormat(pattern!, delimiter))).toBe(text);
    }
  });

  it('formatString', () => {
    expect(formatString('%1$s – %2$s', 'a', 'b')).toBe('a – b');
    expect(formatString('%s of %s, 100%%', 1, 2)).toBe('1 of 2, 100%');
  });
});

describe('states', () => {
  it('DatePickerStateImpl', () => {
    const today = Date.UTC(2026, 9, 19);
    const todayMonth = calendarMonthOf(today, 7).startUtcTimeMillis;
    const shown = (ms: number) => (ms === todayMonth ? 'today' : ms);
    for (const c of reference.datePickerState) {
      const state = new DatePickerModel(
        c.selected,
        c.displayed,
        DATE_PICKER_YEAR_RANGE,
        'picker',
        7,
        today,
      );
      expect({
        selected: state.selectedDateMillis,
        displayed: shown(state.displayedMonthMillis),
      }).toEqual(c.initial);
      state.displayedMonthMillis = utc(2101, 3, 1);
      expect(shown(state.displayedMonthMillis)).toEqual(c.afterBadDisplay);
      state.displayedMonthMillis = utc(1999, 5, 20);
      expect(state.displayedMonthMillis).toBe(c.afterDisplay);
      state.displayMode = 'input';
      expect(state.displayedMonthMillis).toBe(c.afterMode);
      state.selectedDateMillis = utc(2050, 8, 8) + 999;
      expect(state.selectedDateMillis).toBe(c.afterSelect);
      state.selectedDateMillis = utc(2200, 1, 1);
      expect(state.selectedDateMillis).toBe(c.afterBadSelect);
    }
  });

  it('DateRangePickerStateImpl.setSelection', () => {
    for (const [a, b, start, end] of reference.rangeSelection) {
      const state = new DateRangePickerModel(
        null,
        null,
        utc(2024, 3, 1),
        DATE_PICKER_YEAR_RANGE,
        'picker',
        7,
        0,
      );
      state.setSelection(a!, b!);
      expect([state.selectedStartDateMillis, state.selectedEndDateMillis]).toEqual([start, end]);
    }
  });

  it('updateDateSelection', () => {
    let start: number | null = null;
    let end: number | null = null;
    for (const [tap, s, e] of reference.updateDateSelection) {
      [start, end] = updateDateSelection(tap!, start, end);
      expect([start, end]).toEqual([s, e]);
    }
  });
});

describe('month grid', () => {
  it('SelectedRangeInfo and drawRangeBackground', () => {
    for (const c of reference.rangeInfo) {
      const march = calendarMonth(2024, 3, c.firstDayOfWeek);
      const info = selectedRangeInfo(march, calendarDate(c.start), calendarDate(c.end));
      if (c.info === null) {
        expect(info).toBeNull();
        continue;
      }
      expect({
        start: info!.gridStartCoordinates,
        end: info!.gridEndCoordinates,
        firstIsSelectionStart: info!.firstIsSelectionStart,
        lastIsSelectionEnd: info!.lastIsSelectionEnd,
      }).toEqual(c.info);
      for (const draw of c.draws as { width: number; rtl: boolean; rects: number[][] }[]) {
        const rects = dateRangeBackground(info!, draw.width, draw.rtl);
        expect(rects.map((r) => r.map(Math.fround))).toEqual(
          draw.rects.map((r) => r.map(Math.fround)),
        );
      }
    }
  });

  it('getFirstEnabledDay / getLastEnabledDay', () => {
    for (const [name, y, m, first, last] of reference.enabledDays as [
      string,
      number,
      number,
      number,
      number,
    ][]) {
      const month = calendarMonth(y, m, 7);
      expect([
        firstEnabledDay(month, selectable[name]),
        lastEnabledDay(month, selectable[name]),
      ]).toEqual([first, last]);
    }
  });

  it("YearPicker's first visible index", () => {
    for (const [year, index] of reference.yearPickerIndex) {
      expect(yearPickerInitialIndex(year!, DATE_PICKER_YEAR_RANGE)).toBe(index);
    }
  });

  it('monthDays and dayContentDescription (Month L1997–2041, L2216–2239)', () => {
    const month = calendarMonth(2024, 3, 7);
    const days = monthDays(
      month,
      utc(2024, 3, 12),
      utc(2024, 3, 9),
      utc(2024, 3, 14),
      true,
      selectable['weekdays'],
    );
    expect(days).toHaveLength(31);
    expect(days.filter((d) => d.inRange).map((d) => d.dayNumber + 1)).toEqual([
      9, 10, 11, 12, 13, 14,
    ]);
    expect(days.filter((d) => !d.enabled).map((d) => d.dayNumber + 1)).toEqual([
      2, 3, 9, 10, 16, 17, 23, 24, 30, 31,
    ]);
    const strings = { start: 'Start date', end: 'End date', inRange: 'In range', today: 'Today' };
    expect(days.map((d) => dayContentDescription(true, d, strings)).filter(Boolean)).toEqual([
      'Start date',
      'In range',
      'In range',
      'In range, Today',
      'In range',
      'End date',
    ]);
    // A single date picker: no range words.
    expect(dayContentDescription(false, days[8]!, strings)).toBeNull();
    expect(dayContentDescription(false, days[11]!, strings)).toBe('Today');
  });
});
