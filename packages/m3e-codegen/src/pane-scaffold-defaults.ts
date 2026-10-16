// Values Compose's three-pane scaffolds render (material3-adaptive adaptive-layout; there are no
// *Tokens for them): calculatePaneScaffoldDirective's partition spacer and the directive's default
// pane sizes (PaneScaffoldDirective.kt), and the pane motion spring with its delayed variant
// (PaneMotionDefaults, PaneMotion.kt). Each value is read with a targeted regex and cited by line;
// CHECKS throw when wiring that m3e-motion's three-pane-scaffold.ts ports changes upstream.
//
// Plus the feed canonical layout, which has no Compose scaffold: its margins from m3.material.io
// (source priority 2, CLAUDE.md) and two values m3.material.io does not state (TODO(verify),
// SOURCES.md register).
import { springToLinear } from '@kyralabs/m3e-motion';

export interface PaneScaffoldDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts. */
  js: number | string;
  /** Source text of the value. */
  raw: string;
  owner: string;
  member: string;
  /** Vendored file, or null for a value cited from m3.material.io. */
  file: string | null;
  line: number;
  /** Full citation for values without a vendored file. */
  cite?: string;
  note?: string;
}

const DIRECTIVE = 'PaneScaffoldDirective.kt';
const MOTION = 'PaneMotion.kt';
const EXPANSION = 'PaneExpansionState.kt';
const SCAFFOLD = 'ThreePaneScaffold.kt';

export const PANE_SCAFFOLD_DEFAULTS_SOURCES = [DIRECTIVE, MOTION, EXPANSION, SCAFFOLD];

const P = '--m3e-comp-pane-scaffold';
const F = '--m3e-comp-feed';

/** Reduced motion: the pane motion is spatial (bounds and slides), so it jumps. */
export const PANE_SCAFFOLD_REDUCED_MOTION = [`${P}-motion-duration: 0ms;`];

const normalize = (sources: Readonly<Record<string, string>>, file: string) => {
  const text = sources[file];
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

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

/** Wiring m3e-motion's port (three-pane-scaffold.ts) and the layers assume. */
const CHECKS: readonly [string, string, RegExp][] = [
  [
    SCAFFOLD,
    'the remaining width goes to the highest-priority expanded pane, else every pane scales down',
    /if \(allocatableWidth > totalPreferredWidth\) \{\n\s*\/\/ Allocate the remaining space to the pane with the highest priority\.\n\s*expandedPanes\.maxBy \{ it\.priority \}\.measuringWidth \+=\n\s*allocatableWidth - totalPreferredWidth\n\s*\} else if \(allocatableWidth < totalPreferredWidth\) \{\n\s*\/\/ Scale down all panes to fit in the available space\.\n\s*val scale = allocatableWidth\.toFloat\(\) \/ totalPreferredWidth/,
  ],
  [
    SCAFFOLD,
    'pane priorities primary 10, secondary 5, tertiary 1',
    /const val PrimaryPanePriority = 10\n\s*const val SecondaryPanePriority = 5\n\s*const val TertiaryPanePriority = 1/,
  ],
  [
    SCAFFOLD,
    'the reflowed pane takes at most half of its partition below the expanded pane',
    /expandedPane\.measuringHeight =\n\s*max\(availableHeight - reflowedPane\.measuringHeight, availableHeight \/ 2\)/,
  ],
  [
    SCAFFOLD,
    'focus moves to the current destination pane when it changes (shouldAutoFocusCurrentDestination)',
    /if \(scaffoldDirective\.shouldAutoFocusCurrentDestination\) \{\n\s*LaunchedEffect\(scaffoldValue\.currentDestination\) \{\n\s*scaffoldScope\.focusRequesters\[scaffoldValue\.currentDestination\]\?\.requestFocus\(\)/,
  ],
  [
    DIRECTIVE,
    'two stacked panes on a tabletop posture or a single-pane window of expanded height',
    /windowAdaptiveInfo\.windowPosture\.isTabletop \|\|\n\s*\(maxHorizontalPartitions == 1 &&\n\s*windowAdaptiveInfo\.windowSizeClass\.minHeight ==\n\s*WindowSizeClass\.HeightSizeClasses\.Expanded\)\n\s*\) \{\n\s*maxVerticalPartitions = 2\n\s*verticalPartitionSpacerSize = 24\.dp/,
  ],
  [
    EXPANSION,
    'the drag handle settles on the pane motion spring (DefaultAnchoringAnimationSpec)',
    /internal val DefaultAnchoringAnimationSpec =\n\s*spring\(dampingRatio = 0\.8f, stiffness = 380f, visibilityThreshold = 1f\)/,
  ],
  [
    EXPANSION,
    'AnchoringVelocityThreshold 200 px/s',
    /private const val AnchoringVelocityThreshold = 200F/,
  ],
  [
    MOTION,
    'DelayedAnimationSpec and VisibilityAnimationSpec use the same spring as AnimationSpec',
    /DelayedSpringSpec\(\n\s*dampingRatio = 0\.8f,\n\s*stiffness = 380f,\n\s*delayedRatio = [\d.]+f,[\s\S]*?VisibilityAnimationSpec: FiniteAnimationSpec<Float> =\n\s*spring\(dampingRatio = 0\.8f, stiffness = 380f\)/,
  ],
];

/** m3.material.io pages the feed values come from (content JSON, carbon 2026-10-13_06-10-19). */
const M3_BREAKPOINTS =
  'm3.material.io Foundations › Layout › Breakpoints (_dsm/content/m3/2026-10-13_06-10-19/16281dc1-7630-4e78-abaf-c9bc8be69663.json, updated 2026-07-17)';

/**
 * `sources`: vendored files by name (PaneScaffoldDirective.kt, PaneMotion.kt, PaneExpansionState.kt
 * and ThreePaneScaffold.kt from the material3-adaptive vendor).
 */
export function extractPaneScaffoldDefaults(
  sources: Readonly<Record<string, string>>,
): PaneScaffoldDefault[] {
  for (const [file, what, pattern] of CHECKS) {
    if (!pattern.test(normalize(sources, file)))
      throw new Error(`${file}: ${what} (changed upstream?)`);
  }
  const at = (file: string, pattern: RegExp, owner: string, member: string) => ({
    ...find(sources, file, pattern, `${owner}.${member}`),
    owner,
    member,
    file,
  });
  const out: PaneScaffoldDefault[] = [];

  const spacer = at(
    DIRECTIVE,
    /WindowSizeClass\.WidthSizeClasses\.Expanded -> \{\n\s*maxHorizontalPartitions = 2\n\s*horizontalPartitionSpacerSize = (\d+)\.dp/d,
    'calculatePaneScaffoldDirective',
    'horizontalPartitionSpacerSize',
  );
  out.push({
    ...spacer,
    name: `${P}-partition-spacer-size`,
    value: `${spacer.value}px`,
    js: Number(spacer.value),
    raw: `${spacer.value}.dp`,
    note: 'between side-by-side panes from expanded width, and between a pane and the pane reflowed under it',
  });
  for (const [member, field, note] of [
    ['DefaultPreferredWidth', 'pane-preferred-width', 'compact to expanded width'],
    ['DefaultPreferredWidthXL', 'pane-preferred-width-large', 'from large width'],
    ['DefaultPreferredHeight', 'pane-preferred-height', 'a reflowed pane’s height at most'],
  ] as const) {
    const size = at(
      DIRECTIVE,
      new RegExp(String.raw`internal val ${member} = (\d+)\.dp`, 'd'),
      'PaneScaffoldDirective',
      member,
    );
    out.push({
      ...size,
      name: `${P}-${field}`,
      value: `${size.value}px`,
      js: Number(size.value),
      raw: `${size.value}.dp`,
      note: `default preferred pane size, ${note}; a pane's preferredWidth / preferredHeight overrides it`,
    });
  }

  const damping = at(
    MOTION,
    /public val AnimationSpec: FiniteAnimationSpec<IntRect> =\n\s*spring\(\n\s*dampingRatio = ([\d.]+)f,/d,
    'PaneMotionDefaults',
    'AnimationSpec',
  );
  const stiffness = at(
    MOTION,
    /public val AnimationSpec: FiniteAnimationSpec<IntRect> =\n\s*spring\(\n\s*dampingRatio = [\d.]+f,\n\s*stiffness = ([\d.]+)f,/d,
    'PaneMotionDefaults',
    'AnimationSpec',
  );
  const delayed = at(
    MOTION,
    /delayedRatio = ([\d.]+)f,/d,
    'PaneMotionDefaults',
    'DelayedAnimationSpec',
  );
  const spec = { dampingRatio: Number(damping.value), stiffness: Number(stiffness.value) };
  const linear = springToLinear(spec);
  const via =
    'pane bounds, slides and expand / shrink (AnimatedPane); the drag handle’s anchoring (DefaultAnchoringAnimationSpec, same spring)';
  out.push(
    {
      ...damping,
      name: `${P}-motion-damping-ratio`,
      value: String(spec.dampingRatio),
      js: spec.dampingRatio,
      raw: `${damping.value}f`,
      note: via,
    },
    {
      ...stiffness,
      name: `${P}-motion-stiffness`,
      value: String(spec.stiffness),
      js: spec.stiffness,
      raw: `${stiffness.value}f`,
      note: via,
    },
    {
      ...delayed,
      name: `${P}-motion-delayed-ratio`,
      value: delayed.value,
      js: Number(delayed.value),
      raw: `${delayed.value}f`,
      note: 'EnterFromLeftDelayed / EnterFromRightDelayed start after this fraction of the spring’s duration',
    },
    {
      ...damping,
      name: `${P}-motion-duration`,
      value: `${String(linear.durationMillis)}ms`,
      js: linear.durationMillis,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}`,
      note: 'springToLinear() (m3e-motion) estimate for a 0 → 1 move at 0.1 % (the JS layer runs the spring itself at Compose’s 1px threshold); 0ms with prefers-reduced-motion (spatial)',
    },
    {
      ...damping,
      name: `${P}-motion-easing`,
      value: linear.easing,
      js: linear.easing,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}`,
      note: `springToLinear() (m3e-motion), ${String(linear.stops.length)} stops, max error ${linear.maxError.toFixed(4)}`,
    },
  );

  // Feed: no Compose scaffold. Margins from m3.material.io; the gap and column width are not stated.
  const m3 = (
    field: string,
    px: number,
    member: string,
    cite: string,
    note: string,
  ): PaneScaffoldDefault => ({
    name: `${F}-${field}`,
    value: `${String(px)}px`,
    js: px,
    raw: `${String(px)}dp`,
    owner: 'Feed',
    member,
    file: null,
    line: 0,
    cite,
    note,
  });
  out.push(
    m3(
      'margin-compact',
      16,
      'margin (compact)',
      `${M3_BREAKPOINTS} sections[1].contentBlocks[7]`,
      '“Margins are 16dp from the leading and trailing edge” (compact window)',
    ),
    m3(
      'margin',
      24,
      'margin (medium and up)',
      `${M3_BREAKPOINTS} sections[2].contentBlocks[9], sections[3].contentBlocks[9], sections[4].contentBlocks[14]`,
      '“Medium layouts have margins of 24dp”; expanded, large and extra-large the same',
    ),
    m3(
      'gap',
      16,
      'gap',
      'TODO(verify): SOURCES.md register #65 — m3.material.io Canonical examples › Feed states no spacing between items (project default: md.sys.measurement.space200)',
      'between feed items, both axes',
    ),
    m3(
      'column-min-width',
      240,
      'column min width',
      'TODO(verify): SOURCES.md register #66 — m3.material.io Canonical examples › Feed gives no column counts or widths per window class (only “should usually increase”; project default)',
      'from medium width: as many columns as fit at this width (compact: one column, verified)',
    ),
  );
  return out;
}
