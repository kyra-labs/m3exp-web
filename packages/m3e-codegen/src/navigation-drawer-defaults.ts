// Values Compose's navigation drawers render (NavigationDrawer.kt) that are not in
// NavigationDrawerTokens:
// - NavigationDrawerItem's private layout literals (16dp start / 24dp end padding, the 12dp spacers
//   after the icon and before the badge), NavigationDrawerItemDefaults.ItemPadding (12dp, applied
//   by every sample) and the label style the item inherits (it sets none: MaterialTheme provides
//   bodyLarge; NavigationDrawerTokens.LabelTextFont is not read);
// - the sheet: MinimumDrawerWidth (240dp; the maximum and default is ContainerWidth), the modal
//   elevation (DrawerDefaults.ModalDrawerElevation Level0; the tokens' ModalContainerElevation is
//   not read), the standard sheets' RectangleShape and the samples' 12dp top spacer;
// - DrawerDefaults.scrimColor (ScrimTokens) and the motion: open on DefaultSpatial, close on
//   FastEffects (ModalNavigationDrawer and DismissibleNavigationDrawer, under upstream "TODO Load
//   the motionScheme tokens from the component tokens file"), the drag settle tween
//   (AnchoredDraggableDefaultAnimationSpec, 256ms with TweenSpec's FastOutSlowInEasing) and the
//   anchoredDraggable thresholds (50% of the distance, 400dp/s);
// - from m3.material.io (source priority 2; Compose has no headline, section label or divider for
//   drawers): the headline / section label row and the divider inset of the Specs redlines and the
//   divider color of the token DB.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// navigation-drawer.css assumes changes upstream.
import { kebabName } from './names.js';

export interface NavigationDrawerDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts (dp number, ratio, or the CSS string). */
  js: number | string;
  /** Source expression as written upstream (resolved). */
  raw: string;
  owner: string;
  member: string;
  /** Vendored file name (undefined: an m3.material.io value, see `cite`). */
  file?: string;
  line?: number;
  cite?: string;
  note?: string;
}

const DRAWER = 'NavigationDrawer.kt';
const THEME = 'MaterialTheme.kt';
const SAMPLES = 'DrawerSamples.kt';
const SPEC = 'AnimationSpec.kt';

export const NAVIGATION_DRAWER_DEFAULTS_SOURCES = [DRAWER, THEME, SAMPLES, SPEC];

const P = '--m3e-comp-navigation-drawer';
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;
const TYPE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;

/** m3.material.io page and token DB the headline / section / divider values come from. */
export const NAVIGATION_DRAWER_M3IO_SPECS =
  'm3.material.io Navigation drawer › Specs (_dsm/content/m3/2026-10-13_06-10-19/d2a1a290-0db4-4622-8a4b-bd11b6a4ec8d.json sections[1].contentBlocks[14] / [17], redlines at 2x, updated 2026-07-30)';
export const NAVIGATION_DRAWER_M3IO_TOKENS =
  'm3.material.io token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.376969f91547be8e.json, md.comp.navigation-drawer)';

/**
 * Reduced motion (project policy, as the search and top app bar): the drawer closes on the fast
 * *effects* spring and settles a drag on a tween, which the motion policy would keep animating,
 * but both move the sheet, so they jump under `prefers-reduced-motion`. The open spring is
 * spatial and already resolves to 0ms there (tokens.css).
 */
export const NAVIGATION_DRAWER_REDUCED_MOTION = [
  `${P}-close-duration: 0ms;`,
  `${P}-settle-duration: 0ms;`,
];

type Kind = 'dp' | 'zero' | 'ratio' | 'velocity' | 'motion' | 'elevation' | 'ref' | 'type' | 'ms';

interface Rule {
  kind: Kind;
  name: string;
  owner: string;
  member: string;
  file: string;
  /** First capture group: a dp literal, a ratio, a motion / elevation key, a reference. */
  pattern: RegExp;
  note?: string;
}

const MOTION_TODO = String.raw`\s*\/\/ TODO Load the motionScheme tokens from the component tokens file\n`;

const RULES: readonly Rule[] = [
  {
    kind: 'dp',
    name: `${P}-min-width`,
    owner: DRAWER,
    member: 'MinimumDrawerWidth',
    file: DRAWER,
    pattern: /private val MinimumDrawerWidth\n\s*get\(\) = (\d+)\.dp/d,
    note: 'DrawerSheet sizeIn(minWidth); the maximum (and, with fillMaxWidth items, the width) is NavigationDrawerTokens.ContainerWidth',
  },
  {
    kind: 'dp',
    name: `${P}-top-padding`,
    owner: 'ModalNavigationDrawerSample',
    member: 'Spacer',
    file: SAMPLES,
    pattern:
      /fun ModalNavigationDrawerSample\(\)[\s\S]*?Column\(Modifier\.verticalScroll\(rememberScrollState\(\)\)\) \{\n\s*Spacer\(Modifier\.height\((\d+)\.dp\)\)/d,
    note: 'every drawer sample (Compose catalog): before the first item',
  },
  {
    kind: 'dp',
    name: `${P}-item-horizontal-padding`,
    owner: 'NavigationDrawerItemDefaults',
    member: 'ItemPadding',
    file: DRAWER,
    pattern: /public val ItemPadding: PaddingValues = PaddingValues\(horizontal = (\d+)\.dp\)/d,
    note: 'around each item (the samples apply it); the item fills the rest of the sheet width',
  },
  {
    kind: 'dp',
    name: `${P}-item-padding-start`,
    owner: 'NavigationDrawerItem',
    member: 'Row padding(start)',
    file: DRAWER,
    pattern: /Row\(\n\s*Modifier\.padding\(start = (\d+)\.dp, end = \d+\.dp\),/d,
  },
  {
    kind: 'dp',
    name: `${P}-item-padding-end`,
    owner: 'NavigationDrawerItem',
    member: 'Row padding(end)',
    file: DRAWER,
    pattern: /Row\(\n\s*Modifier\.padding\(start = \d+\.dp, end = (\d+)\.dp\),/d,
  },
  {
    kind: 'dp',
    name: `${P}-item-icon-label-space`,
    owner: 'NavigationDrawerItem',
    member: 'Spacer (after the icon)',
    file: DRAWER,
    pattern:
      /CompositionLocalProvider\(LocalContentColor provides iconColor, content = icon\)\n\s*Spacer\(Modifier\.width\((\d+)\.dp\)\)/d,
  },
  {
    kind: 'dp',
    name: `${P}-item-label-badge-space`,
    owner: 'NavigationDrawerItem',
    member: 'Spacer (before the badge)',
    file: DRAWER,
    pattern: /if \(badge != null\) \{\n\s*Spacer\(Modifier\.width\((\d+)\.dp\)\)/d,
  },
  {
    kind: 'type',
    name: `${P}-item-label-text`,
    owner: 'MaterialTheme',
    member: 'ProvideTextStyle',
    file: THEME,
    pattern: /ProvideTextStyle\(value = typography\.(\w+), content = content\)/d,
    note: 'NavigationDrawerItem sets no text style, so its label (and badge) inherit LocalTextStyle; NavigationDrawerTokens.LabelTextFont (label large) is not read',
  },
  {
    kind: 'zero',
    name: `${P}-standard-container-shape`,
    owner: 'DismissibleDrawerSheet / PermanentDrawerSheet',
    member: 'drawerShape',
    file: DRAWER,
    pattern:
      /public fun DismissibleDrawerSheet\(\n\s*modifier: Modifier = Modifier,\n\s*drawerShape: Shape = (RectangleShape),/d,
    note: 'RectangleShape (PermanentDrawerSheet too); the modal sheet uses DrawerDefaults.shape = NavigationDrawerTokens.ContainerShape',
  },
  {
    kind: 'elevation',
    name: `${P}-modal-elevation`,
    owner: 'DrawerDefaults',
    member: 'ModalDrawerElevation',
    file: DRAWER,
    pattern: /public val ModalDrawerElevation: Dp = ElevationTokens\.(\w+)/d,
    note: 'tonal elevation of ModalDrawerSheet (no shadow); NavigationDrawerTokens.ModalContainerElevation (Level1) is not read',
  },
  {
    kind: 'ref',
    name: `${P}-scrim-color`,
    owner: 'DrawerDefaults',
    member: 'scrimColor',
    file: DRAWER,
    pattern:
      /public val scrimColor: Color\n\s*@Composable get\(\) = (ScrimTokens\.ContainerColor)\.value\.copy\(ScrimTokens\.ContainerOpacity\)/d,
  },
  {
    kind: 'ref',
    name: `${P}-scrim-opacity`,
    owner: 'DrawerDefaults',
    member: 'scrimColor',
    file: DRAWER,
    pattern:
      /public val scrimColor: Color\n\s*@Composable get\(\) = ScrimTokens\.ContainerColor\.value\.copy\((ScrimTokens\.ContainerOpacity)\)/d,
    note: 'Scrim alpha: × the open fraction (offset − closed anchor) / sheet width',
  },
  {
    kind: 'motion',
    name: `${P}-open`,
    owner: 'ModalNavigationDrawer',
    member: 'openMotion',
    file: DRAWER,
    pattern:
      /public fun ModalNavigationDrawer\([\s\S]*?val openMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'DrawerState.open() (also DismissibleNavigationDrawer); starts from the current offset and velocity',
  },
  {
    kind: 'motion',
    name: `${P}-close`,
    owner: 'ModalNavigationDrawer',
    member: 'closeMotion',
    file: DRAWER,
    pattern:
      /public fun ModalNavigationDrawer\([\s\S]*?val closeMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'DrawerState.close() (also DismissibleNavigationDrawer): Escape, the scrim, selecting an item in the samples; jumps under reduced motion',
  },
  {
    kind: 'ms',
    name: `${P}-settle-duration`,
    owner: DRAWER,
    member: 'AnchoredDraggableDefaultAnimationSpec',
    file: DRAWER,
    pattern:
      /private val AnchoredDraggableDefaultAnimationSpec = TweenSpec<Float>\(durationMillis = (\d+)\)/d,
    note: 'drag release (AnchoredDraggableState.settle → animateToWithDecay) when the exponential decay does not reach the target; DrawerState captures it at construction, so ModalNavigationDrawer’s later anchoredDraggableMotionSpec (DefaultSpatial) is not read; jumps under reduced motion',
  },
  {
    kind: 'ratio',
    name: `${P}-positional-threshold`,
    owner: DRAWER,
    member: 'DrawerPositionalThreshold',
    file: DRAWER,
    pattern: /private val DrawerPositionalThreshold = ([\d.]+)f/d,
    note: 'a slow drag release settles on the anchor it passed this fraction of the sheet width towards',
  },
  {
    kind: 'velocity',
    name: `${P}-velocity-threshold`,
    owner: DRAWER,
    member: 'DrawerVelocityThreshold',
    file: DRAWER,
    pattern: /private val DrawerVelocityThreshold\n\s*get\(\) = (\d+)\.dp/d,
    note: 'dp per second: a faster release settles on the next anchor in its direction',
  },
];

/** Wiring navigation-drawer.css and m3e-motion's DrawerAnimation assume. */
const CHECKS: readonly [string, string, RegExp][] = [
  [
    DRAWER,
    'DismissibleNavigationDrawer opens on DefaultSpatial and closes on FastEffects as the modal drawer',
    /public fun DismissibleNavigationDrawer\([\s\S]*?val openMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.DefaultSpatial\.value\(\)\n\s*val closeMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.FastEffects\.value\(\)/,
  ],
  [
    DRAWER,
    'the modal drawer: open DefaultSpatial / close FastEffects under the upstream TODO',
    new RegExp(
      MOTION_TODO +
        String.raw`\s*val anchoredDraggableMotion: FiniteAnimationSpec<Float> =\n\s*MotionSchemeKeyTokens\.DefaultSpatial\.value\(\)\n\s*val openMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.DefaultSpatial\.value\(\)\n\s*val closeMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.FastEffects\.value\(\)`,
    ),
  ],
  [
    DRAWER,
    'DrawerState passes AnchoredDraggableDefaultAnimationSpec to its AnchoredDraggableState at construction',
    /internal var anchoredDraggableMotionSpec: FiniteAnimationSpec<Float> =\n\s*AnchoredDraggableDefaultAnimationSpec\n[\s\S]*?snapAnimationSpec = anchoredDraggableMotionSpec,\n\s*decayAnimationSpec = AnchoredDraggableDefaults\.DecayAnimationSpec,/,
  ],
  [
    DRAWER,
    'thresholds: positionalThreshold = distance × DrawerPositionalThreshold, velocityThreshold = DrawerVelocityThreshold',
    /positionalThreshold = \{ distance: Float -> distance \* DrawerPositionalThreshold \},\n\s*velocityThreshold = \{ with\(requireDensity\(\)\) \{ DrawerVelocityThreshold\.toPx\(\) \} \},/,
  ],
  [
    DRAWER,
    'the scrim alpha is the open fraction (calculateFraction(minValue, maxValue, offset))',
    /alpha = \{ calculateFraction\(minValue, maxValue, drawerState\.requireOffset\(\)\) \},\n\s*color = scrimColor,/,
  ],
  [
    DRAWER,
    'ModalDrawerSheet: DrawerDefaults.shape, modalContainerColor, ModalDrawerElevation',
    /public fun ModalDrawerSheet\(\n\s*modifier: Modifier = Modifier,\n\s*drawerShape: Shape = DrawerDefaults\.shape,\n\s*drawerContainerColor: Color = DrawerDefaults\.modalContainerColor,\n\s*drawerContentColor: Color = contentColorFor\(drawerContainerColor\),\n\s*drawerTonalElevation: Dp = DrawerDefaults\.ModalDrawerElevation,/,
  ],
  [
    DRAWER,
    'PermanentDrawerSheet: RectangleShape, standardContainerColor',
    /public fun PermanentDrawerSheet\(\n\s*modifier: Modifier = Modifier,\n\s*drawerShape: Shape = RectangleShape,\n\s*drawerContainerColor: Color = DrawerDefaults\.standardContainerColor,/,
  ],
  [
    DRAWER,
    'DrawerSheet: sizeIn(MinimumDrawerWidth, NavigationDrawerTokens.ContainerWidth), fillMaxHeight',
    /val maxWidth = NavigationDrawerTokens\.ContainerWidth[\s\S]*?\.sizeIn\(minWidth = MinimumDrawerWidth, maxWidth = maxWidth\)/,
  ],
  [
    DRAWER,
    'NavigationDrawerItem: ActiveIndicatorShape, heightIn(ActiveIndicatorHeight), fillMaxWidth',
    /shape: Shape = NavigationDrawerTokens\.ActiveIndicatorShape\.value,[\s\S]*?\.heightIn\(min = NavigationDrawerTokens\.ActiveIndicatorHeight\)\n\s*\.fillMaxWidth\(\),/,
  ],
  [
    DRAWER,
    'NavigationDrawerItemDefaults.colors: tokens, transparent unselected container, badge = text color',
    /selectedContainerColor: Color = NavigationDrawerTokens\.ActiveIndicatorColor\.value,\n\s*unselectedContainerColor: Color = Color\.Transparent,\n\s*selectedIconColor: Color = NavigationDrawerTokens\.ActiveIconColor\.value,\n\s*unselectedIconColor: Color = NavigationDrawerTokens\.InactiveIconColor\.value,\n\s*selectedTextColor: Color = NavigationDrawerTokens\.ActiveLabelTextColor\.value,\n\s*unselectedTextColor: Color = NavigationDrawerTokens\.InactiveLabelTextColor\.value,\n\s*selectedBadgeColor: Color = selectedTextColor,\n\s*unselectedBadgeColor: Color = unselectedTextColor,/,
  ],
  [
    SPEC,
    'TweenSpec defaults to FastOutSlowInEasing',
    /public class TweenSpec<T>\(\n\s*public val durationMillis: Int = DefaultDurationMillis,\n\s*public val delay: Int = 0,\n\s*public val easing: Easing = FastOutSlowInEasing,/,
  ],
];

/** The m3.material.io values (Compose has no drawer headline, section label or divider). */
const M3IO: readonly NavigationDrawerDefault[] = [
  {
    name: `${P}-headline-height`,
    value: '56px',
    js: 56,
    raw: '56dp row (measured)',
    owner: 'm3.material.io',
    member: 'Specs › headline “Mail”, section label “Labels”',
    cite: NAVIGATION_DRAWER_M3IO_SPECS,
    note: 'TODO(verify) SOURCES #33: measured from the redlines (unlabelled): the first item starts 68dp below the sheet (12dp + a 56dp headline row, text centred); a section label is a 56dp row below its divider',
  },
  {
    name: `${P}-headline-padding-inline`,
    value: '28px',
    js: 28,
    raw: '28dp (= 12dp item padding + 16dp item start padding)',
    owner: 'm3.material.io',
    member: 'Specs › Measurements “Left padding 28dp / Right padding 28dp”',
    cite: NAVIGATION_DRAWER_M3IO_SPECS,
    note: 'headline and section label text start, aligned with the item icons',
  },
  {
    name: `${P}-divider-inset`,
    value: '28px',
    js: 28,
    raw: '28dp (labelled “28” both sides)',
    owner: 'm3.material.io',
    member: 'Specs › Padding and margins (divider)',
    cite: NAVIGATION_DRAWER_M3IO_SPECS,
    note: 'the divider follows the last item of a group without a gap; the Guidelines text mentions full-width dividers (SOURCES #33)',
  },
  {
    name: `${P}-divider-color`,
    value: 'var(--m3e-sys-color-outline-variant)',
    js: 'var(--m3e-sys-color-outline-variant)',
    raw: 'md.comp.divider.color = md.sys.color.outline-variant',
    owner: 'm3.material.io',
    member:
      'md.comp.divider.color (replaces the deprecated md.comp.navigation-drawer.divider.color)',
    cite: NAVIGATION_DRAWER_M3IO_TOKENS,
    note: 'rev 7989 deprecates the drawer divider token for the standalone divider token (Divider TOKEN_TABLE.77f7657eb270e53d); the drawer Specs point to the divider specs [1.8.0]; androidx DividerTokens.Color = OutlineVariant (DividerTokens.kt L24–25); SOURCES #33. Thickness: DividerTokens.Thickness (divider.css)',
  },
];

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** `ScrimTokens.ContainerColor` / `ContainerOpacity` resolved in the vendored ScrimTokens.kt. */
function scrim(
  tokens: Readonly<Record<string, string>>,
  ref: string,
): [string, number | string, string] {
  const text = normalize(tokens['ScrimTokens.kt'], 'ScrimTokens.kt');
  if (ref === 'ScrimTokens.ContainerColor') {
    const role = /val ContainerColor: ColorToken\n\s*get\(\) = ColorSchemeKeyTokens\.(\w+)/.exec(
      text,
    )?.[1];
    if (role === undefined) throw new Error('ScrimTokens.kt: ContainerColor not found');
    const value = `var(--m3e-sys-color-${kebabName(role)})`;
    return [value, value, `${ref} = ColorSchemeKeyTokens.${role}`];
  }
  const opacity = /const val ContainerOpacity = ([\d.]+)f/.exec(text)?.[1];
  if (opacity === undefined) throw new Error('ScrimTokens.kt: ContainerOpacity not found');
  return [String(Number(opacity)), Number(opacity), `${ref} = ${opacity}f`];
}

/**
 * `sources`: vendored Material3 / samples / animation-core files by name; `tokens`: the vendored
 * token files by name (ScrimTokens); `easingKt`: animation-core Easing.kt (FastOutSlowInEasing).
 */
export function extractNavigationDrawerDefaults(
  sources: Readonly<Record<string, string>>,
  tokens: Readonly<Record<string, string>>,
  easingKt: string,
): NavigationDrawerDefault[] {
  const texts = Object.fromEntries(
    NAVIGATION_DRAWER_DEFAULTS_SOURCES.map((file) => [file, normalize(sources[file], file)]),
  );
  for (const [file, what, pattern] of CHECKS) {
    if (!pattern.test(texts[file]!)) throw new Error(`${file}: ${what} (changed upstream?)`);
  }
  const out = RULES.flatMap((rule): NavigationDrawerDefault[] => {
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
      case 'zero':
        return [{ ...base, value: '0px', js: 0, raw: captured }];
      case 'ratio':
        return [
          { ...base, value: String(Number(captured)), js: Number(captured), raw: `${captured}f` },
        ];
      case 'velocity':
        return [
          { ...base, value: String(Number(captured)), js: Number(captured), raw: `${captured}.dp` },
        ];
      case 'ms':
        return [
          {
            ...base,
            value: `${captured}ms`,
            js: Number(captured),
            raw: `TweenSpec<Float>(durationMillis = ${captured})`,
          },
        ];
      case 'elevation': {
        const level = kebabName(captured);
        return [
          {
            ...base,
            value: `var(--m3e-sys-elevation-${level})`,
            js: `var(--m3e-sys-elevation-${level})`,
            raw: `ElevationTokens.${captured}`,
          },
        ];
      }
      case 'ref': {
        const [value, js, raw] = scrim(tokens, captured);
        return [{ ...base, value, js, raw }];
      }
      case 'type': {
        // `typography.bodyLarge` is TypographyKeyTokens.BodyLarge.
        const style = kebabName(captured.charAt(0).toUpperCase() + captured.slice(1));
        return TYPE_FIELDS.map((field) => ({
          ...base,
          name: `${rule.name}-${field}`,
          value: `var(--m3e-sys-typescale-${style}-${field})`,
          js: `var(--m3e-sys-typescale-${style}-${field})`,
          raw: `typography.${captured}`,
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
    }
  });

  // The settle tween's easing: TweenSpec's default, FastOutSlowInEasing (animation-core).
  const spec = texts[SPEC]!;
  const easingAt = /public val easing: Easing = (FastOutSlowInEasing),/d.exec(spec);
  const easing = normalize(easingKt, 'Easing.kt');
  const curve = /public val FastOutSlowInEasing: Easing = CubicBezierEasing\(([^)]*)\)/d.exec(
    easing,
  );
  if (!easingAt || !curve) throw new Error('FastOutSlowInEasing not found');
  const points = curve[1]!.split(',').map((p) => Number.parseFloat(p.trim().replace(/f$/, '')));
  const value = `cubic-bezier(${points.map(String).join(', ')})`;
  out.push({
    name: `${P}-settle-easing`,
    value,
    js: value,
    raw: `FastOutSlowInEasing = CubicBezierEasing(${curve[1]!})`,
    owner: 'TweenSpec',
    member: 'easing',
    file: SPEC,
    line: spec.slice(0, easingAt.indices![1]![0]).split('\n').length,
    note: 'the default of TweenSpec (AnchoredDraggableDefaultAnimationSpec sets none); curve: Easing.kt',
  });
  return [...out, ...M3IO];
}
