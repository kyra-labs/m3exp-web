// Values Compose's AssistChip renders that are literals in Chip.kt rather than AssistChipTokens:
// the content padding and the icon/label spacing. Each is read with a targeted regex, scoped to the
// declaring object, and cited by the line of the value.
import type { ExtractedDefault } from './button-defaults.js';
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

interface Rule {
  name: string;
  owner: string;
  member: string;
  /** First capture group is the dp value. */
  pattern: RegExp;
  note?: string;
}

const FILE = 'Chip.kt';

const RULES: readonly Rule[] = [
  {
    name: '--m3e-comp-assist-chip-content-padding-horizontal',
    owner: 'AssistChipDefaults',
    member: 'ContentPadding (horizontal)',
    pattern:
      /public object AssistChipDefaults \{[\s\S]*?public val ContentPadding: PaddingValues = PaddingValues\(horizontal = (\d+)\.dp\)/d,
  },
  {
    name: '--m3e-comp-assist-chip-horizontal-spacing',
    owner: 'SuggestionChipDefaults',
    member: 'HorizontalSpacing',
    pattern:
      /public object SuggestionChipDefaults \{[\s\S]*?public val HorizontalSpacing: Dp = (\d+)\.dp/d,
    note: 'AssistChipDefaults.horizontalArrangement() = ChipArrangement(SuggestionChipDefaults.HorizontalSpacing)',
  },
];

/** The arrangement AssistChipDefaults.horizontalArrangement() returns; the spacing rule depends on it. */
const ARRANGEMENT = [
  /public object AssistChipDefaults \{[\s\S]*?public fun horizontalArrangement\(\): Arrangement\.Horizontal = DefaultHorizontalArrangement/,
  /private val DefaultHorizontalArrangement = ChipArrangement\(SuggestionChipDefaults\.HorizontalSpacing\)/,
];

export const CHIP_DEFAULTS_SOURCES = [FILE];

export function extractChipDefaults(sources: Readonly<Record<string, string>>): ExtractedDefault[] {
  const text = sources[FILE]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`${FILE} is not vendored`);
  if (!ARRANGEMENT.every((pattern) => pattern.test(text))) {
    throw new Error(
      `${FILE}: AssistChip arrangement changed upstream (DefaultHorizontalArrangement)`,
    );
  }
  return RULES.map((rule) => {
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined)
      throw new Error(
        `${FILE}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    const out: ExtractedDefault = {
      name: rule.name,
      dp: Number(match[1]),
      owner: rule.owner,
      member: rule.member,
      file: FILE,
      line: text.slice(0, at).split('\n').length,
    };
    if (rule.note !== undefined) out.note = rule.note;
    return out;
  });
}

// --- Filter, input and suggestion chips (M8) ---------------------------------------------------
// Values Compose's FilterChip / ElevatedFilterChip / InputChip / SuggestionChip /
// ElevatedSuggestionChip render that are literals in Chip.kt, or that pick a token other than the
// one their name suggests (compose-literals.ts):
// - the spacing model: the baseline DefaultHorizontalArrangement, FilterChipDefaults /
//   InputChipDefaults HorizontalSpacing and CompactHorizontalSpacing (the expressive `shapes`
//   overloads' horizontalArrangement(...)), the content paddings (InputChipDefaults.contentPadding
//   depends on the avatar / leading / trailing icons);
// - filterChipElevation: the flat chip's hover, focus and press elevations are the *Selected*
//   tokens whether or not the chip is selected (SelectableChipElevation ignores `selected`; owner
//   decision M8 #11: hover Level1 even when unselected);
// - the tonal colors of the expressive overloads (unselected leading icon from ChipsTokens);
// - the selectable chips' motion: the expressive shape morph (FastSpatial, upstream "TODO: Replace
//   with correct animation tokens") and the leading / trailing icon expand / shrink and fade specs
//   of AnimatingChipContent (baseline and expressive);
// - ElevatedSuggestionChip's disabled container and icon, which read AssistChipTokens opacities;
// - the chip group spacing of ChipGroupReflowSample (each chip padded 4dp on both sides).
// CHIPS_CHECKS throw when the wiring filter-chip.css / input-chip.css / suggestion-chip.css
// assume changes upstream (roles, color selection, borders, shapes, arrangement, elevation).

const SAMPLES = 'ChipSamples.kt';

export const CHIPS_DEFAULTS_SOURCES = [FILE, SAMPLES];

export type ChipsDefault = ComposeLiteral;

const F = '--m3e-comp-filter-chip';
const IN = '--m3e-comp-input-chip';
const SG = '--m3e-comp-suggestion-chip';
const SEL = '--m3e-comp-selectable-chip';

/** `public object <owner> {` … `public val <member>: Dp = <n>.dp`. */
const dpIn = (owner: string, member: string): RegExp =>
  new RegExp(`public object ${owner} \\{[\\s\\S]*?public val ${member}: Dp = (\\d+)\\.dp`, 'd');

/** filterChipElevation(<param>: Dp = FilterChipTokens.X). */
const flatElevation = (param: string): RegExp =>
  new RegExp(
    `public fun filterChipElevation\\([\\s\\S]*?\\b${param}: Dp = (FilterChipTokens\\.\\w+),`,
    'd',
  );

/** The four AnimatingChipContent specs of the SelectableChip overload after `anchor`. */
const iconMotion = (prefix: string, anchor: string, note: string): LiteralRule[] =>
  (
    [
      ['fade-in', 'fadeInSpec', 'Float'],
      ['fade-out', 'fadeOutSpec', 'Float'],
      ['expand', 'expandSpec', 'IntSize'],
      ['shrink', 'shrinkSpec', 'IntSize'],
    ] as const
  ).map(([name, param, type]) => ({
    kind: 'motion',
    name: `${prefix}-${name}`,
    owner: 'SelectableChip',
    member: `AnimatingChipContent(${param})`,
    file: FILE,
    pattern: new RegExp(
      `${anchor}[\\s\\S]*?${param} = MotionSchemeKeyTokens\\.(\\w+)\\.value<${type}>\\(\\),`,
      'd',
    ),
    note,
  }));

const CHIPS_RULES: readonly LiteralRule[] = [
  // Spacing and padding.
  {
    kind: 'dp',
    name: '--m3e-comp-chip-default-horizontal-spacing',
    owner: 'SuggestionChipDefaults',
    member: 'HorizontalSpacing',
    file: FILE,
    pattern: dpIn('SuggestionChipDefaults', 'HorizontalSpacing'),
    note: 'DefaultHorizontalArrangement = ChipArrangement(SuggestionChipDefaults.HorizontalSpacing): the baseline FilterChip / InputChip / SuggestionChip arrangement (the label spaced from both slots)',
  },
  {
    kind: 'dp',
    name: `${F}-content-padding-horizontal`,
    owner: 'FilterChipDefaults',
    member: 'ContentPadding (horizontal)',
    file: FILE,
    pattern:
      /public object FilterChipDefaults \{[\s\S]*?public val ContentPadding: PaddingValues = PaddingValues\(horizontal = (\d+)\.dp\)/d,
  },
  {
    kind: 'dp',
    name: `${F}-horizontal-spacing`,
    owner: 'FilterChipDefaults',
    member: 'HorizontalSpacing',
    file: FILE,
    pattern: dpIn('FilterChipDefaults', 'HorizontalSpacing'),
    note: 'the non-compact side of horizontalArrangement(hasLeadingIcon, hasTrailingIcon) (the expressive overload)',
  },
  {
    kind: 'dp',
    name: `${F}-compact-horizontal-spacing`,
    owner: 'FilterChipDefaults',
    member: 'CompactHorizontalSpacing',
    file: FILE,
    pattern: dpIn('FilterChipDefaults', 'CompactHorizontalSpacing'),
    note: 'next to an icon in the expressive overload (horizontalArrangement(hasLeadingIcon, hasTrailingIcon))',
  },
  {
    kind: 'dp',
    name: `${IN}-horizontal-spacing`,
    owner: 'InputChipDefaults',
    member: 'HorizontalSpacing',
    file: FILE,
    pattern: dpIn('InputChipDefaults', 'HorizontalSpacing'),
    note: 'the non-compact side of horizontalArrangement(hasAvatar, hasLeadingIcon, hasTrailingIcon) (the expressive overload)',
  },
  {
    kind: 'dp',
    name: `${IN}-compact-horizontal-spacing`,
    owner: 'InputChipDefaults',
    member: 'CompactHorizontalSpacing',
    file: FILE,
    pattern: dpIn('InputChipDefaults', 'CompactHorizontalSpacing'),
    note: 'next to the avatar or an icon in the expressive overload',
  },
  {
    kind: 'dp',
    name: `${IN}-content-padding-start`,
    owner: 'InputChipDefaults',
    member: 'contentPadding(start: avatar or no leading icon)',
    file: FILE,
    pattern: /val start = if \(hasAvatar \|\| !hasLeadingIcon\) (\d+)\.dp else \d+\.dp/d,
  },
  {
    kind: 'dp',
    name: `${IN}-content-padding-start-icon`,
    owner: 'InputChipDefaults',
    member: 'contentPadding(start: leading icon)',
    file: FILE,
    pattern: /val start = if \(hasAvatar \|\| !hasLeadingIcon\) \d+\.dp else (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${IN}-content-padding-end`,
    owner: 'InputChipDefaults',
    member: 'contentPadding(end: no trailing icon)',
    file: FILE,
    pattern: /val end = if \(hasTrailingIcon\) \d+\.dp else (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${IN}-content-padding-end-icon`,
    owner: 'InputChipDefaults',
    member: 'contentPadding(end: trailing icon)',
    file: FILE,
    pattern: /val end = if \(hasTrailingIcon\) (\d+)\.dp else \d+\.dp/d,
  },
  {
    kind: 'dp',
    name: `${SG}-content-padding-horizontal`,
    owner: 'SuggestionChipDefaults',
    member: 'ContentPadding (horizontal)',
    file: FILE,
    pattern:
      /public object SuggestionChipDefaults \{[\s\S]*?public val ContentPadding: PaddingValues = PaddingValues\(horizontal = (\d+)\.dp\)/d,
  },
  // filterChipElevation (owner decision M8 #11).
  {
    kind: 'shadow',
    name: `${F}-flat-shadow`,
    owner: 'FilterChipDefaults',
    member: 'filterChipElevation(elevation)',
    file: FILE,
    pattern: /public fun filterChipElevation\(\n\s*elevation: Dp = (FilterChipTokens\.\w+),/d,
  },
  ...(
    [
      ['hover', 'hoveredElevation'],
      ['focus', 'focusedElevation'],
      ['pressed', 'pressedElevation'],
      ['dragged', 'draggedElevation'],
    ] as const
  ).map(([state, param]): LiteralRule => ({
    kind: 'shadow',
    name: `${F}-flat-shadow-${state}`,
    owner: 'FilterChipDefaults',
    member: `filterChipElevation(${param})`,
    file: FILE,
    pattern: flatElevation(param),
    ...(state === 'dragged'
      ? {}
      : {
          note: 'selected or not: SelectableChipElevation picks by the last interaction only (owner decision M8 #11)',
        }),
  })),
  {
    kind: 'alias',
    name: `${F}-flat-shadow-disabled`,
    owner: 'FilterChipDefaults',
    member: 'filterChipElevation(disabledElevation)',
    file: FILE,
    pattern: /public fun filterChipElevation\([\s\S]*?\b(disabledElevation): Dp = elevation,/d,
    alias: `${F}-flat-shadow`,
  },
  // Tonal colors (the expressive `shapes` overloads' defaults).
  {
    kind: 'token',
    name: `${F}-leading-icon-color-tonal`,
    owner: 'FilterChipDefaults',
    member: 'defaultTonalFilterChipColors(leadingIconColor)',
    file: FILE,
    pattern:
      /val ColorScheme\.defaultTonalFilterChipColors[\s\S]*?\.copy\(leadingIconColor = fromToken\((ChipsTokens\.\w+)\)\)/d,
    note: 'the unselected leading icon of the expressive overload (FilterChip(shapes) colors = tonalFilterChipColors()); elevated: defaultTonalElevatedFilterChipColors, the same token',
  },
  {
    kind: 'token',
    name: `${IN}-leading-icon-color-tonal`,
    owner: 'InputChipDefaults',
    member: 'defaultTonalInputChipColors(leadingIconColor)',
    file: FILE,
    pattern:
      /val ColorScheme\.defaultTonalInputChipColors[\s\S]*?\.copy\(leadingIconColor = fromToken\((ChipsTokens\.\w+)\)\)/d,
    note: 'the unselected leading icon of the expressive overload (InputChip(shapes) colors = tonalInputChipColors())',
  },
  // ElevatedSuggestionChip's disabled colors read AssistChipTokens.
  {
    kind: 'alpha',
    name: `${SG}-elevated-disabled-container-color`,
    owner: 'SuggestionChipDefaults',
    member: 'defaultElevatedSuggestionChipColors(disabledContainerColor)',
    file: FILE,
    pattern:
      /val ColorScheme\.defaultElevatedSuggestionChipColors[\s\S]*?disabledContainerColor =\n\s*fromToken\((SuggestionChipTokens\.\w+)\)\n\s*\.copy\(alpha = (AssistChipTokens\.\w+)\),/d,
    note: "the opacity is AssistChipTokens' (the same value as SuggestionChipTokens')",
  },
  {
    kind: 'alpha',
    name: `${SG}-elevated-disabled-icon-color`,
    owner: 'SuggestionChipDefaults',
    member: 'defaultElevatedSuggestionChipColors(disabledLeadingIconContentColor)',
    file: FILE,
    pattern:
      /val ColorScheme\.defaultElevatedSuggestionChipColors[\s\S]*?disabledLeadingIconContentColor =\n\s*fromToken\((AssistChipTokens\.\w+)\)\n\s*\.copy\(alpha = (AssistChipTokens\.\w+)\),/d,
    note: "AssistChipTokens' disabled icon color and opacity (the same values as SuggestionChipTokens')",
  },
  // Motion.
  {
    kind: 'motion',
    name: `${SEL}-shape`,
    owner: 'SelectableChip',
    member: 'shapeByInteraction(animationSpec)',
    file: FILE,
    pattern:
      /val defaultAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)\n\s*val chipShape = shapeByInteraction/d,
    note: 'the expressive `shapes` overloads: the rest / selected / pressed corner morph (upstream "TODO: Replace with correct animation tokens"); it overshoots under the expressive scheme',
  },
  ...iconMotion(
    `${SEL}-icon`,
    'shape: Shape,\\n\\s*colors: SelectableChipColors,',
    'baseline overloads: a leading / trailing icon (e.g. the filter check) appearing or disappearing (expandHorizontally / shrinkHorizontally + fade)',
  ),
  ...iconMotion(
    `${SEL}-expressive-icon`,
    'shapes: ChipShapes,\\n\\s*enabled: Boolean,',
    'expressive `shapes` overloads (upstream "TODO: Replace with correct animation tokens")',
  ),
  // Chip groups.
  {
    kind: 'dp',
    name: '--m3e-comp-chip-set-chip-padding-horizontal',
    owner: 'ChipGroupReflowSample',
    member: 'Modifier.padding(horizontal)',
    file: SAMPLES,
    pattern:
      /fun ChipGroupReflowSample\(\)[\s\S]*?FilterChip\([\s\S]*?Modifier\.padding\(horizontal = (\d+)\.dp\)/d,
    note: 'every chip of the FlowRow (and of ChipGroupSingleLineSample) is padded 4dp on both sides: 8dp between chips',
  },
];

/** Wiring the chip CSS assumes. */
const CHIPS_CHECKS: readonly LiteralCheck[] = [
  [
    FILE,
    'Chip (assist / suggestion): Role.Button',
    /modifier = modifier\.semantics \{ role = Role\.Button \},/,
  ],
  [
    FILE,
    'SelectableChip (filter / input), both overloads: Role.Checkbox with selected',
    /Surface\(\n\s*selected = selected,\n\s*onClick = onClick,\n\s*modifier = modifier\.semantics \{ role = Role\.Checkbox \},[\s\S]*?Surface\(\n\s*selected = selected,\n\s*onClick = onClick,\n\s*modifier = modifier\.semantics \{ role = Role\.Checkbox \},/,
  ],
  [
    FILE,
    'Chip / SelectableChip: no Surface contentColor, so the ripple (state layer) is contentColorFor(container) (owner decision M8 #4)',
    /color = colors\.containerColor\(enabled\),\n\s*shadowElevation = [\s\S]*?color = colors\.containerColor\(enabled, selected\),\n\s*shadowElevation = /,
  ],
  [
    FILE,
    'SelectableChip colors by (enabled, selected), not animated',
    /color = colors\.containerColor\(enabled, selected\),[\s\S]*?labelColor = colors\.labelColor\(enabled, selected\),[\s\S]*?leadingIconColor = colors\.leadingIconContentColor\(enabled, selected\),\n\s*trailingIconColor = colors\.trailingIconContentColor\(enabled, selected\),/,
  ],
  [
    FILE,
    'SelectableChipColors: disabled → the disabled (selected) colors; else selected / unselected',
    /!enabled -> if \(selected\) disabledSelectedContainerColor else disabledContainerColor\n\s*!selected -> containerColor\n\s*else -> selectedContainerColor/,
  ],
  [
    FILE,
    'defaultFilterChipColors: transparent containers, the Unselected* / Selected* / Disabled* tokens, FlatSelected / FlatDisabledSelected containers',
    /defaultFilterChipColors: SelectableChipColors[\s\S]*?containerColor = Color\.Transparent,\n\s*labelColor = fromToken\(FilterChipTokens\.UnselectedLabelTextColor\),\n\s*leadingIconColor = fromToken\(FilterChipTokens\.UnselectedLeadingIconColor\),\n\s*trailingIconColor = fromToken\(FilterChipTokens\.UnselectedTrailingIconColor\),\n\s*disabledContainerColor = Color\.Transparent,[\s\S]*?selectedContainerColor =\n\s*fromToken\(FilterChipTokens\.FlatSelectedContainerColor\),\n\s*disabledSelectedContainerColor =\n\s*fromToken\(FilterChipTokens\.FlatDisabledSelectedContainerColor\)/,
  ],
  [
    FILE,
    'defaultElevatedFilterChipColors: ElevatedUnselected / ElevatedSelected containers, ElevatedDisabled for both disabled containers',
    /defaultElevatedFilterChipColors: SelectableChipColors[\s\S]*?containerColor =\n\s*fromToken\(FilterChipTokens\.ElevatedUnselectedContainerColor\),[\s\S]*?disabledContainerColor =\n\s*fromToken\(FilterChipTokens\.ElevatedDisabledContainerColor\)[\s\S]*?selectedContainerColor =\n\s*fromToken\(FilterChipTokens\.ElevatedSelectedContainerColor\),\n\s*disabledSelectedContainerColor =\n\s*fromToken\(FilterChipTokens\.ElevatedDisabledContainerColor\)/,
  ],
  [
    FILE,
    'defaultInputChipColors: transparent containers, the Unselected* / Selected* / Disabled* tokens',
    /defaultInputChipColors: SelectableChipColors[\s\S]*?containerColor = Color\.Transparent,\n\s*labelColor = fromToken\(InputChipTokens\.UnselectedLabelTextColor\),\n\s*leadingIconColor = fromToken\(InputChipTokens\.UnselectedLeadingIconColor\),\n\s*trailingIconColor = fromToken\(InputChipTokens\.UnselectedTrailingIconColor\),\n\s*disabledContainerColor = Color\.Transparent,[\s\S]*?selectedContainerColor = fromToken\(InputChipTokens\.SelectedContainerColor\),/,
  ],
  [
    FILE,
    'defaultSuggestionChipColors: a transparent container, LabelTextColor, LeadingIconColor',
    /defaultSuggestionChipColors: ChipColors[\s\S]*?containerColor = Color\.Transparent,\n\s*labelColor = fromToken\(SuggestionChipTokens\.LabelTextColor\),\n\s*leadingIconContentColor = fromToken\(SuggestionChipTokens\.LeadingIconColor\),/,
  ],
  [
    FILE,
    'filterChipBorder / inputChipBorder: transparent and the Selected width when selected',
    /public fun filterChipBorder\([\s\S]*?selectedBorderColor: Color = Color\.Transparent,[\s\S]*?selectedBorderWidth: Dp = FilterChipTokens\.FlatSelectedOutlineWidth,[\s\S]*?public fun inputChipBorder\([\s\S]*?selectedBorderColor: Color = Color\.Transparent,[\s\S]*?selectedBorderWidth: Dp = InputChipTokens\.SelectedOutlineWidth,/,
  ],
  [
    FILE,
    'ElevatedFilterChip / ElevatedSuggestionChip: no border',
    /public fun ElevatedFilterChip\([\s\S]*?border: BorderStroke\? = null,[\s\S]*?public fun ElevatedSuggestionChip\([\s\S]*?border: BorderStroke\? = null,/,
  ],
  [
    FILE,
    'SelectableChipElevation: by the last interaction, not by selection',
    /if \(!enabled\) \{\n\s*disabledElevation\n\s*\} else \{\n\s*when \(interaction\) \{\n\s*is PressInteraction\.Press -> pressedElevation\n\s*is HoverInteraction\.Enter -> hoveredElevation\n\s*is FocusInteraction\.Focus -> focusedElevation\n\s*is DragInteraction\.Start -> draggedElevation\n\s*else -> elevation/,
  ],
  [
    FILE,
    'elevatedFilterChipElevation: the Elevated* tokens',
    /public fun elevatedFilterChipElevation\(\n\s*elevation: Dp = FilterChipTokens\.ElevatedContainerElevation,\n\s*pressedElevation: Dp = FilterChipTokens\.ElevatedPressedContainerElevation,\n\s*focusedElevation: Dp = FilterChipTokens\.ElevatedFocusContainerElevation,\n\s*hoveredElevation: Dp = FilterChipTokens\.ElevatedHoverContainerElevation,\n\s*draggedElevation: Dp = FilterChipTokens\.DraggedContainerElevation,\n\s*disabledElevation: Dp = FilterChipTokens\.ElevatedDisabledContainerElevation,/,
  ],
  [
    FILE,
    'inputChipElevation / suggestionChipElevation: one elevation but dragged',
    /public fun inputChipElevation\(\n\s*elevation: Dp = InputChipTokens\.ContainerElevation,\n\s*pressedElevation: Dp = elevation,\n\s*focusedElevation: Dp = elevation,\n\s*hoveredElevation: Dp = elevation,\n\s*draggedElevation: Dp = InputChipTokens\.DraggedContainerElevation,\n\s*disabledElevation: Dp = elevation,[\s\S]*?public fun suggestionChipElevation\(\n\s*elevation: Dp = SuggestionChipTokens\.FlatContainerElevation,\n\s*pressedElevation: Dp = elevation,\n\s*focusedElevation: Dp = elevation,\n\s*hoveredElevation: Dp = elevation,\n\s*draggedElevation: Dp = SuggestionChipTokens\.DraggedContainerElevation,\n\s*disabledElevation: Dp = elevation,/,
  ],
  [
    FILE,
    'baseline FilterChip / InputChip: the default arrangement; expressive: the compact one',
    /public fun FilterChip\([\s\S]*?shape: Shape = FilterChipDefaults\.shape,[\s\S]*?horizontalArrangement: Arrangement\.Horizontal = FilterChipDefaults\.horizontalArrangement\(\),[\s\S]*?public fun FilterChip\([\s\S]*?shapes: ChipShapes,[\s\S]*?FilterChipDefaults\.horizontalArrangement\(leadingIcon != null, trailingIcon != null\),[\s\S]*?public fun InputChip\([\s\S]*?horizontalArrangement: Arrangement\.Horizontal = InputChipDefaults\.horizontalArrangement\(\),[\s\S]*?public fun InputChip\([\s\S]*?shapes: ChipShapes,[\s\S]*?InputChipDefaults\.horizontalArrangement\(\n\s*avatar != null,\n\s*leadingIcon != null,\n\s*trailingIcon != null,/,
  ],
  [
    FILE,
    'FilterChipDefaults / InputChipDefaults.horizontalArrangement(): DefaultHorizontalArrangement = ChipArrangement(SuggestionChipDefaults.HorizontalSpacing)',
    /public object FilterChipDefaults \{[\s\S]*?public fun horizontalArrangement\(\): Arrangement\.Horizontal = DefaultHorizontalArrangement[\s\S]*?public object InputChipDefaults \{[\s\S]*?public fun horizontalArrangement\(\): Arrangement\.Horizontal = DefaultHorizontalArrangement[\s\S]*?private val DefaultHorizontalArrangement = ChipArrangement\(SuggestionChipDefaults\.HorizontalSpacing\)/,
  ],
  [
    FILE,
    'the compact filter arrangement: (compact) both, (compact, spacing) leading, (spacing, compact) trailing',
    /return if \(hasLeadingIcon && hasTrailingIcon\) ChipArrangement\(CompactHorizontalSpacing\)\n\s*else if \(hasLeadingIcon\) ChipArrangement\(CompactHorizontalSpacing, HorizontalSpacing\)\n\s*else if \(hasTrailingIcon\) ChipArrangement\(HorizontalSpacing, CompactHorizontalSpacing\)\n\s*else DefaultHorizontalArrangement/,
  ],
  [
    FILE,
    'the compact input arrangement: the avatar counts as a leading icon',
    /return if \(\(hasAvatar \|\| hasLeadingIcon\) && hasTrailingIcon\)\n\s*ChipArrangement\(CompactHorizontalSpacing\)\n\s*else if \(hasAvatar \|\| hasLeadingIcon\)\n\s*ChipArrangement\(CompactHorizontalSpacing, HorizontalSpacing\)\n\s*else if \(hasTrailingIcon\) ChipArrangement\(HorizontalSpacing, CompactHorizontalSpacing\)\n\s*else DefaultHorizontalArrangement/,
  ],
  [
    FILE,
    'ChipArrangement: the label after a non-empty leading slot by the leading spacing, else by the trailing spacing; the total adds both spacings',
    /override val spacing = \(leadingSpacing \+ trailingSpacing\) \/ 2[\s\S]*?val actualSpacing = if \(sizes\[0\] > 0\) spacing1Px else spacing2Px\n\s*sizes\[0\] \+ actualSpacing\n\s*\}\n\s*2 -> totalSize - size/,
  ],
  [
    FILE,
    'InputChip: both overloads pass contentPadding(avatar, leading, trailing)',
    /contentPadding: PaddingValues =\n\s*InputChipDefaults\.contentPadding\(avatar != null, leadingIcon != null, trailingIcon != null\),[\s\S]*?contentPadding: PaddingValues =\n\s*InputChipDefaults\.contentPadding\(avatar != null, leadingIcon != null, trailingIcon != null\),/,
  ],
  [
    FILE,
    'InputChip avatar: clipped to AvatarShape, DisabledAvatarOpacity when disabled; it takes precedence over the leading icon',
    /val avatarOpacity = if \(enabled\) 1f else InputChipTokens\.DisabledAvatarOpacity\n\s*val avatarShape = InputChipTokens\.AvatarShape\.value[\s\S]*?avatar != null -> avatar \/\/ An avatar takes precedence/,
  ],
  [
    FILE,
    'ChipShapes (expressive): ChipsTokens Unselected / Selected / Pressed shapes; pressed > selected > rest',
    /ChipShapes\(\n\s*shape = fromToken\(ChipsTokens\.UnselectedShape\),\n\s*selectedShape = fromToken\(ChipsTokens\.SelectedShape\),\n\s*pressedShape = fromToken\(ChipsTokens\.PressedShape\),[\s\S]*?if \(pressed\) \{\n\s*shapes\.pressedShape\n\s*\} else if \(selected\) \{\n\s*shapes\.selectedShape\n\s*\} else \{\n\s*shapes\.shape/,
  ],
  [
    FILE,
    'AnimatingChipContent: the leading slot expands from / shrinks towards the start, with a fade',
    /expandHorizontally\(\n\s*animationSpec = expandSpec,\n\s*expandFrom = Alignment\.Start,\n\s*\) \+ fadeIn\(animationSpec = fadeInSpec\),\n\s*exit =\n\s*shrinkHorizontally\(\n\s*animationSpec = shrinkSpec,\n\s*shrinkTowards = Alignment\.Start,\n\s*\) \+ fadeOut\(animationSpec = fadeOutSpec\),/,
  ],
  [
    SAMPLES,
    'FilterChipSample: a Done icon of FilterChipDefaults.IconSize as the leading icon, only while selected',
    /fun FilterChipSample\(\)[\s\S]*?leadingIcon =\n\s*if \(selected\) \{\n\s*\{\n\s*Icon\(\n\s*imageVector = Icons\.Filled\.Done,[\s\S]*?modifier = Modifier\.size\(FilterChipDefaults\.IconSize\),[\s\S]*?\} else \{\n\s*null/,
  ],
];

/** `sources`: vendored Material3 files and samples by name (Chip.kt, ChipSamples.kt). */
export function extractChipsDefaults(sources: Readonly<Record<string, string>>): ChipsDefault[] {
  return extractLiterals(
    'chips-defaults',
    CHIPS_DEFAULTS_SOURCES,
    CHIPS_RULES,
    CHIPS_CHECKS,
    sources,
  );
}
