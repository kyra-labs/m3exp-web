// Values Compose's RadioButton renders (RadioButton.kt) that are not RadioButtonTokens, or that
// pick one of them:
// - RadioButtonPadding (2dp) around the IconSize (20dp) circle, RadioStrokeWidth (2dp) for the
//   ring (radius IconSize / 2 − stroke / 2) and RadioButtonDotSize (12dp): the dot radius animates
//   to RadioButtonDotSize / 2 when selected and 0 otherwise, drawn at animated radius − stroke / 2
//   (5dp at rest; nothing while the animated radius is ≤ 0);
// - the motion: the dot radius on FastSpatial (it overshoots under the expressive scheme), the
//   color on DefaultEffects, snapping while disabled (both under upstream "TODO Load the
//   motionScheme tokens from the component tokens file");
// - defaultRadioButtonColors: one color per enabled × selected for the ring and the dot;
// - the ripple: unbounded, radius StateLayerSize / 2, no color (Color.Unspecified → the content
//   color), focusRingShape CircleShape;
// - the RadioGroupSample rows (Compose catalog): 56dp high, the label 16dp after the (24dp,
//   non-clickable) radio, bodyLarge.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// radio-button.css assumes (layout, draw order, transitions, color states) changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type RadioButtonDefault = ComposeLiteral;

const KT = 'RadioButton.kt';
const SAMPLES = 'RadioButtonSamples.kt';

export const RADIO_BUTTON_DEFAULTS_SOURCES = [KT, SAMPLES];

const P = '--m3e-comp-radio-button';

const RULES: readonly LiteralRule[] = [
  {
    kind: 'dp',
    name: `${P}-padding`,
    owner: KT,
    member: 'RadioButtonPadding',
    file: KT,
    pattern: /private val RadioButtonPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'RadioButtonImpl padding around the IconSize circle: inside the 48dp minimum interactive size when clickable; a non-clickable radio (onClick = null, as in RadioGroupSample) is IconSize + 2 × this',
  },
  {
    kind: 'dp',
    name: `${P}-dot-size`,
    owner: KT,
    member: 'RadioButtonDotSize',
    file: KT,
    pattern: /private val RadioButtonDotSize\n\s*get\(\) = (\d+)\.dp/d,
    note: 'RadioButton: dotRadius = this / 2 when selected, else 0dp (L91); drawn at animatedDotRadius − stroke width / 2 (L188-189), so a 10dp dot at rest',
  },
  {
    kind: 'dp',
    name: `${P}-stroke-width`,
    owner: KT,
    member: 'RadioStrokeWidth',
    file: KT,
    pattern: /private val RadioStrokeWidth\n\s*get\(\) = (\d+)\.dp/d,
    note: 'the ring: drawCircle(radius = IconSize / 2 − this / 2, Stroke(this)), so its outer edge is the IconSize circle',
  },
  {
    kind: 'motion',
    name: `${P}-dot`,
    owner: 'RadioButtonImpl',
    member: 'animatedDotRadius',
    file: KT,
    pattern:
      /animateDpAsState\(\n\s*targetValue = dotRadius,\n\s*\/\/ TODO[^\n]*\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    note: 'animateDpAsState: the dot radius 0 ↔ dot-size / 2; under the expressive scheme the spring overshoots (the dot grows past 5dp and settles; shrinking, it passes 0 and draws nothing)',
  },
  {
    kind: 'motion',
    name: `${P}-color`,
    owner: 'RadioButtonImpl',
    member: 'animatedColor',
    file: KT,
    pattern: /animateColorAsState\(color, MotionSchemeKeyTokens\.(\w+)\.value\(\)\)/d,
    note: 'ring and dot color while enabled; disabled snaps (rememberUpdatedState, L148-151)',
  },
  {
    kind: 'token',
    name: `${P}-color-selected`,
    owner: 'RadioButtonDefaults',
    member: 'defaultRadioButtonColors(selectedColor)',
    file: KT,
    pattern: /\bselectedColor = fromToken\((RadioButtonTokens\.\w+)\),/d,
  },
  {
    kind: 'token',
    name: `${P}-color-unselected`,
    owner: 'RadioButtonDefaults',
    member: 'defaultRadioButtonColors(unselectedColor)',
    file: KT,
    pattern: /unselectedColor = fromToken\((RadioButtonTokens\.\w+)\),/d,
  },
  {
    kind: 'token',
    name: `${P}-color-selected-disabled`,
    owner: 'RadioButtonDefaults',
    member: 'defaultRadioButtonColors(disabledSelectedColor)',
    file: KT,
    pattern: /disabledSelectedColor =\n\s*fromToken\((RadioButtonTokens\.\w+)\)/d,
    note: 'at opacity-selected-disabled (Color.copy(alpha): the token color at this opacity, not composited)',
  },
  {
    kind: 'token',
    name: `${P}-opacity-selected-disabled`,
    owner: 'RadioButtonDefaults',
    member: 'defaultRadioButtonColors(disabledSelectedColor alpha)',
    file: KT,
    pattern:
      /disabledSelectedColor =\n\s*fromToken\(RadioButtonTokens\.\w+\)\n\s*\.copy\(alpha = (RadioButtonTokens\.\w+)\)/d,
  },
  {
    kind: 'token',
    name: `${P}-color-unselected-disabled`,
    owner: 'RadioButtonDefaults',
    member: 'defaultRadioButtonColors(disabledUnselectedColor)',
    file: KT,
    pattern: /disabledUnselectedColor =\n\s*fromToken\((RadioButtonTokens\.\w+)\)/d,
    note: 'at opacity-unselected-disabled',
  },
  {
    kind: 'token',
    name: `${P}-opacity-unselected-disabled`,
    owner: 'RadioButtonDefaults',
    member: 'defaultRadioButtonColors(disabledUnselectedColor alpha)',
    file: KT,
    pattern:
      /disabledUnselectedColor =\n\s*fromToken\(RadioButtonTokens\.\w+\)\n\s*\.copy\(alpha = (RadioButtonTokens\.\w+)\)/d,
  },
  {
    kind: 'keyword',
    name: `${P}-state-layer-color`,
    owner: 'RadioButtonImpl',
    member: 'ripple(color)',
    file: KT,
    pattern:
      /(ripple)\(\n\s*bounded = false,\n\s*radius = RadioButtonTokens\.StateLayerSize \/ 2,\n\s*focusRingShape = CircleShape,\n\s*\)/d,
    keyword: 'Color.Unspecified',
    note: 'ripple() without a color: its default Color.Unspecified → LocalContentColor (the inherited text color), whether or not the radio is selected (owner decision M8 #4)',
  },
  {
    kind: 'keyword',
    name: `${P}-state-layer-shape`,
    owner: 'RadioButtonImpl',
    member: 'ripple(focusRingShape)',
    file: KT,
    pattern: /focusRingShape = (CircleShape),/d,
    note: 'the unbounded ripple is a circle of radius StateLayerSize / 2 (RadioButtonTokens has no shape token)',
  },
  {
    kind: 'dp',
    name: `${P}-group-row-height`,
    owner: 'RadioGroupSample',
    member: 'Row(Modifier.height)',
    file: SAMPLES,
    pattern: /Modifier\.fillMaxWidth\(\)\n\s*\.height\((\d+)\.dp\)\n\s*\.selectable\(/d,
    note: 'Compose catalog "Radio group": each option row (selectable, Role.RadioButton) is this high',
  },
  {
    kind: 'dp',
    name: `${P}-label-space`,
    owner: 'RadioGroupSample',
    member: 'Text(modifier = Modifier.padding(start))',
    file: SAMPLES,
    pattern:
      /style = MaterialTheme\.typography\.bodyLarge,\n\s*modifier = Modifier\.padding\(start = (\d+)\.dp\),/d,
    note: 'Compose catalog "Radio group": the label starts this far after the radio, which is not clickable there (onClick = null): IconSize + 2 × padding = 24dp wide, not the 48dp minimum interactive size',
  },
  {
    kind: 'type',
    name: `${P}-label-text`,
    owner: 'RadioGroupSample',
    member: 'Text(style)',
    file: SAMPLES,
    pattern: /text = text,\n\s*style = MaterialTheme\.typography\.(bodyLarge),/d,
    note: 'Text color: LocalContentColor (inherited)',
  },
];

/** Wiring radio-button.css assumes. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'RadioButton: radioColor(enabled, selected); dotRadius RadioButtonDotSize / 2 when selected, else 0',
    /color = colors\.radioColor\(enabled, selected\),\n\s*dotRadius = if \(selected\) RadioButtonDotSize \/ 2 else 0\.dp,/,
  ],
  [
    KT,
    'the color animates while enabled and snaps while disabled',
    /val animatedColor by\n\s*if \(enabled\) \{[\s\S]*?animateColorAsState\(color, [\s\S]*?\} else \{[\s\S]*?rememberUpdatedState\(color\)/,
  ],
  [
    KT,
    'clickable: minimum interactive size, selectable with Role.RadioButton, unbounded ripple of radius StateLayerSize / 2',
    /Modifier\.minimumInteractiveComponentSize\(\)\n\s*\.selectable\([\s\S]*?role = Role\.RadioButton,[\s\S]*?ripple\(\n\s*bounded = false,\n\s*radius = RadioButtonTokens\.StateLayerSize \/ 2,/,
  ],
  [
    KT,
    'the circle is centred, padded and IconSize',
    /\.wrapContentSize\(Alignment\.Center\)\n\s*\.padding\(RadioButtonPadding\)\n\s*\.requiredSize\(RadioButtonTokens\.IconSize\)/,
  ],
  [
    KT,
    'draw: the ring (IconSize / 2 − stroke / 2, stroked) then, while the radius > 0, the dot (radius − stroke / 2, filled), one color',
    /val strokeWidth = RadioStrokeWidth\.toPx\(\)\n\s*drawCircle\(\n\s*animatedColor,\n\s*radius = \(RadioButtonTokens\.IconSize \/ 2\)\.toPx\(\) - strokeWidth \/ 2,\n\s*style = Stroke\(strokeWidth\),\n\s*\)\n\s*if \(animatedDotRadius > 0\.dp\) \{\n\s*drawCircle\(animatedColor, animatedDotRadius\.toPx\(\) - strokeWidth \/ 2, style = Fill\)/,
  ],
  [
    KT,
    'radioColor: selected / unselected × enabled / disabled',
    /enabled && selected -> selectedColor\n\s*enabled && !selected -> unselectedColor\n\s*!enabled && selected -> disabledSelectedColor\n\s*else -> disabledUnselectedColor/,
  ],
  [
    SAMPLES,
    'RadioGroupSample: selectableGroup, rows selectable with Role.RadioButton, the radio not clickable',
    /Column\(Modifier\.selectableGroup\(\)\)[\s\S]*?role = Role\.RadioButton,[\s\S]*?onClick = null,/,
  ],
];

/** `sources`: vendored Material3 files and samples by name (RadioButton.kt, RadioButtonSamples.kt). */
export function extractRadioButtonDefaults(
  sources: Readonly<Record<string, string>>,
): RadioButtonDefault[] {
  return extractLiterals(
    'radio-button-defaults',
    RADIO_BUTTON_DEFAULTS_SOURCES,
    RULES,
    CHECKS,
    sources,
  );
}
