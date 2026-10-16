// Values Compose's AppBar.kt renders for the docked toolbar (FlexibleBottomAppBar) and the legacy
// BottomAppBar (@deprecated, D4) that are not (or not only) in DockedToolbarTokens /
// BottomAppBarTokens: the BottomAppBarDefaults sizes, paddings and arrangements (token references
// and private literals), the shared container / content colors (contentColorFor), the legacy FAB
// slot padding and the FAB the samples put there (bottomAppBarFabColor, bottomAppBarFabElevation),
// the exit-always snap spring (BottomAppBarDefaults.snapAnimationSpec), and the arrangements and
// vibrant color the AppBarSamples.kt catalog renders. Each is read with a targeted regex from the
// vendored files and cited by line.
//
// Not rendered (checked here): DockedToolbarTokens.ContainerMinSpacing (no Compose code reads it),
// DockedToolbarTokens.ContainerColor (FlexibleBottomAppBar defaults to BottomAppBarDefaults
// .containerColor = BottomAppBarTokens.ContainerColor; same role today) and
// BottomAppBarTokens.ContainerElevation (BottomAppBarDefaults.ContainerElevation is 0.dp, a tonal
// elevation that casts no shadow).
import { kebabName } from './names.js';

export interface DockedToolbarDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value: px for dp literals, var() references or CSS keywords otherwise. */
  value: string;
  /** JS value for components.ts (dp number, or the CSS string). */
  js: number | string;
  /** Source expression as written upstream (resolved). */
  raw: string;
  owner: string;
  member: string;
  file: string;
  line: number;
  note?: string;
}

const FILE = 'AppBar.kt';
const SAMPLES = 'AppBarSamples.kt';
const FAB_FILE = 'FloatingActionButton.kt';
const COLOR_FILE = 'ColorScheme.kt';
const DOCKED = '--m3e-comp-docked-toolbar-defaults';
const LEGACY = '--m3e-comp-bottom-app-bar-defaults';
const DEFAULTS = 'BottomAppBarDefaults';

export const DOCKED_TOOLBAR_DEFAULTS_SOURCES = [FILE, SAMPLES, FAB_FILE, COLOR_FILE];

/** CSS linear() timing (CSS-only transitions) and the spring itself (m3e-elements / m3e-react). */
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;

/** Compose Arrangement → CSS `justify-content`. */
const ARRANGEMENTS: Readonly<Record<string, string>> = {
  SpaceBetween: 'space-between',
  SpaceAround: 'space-around',
  SpaceEvenly: 'space-evenly',
  Start: 'flex-start',
  CenterHorizontally: 'center',
};

type Kind =
  | 'dp'
  | 'dp-minus'
  | 'token'
  | 'color-token'
  | 'content-token'
  | 'color-role'
  | 'content-role'
  | 'elevation-dp'
  | 'arrangement'
  | 'motion';

interface Rule {
  kind: Kind;
  /** Full variable name. */
  name: string;
  owner: string;
  member: string;
  file: string;
  /** First capture group: dp literal, token member, color role, arrangement, motion key. */
  pattern: RegExp;
  note?: string;
}

const LEGACY_PADDING_NOTE = '16.dp minus IconButton’s 12dp touch-target expansion';

const RULES: readonly Rule[] = [
  // --- FlexibleBottomAppBar (docked toolbar) ----------------------------------------------------
  {
    kind: 'token',
    name: `${DOCKED}-container-height`,
    owner: DEFAULTS,
    member: 'FlexibleBottomAppBarHeight',
    file: FILE,
    pattern: /public val FlexibleBottomAppBarHeight: Dp = (DockedToolbarTokens\.\w+)/d,
    note: 'Row height (expandedHeight default); window insets add to it',
  },
  {
    kind: 'token',
    name: `${DOCKED}-content-padding-start`,
    owner: DEFAULTS,
    member: 'FlexibleContentPadding.start',
    file: FILE,
    pattern:
      /FlexibleContentPadding: PaddingValues =\n\s*PaddingValues\(\n\s*start = (DockedToolbarTokens\.\w+)/d,
  },
  {
    kind: 'token',
    name: `${DOCKED}-content-padding-end`,
    owner: DEFAULTS,
    member: 'FlexibleContentPadding.end',
    file: FILE,
    pattern:
      /FlexibleContentPadding: PaddingValues =\n\s*PaddingValues\(\n\s*start = \w+\.\w+,\n\s*end = (DockedToolbarTokens\.\w+)/d,
  },
  {
    kind: 'arrangement',
    name: `${DOCKED}-horizontal-arrangement`,
    owner: DEFAULTS,
    member: 'FlexibleHorizontalArrangement',
    file: FILE,
    pattern:
      /public val FlexibleHorizontalArrangement: Arrangement\.Horizontal = Arrangement\.(\w+)/d,
    note: 'default arrangement (“spread”); CSS justify-content',
  },
  {
    kind: 'token',
    name: `${DOCKED}-fixed-item-spacing`,
    owner: DEFAULTS,
    member: 'FlexibleFixedHorizontalArrangement',
    file: FILE,
    pattern:
      /FlexibleFixedHorizontalArrangement: Arrangement\.Horizontal =\n\s*Arrangement\.spacedBy\((DockedToolbarTokens\.\w+),/d,
    note: 'fixed arrangement (“center”): Arrangement.spacedBy(space, Alignment.CenterHorizontally)',
  },
  {
    kind: 'arrangement',
    name: `${DOCKED}-fixed-horizontal-arrangement`,
    owner: DEFAULTS,
    member: 'FlexibleFixedHorizontalArrangement',
    file: FILE,
    pattern:
      /FlexibleFixedHorizontalArrangement: Arrangement\.Horizontal =\n\s*Arrangement\.spacedBy\(\w+\.\w+, Alignment\.(\w+)\)/d,
    note: 'the spacedBy alignment; CSS justify-content',
  },
  {
    kind: 'arrangement',
    name: `${DOCKED}-space-around-arrangement`,
    owner: 'ExitAlwaysBottomAppBarSpacedAround (sample)',
    member: 'horizontalArrangement',
    file: SAMPLES,
    pattern:
      /horizontalArrangement = Arrangement\.(SpaceAround),\n\s*contentPadding = PaddingValues\(horizontal = 0\.dp\)/d,
  },
  {
    kind: 'arrangement',
    name: `${DOCKED}-space-evenly-arrangement`,
    owner: 'ExitAlwaysBottomAppBarSpacedEvenly (sample)',
    member: 'horizontalArrangement',
    file: SAMPLES,
    pattern:
      /horizontalArrangement = Arrangement\.(SpaceEvenly),\n\s*contentPadding = PaddingValues\(horizontal = 0\.dp\)/d,
  },
  {
    kind: 'dp',
    name: `${DOCKED}-spaced-content-padding`,
    owner: 'ExitAlwaysBottomAppBarSpacedAround / SpacedEvenly (samples)',
    member: 'contentPadding',
    file: SAMPLES,
    pattern:
      /horizontalArrangement = Arrangement\.SpaceAround,\n\s*contentPadding = PaddingValues\(horizontal = (\d+)\.dp\)/d,
    note: 'the space-around / space-evenly samples drop the horizontal content padding (both samples)',
  },
  {
    kind: 'color-token',
    name: `${DOCKED}-container-color`,
    owner: DEFAULTS,
    member: 'containerColor',
    file: FILE,
    pattern:
      /public val containerColor: Color\n\s*@Composable get\(\) = (BottomAppBarTokens\.\w+)\.value/d,
    note: 'FlexibleBottomAppBar and BottomAppBar default; DockedToolbarTokens.ContainerColor is not read',
  },
  {
    kind: 'content-token',
    name: `${DOCKED}-content-color`,
    owner: 'FlexibleBottomAppBar',
    member: 'contentColor',
    file: FILE,
    pattern:
      /public fun FlexibleBottomAppBar\(\n[\s\S]*?containerColor: Color = BottomAppBarDefaults\.containerColor,\n\s*contentColor: Color = (contentColorFor)\(containerColor\)/d,
    note: 'contentColorFor(BottomAppBarTokens.ContainerColor) (ColorScheme.kt); items inherit it (LocalContentColor)',
  },
  {
    kind: 'color-role',
    name: `${DOCKED}-vibrant-container-color`,
    owner: 'ExitAlwaysBottomAppBarFixedVibrant (sample)',
    member: 'containerColor',
    file: SAMPLES,
    pattern:
      /containerColor =\n\s*MaterialTheme\.colorScheme\.(\w+), \/\/ TODO\(b\/356885344\): tokens/d,
    note: 'upstream TODO: tokens',
  },
  {
    kind: 'content-role',
    name: `${DOCKED}-vibrant-content-color`,
    owner: 'ExitAlwaysBottomAppBarFixedVibrant (sample)',
    member: 'contentColor',
    file: SAMPLES,
    pattern:
      /containerColor =\n\s*MaterialTheme\.colorScheme\.(\w+), \/\/ TODO\(b\/356885344\): tokens/d,
    note: 'FlexibleBottomAppBar default contentColorFor(containerColor) (ColorScheme.kt)',
  },
  {
    kind: 'motion',
    name: `${DOCKED}-snap`,
    owner: DEFAULTS,
    member: 'snapAnimationSpec',
    file: FILE,
    pattern:
      /public val snapAnimationSpec: AnimationSpec<Float>\n\s*@Composable get\(\) = MotionSchemeKeyTokens\.(\w+)\.value\(\)\n\n\s*\/\*\*\n\s*\* Default \[DecayAnimationSpec\] that defines how to fling the bottom app bar/d,
    note: 'exitAlwaysScrollBehavior: settles a partly hidden bar to shown (collapsed fraction < 0.5) or hidden (settleAppBarBottom); BottomAppBar shares it',
  },
  // --- BottomAppBar (@deprecated, D4) -----------------------------------------------------------
  {
    kind: 'token',
    name: `${LEGACY}-container-height`,
    owner: 'BottomAppBar',
    member: 'containerHeight',
    file: FILE,
    pattern:
      /BottomAppBarLayout\(\n\s*containerHeight = (BottomAppBarTokens\.ContainerHeight),\n\s*horizontalArrangement = Arrangement\.Start,/d,
    note: 'Row height; window insets add to it',
  },
  {
    kind: 'arrangement',
    name: `${LEGACY}-horizontal-arrangement`,
    owner: 'BottomAppBar',
    member: 'horizontalArrangement',
    file: FILE,
    pattern:
      /BottomAppBarLayout\(\n\s*containerHeight = BottomAppBarTokens\.ContainerHeight,\n\s*horizontalArrangement = Arrangement\.(\w+),/d,
    note: 'the actions row (weight 1f) is Arrangement.Start too',
  },
  {
    kind: 'dp-minus',
    name: `${LEGACY}-content-padding-horizontal`,
    owner: 'AppBar.kt',
    member: 'BottomAppBarHorizontalPadding',
    file: FILE,
    pattern: /private val BottomAppBarHorizontalPadding = (\d+\.dp - \d+\.dp)/d,
    note: `ContentPadding start and end: ${LEGACY_PADDING_NOTE}`,
  },
  {
    kind: 'dp-minus',
    name: `${LEGACY}-content-padding-top`,
    owner: 'AppBar.kt',
    member: 'BottomAppBarVerticalPadding',
    file: FILE,
    pattern: /internal val BottomAppBarVerticalPadding = (\d+\.dp - \d+\.dp)/d,
    note: `ContentPadding top (no bottom padding): ${LEGACY_PADDING_NOTE}`,
  },
  {
    kind: 'dp-minus',
    name: `${LEGACY}-fab-padding-end`,
    owner: 'AppBar.kt',
    member: 'FABHorizontalPadding',
    file: FILE,
    pattern: /private val FABHorizontalPadding = (\d+\.dp - BottomAppBarHorizontalPadding)/d,
    note: 'padding at the end of the FAB slot (16.dp minus the content padding); the FAB sits at its top start',
  },
  {
    kind: 'dp-minus',
    name: `${LEGACY}-fab-padding-top`,
    owner: 'AppBar.kt',
    member: 'FABVerticalPadding',
    file: FILE,
    pattern: /private val FABVerticalPadding = (\d+\.dp - BottomAppBarVerticalPadding)/d,
    note: 'padding above the FAB in its full-height slot (12.dp minus the content padding)',
  },
  {
    kind: 'elevation-dp',
    name: `${LEGACY}-container-elevation`,
    owner: DEFAULTS,
    member: 'ContainerElevation',
    file: FILE,
    pattern: /public val ContainerElevation: Dp = (\d+)\.dp/d,
    note: 'tonal elevation, no shadow; BottomAppBarTokens.ContainerElevation (Level2) is not rendered',
  },
  {
    kind: 'color-token',
    name: `${LEGACY}-fab-container-color`,
    owner: DEFAULTS,
    member: 'bottomAppBarFabColor',
    file: FILE,
    pattern:
      /public val bottomAppBarFabColor: Color\n\s*@Composable get\(\) = (FabSecondaryContainerTokens\.\w+)\.value/d,
    note: 'the FAB color the BottomAppBarWithFAB sample passes',
  },
  {
    kind: 'content-token',
    name: `${LEGACY}-fab-content-color`,
    owner: 'FloatingActionButton',
    member: 'contentColor',
    file: FAB_FILE,
    pattern:
      /public fun FloatingActionButton\(\n[\s\S]*?contentColor: Color = (contentColorFor)\(containerColor\)/d,
    note: 'contentColorFor(bottomAppBarFabColor) (ColorScheme.kt)',
  },
  {
    kind: 'elevation-dp',
    name: `${LEGACY}-fab-elevation`,
    owner: 'FloatingActionButtonDefaults',
    member: 'bottomAppBarFabElevation',
    file: FAB_FILE,
    pattern: /public fun bottomAppBarFabElevation\(\n\s*defaultElevation: Dp = (\d+)\.dp,/d,
    note: 'the FAB elevation the BottomAppBarWithFAB sample passes: 0dp default, pressed, focused and hovered',
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

/** A token file member: a dp length (px), a ColorSchemeKeyTokens role or a ShapeKeyTokens corner. */
function resolveToken(
  tokenFiles: readonly { name: string; content: string }[],
  ref: string,
): { value: string; js: number | string; raw: string; role?: string } {
  const [object, member] = ref.split('.') as [string, string];
  const file = `${object}.kt`;
  const text = normalize(tokenFiles.find((f) => f.name === file)?.content, file);
  const match = new RegExp(`val ${member}: [\\w.]+\\n\\s*get\\(\\) = (.+)\\n`).exec(text);
  if (!match) throw new Error(`${file}: ${member} not found`);
  const raw = match[1]!.trim();
  const dp = /^([\d.]+)\.dp$/.exec(raw);
  if (dp) return { value: `${String(Number(dp[1]))}px`, js: Number(dp[1]), raw };
  const role = /^ColorSchemeKeyTokens\.(\w+)$/.exec(raw);
  if (role) return { value: roleVar(role[1]!), js: roleVar(role[1]!), raw, role: role[1]! };
  throw new Error(`${file}: ${member} = ${raw} is not a dp or color token`);
}

/** `<a>.dp - <b>.dp` or `<a>.dp - <OtherPadding>` (resolved against `text`). */
function dpMinus(text: string, expr: string): { dp: number; raw: string } {
  const m = /^(\d+)\.dp - (?:(\d+)\.dp|(\w+))$/.exec(expr);
  if (!m) throw new Error(`${FILE}: ${expr} is not a dp difference`);
  if (m[2] !== undefined) return { dp: Number(m[1]) - Number(m[2]), raw: expr };
  const ref = new RegExp(`val ${m[3]!} = (\\d+\\.dp - \\d+\\.dp)`).exec(text);
  if (!ref) throw new Error(`${FILE}: ${m[3]!} not found`);
  const inner = dpMinus(text, ref[1]!);
  return { dp: Number(m[1]) - inner.dp, raw: `${expr} (${m[3]!} = ${ref[1]!})` };
}

export function extractDockedToolbarDefaults(
  sources: Readonly<Record<string, string>>,
  tokenFiles: readonly { name: string; content: string }[],
): DockedToolbarDefault[] {
  const texts: Record<string, string> = {
    [FILE]: normalize(sources[FILE], FILE),
    [SAMPLES]: normalize(sources[SAMPLES], SAMPLES),
    [FAB_FILE]: normalize(sources[FAB_FILE], FAB_FILE),
  };
  const colorScheme = normalize(sources[COLOR_FILE], COLOR_FILE);
  const appBar = texts[FILE]!;
  for (const unused of [
    'DockedToolbarTokens.ContainerMinSpacing',
    'DockedToolbarTokens.ContainerColor',
  ]) {
    if (appBar.includes(unused))
      throw new Error(`${FILE} now reads ${unused}: emit it (docked-toolbar-defaults.ts)`);
  }
  if (!appBar.includes('tonalElevation = AppBarTokens.ContainerElevation,')) {
    throw new Error(`${FILE}: FlexibleBottomAppBar no longer uses AppBarTokens.ContainerElevation`);
  }
  // The space-evenly sample drops the horizontal padding like the space-around one.
  if (
    !/Arrangement\.SpaceEvenly,\n\s*contentPadding = PaddingValues\(horizontal = 0\.dp\)/.test(
      texts[SAMPLES]!,
    )
  ) {
    throw new Error(`${SAMPLES}: ExitAlwaysBottomAppBarSpacedEvenly changed its content padding`);
  }
  // bottomAppBarFabElevation: every state defaults to the same dp.
  const fabElevation =
    /public fun bottomAppBarFabElevation\(\n\s*defaultElevation: Dp = (\d+)\.dp,\n\s*pressedElevation: Dp = (\d+)\.dp,\n\s*focusedElevation: Dp = (\d+)\.dp,\n\s*hoveredElevation: Dp = (\d+)\.dp,/.exec(
      texts[FAB_FILE]!,
    );
  if (!fabElevation || new Set(fabElevation.slice(1)).size !== 1) {
    throw new Error(`${FAB_FILE}: bottomAppBarFabElevation states differ`);
  }

  return RULES.flatMap((rule): DockedToolbarDefault[] => {
    const text = texts[rule.file]!;
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined)
      throw new Error(
        `${rule.file}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    const line = text.slice(0, at).split('\n').length;
    const captured = match[1]!;
    const base = {
      name: rule.name,
      owner: rule.owner,
      member: rule.member,
      file: rule.file,
      line,
      ...(rule.note === undefined ? {} : { note: rule.note }),
    };
    const css = (value: string, raw: string): DockedToolbarDefault => ({
      ...base,
      value,
      js: value,
      raw,
    });
    switch (rule.kind) {
      case 'dp':
        return [{ ...base, value: `${captured}px`, js: Number(captured), raw: `${captured}.dp` }];
      case 'dp-minus': {
        const { dp, raw } = dpMinus(text, captured);
        return [{ ...base, value: `${String(dp)}px`, js: dp, raw }];
      }
      case 'token':
      case 'color-token': {
        const t = resolveToken(tokenFiles, captured);
        return [{ ...base, value: t.value, js: t.js, raw: `${captured} = ${t.raw}` }];
      }
      case 'content-token': {
        const container =
          rule.file === FAB_FILE
            ? 'FabSecondaryContainerTokens.ContainerColor'
            : 'BottomAppBarTokens.ContainerColor';
        const role = resolveToken(tokenFiles, container).role!;
        const content = contentRole(colorScheme, role);
        return [css(roleVar(content), `contentColorFor(${container} = ${role}) = ${content}`)];
      }
      case 'color-role':
        return [css(roleVar(captured), `ColorScheme.${captured}`)];
      case 'content-role': {
        const content = contentRole(colorScheme, upperFirst(captured));
        return [css(roleVar(content), `contentColorFor(${captured}) = ${content}`)];
      }
      case 'elevation-dp': {
        if (captured !== '0') throw new Error(`${rule.file}: ${rule.member} is now ${captured}.dp`);
        return [
          { ...base, value: '0px', js: 0, raw: `${captured}.dp` },
          {
            ...css(
              'var(--m3e-sys-elevation-level0-shadow)',
              `${captured}.dp = ElevationTokens.Level0`,
            ),
            name: rule.name.replace(/-elevation$/, '-shadow'),
            note: 'derived: no shadow (0dp = ElevationTokens.Level0)',
          },
        ];
      }
      case 'arrangement': {
        const value = ARRANGEMENTS[captured];
        if (value === undefined) throw new Error(`${rule.file}: unmapped arrangement ${captured}`);
        const owner = captured === 'CenterHorizontally' ? 'Alignment' : 'Arrangement';
        return [css(value, `${owner}.${captured}`)];
      }
      case 'motion':
        return SPRING_FIELDS.map((field) => ({
          ...css(
            `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
            `MotionSchemeKeyTokens.${captured}`,
          ),
          name: `${rule.name}-${field}`,
        }));
    }
  });
}
