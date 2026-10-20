import {
  TIME_PICKER_STRINGS,
  TimeInputLayout,
  type TimeInputLayoutOptions,
  TimePickerLayout,
  type TimePickerLayoutOptions,
  type TimePickerLayoutType,
  type TimePickerStrings,
  TimeScrollLayout,
  type TimeScrollLayoutOptions,
} from '@kyralabs/m3e-elements/time-picker-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useObjectRef } from 'react-aria';
import { BasicAlertDialog, type BasicAlertDialogProps } from '../dialog/Dialog.js';
import { Icon } from '../icon/Icon.js';
import { IconButton } from '../icon-button/IconButton.js';
import { PlainTooltip } from '../tooltip/Tooltip.js';
import { TooltipTrigger } from '../tooltip/TooltipTrigger.js';
import { defined } from '../utils/cx.js';

/** A time of day: Compose TimePickerState's hour (0–23) and minute (0–59). */
export interface TimeValue {
  hour: number;
  minute: number;
}

export type TimePickerSelection = 'hour' | 'minute';

interface TimePickerBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'children'
> {
  /** The time (controlled). */
  value?: TimeValue;
  /** The initial time (uncontrolled; default 00:00, as rememberTimePickerState). */
  defaultValue?: TimeValue;
  /** The user picked a time. */
  onChange?: (value: TimeValue) => void;
  /** 24-hour clock; default: the locale's (owner decision M10 T5). */
  is24Hour?: boolean;
  /** Which of hour / minute is being picked (controlled). */
  selection?: TimePickerSelection;
  /** The initial selection (default hour). */
  defaultSelection?: TimePickerSelection;
  onSelectionChange?: (selection: TimePickerSelection) => void;
  /** BCP 47 locale for the digits and the default clock; default: the closest `lang`. */
  locale?: string;
  /** String overrides (Compose's strings by default). */
  labels?: Partial<TimePickerStrings>;
}

type Layout = TimePickerLayout | TimeInputLayout | TimeScrollLayout;

/** Runs a shared m3e-elements layout on the rendered root (it builds the DOM inside it). */
function useTimeLayout<O>(
  props: TimePickerBaseProps,
  extra: O,
  create: (root: HTMLDivElement, options: TimeLayoutOptions<O>) => Layout,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const layoutRef = useRef<Layout | null>(null);
  const [uncontrolled, setUncontrolled] = useState<TimeValue>(
    props.defaultValue ?? { hour: 0, minute: 0 },
  );
  const [uncontrolledSelection, setUncontrolledSelection] = useState<TimePickerSelection>(
    props.defaultSelection ?? 'hour',
  );
  const value = props.value ?? uncontrolled;
  const selection = props.selection ?? uncontrolledSelection;
  const callbacks = useRef(props);
  callbacks.current = props;
  const options = {
    hour: value.hour,
    minute: value.minute,
    selection,
    ...defined({ is24Hour: props.is24Hour, locale: props.locale, labels: props.labels }),
    className: props.className,
    ...extra,
    onChange: (hour: number, minute: number) => {
      if (callbacks.current.value === undefined) setUncontrolled({ hour, minute });
      callbacks.current.onChange?.({ hour, minute });
    },
    onSelectionChange: (next: TimePickerSelection) => {
      if (callbacks.current.selection === undefined) setUncontrolledSelection(next);
      callbacks.current.onSelectionChange?.(next);
    },
  } as TimeLayoutOptions<O>;
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const layout = create(root, options);
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // Created once; options are synced below.
  }, []);
  useLayoutEffect(() => {
    (layoutRef.current as { update(o: unknown): void } | null)?.update(options);
  });
  return ref;
}

type TimeLayoutOptions<O> = O & {
  hour: number;
  minute: number;
  selection: TimePickerSelection;
};

/** The props that reach the root `<div>` (the rest are options). */
function rootProps(props: object, own: readonly string[]) {
  const rest: Record<string, unknown> = {};
  const skip = new Set([
    'value',
    'defaultValue',
    'onChange',
    'is24Hour',
    'selection',
    'defaultSelection',
    'onSelectionChange',
    'locale',
    'labels',
    'className',
    ...own,
  ]);
  for (const [key, value] of Object.entries(props)) if (!skip.has(key)) rest[key] = value;
  return rest as HTMLAttributes<HTMLDivElement>;
}

export interface TimePickerProps extends TimePickerBaseProps {
  /** Compose's vibrant (expressive) TimePicker overload. */
  vibrant?: boolean;
  /** TimePickerLayoutType; `auto` (default): horizontal in a landscape window, as Compose. */
  layout?: TimePickerLayoutType;
}

/**
 * Time picker with a clock dial (COMPONENT_SPEC §28; Compose TimePicker): the hour / minute
 * selectors, AM/PM (12-hour) and the dial, built and run by m3e-elements' TimePickerLayout (the
 * code `<m3e-time-picker>` runs, so both layers render one DOM contract).
 */
export const TimePicker = /* @__PURE__ */ forwardRef(function TimePicker(
  props: TimePickerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const extra: Partial<TimePickerLayoutOptions> = {
    vibrant: Boolean(props.vibrant),
    layout: props.layout ?? 'auto',
  };
  const ref = useTimeLayout(
    props,
    extra,
    (root, options) => new TimePickerLayout(root, options),
    forwardedRef,
  );
  return <div {...rootProps(props, ['vibrant', 'layout'])} ref={ref} />;
});

export interface TimeInputProps extends TimePickerBaseProps {
  /** Compose's vibrant TimeInput overload. */
  vibrant?: boolean;
  /**
   * Compose's TimeInput with a toggle: taller fields and a side column of AM, PM and a mode toggle
   * button (to the scroll picker), which calls `onModeToggle`.
   */
  uncontained?: boolean;
  /** The side column's mode toggle was pressed; `next` is the mode it asks for (`'scroll'`). */
  onModeToggle?: (next: TimePickerDisplayMode) => void;
}

/**
 * Time picker with text fields (COMPONENT_SPEC §28; Compose TimeInput), built and run by
 * m3e-elements' TimeInputLayout (shared with `<m3e-time-input>`).
 */
export const TimeInput = /* @__PURE__ */ forwardRef(function TimeInput(
  props: TimeInputProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const modeToggle = useRef(props.onModeToggle);
  modeToggle.current = props.onModeToggle;
  const extra: Partial<TimeInputLayoutOptions> = {
    vibrant: Boolean(props.vibrant),
    uncontained: Boolean(props.uncontained),
    onModeToggle: () => modeToggle.current?.('scroll'),
  };
  const ref = useTimeLayout(
    props,
    extra,
    (root, options) => new TimeInputLayout(root, options),
    forwardedRef,
  );
  return <div {...rootProps(props, ['vibrant', 'uncontained', 'onModeToggle'])} ref={ref} />;
});

export interface TimeScrollProps extends TimePickerBaseProps {
  /** Compose's TimeScroll with a toggle (see TimeInputProps.uncontained; to the text input). */
  uncontained?: boolean;
  /** The side column's mode toggle was pressed; `next` is the mode it asks for (`'input'`). */
  onModeToggle?: (next: TimePickerDisplayMode) => void;
}

/**
 * Time picker with scroll wheels (COMPONENT_SPEC §28; Compose TimeScroll, vibrant only), built and
 * run by m3e-elements' TimeScrollLayout (shared with `<m3e-time-scroll>`).
 */
export const TimeScroll = /* @__PURE__ */ forwardRef(function TimeScroll(
  props: TimeScrollProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const modeToggle = useRef(props.onModeToggle);
  modeToggle.current = props.onModeToggle;
  const extra: Partial<TimeScrollLayoutOptions> = {
    uncontained: Boolean(props.uncontained),
    onModeToggle: () => modeToggle.current?.('input'),
  };
  const ref = useTimeLayout(
    props,
    extra,
    (root, options) => new TimeScrollLayout(root, options),
    forwardedRef,
  );
  return <div {...rootProps(props, ['uncontained', 'onModeToggle'])} ref={ref} />;
});

/** TimePickerDisplayMode. */
export type TimePickerDisplayMode = 'picker' | 'input' | 'scroll';

export interface TimePickerModeToggleProps {
  /** The mode shown now. */
  displayMode: TimePickerDisplayMode;
  /**
   * Between input and scroll (ScrollDisplayModeToggle) instead of picker and input
   * (DisplayModeToggle).
   */
  scroll?: boolean;
  /** Pressed: `next` is the mode to show (picker ↔ input, or input ↔ scroll with `scroll`). */
  onDisplayModeChange: (next: TimePickerDisplayMode) => void;
  labels?: Partial<TimePickerStrings>;
}

/**
 * TimePickerDialogDefaults.DisplayModeToggle / ScrollDisplayModeToggle: an icon button (keyboard,
 * schedule or swipe_vertical, on-surface-variant) with a plain tooltip above that repeats its name.
 */
export function TimePickerModeToggle({
  displayMode,
  scroll = false,
  onDisplayModeChange,
  labels,
}: TimePickerModeToggleProps): ReactNode {
  const strings = { ...TIME_PICKER_STRINGS, ...labels };
  const toKeyboard = scroll ? displayMode === 'scroll' : displayMode === 'picker';
  const label = toKeyboard
    ? strings.toggleKeyboard
    : scroll
      ? strings.toggleScroll
      : strings.toggleTouch;
  const icon = toKeyboard ? 'keyboard' : scroll ? 'swipe_vertical' : 'schedule';
  return (
    <TooltipTrigger position="above">
      <IconButton
        aria-label={label}
        onPress={() => {
          onDisplayModeChange(
            scroll
              ? displayMode === 'scroll'
                ? 'input'
                : 'scroll'
              : displayMode === 'picker'
                ? 'input'
                : 'picker',
          );
        }}
      >
        <Icon name={icon} />
      </IconButton>
      <PlainTooltip>{label}</PlainTooltip>
    </TooltipTrigger>
  );
}

export interface TimePickerDialogProps extends Omit<BasicAlertDialogProps, 'children' | 'title'> {
  /** TimePickerDialogDefaults.Title: e.g. "Select Time" (picker) or "Enter Time" (input). */
  title?: ReactNode;
  /** The confirm button (a text button, enabled while the input is valid). */
  confirmButton: ReactNode;
  dismissButton?: ReactNode;
  /** The mode toggle at the start of the actions (`<TimePickerModeToggle>`). */
  modeToggleButton?: ReactNode;
  /** The picker. */
  children: ReactNode;
}

const TimePickerDialogFrame = /* @__PURE__ */ forwardRef(function TimePickerDialogFrame(
  {
    title,
    confirmButton,
    dismissButton,
    modeToggleButton,
    children,
    vibrant,
    ...rest
  }: TimePickerDialogProps & { vibrant: boolean },
  ref: ForwardedRef<HTMLDialogElement>,
) {
  const titleId = `${useId()}-title`;
  const hasTitle = !vibrant && title !== undefined && title !== null && title !== '';
  return (
    <BasicAlertDialog
      {...rest}
      ref={ref}
      {...(hasTitle && !rest['aria-label'] ? { 'aria-labelledby': titleId } : {})}
    >
      <div
        className={
          vibrant
            ? 'm3e-time-picker-dialog m3e-time-picker-dialog--vibrant'
            : 'm3e-time-picker-dialog'
        }
      >
        {hasTitle ? (
          <div className="m3e-time-picker-dialog__title" id={titleId}>
            {title}
          </div>
        ) : null}
        <div className="m3e-time-picker-dialog__content">{children}</div>
        <div className="m3e-time-picker-dialog__actions">
          {modeToggleButton}
          <span className="m3e-time-picker-dialog__spacer" />
          {dismissButton}
          {confirmButton}
        </div>
      </div>
    </BasicAlertDialog>
  );
});

/**
 * Time picker dialog (Compose TimePickerDialog): the title, the picker, the actions (mode toggle,
 * dismiss, confirm) on a dialog surface, in m3e-react's `<BasicAlertDialog>` (M9 dialog motion,
 * focus and dismissal).
 */
export const TimePickerDialog = /* @__PURE__ */ forwardRef(function TimePickerDialog(
  props: TimePickerDialogProps,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  return <TimePickerDialogFrame {...props} vibrant={false} ref={ref} />;
});

/** Vibrant time picker dialog (Compose VibrantTimePickerDialog): no title, tighter padding. */
export const VibrantTimePickerDialog = /* @__PURE__ */ forwardRef(function VibrantTimePickerDialog(
  props: Omit<TimePickerDialogProps, 'title'>,
  ref: ForwardedRef<HTMLDialogElement>,
) {
  return <TimePickerDialogFrame {...props} vibrant ref={ref} />;
});
