// m3e-elements is bundled (a devDependency): the contract helpers <m3e-text-field> uses.
import {
  TEXT_FIELD_COUNTER_LABEL,
  type TextFieldLabelPosition,
  type TextFieldVariant,
  growTextFieldInput,
  textFieldClassName,
  textFieldCounterText,
  textFieldDescribedBy,
} from '@kyralabs/m3e-elements/text-field-layout.js';
import {
  type CSSProperties,
  type ForwardedRef,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
} from 'react';
import { useId, useObjectRef, useTextField } from 'react-aria';
import { useControlledState } from 'react-stately/useControlledState';
import { Icon } from '../icon/Icon.js';
import { cx } from '../utils/cx.js';

export interface TextFieldProps {
  /** Filled (default) or outlined (Compose `TextField` / `OutlinedTextField`). */
  variant?: TextFieldVariant;
  /** The visible label (a `<label for>`); without it name the field with `aria-label`. */
  label?: ReactNode;
  /**
   * Compose's `TextFieldLabelPosition`: `inside` (filled default) and `cutout` (outlined default)
   * follow the variant; `above` puts the label over the container, always minimized.
   */
  labelPosition?: TextFieldLabelPosition;
  /** Supporting text under the field (`description` in React Aria terms). */
  description?: ReactNode;
  /** Alias of `description` (Compose `supportingText`). */
  supportingText?: ReactNode;
  /** Shown instead of the supporting text while invalid, with the "alert" role. */
  errorMessage?: ReactNode;
  /** Error colors and `aria-invalid` (Compose `isError`). */
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** `aria-required` and a "*" after the label (m3.material.io). */
  isRequired?: boolean;
  /** A Material Symbols name (a decorative icon) or a node (e.g. an icon button). */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Text before / after the input, shown while the label is minimized. */
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Limits the input and shows the character counter ("n/max"). */
  maxLength?: number;
  /** The counter's accessible prefix (default "Character count", m3.material.io). */
  counterLabel?: string;
  /** A `<textarea>` that grows with its text (Compose `TextFieldLineLimits.MultiLine`). */
  multiline?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'search' | 'url' | 'tel' | 'email' | 'password';
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const slot = (part: 'leading' | 'trailing', content: ReactNode) =>
  typeof content === 'string' ? (
    <span className={`m3e-text-field__${part}`} aria-hidden="true">
      <Icon name={content} />
    </span>
  ) : content != null && content !== false ? (
    <span className={`m3e-text-field__${part}`}>{content}</span>
  ) : null;

/**
 * Text field (COMPONENT_SPEC §26, Compose `TextField` / `OutlinedTextField`): React Aria
 * `useTextField` on the m3e-css `.m3e-text-field` contract, the same DOM as
 * `<m3e-text-field>`. The ref is the native input (or textarea). The label float, colors and the
 * outlined notch are CSS (text-field.css); this adds the live counter and, where CSS
 * `field-sizing` is missing, the growing textarea.
 */
export const TextField = /* @__PURE__ */ forwardRef(function TextField(
  props: TextFieldProps,
  forwardedRef: ForwardedRef<HTMLInputElement | HTMLTextAreaElement>,
) {
  const {
    variant = 'filled',
    label,
    labelPosition,
    description,
    supportingText,
    errorMessage,
    isInvalid = false,
    leadingIcon,
    trailingIcon,
    prefix,
    suffix,
    maxLength,
    counterLabel = TEXT_FIELD_COUNTER_LABEL,
    multiline = false,
    placeholder,
    className,
    style,
  } = props;
  const ref = useObjectRef(forwardedRef);
  const id = useId(props.id);
  const [value, setValue] = useControlledState(
    props.value,
    props.defaultValue ?? '',
    props.onChange,
  );
  const hasLabel = label != null && label !== '';
  const error = isInvalid && errorMessage != null && errorMessage !== '';
  const supporting = description ?? supportingText;
  const hasMessage = error || (supporting != null && supporting !== '');
  const counter = typeof maxLength === 'number' && maxLength >= 0;
  const { labelProps, inputProps, descriptionProps, errorMessageProps } = useTextField(
    {
      ...props,
      id,
      label: hasLabel ? label : undefined,
      // The supporting line shows one message: the error while invalid, else the description.
      description: error ? undefined : supporting,
      errorMessage: error ? errorMessage : undefined,
      isInvalid,
      value,
      onChange: setValue,
      placeholder: placeholder ?? ' ',
      inputElementType: multiline ? 'textarea' : 'input',
      'aria-describedby': textFieldDescribedBy(
        counter ? `${id}-counter` : undefined,
        props['aria-describedby'],
      ),
    } as Parameters<typeof useTextField>[0],
    ref as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
  );
  // useFocusable's tabIndex 0 is a text field's native default: not written (the element's DOM).
  if (inputProps.tabIndex === 0) delete inputProps.tabIndex;

  useLayoutEffect(() => {
    if (ref.current) growTextFieldInput(ref.current);
  }, [ref, value]);

  const outlined = variant === 'outlined';
  return (
    <div
      className={cx(textFieldClassName({ variant, labelPosition, multiline }), className)}
      style={style}
    >
      <div className="m3e-text-field__container">
        {slot('leading', leadingIcon)}
        {hasLabel ? (
          <label {...labelProps} className="m3e-text-field__label">
            {label}
          </label>
        ) : null}
        {prefix != null && prefix !== '' ? (
          <span className="m3e-text-field__prefix">{prefix}</span>
        ) : null}
        {multiline ? (
          <textarea
            {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            className="m3e-text-field__input"
            rows={1}
          />
        ) : (
          <input
            {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)}
            ref={ref as React.RefObject<HTMLInputElement>}
            className="m3e-text-field__input"
          />
        )}
        {suffix != null && suffix !== '' ? (
          <span className="m3e-text-field__suffix">{suffix}</span>
        ) : null}
        {slot('trailing', trailingIcon)}
        {outlined ? (
          <fieldset className="m3e-text-field__outline" aria-hidden="true">
            {hasLabel && labelPosition !== 'above' ? (
              <legend className="m3e-text-field__notch">
                <span>{label}</span>
              </legend>
            ) : null}
          </fieldset>
        ) : null}
      </div>
      {hasMessage || counter ? (
        <div className="m3e-text-field__supporting">
          {error ? (
            <span {...errorMessageProps} className="m3e-text-field__supporting-text" role="alert">
              {errorMessage}
            </span>
          ) : hasMessage ? (
            <span {...descriptionProps} className="m3e-text-field__supporting-text">
              {supporting}
            </span>
          ) : null}
          {counter ? (
            <span className="m3e-text-field__counter" id={`${id}-counter`}>
              <span className="m3e-text-field__a11y">{`${counterLabel}, `}</span>
              {textFieldCounterText(value.length, maxLength)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
