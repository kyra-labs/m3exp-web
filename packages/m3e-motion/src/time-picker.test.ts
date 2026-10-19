// The time picker math against Compose: the JVM reference dump (`pnpm reference:time-picker`,
// __fixtures__/time-picker-reference.json), which runs TimePicker.kt@19991f2c's state,
// AnalogTimePickerState, moveSelector / onTap / selectorPos, CircularLayout's placement, the time
// input's InputTransformation and focus switch, and TimeScroll / ScrollField's indices verbatim,
// compared bit for bit.
import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/time-picker-reference.json' with { type: 'json' };
import {
  ClockDialModel,
  SCROLL_FIELD_PAGE_COUNT,
  TIME_PICKER_FULL_CIRCLE,
  TIME_PICKER_INNER_RATIO,
  TIME_PICKER_MAX_DISTANCE,
  TIME_PICKER_MINUTES,
  TIME_PICKER_OUTER_RATIO,
  TimePickerModel,
  type TimePickerSelection,
  clockDialIsSelectedValue,
  clockDialItemOffset,
  kotlinToIntOrNull,
  scrollFieldInitialPage,
  scrollFieldTargetPage,
  timeInputShouldSwitchToMinute,
  timeInputTransform,
  timePickerAtan,
  timePickerDist,
  timeScrollHourFromIndex,
  timeScrollHourIndex,
} from './time-picker.js';

const f = Math.fround;

interface DialSnapshot {
  hour: number;
  minute: number;
  hourInput: number;
  minuteInput: number;
  selection: string;
  value: number;
  target: number;
}

const snapshot = (dial: ClockDialModel): DialSnapshot => ({
  hour: dial.state.hour,
  minute: dial.state.minute,
  hourInput: dial.state.hourInput,
  minuteInput: dial.state.minuteInput,
  selection: dial.selection,
  value: dial.value,
  target: dial.target,
});

const expected = (s: DialSnapshot): DialSnapshot => ({
  ...s,
  value: f(s.value),
  target: f(s.target),
});

const newDial = (hour: number, minute: number, is24: boolean, mode: string) =>
  new ClockDialModel(new TimePickerModel(hour, minute, is24, mode as TimePickerSelection));

const pos = (p: { x: number; y: number }) => ({ x: f(p.x), y: f(p.y) });

describe('constants', () => {
  it('match TimePicker.kt', () => {
    expect(TIME_PICKER_FULL_CIRCLE).toBe(f(reference.constants.fullCircle));
    // The literals are the float32 values of TimePicker.kt's expressions.
    expect(TIME_PICKER_FULL_CIRCLE).toBe(f(Math.PI * 2));
    expect(TIME_PICKER_OUTER_RATIO).toBe(f(101 / 256));
    expect(TIME_PICKER_INNER_RATIO).toBe(f(69 / 256));
    expect(f(TIME_PICKER_FULL_CIRCLE / 2)).toBe(3.1415927410125732);
    expect(f(TIME_PICKER_FULL_CIRCLE / 60)).toBe(0.10471975803375244);
    expect(f(TIME_PICKER_FULL_CIRCLE / 12)).toBe(0.5235987901687622);
    expect(TIME_PICKER_OUTER_RATIO).toBe(f(reference.constants.outerRatio));
    expect(TIME_PICKER_INNER_RATIO).toBe(f(reference.constants.innerRatio));
    expect(TIME_PICKER_MAX_DISTANCE).toBe(reference.constants.maxDistance);
    expect(SCROLL_FIELD_PAGE_COUNT).toBe(100_000);
  });
});

describe('atan / dist', () => {
  it.each(reference.geometry.map((g) => [g.x, g.y, g] as const))('(%f, %f)', (x, y, g) => {
    expect(timePickerAtan(f(f(y) - 128), f(f(x) - 128))).toBe(f(g.atan));
    expect(timePickerDist(f(x), f(y), 128, 128)).toBe(f(g.dist));
  });
});

describe('dial taps (onTap)', () => {
  it.each(reference.taps.map((t, i) => [i, t] as const))('case %i', (_, t) => {
    const dial = newDial(t.hour, 23, t.is24, t.mode);
    dial.onTap(f(t.x), f(t.y), TIME_PICKER_MAX_DISTANCE, 128, 128);
    expect(snapshot(dial)).toEqual(expected(t.after));
    dial.value = dial.target;
    expect(dial.selectorPos(256)).toEqual(pos(t.settled));
  });
});

describe('dial drags (rotateTo + moveSelector, onGestureEnd, animateToCurrent)', () => {
  it.each(reference.drags.map((d, i) => [i, d] as const))('case %i', (_, d) => {
    const dial = newDial(10, 41, d.is24, d.mode);
    let x = f(d.start[0]!);
    let y = f(d.start[1]!);
    for (const step of d.steps) {
      x = f(x + f(step.dx));
      y = f(y + f(step.dy));
      dial.rotateTo(timePickerAtan(f(y - 128), f(x - 128)));
      dial.moveSelector(x, y, TIME_PICKER_MAX_DISTANCE, 128, 128);
      const { hour, minute, hourInput, minuteInput, selection, value, target } = step;
      expect(snapshot(dial)).toEqual(
        expected({ hour, minute, hourInput, minuteInput, selection, value, target }),
      );
      expect(dial.selectorPos(256)).toEqual(pos(step.pos));
    }
    dial.onGestureEnd();
    expect(snapshot(dial)).toEqual(expected(d.end));
    dial.selection = d.mode === 'hour' ? 'minute' : 'hour';
    dial.animateToCurrent();
    expect(snapshot(dial)).toEqual(expected(d.switched));
  });
});

describe('time set from outside the dial (hourInput / minuteInput overrides) and selectorPos', () => {
  it.each(reference.inputs.map((c, i) => [i, c] as const))('case %i', (_, c) => {
    const dial = newDial(3, 15, c.is24, c.mode);
    dial.setHour(c.h);
    dial.setMinute(c.m);
    const { hour, minute, hourInput, minuteInput, selection, value, target } = c;
    expect(snapshot(dial)).toEqual(
      expected({ hour, minute, hourInput, minuteInput, selection, value, target }),
    );
    expect([dial.selectorPos(256), dial.selectorPos(238), dial.selectorPos(200)]).toEqual(
      c.pos.map(pos),
    );
  });
});

describe('CircularLayout', () => {
  it.each(reference.layout.map((l) => [l.size, l.ratio, l] as const))(
    '%i at %f',
    (size, ratio, l) => {
      const offsets = Array.from({ length: 12 }, (_, i) => {
        const o = clockDialItemOffset(i, 12, size, f(ratio), 48, 48);
        return [o.x, o.y];
      });
      expect(offsets).toEqual(l.offsets);
    },
  );
});

describe('isTheSelectedValue', () => {
  it.each(reference.selectedValues.map((c, i) => [i, c] as const))('case %i', (_, c) => {
    const state = new TimePickerModel(
      c.mode === 'hour' ? c.v : 9,
      c.mode === 'minute' ? c.v : 0,
      c.is24,
      c.mode as TimePickerSelection,
    );
    const labels =
      c.mode === 'minute' ? TIME_PICKER_MINUTES : Array.from({ length: 24 }, (_, i) => i);
    expect(labels.filter((v) => clockDialIsSelectedValue(state, v))).toEqual(c.selected);
  });
});

describe('TimeInputTransformation', () => {
  it.each(reference.inputTransforms.map((c, i) => [i, c] as const))('case %i', (_, c) => {
    const state = new TimePickerModel(c.h0, c.m0, c.is24, 'hour');
    const override: { value: boolean | undefined } = { value: true };
    const result = timeInputTransform(
      c.mode as TimePickerSelection,
      state,
      { text: c.original, start: c.oStart, end: c.oEnd },
      { text: c.edited, start: c.cursor, end: c.cursor },
      c.a11y,
      override,
    );
    expect({
      text: result.text,
      start: result.start,
      end: result.end,
      reverted: result.reverted,
      error: result.error,
      hour: state.hour,
      minute: state.minute,
      hourInput: state.hourInput,
      minuteInput: state.minuteInput,
      selection: state.selection,
      userOverride: override.value,
    }).toEqual({
      text: c.text,
      start: c.start,
      end: c.end,
      reverted: c.reverted,
      error: c.error,
      hour: c.hour,
      minute: c.minute,
      hourInput: c.hourInput,
      minuteInput: c.minuteInput,
      selection: c.selection,
      userOverride: c.userOverride,
    });
  });
});

describe('shouldSwitchFocusToMinute', () => {
  it.each(reference.focusSwitch.map((c, i) => [i, c] as const))('case %i', (_, c) => {
    const isDigit = c.code >= 48 && c.code <= 57;
    expect(
      timeInputShouldSwitchToMinute(
        isDigit,
        { text: c.text, start: c.cursor, end: c.cursor },
        c.is24,
      ),
    ).toBe(c.result);
  });
});

describe('TimeScroll / ScrollField indices', () => {
  it('maps hours to the hour wheel and back', () => {
    for (const [hour, is24, index] of reference.scroll.index as [number, boolean, number][]) {
      expect(timeScrollHourIndex(hour, is24)).toBe(index);
    }
    for (const [index, is24, hour, result] of reference.scroll.hour as [
      number,
      boolean,
      number,
      number,
    ][]) {
      expect(timeScrollHourFromIndex(index, is24, hour >= 12)).toBe(result);
    }
  });

  it('pages the infinite pager like rememberScrollFieldState / calculateTargetPage', () => {
    for (const [n, i, page] of reference.scroll.initialPage) {
      expect(scrollFieldInitialPage(n!, i!)).toBe(page);
    }
    for (const [page, n, option, target] of reference.scroll.targetPage) {
      expect(scrollFieldTargetPage(page!, n!, option!)).toBe(target);
    }
  });
});

describe('kotlinToIntOrNull', () => {
  it('parses decimal digits of any script, with a sign', () => {
    expect(kotlinToIntOrNull('09')).toBe(9);
    expect(kotlinToIntOrNull('٠٩')).toBe(9);
    expect(kotlinToIntOrNull('+1')).toBe(1);
    expect(kotlinToIntOrNull('-12')).toBe(-12);
    expect(kotlinToIntOrNull('')).toBeNull();
    expect(kotlinToIntOrNull('+')).toBeNull();
    expect(kotlinToIntOrNull('1a')).toBeNull();
  });
});
