/**
 * The date pickers' default English strings: Compose's `Strings.DatePicker*` / `DateInput*` /
 * `DateRangePicker*` (internal/Strings.kt, internal/Strings.android.kt) from material3 res
 * `values/strings.xml`@19991f2c (line per entry). `%1$s` / `%2$s` are arguments. Both layers take
 * overrides (`labels`) for other languages.
 */
export interface DatePickerStrings {
  /** L37 */
  pickerTitle: string;
  /** L38: the headline with no selection. */
  pickerHeadline: string;
  /** L39: the year button, closed. */
  switchToYear: string;
  /** L40: the year button, open. */
  switchToDay: string;
  /** L41 */
  nextMonth: string;
  /** L42 */
  previousMonth: string;
  /** L43 */
  navigateToYear: string;
  /** L44 */
  headlineDescription: string;
  /** L45 */
  noSelection: string;
  /** L46 */
  today: string;
  /** L47 */
  yearPickerTitle: string;
  /** L48 */
  inputTitle: string;
  /** L49 */
  inputHeadline: string;
  /** L50 */
  inputLabel: string;
  /** L51 */
  inputHeadlineDescription: string;
  /** L52 */
  noInput: string;
  /** L53 */
  invalidNotAllowed: string;
  /** L54 */
  invalidPattern: string;
  /** L55–57 */
  invalidYearRange: string;
  /** L58 */
  toCalendar: string;
  /** L59 */
  toInput: string;
  /** L64 */
  rangeTitle: string;
  /** L65 */
  start: string;
  /** L66 */
  end: string;
  /** L72 */
  inRange: string;
  /** L73 */
  rangeInputTitle: string;
  /** L77 */
  invalidRange: string;
  /**
   * The docked picker's year arrows (m3.material.io only; no Compose string, worded as Compose's
   * month ones: TODO(verify) SOURCES register #89).
   */
  previousYear: string;
  nextYear: string;
}

export const DATE_PICKER_STRINGS: DatePickerStrings = {
  pickerTitle: 'Select date',
  pickerHeadline: 'Selected date',
  switchToYear: 'Activate to change the year',
  switchToDay: 'Activate to change month and date',
  nextMonth: 'Change to next month',
  previousMonth: 'Change to previous month',
  navigateToYear: 'Navigate to year %1$s',
  headlineDescription: 'Current selection: %1$s',
  noSelection: 'None',
  today: 'Today',
  yearPickerTitle: 'Year picker visible',
  inputTitle: 'Select date',
  inputHeadline: 'Entered date',
  inputLabel: 'Date',
  inputHeadlineDescription: 'Entered date: %1$s',
  noInput: 'None',
  invalidNotAllowed: 'Date not allowed: %1$s',
  invalidPattern: 'Date does not match expected pattern: %1$s',
  invalidYearRange: 'Date out of expected year range %1$s - %2$s',
  toCalendar: 'Switch to calendar input mode',
  toInput: 'Switch to text input mode',
  rangeTitle: 'Select dates',
  start: 'Start date',
  end: 'End date',
  inRange: 'In range',
  rangeInputTitle: 'Enter dates',
  invalidRange: 'Invalid date range input',
  previousYear: 'Change to previous year',
  nextYear: 'Change to next year',
};
