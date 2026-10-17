import {
  type ForwardedRef,
  type ReactNode,
  createContext,
  forwardRef,
  useContext,
  useRef,
} from 'react';
import { type PressEvent, useObjectRef, useRadio, useRadioGroup } from 'react-aria';
import { type RadioGroupState, useRadioGroupState } from 'react-stately';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx } from '../utils/cx.js';

const RadioGroupContext = /* @__PURE__ */ createContext<RadioGroupState | null>(null);

export interface RadioGroupProps {
  /** The `<Radio>`s. */
  children?: ReactNode;
  className?: string;
  /** Controlled selected value (`null`: none). */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with the newly selected value. */
  onChange?: (value: string) => void;
  /** Lays the radios out in a column (default, Compose's RadioGroupSample) or a row. */
  orientation?: 'vertical' | 'horizontal';
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  /** The radios' form name (generated when omitted). */
  name?: string;
  form?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
}

/**
 * Radio group (COMPONENT_SPEC §23): React Aria `useRadioGroup` / react-stately
 * `useRadioGroupState` on the m3e-css `.m3e-radio-group` contract (`role="radiogroup"`, Compose's
 * `selectableGroup`). Arrow keys move the selection and wrap; Tab enters at the selected radio.
 * Name it with `aria-label` or `aria-labelledby`. The ref is the group element.
 */
export const RadioGroup = /* @__PURE__ */ forwardRef(function RadioGroup(
  props: RadioGroupProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const { children, className } = props;
  const state = useRadioGroupState(props);
  const { radioGroupProps } = useRadioGroup(props, state);
  return (
    <div {...radioGroupProps} ref={ref} className={cx('m3e-radio-group', className)}>
      <RadioGroupContext.Provider value={state}>{children}</RadioGroupContext.Provider>
    </div>
  );
});

export interface RadioProps {
  /** The label (Compose's RadioGroupSample row: the whole label selects). */
  children?: ReactNode;
  className?: string;
  /** The value the group reports when this radio is selected. */
  value: string;
  isDisabled?: boolean;
  id?: string;
  autoFocus?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  onPressStart?: (e: PressEvent) => void;
  onPressEnd?: (e: PressEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
}

/**
 * Radio button (COMPONENT_SPEC §23, Compose `RadioButton`): React Aria `useRadio` on the m3e-css
 * `.m3e-radio-button` contract, inside a `<RadioGroup>`. The ref is the native input. The ring
 * and dot animate in CSS (radio-button.css); this drives the ripple.
 */
export const Radio = /* @__PURE__ */ forwardRef(function Radio(
  props: RadioProps,
  forwardedRef: ForwardedRef<HTMLInputElement>,
) {
  const { children, className, onPressStart, onPressEnd } = props;
  const state = useContext(RadioGroupContext);
  if (!state) throw new Error('<Radio> must be inside a <RadioGroup>');
  const ref = useObjectRef(forwardedRef);
  const hostRef = useRef<HTMLSpanElement>(null);
  const stateLayer = useStateLayer(hostRef);
  const { labelProps, inputProps } = useRadio(
    {
      ...props,
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
  // The label's press handler would also take keys bubbling from the input and select on Enter;
  // a native radio (and m3.material.io) selects on Space only, which the input's own press keeps.
  const labelPressProps = { ...labelProps, onKeyDown: undefined, onKeyUp: undefined };

  return (
    <label {...labelPressProps} className={cx('m3e-radio-button', className)}>
      <input {...inputProps} ref={ref} className="m3e-radio-button__input" />
      <span className="m3e-radio-button__icon" aria-hidden="true" />
      <span
        {...stateLayer.stateLayerProps}
        ref={hostRef}
        className="m3e-radio-button__state"
        aria-hidden="true"
      />
      {children != null && children !== '' ? (
        <span className="m3e-radio-button__label">{children}</span>
      ) : null}
    </label>
  );
});
