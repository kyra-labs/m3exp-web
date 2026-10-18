// Values Compose's Badge / BadgedBox render (Badge.kt) that are not BadgeTokens, or that pick one
// of them:
// - BadgeDefaults.containerColor (BadgeTokens.Color, for the small and the large badge alike:
//   Compose never reads BadgeTokens.LargeColor);
// - BadgeWithContentHorizontalPadding (4dp each side of the label, inside the 16dp minimum);
// - BadgedBox's offsets: a badge with content starts BadgeWithContentHorizontalOffset (12dp)
//   before the anchor's end and overlaps its top by BadgeWithContentVerticalOffset (14dp); a
//   badge without content (the 6dp dot) BadgeOffset (6dp) on both axes.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// badge.css assumes (min size, shape and padding picks, the content color, the placement
// formulas and the rulers that clamp them) changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type BadgeDefault = ComposeLiteral;

const KT = 'Badge.kt';
const COLOR_SCHEME = 'ColorScheme.kt';
const SAMPLES = 'BadgeSamples.kt';

export const BADGE_DEFAULTS_SOURCES = [KT, COLOR_SCHEME, SAMPLES];

const P = '--m3e-comp-badge';

const RULES: readonly LiteralRule[] = [
  {
    kind: 'token',
    name: `${P}-container-color`,
    owner: 'BadgeDefaults',
    member: 'containerColor',
    file: KT,
    pattern:
      /public val containerColor: Color\n\s*@Composable get\(\) = (BadgeTokens\.\w+)\.value/d,
    note: 'Badge(containerColor) default, the small and the large badge alike (BadgeTokens.LargeColor is not read); the label color is contentColorFor(containerColor) = on-error (ColorScheme.contentColorFor, BadgeTokens.LargeLabelTextColor)',
  },
  {
    kind: 'dp',
    name: `${P}-large-padding-horizontal`,
    owner: KT,
    member: 'BadgeWithContentHorizontalPadding',
    file: KT,
    pattern: /internal val BadgeWithContentHorizontalPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'Badge with content: Modifier.padding(horizontal) after defaultMinSize(LargeSize), so the 16dp minimum includes it',
  },
  {
    kind: 'dp',
    name: `${P}-large-offset-horizontal`,
    owner: KT,
    member: 'BadgeWithContentHorizontalOffset',
    file: KT,
    pattern: /internal val BadgeWithContentHorizontalOffset\n\s*get\(\) = (\d+)\.dp/d,
    note: 'BadgedBox: a badge wider than BadgeTokens.Size starts this far before the anchor end (x = anchor width − this, placeRelative)',
  },
  {
    kind: 'dp',
    name: `${P}-large-offset-vertical`,
    owner: KT,
    member: 'BadgeWithContentVerticalOffset',
    file: KT,
    pattern: /internal val BadgeWithContentVerticalOffset\n\s*get\(\) = (\d+)\.dp/d,
    note: 'BadgedBox: a badge wider than BadgeTokens.Size overlaps the anchor top by this (y = −badge height + this)',
  },
  {
    kind: 'dp',
    name: `${P}-offset`,
    owner: KT,
    member: 'BadgeOffset',
    file: KT,
    pattern: /internal val BadgeOffset\n\s*get\(\) = (\d+)\.dp/d,
    note: 'BadgedBox: the dot (no content) starts this far before the anchor end and overlaps its top by this, i.e. its corner sits inside the anchor top-end corner',
  },
];

/** Wiring badge.css assumes. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'Badge: LargeSize / LargeShape with content, Size / Shape without',
    /val size = if \(content != null\) BadgeTokens\.LargeSize else BadgeTokens\.Size\n\s*val shape =\n\s*if \(content != null\) \{\n\s*BadgeTokens\.LargeShape\.value\n\s*\} else \{\n\s*BadgeTokens\.Shape\.value\n\s*\}/,
  ],
  [
    KT,
    'Badge: defaultMinSize(size, size), background(containerColor, shape), horizontal padding only with content',
    /\.defaultMinSize\(minWidth = size, minHeight = size\)\n\s*\.background\(color = containerColor, shape = shape\)\n\s*\.then\(\n\s*if \(content != null\)\n\s*Modifier\.padding\(horizontal = BadgeWithContentHorizontalPadding\)\n\s*else Modifier\n\s*\)/,
  ],
  [
    KT,
    'Badge: the content is centered and set in LargeLabelTextFont, in contentColorFor(containerColor)',
    /contentColor: Color = contentColorFor\(containerColor\),[\s\S]*?verticalAlignment = Alignment\.CenterVertically,\n\s*horizontalArrangement = Arrangement\.Center,[\s\S]*?val style = BadgeTokens\.LargeLabelTextFont\.value/,
  ],
  [COLOR_SCHEME, 'contentColorFor: error → onError', /\n\s*error -> onError\n/],
  [
    KT,
    'BadgedBox: has content when the badge is wider than BadgeTokens.Size; offsets picked by it',
    /val hasContent = badgePlaceable\.width > \(BadgeTokens\.Size\.roundToPx\(\)\)\n\s*val badgeHorizontalOffset =\n\s*if \(hasContent\) BadgeWithContentHorizontalOffset else BadgeOffset\n\s*val badgeVerticalOffset =\n\s*if \(hasContent\) BadgeWithContentVerticalOffset else BadgeOffset/,
  ],
  [
    KT,
    'BadgedBox: the box is the anchor size, content centered; the badge is measured with a loose height',
    /contentAlignment = Alignment\.Center,[\s\S]*?constraints\.copy\(minHeight = 0\)[\s\S]*?val totalWidth = anchorPlaceable\.width\n\s*val totalHeight = anchorPlaceable\.height/,
  ],
  [
    KT,
    'BadgedBox: x = min(anchor width − horizontal offset, BadgeEndRuler − badge width), y = max(−badge height + vertical offset, BadgeTopRuler), placeRelative',
    /minOf\(\n\s*anchorPlaceable\.width - badgeHorizontalOffset\.roundToPx\(\),\n\s*BadgeEndRuler\.current\(Float\.POSITIVE_INFINITY\)\.toInt\(\) - badgePlaceable\.width,\n\s*\)[\s\S]*?maxOf\(\n\s*-badgePlaceable\.height \+ badgeVerticalOffset\.roundToPx\(\),\n\s*BadgeTopRuler\.current\(Float\.NEGATIVE_INFINITY\)\.toInt\(\),\n\s*\)\n\n\s*badgePlaceable\.placeRelative\(badgeX, badgeY\)/,
  ],
  [
    KT,
    'badgeBounds(): the rulers are the end (width) and the top (0) of the bounding layout',
    /BadgeEndRuler provides coordinates\.size\.width\.toFloat\(\)\n\s*BadgeTopRuler provides 0f/,
  ],
  [
    SAMPLES,
    'NavigationBarItemWithBadge: the dot is announced "New notification" (the m3e default label)',
    /Badge\(\n\s*modifier =\n\s*Modifier\.semantics \{ contentDescription = "New notification" \}\n\s*\)/,
  ],
];

/** `sources`: vendored Material3 files and samples by name (Badge.kt, ColorScheme.kt, BadgeSamples.kt). */
export function extractBadgeDefaults(sources: Readonly<Record<string, string>>): BadgeDefault[] {
  return extractLiterals('badge-defaults', BADGE_DEFAULTS_SOURCES, RULES, CHECKS, sources);
}
