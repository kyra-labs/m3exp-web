// Layout literals Compose's navigation bars and rails render that are not in the Navigation*Tokens
// files: private/internal `Dp` constants in NavigationBar.kt, NavigationRail.kt,
// ShortNavigationBar.kt and WideNavigationRail.kt, plus the ShortNavigationBar "Centered"
// arrangement padding (calculateCenteredContentHorizontalPadding), evaluated per item count.
import {
  type ExtractedDefault,
  type LiteralRule,
  extractLiteralDefaults,
} from './button-defaults.js';

const RULES: readonly LiteralRule[] = [
  {
    name: '--m3e-comp-short-navigation-bar-item-indicator-to-label-padding',
    owner: 'ShortNavigationBar.kt',
    member: 'TopIconIndicatorToLabelPadding',
    file: 'ShortNavigationBar.kt',
    pattern: /val TopIconIndicatorToLabelPadding: Dp\s*get\(\) = (\d+)\.dp/,
  },
  {
    name: '--m3e-comp-wide-navigation-rail-item-horizontal-padding',
    owner: 'WideNavigationRail.kt',
    member: 'WNRItemHorizontalPadding',
    file: 'WideNavigationRail.kt',
    pattern: /val WNRItemHorizontalPadding\s*get\(\) = (\d+)\.dp/,
  },
  {
    name: '--m3e-comp-navigation-bar-item-horizontal-padding',
    owner: 'NavigationBar.kt',
    member: 'NavigationBarItemHorizontalPadding',
    file: 'NavigationBar.kt',
    pattern: /val NavigationBarItemHorizontalPadding: Dp\s*get\(\) = (\d+)\.dp/,
    note: 'legacy NavigationBar (D4)',
  },
  {
    name: '--m3e-comp-navigation-bar-indicator-to-label-padding',
    owner: 'NavigationBar.kt',
    member: 'NavigationBarIndicatorToLabelPadding',
    file: 'NavigationBar.kt',
    pattern: /val NavigationBarIndicatorToLabelPadding: Dp\s*get\(\) = (\d+)\.dp/,
    note: 'legacy NavigationBar (D4)',
  },
  {
    name: '--m3e-comp-navigation-rail-vertical-padding',
    owner: 'NavigationRail.kt',
    member: 'NavigationRailVerticalPadding',
    file: 'NavigationRail.kt',
    pattern: /val NavigationRailVerticalPadding: Dp\s*get\(\) = (\d+)\.dp/,
    note: 'legacy NavigationRail (D4)',
  },
  {
    name: '--m3e-comp-navigation-rail-header-padding',
    owner: 'NavigationRail.kt',
    member: 'NavigationRailHeaderPadding',
    file: 'NavigationRail.kt',
    pattern: /val NavigationRailHeaderPadding: Dp\s*get\(\) = (\d+)\.dp/,
    note: 'legacy NavigationRail (D4)',
  },
  {
    name: '--m3e-comp-navigation-rail-item-vertical-padding',
    owner: 'NavigationRail.kt',
    member: 'NavigationRailItemVerticalPadding',
    file: 'NavigationRail.kt',
    pattern: /val NavigationRailItemVerticalPadding: Dp\s*get\(\) = (\d+)\.dp/,
    note: 'legacy NavigationRail (D4)',
  },
];

export interface CenteredPadding {
  /** CSS variable emitted (one per item count and measure). */
  name: string;
  items: number;
  /** Percentage of the bar width. */
  percent: number;
  member: string;
  file: string;
  line: number;
  raw: string;
}

/** Every file the rules read. */
export const NAVIGATION_DEFAULTS_SOURCES = [
  ...new Set([...RULES.map((r) => r.file), 'ShortNavigationBar.kt']),
];

export function extractNavigationDefaults(
  sources: Readonly<Record<string, string>>,
): ExtractedDefault[] {
  return extractLiteralDefaults(RULES, sources);
}

/**
 * ShortNavigationBarArrangement.Centered (CenteredContentMeasurePolicy): each side gets
 * `((100 - k * (itemsCount + c)) / 2f) / 100` of the bar width (0 above `max` items); each item is
 * at least (width − 2 × padding) / count and at most width / count wide. Emitted per item count
 * as percentages of the bar width.
 */
export function extractCenteredPadding(
  sources: Readonly<Record<string, string>>,
): CenteredPadding[] {
  const file = 'ShortNavigationBar.kt';
  const text = sources[file]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`${file} is not vendored`);
  const pattern =
    /private fun calculateCenteredContentHorizontalPadding\(itemsCount: Int, barWidth: Int\): Int \{\s*if \(itemsCount > (\d+)\) return 0[\s\S]*?val paddingPercentage = \(\((\d+) - (\d+) \* \(itemsCount \+ (\d+)\)\) \/ 2f\) \/ 100/;
  const match = pattern.exec(text);
  if (!match)
    throw new Error(`${file}: calculateCenteredContentHorizontalPadding changed upstream`);
  const policy =
    /val itemMaxWidth = width \/ itemsCount\s*barHorizontalPadding = calculateCenteredContentHorizontalPadding\(itemsCount, width\)\s*val itemMinWidth = \(width - \(barHorizontalPadding \* 2\)\) \/ itemsCount/.exec(
      text,
    );
  if (!policy) throw new Error(`${file}: CenteredContentMeasurePolicy changed upstream`);
  const [max, total, step, offset] = match.slice(1).map(Number) as [number, number, number, number];
  const line = text.slice(0, match.index).split('\n').length;
  const policyLine = text.slice(0, policy.index).split('\n').length;
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  return Array.from({ length: max }, (_, i) => {
    const items = i + 1;
    const n = String(items);
    const padding = (total - step * (items + offset)) / 2;
    return [
      {
        name: `--m3e-comp-short-navigation-bar-centered-padding-${n}`,
        items,
        percent: padding,
        member: `calculateCenteredContentHorizontalPadding(${n})`,
        file,
        line,
        raw: `((${String(total)} - ${String(step)} * (${n} + ${String(offset)})) / 2f) / 100`,
      },
      {
        name: `--m3e-comp-short-navigation-bar-centered-item-min-width-${n}`,
        items,
        percent: round((100 - 2 * padding) / items),
        member: `CenteredContentMeasurePolicy itemMinWidth (${n})`,
        file,
        line: policyLine,
        raw: `(width - (barHorizontalPadding * 2)) / ${n}`,
      },
      {
        name: `--m3e-comp-short-navigation-bar-centered-item-max-width-${n}`,
        items,
        percent: round(100 / items),
        member: `CenteredContentMeasurePolicy itemMaxWidth (${n})`,
        file,
        line: policyLine,
        raw: `width / ${n}`,
      },
    ];
  }).flat();
}
