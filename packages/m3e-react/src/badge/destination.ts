import { type BadgeValue, badgeLabelText, badgeValueText } from '@kyralabs/m3e-motion';

// The badge built into a navigation destination or a tab (owner decisions M9 #7, #30), shared by
// NavigationItem and Tabs; the same reading as m3e-elements' base/badge.ts.

/** What a `badge` / `badgeLabel` pair shows (`text` null: the dot), or null without a badge. */
export function destinationBadge(
  badge: BadgeValue | false | undefined,
  badgeLabel: string | undefined,
): { text: string | null; label: string } | null {
  if (badge === undefined || badge === false) return null;
  const text = badgeValueText(badge);
  return { text, label: badgeLabelText(text, badgeLabel) };
}

/** The `aria-label` of an item whose label is hidden: the label, then the badge's text. */
export const labelWithBadge = (label: string, badge: { label: string } | null): string =>
  badge?.label ? `${label} ${badge.label}` : label;
