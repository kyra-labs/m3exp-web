// Reference comparisons: values are re-read from the vendored androidx sources with simple,
// independent regexes (not the parser) and compared with what the generator emits.
import { fileURLToPath } from 'node:url';
import {
  DRAWER_POSITIONAL_THRESHOLD,
  DRAWER_SETTLE_MILLIS,
  DRAWER_VELOCITY_THRESHOLD,
  FAST_OUT_LINEAR_IN_EASING,
  SEARCH_BAR_EXPANDED_THRESHOLD,
  SEARCH_DROPDOWN_VISIBLE_PROGRESS,
  TOP_TITLE_ALPHA_EASING,
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
