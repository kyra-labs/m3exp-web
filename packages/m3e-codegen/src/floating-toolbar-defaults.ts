// Values Compose's FloatingToolbar.kt renders that are not (or not only) in FloatingToolbarTokens:
// the FloatingToolbarDefaults sizes, paddings and offsets (token references), the toolbar
// elevations ("TODO read from token"), the gap to an adjacent FAB and its size range, the toolbar
// FAB's shape and elevations, the standard / vibrant color pairs (contentColorFor, "TODO load
// colors from the toolbar tokens"), the motion-scheme springs behind expand/collapse and the
// exit-always snap ("TODO Load the motionScheme tokens from the component tokens file") and the
// collapse-on-scroll distance. Each is read with a targeted regex from the vendored files and cited
// by line. Compose's layouts place the items with Arrangement.Center and no spacing, so
// FloatingToolbarTokens.ContainerBetweenSpace (4dp) is not rendered; the generator checks that.
import { kebabName } from './names.js';

export interface FloatingToolbarDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value: px for dp literals, var() references otherwise. */
  value: string;
  /** JS value for components.ts (dp number, or the var() string). */
  js: number | string;
  /** Source expression as written upstream. */
  raw: string;
  owner: string;
  member: string;
  file: string;
  line: number;
  note?: string;
}

const FILE = 'FloatingToolbar.kt';
const FAB_FILE = 'FloatingActionButton.kt';
const COLOR_FILE = 'ColorScheme.kt';
const TOKENS_FILE = 'FloatingToolbarTokens.kt';
const PREFIX = '--m3e-comp-floating-toolbar-defaults';
const DEFAULTS = 'FloatingToolbarDefaults';

export const FLOATING_TOOLBAR_DEFAULTS_SOURCES = [FILE, FAB_FILE, COLOR_FILE];

/** CSS linear() timing (CSS-only transitions) and the spring itself (m3e-elements / m3e-react). */
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;

/**
 * Project reduced-motion policy (FOUNDATIONS_SPEC): spatial motion snaps. Compose snaps a partly
 * scrolled-away toolbar on the default *effects* spring, which the policy keeps animating, but the
 * snap moves the toolbar (geometry), so it jumps under `prefers-reduced-motion`.
 */
export const FLOATING_TOOLBAR_REDUCED_MOTION = [`${PREFIX}-snap-duration: 0ms;`];

type Kind =
  | 'dp'
  | 'token'
  | 'fab-token'
  | 'fab-shape'
  | 'elevation'
  | 'color-token'
  | 'color-role'
  | 'content-token'
  | 'content-role'
  | 'motion'
  | 'spacing';

interface Rule {
  kind: Kind;
  /** Variable name without the prefix. */
  name: string;
  owner: string;
  member: string;
  file?: string;
  /** First capture group: dp literal, token member, ElevationTokens level, color role, motion key. */
  pattern: RegExp;
  /** Searched inside this block only (its whole match). */
  scope?: RegExp;
  note?: string;
}

/** The standard / vibrant FloatingToolbarColors getters (FloatingToolbarDefaults). */
const STANDARD =
  /internal val ColorScheme\.defaultFloatingToolbarStandardColors: FloatingToolbarColors\n[\s\S]*?\.also \{/;
const VIBRANT =
  /internal val ColorScheme\.defaultFloatingToolbarVibrantColors: FloatingToolbarColors\n[\s\S]*?\.also \{/;

const WITH_FAB_NOTE = 'with a FAB; only the toolbar part (the FAB has its own elevation)';

const RULES: readonly Rule[] = [
  {
    kind: 'token',
    name: 'container-size',
    owner: DEFAULTS,
    member: 'ContainerSize',
    pattern: /public val ContainerSize: Dp = FloatingToolbarTokens\.(\w+)/d,
    note: 'minimum height (horizontal) / width (vertical) of the toolbar',
  },
  ...(['start', 'top', 'end', 'bottom'] as const).map((side): Rule => ({
    kind: 'token',
    name: `content-padding-${side}`,
    owner: DEFAULTS,
    member: `ContentPadding.${side}`,
    pattern: new RegExp(`PaddingValues\\([^)]*?\\b${side} = FloatingToolbarTokens\\.(\\w+)`, 'd'),
  })),
  {
    kind: 'spacing',
    name: 'item-spacing',
    owner: 'HorizontalFloatingToolbarLayout',
    member: 'horizontalArrangement',
    pattern: /horizontalArrangement = Arrangement\.(\w+),/d,
    note: 'Arrangement.Center places the items edge to edge (vertical: verticalArrangement = Arrangement.Center); FloatingToolbarTokens.ContainerBetweenSpace (4dp) is not read',
  },
  {
    kind: 'token',
    name: 'screen-offset',
    owner: DEFAULTS,
    member: 'ScreenOffset',
    pattern: /public val ScreenOffset: Dp = FloatingToolbarTokens\.(\w+)/d,
    note: 'offset from the screen edge the samples apply',
  },
  {
    kind: 'elevation',
    name: 'expanded-elevation',
    owner: DEFAULTS,
    member: 'ContainerExpandedElevation',
    pattern: /public val ContainerExpandedElevation: Dp = ElevationTokens\.(\w+)/d,
    note: 'upstream TODO: read from token',
  },
  {
    kind: 'elevation',
    name: 'collapsed-elevation',
    owner: DEFAULTS,
    member: 'ContainerCollapsedElevation',
    pattern: /public val ContainerCollapsedElevation: Dp = ElevationTokens\.(\w+)/d,
    note: 'upstream TODO: read from token',
  },
  {
    kind: 'elevation',
    name: 'expanded-elevation-with-fab',
    owner: DEFAULTS,
    member: 'ContainerExpandedElevationWithFab',
    pattern: /public val ContainerExpandedElevationWithFab: Dp =\n\s*ElevationTokens\.(\w+)/d,
    note: `${WITH_FAB_NOTE}; lerped to the collapsed value with the expanded progress (clamped at 1)`,
  },
  {
    kind: 'elevation',
    name: 'collapsed-elevation-with-fab',
    owner: DEFAULTS,
    member: 'ContainerCollapsedElevationWithFab',
    pattern: /public val ContainerCollapsedElevationWithFab: Dp =\n\s*ElevationTokens\.(\w+)/d,
    note: WITH_FAB_NOTE,
  },
  {
    kind: 'dp',
    name: 'toolbar-to-fab-gap',
    owner: DEFAULTS,
    member: 'ToolbarToFabGap',
    pattern: /internal val ToolbarToFabGap = (\d+)\.dp/d,
    note: 'upstream TODO: load from the component tokens',
  },
  {
    kind: 'fab-token',
    name: 'fab-size-min',
    owner: DEFAULTS,
    member: 'FabSizeRange.start',
    pattern: /internal val FabSizeRange = (\w+\.\w+)\.\./d,
    note: 'FAB size when expanded; size = lerp(max, min, expanded progress)',
  },
  {
    kind: 'fab-token',
    name: 'fab-size-max',
    owner: DEFAULTS,
    member: 'FabSizeRange.endInclusive',
    pattern: /internal val FabSizeRange = \w+\.\w+\.\.(\w+\.\w+)\n/d,
    note: 'FAB size when collapsed; also the layout’s minimum cross size',
  },
  {
    kind: 'fab-shape',
    name: 'fab-shape',
    owner: `${DEFAULTS}.VibrantFloatingActionButton / StandardFloatingActionButton`,
    member: 'shape',
    pattern: /shape: Shape = FloatingActionButtonDefaults\.(shape),/d,
    note: 'FloatingActionButtonDefaults.shape = FabBaselineTokens.ContainerShape at every FAB size',
  },
  ...(
    [
      ['fab-elevation', 'defaultElevation'],
      ['fab-elevation-pressed', 'pressedElevation'],
      ['fab-elevation-focused', 'focusedElevation'],
      ['fab-elevation-hovered', 'hoveredElevation'],
    ] as const
  ).map(([name, param]): Rule => ({
    kind: 'elevation',
    name,
    owner: `${DEFAULTS}.VibrantFloatingActionButton / StandardFloatingActionButton`,
    member: param,
    pattern: new RegExp(`${param} = ElevationTokens\\.(\\w+),`, 'd'),
  })),
  {
    kind: 'color-token',
    name: 'standard-container-color',
    owner: `${DEFAULTS}.defaultFloatingToolbarStandardColors`,
    member: 'toolbarContainerColor',
    pattern: /toolbarContainerColor =\n\s*fromToken\(FloatingToolbarTokens\.(Standard\w+)\)/d,
  },
  {
    kind: 'content-token',
    name: 'standard-content-color',
    owner: `${DEFAULTS}.defaultFloatingToolbarStandardColors`,
    member: 'toolbarContentColor',
    pattern:
      /toolbarContentColor =\n\s*contentColorFor\(\n\s*fromToken\(FloatingToolbarTokens\.(Standard\w+)\)/d,
    note: 'contentColorFor(container) (ColorScheme.kt); upstream TODO: load colors from the toolbar tokens',
  },
  {
    kind: 'color-role',
    name: 'standard-fab-container-color',
    owner: `${DEFAULTS}.defaultFloatingToolbarStandardColors`,
    member: 'fabContainerColor',
    scope: STANDARD,
    pattern: /fabContainerColor = fromToken\(ColorSchemeKeyTokens\.(\w+)\)/d,
  },
  {
    kind: 'content-role',
    name: 'standard-fab-content-color',
    owner: `${DEFAULTS}.defaultFloatingToolbarStandardColors`,
    member: 'fabContentColor',
    scope: STANDARD,
    pattern: /fabContentColor =\n\s*contentColorFor\(fromToken\(ColorSchemeKeyTokens\.(\w+)\)\)/d,
    note: 'contentColorFor(fabContainerColor)',
  },
  {
    kind: 'color-token',
    name: 'vibrant-container-color',
    owner: `${DEFAULTS}.defaultFloatingToolbarVibrantColors`,
    member: 'toolbarContainerColor',
    pattern: /toolbarContainerColor =\n\s*fromToken\(FloatingToolbarTokens\.(Vibrant\w+)\)/d,
  },
  {
    kind: 'content-token',
    name: 'vibrant-content-color',
    owner: `${DEFAULTS}.defaultFloatingToolbarVibrantColors`,
    member: 'toolbarContentColor',
    pattern:
      /toolbarContentColor =\n\s*contentColorFor\(fromToken\(FloatingToolbarTokens\.(Vibrant\w+)\)\)/d,
    note: 'contentColorFor(container) (ColorScheme.kt); upstream TODO: load colors from the toolbar tokens',
  },
  {
    kind: 'color-role',
    name: 'vibrant-fab-container-color',
    owner: `${DEFAULTS}.defaultFloatingToolbarVibrantColors`,
    member: 'fabContainerColor',
    scope: VIBRANT,
    pattern: /fabContainerColor = fromToken\(ColorSchemeKeyTokens\.(\w+)\)/d,
  },
  {
    kind: 'content-role',
    name: 'vibrant-fab-content-color',
    owner: `${DEFAULTS}.defaultFloatingToolbarVibrantColors`,
    member: 'fabContentColor',
    scope: VIBRANT,
    pattern: /fabContentColor =\n\s*contentColorFor\(fromToken\(ColorSchemeKeyTokens\.(\w+)\)\)/d,
    note: 'contentColorFor(fabContainerColor)',
  },
  {
    kind: 'motion',
    name: 'animation',
    owner: DEFAULTS,
    member: 'animationSpec()',
    pattern:
      /fun <T> animationSpec\(\): FiniteAnimationSpec<T> \{\n(?:\s*\/\/.*\n)*\s*return MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'expand/collapse: the with-FAB expanded progress, the leading/trailing expand/shrink transitions and the toolbar elevation',
  },
  {
    kind: 'motion',
    name: 'snap',
    owner: `${DEFAULTS}.exitAlwaysScrollBehavior`,
    member: 'snapAnimationSpec',
    pattern: /snapAnimationSpec: AnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'settles a partly scrolled-away toolbar to shown (collapsed fraction < 0.5) or hidden; snaps under reduced motion (project policy)',
  },
  {
    kind: 'dp',
    name: 'scroll-distance-threshold',
    owner: DEFAULTS,
    member: 'ScrollDistanceThreshold',
    pattern: /public val ScrollDistanceThreshold: Dp = (\d+)\.dp/d,
    note: 'floatingToolbarVerticalNestedScroll: scroll distance that collapses (down) or expands (up) the toolbar',
  },
];

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

const lowerFirst = (s: string) => s[0]!.toLowerCase() + s.slice(1);
const upperFirst = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const roleVar = (role: string) => `var(--m3e-sys-color-${kebabName(upperFirst(role))})`;

/** `ColorScheme.contentColorFor` (ColorScheme.kt): container role → content role. */
function contentRole(colorScheme: string, role: string): string {
  const table =
    /public fun ColorScheme\.contentColorFor\(backgroundColor: Color\): Color =\n\s*when \(backgroundColor\) \{\n([\s\S]*?)\n\s*\}/.exec(
      colorScheme,
    );
  if (!table) throw new Error(`${COLOR_FILE}: contentColorFor not found`);
  const match = new RegExp(`^\\s*${lowerFirst(role)} -> (\\w+)$`, 'm').exec(table[1]!);
  if (!match) throw new Error(`${COLOR_FILE}: contentColorFor has no case for ${role}`);
  return match[1]!;
}

/**
 * A token file member as an emitted value: a dp length (px), a ColorSchemeKeyTokens role or a
 * ShapeKeyTokens corner (the sys variables; generated files reference only sys tokens).
 */
function resolveToken(
  tokenFiles: readonly { name: string; content: string }[],
  object: string,
  member: string,
): { value: string; js: number | string; raw: string } {
  const file = `${object}.kt`;
  const text = normalize(tokenFiles.find((f) => f.name === file)?.content, file);
  const match = new RegExp(`val ${member}: [\\w.]+\\n\\s*get\\(\\) = (.+)\\n`).exec(text);
  if (!match) throw new Error(`${file}: ${member} not found`);
  const raw = match[1]!.trim();
  const dp = /^([\d.]+)\.dp$/.exec(raw);
  if (dp) return { value: `${String(Number(dp[1]))}px`, js: Number(dp[1]), raw };
  const role = /^ColorSchemeKeyTokens\.(\w+)$/.exec(raw);
  if (role) return { value: roleVar(role[1]!), js: roleVar(role[1]!), raw };
  const shape = /^ShapeKeyTokens\.(\w+)$/.exec(raw);
  if (shape) {
    const value = `var(--m3e-sys-shape-${kebabName(shape[1]!)})`;
    return { value, js: value, raw };
  }
  throw new Error(`${file}: ${member} = ${raw} is not a dp, color or shape token`);
}

/** The ColorSchemeKeyTokens role a FloatingToolbarTokens color member points at. */
function tokenRole(tokens: string, member: string): string {
  const match = new RegExp(
    `val ${member}: ColorToken\\n\\s*get\\(\\) = ColorSchemeKeyTokens\\.(\\w+)`,
  ).exec(tokens);
  if (!match) throw new Error(`${TOKENS_FILE}: ${member} is not a color token`);
  return match[1]!;
}

export function extractFloatingToolbarDefaults(
  sources: Readonly<Record<string, string>>,
  tokenFiles: readonly { name: string; content: string }[],
): FloatingToolbarDefault[] {
  const text = normalize(sources[FILE], FILE);
  const fab = normalize(sources[FAB_FILE], FAB_FILE);
  const colorScheme = normalize(sources[COLOR_FILE], COLOR_FILE);
  const tokens = normalize(tokenFiles.find((f) => f.name === TOKENS_FILE)?.content, TOKENS_FILE);
  if (text.includes('ContainerBetweenSpace')) {
    throw new Error(
      `${FILE} now reads FloatingToolbarTokens.ContainerBetweenSpace: emit it as the item spacing`,
    );
  }
  if (!text.includes('verticalArrangement = Arrangement.Center,')) {
    throw new Error(`${FILE}: VerticalFloatingToolbarLayout no longer centers its items`);
  }

  // Both toolbar FABs (Vibrant / Standard) use the same elevations.
  for (const param of [
    'defaultElevation',
    'pressedElevation',
    'focusedElevation',
    'hoveredElevation',
  ]) {
    const levels = new Set(
      [...text.matchAll(new RegExp(`${param} = ElevationTokens\\.(\\w+),`, 'g'))].map((m) => m[1]),
    );
    if (levels.size !== 1) throw new Error(`${FILE}: the toolbar FABs disagree on ${param}`);
  }

  return RULES.flatMap((rule): FloatingToolbarDefault[] => {
    const block = rule.scope?.exec(text);
    if (rule.scope && !block) throw new Error(`${FILE}: ${rule.owner} not found`);
    const offset = block?.index ?? 0;
    const match = rule.pattern.exec(block?.[0] ?? text);
    const at = match?.indices?.[1]?.[0] === undefined ? undefined : match.indices[1][0] + offset;
    if (!match || at === undefined)
      throw new Error(
        `${FILE}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    const line = text.slice(0, at).split('\n').length;
    const captured = match[1]!;
    const base = {
      owner: rule.owner,
      member: rule.member,
      file: FILE,
      line,
      ...(rule.note === undefined ? {} : { note: rule.note }),
    };
    const name = `${PREFIX}-${rule.name}`;
    const ref = (value: string, raw: string): FloatingToolbarDefault => ({
      ...base,
      name,
      value,
      js: value,
      raw,
    });
    switch (rule.kind) {
      case 'dp':
        return [
          { ...base, name, value: `${captured}px`, js: Number(captured), raw: `${captured}.dp` },
        ];
      case 'spacing':
        if (captured !== 'Center') throw new Error(`${FILE}: toolbar items now use ${captured}`);
        return [{ ...base, name, value: '0px', js: 0, raw: `Arrangement.${captured}` }];
      case 'token':
      case 'color-token': {
        const t = resolveToken(tokenFiles, 'FloatingToolbarTokens', captured);
        return [
          {
            ...base,
            name,
            value: t.value,
            js: t.js,
            raw: `FloatingToolbarTokens.${captured} = ${t.raw}`,
          },
        ];
      }
      case 'fab-token': {
        const [object, member] = captured.split('.') as [string, string];
        const t = resolveToken(tokenFiles, object, member);
        return [{ ...base, name, value: t.value, js: t.js, raw: `${captured} = ${t.raw}` }];
      }
      case 'fab-shape': {
        const shape = /public val shape: Shape\n\s*@Composable get\(\) = (\w+)\.(\w+)\.value/.exec(
          fab,
        );
        if (!shape) throw new Error(`${FAB_FILE}: FloatingActionButtonDefaults.shape not found`);
        const t = resolveToken(tokenFiles, shape[1]!, shape[2]!);
        return [
          ref(t.value, `FloatingActionButtonDefaults.shape = ${shape[1]!}.${shape[2]!} = ${t.raw}`),
        ];
      }
      case 'elevation': {
        const level = kebabName(captured);
        return [
          ref(`var(--m3e-sys-elevation-${level})`, `ElevationTokens.${captured}`),
          {
            ...ref(`var(--m3e-sys-elevation-${level}-shadow)`, `ElevationTokens.${captured}`),
            name: name.replace(/-elevation/, '-shadow'),
            note: 'derived: box-shadow of the referenced elevation level',
          },
        ];
      }
      case 'color-role':
        return [ref(roleVar(captured), `ColorSchemeKeyTokens.${captured}`)];
      case 'content-token': {
        const container = tokenRole(tokens, captured);
        const content = contentRole(colorScheme, container);
        return [
          ref(
            roleVar(content),
            `contentColorFor(FloatingToolbarTokens.${captured} = ${container}) = ${content}`,
          ),
        ];
      }
      case 'content-role': {
        const content = contentRole(colorScheme, captured);
        return [ref(roleVar(content), `contentColorFor(${captured}) = ${content}`)];
      }
      case 'motion':
        return SPRING_FIELDS.map((field) => {
          const value = `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`;
          return {
            ...base,
            name: `${name}-${field}`,
            value,
            js: value,
            raw: `MotionSchemeKeyTokens.${captured}`,
          };
        });
    }
  });
}
