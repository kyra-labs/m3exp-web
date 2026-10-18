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
