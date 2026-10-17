// Values Compose's Switch renders (Switch.kt) that are not SwitchTokens, or that pick one of them:
// - the handle (thumb) diameters ThumbNode.measure picks: PressedHandleWidth while pressed,
//   ThumbDiameter (SelectedHandleWidth) when checked or with thumbContent (an icon), else
//   UncheckedThumbDiameter (UnselectedHandleWidth); SwitchTokens.IconHandleWidth is not read;
// - the motion: handle offset and size on FastSpatial, but SnapSpec while pressed (the press
//   snaps, release and toggles spring; upstream "TODO Load the motionScheme tokens from the
//   component tokens file"); colors are plain backgrounds (not animated);
// - defaultSwitchColors: thumb, track, border and icon per enabled × checked; the disabled ones
//   are `fromToken(color).copy(alpha).compositeOver(surface)`, opaque mixes over Surface;
// - SwitchDefaults.IconSize (16dp, the thumbContent icon size, SwitchWithThumbIconSample);
// - the ripple: unbounded on the thumb, radius StateLayerSize / 2, no color (Color.Unspecified →
//   the content color);
// - the inline label m3.material.io asks for ("Switches should always be paired with an inline
//   label"; Compose has no switch-with-label sample): the expressive ListItem's spacing between
//   content and trailing content and its label text style, the list row m3.material.io shows a
//   trailing switch in (Lists › Configurations).
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// switch.css assumes (track box, thumb measure / offsets / snap, color selection) changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type SwitchDefault = ComposeLiteral;

const KT = 'Switch.kt';
const SAMPLES = 'SwitchSamples.kt';
const LIST = 'ListItem.kt';

export const SWITCH_DEFAULTS_SOURCES = [KT, SAMPLES, LIST];

const P = '--m3e-comp-switch';

/** defaultSwitchColors, enabled: [variable, SwitchColors member] (`fromToken(...)`). */
const COLORS: readonly [string, string][] = [
  ['handle-color-checked', 'checkedThumbColor'],
  ['track-color-checked', 'checkedTrackColor'],
  ['icon-color-checked', 'checkedIconColor'],
  ['handle-color-unchecked', 'uncheckedThumbColor'],
  ['track-color-unchecked', 'uncheckedTrackColor'],
  ['icon-color-unchecked', 'uncheckedIconColor'],
];

/** defaultSwitchColors, disabled: composited over Surface (`...compositeOver(surface)`). */
const DISABLED: readonly [string, string][] = [
  ['handle-color-checked-disabled', 'disabledCheckedThumbColor'],
  ['track-color-checked-disabled', 'disabledCheckedTrackColor'],
  ['icon-color-checked-disabled', 'disabledCheckedIconColor'],
  ['handle-color-unchecked-disabled', 'disabledUncheckedThumbColor'],
  ['track-color-unchecked-disabled', 'disabledUncheckedTrackColor'],
  ['track-outline-color-unchecked-disabled', 'disabledUncheckedBorderColor'],
  ['icon-color-unchecked-disabled', 'disabledUncheckedIconColor'],
];

const RULES: readonly LiteralRule[] = [
  {
    kind: 'token',
    name: `${P}-thumb-diameter`,
    owner: KT,
    member: 'ThumbDiameter',
    file: KT,
    pattern: /internal val ThumbDiameter\n\s*get\(\) = (SwitchTokens\.\w+)/d,
    note: 'ThumbNode.measure: the handle when checked, or when it has thumbContent (an icon), checked or not; SwitchTokens.IconHandleWidth is not read',
  },
  {
    kind: 'token',
    name: `${P}-unchecked-thumb-diameter`,
    owner: KT,
    member: 'UncheckedThumbDiameter',
    file: KT,
    pattern: /internal val UncheckedThumbDiameter\n\s*get\(\) = (SwitchTokens\.\w+)/d,
    note: 'ThumbNode.measure: the handle when unchecked without thumbContent',
  },
  {
    kind: 'token',
    name: `${P}-pressed-thumb-diameter`,
    owner: 'ThumbNode',
    member: 'measure(isPressed)',
    file: KT,
    pattern: /isPressed -> (SwitchTokens\.\w+)\n/d,
    note: 'while pressed, checked or not; offset TrackOutlineWidth from the start (unchecked) or maxBound − TrackOutlineWidth (checked)',
  },
  {
    kind: 'motion',
    name: `${P}-handle`,
    owner: 'SwitchImpl',
    member: 'ThumbElement(animationSpec)',
    file: KT,
    pattern:
      /ThumbElement\(\n[\s\S]*?\/\/ TODO[^\n]*\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    note: 'the handle offset and size (Animatable<Float>) towards their targets when not pressed: release, cancel and toggles; under the expressive scheme the spring overshoots',
  },
  {
    kind: 'keyword',
    name: `${P}-handle-press-duration`,
    owner: KT,
    member: 'SnapSpec',
    file: KT,
    pattern: /private val SnapSpec = (SnapSpec<Float>\(\))/d,
    note: 'ThumbNode: offset and size animateTo(target, SnapSpec) while pressed: the handle jumps to its pressed size and offset',
  },
  ...COLORS.map(([name, member]): LiteralRule => ({
    kind: 'token',
    name: `${P}-${name}`,
    owner: 'SwitchDefaults',
    member: `defaultSwitchColors(${member})`,
    file: KT,
    pattern: new RegExp(`\\b${member} = fromToken\\((SwitchTokens\\.\\w+)\\),`, 'd'),
  })),
  {
    kind: 'token',
    name: `${P}-track-outline-color-unchecked`,
    owner: 'SwitchDefaults',
    member: 'defaultSwitchColors(uncheckedBorderColor)',
    file: KT,
    pattern: /\buncheckedBorderColor =\n\s*fromToken\((SwitchTokens\.\w+)\),/d,
    note: 'the 2dp track outline (TrackOutlineWidth) while unchecked',
  },
  {
    kind: 'keyword',
    name: `${P}-track-outline-color-checked`,
    owner: 'SwitchDefaults',
    member: 'defaultSwitchColors(checkedBorderColor)',
    file: KT,
    pattern: /\bcheckedBorderColor = (Color\.Transparent),/d,
  },
  {
    kind: 'keyword',
    name: `${P}-track-outline-color-checked-disabled`,
    owner: 'SwitchDefaults',
    member: 'defaultSwitchColors(disabledCheckedBorderColor)',
    file: KT,
    pattern: /\bdisabledCheckedBorderColor = (Color\.Transparent),/d,
  },
  ...DISABLED.map(([name, member]): LiteralRule => ({
    kind: 'composite',
    name: `${P}-${name}`,
    owner: 'SwitchDefaults',
    member: `defaultSwitchColors(${member})`,
    file: KT,
    pattern: new RegExp(
      `\\b${member} =\\n\\s*fromToken\\((SwitchTokens\\.\\w+)\\)\\n\\s*\\.copy\\(alpha = (SwitchTokens\\.\\w+)\\)\\n\\s*\\.compositeOver\\((\\w+)\\),`,
      'd',
    ),
    note: 'Color.copy(alpha).compositeOver(surface): opaque',
  })),
  {
    kind: 'dp',
    name: `${P}-icon-size`,
    owner: 'SwitchDefaults',
    member: 'IconSize',
    file: KT,
    pattern: /public val IconSize: Dp = (\d+)\.dp/d,
    note: 'thumbContent icons (SwitchWithThumbIconSample: Icon(Modifier.size(SwitchDefaults.IconSize))), centred in the handle',
  },
  {
    kind: 'keyword',
    name: `${P}-state-layer-color`,
    owner: 'SwitchImpl',
    member: 'ripple(color)',
    file: KT,
    pattern:
      /(ripple)\(\n\s*bounded = false,\n\s*radius = SwitchTokens\.StateLayerSize \/ 2,\n\s*enableFocusIndication = !useInsetRing,\n\s*\)/d,
    keyword: 'Color.Unspecified',
    note: 'ripple() without a color: its default Color.Unspecified → LocalContentColor (the inherited text color), checked or not (owner decision M8 #4); unbounded, on the thumb (it moves with it)',
  },
  {
    kind: 'token',
    name: `${P}-label-space`,
    owner: 'ListItem',
    member: 'InteractiveListInternalSpacing',
    file: LIST,
    pattern: /internal val InteractiveListInternalSpacing\n\s*get\(\) = (ListTokens\.\w+)/d,
    note: 'the inline label (m3.material.io Switch › Guidelines "Label text"; Compose has no switch-with-label sample): the expressive ListItem spacing between its content and a trailing switch (m3.material.io Lists › Configurations "Trailing switch")',
  },
  {
    kind: 'typeToken',
    name: `${P}-label-text`,
    owner: 'ListItem',
    member: 'InteractiveListItem(contentTextStyle)',
    file: LIST,
    pattern: /val contentTextStyle = (ListTokens\.\w+)\n/d,
    note: 'the inline label in the list item label style; color: the content color (m3.material.io "Adjacent text label color": on surface)',
  },
];

/** Wiring switch.css assumes. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'Switch: thumb / icon / track / border colors by (enabled, checked)',
    /thumbColor = colors\.thumbColor\(enabled, checked\),\n\s*iconColor = colors\.iconColor\(enabled, checked\),\n\s*trackColor = colors\.trackColor\(enabled, checked\),\n\s*borderColor = colors\.borderColor\(enabled, checked\),/,
  ],
  [
    KT,
    'clickable: minimum interactive size, toggleable with Role.Switch, no indication on the track',
    /Modifier\.minimumInteractiveComponentSize\(\)\n\s*\.toggleable\([\s\S]*?role = Role\.Switch,[\s\S]*?indication = null,/,
  ],
  [
    KT,
    'the track: SwitchWidth × SwitchHeight, outlined (drawn over the content) on its background',
    /\.requiredSize\(SwitchWidth, SwitchHeight\)\n\s*\.border\(TrackOutlineWidth, borderColor, trackShape\)\n\s*\.background\(trackColor, trackShape\)/,
  ],
  [
    KT,
    'the thumb: CenterStart, ThumbElement, the unbounded ripple, a plain (not animated) background; the icon in iconColor',
    /Modifier\.align\(Alignment\.CenterStart\)[\s\S]*?ThumbElement\([\s\S]*?\.indication\([\s\S]*?ripple\([\s\S]*?\.background\(thumbColor, thumbShape\),\n\s*contentAlignment = Alignment\.Center,[\s\S]*?LocalContentColor provides iconColor,/,
  ],
  [
    KT,
    'measure: pressed → PressedHandleWidth, content or checked → ThumbDiameter, else UncheckedThumbDiameter',
    /isPressed -> SwitchTokens\.PressedHandleWidth\n\s*hasContent \|\| checked -> ThumbDiameter\n\s*else -> UncheckedThumbDiameter/,
  ],
  [
    KT,
    'offsets: unchecked centred by the target size; checked (SwitchWidth − ThumbDiameter) − ThumbPadding; pressed TrackOutlineWidth in from either end',
    /val thumbPaddingStart = \(SwitchHeight - size\.toDp\(\)\) \/ 2f\n\s*val minBound = thumbPaddingStart\.toPx\(\)\n\s*val thumbPathLength = \(SwitchWidth - ThumbDiameter\) - ThumbPadding\n\s*val maxBound = thumbPathLength\.toPx\(\)\n\s*val offset =\n\s*when \{\n\s*isPressed && checked -> maxBound - TrackOutlineWidth\.toPx\(\)\n\s*isPressed && !checked -> TrackOutlineWidth\.toPx\(\)\n\s*checked -> maxBound\n\s*else -> minBound/,
  ],
  [
    KT,
    'size and offset snap while pressed, else the animation spec',
    /sizeAnim\?\.animateTo\(size, if \(isPressed\) SnapSpec else animationSpec\)[\s\S]*?offsetAnim\?\.animateTo\(offset, if \(isPressed\) SnapSpec else animationSpec\)/,
  ],
  [
    KT,
    'the content is placed at the offset from the start (placeRelative: mirrored in RTL)',
    /placeable\.placeRelative\(offsetAnim\?\.value\?\.toInt\(\) \?: offset\.toInt\(\), 0\)/,
  ],
  [
    KT,
    'SwitchWidth / SwitchHeight = the track; ThumbPadding = (SwitchHeight − ThumbDiameter) / 2',
    /private val SwitchWidth\n\s*get\(\) = SwitchTokens\.TrackWidth\nprivate val SwitchHeight\n\s*get\(\) = SwitchTokens\.TrackHeight\nprivate val ThumbPadding = \(SwitchHeight - ThumbDiameter\) \/ 2/,
  ],
  [
    KT,
    'thumbColor: checked / unchecked × enabled / disabled',
    /if \(enabled\) \{\n\s*if \(checked\) checkedThumbColor else uncheckedThumbColor\n\s*\} else \{\n\s*if \(checked\) disabledCheckedThumbColor else disabledUncheckedThumbColor/,
  ],
  [
    SAMPLES,
    'SwitchWithThumbIconSample: a check icon of IconSize, only while checked',
    /thumbContent = \{\n\s*if \(checked\) \{[\s\S]*?imageVector = Icons\.Filled\.Check,[\s\S]*?Modifier\.size\(SwitchDefaults\.IconSize\)/,
  ],
];

/** `sources`: vendored Material3 files and samples by name (Switch.kt, SwitchSamples.kt, ListItem.kt). */
export function extractSwitchDefaults(sources: Readonly<Record<string, string>>): SwitchDefault[] {
  return extractLiterals('switch-defaults', SWITCH_DEFAULTS_SOURCES, RULES, CHECKS, sources);
}
