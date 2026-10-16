// Values Compose's navigation suite scaffold renders (material3-adaptive-navigation-suite
// NavigationSuiteScaffold.kt; there are no NavigationSuite*Tokens): NavigationSuiteScaffoldDefaults'
// container / content colors (the scaffold's Surface) and primary action alignment, the private
// PrimaryActionContentPadding, and the show / hide spring (`AnimationSpec`, a literal
// spring(SpringDefaultSpatialDamping, SpringDefaultSpatialStiffness)) that both the scaffold
// state's Animatable and the layout's animateFloatAsState run, at Spring.DefaultDisplacementThreshold
// (VectorizedAnimationSpec.kt; neither passes a visibility threshold). Each value is read with a
// targeted regex and cited by line; CHECKS throw when the layout and state wiring that
// navigation-suite.css and m3e-motion's NavigationSuiteScaffoldAnimation port changes upstream.
import { springToLinear } from '@kyralabs/m3e-motion';
import { kebabName } from './names.js';

export interface NavigationSuiteDefault {
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

const SUITE = 'NavigationSuiteScaffold.kt';
const VECTORIZED = 'VectorizedAnimationSpec.kt';

export const NAVIGATION_SUITE_DEFAULTS_SOURCES = [SUITE, VECTORIZED];

const P = '--m3e-comp-navigation-suite-scaffold';

/** Reduced motion: the show / hide spring is spatial (it moves the navigation), so it jumps. */
export const NAVIGATION_SUITE_REDUCED_MOTION = [`${P}-visibility-duration: 0ms;`];

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

/** Wiring navigation-suite.css, m3e-motion and the elements / React layers assume. */
const CHECKS: readonly [string, RegExp][] = [
  [
    'NavigationSuiteScaffoldLayout animates its progress to the state’s currentValue on AnimationSpec',
    /val animationProgress by\n\s*animateFloatAsState\(\n\s*targetValue = if \(state\.currentValue == NavigationSuiteScaffoldValue\.Hidden\) 0f else 1f,\n\s*animationSpec = AnimationSpec,\n\s*\)/,
  ],
  [
    'bar types: the content is the layout height less height × progress, the navigation below it',
    /maxHeight =\n\s*layoutHeight -\n\s*\(navigationPlaceable\.height \* animationProgress\)\.toInt\(\),[\s\S]*?navigationPlaceable\.placeRelative\(\n\s*0,\n\s*layoutHeight - \(navigationPlaceable\.height \* animationProgress\)\.toInt\(\),\n\s*\)/,
  ],
  [
    'bar types: the primary action sits PrimaryActionContentPadding above the navigation',
    /layoutHeight -\n\s*primaryActionContentPlaceable\.height -\n\s*PrimaryActionContentPadding\.roundToPx\(\) -\n\s*\(navigationPlaceable\.height \* animationProgress\)\.toInt\(\),/,
  ],
  [
    'vertical types: the navigation at −width × (1 − progress), the content beside it',
    /navigationPlaceable\.placeRelative\(\n\s*\(0 - \(navigationPlaceable\.width \* \(1f - animationProgress\)\)\)\.toInt\(\),\n\s*0,\n\s*\)[\s\S]*?contentPlaceable\.placeRelative\(\n\s*\(navigationPlaceable\.width \* animationProgress\)\.toInt\(\),\n\s*0,\n\s*\)/,
  ],
  [
    'the bar types (isNavigationBar)',
    /this == NavigationSuiteType\.ShortNavigationBarCompact \|\|\n\s*this == NavigationSuiteType\.ShortNavigationBarMedium \|\|\n\s*this == NavigationSuiteType\.NavigationBar/,
  ],
  [
    'NavigationSuite: the expanded rail type is a WideNavigationRail whose state starts Expanded',
    /NavigationSuiteType\.WideNavigationRailExpanded -> \{\n\s*WideNavigationRail\(\n\s*modifier = modifier,\n\s*header = primaryActionContent,\n\s*state =\n\s*rememberWideNavigationRailState\(\n\s*initialValue = WideNavigationRailValue\.Expanded\n\s*\),/,
  ],
  [
    'NavigationSuite: the drawer type is a PermanentDrawerSheet with the primary action first',
    /NavigationSuiteType\.NavigationDrawer -> \{\n\s*PermanentDrawerSheet\(\n\s*modifier = modifier,\n\s*drawerContainerColor = colors\.navigationDrawerContainerColor,\n\s*drawerContentColor = colors\.navigationDrawerContentColor,\n\s*\) \{\n\s*primaryActionContent\(\)/,
  ],
  [
    'NavigationSuiteItem: Start icon position (horizontal items) for ShortNavigationBarMedium',
    /if \(navigationSuiteType == NavigationSuiteType\.ShortNavigationBarCompact\) \{\n\s*NavigationItemIconPosition\.Top\n\s*\} else \{\n\s*NavigationItemIconPosition\.Start\n\s*\}/,
  ],
  [
    'navigationSuiteType: compact width → compact bar, tabletop / compact height → medium bar, else collapsed rail',
    /if \(windowSizeClass\.minWidth == WindowSizeClass\.WidthSizeClasses\.Compact\) \{\n\s*NavigationSuiteType\.ShortNavigationBarCompact\n\s*\} else if \(\n\s*windowPosture\.isTabletop \|\|\n\s*windowSizeClass\.minHeight == WindowSizeClass\.HeightSizeClasses\.Compact\n\s*\) \{\n\s*NavigationSuiteType\.ShortNavigationBarMedium\n\s*\} else \{\n\s*NavigationSuiteType\.WideNavigationRailCollapsed\n\s*\}/,
  ],
  [
    'the state animates one Animatable on AnimationSpec; currentValue is Visible only at exactly 1',
    /private val internalState = Animatable\(internalValue, Float\.VectorConverter\)\n\s*private val _currentVal = derivedStateOf \{\n\s*if \(internalState\.value == Visible\) \{[\s\S]*?override val isAnimating: Boolean\n\s*get\(\) = internalState\.isRunning[\s\S]*?override suspend fun hide\(\) \{\n\s*internalState\.animateTo\(targetValue = Hidden, animationSpec = AnimationSpec\)\n\s*\}\n\n\s*override suspend fun show\(\) \{\n\s*internalState\.animateTo\(targetValue = Visible, animationSpec = AnimationSpec\)/,
  ],
];

/**
 * `sources`: vendored files by name (NavigationSuiteScaffold.kt from the material3-adaptive
 * vendor, VectorizedAnimationSpec.kt from animation-core).
 */
export function extractNavigationSuiteDefaults(
  sources: Readonly<Record<string, string>>,
): NavigationSuiteDefault[] {
  const suite = normalize(sources, SUITE);
  for (const [what, pattern] of CHECKS) {
    if (!pattern.test(suite)) throw new Error(`${SUITE}: ${what} (changed upstream?)`);
  }
  const at = (pattern: RegExp, owner: string, member: string, file = SUITE) => ({
    ...find(sources, file, pattern, `${owner}.${member}`),
    owner,
    member,
    file,
  });
  const out: NavigationSuiteDefault[] = [];

  for (const [field, member] of [
    ['container-color', 'containerColor'],
    ['content-color', 'contentColor'],
  ] as const) {
    const role = at(
      new RegExp(
        String.raw`public val ${member}: Color\n\s*@Composable get\(\) = MaterialTheme\.colorScheme\.(\w+)`,
        'd',
      ),
      'NavigationSuiteScaffoldDefaults',
      member,
    );
    const value = `var(--m3e-sys-color-${kebabName(role.value.charAt(0).toUpperCase() + role.value.slice(1))})`;
    out.push({
      ...role,
      name: `${P}-${field}`,
      value,
      js: value,
      raw: `MaterialTheme.colorScheme.${role.value}`,
      note:
        field === 'container-color'
          ? 'the scaffold’s Surface behind the navigation and the content'
          : 'the scaffold’s Surface content color (typography and icons in the content)',
    });
  }

  const alignment = at(
    /public val primaryActionContentAlignment: Alignment\.Horizontal = Alignment\.(\w+)/d,
    'NavigationSuiteScaffoldDefaults',
    'primaryActionContentAlignment',
  );
  const justify = { Start: 'start', CenterHorizontally: 'center', End: 'end' }[alignment.value];
  if (justify === undefined) throw new Error(`${SUITE}: unexpected Alignment.${alignment.value}`);
  out.push({
    ...alignment,
    name: `${P}-primary-action-alignment`,
    value: justify,
    js: justify,
    raw: `Alignment.${alignment.value}`,
    note: 'with a bar: where the primary action sits above it (justify-self; logical, as placeRelative)',
  });

  const padding = at(
    /private val PrimaryActionContentPadding\n\s*get\(\) = (\d+)\.dp/d,
    SUITE,
    'PrimaryActionContentPadding',
  );
  out.push({
    ...padding,
    name: `${P}-primary-action-padding`,
    value: `${padding.value}px`,
    js: Number(padding.value),
    raw: `${padding.value}.dp`,
    note: 'with a bar: between the primary action and the bar, and from the start / end edge',
  });

  const spec = at(
    /private val AnimationSpec: SpringSpec<Float> =\n\s*(spring)\(dampingRatio = SpringDefaultSpatialDamping, stiffness = SpringDefaultSpatialStiffness\)/d,
    SUITE,
    'AnimationSpec',
  );
  const damping = at(
    /private const val SpringDefaultSpatialDamping = ([\d.]+)f/d,
    SUITE,
    'SpringDefaultSpatialDamping',
  );
  const stiffness = at(
    /private const val SpringDefaultSpatialStiffness = ([\d.]+)f/d,
    SUITE,
    'SpringDefaultSpatialStiffness',
  );
  const threshold = at(
    /public const val DefaultDisplacementThreshold: Float = ([\d.]+)f/d,
    'Spring',
    'DefaultDisplacementThreshold',
    VECTORIZED,
  );
  const springSpec = { dampingRatio: Number(damping.value), stiffness: Number(stiffness.value) };
  const linear = springToLinear(springSpec, { visibilityThreshold: Number(threshold.value) });
  const via = `AnimationSpec (${SUITE} L${String(spec.line)}): NavigationSuiteScaffoldState.show() / hide() / toggle() and the layout’s animateFloatAsState`;
  out.push(
    {
      ...damping,
      name: `${P}-visibility-damping-ratio`,
      value: String(springSpec.dampingRatio),
      js: springSpec.dampingRatio,
      raw: `${damping.value}f`,
      note: via,
    },
    {
      ...stiffness,
      name: `${P}-visibility-stiffness`,
      value: String(springSpec.stiffness),
      js: springSpec.stiffness,
      raw: `${stiffness.value}f`,
      note: via,
    },
    {
      ...threshold,
      name: `${P}-visibility-duration`,
      value: `${String(linear.durationMillis)}ms`,
      js: linear.durationMillis,
      raw: `ζ=${String(springSpec.dampingRatio)}, k=${String(springSpec.stiffness)}, threshold ${threshold.value}`,
      note: 'springToLinear() (m3e-motion) duration estimate at Spring.DefaultDisplacementThreshold (neither the Animatable nor animateFloatAsState passes one); 0ms with prefers-reduced-motion (spatial)',
    },
    {
      ...threshold,
      name: `${P}-visibility-easing`,
      value: linear.easing,
      js: linear.easing,
      raw: `ζ=${String(springSpec.dampingRatio)}, k=${String(springSpec.stiffness)}`,
      note: `springToLinear() (m3e-motion), ${String(linear.stops.length)} stops, max error ${linear.maxError.toFixed(4)}`,
    },
  );
  return out;
}
