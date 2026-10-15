// Values Compose's split button renders that are not in the SplitButton*Tokens files:
// SplitButtonDefaults literals and references (SplitButton.kt: the layout spacing, the 48dp minimum
// widths, the checked trailing button's state-layer alpha and its shape spring), the optical
// centering coefficient its trailing button applies (HorizontalCenterOptically.kt), and the
// trailing icon rotation the samples (the Compose catalog) animate on `animateFloatAsState`'s
// default `spring()` (animation-core AnimateAsState.kt → AnimationSpec.kt → Spring constants in
// VectorizedAnimationSpec.kt). Each is read with a targeted regex and cited by line.
import { springToLinear } from '@kyralabs/m3e-motion';
import { kebabName } from './names.js';

export interface SplitButtonDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts (number, or the CSS string for references and easings). */
  js: number | string;
  /** Source text of the value. */
  raw: string;
  owner: string;
  member: string;
  file: string;
  line: number;
  note?: string;
}

const SPLIT = 'SplitButton.kt';
const OPTICAL = 'HorizontalCenterOptically.kt';
const SAMPLES = 'SplitButtonSamples.kt';
const ANIMATE = 'AnimateAsState.kt';
const SPEC = 'AnimationSpec.kt';
const VECTORIZED = 'VectorizedAnimationSpec.kt';

export const SPLIT_BUTTON_DEFAULTS_SOURCES = [SPLIT, OPTICAL, SAMPLES, ANIMATE, SPEC, VECTORIZED];

const PREFIX = '--m3e-comp-split-button';

const normalize = (sources: Readonly<Record<string, string>>, file: string) => {
  const text = sources[file];
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** First capture group of `pattern` in `file`, with its 1-based line. */
function find(
  sources: Readonly<Record<string, string>>,
  file: string,
  pattern: RegExp,
  what: string,
): { value: string; line: number } {
  const text = normalize(sources, file);
  const match = pattern.exec(text);
  const at = match?.indices?.[1]?.[0];
  if (!match || at === undefined) throw new Error(`${file}: ${what} not found (changed upstream?)`);
  return { value: match[1]!, line: text.slice(0, at).split('\n').length };
}

/**
 * `sources`: vendored Material3 / samples / animation-core files by name; `tokens`: the vendored
 * token files by name (SplitButtonDefaults.Spacing is a token reference, emitted as its value since
 * component CSS only references sys tokens).
 */
export function extractSplitButtonDefaults(
  sources: Readonly<Record<string, string>>,
  tokens: Readonly<Record<string, string>>,
): SplitButtonDefault[] {
  const out: SplitButtonDefault[] = [];
  const at = (file: string, pattern: RegExp, owner: string, member: string) => ({
    ...find(sources, file, pattern, `${owner}.${member}`),
    owner,
    member,
    file,
  });

  // --- SplitButtonDefaults (SplitButton.kt) -----------------------------------------------
  const spacing = at(
    SPLIT,
    /public val Spacing: Dp = SplitButtonSmallTokens\.(\w+)/d,
    'SplitButtonDefaults',
    'Spacing',
  );
  const between = find(
    tokens,
    'SplitButtonSmallTokens.kt',
    new RegExp(String.raw`inline val ${spacing.value}: [\w.]+\n\s*get\(\) = ([\d.]+)\.dp`, 'd'),
    `SplitButtonSmallTokens.${spacing.value}`,
  );
  const betweenDp = Number(between.value);
  out.push({
    ...spacing,
    name: `${PREFIX}-spacing`,
    value: `${String(betweenDp)}px`,
    js: betweenDp,
    raw: `SplitButtonSmallTokens.${spacing.value} = ${between.value}.dp`,
    note: `SplitButtonLayout's default spacing at every size (SplitButtonSmallTokens.kt L${String(between.line)})`,
  });

  const leadingMin = at(
    SPLIT,
    /private val LeadingButtonMinWidth = (\d+)\.dp/d,
    'SplitButtonDefaults',
    'LeadingButtonMinWidth',
  );
  out.push({
    ...leadingMin,
    name: `${PREFIX}-leading-button-min-width`,
    value: `${leadingMin.value}px`,
    js: Number(leadingMin.value),
    raw: `${leadingMin.value}.dp`,
  });

  const trailingMin = at(
    SPLIT,
    /private val TrailingButtonMinWidth = (\w+)/d,
    'SplitButtonDefaults',
    'TrailingButtonMinWidth',
  );
  if (trailingMin.value !== 'LeadingButtonMinWidth') {
    throw new Error(
      `${SPLIT}: TrailingButtonMinWidth = ${trailingMin.value}, expected LeadingButtonMinWidth`,
    );
  }
  out.push({
    ...trailingMin,
    name: `${PREFIX}-trailing-button-min-width`,
    value: `${leadingMin.value}px`,
    js: Number(leadingMin.value),
    raw: `LeadingButtonMinWidth = ${leadingMin.value}.dp`,
  });

  const alpha = at(
    SPLIT,
    /private const val TrailingButtonStateLayerAlpha = StateTokens\.(\w+)/d,
    'SplitButtonDefaults',
    'TrailingButtonStateLayerAlpha',
  );
  const alphaVar = `var(--m3e-sys-state-${kebabName(alpha.value)})`;
  out.push({
    ...alpha,
    name: `${PREFIX}-trailing-button-state-layer-opacity-checked`,
    value: alphaVar,
    js: alphaVar,
    raw: `StateTokens.${alpha.value}`,
    note: 'the checked trailing button draws its outline in the content color at this alpha',
  });

  // The press / checked shape morph: every LeadingButton / TrailingButton uses this spec.
  const text = normalize(sources, SPLIT);
  const specs = [
    ...text.matchAll(/val defaultAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/g),
  ].map((m) => m[1]);
  if (specs.length === 0 || new Set(specs).size !== 1) {
    throw new Error(`${SPLIT}: expected one shape animation spec, found ${specs.join(', ')}`);
  }
  const shape = at(
    SPLIT,
    /val defaultAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    'SplitButtonDefaults.LeadingButton / TrailingButton',
    'defaultAnimationSpec',
  );
  for (const field of ['duration', 'easing'] as const) {
    const value = `var(--m3e-sys-motion-spring-${kebabName(shape.value)}-${field})`;
    out.push({
      ...shape,
      name: `${PREFIX}-shape-${field}`,
      value,
      js: value,
      raw: `MotionSchemeKeyTokens.${shape.value}`,
      note: `inner corner morph (rest, pressed, checked) of both buttons; ${String(specs.length)} uses`,
    });
  }

  // --- Optical centering (HorizontalCenterOptically.kt) ------------------------------------
  const coefficient = at(
    OPTICAL,
    /internal const val CenterOpticallyCoefficient = ([\d.]+)f/d,
    OPTICAL,
    'CenterOpticallyCoefficient',
  );
  out.push({
    ...coefficient,
    name: `${PREFIX}-center-optically-coefficient`,
    value: coefficient.value,
    js: Number(coefficient.value),
    raw: `${coefficient.value}f`,
    note: 'trailing content offset = coefficient × (start corners − end corners), toward the end',
  });

  // --- Trailing icon rotation (SplitButtonSamples.kt → animateFloatAsState defaults) -------
  const samples = normalize(sources, SAMPLES);
  const calls = [...samples.matchAll(/animateFloatAsState\(\n([\s\S]*?)\n\s*\)/g)].map(
    (m) => m[1]!,
  );
  const expectedCall =
    /^\s*targetValue = if \(checked\) (\d+)f else 0f,\n\s*label = "Trailing Icon Rotation",$/;
  if (calls.length === 0 || calls.some((c) => !expectedCall.test(c))) {
    throw new Error(
      `${SAMPLES}: a trailing icon rotation no longer uses animateFloatAsState defaults`,
    );
  }
  const rotation = at(
    SAMPLES,
    /animateFloatAsState\(\n\s*targetValue = if \(checked\) (\d+)f else 0f/d,
    'FilledSplitButtonSample (and every split button sample)',
    'rotation targetValue',
  );
  out.push({
    ...rotation,
    name: `${PREFIX}-trailing-icon-rotation-checked`,
    value: `${rotation.value}deg`,
    js: Number(rotation.value),
    raw: `if (checked) ${rotation.value}f else 0f`,
    note: `graphicsLayer rotationZ of the trailing icon; ${String(calls.length)} samples`,
  });

  const defaultAnimation = at(
    ANIMATE,
    /private val defaultAnimation = (spring)<Float>\(\)/d,
    ANIMATE,
    'defaultAnimation',
  );
  const usesDefault = find(
    sources,
    ANIMATE,
    /public fun animateFloatAsState\(\n\s*targetValue: Float,\n\s*animationSpec: AnimationSpec<Float> = (defaultAnimation),/d,
    'animateFloatAsState(animationSpec = defaultAnimation)',
  );
  const threshold = at(
    ANIMATE,
    /private const val DefaultFloatVisibilityThreshold = ([\d.]+)f/d,
    ANIMATE,
    'DefaultFloatVisibilityThreshold',
  );
  const springDefaults = find(
    sources,
    SPEC,
    /public fun <T> spring\(\n\s*dampingRatio: Float = Spring\.(\w+),\n\s*stiffness: Float = Spring\.(\w+),/d,
    'spring() defaults',
  );
  const specText = normalize(sources, SPEC);
  const stiffnessName = /stiffness: Float = Spring\.(\w+),/.exec(
    specText.slice(specText.indexOf('public fun <T> spring(')),
  )![1]!;
  const constant = (name: string) =>
    at(
      VECTORIZED,
      new RegExp(`public const val ${name}: Float = ([\\d_.]+)f`, 'd'),
      'Spring',
      name,
    );
  const damping = constant(springDefaults.value);
  const stiffness = constant(stiffnessName);
  const spec = {
    dampingRatio: Number(damping.value.replace(/_/g, '')),
    stiffness: Number(stiffness.value.replace(/_/g, '')),
  };
  const travel = Number(rotation.value);
  // Compose stops the animation within DefaultFloatVisibilityThreshold of the target (degrees).
  const linear = springToLinear(spec, { visibilityThreshold: Number(threshold.value) / travel });
  const via = `${usesDefault.value} = ${defaultAnimation.value}() (${ANIMATE} L${String(defaultAnimation.line)}); spring() defaults (${SPEC} L${String(springDefaults.line)})`;
  out.push(
    {
      ...damping,
      name: `${PREFIX}-trailing-icon-rotation-damping-ratio`,
      value: String(spec.dampingRatio),
      js: spec.dampingRatio,
      raw: `Spring.${springDefaults.value} = ${damping.value}f`,
      note: `animateFloatAsState default: ${via}`,
    },
    {
      ...stiffness,
      name: `${PREFIX}-trailing-icon-rotation-stiffness`,
      value: String(spec.stiffness),
      js: spec.stiffness,
      raw: `Spring.${stiffnessName} = ${stiffness.value}f`,
      note: `animateFloatAsState default: ${via}`,
    },
    {
      ...threshold,
      name: `${PREFIX}-trailing-icon-rotation-duration`,
      value: `${String(linear.durationMillis)}ms`,
      js: linear.durationMillis,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}, threshold ${threshold.value}° of ${rotation.value}°`,
      note: 'springToLinear() (m3e-motion) duration estimate; 0ms with prefers-reduced-motion (spatial)',
    },
    {
      ...threshold,
      name: `${PREFIX}-trailing-icon-rotation-easing`,
      value: linear.easing,
      js: linear.easing,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}`,
      note: `springToLinear() (m3e-motion), ${String(linear.stops.length)} stops, max error ${linear.maxError.toFixed(4)}`,
    },
  );
  return out;
}

/** Overrides under `prefers-reduced-motion: reduce`: the rotation is spatial, so it jumps. */
export const SPLIT_BUTTON_REDUCED_MOTION = [`${PREFIX}-trailing-icon-rotation-duration: 0ms;`];
