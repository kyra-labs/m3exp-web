// The text field DOM contract both layers write (m3e-css text-field.css): class names, the
// counter text, the aria-describedby list and the textarea growth where CSS `field-sizing` is
// missing. The label float, colors and the outlined notch are CSS only.

export type TextFieldVariant = 'filled' | 'outlined';

/**
 * Compose's TextFieldLabelPosition: Inside (the filled default), Cutout (the outlined default) or
 * Above (owner decision M8 #25). Inside and Cutout follow the variant here.
 */
export type TextFieldLabelPosition = 'inside' | 'cutout' | 'above';

/** m3.material.io Text fields › Accessibility: the counter reads "Character count, 5/20". */
export const TEXT_FIELD_COUNTER_LABEL = 'Character count';

/** What decides the root's classes. */
export interface TextFieldShape {
  readonly variant?: TextFieldVariant | undefined;
  readonly labelPosition?: TextFieldLabelPosition | undefined;
  readonly multiline?: boolean | undefined;
}

/** `.m3e-text-field` and its modifiers (filled, the default, adds none). */
export function textFieldClassName({ variant, labelPosition, multiline }: TextFieldShape): string {
  const classes = ['m3e-text-field'];
  if (variant === 'outlined') classes.push('m3e-text-field--outlined');
  if (labelPosition === 'above') classes.push('m3e-text-field--label-above');
  if (multiline) classes.push('m3e-text-field--multiline');
  return classes.join(' ');
}

/** The visible counter: characters used / the limit (m3.material.io). */
export const textFieldCounterText = (length: number, maxLength: number): string =>
  `${String(length)}/${String(maxLength)}`;

/** An `aria-describedby` value from the ids that exist (undefined when none). */
export function textFieldDescribedBy(...ids: (string | null | undefined)[]): string | undefined {
  const list = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return list.length > 0 ? list.join(' ') : undefined;
}

/** Whether the engine grows a textarea from CSS (`field-sizing: content`). */
export const textFieldSizesFromCss = (): boolean =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports('field-sizing', 'content')
    : true;

/**
 * Grows a multi-line text field's textarea to its content where CSS cannot
 * (TextFieldLineLimits.MultiLine: the field grows with its lines). A no-op where `field-sizing`
 * works or for an `<input>`.
 */
export function growTextFieldInput(input: HTMLInputElement | HTMLTextAreaElement): void {
  if (input.localName !== 'textarea' || textFieldSizesFromCss()) return;
  const style = input.style;
  style.removeProperty('block-size');
  const height = input.scrollHeight;
  if (height > 0) style.setProperty('block-size', `${String(height)}px`);
}
