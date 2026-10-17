import {
  sliderFraction,
  sliderKeyValue,
  sliderPageSteps,
  sliderThumbBounds,
  sliderThumbValue,
  sliderValueAt,
} from '@kyralabs/m3e-motion';
// m3e-elements is bundled (a devDependency): the contract helpers <m3e-slider> uses.
import {
  type SliderScale,
  formatSliderValue,
  sliderInputStep,
  sliderScaleSteps,
} from '@kyralabs/m3e-elements/slider-layout.js';
import { useRef, useState } from 'react';
import type { SliderState } from 'react-stately';

export interface M3eSliderStateOptions {
  readonly values: number[] | undefined;
  readonly defaultValues: number[];
  readonly onChange?: ((values: number[]) => void) | undefined;
  readonly onChangeEnd?: ((values: number[]) => void) | undefined;
  readonly scale: SliderScale;
  readonly isDisabled: boolean;
  readonly orientation: 'horizontal' | 'vertical';
  readonly locale: string;
  readonly formatOptions?: Intl.NumberFormatOptions | undefined;
}

/** React Aria's SliderState plus a key commit (Compose's onValueChangeFinished on key up). */
export interface M3eSliderState extends SliderState {
  /** Calls onChangeEnd if the values differ from `from`. */
  commit(from: readonly number[]): void;
}

/**
 * A React Aria SliderState with Compose's value rules (m3e-motion slider.ts, the same math
 * <m3e-slider> runs) instead of react-stately's: values snap to the stops (or stay continuous
 * without a step), a range thumb is coerced between the other thumb and its end, a key moves one
 * step (1 % of the range without steps) and a page clamp(actualSteps / 10, 1, 10) steps.
 */
export function useM3eSliderState(options: M3eSliderStateOptions): M3eSliderState {
  const { scale, isDisabled, orientation, locale, formatOptions, onChangeEnd } = options;
  const { min, max } = scale;
  const steps = sliderScaleSteps(scale);
  const fit = (values: readonly number[]) => {
    const sorted = values.length > 1 ? [...values].sort((a, b) => a - b) : [...values];
    return sorted.map((v, i) =>
      sliderThumbValue(v, sliderThumbBounds(sorted, i, min, max), steps, min, max),
    );
  };
  // Controlled (`values`) or not; onChange either way (react-stately's useControlledState).
  const [inner, setInner] = useState(() => fit(options.defaultValues));
  const controlled = options.values !== undefined;
  const values = options.values === undefined ? inner : fit(options.values);
  const setValuesState = (next: number[]) => {
    if (!controlled) setInner(next);
    options.onChange?.(next);
  };
  const [initialValues] = useState(values);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const [draggings, setDraggingsState] = useState<boolean[]>(() => values.map(() => false));
  const draggingsRef = useRef(draggings);
  const editables = useRef<boolean[]>(values.map(() => true));
  const [focused, setFocused] = useState<number | undefined>(undefined);
  const step = sliderInputStep(scale);

  const setValues = (next: number[]) => {
    valuesRef.current = next;
    setValuesState(next);
  };
  const isThumbEditable = (index: number) => editables.current[index] ?? true;
  const setThumbValue = (index: number, value: number) => {
    if (isDisabled || !isThumbEditable(index)) return;
    const current = valuesRef.current;
    const bounds = sliderThumbBounds(current, index, min, max);
    const next = sliderThumbValue(value, bounds, steps, min, max);
    if (next === current[index]) return;
    const copy = [...current];
    copy[index] = next;
    setValues(copy);
  };
  const setThumbDragging = (index: number, dragging: boolean) => {
    if (isDisabled || !isThumbEditable(index)) return;
    const was = draggingsRef.current[index] ?? false;
    const next = [...draggingsRef.current];
    next[index] = dragging;
    draggingsRef.current = next;
    setDraggingsState(next);
    if (was && !next.some(Boolean)) onChangeEnd?.(valuesRef.current);
  };
  const format = (value: number) => formatSliderValue(value, locale, formatOptions);
  const keyed = (index: number, action: 'increment' | 'decrement', size: number) => {
    // React Aria passes a step or the page size; both map to Compose's key steps.
    const page = size > step;
    const target = sliderKeyValue(
      page ? (action === 'increment' ? 'page-increment' : 'page-decrement') : action,
      valuesRef.current,
      index,
      steps,
      min,
      max,
    );
    setThumbValue(index, target);
  };

  return {
    values,
    defaultValues: options.values === undefined ? fit(options.defaultValues) : initialValues,
    getThumbValue: (index) => values[index] ?? min,
    setThumbValue,
    setThumbPercent: (index, percent) => {
      setThumbValue(index, sliderValueAt(Math.min(Math.max(percent, 0), 1), min, max));
    },
    isThumbDragging: (index) => draggings[index] ?? false,
    setThumbDragging,
    focusedThumb: focused,
    setFocusedThumb: setFocused,
    getThumbPercent: (index) => sliderFraction(values[index] ?? min, min, max),
    getValuePercent: (value) => sliderFraction(value, min, max),
    getThumbValueLabel: (index) => format(values[index] ?? min),
    getFormattedValue: (value = values) =>
      (typeof value === 'number' ? [value] : value).map(format).join(' – '),
    getThumbMinValue: (index) => sliderThumbBounds(values, index, min, max).min,
    getThumbMaxValue: (index) => sliderThumbBounds(values, index, min, max).max,
    getPercentValue: (percent) => sliderValueAt(Math.min(Math.max(percent, 0), 1), min, max),
    isThumbEditable,
    setThumbEditable: (index, editable) => {
      editables.current[index] = editable;
    },
    incrementThumb: (index, size = step) => {
      keyed(index, 'increment', size);
    },
    decrementThumb: (index, size = step) => {
      keyed(index, 'decrement', size);
    },
    step,
    pageSize: step * sliderPageSteps(steps),
    orientation,
    isDisabled,
    commit: (from) => {
      const now = valuesRef.current;
      if (from.some((v, i) => v !== now[i])) onChangeEnd?.(now);
    },
  };
}
