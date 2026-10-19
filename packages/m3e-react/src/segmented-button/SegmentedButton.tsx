import {
  type ForwardedRef,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useContext,
  useRef,
} from 'react';
import {
  type PressEvent,
  mergeProps,
  useCheckboxGroup,
  useCheckboxGroupItem,
  useObjectRef,
  useRadio,
  useRadioGroup,
} from 'react-aria';
import {
  type CheckboxGroupState,
  type RadioGroupState,
  useCheckboxGroupState,
  useRadioGroupState,
} from 'react-stately';
import { Icon } from '../icon/Icon.js';
import { type StateLayer, useStateLayer } from '../state-layer/useStateLayer.js';
import { cx } from '../utils/cx.js';
import { warnDeprecated } from '../utils/deprecated.js';

type RowState =
  | { readonly choice: 'single'; readonly state: RadioGroupState }
  | { readonly choice: 'multiple'; readonly state: CheckboxGroupState };

const SegmentedButtonRowContext = /* @__PURE__ */ createContext<RowState | null>(null);

interface RowProps {
  /** The `<SegmentedButton>`s. */
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** The inputs' form name (generated when omitted). */
  name?: string;
  form?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
}

export interface SingleChoiceSegmentedButtonRowProps extends RowProps {
  /** Controlled selected value (`null`: none). */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with the newly selected value. */
  onChange?: (value: string) => void;
  isRequired?: boolean;
}

export interface MultiChoiceSegmentedButtonRowProps extends RowProps {
  /** Controlled checked values. */
  value?: string[];
  defaultValue?: string[];
  /** Called with the checked values. */
  onChange?: (value: string[]) => void;
}

/**
 * Single-choice segmented button row (COMPONENT_SPEC §37; Compose `SingleChoiceSegmentedButtonRow`):
 * React Aria `useRadioGroup` on the m3e-css `.m3e-segmented-button-row` contract, a
 * `role="radiogroup"` (Compose's `selectableGroup`) of `<SegmentedButton>`s on native radios.
 * Arrow keys move the selection and wrap; Tab enters at the selected button. Name it with
 * `aria-label` or `aria-labelledby`. The ref is the row element.
 *
 * @deprecated D4: use {@link ButtonGroup} with `variant="connected"` and
 * `selectionMode="single"` (m3.material.io no longer recommends segmented buttons). Shipped until
 * 2.0; no new features.
 */
export const SingleChoiceSegmentedButtonRow = /* @__PURE__ */ forwardRef(
  function SingleChoiceSegmentedButtonRow(
    props: SingleChoiceSegmentedButtonRowProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    warnDeprecated(
      'SingleChoiceSegmentedButtonRow',
      'ButtonGroup variant="connected" selectionMode="single"',
    );
    const { children, className } = props;
    const options = { ...props, orientation: 'horizontal' as const };
    const state = useRadioGroupState(options);
    const { radioGroupProps } = useRadioGroup(options, state);
    return (
      <div {...radioGroupProps} ref={ref} className={cx('m3e-segmented-button-row', className)}>
        <SegmentedButtonRowContext.Provider value={{ choice: 'single', state }}>
          {children}
        </SegmentedButtonRowContext.Provider>
      </div>
    );
  },
);

/**
 * Multiple-choice segmented button row (COMPONENT_SPEC §37; Compose
 * `MultiChoiceSegmentedButtonRow`): React Aria `useCheckboxGroup` on the m3e-css
 * `.m3e-segmented-button-row` contract, a `role="group"` of `<SegmentedButton>`s on native
 * checkboxes (each a Tab stop that Space toggles). Name it with `aria-label` or
 * `aria-labelledby`. The ref is the row element.
 *
 * @deprecated D4: use {@link ButtonGroup} with `variant="connected"` and
 * `selectionMode="multiple"` (m3.material.io no longer recommends segmented buttons). Shipped
 * until 2.0; no new features.
 */
export const MultiChoiceSegmentedButtonRow = /* @__PURE__ */ forwardRef(
  function MultiChoiceSegmentedButtonRow(
    props: MultiChoiceSegmentedButtonRowProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    warnDeprecated(
      'MultiChoiceSegmentedButtonRow',
      'ButtonGroup variant="connected" selectionMode="multiple"',
    );
    const { children, className } = props;
    const state = useCheckboxGroupState(props);
    const { groupProps } = useCheckboxGroup(props, state);
    return (
      <div {...groupProps} ref={ref} className={cx('m3e-segmented-button-row', className)}>
        <SegmentedButtonRowContext.Provider value={{ choice: 'multiple', state }}>
          {children}
        </SegmentedButtonRowContext.Provider>
      </div>
    );
  },
);

export interface SegmentedButtonProps {
  /** The label. */
  children?: ReactNode;
  className?: string;
  /** The value the row reports when this button is selected (checked). */
  value: string;
  /**
   * Icon shown while unselected, e.g. `<Icon name="star" />` (Compose
   * `SegmentedButtonDefaults.Icon(active, inactiveContent)`, SegmentedButtonMultiSelectSample): it
   * and the check cross-fade. Without it, the check scales in when the button is selected.
   */
  icon?: ReactNode;
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

interface SegmentProps extends SegmentedButtonProps {
  inputRef: RefObject<HTMLInputElement | null>;
  hostRef: RefObject<HTMLLabelElement | null>;
  stateLayer: StateLayer;
}

/** The label (the Surface, hosting the state layer) around the input, check slot and label. */
function renderSegment(
  { children, className, icon, inputRef, hostRef, stateLayer }: SegmentProps,
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>,
  inputProps: React.InputHTMLAttributes<HTMLInputElement>,
) {
  // The label's press handler would also take keys bubbling from the input and select on Enter;
  // a native radio / checkbox selects on Space only, which the input's own press keeps.
  const labelPressProps = { ...labelProps, onKeyDown: undefined, onKeyUp: undefined };
  return (
    <label
      {...mergeProps(labelPressProps, stateLayer.stateLayerProps)}
      ref={hostRef}
      className={cx('m3e-segmented-button', className)}
    >
      <input {...inputProps} ref={inputRef} className="m3e-segmented-button__input" />
      <span className="m3e-segmented-button__icon" aria-hidden="true">
        <Icon name="check" fill className="m3e-segmented-button__check" />
        {icon}
      </span>
      <span className="m3e-segmented-button__label">{children}</span>
    </label>
  );
}

const pressing = (
  props: SegmentedButtonProps,
  stateLayer: StateLayer,
): Pick<SegmentedButtonProps, 'onPressStart' | 'onPressEnd'> => ({
  onPressStart: (e: PressEvent) => {
    stateLayer.onPressStart(e);
    props.onPressStart?.(e);
  },
  onPressEnd: (e: PressEvent) => {
    stateLayer.onPressEnd(e);
    props.onPressEnd?.(e);
  },
});

function RadioSegment(props: SegmentProps & { state: RadioGroupState }) {
  const { labelProps, inputProps } = useRadio(
    { ...props, ...pressing(props, props.stateLayer) },
    props.state,
    props.inputRef,
  );
  return renderSegment(props, labelProps, inputProps);
}

function CheckboxSegment(props: SegmentProps & { state: CheckboxGroupState }) {
  const { labelProps, inputProps } = useCheckboxGroupItem(
    { ...props, ...pressing(props, props.stateLayer) },
    props.state,
    props.inputRef,
  );
  return renderSegment(props, labelProps, inputProps);
}

/**
 * Segmented button (COMPONENT_SPEC §37; Compose `SegmentedButton`), inside a
 * `<SingleChoiceSegmentedButtonRow>` (a native radio, React Aria `useRadio`) or a
 * `<MultiChoiceSegmentedButtonRow>` (a native checkbox, `useCheckboxGroupItem`), on the m3e-css
 * `.m3e-segmented-button` contract: the label around the input, the check slot and the label
 * text. The check, the label slide and the item shapes are drawn by m3e-css; this drives the
 * ripple. The ref is the native input.
 *
 * @deprecated D4: use {@link ButtonGroupItem} in a connected {@link ButtonGroup}. Shipped until
 * 2.0; no new features.
 */
export const SegmentedButton = /* @__PURE__ */ forwardRef(function SegmentedButton(
  props: SegmentedButtonProps,
  forwardedRef: ForwardedRef<HTMLInputElement>,
) {
  const row = useContext(SegmentedButtonRowContext);
  if (!row) {
    throw new Error(
      '<SegmentedButton> must be inside a <SingleChoiceSegmentedButtonRow> or <MultiChoiceSegmentedButtonRow>',
    );
  }
  const inputRef = useObjectRef(forwardedRef);
  const hostRef = useRef<HTMLLabelElement>(null);
  const stateLayer = useStateLayer(hostRef);
  const segment = { ...props, inputRef, hostRef, stateLayer };
  return row.choice === 'single' ? (
    <RadioSegment {...segment} state={row.state} />
  ) : (
    <CheckboxSegment {...segment} state={row.state} />
  );
});
