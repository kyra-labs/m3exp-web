// Values Compose's time pickers render (TimePicker.kt, TimePickerDialog.kt, ScrollField.kt) that are
// not in TimePickerTokens / TimeInputTokens, or that pick one of them (COMPONENT_SPEC §28):
// - the private sizes of TimePicker.kt: the vibrant (expressive) fields, separators, AM/PM toggle
//   and gaps, the dial's outer / inner label circles (101dp / 69dp of the 256dp dial), the
//   display margins, the supporting text offset, the 48dp touch size and the separator's −4dp
//   offset;
// - the default colors with ComposeMaterial3Flags.isUpdatedTimepickerToggleEnabled on (its upstream
//   default, owner decision M10 T3): the AM/PM toggle buttons; the vibrant colors; the TimeInput
//   text fields' OutlinedTextFieldDefaults colors and border widths; the invalid colors;
// - the AM/PM ToggleButtons' shapes (circle, 12dp pressed / checked), the side column's buttons and
//   offsets, the bold checked label;
// - the motion: the dial selector on DefaultSpatial, the hour / minute faces' Crossfade on
//   DefaultEffects, the 100ms before an hour tap switches to minutes, the scroll wheel items on
//   FastSpatial, the wheel's pager springs (animateScrollToPage's spring(), the fling's
//   snapAnimationSpec; compose foundation Pager.kt / PagerState.kt);
// - ScrollField: its 200dp reference height (a page is a third of it), shape and colors, the item
//   type styles it interpolates between;
// - TimePickerDialog / VibrantTimePickerDialog: shapes, colors, the title, the action row and the
//   layout paddings (portrait and landscape), MinHeightForTimePicker.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// time-picker.css and the m3e-elements time picker layouts assume changes upstream.
import { springToLinear } from '@kyralabs/m3e-motion';
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';
import { kebabName } from './names.js';
import { ANIMATION_CORE_PATH, FOUNDATION_PATH, MATERIAL3_PATH } from './vendor.js';

export type TimePickerDefault = ComposeLiteral;

const KT = 'TimePicker.kt';
const DIALOG = 'TimePickerDialog.kt';
const SCROLL = 'ScrollField.kt';
const FLAGS = 'ComposeMaterial3Flags.kt';
const PAGER = 'Pager.kt';
const PAGER_STATE = 'PagerState.kt';
const SPEC = 'AnimationSpec.kt';
const VECTORIZED = 'VectorizedAnimationSpec.kt';

export const TIME_PICKER_DEFAULTS_SOURCES = [KT, DIALOG, SCROLL, FLAGS];

const P = '--m3e-comp-time-picker';

/** The springs that move things (the dial selector, the wheels, the wheel items' size) jump. */
export const TIME_PICKER_REDUCED_MOTION = [
  `${P}-selector-duration: 0ms;`,
  `${P}-scroll-item-duration: 0ms;`,
  `${P}-scroll-page-duration: 0ms;`,
  `${P}-scroll-settle-duration: 0ms;`,
];

/** `private val <member>\n    get() = <n>.dp` (TimePicker.kt's private sizes). */
const getter = (member: string) =>
  new RegExp(`(?:private|internal) val ${member}\\n\\s*get\\(\\) = (\\d+)\\.dp`, 'd');

const dp = (name: string, member: string, note: string, file = KT): LiteralRule => ({
  kind: 'dp',
  name: `${P}-${name}`,
  owner: file,
  member,
  file,
  pattern: getter(member),
  note,
});

const RULES: readonly LiteralRule[] = [
  dp(
    'vibrant-time-field-width',
    'VibrantTimeFieldWidth',
    'vibrant hour / minute fields (dial selectors, inputs)',
  ),
  dp(
    'vibrant-time-field-width-portrait',
    'VibrantTimeFieldWidthPortrait',
    'vibrant dial selectors in the vertical layout with a 24-hour clock (ClockDisplayNumbers)',
  ),
  dp(
    'vibrant-time-field-height',
    'VibrantTimeFieldHeight',
    'vibrant fields, separators and the dial selectors',
  ),
  dp(
    'vibrant-separator-width',
    'VibrantSeparatorWidth',
    'the ":" between vibrant fields; the horizontal vibrant AM/PM gap',
  ),
  dp('vibrant-period-width', 'VibrantPeriodToggleWidth', 'the vertical vibrant AM/PM toggle'),
  dp('vibrant-period-height', 'VibrantPeriodToggleHeight', 'the vertical vibrant AM/PM toggle'),
  dp(
    'uncontained-time-field-height',
    'UncontainedTimeFieldHeight',
    'TimeInput / TimeScroll with a mode toggle (the side control column)',
  ),
  dp(
    'uncontained-toggle-height',
    'UncontainedToggleHeight',
    'the side control column (AM, PM, the mode toggle)',
  ),
  dp(
    'vibrant-period-horizontal-height',
    'VibrantPeriodToggleHorizontalHeight',
    'the horizontal vibrant AM/PM toggle (under the display, horizontal layout)',
  ),
  dp(
    'vibrant-period-padding',
    'VibrantPeriodTogglePadding',
    'vibrant inputs: before the AM/PM toggle; the vertical vibrant toggle’s gap',
  ),
  dp(
    'vibrant-period-large-padding',
    'VibrantPeriodToggleLargePadding',
    'the dial display: before the vertical AM/PM toggle (vibrant), above the horizontal one',
  ),
  dp(
    'vibrant-horizontal-gap',
    'VibrantHorizontalTimePickerGap',
    'vibrant horizontal layout: display → dial',
  ),
  dp(
    'vibrant-vertical-gap',
    'VibrantVerticalTimePickerGap',
    'vibrant vertical layout: display → dial',
  ),
  dp(
    'display-gap',
    'ClockDisplayBottomMargin',
    'baseline layouts: display → dial (below it vertically, beside it horizontally)',
  ),
  dp('face-bottom-margin', 'ClockFaceBottomMargin', 'baseline vertical layout: below the dial'),
  dp('separator-width', 'DisplaySeparatorWidth', 'the ":" between baseline fields'),
  dp(
    'supporting-text-top',
    'SupportLabelTop',
    'TimeInput: the "Hour" / "Minute" / error text below a field',
  ),
  dp(
    'max-distance',
    'MaxDistance',
    '24-hour hours: a press closer to the center than this (at the 256dp dial) is the inner circle',
  ),
  dp('minimum-interactive-size', 'MinimumInteractiveSize', 'dial labels; the side column’s rows'),
  dp(
    'period-gap',
    'PeriodTogglePaddingSmall',
    'isUpdatedTimepickerToggleEnabled: the gap between AM and PM and before the toggle (baseline)',
  ),
  {
    kind: 'dp',
    name: `${P}-outer-radius`,
    owner: KT,
    member: 'OuterCircleToSizeRatio',
    file: KT,
    pattern:
      /private val OuterCircleToSizeRatio: Float\n\s*get\(\) = (\d+)\.dp \/ ClockDialContainerSize/d,
    note: 'the dial labels’ circle (and the selector’s length), of a ClockDialContainerSize dial',
  },
  {
    kind: 'dp',
    name: `${P}-inner-radius`,
    owner: KT,
    member: 'InnerCircleToSizeRatio',
    file: KT,
    pattern:
      /private val InnerCircleToSizeRatio: Float\n\s*get\(\) = (\d+)\.dp \/ ClockDialContainerSize/d,
    note: 'the 24-hour inner circle (12–23, 0), of a ClockDialContainerSize dial',
  },
  {
    kind: 'dp',
    name: `${P}-separator-offset`,
    owner: 'DisplaySeparator',
    member: 'Modifier.offset(y)',
    file: KT,
    pattern:
      /color = TimeFieldSeparatorColor\.value,\n\s*style = style,\n\s*modifier = Modifier\.offset\(y = \((-\d+)\)\.dp\),/d,
    note: 'the ":" moves up, its line box trimmed and centered',
  },
  {
    kind: 'dp',
    name: `${P}-period-shape-selected`,
    owner: 'ToggleItem',
    member: 'ToggleButtonShapes(checkedShape)',
    file: KT,
    pattern:
      /pressedShape = RoundedCornerShape\(12\.dp\),\n\s*checkedShape = RoundedCornerShape\((\d+)\.dp\),\n\s*\)\n\s*ToggleButton\(\n\s*checked = checked,\n\s*onCheckedChange = \{ onClick\(\) \},\n\s*modifier =\n\s*Modifier\.zIndex/d,
    note: 'the AM/PM ToggleButton morphs from CircleShape to this when checked',
  },
  {
    kind: 'dp',
    name: `${P}-period-shape-pressed`,
    owner: 'ToggleItem',
    member: 'ToggleButtonShapes(pressedShape)',
    file: KT,
    pattern:
      /pressedShape = RoundedCornerShape\((\d+)\.dp\),\n\s*checkedShape = RoundedCornerShape\(12\.dp\),\n\s*\)\n\s*ToggleButton\(\n\s*checked = checked,\n\s*onCheckedChange = \{ onClick\(\) \},\n\s*modifier =\n\s*Modifier\.zIndex/d,
  },
  {
    kind: 'dp',
    name: `${P}-side-item-height`,
    owner: 'SideControlItem',
    member: 'Modifier.height',
    file: KT,
    pattern: /Modifier\.zIndex\(if \(checked\) 0f else 1f\)\n\s*\.height\((\d+)\.dp\)/d,
    note: 'the side column’s AM / PM ToggleButtons, in a 48dp row',
  },
  {
    kind: 'dp',
    name: `${P}-side-item-min-width`,
    owner: 'SideControlItem',
    member: 'Modifier.defaultMinSize(minWidth)',
    file: KT,
    pattern: /\.height\(40\.dp\)\n\s*\.defaultMinSize\(minWidth = (\d+)\.dp\)/d,
  },
  {
    kind: 'dp',
    name: `${P}-side-item-padding`,
    owner: 'SideControlItem',
    member: 'contentPadding',
    file: KT,
    pattern: /contentPadding = PaddingValues\(horizontal = (\d+)\.dp\),/d,
  },
  {
    kind: 'dp',
    name: `${P}-side-period-gap`,
    owner: 'SideControlColumn',
    member: 'AM visual height + gap',
    file: KT,
    pattern:
      /\/\/ AM visual height \(40dp\) \+ gap \(8dp\) = 48dp\n\s*visualY \+= 40\.dp \+ (\d+)\.dp/d,
    note: 'AM’s 40dp button, this gap, PM',
  },
  {
    kind: 'dp',
    name: `${P}-side-toggle-gap`,
    owner: 'SideControlColumn',
    member: 'PM visual height + gap',
    file: KT,
    pattern:
      /\/\/ PM visual height \(40dp\) \+ gap \(16dp\) = 56dp\n\s*visualY \+= 40\.dp \+ (\d+)\.dp/d,
    note: 'PM’s 40dp button, this gap, the mode toggle’s 24dp icon',
  },
  {
    kind: 'dp',
    name: `${P}-side-toggle-top-24h`,
    owner: 'SideControlColumn',
    member: 'toggleY (24h)',
    file: KT,
    pattern: /val toggleY = (\d+)\.dp\.roundToPx\(\)/d,
    note: '24-hour: the toggle’s 48dp target alone, its 24dp icon bottom-aligned with the fields',
  },
  {
    kind: 'dp',
    name: `${P}-input-outline-width`,
    owner: 'TimePickerTextField',
    member: 'unfocusedBorderThickness',
    file: KT,
    pattern: /unfocusedBorderThickness = (\d+)\.dp,/d,
  },
  {
    kind: 'dp',
    name: `${P}-input-outline-width-focused`,
    owner: 'TimePickerTextField',
    member: 'focusedBorderThickness',
    file: KT,
    pattern: /focusedBorderThickness = (\d+)\.dp,/d,
  },
  {
    kind: 'dp',
    name: `${P}-vibrant-selector-outline-width`,
    owner: 'TimeSelector',
    member: 'border',
    file: KT,
    pattern:
      /if \(shapes\.orVibrant\(false, true\) && selected\)\n\s*BorderStroke\(\n\s*(\d+)\.dp,/d,
    note: 'a selected vibrant time selector (primary; error when invalid)',
  },
  {
    kind: 'dp',
    name: `${P}-scroll-field-width`,
    owner: 'TimeScrollImpl',
    member: 'ScrollField size(width)',
    file: KT,
    pattern:
      /contentDescription = hourSelectionDescription,\n\s*modifier = Modifier\.size\(width = (\d+)\.dp, height = fieldHeight\),/d,
  },
  {
    kind: 'dp',
    name: `${P}-scroll-field-height`,
    owner: 'ScrollFieldDefaults',
    member: 'ScrollFieldHeight',
    file: SCROLL,
    pattern: /public val ScrollFieldHeight: Dp = (\d+)\.dp/d,
    note: 'pageSize = PageSize.Fixed(ScrollFieldHeight / 3): a wheel row is a third of this',
  },
  {
    kind: 'fraction',
    name: `${P}-scroll-field-pages`,
    owner: 'ScrollField',
    member: 'pageSize',
    file: SCROLL,
    pattern: /pageSize = PageSize\.Fixed\(ScrollFieldDefaults\.ScrollFieldHeight \/ (\d+)\),/d,
    note: 'a wheel row is ScrollFieldHeight / this',
  },
  {
    kind: 'keyword',
    name: `${P}-scroll-field-shape`,
    owner: 'ScrollFieldDefaults',
    member: 'shape',
    file: SCROLL,
    pattern: /public val shape: Shape\n\s*@Composable get\(\) = (ShapeDefaults\.Large)/d,
    keyword: 'MaterialTheme.shapes.large',
  },
  {
    kind: 'type',
    name: `${P}-scroll-item`,
    owner: 'ScrollFieldDefaults.Item',
    member: 'style (unselected)',
    file: SCROLL,
    pattern: /lerp\(\n\s*MaterialTheme\.typography\.(\w+),\n\s*MaterialTheme\.typography\.\w+,/d,
    note: 'lerp(…, selectionFraction): the unselected end',
  },
  {
    kind: 'type',
    name: `${P}-scroll-item-selected`,
    owner: 'ScrollFieldDefaults.Item',
    member: 'style (selected)',
    file: SCROLL,
    pattern: /lerp\(\n\s*MaterialTheme\.typography\.\w+,\n\s*MaterialTheme\.typography\.(\w+),/d,
    note: 'the selected (centered) item',
  },
  {
    kind: 'motion',
    name: `${P}-scroll-item`,
    owner: 'ScrollFieldDefaults.Item',
    member: 'animateFloatAsState / animateColorAsState',
    file: SCROLL,
    pattern:
      /targetValue = if \(selected\) 1f else 0f,\n\s*animationSpec = MaterialTheme\.motionScheme\.(\w+)Spec\(\),/d,
    note: 'the selection fraction (type lerp) and the color; the duration is 0ms with prefers-reduced-motion',
  },
  {
    kind: 'motion',
    name: `${P}-selector`,
    owner: 'ClockFace',
    member: 'ClockDialModifier animationSpec',
    file: KT,
    pattern: /state\.selection,\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\),\n\s*\)/d,
    note: 'the selector’s angle (taps, hour ⇄ minute); drags follow the pointer; 0ms with prefers-reduced-motion',
  },
  {
    kind: 'motion',
    name: `${P}-face`,
    owner: 'ClockFace',
    member: 'Crossfade animationSpec',
    file: KT,
    pattern:
      /targetState = state\.clockFaceValues,\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    note: 'the hour and minute faces cross-fade',
  },
  {
    kind: 'ms',
    name: `${P}-auto-switch-delay`,
    owner: 'AnalogTimePickerState',
    member: 'onTap delay',
    file: KT,
    pattern:
      /if \(selection == TimePickerSelectionMode\.Hour && autoSwitchToMinute\) \{\n\s*delay\((\d+)\)/d,
    note: 'after an hour tap, before the minutes show (pointer only: owner decision M10 T8)',
  },
  // TimePickerDialog.kt.
  {
    kind: 'token',
    name: `${P}-dialog-container-color`,
    owner: 'TimePickerDialogDefaults',
    member: 'containerColor',
    file: DIALOG,
    pattern:
      /public val containerColor: Color\n\s*@Composable get\(\) = (DialogTokens\.ContainerColor)\.value/d,
  },
  {
    kind: 'token',
    name: `${P}-dialog-container-shape`,
    owner: 'TimePickerDialogDefaults',
    member: 'shape',
    file: DIALOG,
    pattern:
      /public val shape: Shape\n\s*@Composable get\(\) = (DialogTokens\.ContainerShape)\.value/d,
  },
  {
    kind: 'type',
    name: `${P}-dialog-title`,
    owner: 'TimePickerDialogDefaults',
    member: 'Title style',
    file: DIALOG,
    pattern: /style = MaterialTheme\.typography\.(\w+),\n\s*text = getString\(titleRes\),/d,
    note: 'on-surface (the dialog Surface’s content color), not TimePickerTokens.HeadlineColor',
  },
  {
    kind: 'dp',
    name: `${P}-dialog-title-padding-bottom`,
    owner: 'TimePickerDialogDefaults',
    member: 'Title padding(bottom)',
    file: DIALOG,
    pattern: /modifier = modifier\.padding\(bottom = (\d+)\.dp\),/d,
  },
  {
    kind: 'dp',
    name: `${P}-dialog-actions-gap`,
    owner: 'TimePickerDialogLayout',
    member: 'Arrangement.spacedBy',
    file: DIALOG,
    pattern:
      /horizontalArrangement = Arrangement\.spacedBy\((\d+)\.dp\),\n\s*\) \{\n\s*modeToggleButton\?\.invoke\(\)/d,
    note: 'the mode toggle, a spacer, the dismiss and confirm buttons',
  },
  {
    kind: 'dp',
    name: `${P}-dialog-padding`,
    owner: 'TimePickerCustomLayout',
    member: 'contentPadding',
    file: DIALOG,
    pattern: /val contentPadding = (\d+)\.dp\.roundToPx\(\)/d,
    note: 'each side of the content; the dialog is the content’s width plus twice this',
  },
  {
    kind: 'dp',
    name: `${P}-dialog-padding-top`,
    owner: 'TimePickerCustomLayout',
    member: 'portTitleTopPadding / landTitleTopPadding',
    file: DIALOG,
    pattern: /val portTitleTopPadding = (\d+)\.dp\.roundToPx\(\)\n\s*val portActionsBottomPadding/d,
    note: 'above the title (and its start inset, landTitleTopPadding)',
  },
  {
    kind: 'dp',
    name: `${P}-dialog-padding-bottom`,
    owner: 'TimePickerCustomLayout',
    member: 'portActionsBottomPadding',
    file: DIALOG,
    pattern: /val portActionsBottomPadding = (\d+)\.dp\.roundToPx\(\)\n\s*val contentPlaceable/d,
  },
  {
    kind: 'dp',
    name: `${P}-dialog-landscape-content-top`,
    owner: 'TimePickerCustomLayout',
    member: 'landContentTopPadding',
    file: DIALOG,
    pattern:
      /val landTitleTopPadding = 24\.dp\.roundToPx\(\)\n\s*val landContentTopPadding = (\d+)\.dp\.roundToPx\(\)/d,
  },
  {
    kind: 'dp',
    name: `${P}-dialog-landscape-content-actions`,
    owner: 'TimePickerCustomLayout',
    member: 'landContentActionsPadding',
    file: DIALOG,
    pattern:
      /val landContentTopPadding = 16\.dp\.roundToPx\(\)\n\s*val landContentActionsPadding = (\d+)\.dp\.roundToPx\(\)/d,
  },
  {
    kind: 'dp',
    name: `${P}-dialog-landscape-actions-bottom`,
    owner: 'TimePickerCustomLayout',
    member: 'landActionsBottomPadding',
    file: DIALOG,
    pattern:
      /val landContentActionsPadding = 4\.dp\.roundToPx\(\)\n\s*val landActionsBottomPadding = (\d+)\.dp\.roundToPx\(\)/d,
  },
  {
    kind: 'dp',
    name: `${P}-vibrant-dialog-padding`,
    owner: 'VibrantTimePickerCustomLayout',
    member: 'contentPadding (portrait)',
    file: DIALOG,
    pattern:
      /val contentPadding = if \(isLandscape\) 24\.dp\.roundToPx\(\) else (\d+)\.dp\.roundToPx\(\)/d,
    note: 'portrait: each side, above the content, between it and the actions, below them',
  },
  {
    kind: 'dp',
    name: `${P}-vibrant-dialog-landscape-padding`,
    owner: 'VibrantTimePickerCustomLayout',
    member: 'contentPadding (landscape)',
    file: DIALOG,
    pattern:
      /val contentPadding = if \(isLandscape\) (\d+)\.dp\.roundToPx\(\) else 12\.dp\.roundToPx\(\)/d,
    note: 'landscape: each side, and between the content and the actions (landContentActionsPadding)',
  },
  {
    kind: 'dp',
    name: `${P}-dialog-min-height-for-picker`,
    owner: 'TimePickerDialogDefaults',
    member: 'MinHeightForTimePicker',
    file: DIALOG,
    pattern: /public val MinHeightForTimePicker: Dp = (\d+)\.dp/d,
    note: 'the samples show TimeInput instead of the dial below this window height',
  },
];

/** Wiring time-picker.css and the time picker layouts assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    FLAGS,
    'isUpdatedTimepickerToggleEnabled defaults to true (owner decision M10 T3)',
    /public var isUpdatedTimepickerToggleEnabled: Boolean = true/,
  ],
  [
    KT,
    'TimePickerImpl: Vertical / Horizontal by layoutType; auto switch off with accessibility services or keyboard input',
    /val autoSwitch = !a11yServicesEnabled && !isKeyboardMode[\s\S]*?if \(layoutType == TimePickerLayoutType\.Vertical\) \{\n\s*VerticalTimePicker\(/,
  ],
  [
    KT,
    'the time selectors are RadioButtons named "Select hour" / "Select minutes" around the value',
    /role = Role\.RadioButton\n\s*this\.contentDescription = selectorContentDescription/,
  ],
  [
    KT,
    'the AM/PM toggle is a selectable group named "Select AM or PM"; its items are ToggleButtons with selected = checked',
    /val contentDescription = getString\(Strings\.TimePickerPeriodToggle\)[\s\S]*?this\.contentDescription = contentDescription\n\s*\}\n\s*\.selectableGroup\(\)/,
  ],
  [
    KT,
    'a checked AM/PM label is FontWeight.Bold',
    /style =\n\s*if \(!state\.isPm\) style\.copy\(fontWeight = FontWeight\.Bold\)/,
  ],
  [
    KT,
    'the dial: a circle of clockDialColor, the selector drawn over the labels (Clear / Xor / DstOver), a track from the center and a center dot',
    /drawCircle\(\n\s*radius = selectorRadius,\n\s*center = selectorOffsetPx,\n\s*color = Color\.Black,\n\s*blendMode = BlendMode\.Clear,[\s\S]*?blendMode = BlendMode\.Xor,[\s\S]*?drawLine\(\n\s*start = size\.center,[\s\S]*?radius = ClockDialSelectorCenterContainerSize\.toPx\(\) \/ 2,[\s\S]*?color = colors\.clockDialContentColor\(selected = true\),\n\s*blendMode = BlendMode\.DstOver,/,
  ],
  [
    KT,
    'dial labels: arrows loop focus, Tab leaves for the fields / AM-PM, Enter / Space selects without the auto switch',
    /it\.key == Key\.DirectionDown \|\|[\s\S]*?focusManager\.moveFocus\(FocusDirection\.Next\)[\s\S]*?if \(it\.key == Key\.Tab\) \{[\s\S]*?if \(it\.isClick\) \{\n\s*onClockTextClick\(false\)/,
  ],
  [
    KT,
    'TimeInput: an unselected field shows its TimeSelector; the BasicTextField keeps focus 0 × 0; supporting text only baseline or invalid',
    /if \(!selected\) \{\n\s*TimeSelector\([\s\S]*?Box\(Modifier\.visible\(selected\)\) \{[\s\S]*?if \(shapes == null \|\| !isValid\) \{\n\s*SupportingText\(/,
  ],
  [
    KT,
    'SupportingText: Hour / Minute or the error text (polite live region), body small, two lines',
    /Modifier\.semantics \{ liveRegion = LiveRegionMode\.Polite \}[\s\S]*?minLines = 2,\n\s*style = TimeInputTokens\.TimeFieldSupportingTextFont\.value,/,
  ],
  [
    KT,
    'vibrant fields use display large; baseline inputs TimeInputTokens.TimeFieldLabelTextFont',
    /\.orVibrant\(\n\s*TimeInputTokens\.TimeFieldLabelTextFont\.value,\n\s*TypographyKeyTokens\.DisplayLarge\.value,\n\s*\)/,
  ],
  [
    KT,
    'the fields and selectors are always laid out left to right',
    /\/\/ Always display the time input text field from left to right\.\n\s*LocalLayoutDirection provides LayoutDirection\.Ltr,/,
  ],
  [
    SCROLL,
    'ScrollField: Up / Down move one page (animateScrollToPage); a vertical pager of ScrollFieldHeight / 3 pages snapped to the center',
    /Key\.DirectionDown -> 1\n\s*Key\.DirectionUp -> -1[\s\S]*?scope\.launch \{ state\.pagerState\.animateScrollToPage\(nextPage\) \}[\s\S]*?pageSize = PageSize\.Fixed\(ScrollFieldDefaults\.ScrollFieldHeight \/ 3\),[\s\S]*?snapPosition = SnapPosition\.Center,/,
  ],
  [
    SCROLL,
    'ScrollField items: a click scrolls to it; the text is two locale digits',
    /\.clickable\(enabled = enabled\) \{\n\s*scope\.launch \{ state\.animateScrollToOption\(index\) \}[\s\S]*?text = index\.toLocalString\(minDigits = 2\),/,
  ],
  [
    DIALOG,
    'the dialogs: a Surface (no shadow) of the dialog shape / color around the layout',
    /Surface\(\n\s*shape = shape,\n\s*tonalElevation = DialogTokens\.ContainerElevation,\n\s*modifier = modifier,\n\s*color = containerColor,\n\s*\) \{\n\s*TimePickerCustomLayout\(/,
  ],
  [
    DIALOG,
    'vibrant dialog shape: CornerExtraLarge',
    /public val vibrantShape: Shape\n\s*@Composable get\(\) = ShapeKeyTokens\.CornerExtraLarge\.value/,
  ],
  [
    DIALOG,
    'mode toggles: icon buttons with a plain tooltip above, keyboard / schedule / swipe_vertical icons in onSurfaceVariant',
    /TooltipAnchorPosition\.Above[\s\S]*?Icons\.Filled\.Keyboard\n\s*\} else \{\n\s*Icons\.Filled\.Schedule[\s\S]*?tint = MaterialTheme\.colorScheme\.onSurfaceVariant,[\s\S]*?Icons\.Filled\.SwipeVertical/,
  ],
];

const find = (sources: Readonly<Record<string, string>>, file: string, pattern: RegExp) => {
  const text = sources[file]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`time-picker-defaults: ${file} is not vendored`);
  const match = pattern.exec(text);
  const at = match?.indices?.[1]?.[0];
  if (!match || at === undefined) {
    throw new Error(
      `time-picker-defaults: ${file}: ${String(pattern)} not found (changed upstream?)`,
    );
  }
  return { value: match[1]!, groups: match, line: text.slice(0, at).split('\n').length };
};

const roleVar = (role: string) =>
  `var(--m3e-sys-color-${kebabName(role[0]!.toUpperCase() + role.slice(1))})`;

/**
 * The default colors Compose resolves with fromToken(ColorSchemeKeyTokens.X) (or MaterialTheme
 * colors) inside one of TimePicker.kt's color getters, which repeat the field names.
 */
function colors(sources: Readonly<Record<string, string>>): TimePickerDefault[] {
  const text = sources[KT]!.replace(/\r\n/g, '\n');
  const region = (getter: string) => {
    const start = text.indexOf(`internal val ColorScheme.${getter}:`);
    const end = text.indexOf('.also {', start);
    if (start < 0 || end < 0) throw new Error(`time-picker-defaults: ${KT}: ${getter} not found`);
    return { start, body: text.slice(start, end) };
  };
  const out: TimePickerDefault[] = [];
  const pick = (
    getter: string,
    owner: string,
    field: string,
    name: string,
    note?: string,
    flagged = false,
  ) => {
    const r = region(getter);
    // With the flag: the `if (isUpdatedTimepickerToggleEnabled)` branch's role.
    const pattern = flagged
      ? new RegExp(
          `${field} =\\n\\s*if \\(ComposeMaterial3Flags\\.isUpdatedTimepickerToggleEnabled\\) \\{\\n\\s*fromToken\\(ColorSchemeKeyTokens\\.(\\w+)\\)`,
          'd',
        )
      : new RegExp(`\\b${field} =\\s*fromToken\\(ColorSchemeKeyTokens\\.(\\w+)\\)`, 'd');
    const m = pattern.exec(r.body);
    const at = m?.indices?.[1]?.[0];
    if (!m || at === undefined) {
      throw new Error(`time-picker-defaults: ${KT}: ${getter}.${field} changed upstream?`);
    }
    const value = roleVar(m[1]!);
    out.push({
      name: `${P}-${name}`,
      value,
      js: value,
      raw: `ColorSchemeKeyTokens.${m[1]!}${flagged ? ' (isUpdatedTimepickerToggleEnabled)' : ''}`,
      owner,
      member: `${getter}.${field}`,
      file: KT,
      line: text.slice(0, r.start + at).split('\n').length,
      ...(note === undefined ? {} : { note }),
    });
  };
  const base = 'defaultTimePickerColors';
  pick(
    base,
    'TimePickerDefaults',
    'periodSelectorSelectedContainerColor',
    'period-container-color-selected',
    'the checked AM/PM ToggleButton',
    true,
  );
  pick(
    base,
    'TimePickerDefaults',
    'periodSelectorContainerColor',
    'period-container-color',
    'an unchecked AM/PM ToggleButton',
    true,
  );
  pick(
    base,
    'TimePickerDefaults',
    'periodSelectorSelectedContentColor',
    'period-label-color-selected',
    undefined,
    true,
  );
  const vibrant = 'defaultVibrantTimePickerColors';
  pick(vibrant, 'TimePickerDefaults', 'clockDialColor', 'vibrant-clock-dial-color');
  pick(
    vibrant,
    'TimePickerDefaults',
    'timeSelectorSelectedContainerColor',
    'vibrant-time-selector-container-color-selected',
  );
  pick(
    vibrant,
    'TimePickerDefaults',
    'timeSelectorContainerColor',
    'vibrant-time-selector-container-color',
  );
  pick(
    vibrant,
    'TimePickerDefaults',
    'timeSelectorSelectedContentColor',
    'vibrant-time-selector-label-color-selected',
  );
  pick(
    vibrant,
    'TimePickerDefaults',
    'timeSelectorContentColor',
    'vibrant-time-selector-label-color',
  );
  pick(
    vibrant,
    'TimePickerDefaults',
    'periodSelectorSelectedContainerColor',
    'vibrant-period-container-color-selected',
  );
  pick(
    vibrant,
    'TimePickerDefaults',
    'periodSelectorContainerColor',
    'vibrant-period-container-color',
  );
  pick(
    vibrant,
    'TimePickerDefaults',
    'periodSelectorSelectedContentColor',
    'vibrant-period-label-color-selected',
  );
  const input = 'defaultTimeInputColors';
  pick(
    input,
    'TimeInputDefaults',
    'focusedBorderColor',
    'input-outline-color-focused',
    'OutlinedTextFieldDefaults.colors: the selected (focused) field',
  );
  pick(input, 'TimeInputDefaults', 'unfocusedBorderColor', 'input-outline-color');
  pick(input, 'TimeInputDefaults', 'errorContainerColor', 'input-container-color-error');
  pick(input, 'TimeInputDefaults', 'errorBorderColor', 'input-outline-color-error');
  const vibrantInput = 'defaultVibrantTimeInputColors';
  pick(
    vibrantInput,
    'TimeInputDefaults',
    'focusedContainerColor',
    'vibrant-input-container-color-focused',
  );
  pick(
    vibrantInput,
    'TimeInputDefaults',
    'unfocusedContainerColor',
    'vibrant-input-container-color',
  );
  pick(vibrantInput, 'TimeInputDefaults', 'focusedTextColor', 'vibrant-input-label-color-focused');
  pick(vibrantInput, 'TimeInputDefaults', 'unfocusedTextColor', 'vibrant-input-label-color');
  pick(
    vibrantInput,
    'TimeInputDefaults',
    'focusedBorderColor',
    'vibrant-input-outline-color-focused',
  );
  // The vibrant unfocused border is Color.Transparent (no role).
  const transparent = find(
    sources,
    KT,
    /focusedBorderColor = fromToken\(ColorSchemeKeyTokens\.Primary\),\n\s*unfocusedBorderColor = (Color\.Transparent),/d,
  );
  out.push({
    name: `${P}-vibrant-input-outline-color`,
    value: 'transparent',
    js: 'transparent',
    raw: transparent.value,
    owner: 'TimeInputDefaults',
    member: `${vibrantInput}.unfocusedBorderColor`,
    file: KT,
    line: transparent.line,
  });
  pick(
    vibrantInput,
    'TimeInputDefaults',
    'errorContainerColor',
    'vibrant-input-container-color-error',
  );
  pick(vibrantInput, 'TimeInputDefaults', 'errorBorderColor', 'vibrant-input-outline-color-error');

  // MaterialTheme.colorScheme reads in the composables.
  const scheme = (pattern: RegExp, name: string, owner: string, member: string, note?: string) => {
    const r = find(sources, KT, pattern);
    const value = roleVar(r.value);
    out.push({
      name: `${P}-${name}`,
      value,
      js: value,
      raw: `MaterialTheme.colorScheme.${r.value}`,
      owner,
      member,
      file: KT,
      line: r.line,
      ...(note === undefined ? {} : { note }),
    });
  };
  scheme(
    /if \(isValid\) colors\.timeSelectorContainerColor\(selected\)\n\s*else MaterialTheme\.colorScheme\.(\w+)/d,
    'time-selector-container-color-error',
    'TimeSelector',
    'containerColor (invalid)',
    'an unselected TimeInput field with an invalid value',
  );
  scheme(
    /if \(isValid\) colors\.timeSelectorContentColor\(selected\)\n\s*else MaterialTheme\.colorScheme\.(\w+)/d,
    'time-selector-label-color-error',
    'TimeSelector',
    'contentColor (invalid)',
  );
  scheme(
    /if \(isValid\) MaterialTheme\.colorScheme\.primary\n\s*else MaterialTheme\.colorScheme\.(\w+),/d,
    'vibrant-selector-outline-color-error',
    'TimeSelector',
    'border (invalid)',
  );
  scheme(
    /BorderStroke\(\n\s*2\.dp,\n\s*if \(isValid\) MaterialTheme\.colorScheme\.(\w+)/d,
    'vibrant-selector-outline-color',
    'TimeSelector',
    'border',
  );
  scheme(
    /val textColor =\n\s*if \(isValid\) \{\n\s*colors\.timeSelectorContentColor\(selected\)\n\s*\} else \{\n\s*MaterialTheme\.colorScheme\.(\w+)/d,
    'input-label-color-error',
    'TimePickerTextField',
    'textColor (invalid)',
  );
  scheme(
    /val color =\n\s*if \(!isValid\) MaterialTheme\.colorScheme\.(\w+)/d,
    'supporting-text-color-error',
    'SupportingText',
    'color (invalid)',
  );
  scheme(
    /0\.10f to\n\s*shapes\.orVibrant\(\n\s*MaterialTheme\.colorScheme\.(\w+),/d,
    'input-caret-color',
    'TimePickerTextField',
    'cursorBrush (baseline; vibrant: the selected text color)',
    'Compose draws the caret only over 10–90 % of the line (a gradient brush); the web caret is the browser’s',
  );
  return out;
}

/** VibrantTimePickerDialog's container color (a MaterialTheme.colorScheme read). */
function dialogColors(sources: Readonly<Record<string, string>>): TimePickerDefault[] {
  const r = find(
    sources,
    DIALOG,
    /public val vibrantContainerColor: Color\n\s*@Composable get\(\) = MaterialTheme\.colorScheme\.(\w+)/d,
  );
  const value = roleVar(r.value);
  return [
    {
      name: `${P}-vibrant-dialog-container-color`,
      value,
      js: value,
      raw: `MaterialTheme.colorScheme.${r.value}`,
      owner: 'TimePickerDialogDefaults',
      member: 'vibrantContainerColor',
      file: DIALOG,
      line: r.line,
    },
  ];
}

/** ScrollField's colors (MaterialTheme.colorScheme reads in defaultScrollFieldColors). */
function scrollColors(sources: Readonly<Record<string, string>>): TimePickerDefault[] {
  return (
    [
      ['containerColor', 'scroll-field-container-color'],
      ['contentColor', 'scroll-field-label-color'],
      ['selectedContentColor', 'scroll-field-label-color-selected'],
    ] as const
  ).map(([field, name]) => {
    const r = find(
      sources,
      SCROLL,
      new RegExp(
        `ScrollFieldColors\\([\\s\\S]*?${field} = MaterialTheme\\.colorScheme\\.(\\w+),`,
        'd',
      ),
    );
    const value = roleVar(r.value);
    return {
      name: `${P}-${name}`,
      value,
      js: value,
      raw: `MaterialTheme.colorScheme.${r.value}`,
      owner: 'ScrollFieldDefaults',
      member: `defaultScrollFieldColors.${field}`,
      file: SCROLL,
      line: r.line,
    };
  });
}

/** The pager springs a wheel moves on (compose foundation, animation-core). */
function pagerSprings(
  sources: Readonly<Record<string, string>>,
  commit: string,
): TimePickerDefault[] {
  const page = find(
    sources,
    PAGER_STATE,
    /public suspend fun animateScrollToPage\(\n\s*page: Int,\n[^\n]*\n\s*animationSpec: AnimationSpec<Float> = (spring)\(\),/d,
  );
  const snap = find(
    sources,
    PAGER,
    /snapAnimationSpec: AnimationSpec<Float> =\n\s*spring\(\n\s*stiffness = Spring\.(\w+),/d,
  );
  const defaults = find(
    sources,
    SPEC,
    /public fun <T> spring\(\n\s*dampingRatio: Float = Spring\.(\w+),\n\s*stiffness: Float = Spring\.(\w+),/d,
  );
  const constant = (name: string) =>
    find(sources, VECTORIZED, new RegExp(`public const val ${name}: Float = ([\\d_.]+)f`, 'd'));
  const damping = constant(defaults.value);
  const defaultStiffness = constant(defaults.groups[2]!);
  const snapStiffness = constant(snap.value);
  const num = (v: string) => Number(v.replace(/_/g, ''));
  const cite = (file: string, line: number) =>
    `${file === PAGER || file === PAGER_STATE ? `${FOUNDATION_PATH}/commonMain/kotlin/androidx/compose/foundation/pager` : ANIMATION_CORE_PATH}/${file}@${commit} L${String(line)}`;
  const spring = (
    name: string,
    member: string,
    file: string,
    line: number,
    stiffness: { value: string; line: number },
    note: string,
  ): TimePickerDefault[] => {
    const spec = { dampingRatio: num(damping.value), stiffness: num(stiffness.value) };
    const linear = springToLinear(spec);
    const base = { owner: file === PAGER ? 'PagerDefaults' : 'PagerState', member };
    return [
      {
        ...base,
        file,
        name: `${P}-${name}-duration`,
        value: `${String(linear.durationMillis)}ms`,
        js: linear.durationMillis,
        raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}`,
        line,
        cite: cite(file, line),
        note: `${note}; springToLinear() (m3e-motion) duration estimate, 0ms with prefers-reduced-motion`,
      },
      {
        ...base,
        file: VECTORIZED,
        name: `${P}-${name}-damping-ratio`,
        value: String(spec.dampingRatio),
        js: spec.dampingRatio,
        raw: `Spring.${defaults.value} = ${damping.value}f`,
        line: damping.line,
        cite: cite(VECTORIZED, damping.line),
      },
      {
        ...base,
        file: VECTORIZED,
        name: `${P}-${name}-stiffness`,
        value: String(spec.stiffness),
        js: spec.stiffness,
        raw: `${stiffness.value}f`,
        line: stiffness.line,
        cite: cite(VECTORIZED, stiffness.line),
      },
    ];
  };
  return [
    ...spring(
      'scroll-page',
      'animateScrollToPage',
      PAGER_STATE,
      page.line,
      defaultStiffness,
      'a wheel’s Up / Down and item clicks: spring() (ζ 1, StiffnessMedium)',
    ),
    ...spring(
      'scroll-settle',
      'flingBehavior snapAnimationSpec',
      PAGER,
      snap.line,
      snapStiffness,
      'a wheel settling on a row after a drag: spring(StiffnessMediumLow)',
    ),
  ];
}

/** Values with no regex-friendly shape: the bold weight, the 12h period / vibrant shapes. */
function fixed(sources: Readonly<Record<string, string>>): TimePickerDefault[] {
  const bold = find(sources, KT, /style\.copy\(fontWeight = FontWeight\.(Bold)\)/d);
  const vibrantShape = find(sources, KT, /timeFieldShape = fromToken\(ShapeKeyTokens\.(\w+)\),/d);
  const shape = `var(--m3e-sys-shape-${kebabName(vibrantShape.value)})`;
  const displayLarge = find(
    sources,
    KT,
    /TimeInputTokens\.TimeFieldLabelTextFont\.value,\n\s*TypographyKeyTokens\.(DisplayLarge)\.value,/d,
  );
  const style = kebabName(displayLarge.value);
  return [
    {
      name: `${P}-period-label-weight-selected`,
      value: '700',
      js: 700,
      raw: `FontWeight.${bold.value}`,
      owner: 'PeriodToggleImpl',
      member: 'checked label style',
      file: KT,
      line: bold.line,
      note: 'isUpdatedTimepickerToggleEnabled: the checked AM / PM label is bold (FontWeight.Bold = 700)',
    },
    {
      name: `${P}-vibrant-time-field-shape`,
      value: shape,
      js: shape,
      raw: `ShapeKeyTokens.${vibrantShape.value}`,
      owner: 'TimePickerDefaults',
      member: 'defaultTimePickerShapes.timeFieldShape',
      file: KT,
      line: vibrantShape.line,
      note: 'vibrant time selectors and inputs (TimePickerDefaults.shapes())',
    },
    ...(['font', 'weight', 'size', 'line-height', 'tracking'] as const).map((field) => ({
      name: `${P}-vibrant-time-field-label-text-${field}`,
      value: `var(--m3e-sys-typescale-${style}-${field})`,
      js: `var(--m3e-sys-typescale-${style}-${field})`,
      raw: `TypographyKeyTokens.${displayLarge.value}`,
      owner: 'TimeInputImpl / TimeScrollImpl',
      member: 'textStyle (vibrant)',
      file: KT,
      line: displayLarge.line,
    })),
  ];
}

/** `sources`: vendored files by name (Material3 sources, foundation pager, animation-core). */
export function extractTimePickerDefaults(
  sources: Readonly<Record<string, string>>,
  commit: string,
): TimePickerDefault[] {
  const literals = extractLiterals(
    'time-picker-defaults',
    TIME_PICKER_DEFAULTS_SOURCES,
    RULES,
    CHECKS,
    sources,
  );
  return [
    ...[
      ...literals,
      ...colors(sources),
      ...dialogColors(sources),
      ...scrollColors(sources),
      ...fixed(sources),
    ].map((d) => ({
      ...d,
      cite: `${MATERIAL3_PATH}/${d.file}@${commit} L${String(d.line)}`,
    })),
    ...pagerSprings(sources, commit),
  ];
}
