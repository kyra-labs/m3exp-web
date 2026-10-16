// Layout literals Compose's navigation bars and rails render that are not in the Navigation*Tokens
// files: private/internal `Dp` constants in NavigationBar.kt, NavigationRail.kt,
// ShortNavigationBar.kt and WideNavigationRail.kt, plus the ShortNavigationBar "Centered"
// arrangement padding (calculateCenteredContentHorizontalPadding), evaluated per item count, and
// (M7) the springs, modal colors / shape and parameter defaults of the animated and modal wide
// navigation rail (WideNavigationRail.kt, NavigationItem.kt, WideNavigationRailState.kt).
import {
  type ExtractedDefault,
  type LiteralRule,
  extractLiteralDefaults,
} from './button-defaults.js';
import { kebabName } from './names.js';

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

/** A value of the animated / modal wide navigation rail (M7) without a token of its own. */
export interface WideRailDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** Source expression as written upstream (resolved). */
  raw: string;
  owner: string;
  member: string;
  /** Vendored file name. */
  file: string;
  line: number;
  note?: string;
}

const WNR = 'WideNavigationRail.kt';
const ITEM = 'NavigationItem.kt';
const STATE = 'WideNavigationRailState.kt';
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;

interface WideRailRule {
  kind: 'motion' | 'dp' | 'ref';
  name: string;
  owner: string;
  member: string;
  file: string;
  /** First capture group: a MotionSchemeKeyTokens key, a dp literal or a token reference. */
  pattern: RegExp;
  note?: string;
}

/**
 * `<Object>Tokens.<Member>` resolved in its vendored token file: a color role, a shape key or a
 * number (component variables only reference system tokens).
 */
function resolveToken(ref: string, tokens: Readonly<Record<string, string>>): [string, string] {
  const [object, member] = ref.split('.') as [string, string];
  const text = tokens[`${object}.kt`]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`${object}.kt is not vendored`);
  const key = new RegExp(
    String.raw`val ${member}: \w+\n\s*get\(\) = (ColorSchemeKeyTokens|ShapeKeyTokens)\.(\w+)`,
  ).exec(text);
  if (key?.[1] === 'ColorSchemeKeyTokens')
    return [`var(--m3e-sys-color-${kebabName(key[2]!)})`, `${ref} = ${key[1]}.${key[2]!}`];
  if (key?.[1] === 'ShapeKeyTokens')
    return [`var(--m3e-sys-shape-${kebabName(key[2]!)})`, `${ref} = ${key[1]}.${key[2]!}`];
  const number = new RegExp(String.raw`const val ${member} = ([\d.]+)f`).exec(text);
  if (number) return [String(Number(number[1])), `${ref} = ${number[1]!}f`];
  throw new Error(`${object}.kt: ${member} not found`);
}

const TODO = String.raw`\s*\/\/ TODO[^\n]*\n\s*`;

const WIDE_RAIL_RULES: readonly WideRailRule[] = [
  {
    kind: 'motion',
    name: '--m3e-comp-wide-navigation-rail-width',
    owner: 'WideNavigationRailLayout',
    member: 'animationSpec',
    file: WNR,
    pattern: /val animationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Dp>\(\)/d,
    note: 'minWidth / widthFullRange of a non-modal rail, and itemVerticalSpacedBy / itemMinHeight of every rail',
  },
  {
    kind: 'motion',
    name: '--m3e-comp-wide-navigation-rail-modal-width',
    owner: 'WideNavigationRailLayout',
    member: 'modalAnimationSpec',
    file: WNR,
    pattern: /val modalAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Dp>\(\)/d,
    note: 'minWidth / widthFullRange of the modal window rail (isModal)',
  },
  {
    kind: 'motion',
    name: '--m3e-comp-wide-navigation-rail-icon-position',
    owner: 'AnimatedNavigationItem',
    member: 'iconPositionProgress',
    file: ITEM,
    pattern: new RegExp(
      String.raw`val iconPositionProgress by\s*animateFloatAsState\(\s*targetValue = if \(isIconPositionTop\) 0f else 1f,` +
        TODO +
        String.raw`animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\)`,
      'd',
    ),
    note: 'WideNavigationRailItem: icon top ↔ start (pill, icon and label geometry, label alpha)',
  },
  {
    kind: 'motion',
    name: '--m3e-comp-wide-navigation-rail-label-color',
    owner: 'StyledLabel',
    member: 'colorAnimationSpec',
    file: ITEM,
    pattern: /val colorAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Color>\(\)/d,
    note: 'animateColor = true in AnimatedNavigationItem (WideNavigationRailItem)',
  },
  {
    kind: 'motion',
    name: '--m3e-comp-wide-navigation-rail-state',
    owner: 'rememberWideNavigationRailState',
    member: 'animationSpec',
    file: STATE,
    pattern: /val animationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'WideNavigationRailState: currentValue settles on this spring (isAnimating)',
  },
  {
    kind: 'motion',
    name: '--m3e-comp-modal-wide-navigation-rail-position',
    owner: 'ModalWideNavigationRail',
    member: 'positionProgress',
    file: WNR,
    pattern: new RegExp(
      String.raw`public fun ModalWideNavigationRail\([\s\S]*?val positionProgress =\s*animateFloatAsState\(\s*targetValue = [^\n]*\n` +
        TODO +
        String.raw`animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\)`,
      'd',
    ),
    note: 'the modal window shows while > 0 and the rail expands from 0.3 (modalExpanded)',
  },
  {
    kind: 'motion',
    name: '--m3e-comp-modal-wide-navigation-rail-scrim',
    owner: 'ModalWideNavigationRailImpl',
    member: 'Scrim alpha',
    file: WNR,
    pattern: new RegExp(
      String.raw`targetValue = if \(isScrimVisible\) 1f else 0f,` +
        TODO +
        String.raw`animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\)`,
      'd',
    ),
  },
  {
    kind: 'motion',
    name: '--m3e-comp-modal-wide-navigation-rail-slide',
    owner: 'ModalWideNavigationRailImpl',
    member: 'modalStateAnimationSpec',
    file: WNR,
    pattern: /val modalStateAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'hideOnCollapse: ModalWideNavigationRailState slides the rail in from minus its width',
  },
  {
    kind: 'ref',
    name: '--m3e-comp-modal-wide-navigation-rail-container-color',
    owner: 'WideNavigationRailDefaults',
    member: 'colors(modalContainerColor)',
    file: WNR,
    pattern:
      /modalContainerColor: Color = (NavigationRailExpandedTokens\.ModalContainerColor)\.value,/d,
  },
  {
    kind: 'ref',
    name: '--m3e-comp-modal-wide-navigation-rail-container-shape',
    owner: 'WideNavigationRailDefaults',
    member: 'modalExpandedShape',
    file: WNR,
    pattern:
      /public val modalExpandedShape: Shape\s*@Composable get\(\) = (NavigationRailExpandedTokens\.ModalContainerShape)\.value/d,
    note: 'the modal window rail; its Surface sets no elevation, so ModalContainerElevation is not read',
  },
  {
    kind: 'ref',
    name: '--m3e-comp-modal-wide-navigation-rail-scrim-color',
    owner: 'WideNavigationRailDefaults',
    member: 'colors(modalScrimColor)',
    file: WNR,
    pattern:
      /modalScrimColor: Color =\s*(ScrimTokens\.ContainerColor)\.value\.copy\(ScrimTokens\.ContainerOpacity\)/d,
  },
  {
    kind: 'ref',
    name: '--m3e-comp-modal-wide-navigation-rail-scrim-opacity',
    owner: 'WideNavigationRailDefaults',
    member: 'colors(modalScrimColor)',
    file: WNR,
    pattern:
      /modalScrimColor: Color =\s*ScrimTokens\.ContainerColor\.value\.copy\((ScrimTokens\.ContainerOpacity)\)/d,
  },
  {
    kind: 'dp',
    name: '--m3e-comp-modal-wide-navigation-rail-expanded-header-top-padding',
    owner: 'ModalWideNavigationRail',
    member: 'expandedHeaderTopPadding',
    file: WNR,
    pattern:
      /public fun ModalWideNavigationRail\([\s\S]*?expandedHeaderTopPadding: Dp = (\d+)\.dp,/d,
    note: 'parameter default; override to align the expanded header (ModalWideNavigationRailSample: 64dp)',
  },
];

/** Every file the wide rail rules read. */
export const WIDE_RAIL_DEFAULTS_SOURCES = [WNR, ITEM, STATE];

/**
 * What the animated and modal wide navigation rail render (M7) without tokens: the
 * MotionSchemeKeyTokens springs in WideNavigationRail.kt, NavigationItem.kt and
 * WideNavigationRailState.kt (each under an upstream "TODO: Load the motionScheme tokens from the
 * component tokens file"), WideNavigationRailDefaults' modal colors and shape, and the
 * `expandedHeaderTopPadding` default.
 */
export function extractWideRailDefaults(
  sources: Readonly<Record<string, string>>,
  tokens: Readonly<Record<string, string>>,
): WideRailDefault[] {
  return WIDE_RAIL_RULES.flatMap((rule): WideRailDefault[] => {
    const text = sources[rule.file]?.replace(/\r\n/g, '\n');
    if (text === undefined) throw new Error(`${rule.file} is not vendored`);
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined)
      throw new Error(`${rule.file}: ${rule.owner}.${rule.member} not found (changed upstream?)`);
    const captured = match[1]!;
    const base = {
      name: rule.name,
      owner: rule.owner,
      member: rule.member,
      file: rule.file,
      line: text.slice(0, at).split('\n').length,
      ...(rule.note === undefined ? {} : { note: rule.note }),
    };
    switch (rule.kind) {
      case 'motion':
        return SPRING_FIELDS.map((field) => ({
          ...base,
          name: `${rule.name}-${field}`,
          value: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
          raw: `MotionSchemeKeyTokens.${captured}`,
        }));
      case 'dp':
        return [{ ...base, value: `${captured}px`, raw: `${captured}.dp` }];
      case 'ref': {
        const [value, raw] = resolveToken(captured, tokens);
        return [{ ...base, value, raw }];
      }
    }
  });
}
