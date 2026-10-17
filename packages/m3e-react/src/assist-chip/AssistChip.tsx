import { type ForwardedRef, type ReactNode, forwardRef } from 'react';
import { ChipButton, type ChipButtonProps } from '../chips/chip-button.js';
import { cx } from '../utils/cx.js';

/** `flat` = Compose `AssistChip`, `elevated` = `ElevatedAssistChip`. */
export type AssistChipVariant = 'flat' | 'elevated';

export interface AssistChipProps extends ChipButtonProps {
  /** Default `flat`. */
  variant?: AssistChipVariant;
  /** Icon before the label, e.g. `<Icon name="event" />`. */
  leadingIcon?: ReactNode;
  /** Icon after the label. */
  trailingIcon?: ReactNode;
}

/** Classes for an assist chip (the m3e-css contract). */
export const assistChipClassName = (
  variant: AssistChipVariant = 'flat',
  className?: string,
): string =>
  cx('m3e-assist-chip', variant === 'elevated' && 'm3e-assist-chip--elevated', className);

/**
 * Assist chip (COMPONENT_SPEC §18): React Aria behavior on the m3e-css `.m3e-assist-chip` classes.
 * A smart or contextual action, e.g. "Add to calendar".
 */
export const AssistChip = /* @__PURE__ */ forwardRef(function AssistChip(
  props: AssistChipProps,
  ref: ForwardedRef<HTMLButtonElement | HTMLAnchorElement>,
) {
  const { variant, leadingIcon, trailingIcon, className, ...rest } = props;
  return (
    <ChipButton
      {...rest}
      ref={ref}
      className={assistChipClassName(variant, className)}
      labelClassName="m3e-assist-chip__label"
      leading={leadingIcon}
      trailing={trailingIcon}
    />
  );
});
