// Values Compose's list items render (ListItem.kt, ListItemDefaults.kt) that are not ListTokens,
// or that pick one of them:
// - the expressive ListItem / SegmentedListItem (InteractiveListItem): ListItemDefaults
//   .ContentPadding (touch sizing; the precision-pointer branch is an opt-in flag), the spacing
//   after the leading and before the trailing content, the one / two / three-line minimum heights
//   (`isExpressiveListItemHeightBasedOnTextLinesFixEnabled` is true at the pin), the text styles
//   of each slot, the motion (colors DefaultEffects, shape and shadow FastSpatial, upstream "TODO:
//   Load the motionScheme tokens from the component tokens file");
// - ListItemDefaults.shapes() (rest, selected, pressed, focused, hovered, dragged) and
//   segmentedShapes (the first / last / single item's outer corners from ListTokens.ContainerShape),
//   SegmentedGap, elevation() (rest / dragged shadow);
// - ListItemDefaults.colors() / segmentedColors(): the content colors per enabled / selected /
//   dragged (disabled ones are translucent `copy(alpha)`; dragged ones are ReorderListTokens). The
//   container colors are the ListTokens / ReorderListTokens variables themselves (CHECKS below);
// - the legacy ListItem (@Deprecated in Compose; D4): its paddings and the CornerNone shape.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// list.css assumes (interaction precedence, color precedence, segmented corners, alignment,
// semantics, the samples' indicators) changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type ListDefault = ComposeLiteral;

const KT = 'ListItem.kt';
const DEFAULTS = 'ListItemDefaults.kt';
const SAMPLES = 'ListSamples.kt';
const CHECKBOX = 'Checkbox.kt';
const RADIO = 'RadioButton.kt';
const SWITCH = 'Switch.kt';

export const LIST_DEFAULTS_SOURCES = [KT, DEFAULTS, SAMPLES, CHECKBOX, RADIO, SWITCH];

const P = '--m3e-comp-list-item';

/** InteractiveListItem slot text styles: [variable, val name]. */
const STYLES: readonly [string, string, string][] = [
  ['headline', 'contentTextStyle', 'the headline (content)'],
  ['overline', 'overlineTextStyle', 'the overline'],
  ['supporting', 'supportingTextStyle', 'the supporting text'],
  ['leading', 'leadingTextStyle', 'text in the leading slot (an avatar letter)'],
  ['trailing', 'trailingTextStyle', 'text in the trailing slot (trailing supporting text)'],
];

/** defaultListItemColors content colors: [variable part, ListItemColors member suffix]. */
const CONTENT: readonly [string, string][] = [
  ['headline', 'contentColor'],
  ['leading', 'leadingContentColor'],
  ['trailing', 'trailingContentColor'],
  ['overline', 'overlineContentColor'],
  ['supporting', 'supportingContentColor'],
];

const upper = (member: string) => member[0]!.toUpperCase() + member.slice(1);

/** ListItemDefaults.shapes(): [variable suffix, ListItemShapes member]. */
const SHAPES: readonly [string, string][] = [
  ['', 'shape'],
  ['-selected', 'selectedShape'],
  ['-pressed', 'pressedShape'],
  ['-focused', 'focusedShape'],
  ['-hovered', 'hoveredShape'],
  ['-dragged', 'draggedShape'],
];

const RULES: readonly LiteralRule[] = [
  // --- Expressive layout ---------------------------------------------------------------------
  {
    kind: 'token',
    name: `${P}-padding-start`,
    owner: KT,
    member: 'InteractiveListStartPadding',
    file: KT,
    pattern: /internal val InteractiveListStartPadding\n\s*get\(\) = (ListTokens\.\w+)/d,
    note: 'ListItemDefaults.ContentPadding start',
  },
  {
    kind: 'token',
    name: `${P}-padding-end`,
    owner: KT,
    member: 'InteractiveListEndPadding',
    file: KT,
    pattern: /internal val InteractiveListEndPadding\n\s*get\(\) = (ListTokens\.\w+)/d,
    note: 'ListItemDefaults.ContentPadding end',
  },
  {
    kind: 'token',
    name: `${P}-padding-top`,
    owner: 'ListItemDefaults',
    member: 'InteractiveListTopPadding',
    file: DEFAULTS,
    pattern:
      /internal val InteractiveListTopPadding\n\s*get\(\) =\n\s*if \(shouldUsePrecisionPointerComponentSizing\.value\) \{\n\s*\d+\.dp\n\s*\} else \{\n\s*(ListTokens\.\w+)/d,
    note: 'ListItemDefaults.ContentPadding top (touch sizing; the precision-pointer 12dp is an opt-in flag)',
  },
  {
    kind: 'token',
    name: `${P}-padding-bottom`,
    owner: 'ListItemDefaults',
    member: 'InteractiveListBottomPadding',
    file: DEFAULTS,
    pattern:
      /internal val InteractiveListBottomPadding\n\s*get\(\) =\n\s*if \(shouldUsePrecisionPointerComponentSizing\.value\) \{\n\s*\d+\.dp\n\s*\} else \{\n\s*(ListTokens\.\w+)/d,
    note: 'ListItemDefaults.ContentPadding bottom (touch sizing)',
  },
  {
    kind: 'token',
    name: `${P}-space`,
    owner: KT,
    member: 'InteractiveListInternalSpacing',
    file: KT,
    pattern: /internal val InteractiveListInternalSpacing\n\s*get\(\) = (ListTokens\.\w+)/d,
    note: 'LeadingDecorator end padding and TrailingDecorator start padding',
  },
  {
    kind: 'token',
    name: `${P}-one-line-min-height`,
    owner: 'InteractiveListItemMeasurePolicy',
    member: 'calculateHeight(OneLine)',
    file: KT,
    pattern:
      /isExpressiveListItemHeightBasedOnTextLinesFixEnabled\) \{\n\s*when \(listItemType\) \{\n\s*ListItemType\.OneLine -> (ListTokens\.\w+)/d,
    note: 'headline only (ComposeMaterial3Flags.isExpressiveListItemHeightBasedOnTextLinesFixEnabled = true)',
  },
  {
    kind: 'token',
    name: `${P}-two-line-min-height`,
    owner: 'InteractiveListItemMeasurePolicy',
    member: 'calculateHeight(TwoLine)',
    file: KT,
    pattern:
      /isExpressiveListItemHeightBasedOnTextLinesFixEnabled\) \{\n\s*when \(listItemType\) \{\n\s*ListItemType\.OneLine -> ListTokens\.\w+\n\s*ListItemType\.TwoLine -> (ListTokens\.\w+)/d,
    note: 'an overline or supporting text',
  },
  {
    kind: 'token',
    name: `${P}-three-line-min-height`,
    owner: 'InteractiveListItemMeasurePolicy',
    member: 'calculateHeight(ThreeLine)',
    file: KT,
    pattern:
      /isExpressiveListItemHeightBasedOnTextLinesFixEnabled\) \{\n\s*when \(listItemType\) \{\n\s*ListItemType\.OneLine -> ListTokens\.\w+\n\s*ListItemType\.TwoLine -> ListTokens\.\w+\n\s*else \/\*ListItemType\.ThreeLine\*\/ -> (ListTokens\.\w+)/d,
    note: 'an overline and supporting text, or multi-line supporting text; content top-aligned (InteractiveListVerticalAlignmentBreakpoint)',
  },
  ...STYLES.map(([name, val, note]): LiteralRule => ({
    kind: 'typeToken',
    name: `${P}-${name}-style`,
    owner: 'InteractiveListItem',
    member: val,
    file: KT,
    pattern: new RegExp(`val ${val} = (ListTokens\\.\\w+)\\n`, 'd'),
    note,
  })),
  // --- Motion ---------------------------------------------------------------------------------
  {
    kind: 'motion',
    name: `${P}-color`,
    owner: 'InteractiveListItem',
    member: 'colorAnimationSpec',
    file: KT,
    pattern: /val colorAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Color>\(\)/d,
    note: 'container and content colors (updateTransition on enabled / selected / dragged)',
  },
  {
    kind: 'motion',
    name: `${P}-morph`,
    owner: 'InteractiveListItem',
    member: 'shapeAnimationSpec',
    file: KT,
    pattern: /val shapeAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'shapeForInteraction: each corner animates to the state shape (rememberAnimatedShape); overshoots under the expressive scheme',
  },
  {
    kind: 'motion',
    name: `${P}-elevation`,
    owner: 'InteractiveListItem',
    member: 'elevationAnimationSpec',
    file: KT,
    pattern: /val elevationAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Dp>\(\)/d,
    note: 'the shadow elevation towards draggedElevation and back',
  },
  // --- Shapes ---------------------------------------------------------------------------------
  ...SHAPES.map(([suffix, member]): LiteralRule => ({
    kind: 'token',
    name: `${P}-shape${suffix}`,
    owner: 'ListItemDefaults',
    member: `defaultListItemShapes(${member})`,
    file: DEFAULTS,
    pattern: new RegExp(`\\b${member} = fromToken\\(((?:Reorder)?ListTokens\\.\\w+)\\),`, 'd'),
  })),
  {
    kind: 'token',
    name: `${P}-segmented-shape`,
    owner: 'ListItemDefaults',
    member: 'segmentedShapes(overrideShape)',
    file: DEFAULTS,
    pattern: /val overrideShape = (ListTokens\.\w+)\.value/d,
    note: 'the outer corners: top of the first item, bottom of the last, all four of a single one (only the rest shape)',
  },
  {
    kind: 'token',
    name: `${P}-segmented-gap`,
    owner: 'ListItemDefaults',
    member: 'SegmentedGap',
    file: DEFAULTS,
    pattern: /public val SegmentedGap: Dp = (ListTokens\.\w+)/d,
    note: 'SegmentedListItems sample: Arrangement.spacedBy(ListItemDefaults.SegmentedGap)',
  },
  // --- Elevation ------------------------------------------------------------------------------
  {
    kind: 'shadow',
    name: `${P}-shadow`,
    owner: 'ListItemDefaults',
    member: 'elevation(elevation)',
    file: DEFAULTS,
    pattern: /\belevation: Dp = (ListTokens\.\w+),/d,
  },
  {
    kind: 'shadow',
    name: `${P}-shadow-dragged`,
    owner: 'ListItemDefaults',
    member: 'elevation(draggedElevation)',
    file: DEFAULTS,
    pattern: /\bdraggedElevation: Dp = (ListTokens\.\w+),/d,
    note: 'graphicsLayer shadowElevation; the item is raised (zIndex 1) while its shadow is above 0',
  },
  // --- Content colors (defaultListItemColors; segmentedColors uses the same) -------------------
  ...CONTENT.map(([part, member]): LiteralRule => ({
    kind: 'token',
    name: `${P}-${part}-content-color`,
    owner: 'ListItemDefaults',
    member: `defaultListItemColors(${member})`,
    file: DEFAULTS,
    pattern: new RegExp(`\\b${member} = fromToken\\((ListTokens\\.\\w+)\\),`, 'd'),
  })),
  ...CONTENT.map(([part, member]): LiteralRule => ({
    kind: 'token',
    name: `${P}-${part}-content-color-selected`,
    owner: 'ListItemDefaults',
    member: `defaultListItemColors(selected${upper(member)})`,
    file: DEFAULTS,
    pattern: new RegExp(
      `\\bselected${upper(member)} =\\s*fromToken\\((ListTokens\\.\\w+)\\),`,
      'd',
    ),
  })),
  ...CONTENT.map(([part, member]): LiteralRule => ({
    kind: 'alpha',
    name: `${P}-${part}-content-color-disabled`,
    owner: 'ListItemDefaults',
    member: `defaultListItemColors(disabled${upper(member)})`,
    file: DEFAULTS,
    pattern: new RegExp(
      `\\bdisabled${upper(member)} =\\n\\s*fromToken\\((ListTokens\\.\\w+)\\)\\n\\s*\\.copy\\(alpha = (ListTokens\\.\\w+)\\),`,
      'd',
    ),
    note: 'Color.copy(alpha): translucent',
  })),
  ...CONTENT.map(([part, member]): LiteralRule => ({
    kind: 'token',
    name: `${P}-${part}-content-color-dragged`,
    owner: 'ListItemDefaults',
    member: `defaultListItemColors(dragged${upper(member)})`,
    file: DEFAULTS,
    pattern: new RegExp(
      `\\bdragged${upper(member)} =\\s*fromToken\\((ReorderListTokens\\.\\w+)\\),`,
      'd',
    ),
  })),
  // --- Legacy ListItem (@Deprecated upstream; D4) ----------------------------------------------
  {
    kind: 'dp',
    name: `${P}-baseline-padding-vertical`,
    owner: KT,
    member: 'ListItemVerticalPadding',
    file: KT,
    pattern: /internal val ListItemVerticalPadding = (\d+)\.dp/d,
    note: 'legacy ListItem: one- and two-line items',
  },
  {
    kind: 'dp',
    name: `${P}-baseline-three-line-padding-vertical`,
    owner: KT,
    member: 'ListItemThreeLineVerticalPadding',
    file: KT,
    pattern: /internal val ListItemThreeLineVerticalPadding = (\d+)\.dp/d,
    note: 'legacy ListItem: three-line items (leading and trailing at the top padding)',
  },
  {
    kind: 'dp',
    name: `${P}-baseline-padding-start`,
    owner: KT,
    member: 'ListItemStartPadding',
    file: KT,
    pattern: /internal val ListItemStartPadding = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-baseline-padding-end`,
    owner: KT,
    member: 'ListItemEndPadding',
    file: KT,
    pattern: /internal val ListItemEndPadding = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-baseline-leading-space`,
    owner: KT,
    member: 'LeadingContentEndPadding',
    file: KT,
    pattern: /internal val LeadingContentEndPadding = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-baseline-trailing-space`,
    owner: KT,
    member: 'TrailingContentStartPadding',
    file: KT,
    pattern: /internal val TrailingContentStartPadding = (\d+)\.dp/d,
  },
  {
    kind: 'token',
    name: `${P}-baseline-shape`,
    owner: 'ListItemDefaults',
    member: 'shape',
    file: DEFAULTS,
    pattern:
      /public val shape: Shape\n\s*@Composable @ReadOnlyComposable get\(\) = (ListTokens\.\w+)\.value/d,
    note: 'the legacy ListItem Surface shape',
  },
];

/** Wiring list.css assumes. */
const CHECKS: readonly LiteralCheck[] = [
  [
    DEFAULTS,
    'shapeForInteraction: pressed > dragged > selected > focused > hovered > rest',
    /pressed -> pressedShape\n\s*dragged -> draggedShape\n\s*selected -> selectedShape\n\s*focused -> focusedShape\n\s*hovered -> hoveredShape\n\s*else -> shape/,
  ],
  [
    DEFAULTS,
    'colors: disabled > dragged > selected > default',
    /!enabled -> disabledContainerColor\n\s*dragged -> draggedContainerColor\n\s*selected -> selectedContainerColor\n\s*else -> containerColor/,
  ],
  [
    DEFAULTS,
    'defaultListItemColors containers: ItemContainerColor (also disabled), ItemSelectedContainerColor, ReorderListTokens.ItemContainerColor',
    /defaultListItemColorsCached\n\s*\?: ListItemColors\(\n\s*\/\/ default\n\s*containerColor = fromToken\(ListTokens\.ItemContainerColor\),[\s\S]*?selectedContainerColor = fromToken\(ListTokens\.ItemSelectedContainerColor\),[\s\S]*?disabledContainerColor = fromToken\(ListTokens\.ItemContainerColor\),[\s\S]*?draggedContainerColor = fromToken\(ReorderListTokens\.ItemContainerColor\),/,
  ],
  [
    DEFAULTS,
    'defaultSegmentedListItemColors: ItemSegmentedContainerColor (also disabled), content colors as defaultListItemColors',
    /defaultSegmentedListItemColorsCached\n\s*\?: ListItemColors\(\n\s*\/\/ default\n\s*containerColor = fromToken\(ListTokens\.ItemSegmentedContainerColor\),\n\s*contentColor = fromToken\(ListTokens\.ItemLabelTextColor\),\n\s*leadingContentColor = fromToken\(ListTokens\.ItemLeadingIconColor\),\n\s*trailingContentColor = fromToken\(ListTokens\.ItemTrailingIconColor\),\n\s*overlineContentColor = fromToken\(ListTokens\.ItemOverlineColor\),\n\s*supportingContentColor = fromToken\(ListTokens\.ItemSupportingTextColor\),[\s\S]*?disabledContainerColor = fromToken\(ListTokens\.ItemSegmentedContainerColor\),/,
  ],
  [
    DEFAULTS,
    'segmentedShapes: single → all four outer corners, first → top, last → bottom; only the rest shape',
    /count == 1 -> \{[\s\S]*?topStart = overrideShape\.topStart,\n\s*topEnd = overrideShape\.topEnd,\n\s*bottomStart = overrideShape\.bottomStart,\n\s*bottomEnd = overrideShape\.bottomEnd,[\s\S]*?index == 0 -> \{[\s\S]*?shape =\n\s*defaultBaseShape\.copy\(\n\s*topStart = overrideShape\.topStart,\n\s*topEnd = overrideShape\.topEnd,\n\s*\)[\s\S]*?index == count - 1 -> \{[\s\S]*?shape =\n\s*defaultBaseShape\.copy\(\n\s*bottomStart = overrideShape\.bottomStart,\n\s*bottomEnd = overrideShape\.bottomEnd,\n\s*\)/,
  ],
  [
    DEFAULTS,
    'verticalAlignment: centred below InteractiveListVerticalAlignmentBreakpoint, else top',
    /if \(space < breakpoint\) \{\n\s*Alignment\.CenterVertically\n\s*\} else \{\n\s*Alignment\.Top/,
  ],
  [
    KT,
    'the alignment breakpoint: (three-line + two-line height) / 2 minus the vertical padding (60dp: two-line centred, three-line top)',
    /InteractiveListVerticalAlignmentBreakpoint =\n\s*\(ListTokens\.ItemThreeLineContainerHeight \+ ListTokens\.ItemTwoLineContainerHeight\) \/ 2 -\n\s*ListItemDefaults\.InteractiveListTopPadding -\n\s*ListItemDefaults\.InteractiveListBottomPadding/,
  ],
  [
    KT,
    'ListItemType: three lines with an overline and supporting text or multi-line supporting text, two with either',
    /\(hasOverline && hasSupporting\) \|\| isSupportingMultiline -> ThreeLine\n\s*hasOverline \|\| hasSupporting -> TwoLine\n\s*else -> OneLine/,
  ],
  [
    KT,
    'InteractiveListItem: merged semantics, minimum interactive size and combinedClickable with the ripple on the shape only when clickable; background then clip on the animated shape',
    /\.semantics\(mergeDescendants = true, properties = applySemantics\)\n\s*\.then\(\n\s*if \(onClick != null\) \{\n\s*Modifier\.minimumInteractiveComponentSize\(\)[\s\S]*?\.background\(color = containerColor, shape = shape\)\n\s*\.clip\(shape\)[\s\S]*?Modifier\.combinedClickable\([\s\S]*?ripple\(focusRingShape = shape\)/,
  ],
  [
    KT,
    'the shadow raises the item (zIndex 1) while above 0',
    /\.zIndexLambda \{ if \(shadowElevation\.value > 0\.dp\) 1f else 0f \}/,
  ],
  [
    KT,
    'selectable items: selected + Role.RadioButton; checkable items: toggleableState + Role.Checkbox',
    /this\.selected = selected\n\s*role = Role\.RadioButton[\s\S]*?toggleableState = ToggleableState\(checked\)\n\s*role = Role\.Checkbox/,
  ],
  [
    KT,
    'the non-interactive items take no interaction source (no hover / press / focus morph)',
    /val interactionSource =\n\s*if \(onClick == null\) \{\n\s*null/,
  ],
  [
    KT,
    'colors from LocalContentColor = the content color; the leading / trailing decorators pad by the internal spacing',
    /Box\(Modifier\.padding\(end = InteractiveListInternalSpacing\)\)[\s\S]*?Box\(Modifier\.padding\(start = InteractiveListInternalSpacing\)\)[\s\S]*?CompositionLocalProvider\(LocalContentColor provides contentColor\)/,
  ],
  [
    KT,
    'legacy ListItem: a Surface in ListItemDefaults.shape with enabled colors, ListItemLayout; overline, headline, supporting stacked',
    /Surface\(\n\s*modifier = Modifier\.semantics\(mergeDescendants = true\) \{\}\.then\(modifier\),\n\s*shape = ListItemDefaults\.shape,\n\s*color = colors\.containerColor\(enabled = true, selected = false, dragged = false\),/,
  ],
  [
    KT,
    'legacy layout: three-line items top-align leading / trailing / text at the top padding, else centred',
    /y = if \(isThreeLine\) topPadding else CenterVertically\.align\(it\.height, height\),/,
  ],
  [
    SAMPLES,
    'SegmentedListItems: surfaceContainer items spaced SegmentedGap (the docs demo; owner decision M8 #12)',
    /fun SegmentedListItems\(\) \{\n\s*val count = 4\n\s*val colors =\n\s*ListItemDefaults\.colors\(containerColor = MaterialTheme\.colorScheme\.surfaceContainer\)\n\s*Column\(\n[^\n]*\n\s*verticalArrangement = Arrangement\.spacedBy\(ListItemDefaults\.SegmentedGap\),/,
  ],
  [
    SAMPLES,
    'selection samples: a leading RadioButton / Checkbox with a null handler (an indicator; the row is the control)',
    /leadingContent = \{ RadioButton\(selected = selected, onClick = null\) \}[\s\S]*?leadingContent = \{ Checkbox\(checked = checked, onCheckedChange = null\) \}/,
  ],
  [
    CHECKBOX,
    'a checkbox without onClick: no minimum interactive size and no toggleable (the indicator footprint only)',
    /\.then\(\n\s*if \(onClick != null\) \{\n\s*Modifier\.minimumInteractiveComponentSize\(\)\n\s*\} else \{\n\s*Modifier\n\s*\}\n\s*\)/,
  ],
  [
    RADIO,
    'a radio button without onClick: no minimum interactive size (the 2dp-padded 20dp circle)',
    /if \(onClick != null\) \{\n\s*Modifier\.minimumInteractiveComponentSize\(\)\n\s*\.selectable\(/,
  ],
  [
    SWITCH,
    'a switch without onCheckedChange: no minimum interactive size (the track only)',
    /if \(onCheckedChange != null\) \{\n\s*Modifier\.minimumInteractiveComponentSize\(\)\n\s*\.toggleable\(/,
  ],
];

/** `sources`: vendored Material3 files and samples by name (ListItem.kt, ListItemDefaults.kt, …). */
export function extractListDefaults(sources: Readonly<Record<string, string>>): ListDefault[] {
  return extractLiterals('list-defaults', LIST_DEFAULTS_SOURCES, RULES, CHECKS, sources);
}
