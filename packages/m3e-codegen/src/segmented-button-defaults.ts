// Values Compose's SegmentedButton renders (SegmentedButton.kt, deprecated here by D4) that are not
// OutlinedSegmentedButtonTokens, or that pick one of them:
// - SegmentedButtonDefaults.colors(): the selected container / content and the border from the
//   tokens, a transparent unselected container, and the disabled colors: the label at
//   DisabledLabelTextOpacity, the border OutlineColor (not DisabledOutlineColor) at
//   DisabledOutlineOpacity, the selected container kept opaque;
// - the layout: ContentPadding (12dp sides, ButtonDefaults' 8dp top / bottom), the 8dp
//   IconSpacing, ButtonDefaults.MinWidth / MinHeight on each button, CheckedZIndexFactor;
// - the motion (all under upstream "TODO Load the motionScheme tokens from the component tokens
//   file"): the label offset on FastSpatial, the check's fadeIn (DefaultEffects) + scaleIn from 0
//   at the bottom-start (FastSpatial), the Crossfade (DefaultEffects) when an unselected icon is
//   given;
// - the ripple of the selectable / toggleable Surface: ripple() without a color, i.e. the content
//   color.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// segmented-button.css assumes (rows, item shapes, content layout, icon motion, z-index, the
// Surface's 48dp target, border and clip) changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type SegmentedButtonDefault = ComposeLiteral;

const KT = 'SegmentedButton.kt';
const BUTTON = 'Button.kt';
const SURFACE = 'Surface.kt';
const SAMPLES = 'SegmentedButtonSamples.kt';
const TOKENS = 'OutlinedSegmentedButtonTokens';

export const SEGMENTED_BUTTON_DEFAULTS_SOURCES = [KT, BUTTON, SURFACE, SAMPLES];

const P = '--m3e-comp-segmented-button';

const RULES: readonly LiteralRule[] = [
  {
    kind: 'token',
    name: `${P}-container-color-selected`,
    owner: 'SegmentedButtonDefaults',
    member: 'defaultSegmentedButtonColors(activeContainerColor)',
    file: KT,
    pattern: /\n\s*activeContainerColor = fromToken\((\w+)\),/d,
    tokens: TOKENS,
  },
  {
    kind: 'token',
    name: `${P}-content-color-selected`,
    owner: 'SegmentedButtonDefaults',
    member: 'defaultSegmentedButtonColors(activeContentColor)',
    file: KT,
    pattern: /\n\s*activeContentColor = fromToken\((\w+)\),/d,
    tokens: TOKENS,
    note: 'Surface contentColor: the label and the icons (LocalContentColor)',
  },
  {
    kind: 'token',
    name: `${P}-outline-color`,
    owner: 'SegmentedButtonDefaults',
    member: 'defaultSegmentedButtonColors(activeBorderColor, inactiveBorderColor)',
    file: KT,
    pattern: /\n\s*activeBorderColor = fromToken\((\w+)\),/d,
    tokens: TOKENS,
    note: 'selected and unselected alike; borderStroke(width = BorderWidth), drawn inside the shape',
  },
  {
    kind: 'keyword',
    name: `${P}-container-color-unselected`,
    owner: 'SegmentedButtonDefaults',
    member: 'defaultSegmentedButtonColors(inactiveContainerColor)',
    file: KT,
    pattern: /\n\s*inactiveContainerColor = (Color\.Transparent),/d,
    note: 'enabled or disabled (disabledInactiveContainerColor)',
  },
  {
    kind: 'token',
    name: `${P}-content-color-unselected`,
    owner: 'SegmentedButtonDefaults',
    member: 'defaultSegmentedButtonColors(inactiveContentColor)',
    file: KT,
    pattern: /\n\s*inactiveContentColor = fromToken\((\w+)\),/d,
    tokens: TOKENS,
  },
  {
    kind: 'token',
    name: `${P}-container-color-selected-disabled`,
    owner: 'SegmentedButtonDefaults',
    member: 'defaultSegmentedButtonColors(disabledActiveContainerColor)',
    file: KT,
    pattern: /\n\s*disabledActiveContainerColor = fromToken\((\w+)\),/d,
    tokens: TOKENS,
    note: 'a disabled selected button keeps the opaque selected container',
  },
  {
    kind: 'alpha',
    name: `${P}-content-color-disabled`,
    owner: 'SegmentedButtonDefaults',
    member:
      'defaultSegmentedButtonColors(disabledActiveContentColor, disabledInactiveContentColor)',
    file: KT,
    pattern: /disabledActiveContentColor =\n\s*fromToken\((\w+)\)\n\s*\.copy\(alpha = (\w+)\),/d,
    tokens: TOKENS,
    note: 'selected and unselected alike (Color.copy(alpha): translucent, not composited)',
  },
  {
    kind: 'alpha',
    name: `${P}-outline-color-disabled`,
    owner: 'SegmentedButtonDefaults',
    member: 'defaultSegmentedButtonColors(disabledActiveBorderColor, disabledInactiveBorderColor)',
    file: KT,
    pattern: /disabledActiveBorderColor =\n\s*fromToken\((\w+)\)\.copy\(alpha = (\w+)\),/d,
    tokens: TOKENS,
    note: 'OutlineColor at DisabledOutlineOpacity: Compose does not read OutlinedSegmentedButtonTokens.DisabledOutlineColor (on-surface)',
  },
  {
    kind: 'dp',
    name: `${P}-content-padding-horizontal`,
    owner: 'SegmentedButtonDefaults',
    member: 'ContentPadding(start, end)',
    file: KT,
    pattern:
      /PaddingValues\(\n\s*start = (\d+)\.dp,\n\s*top = ButtonDefaults\.ContentPadding\.calculateTopPadding\(\),/d,
  },
  {
    kind: 'dp',
    name: `${P}-content-padding-vertical`,
    owner: 'ButtonDefaults',
    member: 'ButtonVerticalPadding (ContentPadding top / bottom)',
    file: BUTTON,
    pattern: /private val ButtonVerticalPadding = (\d+)\.dp/d,
    note: 'SegmentedButtonDefaults.ContentPadding top / bottom = ButtonDefaults.ContentPadding.calculateTop/BottomPadding()',
  },
  {
    kind: 'dp',
    name: `${P}-icon-spacing`,
    owner: KT,
    member: 'IconSpacing',
    file: KT,
    pattern: /private val IconSpacing\n\s*get\(\) = (\d+)\.dp/d,
    note: 'between the icon slot (IconSize, kept even while empty) and the label',
  },
  {
    kind: 'dp',
    name: `${P}-min-width`,
    owner: 'ButtonDefaults',
    member: 'MinWidth',
    file: BUTTON,
    pattern: /public val MinWidth: Dp = (\d+)\.dp/d,
    note: 'SegmentedButton: defaultMinSize(minWidth = ButtonDefaults.MinWidth)',
  },
  {
    kind: 'token',
    name: `${P}-min-height`,
    owner: 'ButtonDefaults',
    member: 'MinHeight',
    file: BUTTON,
    pattern:
      /public val MinHeight: Dp\n\s*get\(\) =\n\s*if \(shouldUsePrecisionPointerComponentSizing\.value\) \{\n\s*\d+\.dp\n\s*\} else \{\n\s*(ButtonSmallTokens\.ContainerHeight)/d,
    note: 'SegmentedButton: defaultMinSize(minHeight = ButtonDefaults.MinHeight); the touch branch (shouldUsePrecisionPointerComponentSizing is an opt-in flag)',
  },
  {
    kind: 'fraction',
    name: `${P}-selected-z-index`,
    owner: KT,
    member: 'CheckedZIndexFactor',
    file: KT,
    pattern: /private const val CheckedZIndexFactor = (\d+)f/d,
    note: 'interactionZIndex: z = pressed / focused interactions + this when checked or selected, so its border draws over its neighbors',
  },
  {
    kind: 'motion',
    name: `${P}-label-offset`,
    owner: 'SegmentedButtonContent',
    member: 'animationSpec',
    file: KT,
    pattern: /val animationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Int>\(\)/d,
    note: 'SegmentedButtonContentMeasurePolicy: the label offset −(IconSize + IconSpacing) / 2 while no icon is shown ↔ 0 (an Int Animatable; it overshoots under the expressive scheme)',
  },
  {
    kind: 'motion',
    name: `${P}-icon-fade`,
    owner: 'SegmentedButtonDefaults.Icon',
    member: 'enter (fadeIn)',
    file: KT,
    pattern: /fadeIn\(MotionSchemeKeyTokens\.(\w+)\.value\(\)\)/d,
    note: 'AnimatedVisibility(visible = active): the check fades in; exit = ExitTransition.None (it disappears at once)',
  },
  {
    kind: 'motion',
    name: `${P}-icon-scale`,
    owner: 'SegmentedButtonDefaults.Icon',
    member: 'enter (scaleIn)',
    file: KT,
    pattern:
      /scaleIn\(\n\s*initialScale = 0f,\n\s*transformOrigin = TransformOrigin\(0f, 1f\),\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    note: 'the check scales in from 0 about its bottom-left corner (TransformOrigin(0f, 1f), not mirrored in RTL)',
  },
  {
    kind: 'motion',
    name: `${P}-icon-crossfade`,
    owner: 'SegmentedButtonDefaults.Icon',
    member: 'Crossfade(animationSpec)',
    file: KT,
    pattern:
      /Crossfade\(\n\s*targetState = active,\n\s*\/\/ TODO[^\n]*\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    note: 'with an unselected icon (inactiveContent, SegmentedButtonMultiSelectSample): the check and that icon cross-fade both ways',
  },
  {
    kind: 'keyword',
    name: `${P}-state-layer-color`,
    owner: 'Surface(selected / checked)',
    member: 'ripple(color)',
    file: SURFACE,
    pattern:
      /\.selectable\(\n\s*selected = selected,\n\s*interactionSource = interactionSource,\n\s*indication =\n\s*(ripple)\(\n\s*focusRingShape = shape,/d,
    keyword: 'Color.Unspecified',
    note: 'ripple() without a color → LocalContentColor, the button content color (selected or not), clipped to the item shape',
  },
];

/** Wiring segmented-button.css (and m3e-react's rows) assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'single choice: each button has Role.RadioButton; the row is a selectableGroup',
    /\.semantics \{ role = Role\.RadioButton \},[\s\S]*?fun SingleChoiceSegmentedButtonRow\([\s\S]*?modifier\n\s*\.selectableGroup\(\)\n\s*\.defaultMinSize\(minHeight = OutlinedSegmentedButtonTokens\.ContainerHeight\)\n\s*\.width\(IntrinsicSize\.Min\),\n\s*horizontalArrangement = Arrangement\.spacedBy\(-space\),\n\s*verticalAlignment = Alignment\.CenterVertically,/,
  ],
  [
    KT,
    'multi choice: the same row without selectableGroup (each button a toggleable Surface)',
    /checked = checked,\n\s*onCheckedChange = onCheckedChange,[\s\S]*?fun MultiChoiceSegmentedButtonRow\([\s\S]*?modifier\n\s*\.defaultMinSize\(minHeight = OutlinedSegmentedButtonTokens\.ContainerHeight\)\n\s*\.width\(IntrinsicSize\.Min\),\n\s*horizontalArrangement = Arrangement\.spacedBy\(-space\),\n\s*verticalAlignment = Alignment\.CenterVertically,/,
  ],
  [
    KT,
    'the rows overlap the buttons by the border width',
    /space: Dp = SegmentedButtonDefaults\.BorderWidth,[\s\S]*?public val BorderWidth: Dp = OutlinedSegmentedButtonTokens\.OutlineWidth/,
  ],
  [
    KT,
    'each button: weight(1f), interactionZIndex, defaultMinSize(ButtonDefaults.MinWidth, MinHeight)',
    /\.weight\(1f\)\n\s*\.interactionZIndex\(checked, interactionCount\)\n\s*\.defaultMinSize\(\n\s*minWidth = ButtonDefaults\.MinWidth,\n\s*minHeight = ButtonDefaults\.MinHeight,\n\s*\)[\s\S]*?\.weight\(1f\)\n\s*\.interactionZIndex\(selected, interactionCount\)\n\s*\.defaultMinSize\(\n\s*minWidth = ButtonDefaults\.MinWidth,\n\s*minHeight = ButtonDefaults\.MinHeight,\n\s*\)/,
  ],
  [
    KT,
    'the content color colors the label and the icons; the border picks by enabled × active',
    /contentColor = contentColor,\n\s*border = border,[\s\S]*?SegmentedButtonDefaults\.borderStroke\(colors\.borderColor\(enabled, selected\)\)/,
  ],
  [
    KT,
    'unselected: OutlineColor border; disabled unselected: transparent, the disabled content and border colors',
    /inactiveBorderColor = fromToken\(OutlineColor\),[\s\S]*?disabledInactiveContainerColor = Color\.Transparent,\n\s*disabledInactiveContentColor =\n\s*fromToken\(DisabledLabelTextColor\)\n\s*\.copy\(alpha = DisabledLabelTextOpacity\),\n\s*disabledInactiveBorderColor =\n\s*fromToken\(OutlineColor\)\.copy\(alpha = DisabledOutlineOpacity\),/,
  ],
  [
    KT,
    'itemShape: one button the base shape; the first its start corners, the last its end corners, others none',
    /get\(\) = OutlinedSegmentedButtonTokens\.Shape\.value as CornerBasedShape[\s\S]*?if \(count == 1\) \{\n\s*return baseShape\n\s*\}\n\n\s*return when \(index\) \{\n\s*0 -> baseShape\.start\(\)\n\s*count - 1 -> baseShape\.end\(\)\n\s*else -> RectangleShape\n\s*\}/,
  ],
  [
    KT,
    'content: centered in the padded box, LabelTextFont; the icon slot is IconSize wide even while empty, the label offset −(IconSize + IconSpacing) / 2 without an icon',
    /Box\(contentAlignment = Alignment\.Center, modifier = Modifier\.padding\(contentPadding\)\) \{\n\s*val typography = OutlinedSegmentedButtonTokens\.LabelTextFont\.value[\s\S]*?val width =\n\s*maxOf\(SegmentedButtonDefaults\.IconSize\.roundToPx\(\), iconWidth\) \+\n\s*IconSpacing\.roundToPx\(\) \+\n\s*\(contentWidth \?: 0\)\n\s*val offsetX =\n\s*if \(iconWidth == 0\) \{\n\s*-\(SegmentedButtonDefaults\.IconSize\.roundToPx\(\) \+ IconSpacing\.roundToPx\(\)\) \/ 2/,
  ],
  [
    KT,
    'content: the icon and the label are vertically centered, the label after the icon slot plus the offset',
    /iconPlaceables\.fastForEach \{ it\.place\(0, \(height - it\.height\) \/ 2\) \}\n\n\s*val contentOffsetX =\n\s*SegmentedButtonDefaults\.IconSize\.roundToPx\(\) \+\n\s*IconSpacing\.roundToPx\(\) \+\n\s*\(animatable\?\.value \?: offsetX\)/,
  ],
  [
    KT,
    'the default icon is SegmentedButtonDefaults.Icon(active): the check (Icons.Filled.Check, IconSize) shown while active, gone at once when not',
    /icon: @Composable \(\) -> Unit = \{ SegmentedButtonDefaults\.Icon\(checked\) \},[\s\S]*?imageVector = Icons\.Filled\.Check,\n\s*contentDescription = null,\n\s*modifier = Modifier\.size\(IconSize\),[\s\S]*?AnimatedVisibility\(\n\s*visible = active,\n\s*exit = ExitTransition\.None,/,
  ],
  [
    KT,
    'interactionZIndex: presses and focus raise a button, a checked / selected one by CheckedZIndexFactor more',
    /is PressInteraction\.Press,\n\s*is FocusInteraction\.Focus -> \{\n\s*interactionCount\.intValue\+\+[\s\S]*?val zIndex = interactionCount\.value \+ if \(checked\) CheckedZIndexFactor else 0f/,
  ],
  [
    SURFACE,
    'selectable / toggleable Surface: minimumInteractiveComponentSize outside the shape, then border, background and clip, then the ripple; content min constraints propagated',
    /\.minimumInteractiveComponentSize\(\)[\s\S]*?\.surface\([\s\S]*?\.selectable\([\s\S]*?propagateMinConstraints = true,[\s\S]*?\.minimumInteractiveComponentSize\(\)[\s\S]*?\.surface\([\s\S]*?\.toggleable\([\s\S]*?propagateMinConstraints = true,[\s\S]*?\.then\(if \(border != null\) Modifier\.border\(border, shape\) else Modifier\)\n\s*\.background\(color = backgroundColor, shape = shape\)\n\s*\.clip\(shape\)/,
  ],
  [
    SAMPLES,
    'SegmentedButtonSingleSelectSample: Day / Month / Week, the first selected',
    /var selectedIndex by rememberSaveable \{ mutableStateOf\(0\) \}\n\s*val options = listOf\("Day", "Month", "Week"\)/,
  ],
  [
    SAMPLES,
    'SegmentedButtonMultiSelectSample: an unselected icon per button (the trailing lambda is inactiveContent), the check while checked',
    /val options = listOf\("Favorites", "Trending", "Saved"\)[\s\S]*?SegmentedButtonDefaults\.Icon\(active = index in checkedList\) \{\n\s*Icon\(\n\s*imageVector = icons\[index\],/,
  ],
];

/**
 * `sources`: vendored Material3 files and samples by name (SegmentedButton.kt, Button.kt,
 * Surface.kt, SegmentedButtonSamples.kt).
 */
export function extractSegmentedButtonDefaults(
  sources: Readonly<Record<string, string>>,
): SegmentedButtonDefault[] {
  return extractLiterals(
    'segmented-button-defaults',
    SEGMENTED_BUTTON_DEFAULTS_SOURCES,
    RULES,
    CHECKS,
    sources,
  );
}
