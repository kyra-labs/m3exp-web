import { BADGE_DOT_LABEL, BADGE_MAX_COUNT, badgeText } from '@kyralabs/m3e-motion';
import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cx } from '../utils/cx.js';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * A number to show: written as is up to `max`, then `<max>+` (`999+`). Without `count` and
   * `children` the badge is the 6dp dot.
   */
  count?: number | undefined;
  /** The largest count shown as is (m3.material.io: "+" for quantities over 999). */
  max?: number | undefined;
  /** Other short content instead of a count (up to four characters). */
  children?: ReactNode;
  /**
   * The visually hidden text that joins the accessible name of the item around the badge
   * (owner decision M9 #7). Defaults to "New notification" for the dot, the shown count, or the
   * children when they are text. `''` leaves the badge out of the name.
   */
  label?: string | undefined;
}

/**
 * Material Design badge (Compose `Badge`, COMPONENT_SPEC §34): the dot, or a 16dp pill with a
 * count or short text. Place it on an anchor with `<BadgedBox>`. Renders the m3e-css `.m3e-badge`
 * contract: the visible text is `aria-hidden` and a visually hidden label is read with the item
 * the badge is in, so name that item from its content (not `aria-label`, which replaces it).
 */
export const Badge = /* @__PURE__ */ forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { count, max = BADGE_MAX_COUNT, children, label, className, ...rest },
  ref,
) {
  const content: ReactNode = count !== undefined ? badgeText(count, max) : children;
  // What React renders nothing for leaves the dot (Compose: content = null).
  const hasContent =
    content !== undefined && content !== null && typeof content !== 'boolean' && content !== '';
  const name =
    label ??
    (!hasContent
      ? BADGE_DOT_LABEL
      : typeof content === 'string' || typeof content === 'number'
        ? String(content)
        : undefined);
  return (
    <span
      {...rest}
      ref={ref}
      className={cx('m3e-badge', hasContent && 'm3e-badge--large', className)}
    >
      {hasContent && (
        <span className="m3e-badge__text" aria-hidden="true">
          {content}
        </span>
      )}
      {name ? <span className="m3e-badge__label">{name}</span> : null}
    </span>
  );
});

export interface BadgedBoxProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The badge, typically a `<Badge>`. */
  badge: ReactNode;
  /** The anchor the badge is placed on, typically an `<Icon>`. */
  children?: ReactNode;
}

/**
 * Compose `BadgedBox`: the anchor's size, with the badge on its top-end corner (the dot 6dp
 * inside it; a badge with content 12dp before the end and 2dp above the top). Renders the m3e-css
 * `.m3e-badged-box` contract: the anchor, then the badge, so the badge is read after it.
 */
export const BadgedBox = /* @__PURE__ */ forwardRef<HTMLSpanElement, BadgedBoxProps>(
  function BadgedBox({ badge, children, className, ...rest }, ref) {
    return (
      <span {...rest} ref={ref} className={cx('m3e-badged-box', className)}>
        {children}
        {badge}
      </span>
    );
  },
);
