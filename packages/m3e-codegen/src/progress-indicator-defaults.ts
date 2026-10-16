// Values Compose's progress indicators render that are not in the *ProgressIndicatorTokens files:
// - ProgressIndicator.kt: the 240dp default linear width, the flat stop indicator's 6dp maximum
//   trailing space, ProgressIndicatorDefaults.ProgressAnimationSpec (the spring every sample
//   animates progress with), the transparent indeterminate circular track, and the indeterminate
//   choreography (linear: two lines whose head and tail run keyframes on a 1750ms cycle; circular:
//   a 6000ms cycle of a linear 1080° rotation, a 90° step every 1500ms and the sweep growing from
//   10% to 87% and back);
// - WavyProgressIndicator.kt: the determinate amplitude ramp (no wave at ≤ 10% and ≥ 95%), the
//   amplitude tweens and the wave speed (one wavelength per second: `waveSpeed = wavelength`);
// - Linear/CircularWavyProgressModifiers.kt: the 50ms floor on the wave travel duration;
// - ProgressIndicatorSamples.kt: the thick configuration (8dp strokes, a 14dp wavy linear container
//   and a 52dp wavy circular one), which m3.material.io's token DB also lists as a sample
//   configuration (with the flat thick linear height, 8dp, and one 52dp circular thick size).
// Each value is read with a targeted regex and cited by line. The indeterminate keyframes are also
// emitted as CSS @keyframes (`progressIndicatorKeyframes`) so the flat indicators animate without JS.
import { springToLinear } from '@kyralabs/m3e-motion';
import { kebabName } from './names.js';

export interface ProgressIndicatorDefault {
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
  /** Vendored file and line (Compose rows). */
  file?: string;
  line?: number;
  /** Full citation for rows that come from m3.material.io. */
  cite?: string;
  note?: string;
}

const FLAT = 'ProgressIndicator.kt';
const WAVY = 'WavyProgressIndicator.kt';
const LINEAR_WAVY = 'LinearWavyProgressModifiers.kt';
const CIRCULAR_WAVY = 'CircularWavyProgressModifiers.kt';
const SAMPLES = 'ProgressIndicatorSamples.kt';
const SPEC = 'VectorizedAnimationSpec.kt';
const MOTION = 'MotionTokens.kt';

export const PROGRESS_INDICATOR_DEFAULTS_SOURCES = [
  FLAT,
  WAVY,
  LINEAR_WAVY,
  CIRCULAR_WAVY,
  SAMPLES,
  SPEC,
];

/** m3.material.io token DB the flat thick sizes come from (read 2026-10-16). */
export const PROGRESS_INDICATOR_DSDB =
  'm3.material.io token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.6f51f7ab7775a392.json, Progress indicators › Tokens & specs; the thick tokens are deprecated as "a sample configuration in code")';

/** md.comp.progress-indicator.*.thick values (dp) in the token DB above. */
export const PROGRESS_INDICATOR_DSDB_THICK = {
  'linear.thick.height': 8,
  'linear.thick.active-indicator.thickness': 8,
  'linear.thick.track.thickness': 8,
  'linear.thick.stop-indicator.size': 4,
  'linear.thick.stop-indicator.trailing-space': 2,
  'linear.thick.track-active-indicator-space': 4,
  'linear.thick.with-wave.height': 14,
  'circular.thick.size': 52,
  'circular.thick.active-indicator.thickness': 8,
  'circular.thick.track.thickness': 8,
  'circular.thick.track-active-indicator-space': 4,
} as const;

export const PREFIX = '--m3e-comp-progress-indicator-defaults';

const normalize = (sources: Readonly<Record<string, string>>, file: string) => {
  const text = sources[file];
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** First capture groups of `pattern` in `file`, with the 1-based line of the first group. */
function find(
  sources: Readonly<Record<string, string>>,
  file: string,
  pattern: RegExp,
  what: string,
): { value: string; groups: string[]; line: number } {
  const text = normalize(sources, file);
  const match = pattern.exec(text);
  const at = match?.indices?.[1]?.[0];
  if (!match || at === undefined) throw new Error(`${file}: ${what} not found (changed upstream?)`);
  return { value: match[1]!, groups: match.slice(1), line: text.slice(0, at).split('\n').length };
}

const easingVar = (motionToken: string) =>
  `var(--m3e-sys-motion-easing-${kebabName(motionToken.replace(/^Easing|CubicBezier$/g, ''))})`;
const durationVar = (motionToken: string) =>
  `var(--m3e-sys-motion-duration-${kebabName(motionToken.replace(/^Duration/, ''))})`;

export interface IndeterminateTiming {
  linear: {
    duration: number;
    lines: Record<'firstHead' | 'firstTail' | 'secondHead' | 'secondTail', [number, number]>;
    easing: readonly [number, number, number, number];
  };
  circular: {
    duration: number;
    rotation: number;
    additionalRotation: number;
    additionalDelay: number;
    additionalDuration: number;
    minProgress: number;
    maxProgress: number;
    easing: readonly [number, number, number, number];
  };
}

export interface ProgressIndicatorDefaults {
  tokens: ProgressIndicatorDefault[];
  timing: IndeterminateTiming;
}

/**
 * `sources`: vendored Material3 sources, samples and animation-core files by name; `tokens`: the
 * vendored token files by name (MotionTokens easings resolve to their cubic-bezier values for the
 * generated keyframes).
 */
export function extractProgressIndicatorDefaults(
  sources: Readonly<Record<string, string>>,
  tokens: Readonly<Record<string, string>>,
): ProgressIndicatorDefaults {
  const out: ProgressIndicatorDefault[] = [];
  const at = (file: string, pattern: RegExp, owner: string, member: string) => ({
    ...find(sources, file, pattern, `${owner}.${member}`),
    owner,
    member,
    file,
  });
  const constant = (name: string, kind: 'Int' | 'Float' = 'Int') =>
    at(
      FLAT,
      new RegExp(`internal const val ${name} = ([\\d.]+)${kind === 'Float' ? 'f' : ''}\\n`, 'd'),
      FLAT,
      name,
    );
  const cubic = (token: string): [number, number, number, number] => {
    const m = find(
      tokens,
      MOTION,
      new RegExp(
        String.raw`inline val ${token}: CubicBezierEasing\n\s*get\(\) = CubicBezierEasing\(([\d.]+)f, ([\d.]+)f, ([\d.]+)f, ([\d.]+)f\)`,
        'd',
      ),
      `MotionTokens.${token}`,
    );
    return m.groups.map(Number) as [number, number, number, number];
  };
  const ms = (v: number) => `${String(v)}ms`;

  // --- Layout (ProgressIndicator.kt, WavyProgressIndicator.kt) -----------------------------
  const width = at(
    FLAT,
    /internal val LinearIndicatorWidth\n\s*get\(\) = (\d+)\.dp/d,
    FLAT,
    'LinearIndicatorWidth',
  );
  const wavyWidth = find(
    sources,
    WAVY,
    /public val LinearContainerWidth: Dp = (\d+)\.dp/d,
    'WavyProgressIndicatorDefaults.LinearContainerWidth',
  );
  if (wavyWidth.value !== width.value) {
    throw new Error(
      `${WAVY}: LinearContainerWidth ${wavyWidth.value} ≠ LinearIndicatorWidth ${width.value}`,
    );
  }
  out.push({
    ...width,
    name: `${PREFIX}-linear-width`,
    value: `${width.value}px`,
    js: Number(width.value),
    raw: `${width.value}.dp`,
    note: `default width of flat and wavy linear indicators ("given in the spec but not defined as a token"); WavyProgressIndicatorDefaults.LinearContainerWidth (${WAVY} L${String(wavyWidth.line)}) is the same`,
  });
  const trailing = at(
    FLAT,
    /internal val StopIndicatorTrailingSpace\n\s*get\(\) = (\d+)\.dp/d,
    FLAT,
    'StopIndicatorTrailingSpace',
  );
  out.push({
    ...trailing,
    name: `${PREFIX}-linear-stop-trailing-space-max`,
    value: `${trailing.value}px`,
    js: Number(trailing.value),
    raw: `${trailing.value}.dp`,
    note: 'flat stop indicator: offset from the end = min((height − stop size) / 2, this) (drawStopIndicator; upstream TODO b/401511176)',
  });
  const transparent = at(
    FLAT,
    /public val circularIndeterminateTrackColor: Color\n\s*@Composable get\(\) = Color\.(Transparent)/d,
    'ProgressIndicatorDefaults',
    'circularIndeterminateTrackColor',
  );
  out.push({
    ...transparent,
    name: `${PREFIX}-circular-indeterminate-track-color`,
    value: 'transparent',
    js: 'transparent',
    raw: `Color.${transparent.value}`,
    note: 'the flat indeterminate circular indicator draws no track (wavy ones keep WavyProgressIndicatorDefaults.trackColor)',
  });

  // --- Progress animation (ProgressIndicatorDefaults.ProgressAnimationSpec) ---------------
  const spring = at(
    FLAT,
    /public val ProgressAnimationSpec: SpringSpec<Float> =\n\s*SpringSpec\(\n\s*dampingRatio = Spring\.(\w+),\n\s*stiffness = Spring\.(\w+),\n[\s\S]*?visibilityThreshold = 1 \/ (\d+)f,/d,
    'ProgressIndicatorDefaults',
    'ProgressAnimationSpec',
  );
  const [dampingName, stiffnessName, thresholdDivisor] = spring.groups as [string, string, string];
  const springConstant = (name: string) =>
    at(SPEC, new RegExp(`public const val ${name}: Float = ([\\d_.]+)f`, 'd'), 'Spring', name);
  const damping = springConstant(dampingName);
  const stiffness = springConstant(stiffnessName);
  const spec = {
    dampingRatio: Number(damping.value.replace(/_/g, '')),
    stiffness: Number(stiffness.value.replace(/_/g, '')),
  };
  const threshold = 1 / Number(thresholdDivisor);
  // Every sample (LinearProgressIndicatorSample … CircularThickWavyProgressIndicatorSample) animates
  // progress with this spec, wavy ones included (WavyProgressIndicatorDefaults.ProgressAnimationSpec,
  // a 500ms linear tween, is used by none).
  const samples = normalize(sources, SAMPLES);
  const sampleSpecs = [...samples.matchAll(/animationSpec = (\w+)\.ProgressAnimationSpec/g)].map(
    (m) => m[1],
  );
  if (sampleSpecs.length === 0 || sampleSpecs.some((s) => s !== 'ProgressIndicatorDefaults')) {
    throw new Error(
      `${SAMPLES}: a sample no longer animates with ProgressIndicatorDefaults.ProgressAnimationSpec`,
    );
  }
  const linear = springToLinear(spec, { visibilityThreshold: threshold });
  const via = `ProgressIndicatorDefaults.ProgressAnimationSpec (${FLAT} L${String(spring.line)}), used by all ${String(sampleSpecs.length)} samples`;
  out.push(
    {
      ...damping,
      name: `${PREFIX}-progress-damping-ratio`,
      value: String(spec.dampingRatio),
      js: spec.dampingRatio,
      raw: `Spring.${dampingName} = ${damping.value}f`,
      note: via,
    },
    {
      ...stiffness,
      name: `${PREFIX}-progress-stiffness`,
      value: String(spec.stiffness),
      js: spec.stiffness,
      raw: `Spring.${stiffnessName} = ${stiffness.value}f`,
      note: via,
    },
    {
      ...spring,
      name: `${PREFIX}-progress-visibility-threshold`,
      value: String(threshold),
      js: threshold,
      raw: `1 / ${thresholdDivisor}f`,
      note: 'of the 0–1 progress range ("we purposefully choose a smaller threshold" than 0.01)',
    },
    {
      ...spring,
      name: `${PREFIX}-progress-duration`,
      value: ms(linear.durationMillis),
      js: linear.durationMillis,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}, threshold ${String(threshold)}`,
      note: 'springToLinear() (m3e-motion) duration estimate for a full 0→1 change; 0ms with prefers-reduced-motion (spatial)',
    },
    {
      ...spring,
      name: `${PREFIX}-progress-easing`,
      value: linear.easing,
      js: linear.easing,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}`,
      note: `springToLinear() (m3e-motion), ${String(linear.stops.length)} stops, max error ${linear.maxError.toFixed(4)}; CSS transitions retarget without velocity (the JS layers keep it)`,
    },
  );

  // --- Wave (WavyProgressIndicator.kt, *WavyProgressModifiers.kt) --------------------------
  const ramp = at(
    WAVY,
    /if \(progress <= ([\d.]+)f \|\| progress >= ([\d.]+)f\) \{\n\s*0f\n\s*\} else \{\n\s*1f/d,
    'WavyProgressIndicatorDefaults',
    'indicatorAmplitude',
  );
  out.push(
    {
      ...ramp,
      name: `${PREFIX}-amplitude-min-progress`,
      value: ramp.groups[0]!,
      js: Number(ramp.groups[0]),
      raw: `progress <= ${ramp.groups[0]!}f → 0f`,
      note: 'determinate wavy indicators are flat at or below this progress',
    },
    {
      ...ramp,
      name: `${PREFIX}-amplitude-max-progress`,
      value: ramp.groups[1]!,
      js: Number(ramp.groups[1]),
      raw: `progress >= ${ramp.groups[1]!}f → 0f`,
      note: 'and at or above this one (full amplitude in between)',
    },
  );
  for (const [kind, member] of [
    ['increase', 'IncreasingAmplitudeAnimationSpec'],
    ['decrease', 'DecreasingAmplitudeAnimationSpec'],
  ] as const) {
    const tween = at(
      WAVY,
      new RegExp(
        String.raw`internal val ${member}: AnimationSpec<Float> =\n\s*tween\(\n\s*durationMillis = MotionTokens\.(\w+)\.toInt\(\),\n\s*easing = MotionTokens\.(\w+),`,
        'd',
      ),
      WAVY,
      member,
    );
    const [duration, easing] = tween.groups as [string, string];
    out.push(
      {
        ...tween,
        name: `${PREFIX}-amplitude-${kind}-duration`,
        value: durationVar(duration),
        js: durationVar(duration),
        raw: `MotionTokens.${duration}`,
        note: `amplitude ${kind === 'increase' ? '0 → 1' : '1 → 0'} tween; a running one is never retargeted; 0ms with prefers-reduced-motion (spatial)`,
      },
      {
        ...tween,
        name: `${PREFIX}-amplitude-${kind}-easing`,
        value: easingVar(easing),
        js: easingVar(easing),
        raw: `MotionTokens.${easing}`,
      },
    );
  }
  const speed = at(
    WAVY,
    /waveSpeed: Dp = (wavelength), \/\/ Match to 1 wavelength per second/d,
    'LinearWavyProgressIndicator / CircularWavyProgressIndicator',
    'waveSpeed',
  );
  const travel = find(
    sources,
    LINEAR_WAVY,
    /\(\(wavelength \/ waveSpeed\) \* (1000)\)/d,
    'updateOffsetAnimation duration',
  );
  out.push({
    ...speed,
    name: `${PREFIX}-wave-travel-duration`,
    value: ms(Number(travel.value)),
    js: Number(travel.value),
    raw: `(wavelength / waveSpeed) * ${travel.value} with waveSpeed = wavelength`,
    note: `linear wave offset tween (${LINEAR_WAVY} L${String(travel.line)}); circular: × the polygon vertex count for one full turn (${CIRCULAR_WAVY}); the wave holds still with prefers-reduced-motion (decorative)`,
  });
  const minDuration = at(
    LINEAR_WAVY,
    /private const val MinAnimationDuration = (\d+)\n/d,
    LINEAR_WAVY,
    'MinAnimationDuration',
  );
  const circularMin = find(
    sources,
    CIRCULAR_WAVY,
    /private const val MinAnimationDuration = (\d+)\n/d,
    'MinAnimationDuration',
  );
  if (circularMin.value !== minDuration.value)
    throw new Error(`${CIRCULAR_WAVY}: MinAnimationDuration differs`);
  out.push({
    ...minDuration,
    name: `${PREFIX}-wave-min-travel-duration`,
    value: ms(Number(minDuration.value)),
    js: Number(minDuration.value),
    raw: minDuration.value,
    note: `floor on the wave offset tween "to ensure we don't overwhelm the CPU" (same in ${CIRCULAR_WAVY} L${String(circularMin.line)})`,
  });

  // --- Indeterminate choreography (ProgressIndicator.kt) -----------------------------------
  const linearDuration = constant('LinearAnimationDuration');
  out.push({
    ...linearDuration,
    name: `${PREFIX}-linear-indeterminate-duration`,
    value: ms(Number(linearDuration.value)),
    js: Number(linearDuration.value),
    raw: linearDuration.value,
    note: 'one cycle of both lines (infiniteRepeatable keyframes)',
  });
  const lines = {} as IndeterminateTiming['linear']['lines'];
  for (const line of [
    'FirstLineHead',
    'FirstLineTail',
    'SecondLineHead',
    'SecondLineTail',
  ] as const) {
    const key = (line.charAt(0).toLowerCase() + line.slice(1)).replace(
      'Line',
      '',
    ) as keyof typeof lines;
    const kebab = kebabName(line.replace('Line', ''));
    const duration = constant(`${line}Duration`);
    const delay = constant(`${line}Delay`);
    lines[key] = [Number(delay.value), Number(duration.value)];
    out.push(
      {
        ...delay,
        name: `${PREFIX}-linear-${kebab}-delay`,
        value: ms(Number(delay.value)),
        js: Number(delay.value),
        raw: delay.value,
        note: 'keyframe 0f (with the easing) at this time of the cycle',
      },
      {
        ...duration,
        name: `${PREFIX}-linear-${kebab}-duration`,
        value: ms(Number(duration.value)),
        js: Number(duration.value),
        raw: duration.value,
        note: 'keyframe 1f at delay + this, held until the cycle ends',
      },
    );
  }
  const linearEasing = at(
    FLAT,
    /internal val LinearIndeterminateProgressEasing = MotionTokens\.(\w+)\n/d,
    FLAT,
    'LinearIndeterminateProgressEasing',
  );
  out.push({
    ...linearEasing,
    name: `${PREFIX}-linear-indeterminate-easing`,
    value: easingVar(linearEasing.value),
    js: easingVar(linearEasing.value),
    raw: `MotionTokens.${linearEasing.value}`,
    note: 'each 0f → 1f keyframe interval (keyframes `using`)',
  });

  const circularDuration = constant('CircularAnimationProgressDuration');
  const rotation = constant('CircularGlobalRotationDegreesTarget', 'Float');
  const additional = constant('CircularAdditionalRotationDegreesTarget', 'Float');
  const additionalDelay = constant('CircularAnimationAdditionalRotationDelay');
  const additionalDuration = constant('CircularAnimationAdditionalRotationDuration');
  const minProgress = constant('CircularIndeterminateMinProgress', 'Float');
  const maxProgress = constant('CircularIndeterminateMaxProgress', 'Float');
  const circularEasing = at(
    FLAT,
    /internal val CircularProgressEasing = MotionTokens\.(\w+)\n/d,
    FLAT,
    'CircularProgressEasing',
  );
  // The 90° steps are linear: `90f at 300 using EmphasizedDecelerate` sets the easing of the
  // interval *starting* at 300ms (a hold); the moving intervals start at keyframes without `using`,
  // which default to LinearEasing (animation-core AnimationSpec.kt KeyframesSpec).
  const steps = at(
    FLAT,
    /90f at\n\s*CircularAnimationAdditionalRotationDuration using\n\s*MotionTokens\.(\w+)/d,
    FLAT,
    'circularIndeterminateRotationAnimationSpec',
  );
  // The sweep: max at half the cycle `using` the easing (the shrinking half), min at the end.
  find(
    sources,
    FLAT,
    /(CircularIndeterminateMaxProgress) at\n\s*CircularAnimationProgressDuration \/ 2 using\n\s*CircularProgressEasing/d,
    'circularIndeterminateProgressAnimationSpec',
  );
  out.push(
    {
      ...circularDuration,
      name: `${PREFIX}-circular-indeterminate-duration`,
      value: ms(Number(circularDuration.value)),
      js: Number(circularDuration.value),
      raw: circularDuration.value,
      note: 'one cycle of the rotations and the sweep (infiniteRepeatable)',
    },
    {
      ...rotation,
      name: `${PREFIX}-circular-rotation`,
      value: `${rotation.value}deg`,
      js: Number(rotation.value),
      raw: `${rotation.value}f`,
      note: 'global rotation per cycle, LinearEasing',
    },
    {
      ...additional,
      name: `${PREFIX}-circular-additional-rotation`,
      value: `${additional.value}deg`,
      js: Number(additional.value),
      raw: `${additional.value}f`,
      note: `per cycle, in four 90° steps; the steps move linearly (MotionTokens.${steps.value} is attached to the holds, L${String(steps.line)})`,
    },
    {
      ...additionalDelay,
      name: `${PREFIX}-circular-additional-rotation-delay`,
      value: ms(Number(additionalDelay.value)),
      js: Number(additionalDelay.value),
      raw: additionalDelay.value,
      note: 'a step starts every this',
    },
    {
      ...additionalDuration,
      name: `${PREFIX}-circular-additional-rotation-duration`,
      value: ms(Number(additionalDuration.value)),
      js: Number(additionalDuration.value),
      raw: additionalDuration.value,
      note: 'and lasts this',
    },
    {
      ...minProgress,
      name: `${PREFIX}-circular-min-progress`,
      value: minProgress.value,
      js: Number(minProgress.value),
      raw: `${minProgress.value}f`,
      note: 'sweep at the start and end of a cycle',
    },
    {
      ...maxProgress,
      name: `${PREFIX}-circular-max-progress`,
      value: maxProgress.value,
      js: Number(maxProgress.value),
      raw: `${maxProgress.value}f`,
      note: 'sweep at half the cycle: it grows linearly, then shrinks on the easing below',
    },
    {
      ...circularEasing,
      name: `${PREFIX}-circular-progress-easing`,
      value: easingVar(circularEasing.value),
      js: easingVar(circularEasing.value),
      raw: `MotionTokens.${circularEasing.value}`,
      note: 'the shrinking half of the sweep (keyframe at half the cycle `using` it)',
    },
  );

  // --- Thick configuration (samples + m3.material.io token DB) -----------------------------
  const thickStroke = at(
    SAMPLES,
    /fun LinearThickWavyProgressIndicatorSample\(\) \{[\s\S]*?val thickStrokeWidth = with\(LocalDensity\.current\) \{ (\d+)\.dp\.toPx\(\) \}/d,
    'LinearThickWavyProgressIndicatorSample',
    'thickStrokeWidth',
  );
  const thickLinear = at(
    SAMPLES,
    /fun LinearThickWavyProgressIndicatorSample\(\) \{[\s\S]*?modifier = Modifier\.height\((\d+)\.dp\)/d,
    'LinearThickWavyProgressIndicatorSample',
    'Modifier.height',
  );
  const thickCircularStroke = at(
    SAMPLES,
    /fun CircularThickWavyProgressIndicatorSample\(\) \{[\s\S]*?val thickStrokeWidth = with\(LocalDensity\.current\) \{ (\d+)\.dp\.toPx\(\) \}/d,
    'CircularThickWavyProgressIndicatorSample',
    'thickStrokeWidth',
  );
  const thickCircular = at(
    SAMPLES,
    /fun CircularThickWavyProgressIndicatorSample\(\) \{[\s\S]*?modifier = Modifier\.size\((\d+)\.dp\)/d,
    'CircularThickWavyProgressIndicatorSample',
    'Modifier.size',
  );
  const dsdb = PROGRESS_INDICATOR_DSDB_THICK;
  const expect = (what: string, compose: number, db: number) => {
    if (compose !== db)
      throw new Error(`thick ${what}: samples ${String(compose)} ≠ token DB ${String(db)}`);
  };
  expect(
    'linear stroke',
    Number(thickStroke.value),
    dsdb['linear.thick.active-indicator.thickness'],
  );
  expect('linear track', Number(thickStroke.value), dsdb['linear.thick.track.thickness']);
  expect(
    'circular stroke',
    Number(thickCircularStroke.value),
    dsdb['circular.thick.active-indicator.thickness'],
  );
  expect('wavy linear height', Number(thickLinear.value), dsdb['linear.thick.with-wave.height']);
  expect('circular size', Number(thickCircular.value), dsdb['circular.thick.size']);
  // The flat stop indicator's trailing space follows from the 8dp height (min((8 − 4) / 2, 6)).
  expect(
    'stop trailing space',
    Math.min(
      (dsdb['linear.thick.height'] - dsdb['linear.thick.stop-indicator.size']) / 2,
      Number(trailing.value),
    ),
    dsdb['linear.thick.stop-indicator.trailing-space'],
  );
  out.push(
    {
      ...thickStroke,
      name: `${PREFIX}-thick-thickness`,
      value: `${thickStroke.value}px`,
      js: Number(thickStroke.value),
      raw: `${thickStroke.value}.dp`,
      note: `stroke and track stroke of the thick samples (circular: L${String(thickCircularStroke.line)}); token DB md.comp.progress-indicator.{linear,circular}.thick.{active-indicator,track}.thickness`,
    },
    {
      ...thickLinear,
      name: `${PREFIX}-linear-thick-wavy-height`,
      value: `${thickLinear.value}px`,
      js: Number(thickLinear.value),
      raw: `Modifier.height(${thickLinear.value}.dp)`,
      note: '"slightly higher than the WavyProgressIndicatorDefaults.LinearContainerHeight default"; token DB linear.thick.with-wave.height',
    },
    {
      ...thickCircular,
      name: `${PREFIX}-circular-thick-size`,
      value: `${thickCircular.value}px`,
      js: Number(thickCircular.value),
      raw: `Modifier.size(${thickCircular.value}.dp)`,
      note: 'wavy sample; the token DB gives one circular thick size (circular.thick.size), used for the flat thick indicator too',
    },
    {
      name: `${PREFIX}-linear-thick-height`,
      value: `${String(dsdb['linear.thick.height'])}px`,
      js: dsdb['linear.thick.height'],
      raw: `md.comp.progress-indicator.linear.thick.height = ${String(dsdb['linear.thick.height'])}dp`,
      owner: 'm3.material.io token DB',
      member: 'linear.thick.height',
      cite: PROGRESS_INDICATOR_DSDB,
      note: 'flat thick linear: the stroke is the height (Compose LinearProgressIndicator: strokeWidth = size.height); no Compose sample',
    },
  );

  const f = (v: string) => Number(v);
  const timing: IndeterminateTiming = {
    linear: {
      duration: f(linearDuration.value),
      lines,
      easing: cubic(linearEasing.value),
    },
    circular: {
      duration: f(circularDuration.value),
      rotation: f(rotation.value),
      additionalRotation: f(additional.value),
      additionalDelay: f(additionalDelay.value),
      additionalDuration: f(additionalDuration.value),
      minProgress: f(minProgress.value),
      maxProgress: f(maxProgress.value),
      easing: cubic(circularEasing.value),
    },
  };
  return { tokens: out, timing };
}

/** Overrides under `prefers-reduced-motion: reduce` (spatial motion snaps). */
export const PROGRESS_INDICATOR_REDUCED_MOTION = [
  `${PREFIX}-progress-duration: 0ms;`,
  `${PREFIX}-amplitude-increase-duration: 0ms;`,
  `${PREFIX}-amplitude-decrease-duration: 0ms;`,
];

const dashed = (camel: string) => camel.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const pct = (v: number) => `${String(Math.round(v * 1e6) / 1e4)}%`;
const bezier = (e: readonly number[]) => `cubic-bezier(${e.join(', ')})`;

/**
 * CSS @keyframes for the flat indeterminate indicators, animating m3e-css's registered private
 * properties with Compose's keyframes: each interval eases with the easing of the keyframe it
 * starts at (CSS per-keyframe `animation-timing-function` = Compose `using`), others linearly.
 */
export function progressIndicatorKeyframes(timing: IndeterminateTiming): string[] {
  const out: string[] = [];
  const { linear, circular } = timing;
  for (const [key, [delay, duration]] of Object.entries(linear.lines)) {
    const prop = `--_m3e-progress-${dashed(key)}`;
    const frames: string[] = [];
    if (delay > 0) frames.push(`0% { ${prop}: 0; }`);
    frames.push(
      `${pct(delay / linear.duration)} { ${prop}: 0; animation-timing-function: ${bezier(linear.easing)}; }`,
    );
    frames.push(`${pct((delay + duration) / linear.duration)} { ${prop}: 1; }`);
    if (delay + duration < linear.duration) frames.push(`100% { ${prop}: 1; }`);
    out.push(`@keyframes m3e-progress-${dashed(key)} {`, ...frames.map((l) => `  ${l}`), '}');
  }
  // Additional rotation: a linear step of 360° / steps every `additionalDelay`.
  const steps = Math.round(circular.duration / circular.additionalDelay);
  const step = circular.additionalRotation / steps;
  const rot = '--_m3e-progress-additional-rotation';
  const frames = [`0% { ${rot}: 0deg; }`];
  for (let i = 0; i < steps; i++) {
    const start = i * circular.additionalDelay;
    if (i > 0) frames.push(`${pct(start / circular.duration)} { ${rot}: ${String(step * i)}deg; }`);
    frames.push(
      `${pct((start + circular.additionalDuration) / circular.duration)} { ${rot}: ${String(step * (i + 1))}deg; }`,
    );
  }
  frames.push(`100% { ${rot}: ${String(circular.additionalRotation)}deg; }`);
  out.push('@keyframes m3e-progress-additional-rotation {', ...frames.map((l) => `  ${l}`), '}');
  const sweep = '--_m3e-progress-sweep';
  out.push(
    '@keyframes m3e-progress-sweep {',
    `  0% { ${sweep}: ${String(circular.minProgress)}; }`,
    `  50% { ${sweep}: ${String(circular.maxProgress)}; animation-timing-function: ${bezier(circular.easing)}; }`,
    `  100% { ${sweep}: ${String(circular.minProgress)}; }`,
    '}',
    '@keyframes m3e-progress-rotation {',
    `  0% { --_m3e-progress-rotation: 0deg; }`,
    `  100% { --_m3e-progress-rotation: ${String(circular.rotation)}deg; }`,
    '}',
  );
  return out;
}
