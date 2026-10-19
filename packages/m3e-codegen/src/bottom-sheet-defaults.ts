// Values Compose's bottom sheets render (SheetDefaults.kt, BottomSheet.kt, ModalBottomSheet.kt,
// BottomSheetScaffold.kt) that are not in SheetBottomTokens, or that pick one of them:
// - BottomSheetDefaults: SheetMaxWidth 640dp (the sheet is centered, owner decision M9 #12: no
//   m3.material.io margins), SheetPeekHeight 56dp (the scaffold's peek, the standard sheet's
//   option, owner decision M9 #13), the release thresholds (PositionalThreshold 56dp from the
//   anchor behind, absolute; VelocityThreshold 125dp/s, the dampening floor) and
//   BoundaryDampeningZone 125dp; the drag handle's shape (MaterialTheme.shapes.extraLarge) and
//   22dp vertical padding (a 48dp tall clickable box, its width the handle's 32dp);
// - the springs: show / expand DefaultSpatial, hide / partialExpand FastEffects (a spatial move on
//   an effects spring: 0ms under reduced motion, the drawer's policy), the release settle
//   DefaultSpatial (started at the release velocity), the modal scrim's alpha DefaultEffects;
// - the scrim: BottomSheetDefaults.ScrimColor = ScrimTokens.ContainerColor at ContainerOpacity.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// bottom-sheet.css and the m3e-elements bottom sheet layout assume changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type BottomSheetDefault = ComposeLiteral;

const DEFAULTS = 'SheetDefaults.kt';
const SHEET = 'BottomSheet.kt';
const MODAL = 'ModalBottomSheet.kt';
const SCAFFOLD = 'BottomSheetScaffold.kt';
const SCRIM = 'Scrim.kt';
const FLAGS = 'ComposeMaterial3Flags.kt';
const ACTUAL = 'ModalBottomSheet.android.kt';
const SAMPLES = 'BottomSheetSamples.kt';
const ANCHORED = 'AnchoredDraggable.kt';
const SNAP = 'SnapFlingBehavior.kt';

export const BOTTOM_SHEET_DEFAULTS_SOURCES = [
  DEFAULTS,
  SHEET,
  MODAL,
  SCAFFOLD,
  SCRIM,
  FLAGS,
  ACTUAL,
  SAMPLES,
  ANCHORED,
  SNAP,
];

const P = '--m3e-comp-bottom-sheet';

/** Spatial moves on an effects spring jump under reduced motion (the drawer's close, CAC). */
export const BOTTOM_SHEET_REDUCED_MOTION = [`${P}-hide-duration: 0ms;`];

const RULES: readonly LiteralRule[] = [
  {
    kind: 'dp',
    name: `${P}-max-width`,
    owner: 'BottomSheetDefaults',
    member: 'SheetMaxWidth',
    file: DEFAULTS,
    pattern: /public val SheetMaxWidth: Dp = (\d+)\.dp/d,
    note: 'BottomSheet / ModalBottomSheet / BottomSheetScaffold maxWidth: widthIn(max).fillMaxWidth(), centered (ModalBottomSheet aligns it TopCenter); owner decision M9 #12: no m3.material.io margins',
  },
  {
    kind: 'dp',
    name: `${P}-peek-height`,
    owner: 'BottomSheetDefaults',
    member: 'SheetPeekHeight',
    file: DEFAULTS,
    pattern: /public val SheetPeekHeight: Dp = (\d+)\.dp/d,
    note: 'BottomSheetScaffold sheetPeekHeight: PartiallyExpanded shows this much of the sheet (the standard sheet’s peek option, owner decision M9 #13)',
  },
  {
    kind: 'dp',
    name: `${P}-positional-threshold`,
    owner: 'BottomSheetDefaults',
    member: 'PositionalThreshold',
    file: DEFAULTS,
    pattern: /internal val PositionalThreshold = (\d+)\.dp/d,
    note: 'rememberSheetState → SheetState.positionalThreshold; BottomSheetImpl passes it as `{ _ -> state.positionalThreshold() }`: px from the anchor behind, whatever the distance',
  },
  {
    kind: 'velocity',
    name: `${P}-velocity-threshold`,
    owner: 'BottomSheetDefaults',
    member: 'VelocityThreshold',
    file: DEFAULTS,
    pattern: /internal val VelocityThreshold = (\d+)\.dp/d,
    note: 'dp per second: the floor of a dampened fling (BottomSheetImpl); the fling’s own threshold is AnchoredDraggableMinFlingVelocity, the same 125dp/s',
  },
  {
    kind: 'dp',
    name: `${P}-boundary-dampening-zone`,
    owner: 'BottomSheetDefaults',
    member: 'BoundaryDampeningZone',
    file: DEFAULTS,
    pattern: /internal val BoundaryDampeningZone = (\d+)\.dp/d,
    note: 'a downward fling this close to Hidden is scaled by (distance / zone)²',
  },
  {
    kind: 'keyword',
    name: `${P}-drag-handle-shape`,
    owner: 'BottomSheetDefaults.DragHandle',
    member: 'shape',
    file: DEFAULTS,
    pattern: /shape: Shape = (MaterialTheme\.shapes\.extraLarge),/d,
  },
  {
    kind: 'dp',
    name: `${P}-drag-handle-padding-vertical`,
    owner: 'SheetDefaults.kt',
    member: 'DragHandleVerticalPadding',
    file: DEFAULTS,
    pattern: /private val DragHandleVerticalPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'DragHandle: padding(vertical) around the 32 × 4dp surface; the clickable box (DragHandleWithTooltip) is 32 × 48dp',
  },
  {
    kind: 'motion',
    name: `${P}-show`,
    owner: 'BottomSheet',
    member: 'showMotion',
    file: SHEET,
    pattern: /val showMotion = MaterialTheme\.motionScheme\.(\w+)Spec<Float>\(\)/d,
    note: 'SheetState.show() / expand()',
  },
  {
    kind: 'motion',
    name: `${P}-hide`,
    owner: 'BottomSheet',
    member: 'hideMotion',
    file: SHEET,
    pattern: /val hideMotion = MaterialTheme\.motionScheme\.(\w+)Spec<Float>\(\)/d,
    note: 'SheetState.hide() / partialExpand(); 0ms under reduced motion (it moves the sheet)',
  },
  {
    kind: 'motion',
    name: `${P}-settle`,
    owner: 'BottomSheetImpl',
    member: 'spatialFlingSpec',
    file: SHEET,
    pattern: /val spatialFlingSpec = MaterialTheme\.motionScheme\.(\w+)Spec<Float>\(\)/d,
    note: 'AnchoredDraggableDefaults.flingBehavior(animationSpec): the snap spring after a release, started at the release velocity (SnapFlingBehavior) and stopped at the anchor',
  },
  {
    kind: 'motion',
    name: `${P}-scrim`,
    owner: 'ModalBottomSheet',
    member: 'scrimAlpha',
    file: MODAL,
    pattern:
      /animateFloatAsState\(\n\s*targetValue = if \(isScrimVisible\) 1f else 0f,\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    note: 'the scrim alpha, 1 while the target is not Hidden',
  },
  {
    kind: 'token',
    name: `${P}-scrim-color`,
    owner: 'BottomSheetDefaults',
    member: 'ScrimColor',
    file: DEFAULTS,
    pattern:
      /get\(\) = (ScrimTokens\.ContainerColor)\.value\.copy\(ScrimTokens\.ContainerOpacity\)/d,
  },
  {
    kind: 'token',
    name: `${P}-scrim-opacity`,
    owner: 'BottomSheetDefaults',
    member: 'ScrimColor',
    file: DEFAULTS,
    pattern:
      /get\(\) = ScrimTokens\.ContainerColor\.value\.copy\((ScrimTokens\.ContainerOpacity)\)/d,
  },
];

/** Wiring bottom-sheet.css and the bottom sheet layout (m3e-elements) assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    DEFAULTS,
    'BottomSheetDefaults: ExpandedShape DockedContainerShape, ContainerColor DockedContainerColor, the DragHandle 32 × 4dp in DockedDragHandleColor named Strings.BottomSheetDragHandleDescription',
    /public val ExpandedShape: Shape\n\s*@Composable get\(\) = SheetBottomTokens\.DockedContainerShape\.value[\s\S]*?public val ContainerColor: Color\n\s*@Composable get\(\) = SheetBottomTokens\.DockedContainerColor\.value[\s\S]*?width: Dp = SheetBottomTokens\.DockedDragHandleWidth,\n\s*height: Dp = SheetBottomTokens\.DockedDragHandleHeight,[\s\S]*?color: Color = SheetBottomTokens\.DockedDragHandleColor\.value,\n\s*\) \{\n\s*val dragHandleDescription = getString\(Strings\.BottomSheetDragHandleDescription\)/,
  ],
  [
    DEFAULTS,
    'DragHandleWithTooltip: a TooltipBox above the handle with a PlainTooltip of its description (owner decision M9 #30)',
    /internal fun DragHandleWithTooltip\([\s\S]*?TooltipBox\(\n\s*modifier = modifier,\n\s*positionProvider =\n\s*TooltipDefaults\.rememberTooltipPositionProvider\(TooltipAnchorPosition\.Above\),\n\s*tooltip = \{\n\s*PlainTooltipInternal\(dragHandleDescription\) \{ Text\(dragHandleDescription\) \}/,
  ],
  [
    DEFAULTS,
    'SheetState: currentValue = settledValue; show() PartiallyExpanded when it has an anchor; expand / show on showMotionSpec, partialExpand / hide on hideMotionSpec, each after confirmValueChange',
    /get\(\) = anchoredDraggableState\.settledValue[\s\S]*?public suspend fun expand\(\) \{\n\s*if \(confirmValueChange\(Expanded\)\) animateTo\(Expanded, showMotionSpec\)[\s\S]*?if \(confirmValueChange\(PartiallyExpanded\)\) animateTo\(PartiallyExpanded, hideMotionSpec\)[\s\S]*?hasPartiallyExpandedState -> PartiallyExpanded\n\s*else -> Expanded[\s\S]*?if \(confirmValueChange\(targetValue\)\) animateTo\(targetValue, showMotionSpec\)[\s\S]*?if \(confirmValueChange\(Hidden\)\) animateTo\(Hidden, hideMotionSpec\)/,
  ],
  [
    DEFAULTS,
    'verticalScaleUp / verticalScaleDown: the surface stretches (origin top) by the offset above the min anchor, the content counter-scales',
    /internal fun Modifier\.verticalScaleUp\(state: SheetState\) = graphicsLayer \{\n\s*val offset = state\.anchoredDraggableState\.offset\n\s*val anchor = state\.anchoredDraggableState\.anchors\.minPosition\(\)\n\s*val overflow = if \(offset < anchor\) anchor - offset else 0f\n\s*scaleY = if \(overflow > 0f\) \(size\.height \+ overflow\) \/ size\.height else 1f\n\s*transformOrigin = TransformOrigin\(pivotFractionX = 0\.5f, pivotFractionY = 0f\)/,
  ],
  [
    SHEET,
    'BottomSheet: a Surface widthIn(maxWidth) in ExpandedShape / ContainerColor, tonalElevation Elevation (not drawn on surface-container-low) and no shadow',
    /tonalElevation: Dp = BottomSheetDefaults\.Elevation,\n\s*shadowElevation: Dp = 0\.dp,[\s\S]*?Surface\(\n\s*modifier =\n\s*modifier\n\s*\.widthIn\(max = maxWidth\)\n\s*\.fillMaxWidth\(\)/,
  ],
  [
    SHEET,
    'BottomSheetImpl anchors: Hidden at fullHeight, PartiallyExpanded when available, Expanded at max(0, fullHeight − sheetHeight) for a sheet with a height',
    /Hidden at fullHeight\n\s*if \(isPartiallyExpandedAnchorAvailable\(state, fullHeight, sheetHeight\)\) \{\n\s*PartiallyExpanded at\n\s*calculatePartiallyExpandedOffset\(state, fullHeight, sheetHeight\)\n\s*\}\n\s*if \(sheetHeight != 0f\) \{\n\s*Expanded at max\(0f, fullHeight - sheetHeight\)/,
  ],
  [
    SHEET,
    'the PartiallyExpanded anchor: deterministic min(fullHeight / 2, sheetHeight) above the bottom (legacy: half the screen when the sheet is taller)',
    /!state\.skipPartiallyExpanded &&\n\s*\(state\.isBottomSheetPartiallyExpandedDeterministicEnabled \|\| sheetHeight > fullHeight \/ 2f\)[\s\S]*?min\(fullHeight \/ 2f, sheetHeight\)[\s\S]*?return fullHeight - visibleHeight/,
  ],
  [
    SHEET,
    'BottomSheetImpl fling: a downward fling within BoundaryDampeningZone of Hidden scaled by factor², at least VelocityThreshold when it reached it; drags only while not Hidden',
    /if \(distanceToFloor < dampeningZone\) \{\n\s*val factor = distanceToFloor \/ dampeningZone\n\s*safeVelocity \*= \(factor \* factor\)[\s\S]*?if \(initialVelocity >= velocityThresholdPx\) \{\n\s*safeVelocity = max\(safeVelocity, velocityThresholdPx\)[\s\S]*?enabled = gesturesEnabled && state\.currentValue != Hidden,/,
  ],
  [
    SHEET,
    'the drag handle: click dismisses Expanded, expands PartiallyExpanded, else shows; accessibility actions dismiss / expand / collapse',
    /Modifier\.clickable \{\n\s*when \(state\.currentValue\) \{\n\s*Expanded -> animateToDismiss\(\)\n\s*PartiallyExpanded -> scope\.launch \{ state\.expand\(\) \}\n\s*else -> scope\.launch \{ state\.show\(\) \}[\s\S]*?dismiss\(dismissActionLabel\)[\s\S]*?expand\(expandActionLabel\)[\s\S]*?collapse\(collapseActionLabel\)/,
  ],
  [
    SHEET,
    'the sheet’s pane title Strings.BottomSheetPaneTitle',
    /val bottomSheetPaneTitle = getString\(string = Strings\.BottomSheetPaneTitle\)[\s\S]*?paneTitle = bottomSheetPaneTitle/,
  ],
  [
    MODAL,
    'ModalBottomSheet: tonalElevation 0; the Scrim named Strings.CloseSheet dismisses on click (shouldDismissOnClickOutside); back / settleToDismiss partially expands an Expanded sheet that has PartiallyExpanded, else hides; show() on entry',
    /tonalElevation: Dp = 0\.dp,[\s\S]*?if \(sheetState\.currentValue == Expanded && sheetState\.hasPartiallyExpandedState\) \{[\s\S]*?scope\.launch \{ sheetState\.partialExpand\(\) \}\n\s*\} else \{[\s\S]*?scope\.launch \{ sheetState\.hide\(\) \}\.invokeOnCompletion \{ onDismissRequest\(\) \}[\s\S]*?Scrim\(\n\s*contentDescription = getString\(Strings\.CloseSheet\),\n\s*onClick = if \(properties\.shouldDismissOnClickOutside\) animateToDismiss else null,[\s\S]*?sheetState\.show\(\)/,
  ],
  [
    ACTUAL,
    'ModalBottomSheetDialog: the content has dialog() semantics',
    /Box\(Modifier\.semantics \{ dialog\(\) \}\) \{ currentContent\(\) \}/,
  ],
  [
    SCAFFOLD,
    'StandardBottomSheet: PartiallyExpanded at layoutHeight − peekHeight, Hidden when not skipped, Expanded at layoutHeight − sheetHeight; the handle hides an Expanded sheet unless Hidden is skipped (then partially expands)',
    /PartiallyExpanded at \(layoutHeight - peekHeightPx\)[\s\S]*?Hidden at layoutHeight[\s\S]*?Expanded at layoutHeight - sheetHeight[\s\S]*?Expanded ->\n\s*scope\.launch \{\n\s*if \(!state\.skipHiddenState\) \{\n\s*state\.hide\(\)\n\s*\} else \{\n\s*state\.partialExpand\(\)/,
  ],
  [
    SCRIM,
    'Scrim: a tap calls onClick; the color drawn at alpha',
    /Modifier\.pointerInput\(onClick\) \{ detectTapGestures \{ onClick\(\) \} \}[\s\S]*?drawRect\(color = color, alpha = alpha\(\)\.coerceIn\(0f, 1f\)\)/,
  ],
  [
    FLAGS,
    'isBottomSheetPartiallyExpandedDeterministicEnabled defaults to true at the pin',
    /public var isBottomSheetPartiallyExpandedDeterministicEnabled: Boolean = true/,
  ],
  [
    ANCHORED,
    'AnchoredDraggableMinFlingVelocity 125dp; the fling behavior has no approach (calculateApproachOffset 0)',
    /internal val AnchoredDraggableMinFlingVelocity\n\s*get\(\) = 125\.dp[\s\S]*?override fun calculateApproachOffset\(velocity: Float, decayOffset: Float\) = 0f/,
  ],
  [
    SNAP,
    'animateWithTarget: the snap spring is coerced to the target and cancelled there or when the bounds stop it',
    /val realValue = value\.coerceToTarget\(cancelOffset\)[\s\S]*?if \(abs\(delta - consumed\) > 0\.5f \|\| realValue != value\) \{\n\s*cancelAnimation\(\)/,
  ],
  [
    SAMPLES,
    'ModalBottomSheetSample: the skipPartiallyExpanded toggle and the Hide Bottom Sheet button',
    /Text\("Skip partially expanded State"\)[\s\S]*?Text\("Hide Bottom Sheet"\)/,
  ],
];

/** `sources`: vendored Material3 / foundation files and samples by name. */
export function extractBottomSheetDefaults(
  sources: Readonly<Record<string, string>>,
): BottomSheetDefault[] {
  return extractLiterals(
    'bottom-sheet-defaults',
    BOTTOM_SHEET_DEFAULTS_SOURCES,
    RULES,
    CHECKS,
    sources,
  );
}
