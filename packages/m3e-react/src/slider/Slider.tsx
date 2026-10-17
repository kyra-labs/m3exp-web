import {
  sliderClosestThumb,
  sliderKeyAction,
  sliderKeyValue,
  sliderValueAt,
} from '@kyralabs/m3e-motion';
// m3e-elements is bundled (a devDependency): the contract helpers <m3e-slider> uses.
import {
  SLIDER_RANGE_END_LABEL,
  SLIDER_RANGE_START_LABEL,
  SLIDER_TICK_INDEX,
  type SliderScale,
  type SliderSize,
  sliderClassName,
  sliderPointerFraction,
  sliderScaleSteps,
  sliderStyle,
  sliderTickCount,
} from '@kyralabs/m3e-elements/slider-layout.js';
import {
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  forwardRef,
  useRef,
} from 'react';
import { mergeProps, useLocale, useObjectRef, useSlider, useSliderThumb } from 'react-aria';
import { Icon } from '../icon/Icon.js';
import { cx } from '../utils/cx.js';
import { type M3eSliderState, useM3eSliderState } from './useSliderState.js';

interface SliderCommonProps {
  /** Minimum value (default 0, Compose's trackRange). */
  minValue?: number;
  /** Maximum value (default 1). */
  maxValue?: number;
  /**
   * The value increment. With a step the slider has stops (ticks) and snaps to them; without (or
   * 0) it is continuous and a key moves 1 % of the range (Compose).
   */
  step?: number;
  /** XS (default), S, M, L, XL (m3.material.io token DB sizes). */
  size?: SliderSize;
  /** Vertical: the minimum at the bottom; give the slider a block-size. */
  orientation?: 'horizontal' | 'vertical';
  isDisabled?: boolean;
  /** Number formatting of the value text (default: at most two fraction digits). */
  formatOptions?: Intl.NumberFormatOptions;
  /** Form field name (each thumb's native input). */
  name?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export interface SliderProps extends SliderCommonProps {
  /** Controlled value. */
  value?: number;
  defaultValue?: number;
  /** Called while the value changes (Compose onValueChange). */
  onChange?: (value: number) => void;
  /** Called when a drag, press or key ends (Compose onValueChangeFinished). */
  onChangeEnd?: (value: number) => void;
  /** `centered`: the active track runs from the middle (SliderDefaults.CenteredTrack). */
  variant?: 'standard' | 'centered';
  /** Inset Material Symbols icon (standard M / L / XL sliders; m3.material.io). */
  icon?: string;
}

export interface RangeSliderProps extends SliderCommonProps {
  /** Controlled start and end. */
  value?: [number, number];
  defaultValue?: [number, number];
  onChange?: (value: [number, number]) => void;
  onChangeEnd?: (value: [number, number]) => void;
  /** The thumbs' labels (default: Compose's "Range start" / "Range end"). */
  thumbLabels?: [string, string];
}

interface BaseProps extends SliderCommonProps {
  values: number[] | undefined;
  defaultValues: number[];
  onChange?: ((values: number[]) => void) | undefined;
  onChangeEnd?: ((values: number[]) => void) | undefined;
  centered?: boolean;
  icon?: string | undefined;
  thumbLabels?: readonly string[] | undefined;
}

interface ThumbProps {
  state: M3eSliderState;
  index: number;
  trackRef: RefObject<HTMLDivElement | null>;
  orientation: 'horizontal' | 'vertical';
  label: string | undefined;
  name: string | undefined;
  isStart: boolean;
  scale: SliderScale;
}

function SliderThumb({
  state,
  index,
  trackRef,
  orientation,
  label,
  name,
  isStart,
  scale,
}: ThumbProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { direction } = useLocale();
  const { thumbProps, inputProps, isDragging } = useSliderThumb(
    {
      index,
      trackRef,
      inputRef,
      orientation,
      isDisabled: state.isDisabled,
      ...(label === undefined ? {} : { 'aria-label': label }),
      ...(name === undefined ? {} : { name }),
    },
    state,
  );
  const keyFrom = useRef<number[] | null>(null);
  // Compose's keys (m3e-motion, as <m3e-slider>), in place of React Aria's.
  const keys = {
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      const action = sliderKeyAction(e.key, {
        vertical: orientation === 'vertical',
        rtl: direction === 'rtl',
        shiftKey: e.shiftKey,
      });
      if (!action || state.isDisabled) return;
      e.preventDefault();
      e.stopPropagation();
      keyFrom.current ??= [...state.values];
      state.setThumbValue(
        index,
        sliderKeyValue(action, state.values, index, sliderScaleSteps(scale), scale.min, scale.max),
      );
    },
    onKeyUp: () => {
      const from = keyFrom.current;
      keyFrom.current = null;
      if (from) state.commit(from);
    },
  };
  // React Aria's empty describedby / details are not part of the contract.
  const describedBy = inputProps['aria-describedby'];
  const details = inputProps['aria-details'];
  return (
    <div
      {...thumbProps}
      // slider.css places the thumb: no inline position.
      style={undefined}
      className={cx('m3e-slider__thumb', isStart && 'm3e-slider__thumb--start')}
      data-dragging={isDragging ? '' : undefined}
    >
      <input
        {...mergeProps(inputProps, keys)}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        aria-details={details === '' ? undefined : details}
        ref={inputRef}
        className="m3e-slider__input"
      />
      <span className="m3e-slider__handle" aria-hidden="true" />
      <span className="m3e-slider__value-indicator" aria-hidden="true">
        {state.getThumbValueLabel(index)}
      </span>
    </div>
  );
}

const SliderBase = /* @__PURE__ */ forwardRef(function SliderBase(
  props: BaseProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    minValue = 0,
    maxValue = 1,
    step,
    size,
    orientation = 'horizontal',
    isDisabled = false,
    formatOptions,
    name,
    id,
    className,
    style,
    centered = false,
    icon,
    thumbLabels,
  } = props;
  const ref = useObjectRef(forwardedRef);
  const trackRef = useRef<HTMLDivElement>(null);
  const { locale, direction } = useLocale();
  const scale = { min: minValue, max: maxValue > minValue ? maxValue : minValue, step };
  const state = useM3eSliderState({
    values: props.values,
    defaultValues: props.defaultValues,
    onChange: props.onChange,
    onChangeEnd: props.onChangeEnd,
    scale,
    isDisabled,
    orientation,
    locale,
    formatOptions,
  });
  const range = state.values.length > 1;
  const { groupProps, trackProps } = useSlider(
    {
      orientation,
      isDisabled,
      ...(id === undefined ? {} : { id }),
      ...(props['aria-label'] === undefined ? {} : { 'aria-label': props['aria-label'] }),
      ...(props['aria-labelledby'] === undefined
        ? {}
        : { 'aria-labelledby': props['aria-labelledby'] }),
      ...(props['aria-describedby'] === undefined
        ? {}
        : { 'aria-describedby': props['aria-describedby'] }),
    },
    state,
    trackRef,
  );
  const ticks = sliderTickCount(scale);
  // React Aria focuses the pressed thumb's input; focus it first without focus-visible (a pointer
  // focus is not a keyboard one: no ring, no focus-visible handle), as <m3e-slider> does.
  const focusPressed = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isDisabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const inputs = e.currentTarget.querySelectorAll<HTMLInputElement>('.m3e-slider__input');
    const thumb = (e.target as Element).closest('.m3e-slider__thumb');
    let index = [...inputs].findIndex((input) => input.parentElement === thumb);
    if (index < 0) {
      const fraction = sliderPointerFraction(
        e.currentTarget.getBoundingClientRect(),
        e.clientX,
        e.clientY,
        orientation === 'vertical',
        direction === 'rtl',
      );
      index = sliderClosestThumb(state.values, sliderValueAt(fraction, scale.min, scale.max));
    }
    inputs[index]?.focus({ preventScroll: true, focusVisible: false });
  };
  return (
    <div
      {...groupProps}
      ref={ref}
      className={cx(
        sliderClassName({ size, range, centered, vertical: orientation === 'vertical' }),
        className,
      )}
      style={{ ...sliderStyle(state.values, scale), ...style }}
    >
      <div
        {...trackProps}
        style={undefined}
        ref={trackRef}
        className="m3e-slider__track"
        onPointerDownCapture={focusPressed}
      >
        <span className="m3e-slider__inactive-start" aria-hidden="true" />
        <span className="m3e-slider__active" aria-hidden="true" />
        <span className="m3e-slider__inactive-end" aria-hidden="true" />
        {ticks > 0 && (
          <span className="m3e-slider__ticks" aria-hidden="true">
            {Array.from({ length: ticks }, (_, i) => (
              <span
                key={i}
                className="m3e-slider__tick"
                style={{ [SLIDER_TICK_INDEX]: String(i) } as CSSProperties}
              />
            ))}
          </span>
        )}
        {icon && <Icon name={icon} className="m3e-slider__icon" />}
        {icon && <Icon name={icon} className="m3e-slider__icon m3e-slider__icon--inactive" />}
        {state.values.map((_, index) => (
          <SliderThumb
            key={index}
            state={state}
            index={index}
            trackRef={trackRef}
            orientation={orientation}
            label={range ? thumbLabels?.[index] : undefined}
            name={name}
            isStart={range && index === 0}
            scale={scale}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Slider (COMPONENT_SPEC §25, Compose `Slider` / `VerticalSlider`): React Aria `useSlider` /
 * `useSliderThumb` on the m3e-css `.m3e-slider` contract (the same DOM as `<m3e-slider>`), with
 * Compose's value rules from m3e-motion: stops for a `step`, Compose's key steps and pages. The ref
 * is the root. `variant="centered"` is `SliderDefaults.CenteredTrack`; `orientation="vertical"`
 * puts the minimum at the bottom; `icon` adds an inset icon (M / L / XL).
 */
export const Slider = /* @__PURE__ */ forwardRef(function Slider(
  props: SliderProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const { value, defaultValue, onChange, onChangeEnd, variant, icon, ...rest } = props;
  return (
    <SliderBase
      {...rest}
      ref={ref}
      values={value === undefined ? undefined : [value]}
      defaultValues={[defaultValue ?? rest.minValue ?? 0]}
      onChange={
        onChange &&
        ((v) => {
          onChange(v[0] ?? 0);
        })
      }
      onChangeEnd={
        onChangeEnd &&
        ((v) => {
          onChangeEnd(v[0] ?? 0);
        })
      }
      centered={variant === 'centered'}
      icon={icon}
    />
  );
});

const pair = ([start = 0, end = start]: number[]): [number, number] => [start, end];

/**
 * Range slider (COMPONENT_SPEC §25, Compose `RangeSlider`): two thumbs, each its own labelled
 * slider ("Range start" / "Range end", Compose's descriptions), that meet but never cross.
 * Horizontal (m3.material.io: avoid vertical range sliders).
 */
export const RangeSlider = /* @__PURE__ */ forwardRef(function RangeSlider(
  props: RangeSliderProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const { value, defaultValue, onChange, onChangeEnd, thumbLabels, ...rest } = props;
  return (
    <SliderBase
      {...rest}
      ref={ref}
      values={value}
      defaultValues={defaultValue ?? [rest.minValue ?? 0, rest.maxValue ?? 1]}
      onChange={
        onChange &&
        ((v) => {
          onChange(pair(v));
        })
      }
      onChangeEnd={
        onChangeEnd &&
        ((v) => {
          onChangeEnd(pair(v));
        })
      }
      thumbLabels={thumbLabels ?? [SLIDER_RANGE_START_LABEL, SLIDER_RANGE_END_LABEL]}
    />
  );
});
