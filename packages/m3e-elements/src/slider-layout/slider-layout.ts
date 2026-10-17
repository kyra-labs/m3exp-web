// The slider DOM contract both layers write (m3e-css slider.css): class names, the custom
// properties that place the thumbs and stops, the native inputs' attributes and value text, and the
// pointer → value mapping. The math is m3e-motion's slider.ts (a port of Compose's Slider.kt).
import {
  sliderFraction,
  sliderKeyDelta,
  sliderSteps,
  sliderThumbBounds,
} from '@kyralabs/m3e-motion';

/** compose/ui `range_start` (Strings.SliderRangeStart): the start thumb's label. */
export const SLIDER_RANGE_START_LABEL = 'Range start';
/** compose/ui `range_end` (Strings.SliderRangeEnd): the end thumb's label. */
export const SLIDER_RANGE_END_LABEL = 'Range end';

export type SliderSize = 'xs' | 's' | 'm' | 'l' | 'xl';

export const SLIDER_SIZES: readonly SliderSize[] = ['xs', 's', 'm', 'l', 'xl'];

/** What decides the root's classes. */
export interface SliderShape {
  readonly size?: SliderSize | undefined;
  readonly range?: boolean | undefined;
  readonly centered?: boolean | undefined;
  readonly vertical?: boolean | undefined;
}

/** `.m3e-slider` and its modifiers (XS, the default, adds none). */
export function sliderClassName({ size, range, centered, vertical }: SliderShape): string {
  const classes = ['m3e-slider'];
  if (size && size !== 'xs' && SLIDER_SIZES.includes(size))
    classes.push(`m3e-slider--size-${size}`);
  if (range) classes.push('m3e-slider--range');
  else if (centered) classes.push('m3e-slider--centered');
  if (vertical) classes.push('m3e-slider--vertical');
  return classes.join(' ');
}

/** The value range and step every layer reads (step ≤ 0 or absent: continuous). */
export interface SliderScale {
  readonly min: number;
  readonly max: number;
  readonly step?: number | undefined;
}

/** Compose `steps` (stops between the ends) for a scale. */
export const sliderScaleSteps = ({ min, max, step }: SliderScale): number =>
  sliderSteps(min, max, step);

/**
 * The root's custom properties (slider.css): `--m3e-comp-slider-value` (the thumb, or a range's
 * end, 0–1), `--m3e-comp-slider-start-value` (a range's start) and `--m3e-comp-slider-steps`.
 */
export function sliderStyle(values: readonly number[], scale: SliderScale): Record<string, string> {
  const { min, max } = scale;
  const style: Record<string, string> = {};
  const end = values[values.length - 1] ?? min;
  style['--m3e-comp-slider-value'] = String(sliderFraction(end, min, max));
  if (values.length > 1) {
    style['--m3e-comp-slider-start-value'] = String(sliderFraction(values[0] ?? min, min, max));
  }
  const steps = sliderScaleSteps(scale);
  if (steps > 0) style['--m3e-comp-slider-steps'] = String(steps);
  return style;
}

/** One tick per stop (steps + 2), or none: each carries its index for slider.css. */
export const sliderTickCount = (scale: SliderScale): number => {
  const steps = sliderScaleSteps(scale);
  return steps > 0 ? steps + 2 : 0;
};

/** The tick's custom property. */
export const SLIDER_TICK_INDEX = '--m3e-comp-slider-tick-index';

/**
 * The native input's `step`: one key step (range / (steps + 1), or 1 % of the range without
 * steps), so assistive technology increments it as the keyboard does.
 */
export const sliderInputStep = (scale: SliderScale): number =>
  sliderKeyDelta(sliderScaleSteps(scale), scale.min, scale.max);

/** The native input's `min` / `max`: the thumb's bounds (a range thumb stops at the other). */
export const sliderInputBounds = (
  values: readonly number[],
  index: number,
  scale: SliderScale,
): { min: number; max: number } => sliderThumbBounds(values, index, scale.min, scale.max);

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * The value text (`aria-valuetext` and the value indicator): at most two fraction digits, as
 * Compose's stateDescription (`formatForSemantics` rounds to hundredths), in `locale`.
 */
export function formatSliderValue(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  const key = `${locale}|${JSON.stringify(options ?? null)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options ?? { maximumFractionDigits: 2 });
    formatters.set(key, formatter);
  }
  return formatter.format(value);
}

/** Where a pointer lies along the track, 0–1 from the minimum (vertical: from the bottom). */
export function sliderPointerFraction(
  track: DOMRect,
  clientX: number,
  clientY: number,
  vertical: boolean,
  rtl: boolean,
): number {
  const raw = vertical
    ? (track.bottom - clientY) / track.height
    : rtl
      ? (track.right - clientX) / track.width
      : (clientX - track.left) / track.width;
  return Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 1) : 0;
}
