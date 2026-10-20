import {
  DatePickerLayout,
  type DatePickerBaseOptions,
  type DatePickerStrings,
} from '@kyralabs/m3e-elements/date-picker-layout.js';
import { DateField } from '@kyralabs/m3e-elements/date-field.js';
import { DateRangePickerLayout } from '@kyralabs/m3e-elements/date-range-picker-layout.js';
import { DockedDatePickerLayout } from '@kyralabs/m3e-elements/docked-date-picker-layout.js';
import type { DatePickerDisplayMode, SelectableDates, YearRange } from '@kyralabs/m3e-motion';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
  useRef,
} from 'react';
import { useObjectRef } from 'react-aria';
import { BasicAlertDialog, type BasicAlertDialogProps } from '../dialog/Dialog.js';
import { defined } from '../utils/cx.js';
import { warnDeprecatedProp } from '../utils/deprecated.js';

export type { DatePickerDisplayMode, SelectableDates, YearRange };

interface DatePickerCommonProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'children' | 'title'
> {
  /** The years shown (DatePickerDefaults.YearRange: 1900–2100). */
  yearRange?: YearRange;
  /** Which dates and years can be picked (Compose's SelectableDates; UTC milliseconds). */
  selectableDates?: SelectableDates;
  /** BCP 47 locale for the calendar, names and digits; default: the closest `lang`. */
  locale?: string;
  /** String overrides (Compose's strings by default). */
  labels?: Partial<DatePickerStrings>;
}

interface DatePickerHeaderProps extends DatePickerCommonProps {
  /** The month shown first (UTC milliseconds of any day in it); default: the selection's or today's. */
  displayedMonthMillis?: number;
  onDisplayedMonthChange?: (monthMillis: number) => void;
  /** The display mode (controlled). */
  displayMode?: DatePickerDisplayMode;
  /** The initial display mode (uncontrolled; default `picker`). */
  defaultDisplayMode?: DatePickerDisplayMode;
  onDisplayModeChange?: (mode: DatePickerDisplayMode) => void;
  /** The header's mode toggle (default true). */
  showModeToggle?: boolean;
  /** The header title; null: none. Default: Compose's ("Select date", "Enter dates", …). */
  title?: string | null;
  /** The header headline (default true). */
  showHeadline?: boolean;
  /**
   * The header headline (default true).
   * @deprecated Since 1.8: use `showHeadline`. Removed in 2.0.
   */
  headline?: boolean;
}

const OWN = [
  'yearRange',
  'selectableDates',
  'locale',
  'labels',
  'className',
  'displayedMonthMillis',
  'onDisplayedMonthChange',
  'displayMode',
  'defaultDisplayMode',
  'onDisplayModeChange',
  'showModeToggle',
  'title',
  'showHeadline',
  'headline',
];

/** The props that reach the root `<div>` (the rest are options). */
function rootProps(props: object, own: readonly string[]) {
  const skip = new Set([...OWN, ...own]);
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) if (!skip.has(key)) rest[key] = value;
  return rest as HTMLAttributes<HTMLDivElement>;
}

interface Layout<O> {
  update(options: O): void;
  destroy(): void;
}

/**
 * Runs a shared m3e-elements layout on the rendered root (it builds the DOM inside it). `initial`
 * holds the uncontrolled defaults, used once (a controlled prop wins); `options` is synced on every render. A year range
 * keeps its identity while its years are equal (the layouts rebuild their model on a new one).
 */
function useDateLayout<O extends { yearRange?: YearRange | undefined }>(
  options: O,
  initial: Partial<O>,
  create: (root: HTMLDivElement, options: O) => Layout<O>,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const layoutRef = useRef<Layout<O> | null>(null);
  const range = useRef<YearRange | undefined>(undefined);
  const next = options.yearRange;
  if (next?.[0] !== range.current?.[0] || next?.[1] !== range.current?.[1]) range.current = next;
  const synced = { ...options, yearRange: range.current };
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const layout = create(root, { ...initial, ...synced });
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // Created once; options are synced below.
  }, []);
  useLayoutEffect(() => {
    layoutRef.current?.update(synced);
  });
  return ref;
}

/** The input mode's field: bundled here, so no lazy import (see DatePickerBaseOptions). */
const loadDateField = () => Promise.resolve(DateField);

/** The header and mode options every modal picker takes, with the callbacks kept current. */
function useHeaderOptions(props: DatePickerHeaderProps, component: string): DatePickerBaseOptions {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias (D16)
  const legacyHeadline = props.headline;
  if (legacyHeadline !== undefined) {
    warnDeprecatedProp(`${component} headline`, `${component} showHeadline`);
  }
  const callbacks = useRef(props);
  callbacks.current = props;
  return {
    ...defined({
      yearRange: props.yearRange,
      selectableDates: props.selectableDates,
      locale: props.locale,
      labels: props.labels,
      className: props.className,
      displayedMonth: props.displayedMonthMillis,
      displayMode: props.displayMode,
      showModeToggle: props.showModeToggle,
      headline: props.showHeadline ?? legacyHeadline,
    }),
    ...(props.title !== undefined ? { title: props.title } : {}),
    onDisplayModeChange: (mode) => callbacks.current.onDisplayModeChange?.(mode),
    onDisplayedMonthChange: (month) => callbacks.current.onDisplayedMonthChange?.(month),
    loadDateField,
  };
}

export interface DatePickerProps extends DatePickerHeaderProps {
  /** The selected date, UTC milliseconds of its midnight, or null (controlled). */
  selectedDateMillis?: number | null;
  /** The initial selection (uncontrolled; default none). */
  defaultSelectedDateMillis?: number | null;
  /** The user picked or entered a date (UTC midnight), or cleared the input (null). */
  onSelectedDateChange?: (dateMillis: number | null) => void;
}

/**
 * Date picker (COMPONENT_SPEC §27; Compose DatePicker): the header, the calendar with its year
 * grid, and the date input, built and run by m3e-elements' DatePickerLayout (the code
 * `<m3e-date-picker>` runs, so both layers render one DOM contract). Dates are UTC milliseconds,
 * as Compose's DatePickerState. Put it in a `<DatePickerDialog>` for Compose's DatePickerDialog.
 */
export const DatePicker = /* @__PURE__ */ forwardRef(function DatePicker(
  props: DatePickerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const change = useRef(props.onSelectedDateChange);
  change.current = props.onSelectedDateChange;
  const ref = useDateLayout(
    {
      ...useHeaderOptions(props, 'DatePicker'),
      ...defined({ selectedDate: props.selectedDateMillis }),
      onChange: (millis: number | null) => change.current?.(millis),
    },
    defined({
      selectedDate: props.defaultSelectedDateMillis,
      displayMode: props.defaultDisplayMode,
    }),
    (root, options) => new DatePickerLayout(root, options),
    forwardedRef,
  );
  return (
    <div
      {...rootProps(props, [
        'selectedDateMillis',
        'defaultSelectedDateMillis',
        'onSelectedDateChange',
      ])}
      ref={ref}
    />
  );
});

export interface DateRangePickerProps extends DatePickerHeaderProps {
  /** The range's start, UTC milliseconds of its midnight, or null (controlled with the end). */
  selectedStartDateMillis?: number | null;
  /** The range's end, on or after the start; null while only a start is picked. */
  selectedEndDateMillis?: number | null;
  defaultSelectedStartDateMillis?: number | null;
  defaultSelectedEndDateMillis?: number | null;
  /** The user changed the range (UTC midnights; the end is null while only a start is set). */
  onSelectedRangeChange?: (startMillis: number | null, endMillis: number | null) => void;
}

/**
 * Date range picker (COMPONENT_SPEC §27; Compose DateRangePicker): the header, a scrolling list
 * of months with the range band, and the start / end inputs, built and run by m3e-elements'
 * DateRangePickerLayout (shared with `<m3e-date-range-picker>`). It fills its container: show it
 * in a `<FullScreenDialog>` (owner decision M10 D16), as Compose's samples do.
 */
export const DateRangePicker = /* @__PURE__ */ forwardRef(function DateRangePicker(
  props: DateRangePickerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const change = useRef(props.onSelectedRangeChange);
  change.current = props.onSelectedRangeChange;
  const ref = useDateLayout(
    {
      ...useHeaderOptions(props, 'DateRangePicker'),
      ...defined({
        selectedStartDate: props.selectedStartDateMillis,
        selectedEndDate: props.selectedEndDateMillis,
      }),
      onChange: (start: number | null, end: number | null) => change.current?.(start, end),
    },
    defined({
      selectedStartDate: props.defaultSelectedStartDateMillis,
      selectedEndDate: props.defaultSelectedEndDateMillis,
      displayMode: props.defaultDisplayMode,
    }),
    (root, options) => new DateRangePickerLayout(root, options),
    forwardedRef,
  );
  return (
    <div
      {...rootProps(props, [
        'selectedStartDateMillis',
        'selectedEndDateMillis',
        'defaultSelectedStartDateMillis',
        'defaultSelectedEndDateMillis',
        'onSelectedRangeChange',
      ])}
      ref={ref}
    />
  );
});

export interface DockedDatePickerProps extends DatePickerCommonProps {
  /** The selected date, UTC milliseconds of its midnight, or null (controlled). */
  selectedDateMillis?: number | null;
  defaultSelectedDateMillis?: number | null;
  onSelectedDateChange?: (dateMillis: number | null) => void;
  /** The field's label (default: Compose's "Date"). */
  label?: string;
}

/**
 * Docked date picker (COMPONENT_SPEC §27; m3.material.io's docked date picker, owner decision
 * M10 D1, Compose has none): a date field whose calendar drops down below it, built and run by
 * m3e-elements' DockedDatePickerLayout (shared with `<m3e-docked-date-picker>`).
 */
export const DockedDatePicker = /* @__PURE__ */ forwardRef(function DockedDatePicker(
  props: DockedDatePickerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const change = useRef(props.onSelectedDateChange);
  change.current = props.onSelectedDateChange;
  const ref = useDateLayout(
    {
      ...defined({
        yearRange: props.yearRange,
        selectableDates: props.selectableDates,
        locale: props.locale,
        labels: props.labels,
        className: props.className,
        label: props.label,
        selectedDate: props.selectedDateMillis,
      }),
      onChange: (millis: number | null) => change.current?.(millis),
    },
    defined({ selectedDate: props.defaultSelectedDateMillis }),
    (root, options) => new DockedDatePickerLayout(root, options),
    forwardedRef,
  );
  return (
    <div
      {...rootProps(props, [
        'selectedDateMillis',
        'defaultSelectedDateMillis',
        'onSelectedDateChange',
        'label',
      ])}
      ref={ref}
    />
  );
});

export interface DatePickerDialogProps extends Omit<BasicAlertDialogProps, 'children'> {
  /** The confirm button (a text button). */
  confirmButton: ReactNode;
  dismissButton?: ReactNode;
  /** The picker (`<DatePicker>`). */
  children: ReactNode;
}

/**
 * Date picker dialog (Compose DatePickerDialog): the picker and the actions (dismiss, confirm) on
 * the date picker's dialog surface, in m3e-react's `<BasicAlertDialog>` (M9 dialog motion, focus
 * and dismissal), named "Dialog" unless `aria-label` / `aria-labelledby` says otherwise.
 */
export const DatePickerDialog = /* @__PURE__ */ forwardRef(function DatePickerDialog(
  { confirmButton, dismissButton, children, ...rest }: DatePickerDialogProps,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  return (
    <BasicAlertDialog {...rest} ref={ref}>
      <div className="m3e-date-picker-dialog">
        <div className="m3e-date-picker-dialog__content">{children}</div>
        <div className="m3e-date-picker-dialog__actions">
          {dismissButton}
          {confirmButton}
        </div>
      </div>
    </BasicAlertDialog>
  );
});
