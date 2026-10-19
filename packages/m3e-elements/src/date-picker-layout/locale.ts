import {
  DATE_PICKER_YEAR_RANGE,
  type DateInputFormat,
  dateInputFormat,
  datePatternAsInputFormat,
} from '@kyralabs/m3e-motion';

// The calendar model's locale data (CalendarModelImpl.android.kt reads it from java.time; the web
// reads it from Intl, owner decision M10 D4). Formatters are cached per locale and options.

const formatters = /* @__PURE__ */ new Map<string, Intl.DateTimeFormat>();

const formatter = (locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    } catch {
      f = new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' });
    }
    formatters.set(key, f);
  }
  return f;
};

/** Compose's date skeletons (DatePickerDefaults L799–812) as Intl options. */
const SKELETONS = {
  /** YearMonthSkeleton "yMMMM": the year button, the range picker's month subheads. */
  yMMMM: { year: 'numeric', month: 'long' },
  /** YearAbbrMonthDaySkeleton "yMMMd": the headline. */
  yMMMd: { year: 'numeric', month: 'short', day: 'numeric' },
  /** YearMonthWeekdayDaySkeleton "yMMMMEEEEd": the days' and the headline's descriptions. */
  yMMMMEEEEd: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/** formatWithSkeleton (internal/CalendarModel.android.kt): a UTC date in a skeleton's best form. */
export const formatSkeleton = (
  utcMillis: number,
  skeleton: keyof typeof SKELETONS,
  locale: string,
): string => formatter(locale, SKELETONS[skeleton]).format(utcMillis);

/**
 * WeekFields.of(locale).firstDayOfWeek: ISO 1 (Monday) … 7 (Sunday), from Intl.Locale's week
 * info; Monday when the engine has none.
 */
export function firstDayOfWeek(locale: string): number {
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = l.getWeekInfo?.() ?? l.weekInfo;
    if (info) return info.firstDay;
  } catch {
    // An invalid tag: ISO.
  }
  return 1;
}

/**
 * weekdayNames (CalendarModelImpl.android.kt L63–70): [full, narrow] standalone names, Monday
 * first.
 */
export function weekdayNames(locale: string): [string, string][] {
  const long = formatter(locale, { weekday: 'long' });
  const narrow = formatter(locale, { weekday: 'narrow' });
  // 1 January 2024 was a Monday.
  return Array.from({ length: 7 }, (_, i) => {
    const day = Date.UTC(2024, 0, 1 + i);
    return [long.format(day), narrow.format(day)];
  });
}

/**
 * getDateInputFormat (CalendarModelImpl.android.kt L72–81): the locale's SHORT date pattern
 * (from Intl's parts) through datePatternAsInputFormat; ISO's order when it has no delimiter.
 */
export function inputFormatOf(locale: string): DateInputFormat {
  const parts = formatter(locale, { dateStyle: 'short' }).formatToParts(Date.UTC(2024, 0, 2));
  const pattern = parts
    .map((p) =>
      p.type === 'day' ? 'd' : p.type === 'month' ? 'M' : p.type === 'year' ? 'y' : p.value,
    )
    .join('');
  try {
    return datePatternAsInputFormat(pattern);
  } catch {
    return dateInputFormat('yyyy-MM-dd', '-');
  }
}

/** DecimalStyle.of(locale).zeroDigit: the zero of the locale's digits. */
export function zeroDigitOf(locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { useGrouping: false }).format(0);
  } catch {
    return '0';
  }
}

/** CalendarModelImpl.today (L48–61): the local date at UTC midnight. */
export function todayMillis(): number {
  const now = new Date();
  const d = new Date(0);
  d.setUTCFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  return d.getTime();
}

/** An ISO date (YYYY-MM-DD, or a month YYYY-MM) as UTC midnight milliseconds, or null. */
export function parseIsoDate(value: string | null | undefined): number | null {
  const m = value ? /^(-?\d{4,6})-(\d{2})(?:-(\d{2}))?$/.exec(value) : null;
  if (!m) return null;
  const d = new Date(0);
  d.setUTCFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3] ?? 1));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** UTC milliseconds as an ISO date (YYYY-MM-DD). */
export const toIsoDate = (millis: number): string => new Date(millis).toISOString().slice(0, 10);

/** `"1900-2100"` (or `"1900 2100"`) as a year range; Compose's default otherwise. */
export function parseYearRange(value: string | null | undefined): readonly [number, number] {
  const m = value ? /^\s*(\d+)\s*[-–\s]\s*(\d+)\s*$/.exec(value) : null;
  return m && Number(m[1]) <= Number(m[2]) ? [Number(m[1]), Number(m[2])] : DATE_PICKER_YEAR_RANGE;
}
