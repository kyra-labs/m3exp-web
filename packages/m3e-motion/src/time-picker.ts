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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/TimePicker.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// Time picker (COMPONENT_SPEC §28), shared by m3e-elements' time picker layouts and therefore by
// <m3e-time-picker> / <m3e-time-input> / <m3e-time-scroll> and m3e-react's <TimePicker> /
// <TimeInput> / <TimeScroll>:
// - TimePickerModel: TimePickerStateImpl (L1647–1719) with the TimePickerState extensions
//   (isPm L1553, isValidHour L1563–1571, isHourInputValid / isMinuteInputValid / isInputValid
//   L1560–1579, hourForDisplay L1890–1897);
// - ClockDialModel: AnalogTimePickerState (L1721–1888): the selector's angle and its animation
//   targets (animateToCurrent, endValueForAnimation, onGestureEnd, rotateTo, the hourInput /
//   minuteInput overrides), moveSelector (L1899–1908), onTap (L1910–1935), selectorPos
//   (L1937–1955), and the private atan / dist (L3993–4002);
// - clockDialItemOffset: CircularLayout's placement (L3935–3972);
// - timeInputTransform: TimeInputTransformation.transformInput (L3655–3743) over a TextFieldBuffer
//   model, and shouldSwitchFocusToMinute (L2015–2030);
// - timeScrollHourIndex / timeScrollHourFromIndex: TimeScrollImpl's hour ⇄ wheel index
//   (L2237–2266), scrollFieldInitialPage / scrollFieldTargetPage: ScrollField.kt's infinite pager
//   (rememberScrollFieldState, calculateTargetPage).
// Float operations are rounded with Math.fround like Kotlin's Float math (Double where Kotlin
// promotes, e.g. `QuarterCircle` is a Double), so the values match the JVM reference bit for bit
// (`pnpm reference:time-picker`). Lengths are dp (a CSS px); no module-level state.

const f = Math.fround;

/** `FullCircle` (L4030): `(PI * 2).toFloat()`. */
export const TIME_PICKER_FULL_CIRCLE = /* @__PURE__ */ f(Math.PI * 2);
/** `HalfCircle` (L4031). */
const HALF_CIRCLE = /* @__PURE__ */ f(TIME_PICKER_FULL_CIRCLE / 2);
/** `QuarterCircle` (L4032): a Double. */
const QUARTER_CIRCLE = Math.PI / 2;
/** `RadiansPerMinute` / `RadiansPerHour` (L4033–4034). */
const RADIANS_PER_MINUTE = /* @__PURE__ */ f(TIME_PICKER_FULL_CIRCLE / 60);
const RADIANS_PER_HOUR = /* @__PURE__ */ f(TIME_PICKER_FULL_CIRCLE / 12);
/** `MaxHourValue` / `MaxMinuteValue` (L1452–1453). */
const MAX_HOUR = 23;
const MAX_MINUTE = 59;
/** `MaxValueForTextField` (L4036). */
const MAX_TEXT_FIELD_VALUE = 99;

/** `TimePickerTokens.ClockDialContainerSize` (256dp): the dial the ratios are relative to. */
export const TIME_PICKER_CLOCK_DIAL_SIZE = 256;
/** `ClockDialSelectorHandleContainerSize` (48dp). */
const HANDLE_SIZE = 48;
/** `OuterCircleToSizeRatio` / `InnerCircleToSizeRatio` (L4038–4041): 101dp / 69dp of the dial. */
export const TIME_PICKER_OUTER_RATIO = /* @__PURE__ */ f(101 / TIME_PICKER_CLOCK_DIAL_SIZE);
export const TIME_PICKER_INNER_RATIO = /* @__PURE__ */ f(69 / TIME_PICKER_CLOCK_DIAL_SIZE);
/** `MaxDistance` (L4051), dp at the 256dp dial: closer to the center is the inner (24h) circle. */
export const TIME_PICKER_MAX_DISTANCE = 74;

/** The dial's labels (L4055–4058): minutes, hours, and the inner circle of 24-hour hours. */
export const TIME_PICKER_MINUTES: readonly number[] = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
];
export const TIME_PICKER_HOURS: readonly number[] = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const TIME_PICKER_EXTRA_HOURS: readonly number[] = [
  0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
];

export type TimePickerSelection = 'hour' | 'minute';

/** Kotlin `kotlin.math.atan2(Float, Float): Float`. */
const atan2f = (y: number, x: number) => f(Math.atan2(y, x));

/** `atan(y, x)` (L3999–4002): the angle of a point from the dial's center, 0 at 9 o'clock. */
export function timePickerAtan(y: number, x: number): number {
  const ret = f(atan2f(y, x) - f(QUARTER_CIRCLE));
  return ret < 0 ? f(ret + TIME_PICKER_FULL_CIRCLE) : ret;
}

/** `dist(x1, y1, x2, y2)` (L3993–3997): `x2` / `y2` are Ints (the center). */
export function timePickerDist(x1: number, y1: number, x2: number, y2: number): number {
  const x = f(x2 - x1);
  const y = f(y2 - y1);
  return f(Math.hypot(x, y));
}

/** Kotlin `kotlin.math.round(Float)`: `Math.rint`, ties to even. */
function rint(v: number): number {
  const r = Math.round(v);
  return r - v === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** Kotlin `Double.toInt()`: truncates toward zero. */
const toInt = (v: number) => Math.trunc(v);

const ND = /^\p{Nd}$/u;

/** Kotlin `Char.digitToIntOrNull()` for decimal digits (any Unicode `Nd` run of ten). */
function digitValue(c: string): number | null {
  if (!ND.test(c)) return null;
  const cp = c.codePointAt(0) ?? 0;
  let start = cp;
  while (ND.test(String.fromCodePoint(start - 1))) start--;
  return (cp - start) % 10;
}

/** Kotlin `Char.isDigit()` over a whole string. */
const allDigits = (text: string): boolean => Array.from(text).every((c) => ND.test(c));

/** Kotlin `String.toIntOrNull()` (radix 10): an optional sign, then decimal digits. */
export function kotlinToIntOrNull(text: string): number | null {
  const chars = Array.from(text);
  if (chars.length === 0) return null;
  let sign = 1;
  let i = 0;
  if (chars[0] === '-' || chars[0] === '+') {
    if (chars.length === 1) return null;
    sign = chars[0] === '-' ? -1 : 1;
    i = 1;
  }
  let value = 0;
  for (; i < chars.length; i++) {
    const digit = digitValue(chars[i] ?? '');
    if (digit === null) return null;
    value = value * 10 + digit;
    if (value > 2 ** 31) return null;
  }
  const result = sign * value;
  return result > 2 ** 31 - 1 || result < -(2 ** 31) ? null : result;
}

/**
 * `TimePickerStateImpl` with the `TimePickerState` extensions: `hour` / `minute` are always valid;
 * `hourInput` / `minuteInput` track what the user typed (possibly invalid) and update `hour` /
 * `minute` when valid.
 */
export class TimePickerModel {
  is24Hour: boolean;
  selection: TimePickerSelection;
  #hour: number;
  #minute: number;
  #hourInput: number;
  #minuteInput: number;

  constructor(hour = 0, minute = 0, is24Hour = false, selection: TimePickerSelection = 'hour') {
    // TimePickerStateImpl.init (L1653–1656).
    if (!(hour >= 0 && hour <= MAX_HOUR))
      throw new RangeError('initialHour should in [0..23] range');
    if (!(minute >= 0 && minute <= MAX_MINUTE)) {
      throw new RangeError('initialMinute should be in [0..59] range');
    }
    this.is24Hour = is24Hour;
    this.selection = selection;
    this.#hour = this.#hourInput = hour;
    this.#minute = this.#minuteInput = minute;
  }

  get hour(): number {
    return this.#hour;
  }

  set hour(value: number) {
    this.#hour = value;
    this.#hourInput = value;
  }

  get minute(): number {
    return this.#minute;
  }

  set minute(value: number) {
    this.#minute = value;
    this.#minuteInput = value;
  }

  get hourInput(): number {
    return this.#hourInput;
  }

  /** `TimePickerState.hourInput` (L1514–1521) then TimePickerStateImpl's (L1684–1689). */
  set hourInput(value: number) {
    if (this.isValidHour(value)) this.hour = value;
    this.#hourInput = value;
  }

  get minuteInput(): number {
    return this.#minuteInput;
  }

  set minuteInput(value: number) {
    if (value >= 0 && value <= MAX_MINUTE) this.minute = value;
    this.#minuteInput = value;
  }

  /** `isPm` (L1553): from 12 PM inclusive to 12 AM exclusive. */
  get isPm(): boolean {
    return this.hour >= 12;
  }

  /** `isValidHour` (L1563–1571). */
  isValidHour(hour: number): boolean {
    if (this.is24Hour) return hour >= 0 && hour <= MAX_HOUR;
    if (this.isPm) return hour >= 12 && hour <= MAX_HOUR;
    return hour >= 0 && hour <= 11;
  }

  get isHourInputValid(): boolean {
    return this.isValidHour(this.hourInput);
  }

  get isMinuteInputValid(): boolean {
    return this.minuteInput >= 0 && this.minuteInput <= MAX_MINUTE;
  }

  get isInputValid(): boolean {
    return this.isMinuteInputValid && this.isHourInputValid;
  }

  /** `hourForDisplay` (L1890–1897): 0–23, or 1–12. */
  get hourForDisplay(): number {
    if (this.is24Hour) return this.hour % 24;
    if (this.hour % 12 === 0) return 12;
    return this.isPm ? this.hour - 12 : this.hour;
  }
}

/**
 * `AnalogTimePickerState` (L1721–1888): the dial over a {@link TimePickerModel}. `value` is
 * `anim.value` (the selector's angle in radians, 0 at 3 o'clock, clockwise; the caller animates
 * it toward `target` with a spring and writes the frames back), `target` is `anim.targetValue`.
 */
export class ClockDialModel {
  readonly state: TimePickerModel;
  /** `userOverride` (TimePickerImpl L477): false while the dial itself changed the time. */
  userOverride: boolean | undefined;
  value: number;
  target: number;
  #hourAngle: number;
  #minuteAngle: number;

  constructor(state: TimePickerModel) {
    this.state = state;
    // `hourAngle` / `minuteAngle` (L1736–1737), then onRemembered (L1876–1883).
    this.#hourAngle = f(f(RADIANS_PER_HOUR * (state.hour % 12)) - f(TIME_PICKER_FULL_CIRCLE / 4));
    this.#minuteAngle = f(f(RADIANS_PER_MINUTE * state.minute) - f(TIME_PICKER_FULL_CIRCLE / 4));
    this.value = this.target = state.selection === 'hour' ? this.#hourAngle : this.#minuteAngle;
  }

  get selection(): TimePickerSelection {
    return this.state.selection;
  }

  set selection(value: TimePickerSelection) {
    this.state.selection = value;
  }

  /** `clockFaceValues` (L1771–1772). */
  get clockFaceValues(): readonly number[] {
    return this.selection === 'minute' ? TIME_PICKER_MINUTES : TIME_PICKER_HOURS;
  }

  /** `Animatable(angle)`: a new animation at rest at `angle`. */
  #reset(angle: number) {
    this.value = this.target = angle;
  }

  /** `anim.animateTo(end)`: the caller springs `value` to `target`. */
  #animateTo(end: number) {
    this.target = end;
  }

  /** `animateToCurrent` (L1739–1751): the new target after the selection changed, or null. */
  animateToCurrent(): number | null {
    if (!this.#isUpdated()) return null;
    const end =
      this.selection === 'hour'
        ? this.#endValueForAnimation(this.#hourAngle)
        : this.#endValueForAnimation(this.#minuteAngle);
    this.#animateTo(end);
    return end;
  }

  #isUpdated(): boolean {
    if (this.selection === 'hour' && normalize(this.target) === normalize(this.#hourAngle)) {
      return false;
    }
    if (this.selection === 'minute' && normalize(this.target) === normalize(this.#minuteAngle)) {
      return false;
    }
    return true;
  }

  /** `endValueForAnimation` (L1774–1786): the closest way round. */
  #endValueForAnimation(next: number): number {
    // Calculate the absolute angular difference
    let diff = f(this.value - next);
    // Normalize the angular difference to be between -π and π
    while (diff > HALF_CIRCLE) diff = f(diff - TIME_PICKER_FULL_CIRCLE);
    while (diff <= -HALF_CIRCLE) diff = f(diff + TIME_PICKER_FULL_CIRCLE);
    return f(this.value - diff);
  }

  /** `onGestureEnd` (L1790–1801): settle on the selected value's angle. */
  onGestureEnd(): number {
    const end = this.#endValueForAnimation(
      this.selection === 'hour' ? this.#hourAngle : this.#minuteAngle,
    );
    this.#animateTo(end);
    return end;
  }

  /**
   * `rotateTo` (L1803–1825): sets the hour / minute from an {@link timePickerAtan} angle; jumps
   * (`animate = false`, a drag) or returns to animate toward the new target.
   */
  rotateTo(angle: number, animate = false): void {
    this.userOverride = false;
    if (this.selection === 'hour') {
      this.#hourAngle = f((toHour(angle) % 12) * RADIANS_PER_HOUR);
      this.state.hourInput = (toHour(this.#hourAngle) % 12) + (this.state.isPm ? 12 : 0);
    } else {
      this.#minuteAngle = f(toMinute(angle) * RADIANS_PER_MINUTE);
      this.state.minuteInput = toMinute(this.#minuteAngle);
    }
    if (!animate) {
      this.#reset(offsetAngle(angle));
    } else {
      this.#animateTo(this.#endValueForAnimation(offsetAngle(angle)));
    }
  }

  /** The `minuteInput` override (L1827–1835): set from outside the dial. */
  setMinute(value: number): void {
    this.#minuteAngle = f(f(RADIANS_PER_MINUTE * value) - f(TIME_PICKER_FULL_CIRCLE / 4));
    this.state.minute = value;
    if (this.selection === 'minute') this.#reset(this.#minuteAngle);
  }

  /** The `hourInput` override (L1837–1845). */
  setHour(value: number): void {
    this.#hourAngle = f(f(RADIANS_PER_HOUR * (value % 12)) - f(TIME_PICKER_FULL_CIRCLE / 4));
    this.state.hour = value;
    if (this.selection === 'hour') this.#reset(this.#hourAngle);
  }

  /**
   * TimePickerImpl's `LaunchedEffect(state.hour, state.minute)` (L481–487): the time changed from
   * outside the dial (another input, the AM/PM toggle, the app) — move the selector there.
   */
  syncFromState(): void {
    if (this.userOverride === true) {
      this.setHour(this.state.hour);
      this.setMinute(this.state.minute);
    }
    this.userOverride = true;
  }

  /** `moveSelector` (L1899–1908): 24-hour hours switch circles by the distance from the center. */
  moveSelector(x: number, y: number, maxDist: number, centerX: number, centerY: number): void {
    const state = this.state;
    if (this.selection === 'hour' && state.is24Hour) {
      const currentDist = timePickerDist(x, y, centerX, centerY);
      if (state.isPm) {
        state.hour -= currentDist >= maxDist ? 12 : 0;
      } else {
        state.hour += currentDist < maxDist ? 12 : 0;
      }
    }
  }

  /**
   * `onTap` (L1910–1935) up to its auto switch: snaps the angle to an hour or to 5 minutes, moves
   * the selector and animates to it. The caller then switches to minutes after 100ms (hours) when
   * auto switching.
   */
  onTap(x: number, y: number, maxDist: number, centerX: number, centerY: number): void {
    let angle = timePickerAtan(f(y - centerY), f(x - centerX));
    if (this.selection === 'minute') {
      angle = f(f(rint(f(f(angle / RADIANS_PER_MINUTE) / 5)) * 5) * RADIANS_PER_MINUTE);
    } else {
      angle = f(f(rint(f(angle / RADIANS_PER_HOUR))) * RADIANS_PER_HOUR);
    }
    this.moveSelector(x, y, maxDist, centerX, centerY);
    this.rotateTo(angle, true);
  }

  /** `selectorPos` (L1937–1955): the handle's center in a dial of `diameter` dp. */
  selectorPos(diameter: number): { x: number; y: number } {
    const state = this.state;
    const scale = f(diameter / TIME_PICKER_CLOCK_DIAL_SIZE);
    const handleRadius = f(f(HANDLE_SIZE / 2) * scale);
    const ratio =
      state.is24Hour && state.isPm && this.selection === 'hour'
        ? TIME_PICKER_INNER_RATIO
        : TIME_PICKER_OUTER_RATIO;
    const selectorLength = Math.max(f(f(diameter * ratio) - handleRadius), 0);
    const length = f(selectorLength + handleRadius);
    return {
      x: f(f(length * f(Math.cos(this.value))) + f(diameter / 2)),
      y: f(f(length * f(Math.sin(this.value))) + f(diameter / 2)),
    };
  }
}

/**
 * ClockText's `isTheSelectedValue` (L3507–3519): the dial label that is the current hour, or the
 * minute label closest to the current minute (the target of the dial's keyboard focus).
 */
export function clockDialIsSelectedValue(state: TimePickerModel, value: number): boolean {
  if (state.selection === 'hour') {
    return state.is24Hour ? value === state.hour : value === state.hourForDisplay;
  }
  const closestMinute = toInt(f(rint(f(state.minute / 5)) * 5)) % 60;
  return value === closestMinute;
}

/** `Float.normalize()` (L1847–1855): `this % (2 * PI)` is a Double. */
function normalize(angle: number): number {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  return f(normalized);
}

/** `Float.toHour()` (L1859–1863): `totalOffset` is a Double (QuarterCircle). */
function toHour(angle: number): number {
  const hourOffset = f(RADIANS_PER_HOUR / 2);
  const totalOffset = hourOffset + QUARTER_CIRCLE;
  return toInt((angle + totalOffset) / RADIANS_PER_HOUR) % 12;
}

/** `Float.toMinute()` (L1865–1869). */
function toMinute(angle: number): number {
  const minuteOffset = f(RADIANS_PER_MINUTE / 2);
  const totalOffset = minuteOffset + QUARTER_CIRCLE;
  return toInt((angle + totalOffset) / RADIANS_PER_MINUTE) % 60;
}

/** `offsetAngle` (L1871–1874): from an {@link timePickerAtan} angle to the selector's. */
function offsetAngle(angle: number): number {
  const ret = f(angle + f(QUARTER_CIRCLE));
  return ret < 0 ? f(ret + TIME_PICKER_FULL_CIRCLE) : ret;
}

/**
 * CircularLayout (L3935–3972): where item `index` of `count` (sized `width` × `height`) is placed
 * in a `size` × `size` layout at `radiusToSizeRatio`, rounded to whole pixels.
 */
export function clockDialItemOffset(
  index: number,
  count: number,
  size: number,
  radiusToSizeRatio: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const radiusPx = f(size * radiusToSizeRatio);
  const theta = f(TIME_PICKER_FULL_CIRCLE / count);
  const centerOffsetX = toInt(size / 2) - toInt(width / 2);
  const centerOffsetY = toInt(size / 2) - toInt(height / 2);
  const offsetX = radiusPx * Math.cos(f(theta * index) - QUARTER_CIRCLE) + centerOffsetX;
  const offsetY = radiusPx * Math.sin(f(theta * index) - QUARTER_CIRCLE) + centerOffsetY;
  return { x: roundToInt(offsetX), y: roundToInt(offsetY) };
}

/** Kotlin `Double.roundToInt()`: half up (`Math.round`). */
const roundToInt = (v: number) => Math.round(v);

/** A TextFieldBuffer's text and selection (`start` ≤ `end`, UTF-16 offsets). */
export interface TimeInputText {
  text: string;
  start: number;
  end: number;
}

export interface TimeInputTransformResult extends TimeInputText {
  /** `revertAllChanges()` ran: the edit was rejected (the text is the original). */
  reverted: boolean;
  /** `errorHandler.onError()` ran (Compose: a reject haptic and sound). */
  error: boolean;
}

/**
 * `TimeInputTransformation.transformInput` (L3663–3742): an edit of the hour or minute field from
 * `original` to `edited`. Updates `state` (hourInput / minuteInput, the auto advance to minutes)
 * and returns the text to show. `userOverride` is the field's, written as Compose does.
 */
export function timeInputTransform(
  selection: TimePickerSelection,
  state: TimePickerModel,
  original: TimeInputText,
  edited: TimeInputText,
  a11yServicesEnabled: boolean,
  userOverride: { value: boolean | undefined },
): TimeInputTransformResult {
  let text = edited.text;
  let start = edited.start;
  let end = edited.end;
  const revert = (error: boolean): TimeInputTransformResult => ({
    ...original,
    reverted: true,
    error,
  });
  /** `TextFieldBuffer.delete`: the selection moves with the text. */
  const del = (from: number, to: number) => {
    text = text.slice(0, from) + text.slice(to);
    const shift = (offset: number) =>
      offset >= to ? offset - (to - from) : offset > from ? from : offset;
    start = shift(start);
    end = shift(end);
  };

  if (text.length === 0) {
    if (selection === 'hour') {
      const target = state.isPm && !state.is24Hour ? 12 : 0;
      if (state.hour !== target) userOverride.value = false;
      state.hourInput = target;
    } else {
      if (state.minute !== 0) userOverride.value = false;
      state.minuteInput = 0;
    }
    return { text, start, end, reverted: false, error: false };
  }

  if (!allDigits(text)) return revert(false);

  const originalCollapsed = original.start === original.end;
  const hasInsertedText =
    text.length - (original.text.length - (original.end - original.start)) > 0;
  const isReplacingTwoDigits = originalCollapsed && original.text.length === 2 && text.length === 3;
  if (isReplacingTwoDigits) {
    if (start === 1) {
      del(1, 3);
    } else if (start === 3) {
      del(0, 2);
    } else if (start === 2) {
      del(2, 3);
      del(0, 1);
    }
  }
  if (text.length > 2) return revert(true);

  const newValue = kotlinToIntOrNull(text);
  if (newValue === null || newValue > MAX_TEXT_FIELD_VALUE) return revert(true);

  if (selection === 'hour') {
    const target = state.is24Hour
      ? newValue
      : newValue === 12
        ? state.isPm
          ? 12
          : 0
        : state.isPm
          ? newValue + 12
          : newValue;
    if (state.isValidHour(target) && state.hour !== target) userOverride.value = false;
    state.hourInput = target;
    const isTypedTwoDigits = text.length === 2;
    const isTypingNewDigit = hasInsertedText;
    const is12HourAutoAdvanceDigit = !state.is24Hour && newValue >= 2 && newValue <= 9;
    const shouldAutoAdvance =
      (isTypedTwoDigits || (isTypingNewDigit && is12HourAutoAdvanceDigit)) &&
      !a11yServicesEnabled &&
      state.isHourInputValid;
    if (shouldAutoAdvance) state.selection = 'minute';
  } else {
    if (newValue >= 0 && newValue <= MAX_MINUTE && state.minute !== newValue) {
      userOverride.value = false;
    }
    state.minuteInput = newValue;
  }
  return { text, start, end, reverted: false, error: false };
}

/**
 * `shouldSwitchFocusToMinute` (L2015–2030): a digit typed with the hour field's cursor after two
 * digits that make a valid hour moves on to the minute field.
 */
export function timeInputShouldSwitchToMinute(
  isDigit: boolean,
  hour: TimeInputText,
  is24Hour: boolean,
): boolean {
  const isCursorAtEnd = hour.start === 2 && hour.text.length === 2;
  const hourInt = kotlinToIntOrNull(hour.text);
  const isValidHour =
    hourInt !== null &&
    ((is24Hour && hourInt >= 0 && hourInt <= 23) || (!is24Hour && hourInt >= 1 && hourInt <= 12));
  return isDigit && isCursorAtEnd && isValidHour;
}

/** TimeScrollImpl (L2241–2242, L2263–2265): the hour wheel's index of `hour` (12h: 1–12 → 0–11). */
export function timeScrollHourIndex(hour: number, is24Hour: boolean): number {
  if (is24Hour) return hour;
  const h = hour % 12;
  return h === 0 ? 11 : h - 1;
}

/** TimeScrollImpl (L2246–2258): the hour the hour wheel's `index` selects. */
export function timeScrollHourFromIndex(index: number, is24Hour: boolean, isPm: boolean): number {
  if (is24Hour) return index;
  const base = (index + 1) % 12;
  const amPmOffset = isPm ? 12 : 0;
  return base + amPmOffset;
}

/** ScrollField.kt `InfinitePageCount`. */
export const SCROLL_FIELD_PAGE_COUNT = 100_000;

/** `rememberScrollFieldState` (ScrollField.kt): the infinite pager's first page for `index`. */
export function scrollFieldInitialPage(itemCount: number, index: number): number {
  const coercedIndex = itemCount > 0 ? Math.min(Math.max(index, 0), itemCount - 1) : 0;
  const half = SCROLL_FIELD_PAGE_COUNT / 2;
  return half - (half % itemCount) + coercedIndex;
}

/** `ScrollFieldState.calculateTargetPage` (ScrollField.kt): the nearest page showing `option`. */
export function scrollFieldTargetPage(
  currentPage: number,
  itemCount: number,
  option: number,
): number {
  const currentOption = currentPage % itemCount;
  const diff = option - currentOption;
  return currentPage + diff;
}
