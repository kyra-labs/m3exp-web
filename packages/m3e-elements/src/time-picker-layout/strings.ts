/**
 * The time pickers' default English strings: Compose's `Strings.TimePicker*` (internal/Strings.kt,
 * internal/Strings.android.kt L204–266) from material3 res `values/strings.xml`@19991f2c (line
 * per entry). `%1$d` is the number. Both layers take overrides (`labels`) for other languages.
 */
export interface TimePickerStrings {
  /** L100 */
  am: string;
  /** L98 */
  pm: string;
  /** L102: the AM/PM toggle's group name. */
  periodToggle: string;
  /** L104: the hour selector, the hour face, the hour wheel. */
  hourSelection: string;
  /** L106 */
  minuteSelection: string;
  /** L108: a 12-hour hour. */
  hourSuffix: string;
  /** L110: a 24-hour hour. */
  hour24Suffix: string;
  /** L112 */
  minuteSuffix: string;
  /** L116: TimeInput's supporting text under the hour field. */
  hour: string;
  /** L114 */
  minute: string;
  /** L120: the hour text field's name. */
  hourTextField: string;
  /** L118 */
  minuteTextField: string;
  /** L136 */
  hourError: string;
  /** L138 */
  hour24Error: string;
  /** L134 */
  minuteError: string;
  /** L122: the mode toggle that switches to TimeInput. */
  toggleKeyboard: string;
  /** L124: the mode toggle that switches to TimeScroll. */
  toggleScroll: string;
  /** L126: the mode toggle that switches to the dial. */
  toggleTouch: string;
  /** L128: TimePickerDialogDefaults.Title for the dial. */
  dialogTitle: string;
  /** L132: … for TimeInput. */
  inputDialogTitle: string;
  /** L130: … for TimeScroll. */
  scrollDialogTitle: string;
}

export const TIME_PICKER_STRINGS: TimePickerStrings = {
  am: 'AM',
  pm: 'PM',
  periodToggle: 'Select AM or PM',
  hourSelection: 'Select hour',
  minuteSelection: 'Select minutes',
  hourSuffix: "%1$d o'clock",
  hour24Suffix: '%1$d hours',
  minuteSuffix: '%1$d minutes',
  hour: 'Hour',
  minute: 'Minute',
  hourTextField: 'for hour',
  minuteTextField: 'for minutes',
  hourError: 'Hour must be 1–12',
  hour24Error: 'Hour must be 0–23',
  minuteError: 'Minute must be 0–59',
  toggleKeyboard: 'Switch to text input mode',
  toggleScroll: 'Switch to scroll mode',
  toggleTouch: 'Switch to clock mode',
  dialogTitle: 'Select Time',
  inputDialogTitle: 'Enter Time',
  scrollDialogTitle: 'Select Time',
};
