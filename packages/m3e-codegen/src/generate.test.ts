// Reference comparisons: values are re-read from the vendored androidx sources with simple,
// independent regexes (not the parser) and compared with what the generator emits.
import { fileURLToPath } from 'node:url';
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

describe('TopAppBar layout literals (M4 Top app bar)', () => {
  const decl = declarations(output.get('components/top-app-bar-defaults.css')!);
  const appBar = inputs.material3Sources['AppBar.kt']!.replace(/\r\n/g, '\n');

  it('horizontal padding and title inset come from AppBar.kt', () => {
    const padding = /private val TopAppBarHorizontalPadding\n\s*get\(\) = (\d+)\.dp/.exec(appBar);
    const inset = /TopAppBarTitleInset = (\d+)\.dp - TopAppBarHorizontalPadding/.exec(appBar);
    expect(decl.get('--m3e-comp-top-app-bar-horizontal-padding')).toBe(`${padding![1]!}px`);
    expect(decl.get('--m3e-comp-top-app-bar-title-inset')).toBe(
      `${String(Number(inset![1]) - Number(padding![1]))}px`,
    );
  });
});
