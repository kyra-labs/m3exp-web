import { type ForwardedRef, type ReactNode, forwardRef, useRef, useState } from 'react';
import { type PressEvent, mergeProps, useCheckbox, useObjectRef } from 'react-aria';
import { useToggleState } from 'react-stately';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';

type Visual = 'unchecked' | 'checked' | 'indeterminate';

/**
 * Each check segment's path (m3e-elements `CHECKBOX_SEGMENT_PATH`; the parity test holds them
 * equal): a straight line as long as the 48dp target, placed and drawn by checkbox.css.
 */
const SEGMENT = 'M0 0H48';

export interface CheckboxProps {
  /** The label (Compose's CheckboxWithTextSample row: the whole label toggles). */
  children?: ReactNode;
  className?: string;
  /** Controlled checked state. */
  isSelected?: boolean;
  defaultSelected?: boolean;
  /** Called with the new checked state. */
  onChange?: (isSelected: boolean) => void;
  /** Shows the dash (Compose `TriStateCheckbox` `ToggleableState.Indeterminate`). */
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Error colors (`aria-invalid`). */
  isInvalid?: boolean;
  isRequired?: boolean;
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

/**
 * Checkbox (COMPONENT_SPEC §22): React Aria `useCheckbox` / react-stately `useToggleState` on the
 * m3e-css `.m3e-checkbox` contract, the same DOM as `<m3e-checkbox>`. The ref is the native
 * input. The check draws and morphs in CSS (checkbox.css); this writes `data-from` (the previous
 * state, so indeterminate from unchecked draws the dash) and the ripple.
 */
export const Checkbox = /* @__PURE__ */ forwardRef(function Checkbox(
  props: CheckboxProps,
  forwardedRef: ForwardedRef<HTMLInputElement>,
) {
  const {
    children,
    className,
    isIndeterminate = false,
    isInvalid = false,
    onPressStart,
    onPressEnd,
  } = props;
  const ref = useObjectRef(forwardedRef);
  const hostRef = useRef<HTMLSpanElement>(null);
  const stateLayer = useStateLayer(hostRef);
  const state = useToggleState(props);
  const { labelProps, inputProps } = useCheckbox(
    {
      ...props,
      isInvalid,
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

  // The previous visual state, kept from render to render (React's derived-state pattern).
  const visual: Visual = isIndeterminate
    ? 'indeterminate'
    : state.isSelected
      ? 'checked'
      : 'unchecked';
  const [track, setTrack] = useState<{ visual: Visual; from?: Visual }>({ visual });
  if (track.visual !== visual) setTrack({ visual, from: track.visual });

  return (
    <label
      {...labelProps}
      className={cx('m3e-checkbox', className)}
      {...defined({ 'data-from': track.from })}
    >
      <input {...mergeProps(inputProps)} ref={ref} className="m3e-checkbox__input" />
      <span className="m3e-checkbox__box" aria-hidden="true">
        <svg className="m3e-checkbox__mark" focusable="false">
          <path className="m3e-checkbox__stroke" d={SEGMENT} />
          <path className="m3e-checkbox__stroke" d={SEGMENT} />
        </svg>
      </span>
      <span
        {...stateLayer.stateLayerProps}
        ref={hostRef}
        className="m3e-checkbox__state"
        aria-hidden="true"
      />
      {children != null && children !== '' ? (
        <span className="m3e-checkbox__label">{children}</span>
      ) : null}
    </label>
  );
});
