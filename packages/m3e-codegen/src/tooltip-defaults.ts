// Values Compose's tooltips render (Tooltip.kt, internal/BasicTooltip.kt) that are not in
// PlainTooltipTokens / RichTooltipTokens, or that pick one of them:
// - the layout literals: SpacingBetweenTooltipAndAnchor (4dp, rememberTooltipPositionProvider's
//   default), TooltipMinWidth / TooltipMinHeight (40 × 24dp), the plain tooltip's 8 × 4dp
//   content padding and 200dp max width, the rich tooltip's 320dp max width, 16dp horizontal
//   padding, the baselines its title and text are placed from (HeightToSubheadFirstLine 28dp,
//   HeightFromSubheadToTextFirstLine 24dp), TextBottomPadding 16dp, and the action slot's 36dp
//   minimum height and 8dp bottom padding;
// - TooltipDefaults.caretSize (16 × 8dp) and the rich tooltip's shadow elevation
//   (RichTooltipTokens.ContainerElevation as a shadow; tonal elevation 0);
// - the motion: TooltipBox scales from 0.8 on FastSpatial and fades from 0 on FastEffects (in and
//   out, around the tooltip's center), and BasicTooltipDefaults.TooltipDuration (1500ms) for
//   non-persistent tooltips shown without the mouse;
// - Google Sans Flex's baseline position, which the paddingFromBaseline values are placed from.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// tooltip.css and the m3e-elements tooltip controller assume changes upstream.
import {
  type ComposeLiteral,
  type FontMetrics,
  type LiteralCheck,
  type LiteralRule,
  baselineShiftLiteral,
  extractLiterals,
} from './compose-literals.js';

export type TooltipDefault = ComposeLiteral;

const KT = 'Tooltip.kt';
const BASIC = 'BasicTooltip.kt';
const SAMPLES = 'TooltipSamples.kt';

export const TOOLTIP_DEFAULTS_SOURCES = [KT, BASIC, SAMPLES];

const P = '--m3e-comp-tooltip';

/** `internal val <member>\n    get() = <n>.dp` (Tooltip.kt's private layout literals). */
const getter = (member: string) =>
  new RegExp(`(?:internal|private) val ${member}\\n\\s*get\\(\\) = (\\d+)\\.dp`, 'd');

const RULES: readonly LiteralRule[] = [
  {
    kind: 'dp',
    name: `${P}-spacing`,
    owner: KT,
    member: 'SpacingBetweenTooltipAndAnchor',
    file: KT,
    pattern: getter('SpacingBetweenTooltipAndAnchor'),
    note: 'rememberTooltipPositionProvider(positioning) default: between the anchor bounds and the tooltip (the caret, when drawn, extends into it)',
  },
  {
    kind: 'dp',
    name: `${P}-min-width`,
    owner: KT,
    member: 'TooltipMinWidth',
    file: KT,
    pattern: getter('TooltipMinWidth'),
    note: 'sizeIn(minWidth) of both tooltips, padding included',
  },
  {
    kind: 'dp',
    name: `${P}-min-height`,
    owner: KT,
    member: 'TooltipMinHeight',
    file: KT,
    pattern: getter('TooltipMinHeight'),
    note: 'sizeIn(minHeight) of both tooltips, padding included',
  },
  {
    kind: 'dp',
    name: `${P}-plain-padding-vertical`,
    owner: KT,
    member: 'PlainTooltipVerticalPadding',
    file: KT,
    pattern: getter('PlainTooltipVerticalPadding'),
    note: 'PlainTooltipContentPadding; also the rich tooltip text padding when it has no title and no action (textVerticalPadding)',
  },
  {
    kind: 'dp',
    name: `${P}-plain-padding-horizontal`,
    owner: KT,
    member: 'PlainTooltipHorizontalPadding',
    file: KT,
    pattern: getter('PlainTooltipHorizontalPadding'),
    note: 'PlainTooltipContentPadding',
  },
  {
    kind: 'dp',
    name: `${P}-plain-max-width`,
    owner: 'TooltipDefaults',
    member: 'plainTooltipMaxWidth',
    file: KT,
    pattern: /public val plainTooltipMaxWidth: Dp = (\d+)\.dp/d,
    note: 'sizeIn(maxWidth), padding included',
  },
  {
    kind: 'dp',
    name: `${P}-rich-max-width`,
    owner: 'TooltipDefaults',
    member: 'richTooltipMaxWidth',
    file: KT,
    pattern: /public val richTooltipMaxWidth: Dp = (\d+)\.dp/d,
    note: 'sizeIn(maxWidth) on the Surface, padding included',
  },
  {
    kind: 'dp',
    name: `${P}-rich-padding-horizontal`,
    owner: KT,
    member: 'RichTooltipHorizontalPadding',
    file: KT,
    pattern: getter('RichTooltipHorizontalPadding'),
    note: 'the Column of title, text and action',
  },
  {
    kind: 'dp',
    name: `${P}-rich-subhead-baseline`,
    owner: KT,
    member: 'HeightToSubheadFirstLine',
    file: KT,
    pattern: getter('HeightToSubheadFirstLine'),
    note: 'paddingFromBaseline(top): from the top of the tooltip to the title’s first baseline',
  },
  {
    kind: 'dp',
    name: `${P}-rich-text-baseline`,
    owner: KT,
    member: 'HeightFromSubheadToTextFirstLine',
    file: KT,
    pattern: getter('HeightFromSubheadToTextFirstLine'),
    note: 'paddingFromBaseline(top) of the text when there is a title or an action: from the title’s bottom (or the tooltip top) to the text’s first baseline',
  },
  {
    kind: 'dp',
    name: `${P}-rich-text-padding-bottom`,
    owner: KT,
    member: 'TextBottomPadding',
    file: KT,
    pattern: getter('TextBottomPadding'),
    note: 'under the text when there is a title or an action',
  },
  {
    kind: 'dp',
    name: `${P}-rich-action-min-height`,
    owner: KT,
    member: 'ActionLabelMinHeight',
    file: KT,
    pattern: getter('ActionLabelMinHeight'),
    note: 'requiredHeightIn(min) of the action slot, its bottom padding included (the samples’ TextButton is taller: its minimum interactive size)',
  },
  {
    kind: 'dp',
    name: `${P}-rich-action-padding-bottom`,
    owner: KT,
    member: 'ActionLabelBottomPadding',
    file: KT,
    pattern: getter('ActionLabelBottomPadding'),
  },
  {
    kind: 'dp',
    name: `${P}-caret-width`,
    owner: 'TooltipDefaults',
    member: 'caretSize.width',
    file: KT,
    pattern: /public val caretSize: DpSize = DpSize\((\d+)\.dp, \d+\.dp\)/d,
    note: 'DefaultTooltipCaretShape: a triangle this wide at its base on the tooltip edge',
  },
  {
    kind: 'dp',
    name: `${P}-caret-height`,
    owner: 'TooltipDefaults',
    member: 'caretSize.height',
    file: KT,
    pattern: /public val caretSize: DpSize = DpSize\(\d+\.dp, (\d+)\.dp\)/d,
    note: 'DefaultTooltipCaretShape: from the base to the apex, outside the tooltip bounds',
  },
  {
    kind: 'shadow',
    name: `${P}-rich-shadow`,
    owner: 'RichTooltip',
    member: 'shadowElevation',
    file: KT,
    pattern: /shadowElevation: Dp = (RichTooltipTokens\.ContainerElevation),/d,
    note: 'a shadow (tonalElevation = ElevationTokens.Level0); the plain tooltip has neither',
  },
  {
    kind: 'fraction',
    name: `${P}-closed-scale`,
    owner: 'TooltipBox',
    member: 'transition.animateFloat(scale)',
    file: KT,
    pattern: /label = "tooltip transition: scaling",\n\s*\) \{\n\s*if \(it\) 1f else ([\d.]+)f/d,
    note: 'graphicsLayer scaleX / scaleY around the tooltip center (the default TransformOrigin)',
  },
  {
    kind: 'fraction',
    name: `${P}-closed-opacity`,
    owner: 'TooltipBox',
    member: 'transition.animateFloat(alpha)',
    file: KT,
    pattern: /label = "tooltip transition: alpha",\n\s*\) \{\n\s*if \(it\) 1f else ([\d.]+)f/d,
  },
  {
    kind: 'motion',
    name: `${P}-scale`,
    owner: 'TooltipBox',
    member: 'scaleSpec',
    file: KT,
    pattern: /val scaleSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'showing and hiding (one updateTransition, interruptible)',
  },
  {
    kind: 'motion',
    name: `${P}-opacity`,
    owner: 'TooltipBox',
    member: 'alphaSpec',
    file: KT,
    pattern: /val alphaSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
  },
  {
    kind: 'ms',
    name: `${P}-duration`,
    owner: 'BasicTooltipDefaults',
    member: 'TooltipDuration',
    file: BASIC,
    pattern: /const val TooltipDuration = (\d+)L/d,
    note: 'TooltipState.show: a non-persistent tooltip shown with Default priority (programmatically, the accessibility long-click action) hides after this; shown by a long press or keyboard focus it stays at least this long, until the press ends or focus leaves; shown by mouse hover it stays while hovered',
  },
];

/** Wiring tooltip.css and the tooltip controller (m3e-elements tooltip-popup) assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'TooltipDefaults: the plain tooltip is PlainTooltipTokens (inverse surface, extra-small corners)',
    /plainTooltipContainerShape: Shape\n\s*@Composable get\(\) = PlainTooltipTokens\.ContainerShape\.value[\s\S]*?plainTooltipContainerColor: Color\n\s*@Composable get\(\) = PlainTooltipTokens\.ContainerColor\.value[\s\S]*?plainTooltipContentColor: Color\n\s*@Composable get\(\) = PlainTooltipTokens\.SupportingTextColor\.value[\s\S]*?richTooltipContainerShape: Shape\n\s*@Composable get\(\) = RichTooltipTokens\.ContainerShape\.value/,
  ],
  [
    KT,
    'richTooltipColors: container, text, title and action from RichTooltipTokens',
    /containerColor = fromToken\(RichTooltipTokens\.ContainerColor\),\n\s*contentColor = fromToken\(RichTooltipTokens\.SupportingTextColor\),\n\s*titleContentColor = fromToken\(RichTooltipTokens\.SubheadColor\),\n\s*actionContentColor = fromToken\(RichTooltipTokens\.ActionLabelTextColor\),/,
  ],
  [
    KT,
    'PlainTooltip: no elevation; sizeIn then the content padding; text PlainTooltipTokens.SupportingTextFont',
    /tonalElevation: Dp = 0\.dp,\n\s*shadowElevation: Dp = 0\.dp,\n\s*content: @Composable \(\) -> Unit,\n\) \{[\s\S]*?Modifier\.sizeIn\(\n\s*minWidth = TooltipMinWidth,\n\s*maxWidth = maxWidth,\n\s*minHeight = TooltipMinHeight,\n\s*\)\n\s*\.padding\(PlainTooltipContentPadding\)[\s\S]*?val textStyle = PlainTooltipTokens\.SupportingTextFont\.value/,
  ],
  [
    KT,
    'RichTooltip: title (SubheadFont, from baseline), text (SupportingTextFont), action (ActionLabelTextFont, min height, bottom padding) in a horizontally padded Column',
    /Column\(modifier = Modifier\.padding\(horizontal = RichTooltipHorizontalPadding\)\) \{\n\s*title\?\.let \{\n\s*Box\(modifier = Modifier\.paddingFromBaseline\(top = HeightToSubheadFirstLine\)\)[\s\S]*?LocalTextStyle provides subheadTextStyle,[\s\S]*?Box\(modifier = Modifier\.textVerticalPadding\(title != null, action != null\)\)[\s\S]*?LocalTextStyle provides supportingTextStyle,[\s\S]*?Modifier\.requiredHeightIn\(min = ActionLabelMinHeight\)\n\s*\.padding\(bottom = ActionLabelBottomPadding\)[\s\S]*?LocalTextStyle provides actionLabelTextStyle,/,
  ],
  [
    KT,
    'textVerticalPadding: 4dp alone; else baseline 24dp from the top and 16dp below',
    /return if \(!subheadExists && !actionExists\) \{\n\s*this\.padding\(vertical = PlainTooltipVerticalPadding\)\n\s*\} else \{\n\s*this\.paddingFromBaseline\(top = HeightFromSubheadToTextFirstLine\)\n\s*\.padding\(bottom = TextBottomPadding\)/,
  ],
  [
    KT,
    'DefaultTooltipCaretShape: a triangle, base on the edge, apex caretSize.height away',
    /moveTo\(x = 0f, 0f\)\n\s*lineTo\(x = caretWidthPx \/ 2, y = 0f\)\n\s*lineTo\(x = 0f, y = caretHeightPx\)\n\s*lineTo\(x = -caretWidthPx \/ 2, y = 0f\)/,
  ],
  [
    KT,
    'TooltipState: show() hides after TooltipDuration unless persistent or UserInput; dismiss() cancels only persistent jobs',
    /if \(isPersistent \|\| mutatePriority == MutatePriority\.UserInput\) \{\n\s*cancellableShow\(\)\n\s*\} else \{\n\s*withTimeout\(BasicTooltipDefaults\.TooltipDuration\) \{ cancellableShow\(\) \}\n\s*\}\n\s*\} finally \{\n\s*if \(mutatePriority != MutatePriority\.PreventUserInput\) \{/,
  ],
  [
    KT,
    'rememberTooltipState: not persistent by default; one global MutatorMutex',
    /public fun rememberTooltipState\(\n\s*initialIsVisible: Boolean = false,\n\s*isPersistent: Boolean = false,\n\s*mutatorMutex: MutatorMutex = BasicTooltipDefaults\.GlobalMutatorMutex,/,
  ],
  [
    BASIC,
    'gestures: touch / stylus long press shows (PreventUserInput) until released; mouse enter shows (UserInput), exit hides unless persistent',
    /if \(inputType == PointerType\.Touch \|\| inputType == PointerType\.Stylus\) \{[\s\S]*?state\.show\(MutatePriority\.PreventUserInput\)[\s\S]*?if \(!isLongPressed\) \{\n\s*state\.dismiss\(\)[\s\S]*?PointerEventType\.Enter -> \{\n\s*launch \{ state\.show\(MutatePriority\.UserInput\) \}\n\s*\}\n\s*PointerEventType\.Exit -> \{\n\s*if \(!state\.isPersistent\) \{\n\s*state\.dismiss\(\)/,
  ],
  [
    BASIC,
    'keyboard: focus shows (PreventUserInput), losing it hides; Tab moves into a tooltip with an action; Escape hides',
    /if \(it\.isFocused\) \{\n\s*receivedKeyboardFocus\.value = true\n\s*state\.show\(MutatePriority\.PreventUserInput\)\n\s*\}\n\s*if \(receivedKeyboardFocus\.value && state\.isVisible && !it\.isFocused\) \{[\s\S]*?if \(hasAction && it\.isTab\) \{\n\s*forceKeyboardFocusable\.value = true[\s\S]*?if \(it\.isEscape\) \{\n\s*receivedKeyboardFocus\.value = false\n\s*state\.dismiss\(\)/,
  ],
  [
    BASIC,
    'the popup: dismissed by a click outside it; not focusable unless forced; never clipped',
    /onDismissRequest = \{\n\s*if \(onDismissRequest == null\) \{\n\s*if \(state\.isVisible\) \{\n\s*scope\.launch \{ state\.dismiss\(\) \}[\s\S]*?properties = PopupProperties\(focusable = focusable, clippingEnabled = false\)/,
  ],
  [
    SAMPLES,
    'RichTooltipSample: persistent, a TextButton action that dismisses, hasAction',
    /val tooltipState = rememberTooltipState\(isPersistent = true\)[\s\S]*?action = \{\n\s*TextButton\(onClick = \{ scope\.launch \{ tooltipState\.dismiss\(\) \} \}\) \{[\s\S]*?hasAction = true,/,
  ],
];

/**
 * `sources`: vendored Material3 files and samples by name (Tooltip.kt, BasicTooltip.kt,
 * TooltipSamples.kt); `font`: Google Sans Flex's hhea metrics, for the rich tooltip's baselines.
 */
export function extractTooltipDefaults(
  sources: Readonly<Record<string, string>>,
  font: FontMetrics,
): TooltipDefault[] {
  return [
    ...extractLiterals('tooltip-defaults', TOOLTIP_DEFAULTS_SOURCES, RULES, CHECKS, sources),
    baselineShiftLiteral(
      `${P}-baseline-shift`,
      font,
      'a text baseline sits this × the font size below the middle of its line box: the rich tooltip places its title and text from HeightToSubheadFirstLine / HeightFromSubheadToTextFirstLine with it (tooltip.css)',
    ),
  ];
}
