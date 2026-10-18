// Values Compose's snackbars render (Snackbar.kt, SnackbarHost.kt, Scaffold.kt) that are not in
// SnackbarTokens, or that pick one of them:
// - the layout literals of the isSnackbarStylingFixEnabled = true branch (owner decision M9 #19;
//   the pin ships the flag off, whose legacy layouts place the text from its baseline but give the
//   same 48 / 68dp for the one or two lines m3.material.io allows): ContainerMaxWidth 600dp,
//   HorizontalSpacing 16dp before the text, SnackbarVerticalPadding 14dp above and below it,
//   TextEndExtraSpacing 8dp (after the text and at the end when there is no dismiss action), and
//   for an action on its own line HorizontalSpacing 16dp after the text, HorizontalSpacingButtonSide
//   8dp after the buttons without a dismiss action and ActionButtonBottomPadding 4dp below them;
// - Snackbar(snackbarData): the 12dp padding around each snackbar a SnackbarHost shows;
// - SnackbarDuration.toMillis: Short 4000ms, Long 10000ms (Indefinite never times out);
// - FadeInFadeOutWithScale: alpha 0 ↔ 1 on FastEffects, scale 0.8 ↔ 1 on FastSpatial, around the
//   snackbar's center;
// - Scaffold: FabSpacing 16dp (between a FAB and what is below it; the snackbar host sits above the
//   FAB) and, with no FAB or bottom bar, the host on the bottom window inset only (the m3e host's
//   offset custom property, owner decision M9 #21).
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// snackbar.css and the m3e-elements snackbar host assume changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type SnackbarDefault = ComposeLiteral;

const KT = 'Snackbar.kt';
const HOST = 'SnackbarHost.kt';
const SCAFFOLD = 'Scaffold.kt';
const FLAGS = 'ComposeMaterial3Flags.kt';
const SAMPLES = 'ScaffoldSamples.kt';

export const SNACKBAR_DEFAULTS_SOURCES = [KT, HOST, SCAFFOLD, FLAGS, SAMPLES];

const P = '--m3e-comp-snackbar';

/** `private val <member>\n    get() = <n>.dp` (Snackbar.kt / Scaffold.kt layout literals). */
const getter = (member: string) =>
  new RegExp(`private val ${member}\\n\\s*get\\(\\) = (\\d+)\\.dp`, 'd');

const RULES: readonly LiteralRule[] = [
  {
    kind: 'dp',
    name: `${P}-container-max-width`,
    owner: KT,
    member: 'ContainerMaxWidth',
    file: KT,
    pattern: getter('ContainerMaxWidth'),
    note: 'OneRowSnackbar: the row inside the paddings is min(available, this) wide, so the snackbar is this + 16dp + its end padding; NewLineButtonSnackbar: widthIn(max) before its start padding, so the snackbar is at most this',
  },
  {
    kind: 'dp',
    name: `${P}-padding-start`,
    owner: KT,
    member: 'HorizontalSpacing',
    file: KT,
    pattern: getter('HorizontalSpacing'),
    note: 'before the text (both layouts); after the text when the action is on its own line',
  },
  {
    kind: 'dp',
    name: `${P}-text-padding-vertical`,
    owner: KT,
    member: 'SnackbarVerticalPadding',
    file: KT,
    pattern: getter('SnackbarVerticalPadding'),
    note: 'isSnackbarStylingFixEnabled layouts: above and below the text (one line: 14 + 20 + 14 = SingleLineContainerHeight, two lines: 14 + 40 + 14 = TwoLinesContainerHeight)',
  },
  {
    kind: 'dp',
    name: `${P}-text-end-spacing`,
    owner: KT,
    member: 'TextEndExtraSpacing',
    file: KT,
    pattern: getter('TextEndExtraSpacing'),
    note: 'OneRowSnackbar without a dismiss action: between the text and the action, and the row’s end padding (0 with a dismiss action: its 48dp target reaches the end)',
  },
  {
    kind: 'dp',
    name: `${P}-new-line-actions-padding-end`,
    owner: KT,
    member: 'HorizontalSpacingButtonSide',
    file: KT,
    pattern: getter('HorizontalSpacingButtonSide'),
    note: 'NewLineButtonSnackbar: after the end-aligned buttons when there is no dismiss action',
  },
  {
    kind: 'dp',
    name: `${P}-new-line-actions-padding-bottom`,
    owner: KT,
    member: 'ActionButtonBottomPadding',
    file: KT,
    pattern: getter('ActionButtonBottomPadding'),
    note: 'NewLineButtonSnackbar: below the buttons',
  },
  {
    kind: 'dp',
    name: `${P}-margin`,
    owner: 'Snackbar(snackbarData)',
    member: 'modifier.padding',
    file: KT,
    pattern: /modifier = modifier\.padding\((\d+)\.dp\),\n\s*action = actionComposable,/d,
    note: 'around each snackbar a SnackbarHost shows (inside the scale / fade layer)',
  },
  {
    kind: 'ms',
    name: `${P}-duration-short`,
    owner: 'SnackbarDuration.toMillis',
    member: 'Short',
    file: HOST,
    pattern: /SnackbarDuration\.Short -> (\d+)L/d,
    note: 'showSnackbar’s default without an action label; scaled by Android’s AccessibilityManager.calculateRecommendedTimeoutMillis (no web equivalent: the m3e host pauses while hovered or focused, owner decision M9 #20)',
  },
  {
    kind: 'ms',
    name: `${P}-duration-long`,
    owner: 'SnackbarDuration.toMillis',
    member: 'Long',
    file: HOST,
    pattern: /SnackbarDuration\.Long -> (\d+)L/d,
    note: 'SnackbarDuration.Long (Indefinite, showSnackbar’s default with an action label, never times out)',
  },
  {
    kind: 'fraction',
    name: `${P}-closed-scale`,
    owner: 'FadeInFadeOutWithScale',
    member: 'animatedScale',
    file: HOST,
    pattern: /scale\.animateTo\(if \(visible\) 1f else ([\d.]+)f/d,
    note: 'graphicsLayer scaleX / scaleY around the snackbar center (the default TransformOrigin), in and out',
  },
  {
    kind: 'fraction',
    name: `${P}-closed-opacity`,
    owner: 'FadeInFadeOutWithScale',
    member: 'animatedOpacity',
    file: HOST,
    pattern: /alpha\.animateTo\(if \(visible\) 1f else ([\d.]+)f/d,
    note: 'the outgoing snackbar is removed once its alpha reaches this (onAnimationFinish)',
  },
  {
    kind: 'motion',
    name: `${P}-scale`,
    owner: 'FadeInFadeOutWithScale',
    member: 'animatedScale(animation)',
    file: HOST,
    pattern:
      /val scale =\n\s*animatedScale\(\n(?:\s*\/\/.*\n)*\s*animation = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
  },
  {
    kind: 'motion',
    name: `${P}-opacity`,
    owner: 'FadeInFadeOutWithScale',
    member: 'animatedOpacity(animation)',
    file: HOST,
    pattern:
      /val opacity =\n\s*animatedOpacity\(\n\s*animation = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
  },
  {
    kind: 'dp',
    name: `${P}-host-fab-spacing`,
    owner: SCAFFOLD,
    member: 'FabSpacing',
    file: SCAFFOLD,
    pattern: getter('FabSpacing'),
    note: 'Scaffold: the FAB sits this far above the bottom bar / window bottom and the snackbar host right above the FAB, so a host above a FAB is offset FAB height + this (+ the bottom bar)',
  },
];

/** Wiring snackbar.css and the snackbar host (m3e-elements snackbar-layout) assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    FLAGS,
    'isSnackbarStylingFixEnabled defaults to false at the pin (owner decision M9 #19 builds the true branch)',
    /public var isSnackbarStylingFixEnabled: Boolean = false/,
  ],
  [
    KT,
    'Snackbar: a Surface in SnackbarDefaults’ shape and colors with a ContainerElevation shadow; SupportingTextFont / ActionLabelTextFont',
    /Surface\(\n\s*modifier = modifier,\n\s*shape = shape,\n\s*color = containerColor,\n\s*contentColor = contentColor,\n\s*shadowElevation = SnackbarTokens\.ContainerElevation,\n\s*\) \{\n\s*val textStyle = SnackbarTokens\.SupportingTextFont\.value\n\s*val actionTextStyle = SnackbarTokens\.ActionLabelTextFont\.value/,
  ],
  [
    KT,
    'Snackbar: the flag picks NewLineButtonSnackbar / OneRowSnackbar (else the Legacy* layouts)',
    /actionOnNewLine && action != null ->\n\s*if \(ComposeMaterial3Flags\.isSnackbarStylingFixEnabled\) \{\n\s*NewLineButtonSnackbar\([\s\S]*?\} else \{\n\s*LegacyNewLineButtonSnackbar\([\s\S]*?else ->\n\s*if \(ComposeMaterial3Flags\.isSnackbarStylingFixEnabled\) \{\n\s*OneRowSnackbar\([\s\S]*?\} else \{\n\s*LegacyOneRowSnackbar\(/,
  ],
  [
    KT,
    'SnackbarDefaults: container inverse surface, text inverse on surface, action inverse primary, dismiss icon color',
    /public val shape: Shape\n\s*@Composable get\(\) = SnackbarTokens\.ContainerShape\.value[\s\S]*?public val color: Color\n\s*@Composable get\(\) = SnackbarTokens\.ContainerColor\.value[\s\S]*?public val contentColor: Color\n\s*@Composable get\(\) = SnackbarTokens\.SupportingTextColor\.value[\s\S]*?public val actionColor: Color\n\s*@Composable get\(\) = SnackbarTokens\.ActionLabelTextColor\.value[\s\S]*?public val dismissActionContentColor: Color\n\s*@Composable get\(\) = SnackbarTokens\.IconColor\.value/,
  ],
  [
    KT,
    'Snackbar(snackbarData): the action is a TextButton (actionColor) that performs the action; the dismiss action an IconButton(Close) named Strings.SnackbarDismiss in a TooltipBox above it (owner decision M9 #30)',
    /TextButton\(\n\s*colors = ButtonDefaults\.textButtonColors\(contentColor = actionColor\),\n\s*onClick = \{ snackbarData\.performAction\(\) \},[\s\S]*?val contentDescription = getString\(Strings\.SnackbarDismiss\)\n\s*TooltipBox\(\n\s*positionProvider =\n\s*TooltipDefaults\.rememberTooltipPositionProvider\(\n\s*TooltipAnchorPosition\.Above\n\s*\),\n\s*tooltip = \{\n\s*PlainTooltipInternal\(contentDescription\) \{ Text\(contentDescription\) \}\n\s*\},\n\s*state = rememberTooltipState\(\),\n\s*\) \{\n\s*IconButton\(\n\s*onClick = \{ snackbarData\.dismiss\(\) \},\n\s*content = \{\n\s*Icon\(Icons\.Filled\.Close, contentDescription = contentDescription\)/,
  ],
  [
    KT,
    'OneRowSnackbar: start HorizontalSpacing, end TextEndExtraSpacing without a dismiss action; text padded SnackbarVerticalPadding',
    /private fun OneRowSnackbar\([\s\S]*?Box\(Modifier\.layoutId\(textTag\)\.padding\(vertical = SnackbarVerticalPadding\)\) \{ text\(\) \}[\s\S]*?Modifier\.padding\(\n\s*start = HorizontalSpacing,\n\s*end = if \(dismissAction == null\) TextEndExtraSpacing else 0\.dp,\n\s*\),/,
  ],
  [
    KT,
    'OneRowSnackbar: the row is min(max width, ContainerMaxWidth) wide; text max width = row − action − dismiss (− TextEndExtraSpacing without dismiss); height = max(SingleLineContainerHeight, children); all centered vertically; action then dismiss at the end',
    /val minContainerHeight = SnackbarTokens\.SingleLineContainerHeight\.roundToPx\(\)\n\s*val containerWidth = min\(constraints\.maxWidth, ContainerMaxWidth\.roundToPx\(\)\)[\s\S]*?val extraSpacingWidth = if \(dismissButtonWidth == 0\) TextEndExtraSpacing\.roundToPx\(\) else 0\n\s*val textMaxWidth =\n\s*\(containerWidth - actionButtonWidth - dismissButtonWidth - extraSpacingWidth\)[\s\S]*?maxOf\(\n\s*minContainerHeight,\n\s*textPlaceable\.height,\n\s*actionButtonPlaceable\?\.height \?: 0,\n\s*dismissButtonPlaceable\?\.height \?: 0,\n\s*\)\n\n\s*val dismissButtonPlaceX = containerWidth - dismissButtonWidth\n\s*val actionButtonPlaceX = dismissButtonPlaceX - actionButtonWidth\n\n\s*layout\(containerWidth, containerHeight\) \{\n\s*textPlaceable\.placeRelative\(0, \(containerHeight - textPlaceable\.height\) \/ 2\)/,
  ],
  [
    KT,
    'NewLineButtonSnackbar: widthIn(ContainerMaxWidth), start HorizontalSpacing; text padded SnackbarVerticalPadding and HorizontalSpacing at its end; the buttons end-aligned, ActionButtonBottomPadding below, HorizontalSpacingButtonSide after them without dismiss',
    /private fun NewLineButtonSnackbar\([\s\S]*?Modifier\.widthIn\(max = ContainerMaxWidth\)\n\s*\.fillMaxWidth\(\)\n\s*\.padding\(start = HorizontalSpacing\)[\s\S]*?\.padding\(vertical = SnackbarVerticalPadding\)\n\s*\.padding\(end = HorizontalSpacing\)[\s\S]*?Modifier\.align\(Alignment\.End\)\n\s*\.padding\(\n\s*bottom = ActionButtonBottomPadding,\n\s*end = if \(dismissAction == null\) HorizontalSpacingButtonSide else 0\.dp,\n\s*\),/,
  ],
  [
    HOST,
    'SnackbarHostState: one snackbar at a time behind a fair Mutex (FIFO); showSnackbar defaults to Short without an action, Indefinite with one',
    /private val mutex = Mutex\(\)[\s\S]*?withDismissAction: Boolean = false,\n\s*duration: SnackbarDuration =\n\s*if \(actionLabel == null\) SnackbarDuration\.Short else SnackbarDuration\.Indefinite,[\s\S]*?public suspend fun showSnackbar\(visuals: SnackbarVisuals\): SnackbarResult = mutex\.withLock \{/,
  ],
  [
    HOST,
    'SnackbarHost: the current snackbar is dismissed after its duration (from when it becomes current); Indefinite never; scaled by calculateRecommendedTimeoutMillis',
    /LaunchedEffect\(currentSnackbarData\) \{\n\s*if \(currentSnackbarData != null\) \{\n\s*val duration =\n\s*currentSnackbarData\.visuals\.duration\.toMillis\([\s\S]*?delay\(duration\)\n\s*currentSnackbarData\.dismiss\(\)[\s\S]*?SnackbarDuration\.Indefinite -> Long\.MAX_VALUE[\s\S]*?return accessibilityManager\.calculateRecommendedTimeoutMillis\(\n\s*original,\n\s*containsIcons = true,\n\s*containsText = true,\n\s*containsControls = hasAction,\n\s*\)/,
  ],
  [
    HOST,
    'FadeInFadeOutWithScale: the visible snackbar is a polite live region; the outgoing one is removed when its fade ends; enter from 0 / 0.8',
    /if \(key != state\.current\) \{\n\s*\/\/ leave only the current in the list\n\s*state\.items\.removeAll \{ it\.key == key \}[\s\S]*?if \(isVisible\) \{\n\s*liveRegion = LiveRegionMode\.Polite\n\s*\}[\s\S]*?Animatable\(if \(!visible\) 1f else 0f\)[\s\S]*?Animatable\(if \(!visible\) 1f else 0\.8f\)/,
  ],
  [
    SCAFFOLD,
    'Scaffold: the snackbar host is centered and placed above the FAB, else the bottom bar, else the bottom inset',
    /val snackbarOffsetFromBottom =\n\s*if \(snackbarHeight != 0\) \{\n\s*snackbarHeight \+\n\s*\(fabOffsetFromBottom\n\s*\?: bottomBarHeight\n\s*\?: contentWindowInsets\.getBottom\(this@SubcomposeLayout\)\)[\s\S]*?\(layoutWidth - snackbarWidth \+/,
  ],
  [
    SAMPLES,
    'ScaffoldWithIndefiniteSnackbar: an action, the dismiss action, Indefinite',
    /message = "Snackbar # \$\{\+\+clickCount\}",\n\s*actionLabel = "Action",\n\s*withDismissAction = true,\n\s*duration = SnackbarDuration\.Indefinite,/,
  ],
];

/** The Scaffold.kt line where the snackbar offset falls back to the bottom inset. */
function bottomOffsetLiteral(scaffold: string): ComposeLiteral {
  const text = scaffold.replace(/\r\n/g, '\n');
  const at = text.indexOf('?: contentWindowInsets.getBottom(this@SubcomposeLayout))');
  if (at < 0) throw new Error(`${SCAFFOLD}: snackbarOffsetFromBottom changed upstream?`);
  return {
    name: `${P}-host-bottom-offset`,
    value: '0px',
    js: 0,
    raw: 'contentWindowInsets.getBottom (no FAB, no bottom bar)',
    owner: 'Scaffold',
    member: 'snackbarOffsetFromBottom',
    file: SCAFFOLD,
    line: text.slice(0, at).split('\n').length,
    note: 'owner decision M9 #21: the m3e host is fixed to the bottom of the window (plus env(safe-area-inset-bottom), the window inset) and raised by this; set it to the FAB height + host-fab-spacing (+ a bottom bar) to keep snackbars above a FAB, as Scaffold places them',
  };
}

/** `sources`: vendored Material3 files and samples by name. */
export function extractSnackbarDefaults(
  sources: Readonly<Record<string, string>>,
): SnackbarDefault[] {
  return [
    ...extractLiterals('snackbar-defaults', SNACKBAR_DEFAULTS_SOURCES, RULES, CHECKS, sources),
    bottomOffsetLiteral(sources[SCAFFOLD] ?? ''),
  ];
}
