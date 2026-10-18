// Values Compose's TextField / OutlinedTextField render (TextField.kt, OutlinedTextField.kt,
// TextFieldDefaults.kt, internal/TextFieldImpl.kt) that are not Filled/OutlinedTextFieldTokens, or
// that pick one of them:
// - the layout constants of TextFieldImpl (TextFieldPadding, the 12dp icon padding, the Above label
//   paddings, the supporting text padding, the prefix / suffix padding, the minimum line heights)
//   and TextField.kt's TextFieldWithLabelVerticalPadding; the outlined cutout's inner padding
//   (OutlinedTextField.kt OutlinedTextFieldInnerPadding) and the space reserved above an outlined
//   field for its cutout label (minimizedLabelHalfHeight = bodySmall line height / 2);
// - TextFieldDefaults / OutlinedTextFieldDefaults: MinHeight, MinWidth and the indicator / border
//   thicknesses (unfocused 1dp, focused 2dp);
// - the type styles CommonDecorationBox gives the label (lerp(bodyLarge, bodySmall, progress)),
//   placeholder, prefix / suffix (bodyLarge) and supporting text (bodySmall);
// - the motion: label progress FastSpatial, label color FastEffects, placeholder FastEffects out /
//   SlowEffects in, prefix / suffix FastEffects, indicator / border color FastEffects and thickness
//   FastSpatial, container color FastEffects;
// - defaultTextFieldColors / defaultOutlinedTextFieldColors (focused, unfocused, disabled, error
//   for every part; TextFieldColors has no hover, owner decision M8 #3). They differ from the token
//   files in places: the filled disabled container is ContainerColor (not DisabledContainerColor),
//   errors use the Error* (not ErrorFocus*) tokens, disabled colors are translucent copies;
// - the text selection color MaterialTheme provides (rememberTextSelectionColors: primary at
//   TextSelectionBackgroundOpacity).
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// text-field.css assumes (label float and positions, cutout, indicator, color selection, error
// semantics) changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type TextFieldDefault = ComposeLiteral;

const IMPL = 'TextFieldImpl.kt';
const FILLED = 'TextField.kt';
const OUTLINED = 'OutlinedTextField.kt';
const DEFAULTS = 'TextFieldDefaults.kt';
const THEME = 'MaterialTheme.kt';
const INTERACTIVE = 'InteractiveComponentSize.kt';
const STRINGS = 'Strings.kt';
const SAMPLES = 'TextFieldSamples.kt';

export const TEXT_FIELD_DEFAULTS_SOURCES = [
  IMPL,
  FILLED,
  OUTLINED,
  DEFAULTS,
  THEME,
  INTERACTIVE,
  STRINGS,
  SAMPLES,
];

const P = '--m3e-comp-text-field';

export const TEXT_FIELD_M3IO_PAGE =
  'm3.material.io Text fields › Specs (_dsm/content/m3/2026-10-13_06-10-19/8741ef66-1a80-4b39-adb1-66bea5e6992f.json, updated 2026-09-08): "Supporting text and character counter top padding 4dp", "Padding between supporting text and character counter 16dp"';

/** TextFieldColors parts: [CSS part, Compose member stem]. */
const PARTS: readonly [string, string][] = [
  ['text', 'TextColor'],
  ['container', 'ContainerColor'],
  ['indicator', 'IndicatorColor'],
  ['leading-icon', 'LeadingIconColor'],
  ['trailing-icon', 'TrailingIconColor'],
  ['label', 'LabelColor'],
  ['placeholder', 'PlaceholderColor'],
  ['supporting', 'SupportingTextColor'],
  ['prefix', 'PrefixColor'],
  ['suffix', 'SuffixColor'],
];

/** TextFieldColors states: [CSS suffix, Compose member prefix]. */
const STATES: readonly [string, string][] = [
  ['', 'unfocused'],
  ['-focused', 'focused'],
  ['-disabled', 'disabled'],
  ['-error', 'error'],
];

/**
 * One TextFieldColors member inside `anchor` (the colors function): `fromToken(T)`, its
 * `.copy(alpha = A)` (translucent) or `Color.Transparent`.
 */
function colorRules(variant: 'filled' | 'outlined', anchor: string): LiteralRule[] {
  const object = variant === 'filled' ? 'FilledTextFieldTokens' : 'OutlinedTextFieldTokens';
  const owner = variant === 'filled' ? 'TextFieldDefaults' : 'OutlinedTextFieldDefaults';
  const fn = variant === 'filled' ? 'defaultTextFieldColors' : 'defaultOutlinedTextFieldColors';
  const rules: LiteralRule[] = [];
  const add = (name: string, member: string) => {
    const token = `\\b${member} =\\s*fromToken\\((${object}\\.\\w+)\\)`;
    // The alpha form first (it starts like the plain one); then plain; then transparent.
    const text = `${anchor}[\\s\\S]*?`;
    rules.push({
      kind: 'alpha',
      name,
      owner,
      member: `${fn}(${member})`,
      file: DEFAULTS,
      pattern: new RegExp(`${text}${token}\\s*\\.copy\\(alpha = (${object}\\.\\w+)\\),`, 'd'),
    });
    rules.push({
      kind: 'token',
      name,
      owner,
      member: `${fn}(${member})`,
      file: DEFAULTS,
      pattern: new RegExp(`${text}${token},`, 'd'),
    });
    rules.push({
      kind: 'keyword',
      name,
      owner,
      member: `${fn}(${member})`,
      file: DEFAULTS,
      pattern: new RegExp(`${text}\\b${member} = (Color\\.Transparent),`, 'd'),
    });
  };
  for (const [part, stem] of PARTS) {
    for (const [suffix, state] of STATES)
      add(`${P}-${variant}-${part}-color${suffix}`, `${state}${stem}`);
  }
  add(`${P}-${variant}-cursor-color`, 'cursorColor');
  add(`${P}-${variant}-cursor-color-error`, 'errorCursorColor');
  return rules;
}

const FILLED_COLORS_ANCHOR = 'internal fun ColorScheme\\.defaultTextFieldColors\\(';
const OUTLINED_COLORS_ANCHOR = 'internal val ColorScheme\\.defaultOutlinedTextFieldColors';

const RULES: readonly LiteralRule[] = [
  // --- Layout (TextFieldImpl.kt, TextField.kt, OutlinedTextField.kt) -------------------------
  {
    kind: 'dp',
    name: `${P}-padding`,
    owner: IMPL,
    member: 'TextFieldPadding',
    file: IMPL,
    pattern: /internal val TextFieldPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'contentPaddingWithLabel / contentPaddingWithoutLabel start and end, contentPaddingWithoutLabel top and bottom, and the supporting text start / end',
  },
  {
    kind: 'dp',
    name: `${P}-label-vertical-padding`,
    owner: FILLED,
    member: 'TextFieldWithLabelVerticalPadding',
    file: FILLED,
    pattern: /internal val TextFieldWithLabelVerticalPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'contentPaddingWithLabel top and bottom (an Inside label): from the top to the minimized label, and below the input',
  },
  {
    kind: 'dp',
    name: `${P}-above-label-horizontal-padding`,
    owner: IMPL,
    member: 'AboveLabelHorizontalPadding',
    file: IMPL,
    pattern: /internal val AboveLabelHorizontalPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'TextFieldLabelPosition.Above: the label padding start / end (owner decision M8 #25)',
  },
  {
    kind: 'dp',
    name: `${P}-above-label-bottom-padding`,
    owner: IMPL,
    member: 'AboveLabelBottomPadding',
    file: IMPL,
    pattern: /internal val AboveLabelBottomPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'TextFieldLabelPosition.Above: between the label and the container',
  },
  {
    kind: 'dp',
    name: `${P}-supporting-top-padding`,
    owner: IMPL,
    member: 'SupportingTopPadding',
    file: IMPL,
    pattern: /internal val SupportingTopPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'TextFieldDefaults.supportingTextPadding(top); start / end are TextFieldPadding, bottom 0',
  },
  {
    kind: 'dp',
    name: `${P}-affix-padding`,
    owner: IMPL,
    member: 'PrefixSuffixTextPadding',
    file: IMPL,
    pattern: /internal val PrefixSuffixTextPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'between the prefix and the input, and between the input and the suffix',
  },
  {
    kind: 'dp',
    name: `${P}-min-text-line-height`,
    owner: IMPL,
    member: 'MinTextLineHeight',
    file: IMPL,
    pattern: /internal val MinTextLineHeight\n\s*get\(\) = (\d+)\.dp/d,
    note: 'heightIn(min) of the input, placeholder and prefix / suffix; the expanded label min height',
  },
  {
    kind: 'dp',
    name: `${P}-min-minimized-label-line-height`,
    owner: IMPL,
    member: 'MinFocusedLabelLineHeight',
    file: IMPL,
    pattern: /internal val MinFocusedLabelLineHeight\n\s*get\(\) = (\d+)\.dp/d,
    note: 'the minimized label min height (textFieldLabelMinHeight lerps MinTextLineHeight → this by the label progress)',
  },
  {
    kind: 'dp',
    name: `${P}-min-supporting-line-height`,
    owner: IMPL,
    member: 'MinSupportingTextLineHeight',
    file: IMPL,
    pattern: /internal val MinSupportingTextLineHeight\n\s*get\(\) = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-cutout-padding`,
    owner: OUTLINED,
    member: 'OutlinedTextFieldInnerPadding',
    file: OUTLINED,
    pattern: /private val OutlinedTextFieldInnerPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'outlineCutout: the notch is the label width × progress plus this on either side',
  },
  // --- TextFieldDefaults / OutlinedTextFieldDefaults -----------------------------------------
  {
    kind: 'dp',
    name: `${P}-min-height`,
    owner: 'TextFieldDefaults',
    member: 'MinHeight',
    file: DEFAULTS,
    pattern: /object TextFieldDefaults \{[\s\S]*?public val MinHeight: Dp = (\d+)\.dp/d,
    note: 'defaultMinSize(minHeight) of the decoration box (FilledTextFieldTokens has no ContainerHeight)',
  },
  {
    kind: 'dp',
    name: `${P}-min-width`,
    owner: 'TextFieldDefaults',
    member: 'MinWidth',
    file: DEFAULTS,
    pattern: /object TextFieldDefaults \{[\s\S]*?public val MinWidth: Dp = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-indicator-thickness`,
    owner: 'TextFieldDefaults',
    member: 'UnfocusedIndicatorThickness',
    file: DEFAULTS,
    pattern: /public val UnfocusedIndicatorThickness: Dp = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-indicator-thickness-focused`,
    owner: 'TextFieldDefaults',
    member: 'FocusedIndicatorThickness',
    file: DEFAULTS,
    pattern: /public val FocusedIndicatorThickness: Dp = (\d+)\.dp/d,
    note: 'only while focused and enabled (IndicatorLineNode); m3.material.io token DB focus thickness 3dp is not rendered',
  },
  {
    kind: 'dp',
    name: `${P}-outlined-min-height`,
    owner: 'OutlinedTextFieldDefaults',
    member: 'MinHeight',
    file: DEFAULTS,
    pattern: /object OutlinedTextFieldDefaults \{[\s\S]*?public val MinHeight: Dp = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-outlined-min-width`,
    owner: 'OutlinedTextFieldDefaults',
    member: 'MinWidth',
    file: DEFAULTS,
    pattern: /object OutlinedTextFieldDefaults \{[\s\S]*?public val MinWidth: Dp = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-outline-thickness`,
    owner: 'OutlinedTextFieldDefaults',
    member: 'UnfocusedBorderThickness',
    file: DEFAULTS,
    pattern: /public val UnfocusedBorderThickness: Dp = (\d+)\.dp/d,
  },
  {
    kind: 'dp',
    name: `${P}-outline-thickness-focused`,
    owner: 'OutlinedTextFieldDefaults',
    member: 'FocusedBorderThickness',
    file: DEFAULTS,
    pattern: /public val FocusedBorderThickness: Dp = (\d+)\.dp/d,
    note: 'only while focused and enabled (animateBorderStrokeAsState); Modifier.border draws inside the bounds',
  },
  // --- Type styles (CommonDecorationBox, DecoratedLabel) --------------------------------------
  {
    kind: 'type',
    name: `${P}-label-expanded`,
    owner: 'DecoratedLabel',
    member: 'lerp(bodyLarge, bodySmall, labelProgress)',
    file: IMPL,
    pattern: /val bodyLarge = typography\.(bodyLarge)\n/d,
    note: 'the label TextStyle at progress 0 (expanded); TextStyle.lerp interpolates size, line height and tracking',
  },
  {
    kind: 'type',
    name: `${P}-label-minimized`,
    owner: 'DecoratedLabel',
    member: 'lerp(bodyLarge, bodySmall, labelProgress)',
    file: IMPL,
    pattern: /val bodySmall = typography\.(bodySmall)\n/d,
    note: 'the label TextStyle at progress 1 (minimized: focused, not empty, or Above)',
  },
  {
    kind: 'type',
    name: `${P}-placeholder`,
    owner: 'CommonDecorationBox',
    member: 'decoratedPlaceholder(textStyle)',
    file: IMPL,
    pattern: /contentColor = placeholderColor,\n\s*textStyle = (bodyLarge),/d,
  },
  {
    kind: 'type',
    name: `${P}-affix`,
    owner: 'CommonDecorationBox',
    member: 'decoratedPrefix / decoratedSuffix(textStyle)',
    file: IMPL,
    pattern: /Decoration\(contentColor = prefixColor, textStyle = (bodyLarge), content = prefix\)/d,
  },
  {
    kind: 'type',
    name: `${P}-supporting`,
    owner: 'CommonDecorationBox',
    member: 'decoratedSupporting(textStyle)',
    file: IMPL,
    pattern:
      /Decoration\(contentColor = supportingTextColor, textStyle = (bodySmall), content = it\)/d,
  },
  // --- Motion ------------------------------------------------------------------------------
  {
    kind: 'motion',
    name: `${P}-label`,
    owner: IMPL,
    member: 'labelProgress',
    file: IMPL,
    pattern:
      /private fun Transition<InputPhase>\.labelProgress\(showExpandedLabel: Boolean\): State<Float> \{\n\s*val labelTransitionSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'the label progress 0 → 1: its position and TextStyle (and the outlined cutout width); overshoots under the expressive scheme',
  },
  {
    kind: 'motion',
    name: `${P}-label-color`,
    owner: IMPL,
    member: 'labelContentColor',
    file: IMPL,
    pattern:
      /private fun Transition<InputPhase>\.labelContentColor\(labelColor: Color\): State<Color> \{\n\s*val colorTransitionSpec = MotionSchemeKeyTokens\.(\w+)\.value<Color>\(\)/d,
  },
  {
    kind: 'motion',
    name: `${P}-placeholder-out`,
    owner: IMPL,
    member: 'placeholderOpacity(Focused → UnfocusedEmpty)',
    file: IMPL,
    pattern:
      /private fun Transition<InputPhase>\.placeholderOpacity\(showExpandedLabel: Boolean\): State<Float> \{\n\s*val fastOpacityTransitionSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'the placeholder fades out (focused → unfocused and empty, with an expanded label)',
  },
  {
    kind: 'motion',
    name: `${P}-placeholder-in`,
    owner: IMPL,
    member: 'placeholderOpacity(UnfocusedEmpty → Focused)',
    file: IMPL,
    pattern: /val slowOpacityTransitionSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'the placeholder fades in (unfocused and empty → focused)',
  },
  {
    kind: 'motion',
    name: `${P}-affix-alpha`,
    owner: IMPL,
    member: 'affixOpacity',
    file: IMPL,
    pattern:
      /private fun Transition<InputPhase>\.affixOpacity\(showExpandedLabel: Boolean\): State<Float> \{\n\s*val fastOpacityTransitionSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'prefix / suffix opacity: shown while the label is minimized',
  },
  {
    kind: 'motion',
    name: `${P}-indicator-color`,
    owner: 'IndicatorLineNode',
    member: 'colorAnimatable',
    file: FILLED,
    pattern: /fromToken<Color>\(MotionSchemeKeyTokens\.(\w+)\)/d,
    note: 'filled indicator color; the outlined border color too (animateBorderStrokeAsState, FastEffects); snaps while disabled',
  },
  {
    kind: 'motion',
    name: `${P}-indicator-width`,
    owner: 'IndicatorLineNode',
    member: 'widthAnimatable',
    file: FILLED,
    pattern: /fromToken<Dp>\(MotionSchemeKeyTokens\.(\w+)\)/d,
    note: 'filled indicator thickness; the outlined border thickness too (animateBorderStrokeAsState, FastSpatial); snaps while disabled',
  },
  {
    kind: 'motion',
    name: `${P}-container-color`,
    owner: 'TextFieldDefaults',
    member: 'Container(containerColor)',
    file: DEFAULTS,
    pattern:
      /targetValue = colors\.containerColor\(enabled, isError, focused\),\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
  },
  // --- Colors -------------------------------------------------------------------------------
  ...colorRules('filled', FILLED_COLORS_ANCHOR),
  ...colorRules('outlined', OUTLINED_COLORS_ANCHOR),
];

/** Wiring text-field.css assumes. */
const CHECKS: readonly LiteralCheck[] = [
  [
    IMPL,
    'input phases: focused, unfocused empty, unfocused not empty',
    /isFocused -> InputPhase\.Focused\n\s*visualText\.isEmpty\(\) -> InputPhase\.UnfocusedEmpty\n\s*else -> InputPhase\.UnfocusedNotEmpty/,
  ],
  [
    IMPL,
    'label progress: 1 focused or not empty; 0 unfocused and empty only when the label can expand',
    /InputPhase\.Focused -> 1f\n\s*InputPhase\.UnfocusedEmpty -> if \(showExpandedLabel\) 0f else 1f\n\s*InputPhase\.UnfocusedNotEmpty -> 1f/,
  ],
  [
    IMPL,
    'the label TextStyle is lerp(bodyLarge, bodySmall, progress)',
    /lerp\(bodyLarge, bodySmall, labelProgress\?\.value \?: 1f\)/,
  ],
  [
    IMPL,
    'Above is never expanded (showExpandedLabel false)',
    /is TextFieldLabelPosition\.Inside -> !isAlwaysMinimized\n\s*is TextFieldLabelPosition\.Cutout -> !isAlwaysMinimized\n[\s\S]*?else -> false/,
  ],
  [
    IMPL,
    'the placeholder only while the text is empty, at its own opacity',
    /if \(placeholder != null && visualText\.isEmpty\(\) && showPlaceholder\)/,
  ],
  [
    IMPL,
    'the label min height lerps MinTextLineHeight → MinFocusedLabelLineHeight',
    /lerpDp\(MinTextLineHeight, MinFocusedLabelLineHeight, labelProgress\(\)\)/,
  ],
  [
    IMPL,
    'icons sit in a minimum interactive size box; the text starts TextFieldPadding − the icon padding after them',
    /Modifier\.layoutId\(LeadingId\)\.minimumInteractiveComponentSize\(\)[\s\S]*?\(startTextFieldPadding - horizontalIconPadding\)\.coerceAtLeast\(0\.dp\)/,
  ],
  [
    IMPL,
    'textFieldHorizontalIconPadding = (minimum interactive size − SmallIconButtonTokens.IconSize) / 2',
    /return \(\(interactiveSize - SmallIconButtonTokens\.IconSize\) \/ 2\)\.coerceAtLeast\(0\.dp\)/,
  ],
  [
    IMPL,
    'prefix: start padding + PrefixSuffixTextPadding; suffix: PrefixSuffixTextPadding + end padding',
    /\.padding\(start = startPadding, end = PrefixSuffixTextPadding\)[\s\S]*?\.padding\(start = PrefixSuffixTextPadding, end = endPadding\)/,
  ],
  [
    IMPL,
    'Above label: horizontal and bottom paddings; Inside label: the text start / end padding',
    /Modifier\.padding\(\n\s*start = AboveLabelHorizontalPadding,\n\s*end = AboveLabelHorizontalPadding,\n\s*bottom = AboveLabelBottomPadding,\n\s*\)\n\s*\} else \{\n\s*Modifier\.padding\(start = startPadding, end = endPadding\)/,
  ],
  [
    IMPL,
    'filled label: expanded centred (single line) or top padding + half the minimized line height (multi-line); minimized at the top padding; Above at 0',
    /isLabelAbove -> 0\n\s*singleLine ->\n\s*Alignment\.CenterVertically\.align\(labelPlaceable\.height, height\)\n\s*else ->[\s\S]*?topPaddingValue \+ minimizedLabelHalfHeight\.roundToPx\(\)\n\s*\}\n\s*val labelEndY =\n\s*when \{\n\s*isLabelAbove -> 0\n\s*else -> topPaddingValue/,
  ],
  [
    IMPL,
    'filled text below the label: top padding + the label height',
    /textPosition =\n\s*topPaddingValue \+ \(if \(isLabelAbove\) 0 else labelPlaceable\.height\),/,
  ],
  [
    IMPL,
    'outlined label: minimized centred on the top edge (−height / 2)',
    /val endY =\n\s*when \{\n\s*isLabelAbove -> 0\n\s*else -> -\(it\.height \/ 2\)/,
  ],
  [
    IMPL,
    'outlined label x: expanded after the leading icon (+ padding − icon padding), minimized at the start padding',
    /leadingPlaceable\.width \+ \(startPadding - iconPadding\)\.coerceAtLeast\(0f\)[\s\S]*?\) \+ leftIconPlusPadding\n[\s\S]*?\) \+ leftPadding\n\s*val positionX = lerpInt\(startX, endX, labelProgress\)/,
  ],
  [
    IMPL,
    'cutout width = the measured label size × progress',
    /val labelWidth = it\.width \* progress\n\s*val labelHeight = it\.height \* progress/,
  ],
  [
    IMPL,
    'Cutout adds half the minimized label line height above the field',
    /if \(hasLabel && labelPosition is TextFieldLabelPosition\.Cutout\) \{[\s\S]*?\.padding\(top = minimizedLabelHalfHeight\(\)\)/,
  ],
  [
    IMPL,
    'minimizedLabelHalfHeight = bodySmall line height / 2',
    /val compositionLocalValue = MaterialTheme\.typography\.bodySmall\.lineHeight[\s\S]*?value\.toDp\(\) \/ 2/,
  ],
  [
    IMPL,
    'error semantics: the default error message when isError',
    /internal fun Modifier\.defaultErrorSemantics\(\n\s*isError: Boolean,\n\s*defaultErrorMessage: String,\n\s*\): Modifier = if \(isError\) semantics \{ error\(defaultErrorMessage\) \} else this/,
  ],
  [
    IMPL,
    'border: color FastEffects, thickness FastSpatial, both snap while disabled',
    /val indicatorColor =\n\s*if \(enabled\) \{\n\s*animateColorAsState\(targetColor, colorAnimationSpec\)\n\s*\} else \{\n\s*rememberUpdatedState\(targetColor\)[\s\S]*?val thicknessAnimationSpec = MotionSchemeKeyTokens\.FastSpatial\.value<Dp>\(\)[\s\S]*?val targetThickness = if \(focused\) focusedBorderThickness else unfocusedBorderThickness/,
  ],
  [
    FILLED,
    'TextField: Inside label by default, default error semantics, MinWidth × MinHeight',
    /labelPosition: TextFieldLabelPosition = TextFieldLabelPosition\.Inside\(\),[\s\S]*?\.defaultErrorSemantics\(isError, getString\(Strings\.DefaultErrorMessage\)\)\n\s*\.defaultMinSize\(\n\s*minWidth = TextFieldDefaults\.MinWidth,\n\s*minHeight = TextFieldDefaults\.MinHeight,/,
  ],
  [
    FILLED,
    'the indicator line: at the bottom, as thick as the animated width, clipped to the shape, drawn over the content',
    /top = size\.height - strokeWidth,[\s\S]*?val clippedLine = linePath and textFieldShapePath\n\s*\n\s*onDrawWithContent \{\n\s*drawContent\(\)\n\s*drawPath/,
  ],
  [
    FILLED,
    'the indicator is focused only while enabled',
    /if \(focused && enabled\) focusedIndicatorWidth else unfocusedIndicatorWidth/,
  ],
  [
    OUTLINED,
    'OutlinedTextField: Cutout label by default, default error semantics, MinWidth × MinHeight',
    /labelPosition: TextFieldLabelPosition = TextFieldLabelPosition\.Cutout\(\),[\s\S]*?\.defaultErrorSemantics\(isError, getString\(Strings\.DefaultErrorMessage\)\)\n\s*\.defaultMinSize\(\n\s*minWidth = OutlinedTextFieldDefaults\.MinWidth,\n\s*minHeight = OutlinedTextFieldDefaults\.MinHeight,/,
  ],
  [
    OUTLINED,
    'the cutout: from the label start − inner padding to its end + inner padding, label height × progress around the top edge, only while the width is positive',
    /if \(labelWidth > 0f\) \{[\s\S]*?val left = \(labelCenter - \(labelWidth \/ 2\) - innerPadding\)\.coerceAtLeast\(0f\)\n\s*val right = \(labelCenter \+ \(labelWidth \/ 2\) \+ innerPadding\)\.coerceAtMost\(size\.width\)[\s\S]*?clipRect\(left, -labelHeight \/ 2, right, labelHeight \/ 2, ClipOp\.Difference\)/,
  ],
  [
    DEFAULTS,
    'content padding: with label only for an Inside label',
    /if \(label != null && labelPosition\.normalize\(\) is TextFieldLabelPosition\.Inside\) \{\n\s*contentPaddingWithLabel\(\)/,
  ],
  [
    DEFAULTS,
    'supporting text padding: TextFieldPadding start / end, SupportingTopPadding top, 0 bottom',
    /internal fun supportingTextPadding\(\n\s*start: Dp = TextFieldPadding,\n\s*top: Dp = SupportingTopPadding,\n\s*end: Dp = TextFieldPadding,\n\s*bottom: Dp = 0\.dp,/,
  ],
  [
    DEFAULTS,
    'TextFieldColors: disabled, then error, then focused, then unfocused (no hover)',
    /public fun labelColor\(enabled: Boolean, isError: Boolean, focused: Boolean\): Color =\n\s*when \{\n\s*!enabled -> disabledLabelColor\n\s*isError -> errorLabelColor\n\s*focused -> focusedLabelColor\n\s*else -> unfocusedLabelColor/,
  ],
  [
    DEFAULTS,
    'the outlined container: border over the background',
    /\.border\(borderStroke\.value, shape\)\n\s*\.textFieldBackground\(containerColor::value, shape\)/,
  ],
  [
    THEME,
    'the text selection: primary at TextSelectionBackgroundOpacity',
    /backgroundColor = primaryColor\.copy\(alpha = TextSelectionBackgroundOpacity\),/,
  ],
  [STRINGS, 'Strings.DefaultErrorMessage exists', /val DefaultErrorMessage: Strings/],
  [
    SAMPLES,
    'TextFieldWithErrorState: the counter beside the message in the supporting row; "*" on the label',
    /label = \{ Text\(if \(isError\) "Username\*" else "Username"\) \},\n\s*supportingText = \{\n\s*Row \{\n\s*Text\(if \(isError\) errorMessage else "", Modifier\.weight\(1f\)[\s\S]*?Text\("Limit: \$\{state\.text\.length\}\/\$charLimit"\)/,
  ],
];

/** Keeps the first rule that matches for each name (alpha, then token, then transparent). */
function firstPerName(
  label: string,
  rules: readonly LiteralRule[],
  sources: Readonly<Record<string, string>>,
): LiteralRule[] {
  const seen = new Set<string>();
  const out: LiteralRule[] = [];
  for (const rule of rules) {
    // Only the TextFieldColors members have alternative rules (alpha / token / transparent).
    const colorRule = rule.member.includes('TextFieldColors(');
    if (colorRule && seen.has(rule.name)) continue;
    const text = sources[rule.file]?.replace(/\r\n/g, '\n') ?? '';
    // A color rule matches only inside its own colors function (the next function ends it).
    if (colorRule) {
      const m = rule.pattern.exec(text);
      if (!m) continue;
      const span = m[0];
      if (/\n\s*internal (fun|val) /.test(span.slice(span.indexOf('\n')))) continue;
    } else if (!rule.pattern.test(text)) continue;
    seen.add(rule.name);
    out.push(rule);
  }
  for (const rule of rules) {
    if (!seen.has(rule.name))
      throw new Error(`${label}: ${rule.owner}.${rule.member} not found (changed upstream?)`);
  }
  return out;
}

/** `sources`: vendored Material3 files and samples by name. */
export function extractTextFieldDefaults(
  sources: Readonly<Record<string, string>>,
): TextFieldDefault[] {
  const label = 'text-field-defaults';
  const rules = firstPerName(label, RULES, sources);
  const out = extractLiterals(label, TEXT_FIELD_DEFAULTS_SOURCES, rules, CHECKS, sources);
  const text = (file: string) => sources[file]!.replace(/\r\n/g, '\n');
  const lineOf = (file: string, pattern: RegExp) => {
    const m = pattern.exec(text(file));
    if (!m) throw new Error(`${file}: ${String(pattern)} not found (changed upstream?)`);
    return text(file).slice(0, m.index).split('\n').length;
  };
  // Derived values the CSS reads, written as expressions of their generated inputs.
  out.push(
    {
      name: `${P}-icon-padding`,
      value:
        'calc((var(--m3e-comp-minimum-interactive-component-size) - var(--m3e-comp-small-icon-button-icon-size)) / 2)',
      js: 'calc((var(--m3e-comp-minimum-interactive-component-size) - var(--m3e-comp-small-icon-button-icon-size)) / 2)',
      raw: '((LocalMinimumInteractiveComponentSize - SmallIconButtonTokens.IconSize) / 2).coerceAtLeast(0.dp)',
      owner: IMPL,
      member: 'textFieldHorizontalIconPadding',
      file: IMPL,
      line: lineOf(IMPL, /internal fun textFieldHorizontalIconPadding\(\): Dp \{/),
      note: 'the 24dp icons sit in a 48dp box: the text starts TextFieldPadding − this after it (12dp)',
    },
    {
      name: `${P}-cutout-label-space`,
      value: 'calc(var(--m3e-sys-typescale-body-small-line-height) / 2)',
      js: 'calc(var(--m3e-sys-typescale-body-small-line-height) / 2)',
      raw: 'MaterialTheme.typography.bodySmall.lineHeight / 2',
      owner: IMPL,
      member: 'minimizedLabelHalfHeight',
      file: IMPL,
      line: lineOf(IMPL, /internal fun minimizedLabelHalfHeight\(\): Dp \{/),
      note: 'topPaddingForLabelCutout: the space above an outlined field with a Cutout label, for the half of the minimized label above the outline',
    },
    {
      name: `${P}-selection-color`,
      value: 'color-mix(in srgb, var(--m3e-sys-color-primary) calc(0.4 * 100%), transparent)',
      js: 'color-mix(in srgb, var(--m3e-sys-color-primary) calc(0.4 * 100%), transparent)',
      raw: 'primary.copy(alpha = TextSelectionBackgroundOpacity 0.4f)',
      owner: THEME,
      member: 'rememberTextSelectionColors(backgroundColor)',
      file: THEME,
      line: lineOf(
        THEME,
        /backgroundColor = primaryColor\.copy\(alpha = TextSelectionBackgroundOpacity\)/,
      ),
      note: 'LocalTextSelectionColors from MaterialTheme (TextFieldColors.textSelectionColors); the selection highlight (::selection)',
    },
  );
  // The character counter is not a Compose slot (TextFieldWithErrorState puts "Limit: n/max" in a
  // supporting Row); m3.material.io gives its spacing.
  out.push({
    name: `${P}-counter-space`,
    value: '16px',
    js: 16,
    raw: 'Padding between supporting text and character counter 16dp',
    owner: 'm3.material.io',
    member: 'Padding between supporting text and character counter',
    file: 'm3.material.io',
    line: 0,
    cite: TEXT_FIELD_M3IO_PAGE,
    note: 'the counter (owner rule: build what Compose lacks per m3.material.io) at the end of the supporting line',
  });
  // The selection opacity itself must still be 0.4f.
  if (!text(THEME).includes('internal const val TextSelectionBackgroundOpacity = 0.4f'))
    throw new Error(`${THEME}: TextSelectionBackgroundOpacity changed upstream`);
  return out;
}
