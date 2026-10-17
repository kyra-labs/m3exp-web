import { type ForwardedRef, type ReactNode, forwardRef } from 'react';
import { cx } from '../utils/cx.js';
import { ChipButton, type ChipButtonProps } from './chip-button.js';

/** `flat` = Compose `SuggestionChip`, `elevated` = `ElevatedSuggestionChip`. */
export type SuggestionChipVariant = 'flat' | 'elevated';

export interface SuggestionChipProps extends ChipButtonProps {
  /** Default `flat`. */
  variant?: SuggestionChipVariant;
  /** Icon before the label (Compose's `icon`), e.g. `<Icon name="lightbulb" />`. */
  icon?: ReactNode;
}

/** Classes for a suggestion chip (the m3e-css contract). */
export const suggestionChipClassName = (
  variant: SuggestionChipVariant = 'flat',
  className?: string,
): string =>
  cx('m3e-suggestion-chip', variant === 'elevated' && 'm3e-suggestion-chip--elevated', className);

/**
 * Suggestion chip (COMPONENT_SPEC §18): a button (or, with `href`, a link) on the m3e-css
 * `.m3e-suggestion-chip` classes that suggests a response or a query, e.g. a smart reply.
 */
export const SuggestionChip = /* @__PURE__ */ forwardRef(function SuggestionChip(
  props: SuggestionChipProps,
  ref: ForwardedRef<HTMLButtonElement | HTMLAnchorElement>,
) {
  const { variant, icon, className, ...rest } = props;
  return (
    <ChipButton
      {...rest}
      ref={ref}
      className={suggestionChipClassName(variant, className)}
      labelClassName="m3e-suggestion-chip__label"
      leading={icon}
    />
  );
});
