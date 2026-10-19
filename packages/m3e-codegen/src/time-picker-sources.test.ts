// Source fidelity of the time picker port (COMPONENT_SPEC §28), checked against the vendored
// TimePicker.kt@19991f2c and ScrollField.kt: the JVM reference harness copies the state, the dial,
// the input transformation and the scroll indices verbatim, and the TypeScript port uses the same
// constants.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  TIME_PICKER_EXTRA_HOURS,
  TIME_PICKER_HOURS,
  TIME_PICKER_MINUTES,
} from '@kyralabs/m3e-motion';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8').replace(/\r\n/g, '\n');
const vendor = 'packages/m3e-codegen/vendor/androidx-material3-sources/';
const vendored = read(`${vendor}TimePicker.kt`);
const scrollField = read(`${vendor}ScrollField.kt`);
const tokens = read('packages/m3e-codegen/vendor/androidx-material3-tokens/TimePickerTokens.kt');
const harness = read('packages/m3e-motion/reference-time-picker/TimePickerReference.kt');
const shims = read('packages/m3e-motion/reference-time-picker/TimePickerShims.kt');
const port = read('packages/m3e-motion/src/time-picker.ts');
const unindent = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

describe('time picker JVM harness', () => {
  it('copies every VERBATIM block unchanged from the vendored TimePicker.kt / ScrollField.kt', () => {
    const blocks = [
      ...harness.matchAll(/\/\/ BEGIN VERBATIM ([^\n]+)\n([\s\S]*?)\n\s*\/\/ END VERBATIM/g),
    ];
    expect(blocks.map((b) => b[1])).toEqual([
      'MaxHourValue, MaxMinuteValue',
      'TimePickerState',
      'TimePickerState factory',
      'TimePickerSelectionMode',
      'TimePickerStateImpl',
      'AnalogTimePickerState',
      'hourForDisplay, moveSelector, onTap, selectorPos',
      'shouldSwitchFocusToMinute',
      'TimeInputTransformation',
      'dist, atan',
      'angle and text field constants',
      'circle ratios',
      'MaxDistance',
      'clock face values',
      'TimeInputErrorHandler',
      'isTheSelectedValue',
      'CircularLayout radius',
      'CircularLayout theta',
      'CircularLayout placement',
      'TimeScroll hour index',
      'TimeScroll hour from index',
      'ScrollField initialPage',
      'ScrollField calculateTargetPage',
    ]);
    for (const [, name, body] of blocks) {
      const source = name!.startsWith('ScrollField') ? scrollField : vendored;
      expect(unindent(source), name).toContain(unindent(body!));
    }
  });

  it('shims the token sizes the verbatim code imports with TimePickerTokens.kt values', () => {
    expect(tokens).toMatch(
      /ClockDialContainerSize: androidx\.compose\.ui\.unit\.Dp\n\s*get\(\) = 256\.0\.dp/,
    );
    expect(shims).toMatch(/val ClockDialContainerSize: Dp\n\s*get\(\) = 256\.0\.dp/);
    expect(tokens).toMatch(
      /ClockDialSelectorHandleContainerSize: androidx\.compose\.ui\.unit\.Dp\n\s*get\(\) = 48\.0\.dp/,
    );
    expect(shims).toMatch(/val ClockDialSelectorHandleContainerSize: Dp\n\s*get\(\) = 48\.0\.dp/);
  });
});

describe('time picker port', () => {
  const constant = (pattern: RegExp) => pattern.exec(vendored)?.[1];

  it('uses the private constants of TimePicker.kt', () => {
    expect(constant(/private val OuterCircleToSizeRatio: Float\n\s*get\(\) = (\d+)\.dp/)).toBe(
      '101',
    );
    expect(port).toContain('TIME_PICKER_OUTER_RATIO = 0.39453125;');
    expect(constant(/private val InnerCircleToSizeRatio: Float\n\s*get\(\) = (\d+)\.dp/)).toBe(
      '69',
    );
    expect(port).toContain('TIME_PICKER_INNER_RATIO = 0.26953125;');
    expect(constant(/private val MaxDistance\n\s*get\(\) = (\d+)\.dp/)).toBe('74');
    expect(port).toContain('TIME_PICKER_MAX_DISTANCE = 74;');
    expect(constant(/private val MinimumInteractiveSize\n\s*get\(\) = (\d+)\.dp/)).toBe('48');
    expect(port).toContain('TIME_PICKER_LABEL_SIZE = 48;');
    expect(constant(/private const val MaxValueForTextField = (\d+)/)).toBe('99');
    expect(port).toContain('MAX_TEXT_FIELD_VALUE = 99;');
    expect(scrollField).toContain('private const val InfinitePageCount = 100_000');
    expect(port).toContain('SCROLL_FIELD_PAGE_COUNT = 100_000;');
  });

  it('labels the dial with Minutes, Hours and ExtraHours (Hours.map { it % 12 + 12 })', () => {
    const list = (name: string) =>
      new RegExp(`private val ${name} = intListOf\\(([\\d, ]+)\\)`)
        .exec(vendored)?.[1]
        ?.split(',')
        .map((v) => Number(v.trim()));
    expect(TIME_PICKER_MINUTES).toEqual(list('Minutes'));
    expect(TIME_PICKER_HOURS).toEqual(list('Hours'));
    expect(vendored).toContain(
      'MutableIntList(Hours.size).apply { Hours.forEach { add((it % 12 + 12)) } }',
    );
    expect(TIME_PICKER_EXTRA_HOURS).toEqual(TIME_PICKER_HOURS.map((h) => (h % 12) + 12));
  });

  it('switches to minutes 100ms after an hour tap (left to the layouts) and on drag end', () => {
    expect(unindent(vendored)).toContain(
      unindent(`if (selection == TimePickerSelectionMode.Hour && autoSwitchToMinute) {
        delay(100)
    }`),
    );
    expect(unindent(vendored)).toContain(
      unindent(`if (autoSwitchToMinute) {
                                state.selection = TimePickerSelectionMode.Minute
                            }
                            state.onGestureEnd(animationSpec)`),
    );
  });
});
