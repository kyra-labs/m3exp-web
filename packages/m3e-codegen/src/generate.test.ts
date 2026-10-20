// Reference comparisons: values are re-read from the vendored androidx sources with simple,
// independent regexes (not the parser) and compared with what the generator emits.
import { fileURLToPath } from 'node:url';
import {
  ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY,
  BADGE_DOT_LABEL,
  SHEET_BOUNDARY_DAMPENING_ZONE,
  SHEET_POSITIONAL_THRESHOLD,
  SHEET_VELOCITY_THRESHOLD,
  DRAWER_POSITIONAL_THRESHOLD,
  SLIDER_KEY_DIVISIONS,
  SLIDER_PAGE_DIVISOR,
  SLIDER_PAGE_MAX_STEPS,
  DRAWER_SETTLE_MILLIS,
  DRAWER_VELOCITY_THRESHOLD,
  FAST_OUT_LINEAR_IN_EASING,
  SEARCH_BAR_EXPANDED_THRESHOLD,
  SEARCH_DROPDOWN_VISIBLE_PROGRESS,
  TAB_INDICATOR_MIN_WIDTH,
  TOP_TITLE_ALPHA_EASING,
  badgeText,
} from '@kyralabs/m3e-motion';
import { describe, expect, it } from 'vitest';
import { generate } from './generate.js';
import { parseTokenFile } from './kotlin.js';
import { readPin } from './pin.js';
import { readGeneratorInputs } from './inputs.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const inputs = readGeneratorInputs(root, readPin(root));
const { files } = inputs;
const manifest = { commit: inputs.commit };
const output = generate(inputs);
const tokensCss = output.get('tokens.css')!;
const source = (name: string) => files.find((f) => f.name === name)!.content;

/** Reads `--name: value;` declarations from generated CSS. */
const declarations = (css: string) =>
  new Map([...css.matchAll(/^\s*(--[\w-]+): (.+);$/gm)].map((m) => [m[1]!, m[2]!]));
// Main :root block only; the reduced-motion @media block re-declares some variables.
const sys = declarations(tokensCss.slice(0, tokensCss.indexOf('@media')));
const allComponentCss = [...output].filter(([p]) => p.startsWith('components/')).map(([, c]) => c);

describe('vendored sources', () => {
  it('are pinned to SOURCE_PIN', () => {
    expect(manifest.commit).toBe(readPin(root)['androidx_commit']);
    expect(files.length).toBe(120);
  });

  it('every token object is either emitted or explicitly excluded', () => {
    const parity = output.get('PARITY.md')!;
    for (const f of files) {
      const { object } = parseTokenFile(f.content);
      const listed = parity.includes(`\`${object}.`) || parity.includes(`| \`${object}\` |`);
      expect(listed, object).toBe(true);
    }
  });
});

describe('generator', () => {
  it('is deterministic', () => {
    const again = generate({ ...inputs, files: [...files].reverse() });
    expect([...again]).toEqual([...output]);
  });

  it('never emits a variable twice within a rule block', () => {
    for (const [path, css] of output) {
      if (!path.endsWith('.css')) continue;
      // theme.css repeats each role across its light / dark-media / data-theme blocks by design.
      for (const block of css.split(/[{}]/)) {
        const names = [...block.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
        expect(new Set(names).size, path).toBe(names.length);
      }
    }
  });

  it('only references defined sys tokens or color roles from ColorSchemeKeyTokens', () => {
    const roles = new Set(
      [...source('ColorSchemeKeyTokens.kt').matchAll(/val (\w+) = ColorToken/g)].map((m) =>
        m[1]!.replace(/[A-Z]/g, (c, i: number) => (i ? '-' : '') + c.toLowerCase()),
      ),
    );
    // Elevation shadows use the shadow role (Compose DefaultShadowColor; not a ColorScheme key).
    roles.add('shadow');
    const defined = new Set(sys.keys());
    for (const css of [tokensCss, ...allComponentCss]) {
      for (const [, ref] of css.matchAll(/var\((--[\w-]+)\)/g)) {
        const color = /^--m3e-sys-color-(.+)$/.exec(ref!);
        if (color) expect(roles, ref).toContain(color[1]);
        else expect(defined, ref).toContain(ref);
      }
    }
  });
});

describe('reference values (register items 2–6, 12–14)', () => {
  it.each([
    ['StandardMotionTokens.kt', 'standard'],
    ['ExpressiveMotionTokens.kt', 'expressive'],
  ])('%s: all 12 spring constants', (file, scheme) => {
    const constants = [
      ...source(file).matchAll(
        /Spring(Fast|Default|Slow)(Spatial|Effects)(Damping|Stiffness) = ([\d.]+)f/g,
      ),
    ];
    expect(constants).toHaveLength(12);
    for (const [, speed, type, field, value] of constants) {
      const name = `--m3e-sys-motion-spring-${scheme}-${speed!.toLowerCase()}-${type!.toLowerCase()}-${field === 'Damping' ? 'damping-ratio' : 'stiffness'}`;
      expect(Number(sys.get(name)), name).toBe(Number(value));
    }
  });

  it('elevation levels 0–5', () => {
    const levels = [
      ...source('ElevationTokens.kt').matchAll(/Level(\d)[\s\S]*?get\(\) = ([\d.]+)\.dp/g),
    ];
    expect(levels.map(([, l, v]) => [l, Number(v)])).toEqual([
      ['0', 0],
      ['1', 1],
      ['2', 3],
      ['3', 6],
      ['4', 8],
      ['5', 12],
    ]);
    for (const [, level, value] of levels) {
      const css = sys.get(`--m3e-sys-elevation-level${level!}`);
      expect(css).toBe(Number(value) === 0 ? '0' : `${String(Number(value))}px`);
    }
  });

  it('state layer opacities', () => {
    for (const [, state, value] of source('StateTokens.kt').matchAll(
      /(\w+)StateLayerOpacity = ([\d.]+)f/g,
    )) {
      expect(Number(sys.get(`--m3e-sys-state-${state!.toLowerCase()}-state-layer-opacity`))).toBe(
        Number(value),
      );
    }
  });

  it('uniform corner scale', () => {
    for (const [, name, value] of source('ShapeTokens.kt').matchAll(
      /val Corner(\w+) = RoundedCornerShape\(([\d.]+)\.dp\)/g,
    )) {
      const kebab = name!.replace(/[A-Z]/g, (c, i: number) => (i ? '-' : '') + c.toLowerCase());
      expect(sys.get(`--m3e-sys-shape-corner-${kebab}`)).toBe(`${String(Number(value))}px`);
    }
    expect(sys.get('--m3e-sys-shape-corner-none')).toBe('0');
    expect(sys.get('--m3e-sys-shape-corner-full')).toBe('calc(infinity * 1px)');
  });

  it('typescale: every size, line height and tracking (sp → rem)', () => {
    const fields = [
      ...source('TypeScaleTokens.kt').matchAll(
        /val (\w+?)(LineHeight|Size|Tracking):[^\n]*\n\s*get\(\) = (-?[\d.]+)\.sp/g,
      ),
    ];
    expect(fields).toHaveLength(30 * 3);
    for (const [, role, field, value] of fields) {
      const kebab = role!.replace(/[A-Z]/g, (c, i: number) => (i ? '-' : '') + c.toLowerCase());
      const css = sys.get(
        `--m3e-sys-typescale-${kebab}-${field === 'LineHeight' ? 'line-height' : field!.toLowerCase()}`,
      );
      const expected =
        Number(value) === 0 ? '0' : `${String(Number((Number(value) / 16).toFixed(6)))}rem`;
      expect(css, `${role!}${field!}`).toBe(expected);
    }
  });

  it('typescale weights resolve through TypefaceTokens', () => {
    for (const [, role, weight] of source('TypeScaleTokens.kt').matchAll(
      /val (\w+?)Weight:[^\n]*\n\s*get\(\) = TypefaceTokens\.Weight(\w+)/g,
    )) {
      const kebab = role!.replace(/[A-Z]/g, (c, i: number) => (i ? '-' : '') + c.toLowerCase());
      expect(sys.get(`--m3e-sys-typescale-${kebab}-weight`)).toBe(
        `var(--m3e-ref-typeface-weight-${weight!.toLowerCase()})`,
      );
    }
    expect(sys.get('--m3e-ref-typeface-weight-regular')).toBe('400');
    expect(sys.get('--m3e-ref-typeface-weight-medium')).toBe('500');
    expect(sys.get('--m3e-ref-typeface-weight-bold')).toBe('700');
  });

  it('TypographyTokens maps every style 1:1 onto TypeScaleTokens (why it is not emitted)', () => {
    const typography = parseTokenFile(source('TypographyTokens.kt'));
    const styles = typography.members.filter((m) => m.expr.kind === 'textStyle');
    expect(styles).toHaveLength(30);
    for (const m of styles) {
      if (m.expr.kind !== 'textStyle') continue;
      expect(m.expr.fields).toEqual({
        fontFamily: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}Font` },
        fontWeight: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}Weight` },
        fontSize: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}Size` },
        lineHeight: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}LineHeight` },
        letterSpacing: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}Tracking` },
      });
    }
  });

  it('Compose typeface default is FontFamily.SansSerif; D1 overrides it', () => {
    expect(source('TypefaceTokens.kt')).toMatch(
      /Brand: FontFamily\s+get\(\) = FontFamily\.SansSerif/,
    );
    expect(sys.get('--m3e-ref-typeface-brand')).toBe(
      '"Google Sans Flex", "Google Sans Flex Fallback", system-ui, sans-serif',
    );
  });

  it('scrim opacity', () => {
    expect(source('ScrimTokens.kt')).toContain('ContainerOpacity = 0.32f');
    expect(output.get('components/scrim.css')).toContain(
      '--m3e-comp-scrim-container-opacity: 0.32;',
    );
  });

  it('component disabled opacities come straight from source', () => {
    const css = declarations(output.get('components/filled-button.css')!);
    expect(source('FilledButtonTokens.kt')).toContain('DisabledContainerOpacity = 0.1f');
    expect(css.get('--m3e-comp-filled-button-container-opacity-disabled')).toBe('0.1');
  });
});

describe('supplementary m3.material.io tokens (register items 15–16)', () => {
  it('focus indicator', () => {
    expect(sys.get('--m3e-sys-state-focus-indicator-thickness')).toBe('3px');
    expect(sys.get('--m3e-sys-state-focus-indicator-outer-offset')).toBe('2px');
    expect(sys.get('--m3e-sys-state-focus-indicator-inner-offset')).toBe('-3px');
  });

  it('spacing scale is 8dp-based', () => {
    expect(sys.get('--m3e-sys-space-0')).toBe('0');
    expect(sys.get('--m3e-sys-space-25')).toBe('2px');
    expect(sys.get('--m3e-sys-space-100')).toBe('8px');
    expect(sys.get('--m3e-sys-space-450')).toBe('36px');
    expect(sys.get('--m3e-sys-space-900')).toBe('72px');
  });
});

describe('spring curves (M3: linear() + m3.material.io bezier stand-ins)', () => {
  it('emits the official bezier table verbatim for all 12 springs', async () => {
    const { SPRING_CURVES } = await import('./supplementary.js');
    expect(SPRING_CURVES).toHaveLength(12);
    for (const c of SPRING_CURVES) {
      const tk = c.token.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
      const base = `--m3e-sys-motion-spring-${c.scheme}-${tk}`;
      expect(sys.get(`${base}-bezier`)).toBe(
        `cubic-bezier(${c.bezier.map((n) => String(n)).join(', ')})`,
      );
      expect(sys.get(`${base}-bezier-duration`)).toBe(`${String(c.durationMillis)}ms`);
      expect(sys.get(`${base}-easing`)).toMatch(/^linear\(0, .+, 1\)$/);
      expect(sys.get(`${base}-duration`)).toMatch(/^\d+ms$/);
    }
  });

  it('aliases the active scheme (expressive) for every curve field', () => {
    for (const field of ['easing', 'duration', 'bezier', 'bezier-duration']) {
      expect(sys.get(`--m3e-sys-motion-spring-default-spatial-${field}`)).toBe(
        `var(--m3e-sys-motion-spring-expressive-default-spatial-${field})`,
      );
    }
  });

  it('reduced motion snaps spatial springs and speeds up effects (FOUNDATIONS §4)', () => {
    const media =
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n {2}\}/.exec(tokensCss)?.[1] ?? '';
    for (const scheme of ['standard', 'expressive']) {
      for (const speed of ['fast', 'default', 'slow']) {
        expect(media).toContain(
          `--m3e-sys-motion-spring-${scheme}-${speed}-spatial-duration: 0ms;`,
        );
      }
      expect(media).toContain(
        `--m3e-sys-motion-spring-${scheme}-slow-effects-duration: var(--m3e-sys-motion-spring-${scheme}-fast-effects-duration);`,
      );
      expect(media).not.toContain(`--m3e-sys-motion-spring-${scheme}-fast-effects-duration:`);
    }
  });
});

describe('primitive tokens (M4)', () => {
  it('baseline shadow role is Compose DefaultShadowColor (GraphicsLayerScope.kt)', () => {
    const kt = inputs.graphicsLayerScopeKt.replace(/\r\n/g, '\n');
    expect(kt).toMatch(/public val DefaultShadowColor: Color\n\s*get\(\) = Color\.Black/);
    expect(output.get('theme.css')).toContain('--m3e-sys-color-shadow: #000000;');
  });

  it('elevation shadows follow the Material Web 2.5.0 per-level tables', () => {
    // Independent read of the comment tables: key rows first, then ambient rows.
    const rows = [
      ...inputs.elevationScss.matchAll(/\/\/ level(\d): box-shadow: 0px (\d+)px (\d+)px (\d+)px;/g),
    ];
    expect(rows).toHaveLength(12);
    for (let level = 1; level <= 5; level++) {
      const [, , ky, kb, ks] = rows[level]!;
      const [, , ay, ab, aspread] = rows[level + 6]!;
      const fmt = (v: string) => (v === '0' ? '0' : `${v}px`);
      expect(sys.get(`--m3e-sys-elevation-level${String(level)}-shadow`)).toBe(
        `0 ${fmt(ky!)} ${fmt(kb!)} ${fmt(ks!)} color-mix(in srgb, var(--m3e-sys-color-shadow) 30%, transparent), ` +
          `0 ${fmt(ay!)} ${fmt(ab!)} ${fmt(aspread!)} color-mix(in srgb, var(--m3e-sys-color-shadow) 15%, transparent)`,
      );
    }
    expect(sys.get('--m3e-sys-elevation-level0-shadow')).toBe('none');
    expect(inputs.elevationScss).toMatch(/opacity: 0\.3;[\s\S]*opacity: 0\.15;/);
  });

  it('icon axis defaults are the Material Symbols fvar defaults', () => {
    expect(sys.get('--m3e-ref-typeface-icon-fill')).toBe(String(inputs.iconAxes['FILL']));
    expect(sys.get('--m3e-ref-typeface-icon-grade')).toBe(String(inputs.iconAxes['GRAD']));
    expect(sys.get('--m3e-ref-typeface-icon-optical-size')).toBe(String(inputs.iconAxes['opsz']));
    expect(sys.get('--m3e-ref-typeface-icon-weight')).toBe(String(inputs.iconAxes['wght']));
  });
});

describe('ButtonDefaults tokens (M4 Button)', () => {
  const css = output.get('components/button-defaults.css')!;
  const decl = declarations(css);
  const src = (file: string) => inputs.material3Sources[file]!.replace(/\r\n/g, '\n');

  it.each([
    ['--m3e-comp-button-min-width', 'Button.kt', /MinWidth: Dp = (\d+)\.dp/],
    [
      '--m3e-comp-button-x-small-icon-spacing',
      'Button.kt',
      /ExtraSmallIconSpacing: Dp = (\d+)\.dp/,
    ],
    ['--m3e-comp-button-medium-vertical-padding', 'Button.kt', /MediumVerticalPadding = (\d+)\.dp/],
    ['--m3e-comp-button-large-vertical-padding', 'Button.kt', /LargeVerticalPadding = (\d+)\.dp/],
    [
      '--m3e-comp-toggle-button-small-pressed-shape',
      'ToggleButton.kt',
      /pressedShape: Shape\n\s*@Composable get\(\) = RoundedCornerShape\((\d+)\.dp\)/,
    ],
    [
      '--m3e-comp-minimum-interactive-component-size',
      'InteractiveComponentSize.kt',
      /staticCompositionLocalOf \{\n\s*(\d+)\.dp/,
    ],
  ] as const)('%s', (name, file, pattern) => {
    const value = pattern.exec(src(file))?.[1];
    expect(value).toBeDefined();
    expect(decl.get(name)).toBe(`${value!}px`);
  });

  it('documents why the XS literals differ from ButtonXSmallTokens', () => {
    expect(src('Button.kt')).toContain(
      "// TODO use the value from ButtonXSmallTokens.kt once it's been corrected",
    );
    expect(output.get('PARITY.md')).toContain(
      'upstream TODO: ButtonXSmallTokens.IconLabelSpace (8dp) awaits correction',
    );
  });
});

describe('AssistChipDefaults tokens (M4 assist chip)', () => {
  const decl = declarations(output.get('components/assist-chip-defaults.css')!);
  const chip = inputs.material3Sources['Chip.kt']!.replace(/\r\n/g, '\n');
  const member = (object: string, pattern: RegExp) =>
    pattern.exec(chip.slice(chip.indexOf(`public object ${object} {`)))?.[1];

  it('content padding comes from AssistChipDefaults.ContentPadding', () => {
    const value = member(
      'AssistChipDefaults',
      /ContentPadding: PaddingValues = PaddingValues\(horizontal = (\d+)\.dp\)/,
    );
    expect(value).toBeDefined();
    expect(decl.get('--m3e-comp-assist-chip-content-padding-horizontal')).toBe(`${value!}px`);
  });

  it('spacing follows the arrangement AssistChip actually uses', () => {
    expect(chip).toContain(
      'private val DefaultHorizontalArrangement = ChipArrangement(SuggestionChipDefaults.HorizontalSpacing)',
    );
    const value = member('SuggestionChipDefaults', /HorizontalSpacing: Dp = (\d+)\.dp/);
    expect(value).toBeDefined();
    expect(decl.get('--m3e-comp-assist-chip-horizontal-spacing')).toBe(`${value!}px`);
  });
});

describe('elevation interaction tweens (M4 card)', () => {
  it('match internal/Elevation.kt and animation-core Easing.kt', () => {
    const decl = declarations(output.get('components/elevation-motion.css')!);
    const elevation = inputs.material3Sources['Elevation.kt']!;
    const duration = (spec: string) =>
      elevation
        .split('\n')
        .find((l) => l.includes(`val ${spec} = TweenSpec<Dp>`))
        ?.match(/durationMillis = (\d+)/)?.[1];
    expect(decl.get('--m3e-comp-elevation-incoming-duration')).toBe(
      `${duration('DefaultIncomingSpec')!}ms`,
    );
    expect(decl.get('--m3e-comp-elevation-outgoing-duration')).toBe(
      `${duration('DefaultOutgoingSpec')!}ms`,
    );
    expect(decl.get('--m3e-comp-elevation-outgoing-duration-hovered')).toBe(
      `${duration('HoveredOutgoingSpec')!}ms`,
    );
    expect(inputs.easingKt).toContain(
      'FastOutSlowInEasing: Easing = CubicBezierEasing(0.4f, 0.0f, 0.2f, 1.0f)',
    );
    expect(decl.get('--m3e-comp-elevation-incoming-easing')).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(elevation).toContain(
      'OutgoingSpecEasing: Easing = CubicBezierEasing(0.40f, 0.00f, 0.60f, 1.00f)',
    );
    expect(decl.get('--m3e-comp-elevation-outgoing-easing')).toBe('cubic-bezier(0.4, 0, 0.6, 1)');
  });
});

describe('loading indicator choreography (M4 loading indicator)', () => {
  it('matches the literals in LoadingIndicator.kt', () => {
    const decl = declarations(output.get('components/loading-indicator-motion.css')!);
    const kt = inputs.material3Sources['LoadingIndicator.kt']!.replace(/\r\n/g, '\n');
    expect(kt).toContain('private const val GlobalRotationDurationMillis = 4666\n');
    expect(kt).toContain('private const val MorphIntervalMillis = 650L\n');
    expect(kt).toContain(
      'spring(dampingRatio = 0.6f, stiffness = 200f, visibilityThreshold = 0.1f)',
    );
    expect(decl.get('--m3e-comp-loading-indicator-morph-interval')).toBe('650ms');
    expect(decl.get('--m3e-comp-loading-indicator-rotation-duration')).toBe('4666ms');
    expect(decl.get('--m3e-comp-loading-indicator-morph-spring-damping-ratio')).toBe('0.6');
    expect(decl.get('--m3e-comp-loading-indicator-morph-spring-stiffness')).toBe('200');
    expect(decl.get('--m3e-comp-loading-indicator-morph-spring-visibility-threshold')).toBe('0.1');
  });
});

describe('navigation layout literals (M4 navigation bar + rail)', () => {
  const decl = declarations(output.get('components/navigation-defaults.css')!);
  const src = (file: string) => inputs.material3Sources[file]!.replace(/\r\n/g, '\n');
  const getter = (file: string, member: string) =>
    new RegExp(`val ${member}(?:: Dp)?\\n\\s*get\\(\\) = (\\d+)\\.dp`).exec(src(file))?.[1];

  it.each([
    [
      '--m3e-comp-short-navigation-bar-item-indicator-to-label-padding',
      'ShortNavigationBar.kt',
      'TopIconIndicatorToLabelPadding',
    ],
    [
      '--m3e-comp-wide-navigation-rail-item-horizontal-padding',
      'WideNavigationRail.kt',
      'WNRItemHorizontalPadding',
    ],
    [
      '--m3e-comp-navigation-bar-item-horizontal-padding',
      'NavigationBar.kt',
      'NavigationBarItemHorizontalPadding',
    ],
    [
      '--m3e-comp-navigation-bar-indicator-to-label-padding',
      'NavigationBar.kt',
      'NavigationBarIndicatorToLabelPadding',
    ],
    [
      '--m3e-comp-navigation-rail-vertical-padding',
      'NavigationRail.kt',
      'NavigationRailVerticalPadding',
    ],
    [
      '--m3e-comp-navigation-rail-header-padding',
      'NavigationRail.kt',
      'NavigationRailHeaderPadding',
    ],
    [
      '--m3e-comp-navigation-rail-item-vertical-padding',
      'NavigationRail.kt',
      'NavigationRailItemVerticalPadding',
    ],
  ] as const)('%s', (name, file, member) => {
    const value = getter(file, member);
    expect(value).toBeDefined();
    expect(decl.get(name)).toBe(`${value!}px`);
  });

  it('evaluates the Centered arrangement padding for 1..6 items', () => {
    const kt = src('ShortNavigationBar.kt');
    expect(kt).toContain('if (itemsCount > 6) return 0');
    expect(kt).toContain('val paddingPercentage = ((100 - 10 * (itemsCount + 3)) / 2f) / 100');
    expect(kt).toContain('val itemMinWidth = (width - (barHorizontalPadding * 2)) / itemsCount');
    const pct = (v: number) => `${String(Math.round(v * 1e4) / 1e4)}%`;
    for (let n = 1; n <= 6; n++) {
      const padding = (100 - 10 * (n + 3)) / 2;
      expect(decl.get(`--m3e-comp-short-navigation-bar-centered-padding-${String(n)}`)).toBe(
        pct(padding),
      );
      expect(decl.get(`--m3e-comp-short-navigation-bar-centered-item-min-width-${String(n)}`)).toBe(
        pct((100 - 2 * padding) / n),
      );
      expect(decl.get(`--m3e-comp-short-navigation-bar-centered-item-max-width-${String(n)}`)).toBe(
        pct(100 / n),
      );
    }
    expect(decl.has('--m3e-comp-short-navigation-bar-centered-padding-7')).toBe(false);
  });
});

describe('animated / modal wide navigation rail values (M7)', () => {
  const decl = declarations(output.get('components/navigation-defaults.css')!);
  const src = (file: string) => inputs.material3Sources[file]!.replace(/\r\n/g, '\n');
  const spring = (name: string, key: string) => {
    for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
      expect(decl.get(`${name}-${field}`), `${name}-${field}`).toBe(
        `var(--m3e-sys-motion-spring-${key}-${field})`,
      );
    }
  };

  it('reads the springs WideNavigationRail.kt, NavigationItem.kt and the state use', () => {
    const rail = src('WideNavigationRail.kt');
    expect(rail).toContain('val animationSpec = MotionSchemeKeyTokens.DefaultSpatial.value<Dp>()');
    expect(rail).toContain(
      'val modalAnimationSpec = MotionSchemeKeyTokens.FastSpatial.value<Dp>()',
    );
    expect(rail).toContain(
      'val modalStateAnimationSpec = MotionSchemeKeyTokens.DefaultSpatial.value<Float>()',
    );
    // The modal window shows while positionProgress > 0 and the rail expands from 0.3.
    expect(rail).toContain(
      'val modalExpanded: Boolean by remember { derivedStateOf { positionProgress.value >= 0.3f } }',
    );
    spring('--m3e-comp-wide-navigation-rail-width', 'default-spatial');
    spring('--m3e-comp-wide-navigation-rail-modal-width', 'fast-spatial');
    spring('--m3e-comp-wide-navigation-rail-icon-position', 'default-spatial');
    spring('--m3e-comp-wide-navigation-rail-label-color', 'default-effects');
    spring('--m3e-comp-wide-navigation-rail-state', 'default-spatial');
    spring('--m3e-comp-modal-wide-navigation-rail-position', 'default-effects');
    spring('--m3e-comp-modal-wide-navigation-rail-scrim', 'default-effects');
    spring('--m3e-comp-modal-wide-navigation-rail-slide', 'default-spatial');
  });

  it('resolves the modal colors, shape and header padding default', () => {
    expect(decl.get('--m3e-comp-modal-wide-navigation-rail-container-color')).toBe(
      'var(--m3e-sys-color-surface-container)',
    );
    expect(decl.get('--m3e-comp-modal-wide-navigation-rail-container-shape')).toBe(
      'var(--m3e-sys-shape-corner-large)',
    );
    expect(decl.get('--m3e-comp-modal-wide-navigation-rail-scrim-color')).toBe(
      'var(--m3e-sys-color-scrim)',
    );
    expect(decl.get('--m3e-comp-modal-wide-navigation-rail-scrim-opacity')).toBe('0.32');
    expect(decl.get('--m3e-comp-modal-wide-navigation-rail-expanded-header-top-padding')).toBe(
      '0px',
    );
  });
});

describe('navigation drawer values (M7)', () => {
  const css = output.get('components/navigation-drawer-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const drawer = inputs.material3Sources['NavigationDrawer.kt']!.replace(/\r\n/g, '\n');
  const spring = (name: string, key: string) => {
    for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
      expect(decl.get(`${name}-${field}`), `${name}-${field}`).toBe(
        `var(--m3e-sys-motion-spring-${key}-${field})`,
      );
    }
  };

  it('item and sheet literals come from NavigationDrawer.kt and the samples', () => {
    expect(drawer).toContain('Modifier.padding(start = 16.dp, end = 24.dp)');
    expect(drawer).toContain('PaddingValues(horizontal = 12.dp)');
    expect(drawer).toMatch(/private val MinimumDrawerWidth\n\s*get\(\) = 240\.dp/);
    expect(decl.get('--m3e-comp-navigation-drawer-min-width')).toBe('240px');
    expect(decl.get('--m3e-comp-navigation-drawer-item-padding-start')).toBe('16px');
    expect(decl.get('--m3e-comp-navigation-drawer-item-padding-end')).toBe('24px');
    expect(decl.get('--m3e-comp-navigation-drawer-item-icon-label-space')).toBe('12px');
    expect(decl.get('--m3e-comp-navigation-drawer-item-label-badge-space')).toBe('12px');
    expect(decl.get('--m3e-comp-navigation-drawer-item-horizontal-padding')).toBe('12px');
    expect(decl.get('--m3e-comp-navigation-drawer-top-padding')).toBe('12px');
    expect(decl.get('--m3e-comp-navigation-drawer-standard-container-shape')).toBe('0px');
  });

  it('the item label inherits MaterialTheme’s bodyLarge (LabelTextFont is not read)', () => {
    expect(drawer).not.toContain('LabelTextFont');
    expect(inputs.material3Sources['MaterialTheme.kt']).toContain(
      'ProvideTextStyle(value = typography.bodyLarge, content = content)',
    );
    expect(decl.get('--m3e-comp-navigation-drawer-item-label-text-size')).toBe(
      'var(--m3e-sys-typescale-body-large-size)',
    );
  });

  it('scrim, modal elevation and motion', () => {
    expect(decl.get('--m3e-comp-navigation-drawer-scrim-color')).toBe('var(--m3e-sys-color-scrim)');
    expect(decl.get('--m3e-comp-navigation-drawer-scrim-opacity')).toBe('0.32');
    expect(decl.get('--m3e-comp-navigation-drawer-modal-elevation')).toBe(
      'var(--m3e-sys-elevation-level0)',
    );
    spring('--m3e-comp-navigation-drawer-open', 'default-spatial');
    spring('--m3e-comp-navigation-drawer-close', 'fast-effects');
    expect(decl.get('--m3e-comp-navigation-drawer-settle-duration')).toBe('256ms');
    expect(decl.get('--m3e-comp-navigation-drawer-settle-easing')).toBe(
      'cubic-bezier(0.4, 0, 0.2, 1)',
    );
    // Close and settle move the sheet: both jump under reduced motion.
    const reduced = declarations(css.slice(css.indexOf('@media')));
    expect(reduced.get('--m3e-comp-navigation-drawer-close-duration')).toBe('0ms');
    expect(reduced.get('--m3e-comp-navigation-drawer-settle-duration')).toBe('0ms');
  });

  it('m3e-motion’s drawer port uses the generated thresholds and settle spec', () => {
    expect(decl.get('--m3e-comp-navigation-drawer-positional-threshold')).toBe(
      String(DRAWER_POSITIONAL_THRESHOLD),
    );
    expect(decl.get('--m3e-comp-navigation-drawer-velocity-threshold')).toBe(
      String(DRAWER_VELOCITY_THRESHOLD),
    );
    expect(decl.get('--m3e-comp-navigation-drawer-settle-duration')).toBe(
      `${String(DRAWER_SETTLE_MILLIS)}ms`,
    );
  });

  it('m3.material.io values carry their citation', () => {
    const parity = output.get('PARITY.md')!;
    expect(parity).toMatch(/--m3e-comp-navigation-drawer-divider-inset.*28px/);
    expect(parity).toContain('TOKEN_TABLE.376969f91547be8e.json');
    expect(decl.get('--m3e-comp-navigation-drawer-headline-padding-inline')).toBe('28px');
  });
});

describe('tabs values (M7)', () => {
  const css = output.get('components/tabs-defaults.css')!;
  const decl = declarations(css);
  const row = inputs.material3Sources['TabRow.kt']!.replace(/\r\n/g, '\n');
  const tab = inputs.material3Sources['Tab.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-tabs-${name}`);

  it('TabRowDefaults and Tab.kt literals', () => {
    expect(row).toContain('public val ScrollableTabRowMinTabWidth: Dp = 90.dp');
    expect(row).toContain('public val ScrollableTabRowEdgeStartPadding: Dp = 52.dp');
    expect(t('scrollable-min-tab-width')).toBe('90px');
    expect(t('scrollable-edge-padding')).toBe('52px');
    expect(t('indicator-min-width')).toBe('24px');
    expect(tab).toMatch(/private val LargeTabHeight\n\s*get\(\) = 72\.dp/);
    expect(t('large-tab-height')).toBe('72px');
    expect(t('small-tab-height')).toBe('48px');
    expect(t('horizontal-text-padding')).toBe('16px');
    expect(t('single-line-text-baseline-with-icon')).toBe('14px');
    expect(t('icon-distance-from-baseline')).toBe('20px');
    expect(t('leading-icon-label-space')).toBe('8px');
    expect(t('label-max-lines')).toBe('2');
    // m3.material.io Tabs › Specs: "Overlap of badge on stacked icon 6dp" (D20 (1)).
    expect(t('stacked-badge-overlap')).toBe('6px');
    expect(output.get('PARITY.md')).toMatch(
      /f37f47ba-8e67-4f1e-98a3-3bea94879e52\.json\) \| `--m3e-comp-tabs-stacked-badge-overlap` \| `6px`/,
    );
  });

  it('the label baseline position comes from the Google Sans Flex metrics', () => {
    const { ascent, descent, unitsPerEm } = inputs.fontMetrics;
    expect(Number(t('label-baseline-shift'))).toBeCloseTo((ascent + descent) / (2 * unitsPerEm), 4);
    expect(t('label-baseline-shift')).toBe('0.34');
  });

  it('the token the rows render instead of IconAndLabelTextContainerHeight (64dp) is not read', () => {
    expect(source('PrimaryNavigationTabTokens.kt')).toContain('IconAndLabelTextContainerHeight');
    expect(tab).not.toContain('IconAndLabelTextContainerHeight');
    expect(row).not.toContain('SecondaryNavigationTabTokens.DividerColor');
  });

  it('indicators: the secondary one reads the primary tokens and has no shape', () => {
    expect(t('primary-indicator-height')).toBe('3px');
    expect(t('secondary-indicator-height')).toBe(t('primary-indicator-height'));
    expect(t('secondary-indicator-color')).toBe(t('primary-indicator-color'));
    expect(t('secondary-indicator-shape')).toBe('0px');
    expect(t('primary-content-color')).toBe('var(--m3e-sys-color-primary)');
    expect(t('secondary-content-color')).toBe('var(--m3e-sys-color-on-surface)');
    expect(t('divider-color')).toBe('var(--m3e-sys-color-outline-variant)');
    // PARITY.md keeps the token the value comes from.
    expect(output.get('PARITY.md')).toMatch(
      /SecondaryIndicator\(height\).*PrimaryNavigationTabTokens\.ActiveIndicatorHeight/,
    );
  });

  it('springs: indicator and scroll DefaultSpatial; colors DefaultEffects in, FastEffects out', () => {
    const springs: [string, string][] = [
      ['indicator', 'default-spatial'],
      ['scroll', 'default-spatial'],
      ['content-color-in', 'default-effects'],
      ['content-color-out', 'fast-effects'],
    ];
    for (const [name, key] of springs) {
      for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
        expect(t(`${name}-${field}`), `${name}-${field}`).toBe(
          `var(--m3e-sys-motion-spring-${key}-${field})`,
        );
      }
    }
  });

  it('m3e-motion’s minimum indicator width matches the generated one', () => {
    expect(t('indicator-min-width')).toBe(`${String(TAB_INDICATOR_MIN_WIDTH)}px`);
  });
});

describe('checkbox values (M8)', () => {
  const css = output.get('components/checkbox-defaults.css')!;
  const decl = declarations(css);
  const kt = inputs.material3Sources['Checkbox.kt']!.replace(/\r\n/g, '\n');
  const flags = inputs.material3Sources['ComposeMaterial3Flags.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-checkbox-${name}`);

  it('the flag defaults to false upstream; the owner decision emits the flag-on branch (1)', () => {
    expect(flags).toContain('public var isCheckboxStylingFixEnabled: Boolean = false');
    expect(t('styling-fix')).toBe('1');
    expect(output.get('PARITY.md')).toMatch(/--m3e-comp-checkbox-styling-fix.*owner decision/);
  });

  it('both branches: box size, padding, check points (flag off / -styling-fix)', () => {
    expect(kt).toMatch(/private val CheckboxSize\n\s*get\(\) = 20\.dp/);
    expect(t('box-size')).toBe('20px');
    expect(source('CheckboxTokens.kt')).toMatch(
      /val ContainerSize: [\w.]+\n\s*get\(\) = 18\.0\.dp/,
    );
    expect(t('box-size-styling-fix')).toBe('18px');
    expect(t('box-padding')).toBe('2px');
    expect(t('box-padding-styling-fix')).toBe('0px');
    expect(t('box-corner-radius')).toBe('2px');
    expect(t('stroke-width')).toBe('2px');
    expect(kt).toContain('val checkCrossY = if (isCheckboxStylingFixEnabled) 0.65f else 0.7f');
    expect(kt).toContain('val leftX = if (isCheckboxStylingFixEnabled) 0.25f else 0.2f');
    expect(kt).toContain('val rightX = if (isCheckboxStylingFixEnabled) 0.75f else 0.8f');
    const points: [string, string][] = [
      ['check-cross-x', '0.4'],
      ['check-cross-y', '0.7'],
      ['check-cross-y-styling-fix', '0.65'],
      ['check-left-x', '0.2'],
      ['check-left-x-styling-fix', '0.25'],
      ['check-left-y', '0.5'],
      ['check-right-x', '0.8'],
      ['check-right-x-styling-fix', '0.75'],
      ['check-right-y', '0.3'],
      ['check-gravitation-center', '0.5'],
    ];
    for (const [name, value] of points) expect(t(name), name).toBe(value);
  });

  it('colors: defaultCheckboxColors, the disabled checkmark per branch and the ripple', () => {
    expect(t('checkmark-color')).toBe('var(--m3e-sys-color-on-primary)');
    expect(t('checkmark-color-disabled')).toBe('var(--m3e-sys-color-on-primary)');
    expect(t('checkmark-color-disabled-styling-fix')).toBe('var(--m3e-sys-color-surface)');
    expect(t('box-color-checked')).toBe('var(--m3e-sys-color-primary)');
    expect(t('border-color-checked')).toBe('var(--m3e-sys-color-primary)');
    expect(t('border-color-unchecked')).toBe('var(--m3e-sys-color-on-surface-variant)');
    expect(t('box-color-checked-disabled')).toBe('var(--m3e-sys-color-on-surface)');
    expect(t('box-opacity-checked-disabled')).toBe('0.38');
    expect(t('border-color-unchecked-disabled')).toBe('var(--m3e-sys-color-on-surface)');
    expect(t('border-opacity-unchecked-disabled')).toBe('0.38');
    expect(t('state-layer-color')).toBe('currentcolor');
    expect(t('state-layer-color-checked-styling-fix')).toBe(t('box-color-checked'));
    expect(t('state-layer-color-unchecked-styling-fix')).toBe('transparent');
  });

  it('unchecked state layer: the m3.material.io token DB colors (owner decision 2026-10-17)', () => {
    // CheckboxTokens has no state layer colors; the values come from the m3 DB, cited per token.
    expect(source('CheckboxTokens.kt')).not.toMatch(/StateLayerColor/);
    const states: [string, string][] = [
      ['unselected-hover', 'on-surface'],
      ['unselected-focus', 'on-surface'],
      ['unselected-pressed', 'primary'],
      ['error-hover', 'error'],
      ['error-focus', 'error'],
      ['error-pressed', 'error'],
    ];
    const parity = output.get('PARITY.md')!;
    for (const [state, role] of states) {
      expect(t(`state-layer-color-${state}`), state).toBe(`var(--m3e-sys-color-${role})`);
      const token = `md.comp.checkbox.${state.replace('-', '.')}.state-layer.color`;
      expect(parity).toContain(
        `${token} = md.sys.color.${role}\` | m3.material.io Checkbox › Specs (_dsm/content/m3/2026-10-13_06-10-19/c0332583-8417-4b80-a0a1-e283781d31c6.json, updated 2026-08-12), token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.31f16b44fe03b0c0.json`,
      );
    }
  });

  it('motion: check DefaultSpatial, 100ms snap, colors DefaultEffects in / FastEffects out', () => {
    expect(kt).toContain('private const val SnapAnimationDelay = 100');
    expect(t('snap-delay')).toBe('100ms');
    // snap(delayMillis) = one step at the end of the delay; the follow duration is a WebKit
    // repaint workaround, cited as such.
    expect(t('snap-easing')).toBe('steps(1, jump-end)');
    expect(t('follow-duration')).toBe('1ms');
    expect(output.get('PARITY.md')).toMatch(/--m3e-comp-checkbox-follow-duration.*WebKit/);
    const springs: [string, string][] = [
      ['check', 'default-spatial'],
      ['color-in', 'default-effects'],
      ['color-out', 'fast-effects'],
    ];
    for (const [name, key] of springs) {
      for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
        expect(t(`${name}-${field}`), `${name}-${field}`).toBe(
          `var(--m3e-sys-motion-spring-${key}-${field})`,
        );
      }
    }
  });

  it('the CheckboxWithTextSample label: 16dp, bodyLarge', () => {
    expect(t('label-space')).toBe('16px');
    expect(t('label-text-size')).toBe('var(--m3e-sys-typescale-body-large-size)');
  });
});

describe('radio button values (M8)', () => {
  const css = output.get('components/radio-button-defaults.css')!;
  const decl = declarations(css);
  const kt = inputs.material3Sources['RadioButton.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-radio-button-${name}`);

  it('geometry: 2dp padding, 12dp dot (drawn at radius − stroke / 2), 2dp ring', () => {
    expect(kt).toMatch(/private val RadioButtonPadding\n\s*get\(\) = 2\.dp/);
    expect(t('padding')).toBe('2px');
    expect(t('dot-size')).toBe('12px');
    expect(t('stroke-width')).toBe('2px');
    expect(kt).toContain('dotRadius = if (selected) RadioButtonDotSize / 2 else 0.dp');
    expect(kt).toContain(
      'drawCircle(animatedColor, animatedDotRadius.toPx() - strokeWidth / 2, style = Fill)',
    );
    expect(source('RadioButtonTokens.kt')).toMatch(/val IconSize: [\w.]+\n\s*get\(\) = 20\.0\.dp/);
  });

  it('colors: defaultRadioButtonColors; the ripple in the content color, a circle', () => {
    expect(t('color-selected')).toBe('var(--m3e-sys-color-primary)');
    expect(t('color-unselected')).toBe('var(--m3e-sys-color-on-surface-variant)');
    expect(t('color-selected-disabled')).toBe('var(--m3e-sys-color-on-surface)');
    expect(t('opacity-selected-disabled')).toBe('0.38');
    expect(t('color-unselected-disabled')).toBe('var(--m3e-sys-color-on-surface)');
    expect(t('opacity-unselected-disabled')).toBe('0.38');
    expect(t('state-layer-color')).toBe('currentcolor');
    expect(t('state-layer-shape')).toBe('var(--m3e-sys-shape-corner-full)');
  });

  it('motion: the dot on FastSpatial, the color on DefaultEffects', () => {
    const springs: [string, string][] = [
      ['dot', 'fast-spatial'],
      ['color', 'default-effects'],
    ];
    for (const [name, key] of springs) {
      for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
        expect(t(`${name}-${field}`), `${name}-${field}`).toBe(
          `var(--m3e-sys-motion-spring-${key}-${field})`,
        );
      }
    }
  });

  it('the RadioGroupSample rows: 56dp, label 16dp after the radio, bodyLarge', () => {
    expect(t('group-row-height')).toBe('56px');
    expect(t('label-space')).toBe('16px');
    expect(t('label-text-size')).toBe('var(--m3e-sys-typescale-body-large-size)');
    expect(output.get('PARITY.md')).toMatch(
      /RadioButtonSamples\.kt@\w+ L\d+ \| `--m3e-comp-radio-button-label-space`/,
    );
  });
});

describe('switch values (M8)', () => {
  const css = output.get('components/switch-defaults.css')!;
  const decl = declarations(css);
  const kt = inputs.material3Sources['Switch.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-switch-${name}`);
  const tok = (name: string) => declarations(output.get('components/switch.css')!).get(name);

  it('handle: 16dp unchecked, 24dp checked or with an icon, 28dp pressed; 52 × 32dp track', () => {
    expect(t('unchecked-thumb-diameter')).toBe('16px');
    expect(t('thumb-diameter')).toBe('24px');
    expect(t('pressed-thumb-diameter')).toBe('28px');
    expect(tok('--m3e-comp-switch-track-width')).toBe('52px');
    expect(tok('--m3e-comp-switch-track-height')).toBe('32px');
    expect(tok('--m3e-comp-switch-track-outline-width')).toBe('2px');
    expect(tok('--m3e-comp-switch-icon-handle-width')).toBe('24px');
    expect(kt).toContain('hasContent || checked -> ThumbDiameter');
    expect(kt).toContain('private val ThumbPadding = (SwitchHeight - ThumbDiameter) / 2');
    expect(t('icon-size')).toBe('16px');
  });

  it('motion: FastSpatial for offset and size, SnapSpec while pressed; colors not animated', () => {
    for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
      expect(t(`handle-${field}`)).toBe(`var(--m3e-sys-motion-spring-fast-spatial-${field})`);
    }
    expect(t('handle-press-duration')).toBe('0ms');
    expect(kt).toContain('sizeAnim?.animateTo(size, if (isPressed) SnapSpec else animationSpec)');
    expect(kt).toContain('.background(thumbColor, thumbShape)');
  });

  it('colors: defaultSwitchColors; disabled composited over surface', () => {
    expect(t('handle-color-checked')).toBe('var(--m3e-sys-color-on-primary)');
    expect(t('track-color-checked')).toBe('var(--m3e-sys-color-primary)');
    expect(t('track-outline-color-checked')).toBe('transparent');
    expect(t('icon-color-checked')).toBe('var(--m3e-sys-color-on-primary-container)');
    expect(t('handle-color-unchecked')).toBe('var(--m3e-sys-color-outline)');
    expect(t('track-color-unchecked')).toBe('var(--m3e-sys-color-surface-container-highest)');
    expect(t('track-outline-color-unchecked')).toBe('var(--m3e-sys-color-outline)');
    expect(t('icon-color-unchecked')).toBe('var(--m3e-sys-color-surface-container-highest)');
    const over = (color: string, alpha: string) =>
      `color-mix(in srgb, var(--m3e-sys-color-${color}) calc(${alpha} * 100%), var(--m3e-sys-color-surface))`;
    expect(t('handle-color-checked-disabled')).toBe(over('surface', '1'));
    expect(t('track-color-checked-disabled')).toBe(over('on-surface', '0.12'));
    expect(t('track-outline-color-checked-disabled')).toBe('transparent');
    expect(t('icon-color-checked-disabled')).toBe(over('on-surface', '0.38'));
    expect(t('handle-color-unchecked-disabled')).toBe(over('on-surface', '0.38'));
    expect(t('track-color-unchecked-disabled')).toBe(over('surface-container-highest', '0.12'));
    expect(t('track-outline-color-unchecked-disabled')).toBe(over('on-surface', '0.12'));
    expect(t('icon-color-unchecked-disabled')).toBe(over('surface-container-highest', '0.38'));
    expect(t('state-layer-color')).toBe('currentcolor');
  });

  it('the inline label: the expressive ListItem spacing and label style', () => {
    expect(t('label-space')).toBe('12px');
    expect(t('label-text-size')).toBe('var(--m3e-sys-typescale-body-large-size)');
    expect(t('label-text-tracking')).toBe('var(--m3e-sys-typescale-body-large-tracking)');
    expect(output.get('PARITY.md')).toMatch(
      /ListItem\.kt@\w+ L\d+ \| `--m3e-comp-switch-label-space`/,
    );
  });
});

describe('text field values (M8)', () => {
  const decl = declarations(output.get('components/text-field-defaults.css')!);
  const t = (name: string) => decl.get(`--m3e-comp-text-field-${name}`);
  const filled = declarations(output.get('components/filled-text-field.css')!);
  const outlined = declarations(output.get('components/outlined-text-field.css')!);

  it('layout: 16dp padding, 8dp label padding, 12dp icon padding, Above / supporting / affix paddings', () => {
    expect(t('padding')).toBe('16px');
    expect(t('label-vertical-padding')).toBe('8px');
    expect(t('icon-padding')).toBe('calc((48px - 24px) / 2)');
    expect(t('above-label-horizontal-padding')).toBe('4px');
    expect(t('above-label-bottom-padding')).toBe('4px');
    expect(t('supporting-top-padding')).toBe('4px');
    expect(t('affix-padding')).toBe('2px');
    expect(t('min-text-line-height')).toBe('24px');
    expect(t('min-minimized-label-line-height')).toBe('16px');
    expect(t('min-supporting-line-height')).toBe('16px');
    expect(t('cutout-padding')).toBe('4px');
    expect(t('cutout-label-space')).toBe(
      'calc(var(--m3e-sys-typescale-body-small-line-height) / 2)',
    );
  });

  it('min sizes 280 × 56dp; indicator and outline 1dp, 2dp focused (the DB focus 3dp is not rendered)', () => {
    expect(t('min-height')).toBe('56px');
    expect(t('min-width')).toBe('280px');
    expect(t('outlined-min-height')).toBe('56px');
    expect(t('outlined-min-width')).toBe('280px');
    expect(outlined.get('--m3e-comp-outlined-text-field-container-height')).toBe('56px');
    expect(t('indicator-thickness')).toBe('1px');
    expect(t('indicator-thickness-focused')).toBe('2px');
    expect(filled.get('--m3e-comp-filled-text-field-active-indicator-height-focus')).toBe('2px');
    expect(t('outline-thickness')).toBe('1px');
    expect(t('outline-thickness-focused')).toBe('2px');
  });

  it('type: the label lerps bodyLarge → bodySmall; placeholder / affix bodyLarge, supporting bodySmall', () => {
    expect(t('label-expanded-size')).toBe('var(--m3e-sys-typescale-body-large-size)');
    expect(t('label-minimized-size')).toBe('var(--m3e-sys-typescale-body-small-size)');
    expect(t('label-minimized-line-height')).toBe(
      'var(--m3e-sys-typescale-body-small-line-height)',
    );
    expect(t('placeholder-size')).toBe('var(--m3e-sys-typescale-body-large-size)');
    expect(t('affix-size')).toBe('var(--m3e-sys-typescale-body-large-size)');
    expect(t('supporting-size')).toBe('var(--m3e-sys-typescale-body-small-size)');
  });

  it('motion: label FastSpatial, colors FastEffects, placeholder SlowEffects in / FastEffects out', () => {
    const spring = (name: string, key: string) => {
      for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
        expect(t(`${name}-${field}`)).toBe(`var(--m3e-sys-motion-spring-${key}-${field})`);
      }
    };
    spring('label', 'fast-spatial');
    spring('label-color', 'fast-effects');
    spring('placeholder-in', 'slow-effects');
    spring('placeholder-out', 'fast-effects');
    spring('affix-alpha', 'fast-effects');
    spring('indicator-color', 'fast-effects');
    spring('indicator-width', 'fast-spatial');
    spring('container-color', 'fast-effects');
  });

  it('colors: what defaultTextFieldColors / defaultOutlinedTextFieldColors pick', () => {
    const c = (name: string) => `var(--m3e-sys-color-${name})`;
    const alpha = (name: string, a: string) =>
      `color-mix(in srgb, var(--m3e-sys-color-${name}) calc(${a} * 100%), transparent)`;
    // The filled disabled container is ContainerColor, not the token's on-surface 4 %.
    expect(t('filled-container-color-disabled')).toBe(c('surface-container-highest'));
    expect(filled.get('--m3e-comp-filled-text-field-container-opacity-disabled')).toBe('0.04');
    expect(t('filled-indicator-color')).toBe(c('on-surface-variant'));
    expect(t('filled-indicator-color-focused')).toBe(c('primary'));
    expect(t('filled-indicator-color-error')).toBe(c('error'));
    expect(t('filled-indicator-color-disabled')).toBe(alpha('on-surface', '0.38'));
    expect(t('filled-label-color-focused')).toBe(c('primary'));
    expect(t('filled-label-color-error')).toBe(c('error'));
    expect(t('filled-leading-icon-color-error')).toBe(c('on-surface-variant'));
    expect(t('filled-trailing-icon-color-error')).toBe(c('error'));
    expect(t('filled-supporting-color-error')).toBe(c('error'));
    expect(t('filled-prefix-color-disabled')).toBe(alpha('on-surface-variant', '0.38'));
    expect(t('filled-cursor-color')).toBe(c('primary'));
    expect(t('filled-cursor-color-error')).toBe(c('error'));
    expect(t('outlined-container-color')).toBe('transparent');
    expect(t('outlined-indicator-color')).toBe(c('outline'));
    expect(t('outlined-indicator-color-disabled')).toBe(alpha('on-surface', '0.12'));
    expect(t('outlined-label-color-disabled')).toBe(alpha('on-surface', '0.38'));
    expect(t('selection-color')).toBe(
      'color-mix(in srgb, var(--m3e-sys-color-primary) calc(0.4 * 100%), transparent)',
    );
    // No hover color: TextFieldColors takes enabled / error / focused only (owner decision M8 #3).
    expect([...decl.keys()].some((k) => k.includes('hover'))).toBe(false);
  });

  it('PARITY.md cites the composable sources by line', () => {
    const parity = output.get('PARITY.md')!;
    expect(parity).toMatch(/TextFieldImpl\.kt@\w+ L\d+ \| `--m3e-comp-text-field-padding`/);
    expect(parity).toMatch(
      /\/TextField\.kt@\w+ L\d+ \| `--m3e-comp-text-field-label-vertical-padding`/,
    );
    expect(parity).toMatch(
      /OutlinedTextField\.kt@\w+ L\d+ \| `--m3e-comp-text-field-cutout-padding`/,
    );
  });
});

describe('list item values (M8)', () => {
  const decl = declarations(output.get('components/list-defaults.css')!);
  const t = (name: string) => decl.get(`--m3e-comp-list-item-${name}`);
  const list = declarations(output.get('components/list.css')!);
  const reorder = declarations(output.get('components/reorder-list.css')!);
  const kt = inputs.material3Sources['ListItem.kt']!.replace(/\r\n/g, '\n');
  const c = (name: string) => `var(--m3e-sys-color-${name})`;

  it('expressive layout: 16 / 10dp padding, 12dp slot spacing, 56 / 72 / 88dp minimum heights', () => {
    expect(t('padding-start')).toBe('16px');
    expect(t('padding-end')).toBe('16px');
    expect(t('padding-top')).toBe('10px');
    expect(t('padding-bottom')).toBe('10px');
    expect(t('space')).toBe('12px');
    expect(t('one-line-min-height')).toBe('56px');
    expect(t('two-line-min-height')).toBe('72px');
    expect(t('three-line-min-height')).toBe('88px');
    // (88 + 72) / 2 − 10 − 10 = 60dp: two-line content (52dp) centred, three-line (68dp) on top.
    expect(kt).toContain(
      '(ListTokens.ItemThreeLineContainerHeight + ListTokens.ItemTwoLineContainerHeight) / 2 -',
    );
  });

  it('type: headline body large, overline label small, supporting body medium, trailing label small', () => {
    expect(t('headline-style-size')).toBe('var(--m3e-sys-typescale-body-large-size)');
    expect(t('overline-style-size')).toBe('var(--m3e-sys-typescale-label-small-size)');
    expect(t('supporting-style-size')).toBe('var(--m3e-sys-typescale-body-medium-size)');
    expect(t('leading-style-size')).toBe('var(--m3e-sys-typescale-title-medium-size)');
    expect(t('trailing-style-size')).toBe('var(--m3e-sys-typescale-label-small-size)');
  });

  it('shapes: 4dp rest, 12dp hovered, 16dp focused / selected / pressed / dragged; 16dp outer segmented corners, 2dp gap', () => {
    expect(t('shape')).toBe('var(--m3e-sys-shape-corner-extra-small)');
    expect(t('shape-hovered')).toBe('var(--m3e-sys-shape-corner-medium)');
    for (const s of ['selected', 'pressed', 'focused', 'dragged']) {
      expect(t(`shape-${s}`)).toBe('var(--m3e-sys-shape-corner-large)');
    }
    expect(t('segmented-shape')).toBe('var(--m3e-sys-shape-corner-large)');
    expect(t('segmented-gap')).toBe('2px');
    expect(list.get('--m3e-comp-list-segmented-gap')).toBe('2px');
    expect(t('baseline-shape')).toBe('var(--m3e-sys-shape-corner-none)');
  });

  it('motion: colors DefaultEffects, shape and shadow FastSpatial; dragged Level4', () => {
    for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
      expect(t(`color-${field}`)).toBe(`var(--m3e-sys-motion-spring-default-effects-${field})`);
      expect(t(`morph-${field}`)).toBe(`var(--m3e-sys-motion-spring-fast-spatial-${field})`);
      expect(t(`elevation-${field}`)).toBe(`var(--m3e-sys-motion-spring-fast-spatial-${field})`);
    }
    expect(t('shadow')).toBe('var(--m3e-sys-elevation-level0-shadow)');
    expect(t('shadow-dragged')).toBe('var(--m3e-sys-elevation-level4-shadow)');
  });

  it('colors: defaultListItemColors content colors; containers stay the token variables', () => {
    expect(t('headline-content-color')).toBe(c('on-surface'));
    expect(t('leading-content-color')).toBe(c('on-surface-variant'));
    expect(t('trailing-content-color')).toBe(c('on-surface-variant'));
    expect(t('supporting-content-color')).toBe(c('on-surface-variant'));
    expect(t('headline-content-color-selected')).toBe(c('on-secondary-container'));
    expect(t('trailing-content-color-selected')).toBe(c('on-secondary-container'));
    expect(t('supporting-content-color-disabled')).toBe(
      'color-mix(in srgb, var(--m3e-sys-color-on-surface) calc(0.38 * 100%), transparent)',
    );
    expect(t('headline-content-color-dragged')).toBe(c('on-tertiary-container'));
    expect(list.get('--m3e-comp-list-item-container-color')).toBe(c('surface'));
    expect(list.get('--m3e-comp-list-item-segmented-container-color')).toBe(c('surface'));
    expect(list.get('--m3e-comp-list-item-container-color-selected')).toBe(
      c('secondary-container'),
    );
    expect(reorder.get('--m3e-comp-reorder-list-item-container-color')).toBe(
      c('tertiary-container'),
    );
    // No hover / focus / pressed colors: ListItemColors take enabled / selected / dragged only.
    expect([...decl.keys()].some((k) => /hover|focus|pressed/.test(k) && k.includes('color'))).toBe(
      false,
    );
  });

  it('legacy ListItem: 8dp (three-line 12dp) vertical padding, 16dp sides and slot spacing', () => {
    expect(t('baseline-padding-vertical')).toBe('8px');
    expect(t('baseline-three-line-padding-vertical')).toBe('12px');
    expect(t('baseline-padding-start')).toBe('16px');
    expect(t('baseline-padding-end')).toBe('16px');
    expect(t('baseline-leading-space')).toBe('16px');
    expect(t('baseline-trailing-space')).toBe('16px');
  });

  it('PARITY.md cites the composable sources by line', () => {
    const parity = output.get('PARITY.md')!;
    expect(parity).toMatch(/\/ListItem\.kt@\w+ L\d+ \| `--m3e-comp-list-item-space`/);
    expect(parity).toMatch(/ListItemDefaults\.kt@\w+ L\d+ \| `--m3e-comp-list-item-shape-hovered`/);
  });
});

describe('slider values (M8)', () => {
  const decl = declarations(output.get('components/slider-defaults.css')!);
  const kt = inputs.material3Sources['Slider.kt']!.replace(/\r\n/g, '\n');
  const samples = inputs.material3Sources['SliderSamples.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-slider-${name}`);
  const tok = (name: string) =>
    declarations(output.get('components/slider.css')!).get(`--m3e-comp-slider-${name}`);

  it('thumb and track: SliderTokens via TrackHeight / ThumbWidth / ThumbHeight / ThumbTrackGapSize', () => {
    expect(t('track-height')).toBe(tok('inactive-track-height'));
    expect(t('thumb-width')).toBe(tok('handle-width'));
    expect(t('thumb-height')).toBe(tok('handle-height'));
    expect(t('thumb-track-gap-size')).toBe(tok('active-handle-leading-space'));
    expect(t('thumb-track-gap-size')).toBe('6px');
    expect(t('track-inside-corner-size')).toBe(
      `${/private val TrackInsideCornerSize: Dp\n\s*get\(\) = (\d+)\.dp/.exec(kt)![1]!}px`,
    );
    expect(t('track-stop-indicator-size')).toBe(tok('stop-indicator-size'));
    expect(t('tick-size')).toBe('4px');
    // ThumbContent halves the handle (slider.css: calc(width / 2)).
    expect(kt).toContain('thumbSize.copy(width = thumbSize.width / 2)');
  });

  it('colors: defaultSliderColors; ticks swap the track colors; the stop is the active track color', () => {
    expect(t('thumb-color')).toBe('var(--m3e-sys-color-primary)');
    expect(t('track-color-active')).toBe('var(--m3e-sys-color-primary)');
    expect(t('track-color-inactive')).toBe('var(--m3e-sys-color-secondary-container)');
    expect(t('tick-color-active')).toBe('var(--m3e-sys-color-secondary-container)');
    expect(t('tick-color-inactive')).toBe('var(--m3e-sys-color-primary)');
    expect(t('track-stop-indicator-color')).toBe(t('track-color-active'));
    expect(t('track-stop-indicator-color-disabled')).toBe(t('track-color-active-disabled'));
    expect(t('thumb-color-disabled')).toBe(
      'color-mix(in srgb, var(--m3e-sys-color-on-surface) calc(0.38 * 100%), var(--m3e-sys-color-surface))',
    );
    const alpha = (a: string) =>
      `color-mix(in srgb, var(--m3e-sys-color-on-surface) calc(${a} * 100%), transparent)`;
    expect(t('track-color-active-disabled')).toBe(alpha('0.38'));
    expect(t('track-color-inactive-disabled')).toBe(alpha('0.12'));
    expect(t('tick-color-active-disabled')).toBe(alpha('0.12'));
    expect(t('tick-color-inactive-disabled')).toBe(alpha('0.38'));
    expect(t('icon-color-active')).toBe(t('tick-color-active'));
    expect(t('icon-color-inactive')).toBe(t('tick-color-inactive'));
    expect(samples).toContain('val activeIconColor = SliderDefaults.colors().activeTickColor');
  });

  it('sizes XS–XL from the m3.material.io token DB (owner decision M8 #16); XS = SliderTokens', () => {
    const sizes: [string, number, number, number][] = [
      ['x-small', 16, 44, 8],
      ['small', 24, 44, 8],
      ['medium', 40, 44, 12],
      ['large', 56, 68, 16],
      ['x-large', 96, 108, 28],
    ];
    for (const [size, track, thumb, corner] of sizes) {
      expect(t(`${size}-track-height`)).toBe(`${String(track)}px`);
      expect(t(`${size}-thumb-height`)).toBe(`${String(thumb)}px`);
      expect(t(`${size}-track-corner-size`)).toBe(`${String(corner)}px`);
    }
    expect(t('x-small-track-height')).toBe(t('track-height'));
    expect(t('x-small-thumb-height')).toBe(t('thumb-height'));
    expect(output.get('PARITY.md')).toMatch(
      /D19 \(8\) \(SOURCES register #68\): the token DB’s 44dp/,
    );
  });

  it('inset icon M / L / XL 24 / 24 / 32dp, padding 6 / 6 / 8dp (owner decision M8 #18)', () => {
    expect([t('medium-icon-size'), t('large-icon-size'), t('x-large-icon-size')]).toEqual([
      '24px',
      '24px',
      '32px',
    ]);
    expect([t('medium-icon-padding'), t('large-icon-padding'), t('x-large-icon-padding')]).toEqual([
      '6px',
      '6px',
      '8px',
    ]);
    expect(t('small-icon-size')).toBeUndefined();
  });

  it('value indicator: SliderTokens colors and type, 48 × 44dp, fully rounded (#69, M8 #19)', () => {
    expect(tok('value-indicator-container-color')).toBe('var(--m3e-sys-color-inverse-surface)');
    expect(tok('value-indicator-label-text-size')).toBe(
      'var(--m3e-sys-typescale-label-large-size)',
    );
    expect(tok('value-indicator-active-bottom-space')).toBe('12px');
    expect(t('value-indicator-container-width')).toBe('48px');
    expect(t('value-indicator-container-height')).toBe('44px');
    expect(t('value-indicator-container-shape')).toBe('var(--m3e-sys-shape-corner-full)');
    expect(output.get('PARITY.md')).toMatch(/SOURCES register #69: the Specs redline/);
  });

  it('keys: m3e-motion steps and pages match slideOnKeyEvents', () => {
    const steps = /val actualSteps = if \(steps > 0\) steps \+ 1 else (\d+)/.exec(kt)![1];
    expect(Number(steps)).toBe(SLIDER_KEY_DIVISIONS);
    const page = /val page = \(actualSteps \/ (\d+)\)\.coerceIn\(1, (\d+)\)/.exec(kt)!;
    expect(Number(page[1])).toBe(SLIDER_PAGE_DIVISOR);
    expect(Number(page[2])).toBe(SLIDER_PAGE_MAX_STEPS);
  });
});

describe('filter / input / suggestion chip values (M8)', () => {
  const css = output.get('components/chips-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const kt = inputs.material3Sources['Chip.kt']!.replace(/\r\n/g, '\n');
  const samples = inputs.material3Sources['ChipSamples.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-${name}`);
  const tok = (file: string, name: string) =>
    declarations(output.get(`components/${file}.css`)!).get(`--m3e-comp-${name}`);
  const member = (object: string, pattern: RegExp) =>
    pattern.exec(kt.slice(kt.indexOf(`public object ${object} {`)))?.[1];

  it('spacing: 8dp default arrangement, 4dp compact next to icons (expressive)', () => {
    expect(t('chip-default-horizontal-spacing')).toBe(
      `${member('SuggestionChipDefaults', /HorizontalSpacing: Dp = (\d+)\.dp/)!}px`,
    );
    expect(t('filter-chip-horizontal-spacing')).toBe('8px');
    expect(t('filter-chip-compact-horizontal-spacing')).toBe(
      `${member('FilterChipDefaults', /CompactHorizontalSpacing: Dp = (\d+)\.dp/)!}px`,
    );
    expect(t('input-chip-compact-horizontal-spacing')).toBe('4px');
    expect(t('filter-chip-content-padding-horizontal')).toBe('8px');
    expect(t('suggestion-chip-content-padding-horizontal')).toBe('8px');
  });

  it('input chip padding: start 4dp with an avatar or no leading icon (8dp with one), end 8dp with a trailing icon (else 4dp)', () => {
    expect(kt).toContain('val start = if (hasAvatar || !hasLeadingIcon) 4.dp else 8.dp');
    expect(kt).toContain('val end = if (hasTrailingIcon) 8.dp else 4.dp');
    expect(t('input-chip-content-padding-start')).toBe('4px');
    expect(t('input-chip-content-padding-start-icon')).toBe('8px');
    expect(t('input-chip-content-padding-end')).toBe('4px');
    expect(t('input-chip-content-padding-end-icon')).toBe('8px');
  });

  it('flat filter chip hover is Level1 selected or not (owner decision M8 #11)', () => {
    expect(t('filter-chip-flat-shadow-hover')).toBe('var(--m3e-sys-elevation-level1-shadow)');
    expect(tok('filter-chip', 'filter-chip-flat-container-shadow-unselected-hover')).toBe(
      'var(--m3e-sys-elevation-level0-shadow)',
    );
    expect(t('filter-chip-flat-shadow')).toBe('var(--m3e-sys-elevation-level0-shadow)');
    expect(t('filter-chip-flat-shadow-pressed')).toBe('var(--m3e-sys-elevation-level0-shadow)');
    expect(t('filter-chip-flat-shadow-dragged')).toBe('var(--m3e-sys-elevation-level4-shadow)');
    expect(t('filter-chip-flat-shadow-disabled')).toBe(t('filter-chip-flat-shadow'));
    expect(kt).toContain(
      'hoveredElevation: Dp = FilterChipTokens.FlatSelectedHoverContainerElevation',
    );
  });

  it('expressive overloads: tonal leading icon, ChipsTokens shapes, FastSpatial morph', () => {
    expect(t('filter-chip-leading-icon-color-tonal')).toBe(
      'var(--m3e-sys-color-on-surface-variant)',
    );
    expect(tok('filter-chip', 'filter-chip-leading-icon-color-unselected')).toBe(
      'var(--m3e-sys-color-primary)',
    );
    expect(t('input-chip-leading-icon-color-tonal')).toBe(
      'var(--m3e-sys-color-on-surface-variant)',
    );
    expect(tok('chips', 'chips-shape-unselected')).toBe('var(--m3e-sys-shape-corner-medium)');
    expect(tok('chips', 'chips-shape-selected')).toBe('var(--m3e-sys-shape-corner-full)');
    expect(tok('chips', 'chips-shape-pressed')).toBe('var(--m3e-sys-shape-corner-small)');
    expect(tok('filter-chip', 'filter-chip-container-shape')).toBe(
      'var(--m3e-sys-shape-corner-small)',
    );
    for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
      expect(t(`selectable-chip-shape-${field}`)).toBe(
        `var(--m3e-sys-motion-spring-fast-spatial-${field})`,
      );
    }
  });

  it('icon slot motion: baseline slow/fast effects fades, fast spatial expand, default effects shrink; expressive default effects fades, fast spatial both ways', () => {
    const spring = (name: string) => t(`selectable-chip-${name}-duration`);
    expect(spring('icon-fade-in')).toBe('var(--m3e-sys-motion-spring-slow-effects-duration)');
    expect(spring('icon-fade-out')).toBe('var(--m3e-sys-motion-spring-fast-effects-duration)');
    expect(spring('icon-expand')).toBe('var(--m3e-sys-motion-spring-fast-spatial-duration)');
    expect(spring('icon-shrink')).toBe('var(--m3e-sys-motion-spring-default-effects-duration)');
    expect(spring('expressive-icon-fade-in')).toBe(
      'var(--m3e-sys-motion-spring-default-effects-duration)',
    );
    expect(spring('expressive-icon-fade-out')).toBe(
      'var(--m3e-sys-motion-spring-default-effects-duration)',
    );
    expect(spring('expressive-icon-expand')).toBe(
      'var(--m3e-sys-motion-spring-fast-spatial-duration)',
    );
    expect(spring('expressive-icon-shrink')).toBe(
      'var(--m3e-sys-motion-spring-fast-spatial-duration)',
    );
  });

  it('reduced motion: the baseline slot shrink (geometry on DefaultEffects) jumps; fades stay (M11 a11y L4)', () => {
    const reduced = declarations(css.slice(css.indexOf('@media')));
    expect(css.slice(css.indexOf('@media'))).toMatch(/^@media \(prefers-reduced-motion: reduce\)/);
    expect([...reduced]).toEqual([['--m3e-comp-selectable-chip-icon-shrink-duration', '0ms']]);
  });

  it('elevated suggestion chip disabled colors read AssistChipTokens', () => {
    expect(t('suggestion-chip-elevated-disabled-container-color')).toBe(
      'color-mix(in srgb, var(--m3e-sys-color-on-surface) calc(0.12 * 100%), transparent)',
    );
    expect(t('suggestion-chip-elevated-disabled-icon-color')).toBe(
      'color-mix(in srgb, var(--m3e-sys-color-on-surface) calc(0.38 * 100%), transparent)',
    );
  });

  it('chip groups: ChipGroupReflowSample pads every chip 4dp on both sides', () => {
    expect(samples).toContain('Modifier.padding(horizontal = 4.dp)');
    expect(t('chip-set-chip-padding-horizontal')).toBe('4px');
    expect(output.get('PARITY.md')).toMatch(
      /ChipSamples\.kt@\w+ L\d+ \| `--m3e-comp-chip-set-chip-padding-horizontal`/,
    );
  });

  it('roles: assist / suggestion Role.Button, filter / input Role.Checkbox', () => {
    expect(kt).toContain('modifier = modifier.semantics { role = Role.Button },');
    expect(kt.split('modifier = modifier.semantics { role = Role.Checkbox },')).toHaveLength(3);
  });
});

describe('navigation suite scaffold values (M7)', () => {
  const css = output.get('components/navigation-suite-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const kt = inputs.material3Sources['NavigationSuiteScaffold.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-navigation-suite-scaffold-${name}`);

  it('NavigationSuiteScaffoldDefaults: background / onBackground, primary action at the end', () => {
    expect(kt).toMatch(
      /public val containerColor: Color\n\s*@Composable get\(\) = MaterialTheme\.colorScheme\.background/,
    );
    expect(kt).toMatch(
      /public val contentColor: Color\n\s*@Composable get\(\) = MaterialTheme\.colorScheme\.onBackground/,
    );
    expect(t('container-color')).toBe('var(--m3e-sys-color-background)');
    expect(t('content-color')).toBe('var(--m3e-sys-color-on-background)');
    expect(kt).toContain(
      'public val primaryActionContentAlignment: Alignment.Horizontal = Alignment.End',
    );
    expect(t('primary-action-alignment')).toBe('end');
    expect(kt).toMatch(/private val PrimaryActionContentPadding\n\s*get\(\) = 16\.dp/);
    expect(t('primary-action-padding')).toBe('16px');
  });

  it('show / hide: spring(0.9, 700), not a motion scheme token; jumps under reduced motion', () => {
    expect(kt).toContain('private const val SpringDefaultSpatialDamping = 0.9f');
    expect(kt).toContain('private const val SpringDefaultSpatialStiffness = 700.0f');
    expect(t('visibility-damping-ratio')).toBe('0.9');
    expect(t('visibility-stiffness')).toBe('700');
    expect(t('visibility-duration')).toMatch(/^\d+ms$/);
    expect(t('visibility-easing')).toMatch(/^linear\(0, .*, 1\)$/);
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-navigation-suite-scaffold-visibility-duration: 0ms;',
    );
  });

  it('PARITY.md cites the material3-adaptive-navigation-suite file', () => {
    expect(output.get('PARITY.md')).toContain(
      'material3-adaptive-navigation-suite/src/commonMain/kotlin/androidx/compose/material3/adaptive/navigationsuite/NavigationSuiteScaffold.kt@',
    );
  });
});

describe('TopAppBar layout literals (M4 Top app bar, M6 flexible / two-rows bars)', () => {
  const css = output.get('components/top-app-bar-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const appBar = inputs.material3Sources['AppBar.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-top-app-bar-${name}`);
  /** `<Object>.<Member>` dp token, re-read from its token file. */
  const tokenPx = (ref: string) => {
    const [object, member] = ref.split('.') as [string, string];
    const m = new RegExp(`val ${member}: [\\w.]+\\n\\s*get\\(\\) = ([\\d.]+)\\.dp`).exec(
      source(`${object}.kt`).replace(/\r\n/g, '\n'),
    );
    return `${String(Number(m![1]))}px`;
  };
  const defaultsRef = (member: string) =>
    new RegExp(`public val ${member}: Dp =\\s*(\\w+\\.\\w+)`).exec(appBar)![1]!;

  it('horizontal padding and title inset come from AppBar.kt', () => {
    const padding = /private val TopAppBarHorizontalPadding\n\s*get\(\) = (\d+)\.dp/.exec(appBar);
    const inset = /TopAppBarTitleInset = (\d+)\.dp - TopAppBarHorizontalPadding/.exec(appBar);
    expect(t('horizontal-padding')).toBe(`${padding![1]!}px`);
    expect(t('title-inset')).toBe(`${String(Number(inset![1]) - Number(padding![1]))}px`);
  });

  it.each([
    ['expanded-height', 'TopAppBarExpandedHeight'],
    ['medium-collapsed-height', 'MediumAppBarCollapsedHeight'],
    ['medium-flexible-expanded-height', 'MediumFlexibleAppBarWithoutSubtitleExpandedHeight'],
    [
      'medium-flexible-with-subtitle-expanded-height',
      'MediumFlexibleAppBarWithSubtitleExpandedHeight',
    ],
    ['large-collapsed-height', 'LargeAppBarCollapsedHeight'],
    ['large-flexible-expanded-height', 'LargeFlexibleAppBarWithoutSubtitleExpandedHeight'],
    [
      'large-flexible-with-subtitle-expanded-height',
      'LargeFlexibleAppBarWithSubtitleExpandedHeight',
    ],
    ['two-rows-collapsed-height', 'MediumAppBarCollapsedHeight'],
    ['two-rows-expanded-height', 'MediumFlexibleAppBarWithoutSubtitleExpandedHeight'],
    ['two-rows-with-subtitle-expanded-height', 'MediumFlexibleAppBarWithSubtitleExpandedHeight'],
  ])('%s = TopAppBarDefaults.%s', (name, member) => {
    expect(t(name)).toBe(tokenPx(defaultsRef(member)));
  });

  it('flexible heights match the tokens (64 / 112 / 136 / 120 / 152)', () => {
    expect(
      [
        'medium-collapsed-height',
        'medium-flexible-expanded-height',
        'medium-flexible-with-subtitle-expanded-height',
        'large-flexible-expanded-height',
        'large-flexible-with-subtitle-expanded-height',
      ].map(t),
    ).toEqual(['64px', '112px', '136px', '120px', '152px']);
  });

  it('title bottom paddings: medium 24, large 28, two-rows 0', () => {
    const literal = (name: string) =>
      `${new RegExp(`private val ${name}\\n\\s*get\\(\\) = (\\d+)\\.dp`).exec(appBar)![1]!}px`;
    expect(t('medium-title-bottom-padding')).toBe(literal('MediumTitleBottomPadding'));
    expect(t('large-title-bottom-padding')).toBe(literal('LargeTitleBottomPadding'));
    expect(t('two-rows-title-bottom-padding')).toBe('0px');
  });

  it('snap = TopAppBarDefaults.snapAnimationSpec (default effects), jumping under reduced motion', () => {
    expect(appBar).toContain(
      'public val snapAnimationSpec: AnimationSpec<Float>\n        @Composable get() = MotionSchemeKeyTokens.DefaultEffects.value()',
    );
    for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness'])
      expect(t(`snap-${field}`)).toBe(`var(--m3e-sys-motion-spring-default-effects-${field})`);
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-top-app-bar-snap-duration: 0ms;',
    );
  });

  it('the m3e-motion port uses the easings AppBar.kt / Easing.kt declare', () => {
    expect(t('top-title-alpha-easing')).toBe(`cubic-bezier(${TOP_TITLE_ALPHA_EASING.join(', ')})`);
    expect(t('container-color-easing')).toBe(
      `cubic-bezier(${FAST_OUT_LINEAR_IN_EASING.join(', ')})`,
    );
  });
});

describe('FloatingActionButtonDefaults and extended FAB literals (M5 FAB)', () => {
  const decl = declarations(output.get('components/fab-defaults.css')!);
  const fab = inputs.material3Sources['FloatingActionButton.kt']!.replace(/\r\n/g, '\n');
  const shapes = inputs.material3Sources['Shapes.kt']!.replace(/\r\n/g, '\n');

  it.each([
    ['--m3e-comp-fab-defaults-large-icon-size', /LargeIconSize: Dp = (\d+)\.dp/],
    [
      '--m3e-comp-fab-defaults-medium-extended-icon-padding',
      /MediumExtendedFabIconPadding\n\s*get\(\) = (\d+)\.dp/,
    ],
    [
      '--m3e-comp-fab-defaults-large-extended-icon-padding',
      /LargeExtendedFabIconPadding\n\s*get\(\) = (\d+)\.dp/,
    ],
  ] as const)('%s', (name, pattern) => {
    const value = pattern.exec(fab)?.[1];
    expect(value).toBeDefined();
    expect(decl.get(name)).toBe(`${value!}px`);
  });

  it('medium shapes resolve ShapeDefaults.LargeIncreased through Shapes.kt', () => {
    expect(fab).toContain('get() = ShapeDefaults.LargeIncreased // TODO: update to use token');
    expect(shapes).toContain(
      'public val LargeIncreased: CornerBasedShape = ShapeTokens.CornerLargeIncreased',
    );
    for (const name of ['medium-shape', 'medium-extended-shape']) {
      expect(decl.get(`--m3e-comp-fab-defaults-${name}`)).toBe(
        'var(--m3e-sys-shape-corner-large-increased)',
      );
    }
  });

  it('extended FAB label styles and springs', () => {
    expect(fab).toContain(
      'private val SmallExtendedFabTextStyle = TypographyKeyTokens.TitleMedium',
    );
    expect(decl.get('--m3e-comp-fab-defaults-small-extended-label-size')).toBe(
      'var(--m3e-sys-typescale-title-medium-size)',
    );
    expect(decl.get('--m3e-comp-fab-defaults-large-extended-label-font')).toBe(
      'var(--m3e-sys-typescale-headline-small-font)',
    );
    expect(fab).toContain(
      'val sizeAnimationSpec = MotionSchemeKeyTokens.FastSpatial.value<Float>()',
    );
    expect(decl.get('--m3e-comp-fab-defaults-extended-width-duration')).toBe(
      'var(--m3e-sys-motion-spring-fast-spatial-duration)',
    );
  });
});

describe('FloatingActionButtonMenu / ToggleFloatingActionButton literals (M5 FAB menu)', () => {
  const decl = declarations(output.get('components/fab-menu-defaults.css')!);
  const menu = inputs.material3Sources['FloatingActionButtonMenu.kt']!.replace(/\r\n/g, '\n');

  it.each([
    ['toggle-initial-corner-radius', /FabInitialCornerRadius\n\s*get\(\) = (\d+)\.dp/],
    ['toggle-medium-initial-corner-radius', /FabMediumInitialCornerRadius\n\s*get\(\) = (\d+)\.dp/],
    ['toggle-large-initial-corner-radius', /FabLargeInitialCornerRadius\n\s*get\(\) = (\d+)\.dp/],
    ['toggle-large-initial-icon-size', /FabLargeInitialIconSize = (\d+)\.dp/],
    ['padding-horizontal', /FabMenuPaddingHorizontal\n\s*get\(\) = (\d+)\.dp/],
    ['button-padding-bottom', /FabMenuButtonPaddingBottom\n\s*get\(\) = (\d+)\.dp/],
  ] as const)('%s', (name, pattern) => {
    const value = pattern.exec(menu)?.[1];
    expect(value).toBeDefined();
    expect(decl.get(`--m3e-comp-fab-menu-defaults-${name}`)).toBe(`${value!}px`);
  });

  it('the checked toggle is a circle of the close button size', () => {
    expect(menu).toContain('private val FabFinalCornerRadius = FabFinalSize.div(2)');
    expect(menu).toMatch(
      /FabFinalSize\n\s*get\(\) = FabMenuBaselineTokens\.CloseButtonContainerHeight/,
    );
    const height = /CloseButtonContainerHeight[^\n]*\n\s*get\(\) = ([\d.]+)\.dp/.exec(
      source('FabMenuBaselineTokens.kt'),
    )![1]!;
    expect(decl.get('--m3e-comp-fab-menu-defaults-toggle-final-corner-radius')).toBe(
      `${String(Number(height) / 2)}px`,
    );
  });

  it('colors, label style and springs', () => {
    expect(decl.get('--m3e-comp-fab-menu-defaults-toggle-container-color')).toBe(
      'var(--m3e-sys-color-primary-container)',
    );
    expect(decl.get('--m3e-comp-fab-menu-defaults-toggle-checked-container-color')).toBe(
      'var(--m3e-sys-color-primary)',
    );
    expect(decl.get('--m3e-comp-fab-menu-defaults-toggle-icon-color')).toBe(
      'var(--m3e-sys-color-on-primary-container)',
    );
    expect(decl.get('--m3e-comp-fab-menu-defaults-toggle-checked-icon-color')).toBe(
      'var(--m3e-sys-color-on-primary)',
    );
    expect(decl.get('--m3e-comp-fab-menu-defaults-item-label-size')).toBe(
      'var(--m3e-sys-typescale-title-medium-size)',
    );
    for (const [name, token, pattern] of [
      [
        'toggle-progress',
        'fast-spatial',
        /animationSpec = MotionSchemeKeyTokens\.FastSpatial\.value\(\),\n\s*\)\n\s*ToggleFloatingActionButton\(/,
      ],
      [
        'item-width',
        'fast-spatial',
        /widthSpring: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.FastSpatial/,
      ],
      [
        'item-opacity',
        'fast-effects',
        /alphaSpring: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.FastEffects/,
      ],
      [
        'stagger',
        'slow-effects',
        /staggerAnimSpec: FiniteAnimationSpec<Int> = MotionSchemeKeyTokens\.SlowEffects/,
      ],
    ] as const) {
      expect(menu).toMatch(pattern);
      expect(decl.get(`--m3e-comp-fab-menu-defaults-${name}-stiffness`)).toBe(
        `var(--m3e-sys-motion-spring-${token}-stiffness)`,
      );
    }
    expect(decl.get('--m3e-comp-fab-menu-defaults-stagger-visibility-threshold')).toBe('1');
  });
});

describe('FloatingToolbarDefaults values (M6 floating toolbar)', () => {
  const css = output.get('components/floating-toolbar-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const kt = inputs.material3Sources['FloatingToolbar.kt']!.replace(/\r\n/g, '\n');
  const tokens = source('FloatingToolbarTokens.kt');
  const tokenDp = (member: string) =>
    new RegExp(
      `val ${member}: androidx\\.compose\\.ui\\.unit\\.Dp\\n\\s*get\\(\\) = ([\\d.]+)\\.dp`,
    ).exec(tokens)?.[1];
  const v = (name: string) => decl.get(`--m3e-comp-floating-toolbar-defaults-${name}`);

  it('sizes, paddings and offsets are FloatingToolbarTokens values (64 / 8 / 16dp)', () => {
    const px = (member: string) => `${String(Number(tokenDp(member)))}px`;
    expect(kt).toContain('public val ContainerSize: Dp = FloatingToolbarTokens.ContainerHeight');
    expect(v('container-size')).toBe(px('ContainerHeight'));
    expect(v('container-size')).toBe('64px');
    for (const side of ['start', 'top'])
      expect(v(`content-padding-${side}`)).toBe(px('ContainerLeadingSpace'));
    for (const side of ['end', 'bottom'])
      expect(v(`content-padding-${side}`)).toBe(px('ContainerTrailingSpace'));
    expect(v('content-padding-start')).toBe('8px');
    expect(kt).toContain(
      'public val ScreenOffset: Dp = FloatingToolbarTokens.ContainerExternalPadding',
    );
    expect(v('screen-offset')).toBe(px('ContainerExternalPadding'));
    expect(v('screen-offset')).toBe('16px');
  });

  it('items sit edge to edge: ContainerBetweenSpace is not rendered', () => {
    expect(kt).not.toContain('ContainerBetweenSpace');
    expect(kt).toContain('horizontalArrangement = Arrangement.Center,');
    expect(kt).toContain('verticalArrangement = Arrangement.Center,');
    expect(v('item-spacing')).toBe('0px');
  });

  it('elevations: level 0, and level 1 for the toolbar beside a FAB', () => {
    expect(v('expanded-elevation')).toBe('var(--m3e-sys-elevation-level0)');
    expect(v('collapsed-shadow')).toBe('var(--m3e-sys-elevation-level0-shadow)');
    expect(kt).toMatch(/ContainerExpandedElevationWithFab: Dp =\n\s*ElevationTokens\.Level1/);
    expect(v('expanded-shadow-with-fab')).toBe('var(--m3e-sys-elevation-level1-shadow)');
    expect(v('collapsed-elevation-with-fab')).toBe('var(--m3e-sys-elevation-level0)');
    expect(v('fab-shadow')).toBe('var(--m3e-sys-elevation-level2-shadow)');
    expect(v('fab-shadow-hovered')).toBe('var(--m3e-sys-elevation-level3-shadow)');
  });

  it('FAB: 8dp gap, 56 → 80dp size range, baseline shape', () => {
    expect(v('toolbar-to-fab-gap')).toBe(`${/ToolbarToFabGap = (\d+)\.dp/.exec(kt)![1]!}px`);
    expect(kt).toContain(
      'FabSizeRange = FabBaselineTokens.ContainerWidth..FabMediumTokens.ContainerWidth',
    );
    expect(v('fab-size-min')).toBe('56px');
    expect(v('fab-size-max')).toBe('80px');
    expect(source('FabBaselineTokens.kt')).toMatch(
      /ContainerShape: ShapeToken\n\s*get\(\) = ShapeKeyTokens\.CornerLarge/,
    );
    expect(v('fab-shape')).toBe('var(--m3e-sys-shape-corner-large)');
  });

  it('color pairs (contentColorFor)', () => {
    expect(v('standard-container-color')).toBe('var(--m3e-sys-color-surface-container)');
    expect(v('vibrant-container-color')).toBe('var(--m3e-sys-color-primary-container)');
    expect(v('standard-content-color')).toBe('var(--m3e-sys-color-on-surface)');
    expect(v('standard-fab-container-color')).toBe('var(--m3e-sys-color-primary-container)');
    expect(v('standard-fab-content-color')).toBe('var(--m3e-sys-color-on-primary-container)');
    expect(v('vibrant-content-color')).toBe('var(--m3e-sys-color-on-primary-container)');
    expect(v('vibrant-fab-container-color')).toBe('var(--m3e-sys-color-tertiary-container)');
    expect(v('vibrant-fab-content-color')).toBe('var(--m3e-sys-color-on-tertiary-container)');
  });

  it('springs: fast spatial expand/collapse, default effects snap (0ms under reduced motion)', () => {
    expect(kt).toMatch(
      /animationSpec\(\): FiniteAnimationSpec<T> \{\n(?:\s*\/\/.*\n)*\s*return MotionSchemeKeyTokens\.FastSpatial/,
    );
    expect(v('animation-stiffness')).toBe('var(--m3e-sys-motion-spring-fast-spatial-stiffness)');
    expect(kt).toContain(
      'snapAnimationSpec: AnimationSpec<Float> = MotionSchemeKeyTokens.DefaultEffects.value()',
    );
    expect(v('snap-damping-ratio')).toBe(
      'var(--m3e-sys-motion-spring-default-effects-damping-ratio)',
    );
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-floating-toolbar-defaults-snap-duration: 0ms;',
    );
    expect(v('scroll-distance-threshold')).toBe(
      `${/ScrollDistanceThreshold: Dp = (\d+)\.dp/.exec(kt)![1]!}px`,
    );
  });
});

describe('BottomAppBarDefaults values (M6 docked toolbar + deprecated BottomAppBar)', () => {
  const docked = declarations(output.get('components/docked-toolbar-defaults.css')!);
  const legacy = declarations(output.get('components/bottom-app-bar-defaults.css')!);
  const kt = inputs.material3Sources['AppBar.kt']!.replace(/\r\n/g, '\n');
  const samples = inputs.material3Sources['AppBarSamples.kt']!.replace(/\r\n/g, '\n');
  const fab = inputs.material3Sources['FloatingActionButton.kt']!.replace(/\r\n/g, '\n');
  const tokens = source('DockedToolbarTokens.kt');
  const tokenDp = (member: string) =>
    `${String(
      Number(
        new RegExp(
          `val ${member}: androidx\\.compose\\.ui\\.unit\\.Dp\\n\\s*get\\(\\) = ([\\d.]+)\\.dp`,
        ).exec(tokens)![1],
      ),
    )}px`;
  const d = (name: string) => docked.get(`--m3e-comp-docked-toolbar-defaults-${name}`);
  const l = (name: string) => legacy.get(`--m3e-comp-bottom-app-bar-defaults-${name}`);

  it('docked toolbar: 64dp tall, 16dp start/end padding (DockedToolbarTokens)', () => {
    expect(kt).toContain(
      'public val FlexibleBottomAppBarHeight: Dp = DockedToolbarTokens.ContainerHeight',
    );
    expect(d('container-height')).toBe(tokenDp('ContainerHeight'));
    expect(d('container-height')).toBe('64px');
    expect(kt).toMatch(
      /FlexibleContentPadding: PaddingValues =\n\s*PaddingValues\(\n\s*start = DockedToolbarTokens\.ContainerLeadingSpace,\n\s*end = DockedToolbarTokens\.ContainerTrailingSpace,/,
    );
    expect(d('content-padding-start')).toBe(tokenDp('ContainerLeadingSpace'));
    expect(d('content-padding-end')).toBe(tokenDp('ContainerTrailingSpace'));
    expect(d('content-padding-end')).toBe('16px');
  });

  it('arrangements: spread = SpaceBetween; center = spacedBy(32dp, centered); samples around / evenly', () => {
    expect(kt).toContain(
      'FlexibleHorizontalArrangement: Arrangement.Horizontal = Arrangement.SpaceBetween',
    );
    expect(d('horizontal-arrangement')).toBe('space-between');
    expect(kt).toContain(
      'Arrangement.spacedBy(DockedToolbarTokens.ContainerMaxSpacing, Alignment.CenterHorizontally)',
    );
    expect(d('fixed-item-spacing')).toBe(tokenDp('ContainerMaxSpacing'));
    expect(d('fixed-item-spacing')).toBe('32px');
    expect(d('fixed-horizontal-arrangement')).toBe('center');
    expect(samples).toContain('horizontalArrangement = Arrangement.SpaceAround,');
    expect(samples).toContain('horizontalArrangement = Arrangement.SpaceEvenly,');
    expect(d('space-around-arrangement')).toBe('space-around');
    expect(d('space-evenly-arrangement')).toBe('space-evenly');
    expect(d('spaced-content-padding')).toBe('0px');
  });

  it('ContainerMinSpacing and DockedToolbarTokens.ContainerColor are not read by Compose', () => {
    expect(kt).not.toContain('ContainerMinSpacing');
    expect(kt).not.toContain('DockedToolbarTokens.ContainerColor');
    expect([...docked.keys()].some((k) => k.includes('min-spacing'))).toBe(false);
  });

  it('colors: surfaceContainer / onSurface; vibrant sample primaryContainer / onPrimaryContainer', () => {
    expect(kt).toContain('@Composable get() = BottomAppBarTokens.ContainerColor.value');
    expect(d('container-color')).toBe('var(--m3e-sys-color-surface-container)');
    expect(d('content-color')).toBe('var(--m3e-sys-color-on-surface)');
    expect(samples).toContain('MaterialTheme.colorScheme.primaryContainer, // TODO(b/356885344)');
    expect(d('vibrant-container-color')).toBe('var(--m3e-sys-color-primary-container)');
    expect(d('vibrant-content-color')).toBe('var(--m3e-sys-color-on-primary-container)');
  });

  it('snap: BottomAppBarDefaults.snapAnimationSpec is fast spatial (not default effects)', () => {
    expect(kt).toMatch(
      /Default \[AnimationSpec\] that defines how the bottom app bar snaps[\s\S]*?public val snapAnimationSpec: AnimationSpec<Float>\n\s*@Composable get\(\) = MotionSchemeKeyTokens\.FastSpatial\.value\(\)/,
    );
    expect(d('snap-stiffness')).toBe('var(--m3e-sys-motion-spring-fast-spatial-stiffness)');
    expect(d('snap-duration')).toBe('var(--m3e-sys-motion-spring-fast-spatial-duration)');
  });

  it('legacy BottomAppBar: 80dp, 4dp padding (16 − 12), FAB 8dp below the top and 12dp from the end', () => {
    expect(source('BottomAppBarTokens.kt')).toMatch(
      /ContainerHeight: androidx\.compose\.ui\.unit\.Dp\n\s*get\(\) = 80\.0\.dp/,
    );
    expect(l('container-height')).toBe('80px');
    expect(kt).toContain('private val BottomAppBarHorizontalPadding = 16.dp - 12.dp');
    expect(l('content-padding-horizontal')).toBe('4px');
    expect(l('content-padding-top')).toBe('4px');
    expect(kt).toContain(
      'private val FABHorizontalPadding = 16.dp - BottomAppBarHorizontalPadding',
    );
    expect(l('fab-padding-end')).toBe('12px');
    expect(kt).toContain('private val FABVerticalPadding = 12.dp - BottomAppBarVerticalPadding');
    expect(l('fab-padding-top')).toBe('8px');
    expect(l('horizontal-arrangement')).toBe('flex-start');
  });

  it('legacy BottomAppBar: no shadow (0dp, not BottomAppBarTokens Level2); FAB secondaryContainer at 0dp', () => {
    expect(kt).toContain('public val ContainerElevation: Dp = 0.dp');
    expect(l('container-shadow')).toBe('var(--m3e-sys-elevation-level0-shadow)');
    expect(kt).toContain('get() = FabSecondaryContainerTokens.ContainerColor.value');
    expect(l('fab-container-color')).toBe('var(--m3e-sys-color-secondary-container)');
    expect(l('fab-content-color')).toBe('var(--m3e-sys-color-on-secondary-container)');
    expect(fab).toMatch(/fun bottomAppBarFabElevation\(\n\s*defaultElevation: Dp = 0\.dp,/);
    expect(l('fab-shadow')).toBe('var(--m3e-sys-elevation-level0-shadow)');
  });
});

describe('menu literals (M5 Menus)', () => {
  const decl = declarations(output.get('components/menu-defaults.css')!);
  const kt = (name: string) => inputs.material3Sources[name]!.replace(/\r\n/g, '\n');
  const getter = (name: string) =>
    new RegExp(`val ${name}\\n\\s*get\\(\\) = (\\d+)\\.dp`).exec(kt('Menu.kt'))?.[1];

  it('layout values come from Menu.kt getters', () => {
    for (const [cssVar, member] of [
      ['--m3e-comp-menu-vertical-margin', 'MenuVerticalMargin'],
      ['--m3e-comp-menu-horizontal-margin', 'MenuHorizontalMargin'],
      ['--m3e-comp-menu-baseline-vertical-padding', 'DropdownMenuVerticalPadding'],
      ['--m3e-comp-menu-baseline-item-height', 'MenuListItemContainerHeight'],
      ['--m3e-comp-menu-item-horizontal-padding', 'DropdownMenuItemHorizontalPadding'],
      ['--m3e-comp-menu-item-min-width', 'DropdownMenuItemDefaultMinWidth'],
      ['--m3e-comp-menu-item-max-width', 'DropdownMenuItemDefaultMaxWidth'],
      ['--m3e-comp-menu-group-vertical-padding', 'DropdownMenuGroupVerticalPadding'],
      ['--m3e-comp-menu-group-label-min-height', 'DropdownMenuGroupDefaultMinHeight'],
    ] as const) {
      const value = getter(member);
      expect(value, member).toBeDefined();
      expect(decl.get(cssVar), member).toBe(`${value!}px`);
    }
  });

  it('item, label and divider paddings come from Menu.kt and MenuDefaults.kt', () => {
    expect(kt('Menu.kt')).toContain(
      'private val DropdownMenuSelectableItemPadding = PaddingValues(horizontal = 4.dp)',
    );
    expect(decl.get('--m3e-comp-menu-item-outer-padding-horizontal')).toBe('4px');
    expect(decl.get('--m3e-comp-menu-item-outer-padding-vertical-supporting')).toBe('2px');
    expect(kt('MenuDefaults.kt')).toContain('private val SelectableItemVerticalPadding = 12.dp');
    expect(decl.get('--m3e-comp-menu-item-vertical-padding')).toBe('12px');
    expect(kt('MenuDefaults.kt')).toMatch(
      /HorizontalDividerPadding: PaddingValues =\s*PaddingValues\(horizontal = 12\.dp, vertical = 2\.dp\)/,
    );
    expect(decl.get('--m3e-comp-menu-divider-padding-horizontal')).toBe('12px');
    expect(decl.get('--m3e-comp-menu-divider-padding-vertical')).toBe('2px');
    expect(decl.get('--m3e-comp-menu-group-label-padding-start')).toBe('12px');
    expect(decl.get('--m3e-comp-menu-group-label-padding-end')).toBe('4px');
    // Touch sizing: the precision-pointer branch (12dp) is opt-in.
    expect(kt('MenuDefaults.kt')).toContain(
      'val spacing = if (shouldUsePrecisionPointerComponentSizing.value) 12.dp else 8.dp',
    );
    expect(decl.get('--m3e-comp-menu-item-icon-label-space')).toBe('8px');
  });

  it('open/close targets and the baseline DropdownMenu margin', () => {
    expect(kt('Menu.kt')).toContain('internal const val ClosedScaleTarget = 0.8f');
    expect(decl.get('--m3e-comp-menu-closed-scale')).toBe('0.8');
    expect(decl.get('--m3e-comp-menu-closed-opacity')).toBe('0');
    expect(kt('AndroidMenu.android.kt')).toMatch(/horizontalMargin = 0,/);
    expect(decl.get('--m3e-comp-menu-baseline-horizontal-margin')).toBe('0');
  });
});

describe('button group literals (M5 Button group)', () => {
  const decl = declarations(output.get('components/button-group-defaults.css')!);
  const kt = inputs.material3Sources['ButtonGroup.kt']!.replace(/\r\n/g, '\n');

  it('ExpandedRatio, the width spring and the release wait come from ButtonGroup.kt', () => {
    expect(kt).toContain('public val ExpandedRatio: Float = 0.15f');
    expect(decl.get('--m3e-comp-button-group-expanded-ratio')).toBe('0.15');
    expect(kt).toContain(
      'val defaultAnimationSpec = MotionSchemeKeyTokens.FastSpatial.value<Float>()',
    );
    expect(decl.get('--m3e-comp-button-group-width-spring-stiffness')).toBe(
      'var(--m3e-sys-motion-spring-fast-spatial-stiffness)',
    );
    expect(kt).toContain('waitUntil { pressedAnimatable.value > 0.75f }');
    expect(decl.get('--m3e-comp-button-group-release-threshold')).toBe('0.75');
    expect(kt).toContain('private const val MAX_WAIT_TIME_MILLIS = 1_000L');
    expect(decl.get('--m3e-comp-button-group-release-max-wait')).toBe('1000ms');
  });

  it('per-size values from the m3.material.io token DB (XS between-space 18)', () => {
    expect(decl.get('--m3e-comp-button-group-x-small-between-space')).toBe('18px');
    for (const size of ['medium', 'large', 'x-large']) {
      expect(decl.get(`--m3e-comp-button-group-${size}-between-space`)).toBe(
        'var(--m3e-sys-space-100)',
      );
    }
    expect(decl.get('--m3e-comp-connected-button-group-x-large-inner-corner-corner-size')).toBe(
      'var(--m3e-sys-shape-corner-value-large-increased)',
    );
    // Small comes from the Compose token files, which the token DB's small set matches.
    expect(decl.has('--m3e-comp-button-group-small-between-space')).toBe(false);
    const small = declarations(output.get('components/button-group-small.css')!);
    expect(small.get('--m3e-comp-button-group-small-between-space')).toBe('12px');
  });
});

describe('split button literals (M5 Split button)', () => {
  const css = output.get('components/split-button-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const kt = (name: string) => inputs.material3Sources[name]!.replace(/\r\n/g, '\n');

  it('SplitButtonDefaults: spacing, minimum widths, checked alpha, shape spring', () => {
    expect(kt('SplitButton.kt')).toContain(
      'public val Spacing: Dp = SplitButtonSmallTokens.BetweenSpace',
    );
    expect(source('SplitButtonSmallTokens.kt')).toMatch(
      /BetweenSpace: [\w.]+\r?\n\s*get\(\) = 2\.0\.dp/,
    );
    expect(decl.get('--m3e-comp-split-button-spacing')).toBe('2px');
    expect(kt('SplitButton.kt')).toContain('private val LeadingButtonMinWidth = 48.dp');
    expect(kt('SplitButton.kt')).toContain(
      'private val TrailingButtonMinWidth = LeadingButtonMinWidth',
    );
    expect(decl.get('--m3e-comp-split-button-leading-button-min-width')).toBe('48px');
    expect(decl.get('--m3e-comp-split-button-trailing-button-min-width')).toBe('48px');
    expect(decl.get('--m3e-comp-split-button-trailing-button-state-layer-opacity-checked')).toBe(
      'var(--m3e-sys-state-pressed-state-layer-opacity)',
    );
    // Every LeadingButton / TrailingButton morphs on DefaultEffects (not fast spatial).
    const specs = kt('SplitButton.kt').match(/MotionSchemeKeyTokens\.\w+\.value<Float>\(\)/g);
    expect(new Set(specs)).toEqual(
      new Set(['MotionSchemeKeyTokens.DefaultEffects.value<Float>()']),
    );
    expect(decl.get('--m3e-comp-split-button-shape-easing')).toBe(
      'var(--m3e-sys-motion-spring-default-effects-easing)',
    );
    expect(kt('HorizontalCenterOptically.kt')).toContain(
      'internal const val CenterOpticallyCoefficient = 0.11f',
    );
    expect(decl.get('--m3e-comp-split-button-center-optically-coefficient')).toBe('0.11');
  });

  it('the checked trailing shape (CircleShape) is the tokens’ 50% selected inner corner', () => {
    expect(kt('SplitButton.kt')).toContain('private val TrailingCheckedShape = CircleShape');
    for (const size of ['XSmall', 'Small', 'Medium', 'Large', 'XLarge']) {
      expect(source(`SplitButton${size}Tokens.kt`), size).toContain(
        'const val TrailingInnerSelectedCornerCornerSizePercent = 50.0f',
      );
    }
  });

  it('icon rotation: 180° on animateFloatAsState’s default spring (ζ 1, k 1500)', () => {
    expect(kt('SplitButtonSamples.kt')).toContain('targetValue = if (checked) 180f else 0f');
    expect(decl.get('--m3e-comp-split-button-trailing-icon-rotation-checked')).toBe('180deg');
    expect(kt('AnimateAsState.kt')).toContain('private val defaultAnimation = spring<Float>()');
    expect(kt('VectorizedAnimationSpec.kt')).toContain(
      'public const val StiffnessMedium: Float = 1500f',
    );
    expect(kt('VectorizedAnimationSpec.kt')).toContain(
      'public const val DampingRatioNoBouncy: Float = 1f',
    );
    expect(decl.get('--m3e-comp-split-button-trailing-icon-rotation-damping-ratio')).toBe('1');
    expect(decl.get('--m3e-comp-split-button-trailing-icon-rotation-stiffness')).toBe('1500');
    expect(decl.get('--m3e-comp-split-button-trailing-icon-rotation-easing')).toMatch(
      /^linear\(0, /,
    );
    // Spatial: jumps with reduced motion.
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-split-button-trailing-icon-rotation-duration: 0ms;',
    );
  });
});

describe('progress indicator literals (M6 Progress indicators)', () => {
  const css = output.get('components/progress-indicator-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const kt = (name: string) => inputs.material3Sources[name]!.replace(/\r\n/g, '\n');
  const get = (name: string) => decl.get(`--m3e-comp-progress-indicator-defaults-${name}`);

  it('layout: 240dp linear width, 6dp stop trailing space, no indeterminate circular track', () => {
    expect(kt('ProgressIndicator.kt')).toMatch(
      /internal val LinearIndicatorWidth\n\s*get\(\) = 240\.dp/,
    );
    expect(kt('WavyProgressIndicator.kt')).toContain(
      'public val LinearContainerWidth: Dp = 240.dp',
    );
    expect(get('linear-width')).toBe('240px');
    expect(kt('ProgressIndicator.kt')).toMatch(
      /internal val StopIndicatorTrailingSpace\n\s*get\(\) = 6\.dp/,
    );
    expect(get('linear-stop-trailing-space-max')).toBe('6px');
    expect(get('circular-indeterminate-track-color')).toBe('transparent');
  });

  it('progress spring: ProgressAnimationSpec (ζ 1, k 50, threshold 1/1000), used by every sample', () => {
    expect(kt('ProgressIndicator.kt')).toMatch(
      /dampingRatio = Spring\.DampingRatioNoBouncy,\n\s*stiffness = Spring\.StiffnessVeryLow,/,
    );
    expect(kt('ProgressIndicator.kt')).toContain('visibilityThreshold = 1 / 1000f,');
    expect(get('progress-damping-ratio')).toBe('1');
    expect(get('progress-stiffness')).toBe('50');
    expect(get('progress-visibility-threshold')).toBe('0.001');
    expect(get('progress-easing')).toMatch(/^linear\(0, .*, 1\)$/);
    expect(Number.parseFloat(get('progress-duration')!)).toBeGreaterThan(1000);
    const samples = kt('ProgressIndicatorSamples.kt');
    expect(
      samples.match(/animationSpec = ProgressIndicatorDefaults\.ProgressAnimationSpec/g),
    ).toHaveLength(8);
    expect(samples).not.toContain('WavyProgressIndicatorDefaults.ProgressAnimationSpec');
  });

  it('wave: amplitude ramp 0.1 / 0.95, tweens on DurationLong2, one wavelength per second', () => {
    expect(kt('WavyProgressIndicator.kt')).toContain(
      'if (progress <= 0.1f || progress >= 0.95f) {',
    );
    expect(get('amplitude-min-progress')).toBe('0.1');
    expect(get('amplitude-max-progress')).toBe('0.95');
    expect(get('amplitude-increase-duration')).toBe('var(--m3e-sys-motion-duration-long2)');
    expect(get('amplitude-increase-easing')).toBe('var(--m3e-sys-motion-easing-standard)');
    expect(get('amplitude-decrease-easing')).toBe(
      'var(--m3e-sys-motion-easing-emphasized-accelerate)',
    );
    expect(kt('WavyProgressIndicator.kt').match(/waveSpeed: Dp = wavelength/g)).toHaveLength(4);
    expect(get('wave-travel-duration')).toBe('1000ms');
    expect(get('wave-min-travel-duration')).toBe('50ms');
  });

  it('indeterminate choreography: linear 1750ms cycle, circular 6000ms cycle', () => {
    expect(get('linear-indeterminate-duration')).toBe('1750ms');
    expect(get('linear-first-tail-delay')).toBe('250ms');
    expect(get('linear-second-head-delay')).toBe('650ms');
    expect(get('linear-second-tail-duration')).toBe('850ms');
    expect(get('circular-indeterminate-duration')).toBe('6000ms');
    expect(get('circular-rotation')).toBe('1080deg');
    expect(get('circular-additional-rotation')).toBe('360deg');
    expect(get('circular-min-progress')).toBe('0.1');
    expect(get('circular-max-progress')).toBe('0.87');
    // The 90° steps move linearly: their intervals start at keyframes without `using`.
    expect(css).toContain('5% { --_m3e-progress-additional-rotation: 90deg; }');
    expect(css).toContain('57.1429% { --_m3e-progress-first-head: 1; }');
    expect(css).toContain(
      '50% { --_m3e-progress-sweep: 0.87; animation-timing-function: cubic-bezier(0.2, 0, 0, 1); }',
    );
  });

  it('thick configuration: the samples agree with the m3.material.io token DB', () => {
    const samples = kt('ProgressIndicatorSamples.kt');
    expect(samples).toContain('modifier = Modifier.height(14.dp),');
    expect(samples).toContain('modifier = Modifier.size(52.dp),');
    expect(get('thick-thickness')).toBe('8px');
    expect(get('linear-thick-wavy-height')).toBe('14px');
    expect(get('circular-thick-size')).toBe('52px');
    expect(get('linear-thick-height')).toBe('8px');
  });

  it('reduced motion snaps the progress spring and the amplitude tweens', () => {
    const reduced = declarations(css.slice(css.indexOf('@media'), css.indexOf('@keyframes')));
    expect(reduced.get('--m3e-comp-progress-indicator-defaults-progress-duration')).toBe('0ms');
    expect(reduced.get('--m3e-comp-progress-indicator-defaults-amplitude-increase-duration')).toBe(
      '0ms',
    );
  });
});

describe('search literals (M6 Search, AppBarWithSearch)', () => {
  const css = output.get('components/search-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const get = (name: string) => decl.get(`--m3e-comp-search-${name}`);
  const kt = (name: string) => inputs.material3Sources[name]!.replace(/\r\n/g, '\n');
  const search = kt('SearchBar.kt');
  const getter = (member: string) =>
    `${new RegExp(`val ${member}(?:: Dp)?\\n\\s*get\\(\\) = (\\d+)\\.dp`).exec(search)![1]!}px`;

  it('measurements come from the SearchBar.kt getters (360–720 wide, 8 / 4 / 4 / 8 paddings, 240 min)', () => {
    expect(get('min-width')).toBe(getter('SearchBarMinWidth'));
    expect(get('max-width')).toBe(getter('SearchBarMaxWidth'));
    expect(get('vertical-padding')).toBe(getter('SearchBarVerticalPadding'));
    expect(get('icon-offset')).toBe(getter('SearchBarIconOffsetX'));
    expect(get('app-bar-horizontal-padding')).toBe(getter('AppBarWithSearchHorizontalPadding'));
    expect(get('app-bar-vertical-padding')).toBe(getter('AppBarWithSearchVerticalPadding'));
    expect(get('app-bar-search-padding')).toBe(getter('SearchBarAsTopBarPadding'));
    expect(get('contained-horizontal-padding')).toBe(getter('FullScreenExpandedHorizontalPadding'));
    expect(get('docked-min-height')).toBe(getter('DockedExpandedTableMinHeight'));
    expect(
      ['min-width', 'max-width', 'vertical-padding', 'icon-offset', 'docked-min-height'].map(get),
    ).toEqual(['360px', '720px', '8px', '4px', '240px']);
    expect(get('docked-max-height-ratio')).toBe('calc(2 / 3)');
    expect(get('docked-with-gap-max-height-ratio')).toBe('calc(1 / 2)');
  });

  it('collapsed corner radius = InputFieldHeight / 2 = SearchBarTokens.ContainerHeight / 2', () => {
    const height = /val ContainerHeight: [\w.]+\n\s*get\(\) = ([\d.]+)\.dp/.exec(
      source('SearchBarTokens.kt').replace(/\r\n/g, '\n'),
    );
    expect(get('collapsed-corner-radius')).toBe(`${String(Number(height![1]) / 2)}px`);
  });

  it('SearchBarDefaults literals under upstream “TODO: replace with token”', () => {
    expect(search).toContain(
      'RoundedCornerShape(corner = CornerSize(12.dp)) // TODO: replace with token.',
    );
    expect(get('dropdown-corner-radius')).toBe('12px');
    expect(search).toContain(
      'public val dockedDropdownGapSize: Dp = 2.dp // TODO: replace with token.',
    );
    expect(get('dropdown-gap')).toBe('2px');
    expect(get('scrim-color')).toBe('var(--m3e-sys-color-scrim)');
    expect(get('scrim-opacity')).toBe('0.32');
    expect(get('contained-container-color')).toBe('var(--m3e-sys-color-surface-container-low)');
    expect(get('scrolled-container-color')).toBe('var(--m3e-sys-color-surface-container-highest)');
    expect(get('shadow')).toBe('var(--m3e-sys-elevation-level0-shadow)');
  });

  it('state springs: full-screen / docked slow · default spatial, contained fast · fast, with gap default · fast', () => {
    const spring = (fun: string, which: string) =>
      new RegExp(
        `public fun ${fun}\\([\\s\\S]*?animationSpecFor${which}: AnimationSpec<Float> = MotionSchemeKeyTokens\\.(\\w+)\\.value\\(\\)`,
      ).exec(search)![1]!;
    const cases: [string, string, string, string][] = [
      ['expand', 'rememberSearchBarState', 'Expand', 'slow-spatial'],
      ['collapse', 'rememberSearchBarState', 'Collapse', 'default-spatial'],
      ['contained-expand', 'rememberContainedSearchBarState', 'Expand', 'fast-spatial'],
      ['contained-collapse', 'rememberContainedSearchBarState', 'Collapse', 'fast-spatial'],
      ['with-gap-expand', 'rememberSearchBarWithGapState', 'Expand', 'default-spatial'],
      ['with-gap-collapse', 'rememberSearchBarWithGapState', 'Collapse', 'fast-spatial'],
    ];
    for (const [name, fun, which, key] of cases) {
      const upstream = spring(fun, which)
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
      expect(upstream, name).toBe(key);
      for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness'])
        expect(get(`${name}-${field}`)).toBe(`var(--m3e-sys-motion-spring-${key}-${field})`);
    }
  });

  it('content fades: 100ms after 50ms (standard accelerate) in, 100ms (standard decelerate) out', () => {
    expect(search).toMatch(
      /AnimationForContentFadeInSpec: FiniteAnimationSpec<Float> =\n\s*tween\(\n\s*durationMillis = MotionTokens\.DurationShort2\.toInt\(\),\n\s*delayMillis = MotionTokens\.DurationShort1\.toInt\(\),\n\s*easing = MotionTokens\.EasingStandardAccelerateCubicBezier,/,
    );
    expect(get('content-fade-in-duration')).toBe('var(--m3e-sys-motion-duration-short2)');
    expect(get('content-fade-in-delay')).toBe('var(--m3e-sys-motion-duration-short1)');
    expect(get('content-fade-in-easing')).toBe('var(--m3e-sys-motion-easing-standard-accelerate)');
    expect(get('content-fade-out-duration')).toBe('var(--m3e-sys-motion-duration-short2)');
    expect(get('content-fade-out-easing')).toBe('var(--m3e-sys-motion-easing-standard-decelerate)');
  });

  it('AppBarWithSearch: default effects color spring and enter-always snap (0ms under reduced motion)', () => {
    expect(search).toContain('val animationSpec = MotionSchemeKeyTokens.DefaultEffects\n');
    for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
      const value = `var(--m3e-sys-motion-spring-default-effects-${field})`;
      expect(get(`app-bar-color-${field}`)).toBe(value);
      expect(get(`app-bar-snap-${field}`)).toBe(value);
    }
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-search-app-bar-snap-duration: 0ms;',
    );
  });

  it('input field: 16dp text padding, 12dp icon padding = (48dp − 24dp) / 2', () => {
    expect(kt('TextFieldImpl.kt')).toMatch(/internal val TextFieldPadding\n\s*get\(\) = 16\.dp/);
    expect(get('input-padding')).toBe('16px');
    expect(get('input-icon-padding')).toBe('12px');
  });

  it('result rows: the samples pad each ListItem by 16 / 4dp inside the clickable row', () => {
    expect(kt('SearchBarSamples.kt')).toContain('.padding(horizontal = 16.dp, vertical = 4.dp),');
    expect(get('result-padding-horizontal')).toBe('16px');
    expect(get('result-padding-vertical')).toBe('4px');
  });

  it('the m3e-motion SearchBarState port uses the thresholds SearchBar.kt declares', () => {
    expect(search).toContain(`val threshold = ${String(SEARCH_BAR_EXPANDED_THRESHOLD)}f`);
    expect(search).toContain(`{ state.progress > ${String(SEARCH_DROPDOWN_VISIBLE_PROGRESS)}f }`);
  });
});

describe('canonical layout values (M7)', () => {
  const css = output.get('components/pane-scaffold-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const kt = (file: string) => inputs.material3Sources[file]!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-${name}`);

  it('PaneScaffoldDirective: 24dp spacer from expanded; 360 / 412 / 420dp default pane sizes', () => {
    expect(kt('PaneScaffoldDirective.kt')).toContain('internal val DefaultPreferredWidth = 360.dp');
    expect(kt('PaneScaffoldDirective.kt')).toContain(
      'internal val DefaultPreferredWidthXL = 412.dp',
    );
    expect(t('pane-scaffold-partition-spacer-size')).toBe('24px');
    expect(t('pane-scaffold-pane-preferred-width')).toBe('360px');
    expect(t('pane-scaffold-pane-preferred-width-large')).toBe('412px');
    expect(t('pane-scaffold-pane-preferred-height')).toBe('420px');
  });

  it('PaneMotionDefaults: spring(0.8, 380), delayed by 10 %; jumps under reduced motion', () => {
    expect(t('pane-scaffold-motion-damping-ratio')).toBe('0.8');
    expect(t('pane-scaffold-motion-stiffness')).toBe('380');
    expect(t('pane-scaffold-motion-delayed-ratio')).toBe('0.1');
    expect(t('pane-scaffold-motion-easing')).toMatch(/^linear\(0, .*, 1\)$/);
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-pane-scaffold-motion-duration: 0ms;',
    );
  });

  it('feed: m3.material.io margins 16 / 24dp, the Cards Specs’ 8dp gap, a 240dp column (D19)', () => {
    expect(t('feed-margin-compact')).toBe('16px');
    expect(t('feed-margin')).toBe('24px');
    expect(t('feed-gap')).toBe('8px');
    expect(t('feed-column-min-width')).toBe('240px');
    const parity = output.get('PARITY.md')!;
    expect(parity).toMatch(/“Padding between cards 8dp max”.*register #65, DECISIONS D19 \(5\)/);
    expect(parity).toContain('SOURCES.md register #66, DECISIONS D19 (6)');
    expect(parity).not.toContain('TODO(verify)');
  });
});

describe('tooltip values (M9)', () => {
  const css = output.get('components/tooltip-defaults.css')!;
  const decl = declarations(css);
  const kt = inputs.material3Sources['Tooltip.kt']!.replace(/\r\n/g, '\n');
  const basic = inputs.material3Sources['BasicTooltip.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-tooltip-${name}`);

  it('layout: 4dp from the anchor, 40 × 24dp minimum, plain 8 × 4dp padding up to 200dp', () => {
    expect(kt).toMatch(/internal val SpacingBetweenTooltipAndAnchor\n\s*get\(\) = 4\.dp/);
    expect(t('spacing')).toBe('4px');
    expect(t('min-width')).toBe('40px');
    expect(t('min-height')).toBe('24px');
    expect(t('plain-padding-horizontal')).toBe('8px');
    expect(t('plain-padding-vertical')).toBe('4px');
    expect(t('plain-max-width')).toBe('200px');
  });

  it('rich: 320dp wide at most, 16dp sides, baselines 28 / 24dp, 16dp under the text, action slot', () => {
    expect(t('rich-max-width')).toBe('320px');
    expect(t('rich-padding-horizontal')).toBe('16px');
    expect(t('rich-subhead-baseline')).toBe('28px');
    expect(t('rich-text-baseline')).toBe('24px');
    expect(t('rich-text-padding-bottom')).toBe('16px');
    expect(t('rich-action-min-height')).toBe('36px');
    expect(t('rich-action-padding-bottom')).toBe('8px');
    expect(t('rich-shadow')).toBe('var(--m3e-sys-elevation-level2-shadow)');
    // The baseline position paddingFromBaseline is computed from (same as the tabs).
    expect(t('baseline-shift')).toBe(
      declarations(output.get('components/tabs-defaults.css')!).get(
        '--m3e-comp-tabs-label-baseline-shift',
      ),
    );
  });

  it('caret: TooltipDefaults.caretSize 16 × 8dp', () => {
    expect(kt).toContain('public val caretSize: DpSize = DpSize(16.dp, 8.dp)');
    expect(t('caret-width')).toBe('16px');
    expect(t('caret-height')).toBe('8px');
  });

  it('motion: scale from 0.8 on FastSpatial, alpha from 0 on FastEffects; 1500ms duration', () => {
    expect(t('closed-scale')).toBe('0.8');
    expect(t('closed-opacity')).toBe('0');
    for (const [name, key] of [
      ['scale', 'fast-spatial'],
      ['opacity', 'fast-effects'],
    ] as const) {
      for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
        expect(t(`${name}-${field}`)).toBe(`var(--m3e-sys-motion-spring-${key}-${field})`);
      }
    }
    expect(basic).toContain('const val TooltipDuration = 1500L');
    expect(t('duration')).toBe('1500ms');
    expect(output.get('PARITY.md')).toMatch(
      /internal\/BasicTooltip\.kt@\w+ L\d+ \| `--m3e-comp-tooltip-duration`/,
    );
  });

  it('the token files the CSS reads directly', () => {
    const plain = declarations(output.get('components/plain-tooltip.css')!);
    expect(plain.get('--m3e-comp-plain-tooltip-container-color')).toBe(
      'var(--m3e-sys-color-inverse-surface)',
    );
    expect(plain.get('--m3e-comp-plain-tooltip-container-shape')).toBe(
      'var(--m3e-sys-shape-corner-extra-small)',
    );
    const rich = declarations(output.get('components/rich-tooltip.css')!);
    expect(rich.get('--m3e-comp-rich-tooltip-container-color')).toBe(
      'var(--m3e-sys-color-surface-container)',
    );
    expect(rich.get('--m3e-comp-rich-tooltip-container-shape')).toBe(
      'var(--m3e-sys-shape-corner-medium)',
    );
  });
});

describe('badge values (M9)', () => {
  const css = output.get('components/badge-defaults.css')!;
  const decl = declarations(css);
  const kt = inputs.material3Sources['Badge.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-badge-${name}`);
  const tokens = declarations(output.get('components/badge.css')!);

  it('BadgeTokens: a 6dp dot, 16dp with content, full corners, on-error label small', () => {
    expect(source('BadgeTokens.kt')).toMatch(/val Size: [\w.]+\n\s*get\(\) = 6\.0\.dp/);
    expect(tokens.get('--m3e-comp-badge-size')).toBe('6px');
    expect(tokens.get('--m3e-comp-badge-large-size')).toBe('16px');
    expect(tokens.get('--m3e-comp-badge-shape')).toBe('var(--m3e-sys-shape-corner-full)');
    expect(tokens.get('--m3e-comp-badge-large-shape')).toBe('var(--m3e-sys-shape-corner-full)');
    expect(tokens.get('--m3e-comp-badge-large-label-text-color')).toBe(
      'var(--m3e-sys-color-on-error)',
    );
    expect(tokens.get('--m3e-comp-badge-large-label-text-size')).toBe(
      'var(--m3e-sys-typescale-label-small-size)',
    );
  });

  it('BadgeDefaults.containerColor is BadgeTokens.Color (error) for both sizes', () => {
    expect(kt).toMatch(
      /public val containerColor: Color\n\s*@Composable get\(\) = BadgeTokens\.Color\.value/,
    );
    expect(t('container-color')).toBe('var(--m3e-sys-color-error)');
    expect(kt).not.toContain('BadgeTokens.LargeColor');
  });

  it('padding 4dp; BadgedBox offsets 12 × 14dp with content, 6 × 6dp for the dot', () => {
    expect(kt).toMatch(/internal val BadgeWithContentHorizontalPadding\n\s*get\(\) = 4\.dp/);
    expect(t('large-padding-horizontal')).toBe('4px');
    expect(t('large-offset-horizontal')).toBe('12px');
    expect(t('large-offset-vertical')).toBe('14px');
    expect(t('offset')).toBe('6px');
    expect(output.get('PARITY.md')).toMatch(
      /material3\/Badge\.kt@\w+ L\d+ \| `--m3e-comp-badge-large-offset-vertical`/,
    );
  });

  it('m3e-motion badge text: the samples\' dot description, "8" and "999+" (M9 #6, #7)', () => {
    const samples = inputs.material3Sources['BadgeSamples.kt']!.replace(/\r\n/g, '\n');
    expect(samples).toContain(`contentDescription = "${BADGE_DOT_LABEL}"`);
    expect(samples).toContain('val badgeNumber = "8"');
    expect(samples).toContain('val badgeNumber = "999+"');
    expect(badgeText(8)).toBe('8');
    expect(badgeText(1000)).toBe('999+');
  });
});

describe('snackbar values (M9)', () => {
  const css = output.get('components/snackbar-defaults.css')!;
  const decl = declarations(css);
  const t = (name: string) => decl.get(`--m3e-comp-snackbar-${name}`);
  const tokens = declarations(output.get('components/snackbar.css')!);

  it('SnackbarTokens: inverse surface, inverse primary action, extra-small corners, 48 / 68dp', () => {
    expect(tokens.get('--m3e-comp-snackbar-container-color')).toBe(
      'var(--m3e-sys-color-inverse-surface)',
    );
    expect(tokens.get('--m3e-comp-snackbar-action-label-text-color')).toBe(
      'var(--m3e-sys-color-inverse-primary)',
    );
    expect(tokens.get('--m3e-comp-snackbar-container-shape')).toBe(
      'var(--m3e-sys-shape-corner-extra-small)',
    );
    expect(tokens.get('--m3e-comp-snackbar-single-line-container-height')).toBe('48px');
    expect(tokens.get('--m3e-comp-snackbar-two-lines-container-height')).toBe('68px');
  });

  it('the flag-on layout (owner decision M9 #19): 600dp, 16dp start, 14dp text padding, 8dp end', () => {
    expect(inputs.material3Sources['ComposeMaterial3Flags.kt']).toMatch(
      /public var isSnackbarStylingFixEnabled: Boolean = false/,
    );
    expect(t('container-max-width')).toBe('600px');
    expect(t('padding-start')).toBe('16px');
    expect(t('text-padding-vertical')).toBe('14px');
    expect(t('text-end-spacing')).toBe('8px');
    expect(t('new-line-actions-padding-end')).toBe('8px');
    expect(t('new-line-actions-padding-bottom')).toBe('4px');
    expect(t('margin')).toBe('12px');
    // 14 + one body-medium line + 14 = SingleLineContainerHeight; two lines = TwoLinesContainerHeight.
    const line = Number(
      /BodyMediumLineHeight: [\w.]+\n\s*get\(\) = ([\d.]+)\.sp/.exec(
        source('TypeScaleTokens.kt'),
      )?.[1],
    );
    expect(14 + line + 14).toBe(48);
    expect(14 + 2 * line + 14).toBe(68);
  });

  it('durations 4 / 10s, scale 0.8 on fast spatial, alpha 0 on fast effects, FAB spacing 16dp', () => {
    expect(t('duration-short')).toBe('4000ms');
    expect(t('duration-long')).toBe('10000ms');
    expect(t('closed-scale')).toBe('0.8');
    expect(t('closed-opacity')).toBe('0');
    expect(t('scale-stiffness')).toBe('var(--m3e-sys-motion-spring-fast-spatial-stiffness)');
    expect(t('opacity-stiffness')).toBe('var(--m3e-sys-motion-spring-fast-effects-stiffness)');
    expect(t('host-fab-spacing')).toBe('16px');
    expect(t('host-bottom-offset')).toBe('0px');
    expect(output.get('PARITY.md')).toMatch(
      /material3\/Scaffold\.kt@\w+ L\d+ \| `--m3e-comp-snackbar-host-bottom-offset`/,
    );
  });
});

describe('bottom sheet values (M9)', () => {
  const css = output.get('components/bottom-sheet-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const t = (name: string) => decl.get(`--m3e-comp-bottom-sheet-${name}`);
  const tokens = declarations(output.get('components/sheet-bottom.css')!);
  const m3 = inputs.material3Sources;

  it('SheetBottomTokens: surface-container-low, extra-large top corners, a 32 × 4dp handle', () => {
    expect(tokens.get('--m3e-comp-sheet-bottom-docked-container-color')).toBe(
      'var(--m3e-sys-color-surface-container-low)',
    );
    expect(tokens.get('--m3e-comp-sheet-bottom-docked-container-shape-start-start')).toBe(
      'var(--m3e-sys-shape-corner-extra-large-top-start-start)',
    );
    expect(tokens.get('--m3e-comp-sheet-bottom-docked-drag-handle-width')).toBe('32px');
    expect(tokens.get('--m3e-comp-sheet-bottom-docked-drag-handle-height')).toBe('4px');
  });

  it('BottomSheetDefaults: 640dp max width (no margins, #12), 56dp peek (#13), handle padding 22dp', () => {
    expect(t('max-width')).toBe('640px');
    expect(t('peek-height')).toBe('56px');
    expect(t('drag-handle-padding-vertical')).toBe('22px');
    expect(t('drag-handle-shape')).toBe('var(--m3e-sys-shape-corner-extra-large)');
  });

  it('the release thresholds equal m3e-motion’s constants (56dp absolute, 125dp/s, 125dp zone)', () => {
    const dp = (re: RegExp, file: string) => Number(re.exec(m3[file]!)?.[1]);
    expect(dp(/internal val PositionalThreshold = (\d+)\.dp/, 'SheetDefaults.kt')).toBe(
      SHEET_POSITIONAL_THRESHOLD,
    );
    expect(dp(/internal val VelocityThreshold = (\d+)\.dp/, 'SheetDefaults.kt')).toBe(
      SHEET_VELOCITY_THRESHOLD,
    );
    expect(dp(/internal val BoundaryDampeningZone = (\d+)\.dp/, 'SheetDefaults.kt')).toBe(
      SHEET_BOUNDARY_DAMPENING_ZONE,
    );
    expect(
      dp(/AnchoredDraggableMinFlingVelocity\n\s*get\(\) = (\d+)\.dp/, 'AnchoredDraggable.kt'),
    ).toBe(ANCHORED_DRAGGABLE_MIN_FLING_VELOCITY);
    expect(t('positional-threshold')).toBe(`${String(SHEET_POSITIONAL_THRESHOLD)}px`);
    expect(t('velocity-threshold')).toBe(String(SHEET_VELOCITY_THRESHOLD));
  });

  it('springs: show / settle DefaultSpatial, hide FastEffects (0ms reduced), scrim DefaultEffects', () => {
    expect(t('show-stiffness')).toBe('var(--m3e-sys-motion-spring-default-spatial-stiffness)');
    expect(t('settle-damping-ratio')).toBe(
      'var(--m3e-sys-motion-spring-default-spatial-damping-ratio)',
    );
    expect(t('hide-stiffness')).toBe('var(--m3e-sys-motion-spring-fast-effects-stiffness)');
    expect(t('scrim-stiffness')).toBe('var(--m3e-sys-motion-spring-default-effects-stiffness)');
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-bottom-sheet-hide-duration: 0ms;',
    );
    expect(t('scrim-color')).toBe('var(--m3e-sys-color-scrim)');
    expect(t('scrim-opacity')).toBe('0.32');
  });
});

describe('dialog values (M9)', () => {
  const decl = declarations(output.get('components/dialog-defaults.css')!);
  const t = (name: string) => decl.get(`--m3e-comp-dialog-${name}`);
  const fs = (name: string) => decl.get(`--m3e-comp-full-screen-dialog-${name}`);
  const kt = inputs.material3Sources['AlertDialog.kt']!.replace(/\r\n/g, '\n');
  const tokens = declarations(output.get('components/dialog.css')!);

  it('DialogTokens: surface-container-high, extra-large corners; Level3 is generated but not read (#8)', () => {
    expect(tokens.get('--m3e-comp-dialog-container-color')).toBe(
      'var(--m3e-sys-color-surface-container-high)',
    );
    expect(tokens.get('--m3e-comp-dialog-container-shape')).toBe(
      'var(--m3e-sys-shape-corner-extra-large)',
    );
    expect(tokens.get('--m3e-comp-dialog-container-elevation')).toBe(
      'var(--m3e-sys-elevation-level3)',
    );
    expect(kt).not.toContain('DialogTokens.ContainerElevation');
    expect(kt).toMatch(/public val TonalElevation: Dp = 0\.dp/);
    expect(t('tonal-elevation')).toBe('0px');
  });

  it('AlertDialog.kt: 280–560dp, 24dp padding and text gap, 16dp below icon and title, 8dp buttons', () => {
    expect(t('container-min-width')).toBe('280px');
    expect(t('container-max-width')).toBe('560px');
    expect(t('container-padding')).toBe('24px');
    expect(t('supporting-text-padding-bottom')).toBe('24px');
    expect(t('icon-padding-bottom')).toBe('16px');
    expect(t('headline-padding-bottom')).toBe('16px');
    expect(t('actions-main-axis-spacing')).toBe('8px');
    expect(t('actions-cross-axis-spacing')).toBe('8px');
    // ButtonDefaults.MinHeight (ButtonSmallTokens.ContainerHeight): stacked spacing 8 − (48 − 40) = 0.
    expect(t('button-min-height')).toBe('40px');
  });

  it('the scrim fades on DefaultEffects (ModalBottomSheet, #9)', () => {
    expect(t('scrim-duration')).toBe('var(--m3e-sys-motion-spring-default-effects-duration)');
    expect(t('scrim-easing')).toBe('var(--m3e-sys-motion-spring-default-effects-easing)');
    const scrim = declarations(output.get('components/scrim.css')!);
    expect(scrim.get('--m3e-comp-scrim-container-opacity')).toBe('0.32');
  });

  it('Material Web 2.5.0 motion: 500ms emphasized open, 150ms emphasized-accelerate close (#9)', () => {
    expect(t('enter-duration')).toBe('500ms');
    // D20 (6): androidx's emphasized easing (MotionTokens.kt), not Material Web's (.3, 0, 0, 1).
    expect(t('enter-easing')).toBe('var(--m3e-sys-motion-easing-emphasized)');
    expect(declarations(output.get('tokens.css')!).get('--m3e-sys-motion-easing-emphasized')).toBe(
      'cubic-bezier(0.2, 0, 0, 1)',
    );
    expect(output.get('PARITY.md')).toMatch(
      /MotionTokens\.kt@[0-9a-f]{40} L40 \| `--m3e-comp-dialog-enter-easing` \| `var\(--m3e-sys-motion-easing-emphasized\)`/,
    );
    expect(t('slide-distance')).toBe('50px');
    expect(t('container-collapsed-height')).toBe('35%');
    expect(t('container-enter-fade-duration')).toBe('50ms');
    expect([t('content-enter-delay'), t('content-enter-duration')]).toEqual(['50ms', '200ms']);
    expect([t('actions-enter-delay'), t('actions-enter-duration')]).toEqual(['150ms', '150ms']);
    expect(t('exit-duration')).toBe('150ms');
    expect(t('exit-easing')).toBe('cubic-bezier(0.3, 0, 0.8, 0.15)');
    expect([t('container-exit-fade-delay'), t('container-exit-fade-duration')]).toEqual([
      '100ms',
      '50ms',
    ]);
    expect(t('content-exit-duration')).toBe('100ms');
    expect(t('window-margin')).toBe('24px');
    expect(output.get('PARITY.md')).toMatch(
      /@material\/web@2\.5\.0 dialog\/internal\/animations\.js L14 \| `--m3e-comp-dialog-slide-distance`/,
    );
  });

  it('full-screen dialog from the m3.material.io token DB (#11)', () => {
    expect(fs('container-color')).toBe('var(--m3e-sys-color-surface)');
    expect(fs('container-shape')).toBe('var(--m3e-sys-shape-corner-none)');
    expect(fs('header-on-scroll-container-color')).toBe('var(--m3e-sys-color-surface-container)');
    expect(fs('header-container-height')).toBe('56px');
    expect(fs('header-headline-size')).toBe('var(--m3e-sys-typescale-title-large-size)');
    expect(fs('header-icon-size')).toBe('24px');
    expect(fs('padding')).toBe('24px');
  });
});

describe('side sheet values (M9, D8)', () => {
  const css = output.get('components/side-sheet-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const t = (name: string) => decl.get(`--m3e-comp-side-sheet-${name}`);
  const drawerCss = output.get('components/navigation-drawer-defaults.css')!;
  const drawer = declarations(drawerCss.slice(0, drawerCss.indexOf('@media')));

  it('m3.material.io token DB: 256dp docked width, 400dp max (#14), colors, shapes, divider outline-variant (D19)', () => {
    expect(t('container-width')).toBe('256px');
    expect(t('max-width')).toBe('400px');
    expect(t('standard-container-color')).toBe('var(--m3e-sys-color-surface)');
    expect(t('modal-container-color')).toBe('var(--m3e-sys-color-surface-container-low)');
    expect(t('modal-container-shadow')).toBe('var(--m3e-sys-elevation-level1-shadow)');
    expect(t('modal-container-shape-start-start')).toBe(
      'var(--m3e-sys-shape-corner-large-start-start-start)',
    );
    expect(t('detached-container-shape')).toBe('var(--m3e-sys-shape-corner-large)');
    expect(t('detached-margin')).toBe('16px');
    // D19 (16): the standalone md.comp.divider.color and the color legend, as the drawer's (#33).
    expect(t('divider-color')).toBe('var(--m3e-sys-color-outline-variant)');
    expect(t('divider-color')).toBe(drawer.get('--m3e-comp-navigation-drawer-divider-color'));
    expect(output.get('PARITY.md')).toMatch(
      /TOKEN_TABLE\.77f7657eb270e53d\.json, Divider: md\.comp\.divider\) \| `--m3e-comp-side-sheet-divider-color`/,
    );
    expect(t('headline-size')).toBe('var(--m3e-sys-typescale-title-large-size)');
    expect(t('headline-color')).toBe('var(--m3e-sys-color-on-surface-variant)');
  });

  it('Specs tables: 24 / 16dp padding, 12dp between top elements, 72dp actions (16 / 24dp)', () => {
    expect(t('padding-inline')).toBe('24px');
    expect(t('padding-inline-start-icon')).toBe('16px');
    expect(t('header-spacing')).toBe('12px');
    expect(t('actions-height')).toBe('72px');
    expect([t('actions-padding-top'), t('actions-padding-bottom')]).toEqual(['16px', '24px']);
  });

  it('motion and scrim: the navigation drawer’s (#16), the close jumping under reduced motion', () => {
    for (const field of ['duration', 'easing', 'damping-ratio', 'stiffness']) {
      expect(t(`open-${field}`)).toBe(drawer.get(`--m3e-comp-navigation-drawer-open-${field}`));
      expect(t(`close-${field}`)).toBe(drawer.get(`--m3e-comp-navigation-drawer-close-${field}`));
    }
    expect(t('scrim-opacity')).toBe('0.32');
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-side-sheet-close-duration: 0ms;',
    );
    expect(output.get('PARITY.md')).toMatch(
      /TOKEN_TABLE\.06c2c925cf96adca\.json, Side sheets › Tokens & specs: md\.comp\.sheet\.side\) \| `--m3e-comp-side-sheet-container-width`/,
    );
  });
});

describe('carousel values (M9, no CarouselTokens.kt)', () => {
  const css = output.get('components/carousel-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const t = (name: string) => decl.get(`--m3e-comp-carousel-${name}`);

  it('CarouselDefaults: 40 / 56dp small items, 0dp spacing and padding (register #82)', () => {
    expect(t('min-small-item-width')).toBe('40px');
    expect(t('max-small-item-width')).toBe('56px');
    expect(t('item-spacing')).toBe('0px');
    expect(t('content-padding-start')).toBe('0px');
    expect(t('content-padding-end')).toBe('0px');
  });

  it('the samples’ extra-large mask, the m3.material.io state layer and full-screen gap', () => {
    expect(t('item-shape')).toBe('var(--m3e-sys-shape-corner-extra-large)');
    expect(t('item-state-layer-color')).toBe('var(--m3e-sys-color-on-surface)');
    expect(t('full-screen-item-spacing')).toBe('16px');
  });

  it('animateScrollToItem’s spring() (ζ 1, k 1500), jumping under reduced motion', () => {
    expect(t('scroll-damping-ratio')).toBe('1');
    expect(t('scroll-stiffness')).toBe('1500');
    expect(t('scroll-duration')).toMatch(/^\d+ms$/);
    expect(css.slice(css.indexOf('@media'))).toContain('--m3e-comp-carousel-scroll-duration: 0ms;');
    expect(output.get('PARITY.md')).toMatch(
      /carousel\/Carousel\.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898 L813 \| `--m3e-comp-carousel-min-small-item-width`/,
    );
  });
});

describe('pull-to-refresh values (M9, no PullToRefreshTokens.kt)', () => {
  const css = output.get('components/pull-to-refresh-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const t = (name: string) => decl.get(`--m3e-comp-pull-to-refresh-${name}`);

  it('PullToRefreshDefaults: circle, surface-container-high / on-surface-variant, 80dp, Level2', () => {
    expect(t('indicator-shape')).toBe('var(--m3e-sys-shape-corner-full)');
    expect(t('indicator-container-color')).toBe('var(--m3e-sys-color-surface-container-high)');
    expect(t('indicator-color')).toBe('var(--m3e-sys-color-on-surface-variant)');
    expect(t('positional-threshold')).toBe('80px');
    expect(t('indicator-max-distance')).toBe('80px');
    expect(t('indicator-shadow')).toBe('var(--m3e-sys-elevation-level2-shadow)');
  });

  it('the LoadingIndicator variant (owner decision M9 #27): contained colors, 48dp, no shadow', () => {
    expect(t('loading-indicator-container-color')).toBe('var(--m3e-sys-color-primary-container)');
    expect(t('loading-indicator-color')).toBe('var(--m3e-sys-color-on-primary-container)');
    expect(t('loading-indicator-container-width')).toBe('48px');
    expect(t('loading-indicator-container-height')).toBe('48px');
    expect(t('loading-indicator-shadow')).toBe('var(--m3e-sys-elevation-level0-shadow)');
  });

  it('the private sizes: 40dp box, 16dp spinner, 2.5dp stroke; alpha 0.3 → 1', () => {
    expect(t('indicator-container-size')).toBe('40px');
    expect(t('spinner-size')).toBe('16px');
    expect(t('stroke-width')).toBe('2.5px');
    expect(t('arrow-min-alpha')).toBe('0.3');
    expect(t('arrow-max-alpha')).toBe('1');
  });

  it('springs: DefaultEffects alpha / cross-fade, Animatable’s spring() for the state', () => {
    for (const part of ['arrow-alpha', 'crossfade']) {
      expect(t(`${part}-duration`)).toBe('var(--m3e-sys-motion-spring-default-effects-duration)');
      expect(t(`${part}-easing`)).toBe('var(--m3e-sys-motion-spring-default-effects-easing)');
    }
    expect(t('state-damping-ratio')).toBe('1');
    expect(t('state-stiffness')).toBe('1500');
    expect(t('state-duration')).toMatch(/^\d+ms$/);
    expect(css.slice(css.indexOf('@media'))).toContain(
      '--m3e-comp-pull-to-refresh-state-duration: 0ms;',
    );
    expect(output.get('PARITY.md')).toMatch(
      /pulltorefresh\/PullToRefresh\.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898 L490 \| `--m3e-comp-pull-to-refresh-positional-threshold`/,
    );
  });
});

describe('time picker values (M10 §28)', () => {
  const css = output.get('components/time-picker-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const t = (name: string) => decl.get(`--m3e-comp-time-picker-${name}`);

  it('the dial: 101dp / 69dp label circles of the 256dp dial, 74dp inner threshold, 48dp labels', () => {
    expect(t('outer-radius')).toBe('101px');
    expect(t('inner-radius')).toBe('69px');
    expect(t('max-distance')).toBe('74px');
    expect(t('minimum-interactive-size')).toBe('48px');
    expect(t('display-gap')).toBe('36px');
    expect(t('separator-width')).toBe('24px');
    expect(t('separator-offset')).toBe('-4px');
  });

  it('isUpdatedTimepickerToggleEnabled (owner decision M10 T3): primary-container toggle buttons, 4dp gap, bold, 12dp checked', () => {
    expect(t('period-container-color-selected')).toBe('var(--m3e-sys-color-primary-container)');
    expect(t('period-container-color')).toBe('var(--m3e-sys-color-surface-container-lowest)');
    expect(t('period-label-color-selected')).toBe('var(--m3e-sys-color-on-primary-container)');
    expect(t('period-gap')).toBe('4px');
    expect(t('period-label-weight-selected')).toBe('700');
    expect(t('period-shape-selected')).toBe('12px');
    expect(t('period-shape-pressed')).toBe('12px');
  });

  it('vibrant: lowest containers, primary selection, 100 × 120dp fields in display large, large corners', () => {
    expect(t('vibrant-clock-dial-color')).toBe('var(--m3e-sys-color-surface-container-lowest)');
    expect(t('vibrant-time-selector-label-color-selected')).toBe('var(--m3e-sys-color-primary)');
    expect(t('vibrant-time-field-width')).toBe('100px');
    expect(t('vibrant-time-field-height')).toBe('120px');
    expect(t('vibrant-time-field-shape')).toBe('var(--m3e-sys-shape-corner-large)');
    expect(t('vibrant-time-field-label-text-size')).toBe(
      'var(--m3e-sys-typescale-display-large-size)',
    );
    expect(t('vibrant-input-outline-color')).toBe('transparent');
  });

  it('TimeInput: outline borders 1 / 2dp (not TimeFieldFocusOutlineColor), error container / border', () => {
    expect(t('input-outline-color')).toBe('var(--m3e-sys-color-outline)');
    expect(t('input-outline-color-focused')).toBe('var(--m3e-sys-color-outline)');
    expect(t('input-outline-width')).toBe('1px');
    expect(t('input-outline-width-focused')).toBe('2px');
    expect(t('input-container-color-error')).toBe('var(--m3e-sys-color-error-container)');
  });

  it('motion: DefaultSpatial selector, DefaultEffects faces, FastSpatial wheel items, pager springs; reduced motion jumps', () => {
    expect(t('selector-duration')).toBe('var(--m3e-sys-motion-spring-default-spatial-duration)');
    expect(t('face-duration')).toBe('var(--m3e-sys-motion-spring-default-effects-duration)');
    expect(t('scroll-item-duration')).toBe('var(--m3e-sys-motion-spring-fast-spatial-duration)');
    expect(t('auto-switch-delay')).toBe('100ms');
    expect(t('scroll-page-stiffness')).toBe('1500');
    expect(t('scroll-settle-stiffness')).toBe('400');
    expect(t('scroll-settle-damping-ratio')).toBe('1');
    const reduced = css.slice(css.indexOf('@media'));
    for (const name of ['selector', 'scroll-item', 'scroll-page', 'scroll-settle']) {
      expect(reduced).toContain(`--m3e-comp-time-picker-${name}-duration: 0ms;`);
    }
  });

  it('dialogs: dialog shape / color, label medium title, 24dp padding; vibrant surface container, 12dp', () => {
    expect(t('dialog-container-color')).toBe('var(--m3e-sys-color-surface-container-high)');
    expect(t('dialog-container-shape')).toBe('var(--m3e-sys-shape-corner-extra-large)');
    expect(t('dialog-title-size')).toBe('var(--m3e-sys-typescale-label-medium-size)');
    expect(t('dialog-padding')).toBe('24px');
    expect(t('vibrant-dialog-container-color')).toBe('var(--m3e-sys-color-surface-container)');
    expect(t('vibrant-dialog-padding')).toBe('12px');
    expect(output.get('PARITY.md')).toMatch(
      /TimePicker\.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898 L\d+ \| `--m3e-comp-time-picker-outer-radius`/,
    );
  });
});

describe('date picker values (M10 §27)', () => {
  const css = output.get('components/date-picker-defaults.css')!;
  const decl = declarations(css.slice(0, css.indexOf('@media')));
  const t = (name: string) => decl.get(`--m3e-comp-date-picker-${name}`);

  it('layout: 48dp cells, 56dp navigation row, 12dp sides, six rows, three year columns, header paddings', () => {
    expect(t('cell-size')).toBe('48px');
    expect(t('month-year-height')).toBe('56px');
    expect(t('horizontal-padding')).toBe('12px');
    expect(t('calendar-rows')).toBe('6');
    expect(t('years-in-row')).toBe('3');
    expect(t('years-vertical-padding')).toBe('16px');
    expect([t('title-padding-start'), t('title-padding-end'), t('title-padding-top')]).toEqual([
      '24px',
      '12px',
      '16px',
    ]);
    expect([
      t('headline-padding-start'),
      t('headline-padding-end'),
      t('headline-padding-bottom'),
    ]).toEqual(['24px', '12px', '12px']);
    expect([t('range-title-padding-start'), t('range-header-height-offset')]).toEqual([
      '64px',
      '60px',
    ]);
    expect([t('input-padding-start'), t('input-padding-top'), t('input-padding-bottom')]).toEqual([
      '24px',
      '10px',
      '16px',
    ]);
    expect([
      t('dialog-actions-padding-bottom'),
      t('dialog-actions-padding-end'),
      t('dialog-actions-gap'),
    ]).toEqual(['8px', '6px', '8px']);
  });

  it('colors: navigation on-surface-variant, current year = today, divider, no dialog shadow (owner decision M10 D13)', () => {
    expect(t('navigation-color')).toBe('var(--m3e-sys-color-on-surface-variant)');
    expect(t('current-year-color')).toBe('var(--m3e-sys-color-primary)');
    expect(t('divider-color')).toBe('var(--m3e-sys-color-outline-variant)');
    expect(t('dialog-container-shadow')).toBe('var(--m3e-sys-elevation-level0-shadow)');
  });

  it('motion: DefaultSpatial mode switch, DefaultEffects year grid from 0.6, spring() month pages; reduced motion jumps', () => {
    expect(t('mode-spatial-duration')).toBe(
      'var(--m3e-sys-motion-spring-default-spatial-duration)',
    );
    expect(t('mode-fade-out-duration')).toBe('var(--m3e-sys-motion-spring-fast-effects-duration)');
    expect(t('year-grid-duration')).toBe('var(--m3e-sys-motion-spring-default-effects-duration)');
    expect(t('year-grid-initial-alpha')).toBe('0.6');
    expect(t('month-page-stiffness')).toBe('1500');
    expect(t('month-page-damping-ratio')).toBe('1');
    expect(t('input-focus-delay')).toBe('var(--m3e-sys-motion-duration-medium2)');
    const reduced = css.slice(css.indexOf('@media'));
    for (const name of ['mode-spatial', 'year-grid', 'month-page', 'month-snap']) {
      expect(reduced).toContain(`--m3e-comp-date-picker-${name}-duration: 0ms;`);
    }
  });

  it('m3.material.io: docked (owner decision M10 D1) and state layers (D17)', () => {
    expect([t('docked-container-width'), t('docked-container-height')]).toEqual(['360px', '456px']);
    expect(t('docked-container-shape')).toBe('var(--m3e-sys-shape-corner-large)');
    expect(t('docked-outside-month-opacity')).toBe('0.38');
    expect(t('docked-menu-item-selected-container-color')).toBe(
      'var(--m3e-sys-color-surface-variant)',
    );
    expect(t('date-in-range-state-layer-color')).toBe('var(--m3e-sys-color-on-primary-container)');
    expect(output.get('PARITY.md')).toMatch(
      /DatePicker\.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898 L2618 \| `--m3e-comp-date-picker-cell-size`/,
    );
  });
});

describe('segmented button values (M9, deprecated D4)', () => {
  const css = output.get('components/segmented-button-defaults.css')!;
  const decl = declarations(css);
  const kt = inputs.material3Sources['SegmentedButton.kt']!.replace(/\r\n/g, '\n');
  const t = (name: string) => decl.get(`--m3e-comp-segmented-button-${name}`);
  const tokens = declarations(output.get('components/outlined-segmented-button.css')!);

  it('OutlinedSegmentedButtonTokens: 40dp, 1dp outline, full shape, 18dp icon, label large', () => {
    expect(source('OutlinedSegmentedButtonTokens.kt')).toMatch(
      /val ContainerHeight: [\w.]+\n\s*get\(\) = 40\.0\.dp/,
    );
    expect(tokens.get('--m3e-comp-outlined-segmented-button-container-height')).toBe('40px');
    expect(tokens.get('--m3e-comp-outlined-segmented-button-outline-width')).toBe('1px');
    expect(tokens.get('--m3e-comp-outlined-segmented-button-shape')).toBe(
      'var(--m3e-sys-shape-corner-full)',
    );
    expect(tokens.get('--m3e-comp-outlined-segmented-button-icon-size')).toBe('18px');
    expect(tokens.get('--m3e-comp-outlined-segmented-button-label-text-size')).toBe(
      'var(--m3e-sys-typescale-label-large-size)',
    );
  });

  it('colors: secondary container selected, transparent unselected; disabled outline is Outline at 12%', () => {
    expect(t('container-color-selected')).toBe('var(--m3e-sys-color-secondary-container)');
    expect(t('content-color-selected')).toBe('var(--m3e-sys-color-on-secondary-container)');
    expect(t('container-color-unselected')).toBe('transparent');
    expect(t('content-color-unselected')).toBe('var(--m3e-sys-color-on-surface)');
    expect(t('outline-color')).toBe('var(--m3e-sys-color-outline)');
    expect(t('container-color-selected-disabled')).toBe('var(--m3e-sys-color-secondary-container)');
    expect(t('content-color-disabled')).toBe(
      'color-mix(in srgb, var(--m3e-sys-color-on-surface) calc(0.38 * 100%), transparent)',
    );
    // Compose renders OutlineColor at DisabledOutlineOpacity, not the token file's
    // DisabledOutlineColor (on-surface).
    expect(kt).toMatch(/disabledActiveBorderColor =\n\s*fromToken\(OutlineColor\)/);
    expect(tokens.get('--m3e-comp-outlined-segmented-button-outline-color-disabled')).toBe(
      'var(--m3e-sys-color-on-surface)',
    );
    expect(t('outline-color-disabled')).toBe(
      'color-mix(in srgb, var(--m3e-sys-color-outline) calc(0.12 * 100%), transparent)',
    );
    expect(t('state-layer-color')).toBe('currentcolor');
  });

  it('layout: 12 × 8dp padding, 8dp icon spacing, 58 × 40dp minimum, z-index factor 5', () => {
    expect(t('content-padding-horizontal')).toBe('12px');
    expect(t('content-padding-vertical')).toBe('8px');
    expect(t('icon-spacing')).toBe('8px');
    expect(t('min-width')).toBe('58px');
    expect(t('min-height')).toBe('40px');
    expect(t('selected-z-index')).toBe('5');
  });

  it('motion: label offset and check scale on FastSpatial, fade and cross-fade on DefaultEffects', () => {
    for (const part of ['label-offset', 'icon-scale']) {
      expect(t(`${part}-duration`)).toBe('var(--m3e-sys-motion-spring-fast-spatial-duration)');
      expect(t(`${part}-easing`)).toBe('var(--m3e-sys-motion-spring-fast-spatial-easing)');
    }
    for (const part of ['icon-fade', 'icon-crossfade']) {
      expect(t(`${part}-duration`)).toBe('var(--m3e-sys-motion-spring-default-effects-duration)');
    }
    expect(output.get('PARITY.md')).toMatch(
      /material3\/SegmentedButton\.kt@\w+ L852 \| `--m3e-comp-segmented-button-selected-z-index`/,
    );
  });
});
