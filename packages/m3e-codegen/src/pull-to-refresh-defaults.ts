// Pull-to-refresh values (COMPONENT_SPEC §38). There is no PullToRefreshTokens.kt at the pin and no
// m3.material.io page, so every value is what pulltorefresh/PullToRefresh.kt renders:
// - PullToRefreshDefaults: the indicator's circle shape, container and arrow colors, the
//   LoadingIndicator variant's colors (LoadingIndicatorDefaults' contained ones), the 80dp
//   PositionalThreshold and IndicatorMaxDistance, the Level2 / Level0 shadows;
// - the file's private sizes: the 40dp SpinnerContainerSize box, the 16dp SpinnerSize arrow /
//   spinner and its 2.5dp StrokeWidth (the spinner is a CircularProgressIndicator with them);
//   the LoadingIndicator variant's 48dp box (LoadingIndicatorDefaults.ContainerWidth / Height);
// - the arrow's alpha, MinAlpha 0.3 below the threshold and MaxAlpha 1 at it, animated on
//   DefaultEffects, and the Crossfade between the arrow and the spinner on DefaultEffects;
// - the state's spring: PullToRefreshStateImpl animates its Animatable with `animateTo(1f / 0f)`,
//   i.e. Animatable's defaultSpringSpec = SpringSpec() (ζ 1, k 1500; animation-core Animatable.kt,
//   AnimationSpec.kt, VectorizedAnimationSpec.kt), 0ms under reduced motion (it moves the
//   indicator).
// The arrow's own geometry (ArcRadius, ArrowWidth / Height, MaxProgressArc, DragMultiplier) is part
// of the m3e-motion port (pull-to-refresh.ts). CHECKS throw when the wiring pull-to-refresh.css and
// PullToRefreshLayout assume changes upstream.
import { springToLinear } from '@kyralabs/m3e-motion';
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';
import { compVar, kebabName } from './names.js';
import { ANIMATION_CORE_PATH, MATERIAL3_PATH, MATERIAL3_SAMPLES_PATH } from './vendor.js';

export type PullToRefreshDefault = ComposeLiteral;

const KT = 'PullToRefresh.kt';
const LOADING = 'LoadingIndicator.kt';
const SAMPLES = 'PullToRefreshSamples.kt';
const ANIMATABLE = 'Animatable.kt';
const SPEC = 'AnimationSpec.kt';
const VECTORIZED = 'VectorizedAnimationSpec.kt';

export const PULL_TO_REFRESH_DEFAULTS_SOURCES = [
  KT,
  LOADING,
  SAMPLES,
  ANIMATABLE,
  SPEC,
  VECTORIZED,
];

const P = '--m3e-comp-pull-to-refresh';

/** The state spring moves the indicator: it jumps under reduced motion (spatial). */
export const PULL_TO_REFRESH_REDUCED_MOTION = [`${P}-state-duration: 0ms;`];

/** `private val <member>\n    get() = <n>.dp` (PullToRefresh.kt's private sizes). */
const getter = (member: string) =>
  new RegExp(`(?:private|internal) val ${member}\\n\\s*get\\(\\) = ([\\d.]+)\\.dp`, 'd');

const RULES: readonly LiteralRule[] = [
  {
    kind: 'keyword',
    name: `${P}-indicator-shape`,
    owner: 'PullToRefreshDefaults',
    member: 'indicatorShape',
    file: KT,
    pattern: /public val indicatorShape: Shape = (CircleShape)/d,
    note: 'IndicatorBox: the box is clipped to it and drawn in the container color',
  },
  {
    kind: 'dp',
    name: `${P}-positional-threshold`,
    owner: 'PullToRefreshDefaults',
    member: 'PositionalThreshold',
    file: KT,
    pattern: /public val PositionalThreshold: Dp = (\d+)\.dp/d,
    note: 'Modifier.pullToRefresh threshold: a release past it (the drag × DragMultiplier 0.5) refreshes; the tension curve starts there',
  },
  {
    kind: 'alias',
    name: `${P}-indicator-max-distance`,
    owner: 'PullToRefreshDefaults',
    member: 'IndicatorMaxDistance',
    file: KT,
    pattern: /public val IndicatorMaxDistance: Dp = (PositionalThreshold)/d,
    alias: `${P}-positional-threshold`,
    note: 'IndicatorBox translationY = distanceFraction × this − the box height (= PositionalThreshold)',
  },
  {
    kind: 'dp',
    name: `${P}-indicator-container-size`,
    owner: KT,
    member: 'SpinnerContainerSize',
    file: KT,
    pattern: getter('SpinnerContainerSize'),
    note: 'IndicatorBox size (the Indicator’s box)',
  },
  {
    kind: 'dp',
    name: `${P}-spinner-size`,
    owner: KT,
    member: 'SpinnerSize',
    file: KT,
    pattern: /internal val SpinnerSize = (\d+)\.dp/d,
    note: 'the arrow’s canvas and the refreshing CircularProgressIndicator',
  },
  {
    kind: 'dp',
    name: `${P}-stroke-width`,
    owner: KT,
    member: 'StrokeWidth',
    file: KT,
    pattern: getter('StrokeWidth'),
    note: 'the arrow’s arc and head, and the refreshing CircularProgressIndicator’s stroke',
  },
  {
    kind: 'fraction',
    name: `${P}-arrow-min-alpha`,
    owner: KT,
    member: 'MinAlpha',
    file: KT,
    pattern: /private const val MinAlpha = ([\d.]+)f/d,
    note: 'the arrow’s alpha while the distanceFraction is below 1',
  },
  {
    kind: 'fraction',
    name: `${P}-arrow-max-alpha`,
    owner: KT,
    member: 'MaxAlpha',
    file: KT,
    pattern: /private const val MaxAlpha = (\d+)f/d,
    note: 'the arrow’s alpha from the threshold on',
  },
  {
    kind: 'motion',
    name: `${P}-arrow-alpha`,
    owner: 'CircularArrowProgressIndicator',
    member: 'alphaState',
    file: KT,
    pattern:
      /animateFloatAsState\(\n\s*targetValue = targetAlpha,\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    note: 'animateFloatAsState between MinAlpha and MaxAlpha',
  },
  {
    kind: 'motion',
    name: `${P}-crossfade`,
    owner: 'PullToRefreshDefaults',
    member: 'Indicator',
    file: KT,
    pattern:
      /Crossfade\(\n\s*targetState = isRefreshing,\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),\n\s*\) \{ refreshing ->\n\s*if \(refreshing\) \{\n\s*CircularProgressIndicator\(/d,
    note: 'the arrow ⇄ spinner (and, LoadingIndicator, determinate ⇄ indeterminate) cross-fade; the same key in PullToRefreshDefaults.LoadingIndicator',
  },
];

/** Wiring pull-to-refresh.css and PullToRefreshLayout (m3e-elements) assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'PullToRefreshBox draws PullToRefreshDefaults.Indicator at the top center by default (owner decision M9 #27)',
    /indicator: @Composable BoxScope\.\(\) -> Unit = \{\n\s*Indicator\(\n\s*modifier = Modifier\.align\(Alignment\.TopCenter\),/,
  ],
  [
    KT,
    'IndicatorBox clips at the container top and draws the shadow only while pulled or refreshing',
    /clipRect\(\n\s*top = 0f,[\s\S]*?val showElevation = state\.distanceFraction > 0f \|\| isRefreshing/,
  ],
  [
    KT,
    'pulls are ignored while the state animates and while refreshing (consumeAvailableOffset → 0)',
    /state\.isAnimating -> Offset\.Zero[\s\S]*?if \(isRefreshing\) 0f/,
  ],
  [
    KT,
    'a release animates to hidden; isRefreshing animates to the threshold (update())',
    /if \(!isRefreshing\) \{\n\s*animateToHidden\(\)\n\s*\} else \{\n\s*animateToThreshold\(\)[\s\S]*?animateToHidden\(\)\n\n\s*distancePulled = 0f/,
  ],
  [
    KT,
    'the state animates with Animatable.animateTo’s default spec',
    /override suspend fun animateToThreshold\(\) \{\n\s*anim\.animateTo\(1f\)\n\s*\}\n\n\s*override suspend fun animateToHidden\(\) \{\n\s*anim\.animateTo\(0f\)/,
  ],
  [
    KT,
    'the refreshing spinner is an indeterminate CircularProgressIndicator (stroke, color, SpinnerSize)',
    /CircularProgressIndicator\(\n\s*strokeWidth = StrokeWidth,\n\s*color = color,\n\s*modifier = Modifier\.size\(SpinnerSize\),\n\s*\)/,
  ],
  [
    KT,
    'the LoadingIndicator variant cross-fades two ContainedLoadingIndicators (indeterminate, determinate by distanceFraction)',
    /if \(refreshing\) \{\n\s*ContainedLoadingIndicator\([\s\S]*?\} else \{[\s\S]*?ContainedLoadingIndicator\(\n[\s\S]*?progress = \{ state\.distanceFraction \},/,
  ],
  [
    SAMPLES,
    'every sample offers a "Trigger Refresh" icon button (owner decision M9 #28: the keyboard path)',
    /\/\/ Provide an accessible alternative to trigger refresh\.\n\s*actions = \{\n\s*IconButton\(onClick = onRefresh\) \{\n\s*Icon\(Icons\.Filled\.Refresh, "Trigger Refresh"\)/,
  ],
];

const find = (sources: Readonly<Record<string, string>>, file: string, pattern: RegExp) => {
  const text = sources[file]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`pull-to-refresh-defaults: ${file} is not vendored`);
  const match = pattern.exec(text);
  const at = match?.indices?.[1]?.[0];
  if (!match || at === undefined) {
    throw new Error(
      `pull-to-refresh-defaults: ${file}: ${String(pattern)} not found (changed upstream?)`,
    );
  }
  return { value: match[1]!, groups: match, line: text.slice(0, at).split('\n').length };
};

/** Colors, shadows and the LoadingIndicator variant's box (references Compose resolves). */
function references(sources: Readonly<Record<string, string>>): PullToRefreshDefault[] {
  const base = { owner: 'PullToRefreshDefaults', file: KT };
  const role = (member: string, name: string, note: string): PullToRefreshDefault => {
    const r = find(
      sources,
      KT,
      new RegExp(
        `public val ${member}: Color\\n\\s*@Composable get\\(\\) = MaterialTheme\\.colorScheme\\.(\\w+)`,
        'd',
      ),
    );
    const value = `var(--m3e-sys-color-${kebabName(r.value[0]!.toUpperCase() + r.value.slice(1))})`;
    return {
      ...base,
      name,
      member,
      value,
      js: value,
      raw: `MaterialTheme.colorScheme.${r.value}`,
      line: r.line,
      note,
    };
  };
  const loading = (member: string, name: string, note: string): PullToRefreshDefault => {
    const r = find(
      sources,
      KT,
      new RegExp(
        `public val ${member}: Color\\n\\s*@Composable get\\(\\) = LoadingIndicatorDefaults\\.(\\w+)`,
        'd',
      ),
    );
    const token = find(
      sources,
      LOADING,
      new RegExp(
        `public val ${r.value}: Color\\n\\s*@Composable get\\(\\) = (LoadingIndicatorTokens\\.\\w+)\\.value`,
        'd',
      ),
    );
    const [object, tokenMember] = token.value.split('.') as [string, string];
    const value = `var(${compVar(object, tokenMember)})`;
    return {
      ...base,
      name,
      member,
      value,
      js: value,
      raw: `LoadingIndicatorDefaults.${r.value} = ${token.value}`,
      line: r.line,
      note,
    };
  };
  const shadow = (member: string, name: string, note: string): PullToRefreshDefault => {
    const r = find(
      sources,
      KT,
      new RegExp(`public val ${member}: Dp = ElevationTokens\\.(Level\\d)`, 'd'),
    );
    const value = `var(--m3e-sys-elevation-${r.value.toLowerCase()}-shadow)`;
    return {
      ...base,
      name,
      member,
      value,
      js: value,
      raw: `ElevationTokens.${r.value}`,
      line: r.line,
      note,
    };
  };
  const box = (axis: 'Width' | 'Height'): PullToRefreshDefault => {
    const r = find(
      sources,
      KT,
      new RegExp(
        `internal val LoaderIndicator${axis}\\n\\s*get\\(\\) = LoadingIndicatorDefaults\\.(Container${axis})`,
        'd',
      ),
    );
    const token = find(
      sources,
      LOADING,
      new RegExp(`public val ${r.value}: Dp = (LoadingIndicatorTokens\\.\\w+)`, 'd'),
    );
    const [object, tokenMember] = token.value.split('.') as [string, string];
    const value = `var(${compVar(object, tokenMember)})`;
    return {
      owner: KT,
      file: KT,
      name: `${P}-loading-indicator-container-${axis.toLowerCase()}`,
      member: `LoaderIndicator${axis}`,
      value,
      js: value,
      raw: `LoadingIndicatorDefaults.${r.value} = ${token.value}`,
      line: r.line,
      note: 'PullToRefreshDefaults.LoadingIndicator: the IndicatorBox and the ContainedLoadingIndicator size',
    };
  };
  return [
    role(
      'indicatorContainerColor',
      `${P}-indicator-container-color`,
      'PullToRefreshDefaults.Indicator’s box',
    ),
    role('indicatorColor', `${P}-indicator-color`, 'the arrow and the refreshing spinner'),
    loading(
      'loadingIndicatorContainerColor',
      `${P}-loading-indicator-container-color`,
      'PullToRefreshDefaults.LoadingIndicator’s box and its ContainedLoadingIndicators',
    ),
    loading(
      'loadingIndicatorColor',
      `${P}-loading-indicator-color`,
      'PullToRefreshDefaults.LoadingIndicator’s active indicator',
    ),
    shadow(
      'Elevation',
      `${P}-indicator-shadow`,
      'IndicatorBox shadowElevation while the distanceFraction is above 0 or refreshing (Indicator)',
    ),
    shadow(
      'LoadingIndicatorElevation',
      `${P}-loading-indicator-shadow`,
      'PullToRefreshDefaults.LoadingIndicator: no shadow',
    ),
    box('Width'),
    box('Height'),
  ];
}

/** PullToRefreshStateImpl's `anim.animateTo(…)`: Animatable's defaultSpringSpec. */
function stateSpring(
  sources: Readonly<Record<string, string>>,
  commit: string,
): PullToRefreshDefault[] {
  const animate = find(
    sources,
    KT,
    /override suspend fun animateToThreshold\(\) \{\n\s*anim\.(animateTo)\(1f\)/d,
  );
  const defaultSpec = find(
    sources,
    ANIMATABLE,
    /animationSpec: AnimationSpec<T> = (defaultSpringSpec),/d,
  );
  find(
    sources,
    ANIMATABLE,
    /internal val defaultSpringSpec: SpringSpec<T> =\n\s*(SpringSpec)\(visibilityThreshold = visibilityThreshold\)/d,
  );
  const defaults = find(
    sources,
    SPEC,
    /public class SpringSpec<T>\(\n\s*public val dampingRatio: Float = Spring\.(\w+),\n\s*public val stiffness: Float = Spring\.(\w+),/d,
  );
  const stiffnessName = defaults.groups[2]!;
  const constant = (name: string) =>
    find(sources, VECTORIZED, new RegExp(`public const val ${name}: Float = ([\\d_.]+)f`, 'd'));
  const damping = constant(defaults.value);
  const stiffness = constant(stiffnessName);
  const spec = {
    dampingRatio: Number(damping.value.replace(/_/g, '')),
    stiffness: Number(stiffness.value.replace(/_/g, '')),
  };
  const linear = springToLinear(spec);
  const via = `PullToRefreshStateImpl anim.animateTo(1f / 0f) (${KT} L${String(animate.line)}); Animatable defaultSpringSpec = SpringSpec() (${ANIMATABLE} L${String(defaultSpec.line)}); SpringSpec defaults (${SPEC} L${String(defaults.line)})`;
  const base = { owner: 'PullToRefreshStateImpl', member: 'animateToThreshold / animateToHidden' };
  const cite = (file: string, line: number) =>
    `${file === KT ? `${MATERIAL3_PATH}/pulltorefresh` : ANIMATION_CORE_PATH}/${file}@${commit} L${String(line)}`;
  return [
    {
      ...base,
      file: KT,
      name: `${P}-state-duration`,
      value: `${String(linear.durationMillis)}ms`,
      js: linear.durationMillis,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}`,
      line: animate.line,
      cite: cite(KT, animate.line),
      note: 'springToLinear() (m3e-motion) duration estimate; 0ms with prefers-reduced-motion (it moves the indicator). PullToRefreshLayout runs the spring itself (SpringAnimatable, visibility threshold 0.01)',
    },
    {
      ...base,
      file: VECTORIZED,
      name: `${P}-state-damping-ratio`,
      value: String(spec.dampingRatio),
      js: spec.dampingRatio,
      raw: `Spring.${defaults.value} = ${damping.value}f`,
      line: damping.line,
      cite: cite(VECTORIZED, damping.line),
      note: via,
    },
    {
      ...base,
      file: VECTORIZED,
      name: `${P}-state-stiffness`,
      value: String(spec.stiffness),
      js: spec.stiffness,
      raw: `Spring.${stiffnessName} = ${stiffness.value}f`,
      line: stiffness.line,
      cite: cite(VECTORIZED, stiffness.line),
      note: via,
    },
  ];
}

/** `sources`: vendored files by name (Material3 sources, samples, animation-core). */
export function extractPullToRefreshDefaults(
  sources: Readonly<Record<string, string>>,
  commit: string,
): PullToRefreshDefault[] {
  const literals = extractLiterals(
    'pull-to-refresh-defaults',
    PULL_TO_REFRESH_DEFAULTS_SOURCES,
    RULES,
    CHECKS,
    sources,
  );
  const dir = (file: string) =>
    file === SAMPLES
      ? MATERIAL3_SAMPLES_PATH
      : file === LOADING
        ? MATERIAL3_PATH
        : `${MATERIAL3_PATH}/pulltorefresh`;
  return [
    ...[...literals, ...references(sources)].map((d) => ({
      ...d,
      cite: `${dir(d.file)}/${d.file}@${commit} L${String(d.line)}`,
    })),
    ...stateSpring(sources, commit),
  ];
}
