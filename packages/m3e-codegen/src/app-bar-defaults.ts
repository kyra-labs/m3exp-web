// Values Compose's AppBar.kt renders for the top app bars that are not in AppBar*Tokens:
// - the private layout literals at the end of AppBar.kt: TopAppBarHorizontalPadding pads the
//   navigation icon (start), the title (both sides) and the actions (end); TopAppBarTitleInset is
//   the minimum title start space when there is no navigation icon (16.dp - TopAppBarHorizontalPadding);
//   MediumTitleBottomPadding / LargeTitleBottomPadding place the expanded title's last baseline
//   above the bottom of a two-rows bar (MediumFlexibleTopAppBar / LargeFlexibleTopAppBar);
//   the public TwoRowsTopAppBar passes 0.dp;
// - the TopAppBarDefaults heights (token references): expanded height of the single-row bars,
//   collapsed and expanded (with / without subtitle) heights of the medium / large flexible bars,
//   and the defaults the public TwoRowsTopAppBar falls back to;
// - TopAppBarDefaults.snapAnimationSpec (the settle spring of enterAlways / exitUntilCollapsed);
// - the two easings the two-rows bar applies to its collapsed fraction: TopTitleAlphaEasing (the
//   collapsed title's alpha) and FastOutLinearInEasing (TopAppBarColors.containerColor). m3e-motion
//   app-bar-scroll.ts ports the math; these variables record the provenance (PARITY.md) and the
//   generator test checks the port's control points against them.
// Each value is read with a targeted regex and cited by line. The checks below throw when the
// variants stop passing the token styles / paddings the CSS assumes (top-app-bar.css).
import { kebabName } from './names.js';

export interface AppBarDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts (dp number, or the CSS string). */
  js: number | string;
  /** Source expression as written upstream (resolved). */
  raw: string;
  owner: string;
  member: string;
  /** `AppBar.kt` or animation-core `Easing.kt`. */
  file: string;
  line: number;
  note?: string;
}

const FILE = 'AppBar.kt';
const EASING_FILE = 'Easing.kt';
const P = '--m3e-comp-top-app-bar';
const DEFAULTS = 'TopAppBarDefaults';
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;

/**
 * Reduced motion (project policy, as the floating toolbar): Compose snaps a partly collapsed bar
 * on the default *effects* spring, which the motion policy keeps animating, but the snap moves
 * geometry, so it jumps under `prefers-reduced-motion`. Scroll-linked motion follows the scroll.
 */
export const TOP_APP_BAR_REDUCED_MOTION = [`${P}-snap-duration: 0ms;`];

type Kind = 'dp' | 'dp-minus' | 'token' | 'motion' | 'easing';

interface Rule {
  kind: Kind;
  name: string;
  owner: string;
  member: string;
  file: string;
  /** First capture group: dp literal, `<a>.dp - <b>`, token member, motion key, bezier points. */
  pattern: RegExp;
  note?: string;
}

const height = (name: string, member: string, note?: string, multiline = false): Rule => ({
  kind: 'token',
  name: `${P}-${name}`,
  owner: DEFAULTS,
  member,
  file: FILE,
  pattern: new RegExp(
    `public val ${member}: Dp =${multiline ? '\\n\\s*' : ' '}(AppBar\\w+Tokens\\.\\w+)`,
    'd',
  ),
  ...(note === undefined ? {} : { note }),
});

/** The public TwoRowsTopAppBar's fallback when a height is Dp.Unspecified (L956–973). */
const twoRowsDefault = (name: string, member: string, pattern: string, note: string): Rule => ({
  kind: 'token',
  name: `${P}-two-rows-${name}`,
  owner: 'TwoRowsTopAppBar',
  member,
  file: FILE,
  pattern: new RegExp(pattern, 'd'),
  note,
});

const RULES: readonly Rule[] = [
  {
    kind: 'dp',
    name: `${P}-horizontal-padding`,
    owner: FILE,
    member: 'TopAppBarHorizontalPadding',
    file: FILE,
    pattern: /private val TopAppBarHorizontalPadding\n\s*get\(\) = (\d+)\.dp/d,
  },
  {
    kind: 'dp-minus',
    name: `${P}-title-inset`,
    owner: FILE,
    member: 'TopAppBarTitleInset',
    file: FILE,
    pattern: /private val TopAppBarTitleInset = (\d+\.dp - TopAppBarHorizontalPadding)/d,
    note: '16.dp - TopAppBarHorizontalPadding',
  },
  height(
    'expanded-height',
    'TopAppBarExpandedHeight',
    'TopAppBar and CenterAlignedTopAppBar height',
  ),
  height('medium-collapsed-height', 'MediumAppBarCollapsedHeight', 'MediumFlexibleTopAppBar too'),
  height(
    'medium-flexible-expanded-height',
    'MediumFlexibleAppBarWithoutSubtitleExpandedHeight',
    'MediumFlexibleTopAppBar without a subtitle',
    true,
  ),
  height(
    'medium-flexible-with-subtitle-expanded-height',
    'MediumFlexibleAppBarWithSubtitleExpandedHeight',
    'MediumFlexibleTopAppBar with a subtitle',
    true,
  ),
  height('large-collapsed-height', 'LargeAppBarCollapsedHeight', 'LargeFlexibleTopAppBar too'),
  height(
    'large-flexible-expanded-height',
    'LargeFlexibleAppBarWithoutSubtitleExpandedHeight',
    'LargeFlexibleTopAppBar without a subtitle',
    true,
  ),
  height(
    'large-flexible-with-subtitle-expanded-height',
    'LargeFlexibleAppBarWithSubtitleExpandedHeight',
    'LargeFlexibleTopAppBar with a subtitle',
    true,
  ),
  twoRowsDefault(
    'collapsed-height',
    'collapsedHeight',
    '\\/\\/ Default to the medium app-bar collapsed height\\n\\s*TopAppBarDefaults\\.(MediumAppBarCollapsedHeight)',
    'default when collapsedHeight is Dp.Unspecified',
  ),
  twoRowsDefault(
    'expanded-height',
    'expandedHeight',
    '\\/\\/ Default to the medium app-bar expanded height\\n\\s*if \\(subtitle != null\\) \\{\\n\\s*TopAppBarDefaults\\.\\w+\\n\\s*\\} else \\{\\n\\s*TopAppBarDefaults\\.(MediumFlexibleAppBarWithoutSubtitleExpandedHeight)',
    'default without a subtitle when expandedHeight is Dp.Unspecified',
  ),
  twoRowsDefault(
    'with-subtitle-expanded-height',
    'expandedHeight',
    '\\/\\/ Default to the medium app-bar expanded height\\n\\s*if \\(subtitle != null\\) \\{\\n\\s*TopAppBarDefaults\\.(MediumFlexibleAppBarWithSubtitleExpandedHeight)',
    'default with a subtitle when expandedHeight is Dp.Unspecified',
  ),
  {
    kind: 'dp',
    name: `${P}-medium-title-bottom-padding`,
    owner: FILE,
    member: 'MediumTitleBottomPadding',
    file: FILE,
    pattern: /private val MediumTitleBottomPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'MediumFlexibleTopAppBar: from the expanded title’s last baseline to the bottom, reduced when the title does not fit (TopAppBarMeasurePolicy)',
  },
  {
    kind: 'dp',
    name: `${P}-large-title-bottom-padding`,
    owner: FILE,
    member: 'LargeTitleBottomPadding',
    file: FILE,
    pattern: /private val LargeTitleBottomPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'LargeFlexibleTopAppBar: from the expanded title’s last baseline to the bottom, reduced when the title does not fit (TopAppBarMeasurePolicy)',
  },
  {
    kind: 'dp',
    name: `${P}-two-rows-title-bottom-padding`,
    owner: 'TwoRowsTopAppBar',
    member: 'titleBottomPadding',
    file: FILE,
    pattern:
      /TwoRowsTopAppBar\(\n\s*title = \{ title\(true\) \},\n(?:.*\n){2}\s*titleBottomPadding = (\d+)\.dp,/d,
    note: 'the public TwoRowsTopAppBar: the expanded title sits on the bottom edge (padding is the caller’s)',
  },
  {
    kind: 'motion',
    name: `${P}-snap`,
    owner: DEFAULTS,
    member: 'snapAnimationSpec',
    file: FILE,
    pattern:
      /public val snapAnimationSpec: AnimationSpec<Float>\n\s*@Composable get\(\) = MotionSchemeKeyTokens\.(\w+)\.value\(\)\n\n\s*\/\*\*\n\s*\* Default \[DecayAnimationSpec\] that defines how to fling the top app bar/d,
    note: 'enterAlways / exitUntilCollapsed: settles a partly collapsed bar to expanded (collapsed fraction < 0.5) or collapsed (settleAppBar)',
  },
  {
    kind: 'easing',
    name: `${P}-top-title-alpha-easing`,
    owner: FILE,
    member: 'TopTitleAlphaEasing',
    file: FILE,
    pattern: /internal val TopTitleAlphaEasing = CubicBezierEasing\(([^)]*)\)/d,
    note: 'two-rows bars: the collapsed (top row) title alpha = TopTitleAlphaEasing.transform(collapsedFraction); ported in m3e-motion',
  },
  {
    kind: 'easing',
    name: `${P}-container-color-easing`,
    owner: 'Easing',
    member: 'FastOutLinearInEasing',
    file: EASING_FILE,
    pattern: /public val FastOutLinearInEasing: Easing = CubicBezierEasing\(([^)]*)\)/d,
    note: 'TopAppBarColors.containerColor(fraction) lerps by FastOutLinearInEasing (AppBar.kt); two-rows bars pass the collapsed fraction; ported in m3e-motion',
  },
];

/** Upstream wiring the CSS relies on (top-app-bar.css); throws if it changes. */
const CHECKS: readonly [string, RegExp][] = [
  [
    'CenterAlignedTopAppBar: small title style, centered',
    /public fun CenterAlignedTopAppBar\(\n\s*title: @Composable \(\) -> Unit,\n\s*modifier: Modifier = Modifier,\n\s*navigationIcon[\s\S]*?contentPadding: PaddingValues = TopAppBarDefaults\.ContentPadding,\n\): Unit =\n\s*SingleRowTopAppBar\(\n\s*modifier = modifier,\n\s*title = title,\n\s*titleTextStyle = AppBarSmallTokens\.TitleFont\.value,\n\s*subtitle = null,\n\s*subtitleTextStyle = TextStyle\.Default,\n\s*titleHorizontalAlignment = Alignment\.CenterHorizontally,/,
  ],
  [
    'MediumFlexibleTopAppBar: medium flexible / small styles, MediumTitleBottomPadding',
    /public fun MediumFlexibleTopAppBar\([\s\S]*?TwoRowsTopAppBar\(\n\s*modifier = modifier,\n\s*title = title,\n\s*titleTextStyle = AppBarMediumFlexibleTokens\.TitleFont\.value,\n\s*smallTitleTextStyle = AppBarSmallTokens\.TitleFont\.value,\n\s*titleBottomPadding = MediumTitleBottomPadding,\n\s*smallTitle = title,\n\s*subtitle = subtitle \?: \{\},\n\s*subtitleTextStyle = AppBarMediumFlexibleTokens\.SubtitleFont\.value,\n\s*smallSubtitle = subtitle \?: \{\},\n\s*smallSubtitleTextStyle = AppBarSmallTokens\.SubtitleFont\.value,/,
  ],
  [
    'LargeFlexibleTopAppBar: large flexible / small styles, LargeTitleBottomPadding',
    /public fun LargeFlexibleTopAppBar\([\s\S]*?TwoRowsTopAppBar\(\n\s*title = title,\n\s*titleTextStyle = AppBarLargeFlexibleTokens\.TitleFont\.value,\n\s*smallTitleTextStyle = AppBarSmallTokens\.TitleFont\.value,\n\s*titleBottomPadding = LargeTitleBottomPadding,\n\s*smallTitle = title,\n\s*modifier = modifier,\n\s*subtitle = subtitle \?: \{\},\n\s*subtitleTextStyle = AppBarLargeFlexibleTokens\.SubtitleFont\.value,\n\s*smallSubtitle = subtitle \?: \{\},\n\s*smallSubtitleTextStyle = AppBarSmallTokens\.SubtitleFont\.value,/,
  ],
  [
    'TwoRowsTopAppBar: medium flexible / small styles',
    /TwoRowsTopAppBar\(\n\s*title = \{ title\(true\) \},\n\s*titleTextStyle = AppBarMediumFlexibleTokens\.TitleFont\.value,\n\s*smallTitleTextStyle = AppBarSmallTokens\.TitleFont\.value,\n\s*titleBottomPadding = 0\.dp,\n\s*smallTitle = \{ title\(false\) \},\n\s*modifier = modifier,\n\s*subtitle = \{ subtitle\?\.invoke\(true\) \},\n\s*subtitleTextStyle = AppBarMediumFlexibleTokens\.SubtitleFont\.value,\n\s*smallSubtitle = \{ subtitle\?\.invoke\(false\) \},\n\s*smallSubtitleTextStyle = AppBarSmallTokens\.SubtitleFont\.value,/,
  ],
  [
    'MediumFlexibleTopAppBar: subtitle picks the expanded height default',
    /public fun MediumFlexibleTopAppBar\([\s\S]*?expandedHeight: Dp =\n\s*if \(subtitle != null\) \{\n\s*TopAppBarDefaults\.MediumFlexibleAppBarWithSubtitleExpandedHeight\n\s*\} else \{\n\s*TopAppBarDefaults\.MediumFlexibleAppBarWithoutSubtitleExpandedHeight/,
  ],
  [
    'LargeFlexibleTopAppBar: subtitle picks the expanded height default',
    /public fun LargeFlexibleTopAppBar\([\s\S]*?expandedHeight: Dp =\n\s*if \(subtitle != null\) \{\n\s*TopAppBarDefaults\.LargeFlexibleAppBarWithSubtitleExpandedHeight\n\s*\} else \{\n\s*TopAppBarDefaults\.LargeFlexibleAppBarWithoutSubtitleExpandedHeight/,
  ],
  [
    'two-rows container color follows the collapsed fraction',
    /val colorTransitionFraction = \{ scrollBehavior\?\.state\?\.collapsedFraction \?: 0f \}\n\s*val appBarContainerColor = \{ colors\.containerColor\(colorTransitionFraction\(\)\) \}/,
  ],
  [
    'two-rows title alphas and the 0.5 semantics swap',
    /val topTitleAlpha = \{ TopTitleAlphaEasing\.transform\(colorTransitionFraction\(\)\) \}\n\s*val bottomTitleAlpha = \{ 1f - colorTransitionFraction\(\) \}[\s\S]*?derivedStateOf \{ colorTransitionFraction\(\) < 0\.5f \}/,
  ],
  [
    'TopAppBarColors.containerColor lerps by FastOutLinearInEasing',
    /lerp\(\n\s*containerColor,\n\s*scrolledContainerColor,\n\s*FastOutLinearInEasing\.transform\(colorTransitionFraction\),\n\s*\)/,
  ],
  [
    'exitUntilCollapsedScrollBehavior snaps on TopAppBarDefaults.snapAnimationSpec',
    /public fun exitUntilCollapsedScrollBehavior\(\n[\s\S]*?snapAnimationSpec: AnimationSpec<Float>\? = TopAppBarDefaults\.snapAnimationSpec,/,
  ],
];

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** A token file member that is a dp length. */
function resolveDp(
  tokenFiles: readonly { name: string; content: string }[],
  ref: string,
): { dp: number; raw: string } {
  const [object, member] = ref.split('.') as [string, string];
  const file = `${object}.kt`;
  const text = normalize(tokenFiles.find((f) => f.name === file)?.content, file);
  const match = new RegExp(`val ${member}: [\\w.]+\\n\\s*get\\(\\) = ([\\d.]+)\\.dp\\n`).exec(text);
  if (!match) throw new Error(`${file}: ${member} is not a dp token`);
  return { dp: Number(match[1]), raw: `${match[1]!}.dp` };
}

/** `TopAppBarDefaults.<member>` → the token it is declared as. */
function defaultsHeight(text: string, member: string): string {
  const match = new RegExp(`public val ${member}: Dp =\\s*(AppBar\\w+Tokens\\.\\w+)`).exec(text);
  if (!match) throw new Error(`${FILE}: TopAppBarDefaults.${member} not found`);
  return match[1]!;
}

export function extractAppBarDefaults(
  sources: Readonly<Record<string, string>>,
  tokenFiles: readonly { name: string; content: string }[],
  easingKtRaw: string,
): AppBarDefault[] {
  const texts: Record<string, string> = {
    [FILE]: normalize(sources[FILE], FILE),
    [EASING_FILE]: normalize(easingKtRaw, EASING_FILE),
  };
  const appBar = texts[FILE]!;
  for (const [what, pattern] of CHECKS) {
    if (!pattern.test(appBar)) throw new Error(`${FILE}: ${what} (changed upstream?)`);
  }

  return RULES.flatMap((rule): AppBarDefault[] => {
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
    const dp = (value: number, raw: string): AppBarDefault => ({
      ...base,
      value: `${String(value)}px`,
      js: value,
      raw,
    });
    switch (rule.kind) {
      case 'dp':
        return [dp(Number(captured), `${captured}.dp`)];
      case 'dp-minus': {
        const m = /^(\d+)\.dp - TopAppBarHorizontalPadding$/.exec(captured)!;
        const padding = /private val TopAppBarHorizontalPadding\n\s*get\(\) = (\d+)\.dp/.exec(text);
        if (!padding) throw new Error(`${FILE}: TopAppBarHorizontalPadding not found`);
        return [dp(Number(m[1]) - Number(padding[1]), captured)];
      }
      case 'token': {
        // A TopAppBarDefaults member (the two-rows fallbacks name one) or a token directly.
        const ref = captured.includes('Tokens.') ? captured : defaultsHeight(text, captured);
        const t = resolveDp(tokenFiles, ref);
        const via = ref === captured ? '' : `TopAppBarDefaults.${captured} = `;
        return [dp(t.dp, `${via}${ref} = ${t.raw}`)];
      }
      case 'motion':
        return SPRING_FIELDS.map((field) => ({
          ...base,
          name: `${rule.name}-${field}`,
          value: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
          js: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
          raw: `MotionSchemeKeyTokens.${captured}`,
        }));
      case 'easing': {
        const points = captured
          .split(',')
          .map((p) => Number.parseFloat(p.trim().replace(/f$/, '')));
        if (points.length !== 4 || points.some((p) => Number.isNaN(p)))
          throw new Error(`${rule.file}: unexpected CubicBezierEasing(${captured})`);
        const value = `cubic-bezier(${points.map(String).join(', ')})`;
        return [{ ...base, value, js: value, raw: `CubicBezierEasing(${captured})` }];
      }
    }
  });
}
