import { type ForwardedRef, type ReactNode, forwardRef, useRef } from 'react';
import { type PressEvent, mergeProps, useCheckbox, useObjectRef } from 'react-aria';
import { useToggleState } from 'react-stately';
import { Icon } from '../icon/Icon.js';
import { useShapeSpring } from '../motion/useShapeSpring.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx } from '../utils/cx.js';

/** `flat` = Compose `FilterChip`, `elevated` = `ElevatedFilterChip`. */
export type FilterChipVariant = 'flat' | 'elevated';

export interface FilterChipProps {
  /** The label. */
  children?: ReactNode;
  className?: string;
  /** Default `flat`. */
  variant?: FilterChipVariant;
  /**
   * The expressive `shapes` overload (owner decision M8 #9): ChipsTokens corners morphing on fast
   * spatial (rest 12dp, selected full, pressed 8dp), the tonal unselected leading icon and 4dp
   * spacing next to icons. Default false: the baseline chip (fixed 8dp corners).
   */
  isExpressive?: boolean;
  /**
   * Icon shown before the label while unselected (FilterChipWithLeadingIconSample); selected, the
   * check replaces it. Without it, the check expands in when the chip is selected.
   */
  leadingIcon?: ReactNode;
  /** Icon after the label, e.g. `<Icon name="arrow_drop_down" />`. */
  trailingIcon?: ReactNode;
  /** Controlled selected state. */
  isSelected?: boolean;
  defaultSelected?: boolean;
  /** Called with the new selected state. */
  onChange?: (isSelected: boolean) => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  name?: string;
  value?: string;
  id?: string;
  autoFocus?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-controls'?: string;
  onPressStart?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
}

/** Classes for a filter chip's root label (the m3e-css contract). */
export const filterChipClassName = (
  {
    variant = 'flat',
    isExpressive = false,
  }: { variant?: FilterChipVariant | undefined; isExpressive?: boolean | undefined },
  className?: string,
): string =>
  cx(
    'm3e-filter-chip',
    variant === 'elevated' && 'm3e-filter-chip--elevated',
    isExpressive && 'm3e-filter-chip--expressive',
    className,
  );

/**
 * Filter chip (COMPONENT_SPEC §18; Compose FilterChip / ElevatedFilterChip): React Aria
 * `useCheckbox` / react-stately `useToggleState` on the m3e-css `.m3e-filter-chip` contract, a
 * label around a native checkbox (Compose Role.Checkbox; owner decision M8 #10). Selected, it
 * shows the leading check (Material Symbols `check`), which slides in through m3e-css. The ref is
 * the native input. With `isExpressive`, the corners spring between the ChipsTokens shapes.
 */
export const FilterChip = /* @__PURE__ */ forwardRef(function FilterChip(
  props: FilterChipProps,
  forwardedRef: ForwardedRef<HTMLInputElement>,
) {
  const {
    children,
    className,
    variant,
    isExpressive = false,
    leadingIcon,
    trailingIcon,
    onPressStart,
    onPressEnd,
  } = props;
  const ref = useObjectRef(forwardedRef);
  const hostRef = useRef<HTMLLabelElement>(null);
  const stateLayer = useStateLayer(hostRef);
  const state = useToggleState(props);
  const { labelProps, inputProps, isPressed } = useCheckbox(
    {
      ...props,
      children,
      onPressStart: (e: PressEvent) => {
        stateLayer.onPressStart(e);
        onPressStart?.(e);
      },
      onPressEnd: (e: PressEvent) => {
        stateLayer.onPressEnd(e);
        onPressEnd?.(e);
      },
    },
    state,
    ref,
  );
  useShapeSpring(
    hostRef,
    { shapeVar: '--_m3e-chip-shape', spring: 'fast-spatial', enabled: isExpressive },
    `${String(isPressed)}|${String(state.isSelected)}|${variant ?? ''}`,
  );

  return (
    <label
      {...mergeProps(labelProps, stateLayer.stateLayerProps)}
      ref={hostRef}
      className={filterChipClassName({ variant, isExpressive }, className)}
      data-spring={isExpressive ? '' : undefined}
    >
      <input {...inputProps} ref={ref} className="m3e-filter-chip__input" />
      <span className="m3e-filter-chip__leading" aria-hidden="true">
        <Icon name="check" fill className="m3e-filter-chip__check" />
        {leadingIcon}
      </span>
      <span className="m3e-filter-chip__label">{children}</span>
      {trailingIcon}
    </label>
  );
});
