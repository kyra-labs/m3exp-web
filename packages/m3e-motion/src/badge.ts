// Badge text shared by m3e-react's <Badge> and the navigation elements that render the badge
// contract (COMPONENT_SPEC §34, owner decisions M9 #6 and #7). Compose has no count logic: its
// samples pass the literal text ("8", "999+"; BadgeSamples.kt L59-89, TabSamples.kt L302);
// m3.material.io (Badges › Guidelines › Label text) caps the label at four characters, "using a
// '+' symbol for quantities over 999".

/** The `max` m3.material.io describes: counts above it read `999+`. */
export const BADGE_MAX_COUNT = 999;

/**
 * The visually hidden text of a badge without content (the dot): BadgeSamples.kt
 * NavigationBarItemWithBadge's `contentDescription` (L45), m3.material.io's announcement.
 */
export const BADGE_DOT_LABEL = 'New notification';

/**
 * The text a numeric badge shows: the count, or `<max>+` above `max` (999 by default). Counts
 * are integers written without grouping separators, so `999+` stays four characters.
 */
export function badgeText(count: number, max: number = BADGE_MAX_COUNT): string {
  const value = Math.trunc(count);
  const cap = Math.trunc(max);
  return value > cap ? `${String(cap)}+` : String(value);
}

/**
 * A badge built into a navigation destination or a tab (m3e-elements `badge` attribute, m3e-react
 * `badge` prop; owner decision M9 #30): `true` or `''` is the dot, a number or a string of digits
 * a count (`999+` above `max`), any other text is shown as is.
 */
export type BadgeValue = true | number | string;

/** The text a {@link BadgeValue} shows: null for the dot, else the count or the text. */
export function badgeValueText(value: BadgeValue, max: number = BADGE_MAX_COUNT): string | null {
  if (value === true || value === '') return null;
  if (typeof value === 'number') return badgeText(value, max);
  return /^\d+$/.test(value.trim()) ? badgeText(Number(value), max) : value;
}

/**
 * The visually hidden text of a badge (owner decision M9 #7): `label` when given (`''` leaves the
 * badge out of the name), else {@link BADGE_DOT_LABEL} for the dot (`text` null), else the text.
 */
export function badgeLabelText(text: string | null, label?: string | null): string {
  return label ?? text ?? BADGE_DOT_LABEL;
}
