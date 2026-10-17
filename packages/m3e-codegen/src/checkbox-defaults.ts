// Values Compose's Checkbox / TriStateCheckbox render (Checkbox.kt) that are not CheckboxTokens,
// or that pick one of them:
// - ComposeMaterial3Flags.isCheckboxStylingFixEnabled (`false` at the pin) picks CheckboxImpl's
//   branches. Both are emitted: flag off (the plain names) = a 20dp box (CheckboxSize), 2dp padding
//   (CheckboxDefaultPadding), check points cross 0.4 / 0.7, left 0.2 / 0.5, right 0.8 / 0.3, a
//   ripple in the content color (Color.Unspecified → LocalContentColor) and a checkmark colored by
//   state only (a disabled checkmark keeps SelectedIconColor); flag on (`-styling-fix`) =
//   CheckboxTokens.ContainerSize 18dp, no padding, 0.25 / 0.65 / 0.75, disabledCheckmarkColor
//   (SelectedDisabledIconColor) and the ripple in the box color (indicatorColor). 2dp corners
//   (RadiusSize) either way. `--m3e-comp-checkbox-styling-fix` selects one: 1 by owner decision
//   (M8 checkbox #1);
// - CheckboxDefaults.StrokeWidth (2dp, floored to device px) for both the outline and the check,
//   drawn with square caps;
// - defaultCheckboxColors: box / border / checkmark per enabled × state (indeterminate = checked);
// - the motion: the check draw fraction and the cross-center gravitation on DefaultSpatial, both
//   snapping after SnapAnimationDelay (100ms) towards unchecked (the gravitation also snaps when
//   leaving unchecked); box, border and checkmark colors on DefaultEffects (to checked /
//   indeterminate) and FastEffects (to unchecked), box and border snapping while disabled (all
//   under upstream "TODO Load the motionScheme tokens from the component tokens file");
// - the CheckboxWithTextSample label (Compose catalog): 16dp after the 48dp checkbox, bodyLarge.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// checkbox.css assumes (flag branches, path, draw order, transitions) changes upstream.
import { compVar, kebabName } from './names.js';

export interface CheckboxDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts (dp / fraction number or the CSS string). */
  js: number | string;
  /** Source expression as written upstream. */
  raw: string;
  owner: string;
  member: string;
  /** Vendored file name. */
  file: string;
  line: number;
  note?: string;
}

const KT = 'Checkbox.kt';
const FLAGS = 'ComposeMaterial3Flags.kt';
const SAMPLES = 'CheckboxSamples.kt';

export const CHECKBOX_DEFAULTS_SOURCES = [KT, FLAGS, SAMPLES];

const P = '--m3e-comp-checkbox';
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;
const TYPE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;

type Kind = 'dp' | 'fraction' | 'ms' | 'motion' | 'token' | 'type' | 'alias' | 'flag' | 'keyword';

interface Rule {
  kind: Kind;
  name: string;
  owner: string;
  member: string;
  file: string;
  /** First capture group: a literal, a motion key, a `CheckboxTokens.<Member>` reference. */
  pattern: RegExp;
  /** `flag`: the value emitted instead of the upstream default (an owner decision). */
  enabled?: boolean;
  /** `alias`: the emitted variable whose value this one repeats. */
  alias?: string;
  note?: string;
}

const FLAG_OFF = 'isCheckboxStylingFixEnabled false (Compose’s default; not the M8 default)';

const RULES: readonly Rule[] = [
  {
    kind: 'flag',
    name: `${P}-styling-fix`,
    owner: 'ComposeMaterial3Flags',
    member: 'isCheckboxStylingFixEnabled',
    file: FLAGS,
    pattern: /public var isCheckboxStylingFixEnabled: Boolean = (false|true)/d,
    enabled: true,
    note: 'owner decision (M8 checkbox #1): emitted as 1 (flag on: the -styling-fix values, which match CheckboxTokens and m3.material.io) although the pin defaults to false (0: the values without -styling-fix, Compose’s older styling). checkbox.css mixes the two branches by this number, so one declaration (e.g. on :root) switches every checkbox, as the Compose flag does',
  },
  {
    kind: 'dp',
    name: `${P}-box-size`,
    owner: KT,
    member: 'CheckboxSize',
    file: KT,
    pattern: /private val CheckboxSize\n\s*get\(\) = (\d+)\.dp/d,
    note: `${FLAG_OFF}: CheckboxImpl requiredSize (CheckboxTokens.ContainerSize 18dp is read only with the flag)`,
  },
  {
    kind: 'dp',
    name: `${P}-box-padding`,
    owner: KT,
    member: 'CheckboxDefaultPadding',
    file: KT,
    pattern: /private val CheckboxDefaultPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: `${FLAG_OFF}: around the box (inside the 48dp minimum interactive size when clickable; a non-clickable checkbox is box + 2 × this)`,
  },
  {
    kind: 'dp',
    name: `${P}-box-corner-radius`,
    owner: KT,
    member: 'RadiusSize',
    file: KT,
    pattern: /private val RadiusSize\n\s*get\(\) = (\d+)\.dp/d,
    note: 'drawBox: the outline’s outer corner radius; the fill inside the outline uses max(0, radius − stroke width)',
  },
  {
    kind: 'dp',
    name: `${P}-stroke-width`,
    owner: 'CheckboxDefaults',
    member: 'StrokeWidth',
    file: KT,
    pattern: /public val StrokeWidth: Dp = (\d+)\.dp/d,
    note: 'floor(toPx()): the box outline and the check (square caps); 2px on the web (device px floors are not modelled)',
  },
  {
    kind: 'fraction',
    name: `${P}-check-cross-x`,
    owner: 'drawCheck',
    member: 'checkCrossX',
    file: KT,
    pattern: /val checkCrossX = ([\d.]+)f/d,
    note: 'the check’s corner, a fraction of the box width (x from the start edge)',
  },
  {
    kind: 'fraction',
    name: `${P}-check-cross-y`,
    owner: 'drawCheck',
    member: 'checkCrossY',
    file: KT,
    pattern: /val checkCrossY = if \(isCheckboxStylingFixEnabled\) [\d.]+f else ([\d.]+)f/d,
    note: `${FLAG_OFF} (0.65 with the flag); y from the top`,
  },
  {
    kind: 'fraction',
    name: `${P}-check-left-x`,
    owner: 'drawCheck',
    member: 'leftX',
    file: KT,
    pattern: /val leftX = if \(isCheckboxStylingFixEnabled\) [\d.]+f else ([\d.]+)f/d,
    note: `${FLAG_OFF} (0.25 with the flag): the path start`,
  },
  {
    kind: 'fraction',
    name: `${P}-check-left-y`,
    owner: 'drawCheck',
    member: 'leftY',
    file: KT,
    pattern: /val leftY = ([\d.]+)f/d,
  },
  {
    kind: 'fraction',
    name: `${P}-check-right-x`,
    owner: 'drawCheck',
    member: 'rightX',
    file: KT,
    pattern: /val rightX = if \(isCheckboxStylingFixEnabled\) [\d.]+f else ([\d.]+)f/d,
    note: `${FLAG_OFF} (0.75 with the flag): the path end`,
  },
  {
    kind: 'fraction',
    name: `${P}-check-right-y`,
    owner: 'drawCheck',
    member: 'rightY',
    file: KT,
    pattern: /val rightY = ([\d.]+)f/d,
  },
  {
    kind: 'fraction',
    name: `${P}-check-gravitation-center`,
    owner: 'drawCheck',
    member: 'lerp(…, center, crossCenterGravitation)',
    file: KT,
    pattern: /val gravitatedCrossX = lerp\(checkCrossX, ([\d.]+)f, crossCenterGravitation\)/d,
    note: 'indeterminate (gravitation 1): the cross moves to (center, center) and both ends to y = center, a dash (cross y, left y and right y lerp to it too, L721-724)',
  },
  {
    kind: 'motion',
    name: `${P}-check`,
    owner: 'CheckboxImpl',
    member: 'defaultAnimationSpec',
    file: KT,
    pattern: /val defaultAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'checkDrawFraction (unchecked 0, checked / indeterminate 1) and checkCenterGravitationShiftFraction (indeterminate 1, else 0): Transition.animateFloat; leaving unchecked the gravitation snaps instead',
  },
  {
    kind: 'ms',
    name: `${P}-snap-delay`,
    owner: KT,
    member: 'SnapAnimationDelay',
    file: KT,
    pattern: /private const val SnapAnimationDelay = (\d+)/d,
    note: 'towards unchecked both fractions snap(delayMillis = this): the check stays drawn while its color fades out',
  },
  {
    kind: 'motion',
    name: `${P}-color-in`,
    owner: 'colorAnimationSpecForState',
    member: 'checked / indeterminate',
    file: KT,
    pattern: /\} else \{\n\s*\/\/ Box in\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'animateColorAsState towards a checked / indeterminate color: checkmark, box and border (box and border snap while disabled)',
  },
  {
    kind: 'motion',
    name: `${P}-color-out`,
    owner: 'colorAnimationSpecForState',
    member: 'unchecked',
    file: KT,
    pattern: /\/\/ Box out\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'towards the unchecked colors (transparent checkmark and box, outline border)',
  },
  {
    kind: 'token',
    name: `${P}-checkmark-color`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(checkedCheckmarkColor)',
    file: KT,
    pattern: /checkedCheckmarkColor = fromToken\((CheckboxTokens\.\w+)\),/d,
    note: 'checked and indeterminate; unchecked: Color.Transparent (L451)',
  },
  {
    kind: 'alias',
    name: `${P}-checkmark-color-disabled`,
    owner: 'CheckboxImpl',
    member: 'checkmarkColor(state)',
    file: KT,
    pattern: /\} else \{\n\s*colors\.(checkmarkColor)\(state\)\n/d,
    alias: `${P}-checkmark-color`,
    note: `${FLAG_OFF}: checkmarkColor(state) ignores enabled, so a disabled checkmark keeps checkedCheckmarkColor; disabledCheckmarkColor (SelectedDisabledIconColor, surface) is read only with the flag`,
  },
  {
    kind: 'token',
    name: `${P}-box-color-checked`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(checkedBoxColor)',
    file: KT,
    pattern: /checkedBoxColor = fromToken\((CheckboxTokens\.\w+)\),/d,
    note: 'checked and indeterminate (boxColor L963-976); unchecked: Color.Transparent (L455)',
  },
  {
    kind: 'token',
    name: `${P}-border-color-checked`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(checkedBorderColor)',
    file: KT,
    pattern: /checkedBorderColor = fromToken\((CheckboxTokens\.\w+)\),/d,
    note: 'checked and indeterminate (borderColor L984-997); equal to the box color, so drawBox fills the whole rounded box',
  },
  {
    kind: 'token',
    name: `${P}-border-color-unchecked`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(uncheckedBorderColor)',
    file: KT,
    pattern: /uncheckedBorderColor = fromToken\((CheckboxTokens\.\w+)\),/d,
  },
  {
    kind: 'token',
    name: `${P}-box-color-checked-disabled`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(disabledCheckedBoxColor)',
    file: KT,
    pattern: /disabledCheckedBoxColor =\n\s*fromToken\((CheckboxTokens\.\w+)\)/d,
    note: 'disabled checked and indeterminate box and border (disabledIndeterminateBoxColor, disabledBorderColor, disabledIndeterminateBorderColor: the same expression, L460-473), at box-opacity-checked-disabled',
  },
  {
    kind: 'token',
    name: `${P}-box-opacity-checked-disabled`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(disabledCheckedBoxColor alpha)',
    file: KT,
    pattern:
      /disabledCheckedBoxColor =\n\s*fromToken\(CheckboxTokens\.\w+\)\n\s*\.copy\(alpha = (CheckboxTokens\.\w+)\)/d,
    note: 'Color.copy(alpha): the token color at this opacity, not composited',
  },
  {
    kind: 'token',
    name: `${P}-border-color-unchecked-disabled`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(disabledUncheckedBorderColor)',
    file: KT,
    pattern: /disabledUncheckedBorderColor =\n\s*fromToken\((CheckboxTokens\.\w+)\)/d,
    note: 'at border-opacity-unchecked-disabled; the disabled unchecked box is Color.Transparent (L459)',
  },
  {
    kind: 'token',
    name: `${P}-border-opacity-unchecked-disabled`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(disabledUncheckedBorderColor alpha)',
    file: KT,
    pattern:
      /disabledUncheckedBorderColor =\n\s*fromToken\(CheckboxTokens\.\w+\)\n\s*\.copy\(alpha = (CheckboxTokens\.\w+)\)/d,
  },
  {
    kind: 'keyword',
    name: `${P}-state-layer-color`,
    owner: 'CheckboxImpl',
    member: 'rippleColor',
    file: KT,
    pattern: /colors\.indicatorColor\(state\)\n\s*\} else \{\n\s*(Color\.Unspecified)\n/d,
    note: `${FLAG_OFF}: ripple(color = Color.Unspecified) → LocalContentColor (the inherited text color)`,
  },
  {
    kind: 'token',
    name: `${P}-box-size-styling-fix`,
    owner: 'CheckboxImpl',
    member: 'containerSize (flag on)',
    file: KT,
    pattern:
      /if \(isCheckboxStylingFixEnabled\) \{\n\s*(CheckboxTokens\.ContainerSize)\n\s*\} else \{\n\s*CheckboxSize/d,
  },
  {
    kind: 'keyword',
    name: `${P}-box-padding-styling-fix`,
    owner: 'CheckboxImpl',
    member: 'padding (flag on)',
    file: KT,
    pattern:
      /if \(isCheckboxStylingFixEnabled\) \{\n\s*(Dp\.Unspecified)\n\s*\} else \{\n\s*CheckboxDefaultPadding/d,
    note: 'no padding modifier',
  },
  {
    kind: 'fraction',
    name: `${P}-check-cross-y-styling-fix`,
    owner: 'drawCheck',
    member: 'checkCrossY (flag on)',
    file: KT,
    pattern: /val checkCrossY = if \(isCheckboxStylingFixEnabled\) ([\d.]+)f else/d,
  },
  {
    kind: 'fraction',
    name: `${P}-check-left-x-styling-fix`,
    owner: 'drawCheck',
    member: 'leftX (flag on)',
    file: KT,
    pattern: /val leftX = if \(isCheckboxStylingFixEnabled\) ([\d.]+)f else/d,
  },
  {
    kind: 'fraction',
    name: `${P}-check-right-x-styling-fix`,
    owner: 'drawCheck',
    member: 'rightX (flag on)',
    file: KT,
    pattern: /val rightX = if \(isCheckboxStylingFixEnabled\) ([\d.]+)f else/d,
  },
  {
    kind: 'token',
    name: `${P}-checkmark-color-disabled-styling-fix`,
    owner: 'CheckboxDefaults',
    member: 'defaultCheckboxColors(disabledCheckmarkColor) (flag on)',
    file: KT,
    pattern: /disabledCheckmarkColor =\n\s*fromToken\((CheckboxTokens\.\w+)\),/d,
    note: 'checkmarkColor(enabled, state) (L932-941): read only with the flag',
  },
  {
    kind: 'alias',
    name: `${P}-state-layer-color-checked-styling-fix`,
    owner: 'CheckboxColors',
    member: 'indicatorColor(state) (flag on)',
    file: KT,
    pattern:
      /ToggleableState\.Off\) \{\n\s*uncheckedBoxColor\n\s*\} else \{\n\s*(checkedBoxColor)\n/d,
    alias: `${P}-box-color-checked`,
    note: 'ripple color with the flag, checked / indeterminate',
  },
  {
    kind: 'keyword',
    name: `${P}-state-layer-color-unchecked-styling-fix`,
    owner: 'CheckboxColors',
    member: 'indicatorColor(Off) = uncheckedBoxColor (flag on)',
    file: KT,
    pattern: /uncheckedBoxColor = (Color\.Transparent),/d,
    note: 'ripple color with the flag, unchecked: Color.Transparent is a specified color, so no hover / focus / press layer shows while unchecked',
  },
  {
    kind: 'dp',
    name: `${P}-label-space`,
    owner: 'CheckboxWithTextSample',
    member: 'Text(modifier = Modifier.padding(start))',
    file: SAMPLES,
    pattern:
      /style = MaterialTheme\.typography\.bodyLarge,\n\s*modifier = Modifier\.padding\(start = (\d+)\.dp\),/d,
    note: 'Compose catalog "Checkbox with text": the label starts this far after the 48dp checkbox (the row is toggleable and shares the checkbox’s interaction source)',
  },
  {
    kind: 'type',
    name: `${P}-label-text`,
    owner: 'CheckboxWithTextSample',
    member: 'Text(style)',
    file: SAMPLES,
    pattern: /text = "Option selection",\n\s*style = MaterialTheme\.typography\.(bodyLarge),/d,
    note: 'Text color: LocalContentColor (inherited)',
  },
];

/** Wiring checkbox.css assumes. */
const CHECKS: readonly [string, string, RegExp][] = [
  [
    FLAGS,
    'isCheckboxStylingFixEnabled defaults to false',
    /public var isCheckboxStylingFixEnabled: Boolean = false/,
  ],
  [
    KT,
    'CheckboxImpl: flag-off checkmarkColor(state), Unspecified ripple color, CheckboxSize, RadiusSize, CheckboxDefaultPadding',
    /colors\.checkmarkColor\(enabled, state\)\n\s*\} else \{\n\s*colors\.checkmarkColor\(state\)\n[\s\S]*?Color\.Unspecified\n[\s\S]*?CheckboxTokens\.ContainerSize\n\s*\} else \{\n\s*CheckboxSize\n\s*\},\n\s*cornerSize = RadiusSize,\n[\s\S]*?Dp\.Unspecified\n\s*\} else \{\n\s*CheckboxDefaultPadding\n/,
  ],
  [
    KT,
    'unbounded ripple of radius StateLayerSize / 2 (the 40dp state layer circle)',
    /ripple\(\n\s*bounded = false,\n\s*radius = CheckboxTokens\.StateLayerSize \/ 2,\n\s*color = rippleColor,/,
  ],
  [
    KT,
    'clickable: minimum interactive size, triStateToggleable with Role.Checkbox, then the centred box',
    /Modifier\.minimumInteractiveComponentSize\(\)[\s\S]*?Modifier\.triStateToggleable\([\s\S]*?role = Role\.Checkbox,[\s\S]*?\.wrapContentSize\(Alignment\.Center\)\n\s*\.requiredSize\(containerSize\)/,
  ],
  [
    KT,
    'checkDrawFraction: from unchecked default, to unchecked snap(delay), else default; on/indeterminate 1, off 0',
    /initialState == ToggleableState\.Off -> defaultAnimationSpec\n\s*targetState == ToggleableState\.Off -> snap\(delayMillis = SnapAnimationDelay\)\n\s*else -> defaultAnimationSpec\n[\s\S]*?ToggleableState\.On -> 1f\n\s*ToggleableState\.Off -> 0f\n\s*ToggleableState\.Indeterminate -> 1f/,
  ],
  [
    KT,
    'checkCenterGravitationShiftFraction: from unchecked snap, to unchecked snap(delay), else default; indeterminate 1',
    /initialState == ToggleableState\.Off -> snap\(\)\n\s*targetState == ToggleableState\.Off -> snap\(delayMillis = SnapAnimationDelay\)\n\s*else -> defaultAnimationSpec\n[\s\S]*?ToggleableState\.On -> 0f\n\s*ToggleableState\.Off -> 0f\n\s*ToggleableState\.Indeterminate -> 1f/,
  ],
  [
    KT,
    'box and border colors snap while disabled; the checkmark color always animates',
    /val animatedCheckboxColor by animateColorAsState\(checkmarkColor, colorAnimationSpec\)\n\s*val animatedBoxColor by\n\s*if \(enabled\) \{\n\s*animateColorAsState\(boxColor, colorAnimationSpec\)\n\s*\} else \{[\s\S]*?rememberUpdatedState\(boxColor\)[\s\S]*?val animatedBorderColor by\n\s*if \(enabled\) \{\n\s*animateColorAsState\(borderColor, colorAnimationSpec\)\n\s*\} else \{[\s\S]*?rememberUpdatedState\(borderColor\)/,
  ],
  [
    KT,
    'one floored stroke width for the outline and the check; square caps',
    /floor\(CheckboxDefaults\.StrokeWidth\.toPx\(\)\)[\s\S]*?stroke = outlineStroke \?: Stroke\(width = strokeWidthPx\),[\s\S]*?stroke = checkmarkStroke \?: Stroke\(width = strokeWidthPx, cap = StrokeCap\.Square\),/,
  ],
  [
    KT,
    'drawBox: one fill when box == border, else the fill inside the outline (radius − stroke) and the outline centred on half the stroke',
    /if \(boxColor == borderColor\) \{[\s\S]*?cornerRadius = CornerRadius\(radius\),\n\s*style = Fill,[\s\S]*?topLeft = Offset\(stroke\.width, stroke\.width\),[\s\S]*?cornerRadius = CornerRadius\(max\(0f, radius - stroke\.width\)\),[\s\S]*?topLeft = Offset\(halfStrokeWidth, halfStrokeWidth\),[\s\S]*?cornerRadius = CornerRadius\(radius - halfStrokeWidth\),\n\s*style = stroke,/,
  ],
  [
    KT,
    'drawCheck: left → cross → right, gravitated towards the centre, drawn up to length × checkFraction',
    /val gravitatedCrossX = lerp\(checkCrossX, 0\.5f, crossCenterGravitation\)\n\s*val gravitatedCrossY = lerp\(checkCrossY, 0\.5f, crossCenterGravitation\)\n[\s\S]*?val gravitatedLeftY = lerp\(leftY, 0\.5f, crossCenterGravitation\)\n\s*val gravitatedRightY = lerp\(rightY, 0\.5f, crossCenterGravitation\)[\s\S]*?checkPath\.moveTo\(width \* leftX, width \* gravitatedLeftY\)\n\s*checkPath\.lineTo\(width \* gravitatedCrossX, width \* gravitatedCrossY\)\n\s*checkPath\.lineTo\(width \* rightX, width \* gravitatedRightY\)[\s\S]*?pathMeasure\.getSegment\(0f, pathMeasure\.length \* checkFraction, pathToDraw, true\)/,
  ],
  [
    KT,
    'defaultCheckboxColors: transparent unchecked checkmark and box (enabled and disabled)',
    /uncheckedCheckmarkColor = Color\.Transparent,[\s\S]*?uncheckedBoxColor = Color\.Transparent,[\s\S]*?disabledUncheckedBoxColor = Color\.Transparent,/,
  ],
  [
    KT,
    'defaultCheckboxColors: disabled indeterminate box / border and disabled checked border = disabledCheckedBoxColor',
    /disabledIndeterminateBoxColor =\n\s*fromToken\(CheckboxTokens\.SelectedDisabledContainerColor\)\n\s*\.copy\(alpha = CheckboxTokens\.SelectedDisabledContainerOpacity\),[\s\S]*?disabledBorderColor =\n\s*fromToken\(CheckboxTokens\.SelectedDisabledContainerColor\)\n\s*\.copy\(alpha = CheckboxTokens\.SelectedDisabledContainerOpacity\),[\s\S]*?disabledIndeterminateBorderColor =\n\s*fromToken\(CheckboxTokens\.SelectedDisabledContainerColor\)\n\s*\.copy\(alpha = CheckboxTokens\.SelectedDisabledContainerOpacity\),/,
  ],
];

/** Compose values with a fixed CSS meaning. */
const KEYWORDS: Readonly<Record<string, string>> = {
  'Color.Transparent': 'transparent',
  'Color.Unspecified': 'currentcolor',
  'Dp.Unspecified': '0px',
};

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** `CheckboxTokens.SelectedIconColor` → `var(--m3e-comp-checkbox-icon-color-selected)`. */
const tokenVar = (ref: string) => {
  const [object, member] = ref.split('.') as [string, string];
  return `var(${compVar(object, member)})`;
};

/** `sources`: vendored Material3 files and samples by name (Checkbox.kt, CheckboxSamples.kt, …). */
export function extractCheckboxDefaults(
  sources: Readonly<Record<string, string>>,
): CheckboxDefault[] {
  const texts = Object.fromEntries(
    CHECKBOX_DEFAULTS_SOURCES.map((file) => [file, normalize(sources[file], file)]),
  );
  for (const [file, what, pattern] of CHECKS) {
    if (!pattern.test(texts[file]!)) throw new Error(`${file}: ${what} (changed upstream?)`);
  }
  const out: CheckboxDefault[] = [];
  for (const rule of RULES) out.push(...extractRule(rule, texts, out));
  return out;
}

function extractRule(
  rule: Rule,
  texts: Readonly<Record<string, string>>,
  previous: readonly CheckboxDefault[],
): CheckboxDefault[] {
  const text = texts[rule.file]!;
  const match = rule.pattern.exec(text);
  const at = match?.indices?.[1]?.[0];
  if (!match || at === undefined)
    throw new Error(
      `${rule.file}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
    );
  const captured = match[1]!;
  const base = {
    name: rule.name,
    owner: rule.owner,
    member: rule.member,
    file: rule.file,
    line: text.slice(0, at).split('\n').length,
    ...(rule.note === undefined ? {} : { note: rule.note }),
  };
  switch (rule.kind) {
    case 'dp':
      return [{ ...base, value: `${captured}px`, js: Number(captured), raw: `${captured}.dp` }];
    case 'fraction':
      return [{ ...base, value: captured, js: Number(captured), raw: `${captured}f` }];
    case 'ms':
      return [
        { ...base, value: `${captured}ms`, js: Number(captured), raw: `${captured} (millis)` },
      ];
    case 'token':
      return [{ ...base, value: tokenVar(captured), js: tokenVar(captured), raw: captured }];
    case 'type': {
      // `bodyLarge` → `body-large`.
      const style = kebabName(captured[0]!.toUpperCase() + captured.slice(1));
      return TYPE_FIELDS.map((field) => ({
        ...base,
        name: `${rule.name}-${field}`,
        value: `var(--m3e-sys-typescale-${style}-${field})`,
        js: `var(--m3e-sys-typescale-${style}-${field})`,
        raw: `MaterialTheme.typography.${captured}`,
      }));
    }
    case 'motion':
      return SPRING_FIELDS.map((field) => ({
        ...base,
        name: `${rule.name}-${field}`,
        value: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
        js: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
        raw: `MotionSchemeKeyTokens.${captured}`,
      }));
    case 'flag':
      return [
        {
          ...base,
          value: (rule.enabled ?? captured === 'true') ? '1' : '0',
          js: (rule.enabled ?? captured === 'true') ? 1 : 0,
          raw: `${captured} (upstream default)`,
        },
      ];
    case 'keyword': {
      const keyword = KEYWORDS[captured];
      if (keyword === undefined) throw new Error(`checkbox-defaults: no CSS for ${captured}`);
      return [{ ...base, value: keyword, js: keyword, raw: captured }];
    }
    case 'alias': {
      const target = previous.find((d) => d.name === rule.alias);
      if (!target) throw new Error(`checkbox-defaults: ${String(rule.alias)} must come first`);
      return [
        { ...base, value: target.value, js: target.js, raw: `${captured}(state) = ${target.raw}` },
      ];
    }
  }
}
