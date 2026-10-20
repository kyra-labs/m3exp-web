// Source fidelity of the date picker port (COMPONENT_SPEC §27), checked against the vendored
// DatePicker.kt / DateRangePicker.kt / DateInput.kt / internal/CalendarModel.kt@19991f2c: the JVM
// reference harness copies the states, the month bounds, the range selection, the date input's
// validator and transformations, and the calendar model verbatim, and the TypeScript port uses the
// same constants.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DATE_PICKER_YEAR_RANGE, MAX_CALENDAR_ROWS, YEARS_IN_ROW } from '@kyralabs/m3e-motion';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8').replace(/\r\n/g, '\n');
const vendor = 'packages/m3e-codegen/vendor/androidx-material3-sources/';
const sources: Record<string, string> = {
  'DatePicker.kt': read(`${vendor}DatePicker.kt`),
  'DateRangePicker.kt': read(`${vendor}DateRangePicker.kt`),
  'DateInput.kt': read(`${vendor}DateInput.kt`),
  'CalendarModel.kt': read(`${vendor}CalendarModel.kt`),
};
const tokens = read(
  'packages/m3e-codegen/vendor/androidx-material3-tokens/DatePickerModalTokens.kt',
);
const harness = read('packages/m3e-motion/reference-date-picker/DatePickerReference.kt');
const calendar = read('packages/m3e-motion/reference-date-picker/CalendarModelReference.kt');
const shims = read('packages/m3e-motion/reference-date-picker/DatePickerShims.kt');
const unindent = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
const verbatim = (text: string) => [
  ...text.matchAll(/\/\/ BEGIN VERBATIM ([^\n]+)\n([\s\S]*?)\n\s*\/\/ END VERBATIM/g),
];

/** The vendored file each harness block comes from. */
const blockSource: Record<string, string> = {
  DateRangePickerState: 'DateRangePicker.kt',
  DateRangePickerStateImpl: 'DateRangePicker.kt',
  updateDateSelection: 'DateRangePicker.kt',
  SelectedRangeInfo: 'DateRangePicker.kt',
  drawRangeBackground: 'DateRangePicker.kt',
  DateInputValidator: 'DateInput.kt',
  InputIdentifier: 'DateInput.kt',
  DateInputTransformation: 'DateInput.kt',
  DateOutputTransformation: 'DateInput.kt',
};

describe('date picker JVM harness', () => {
  it('copies every VERBATIM block unchanged from the vendored date picker files', () => {
    const blocks = verbatim(harness);
    expect(blocks.map((b) => b[1])).toEqual([
      'DatePickerState',
      'SelectableDates',
      'DatePickerFormatter',
      'DisplayMode',
      'BaseDatePickerStateImpl',
      'DatePickerStateImpl',
      'numberOfMonthsInRange',
      'getFirstEnabledDay, getLastEnabledDay',
      'RecommendedSizeForAccessibility',
      'MaxCalendarRows, YearsInRow',
      'DatePickerDefaults.YearRange',
      'DateRangePickerState',
      'DateRangePickerStateImpl',
      'updateDateSelection',
      'SelectedRangeInfo',
      'drawRangeBackground',
      'DateInputValidator',
      'InputIdentifier',
      'DateInputTransformation',
      'DateOutputTransformation',
      'YearPicker initialFirstVisibleItemIndex',
    ]);
    for (const [, name, body] of blocks) {
      const source = sources[blockSource[name!] ?? 'DatePicker.kt']!;
      expect(unindent(source), name).toContain(unindent(body!));
    }
  });

  it('copies the calendar model verbatim from CalendarModel.kt', () => {
    const blocks = verbatim(calendar);
    expect(blocks.map((b) => b[1])).toEqual([
      'CalendarModel',
      'CalendarDate',
      'CalendarMonth',
      'DateInputFormat',
      'datePatternAsInputFormat',
      'DaysInWeek, MillisecondsIn24Hours',
    ]);
    for (const [, name, body] of blocks) {
      expect(unindent(sources['CalendarModel.kt']!), name).toContain(unindent(body!));
    }
  });

  it('shims DateStateLayerHeight with the DatePickerModalTokens.kt value', () => {
    expect(tokens).toMatch(
      /DateStateLayerHeight: androidx\.compose\.ui\.unit\.Dp\n\s*get\(\) = 40\.0\.dp/,
    );
    expect(shims).toContain('val DateStateLayerHeight = 40.0.dp');
  });
});

describe('date picker port', () => {
  it('uses the constants of DatePicker.kt', () => {
    const datePicker = sources['DatePicker.kt']!;
    expect(datePicker).toContain('private const val MaxCalendarRows = 6');
    expect(MAX_CALENDAR_ROWS).toBe(6);
    expect(datePicker).toContain('private const val YearsInRow: Int = 3');
    expect(YEARS_IN_ROW).toBe(3);
    expect(datePicker).toContain('public val YearRange: IntRange = IntRange(1900, 2100)');
    expect(DATE_PICKER_YEAR_RANGE).toEqual([1900, 2100]);
  });
});
