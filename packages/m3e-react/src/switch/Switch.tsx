import { type ForwardedRef, type ReactNode, forwardRef, useRef } from 'react';
import { type PressEvent, useObjectRef, useSwitch } from 'react-aria';
import { useToggleState } from 'react-stately';
import { Icon } from '../icon/Icon.js';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx } from '../utils/cx.js';

export interface SwitchProps {
  /** The inline label (m3.material.io: switches always pair with one; the whole label toggles). */
  children?: ReactNode;
  className?: string;
  /** Controlled checked state. */
  isSelected?: boolean;
  defaultSelected?: boolean;
  /** Called with the new checked state. */
  onChange?: (isSelected: boolean) => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /**
   * Material Symbols icon shown in the handle while checked (Compose `thumbContent`; the
   * catalog's `SwitchWithThumbIconSample` shows `check`).
   */
  checkedIcon?: string;
  /** Icon shown while unchecked (m3.material.io pairs `close` with `check`); grows the handle. */
  uncheckedIcon?: string;
  /** The label before (`start`) or after (`end`, default) the switch. */
  labelPosition?: 'start' | 'end';
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
 * Switch (COMPONENT_SPEC §24, Compose `Switch`): React Aria `useSwitch` / react-stately
 * `useToggleState` on the m3e-css `.m3e-switch` contract (a native checkbox with
 * `role="switch"`: Space toggles, Enter does not). The ref is the native input. The handle grows
 * on press and springs in CSS (switch.css); this drives the ripple, whose `data-pressed` also
 * holds the pressed handle where `:active` does not follow React Aria's presses.
 */
export const Switch = /* @__PURE__ */ forwardRef(function Switch(
  props: SwitchProps,
  forwardedRef: ForwardedRef<HTMLInputElement>,
) {
  const {
    children,
    className,
    checkedIcon,
    uncheckedIcon,
    labelPosition = 'end',
    onPressStart,
    onPressEnd,
  } = props;
  const ref = useObjectRef(forwardedRef);
  const hostRef = useRef<HTMLSpanElement>(null);
  const stateLayer = useStateLayer(hostRef);
  const state = useToggleState(props);
  const { labelProps, inputProps } = useSwitch(
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

  const label =
    children != null && children !== '' ? (
      <span className="m3e-switch__label">{children}</span>
    ) : null;

  return (
    <label {...labelProps} className={cx('m3e-switch', className)}>
      {labelPosition === 'start' ? label : null}
      <input {...inputProps} ref={ref} className="m3e-switch__input" />
      <span className="m3e-switch__track" aria-hidden="true">
        <span className="m3e-switch__handle">
          {checkedIcon ? (
            <Icon name={checkedIcon} fill className="m3e-switch__icon m3e-switch__icon--checked" />
          ) : null}
          {uncheckedIcon ? (
            <Icon
              name={uncheckedIcon}
              fill
              className="m3e-switch__icon m3e-switch__icon--unchecked"
            />
          ) : null}
          <span {...stateLayer.stateLayerProps} ref={hostRef} className="m3e-switch__state" />
        </span>
      </span>
      {labelPosition === 'end' ? label : null}
    </label>
  );
});
