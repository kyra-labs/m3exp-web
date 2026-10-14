import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
  TonalPalette,
  Variant as McuVariant,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';
import { describe, expect, it } from 'vitest';
import { baselineColors } from '../generated/baseline-colors.js';
import {
  COLOR_ROLES,
  CORE_COLORS,
  type CoreColor,
  type CoreColors,
  SPEC_2025_ONLY_ROLES,
  VARIANTS,
  type Variant,
  createTheme,
  rolesFor,
} from './create-theme.js';
import { colorVar, themeCss } from './css.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const camel = (snake: string) => snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Independent reference: MCU's own `allColors` list plus the four roles it leaves out of it. */
const MCU_SCHEMES: Record<
  Variant,
  new (h: Hct, d: boolean, c: number, s?: '2021' | '2025') => DynamicScheme
> = {
  monochrome: SchemeMonochrome,
  neutral: SchemeNeutral,
  tonalSpot: SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  rainbow: SchemeRainbow,
  fruitSalad: SchemeFruitSalad,
};
const mdc = new MaterialDynamicColors();
const reference = (seed: string, variant: Variant, isDark: boolean, contrast: number) => {
  const scheme = new MCU_SCHEMES[variant](Hct.fromInt(argbFromHex(seed)), isDark, contrast, '2025');
  const colors = [
    ...mdc.allColors,
    mdc.surfaceVariant(),
    mdc.surfaceTint(),
    mdc.shadow(),
    mdc.scrim(),
  ];
  return Object.fromEntries(colors.map((c) => [camel(c.name), hexFromArgb(c.getArgb(scheme))]));
};

const SEEDS = ['#6750A4', '#3D5AFE', '#B3261E', '#386A20', '#FFB300'];
const CONTRASTS = [0, 0.5, 1];

describe('createTheme matches material-color-utilities (M2 DoD: 5 seeds × 9 variants × 2 modes × 3 contrasts)', () => {
  const lines: string[] = [];
  for (const seed of SEEDS) {
    for (const variant of VARIANTS) {
      for (const contrast of CONTRASTS) {
        const { tokens } = createTheme({ seed, variant, contrast });
        for (const mode of ['light', 'dark'] as const) {
          const colors = tokens[mode]!;
          it(`${seed} ${variant} ${mode} contrast ${String(contrast)}`, () => {
            expect(colors).toEqual(reference(seed, variant, mode === 'dark', contrast));
          });
          lines.push(
            `${seed} ${variant} ${mode} ${String(contrast)} | ${Object.entries(colors)
              .map(([r, h]) => `${r}=${h}`)
              .join(' ')}`,
          );
        }
      }
    }
  }

  it('snapshot (fails when an MCU bump changes any color)', async () => {
    expect(lines).toHaveLength(SEEDS.length * VARIANTS.length * CONTRASTS.length * 2);
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot('__snapshots__/schemes.txt');
  });
});

describe('color roles', () => {
  it('cover every Compose color role (ColorSchemeKeyTokens at the pin)', () => {
    const kt = readFileSync(
      join(root, 'packages/m3e-codegen/vendor/androidx-material3-tokens/ColorSchemeKeyTokens.kt'),
      'utf8',
    );
    const compose = [...kt.matchAll(/val (\w+) = ColorToken/g)].map(
      (m) => m[1]![0]!.toLowerCase() + m[1]!.slice(1),
    );
    expect(compose.length).toBeGreaterThan(40);
    for (const role of compose) expect(rolesFor('2021'), role).toContain(role);
  });

  it('add the spec 2025 dim roles only for spec 2025', () => {
    expect(COLOR_ROLES).toEqual(expect.arrayContaining([...SPEC_2025_ONLY_ROLES]));
    expect(rolesFor('2021')).toEqual(COLOR_ROLES.filter((r) => !SPEC_2025_ONLY_ROLES.includes(r)));
    expect(
      Object.keys(createTheme({ seed: '#6750A4', specVersion: '2021' }).tokens.light!),
    ).not.toContain('primaryDim');
  });

  it('SPEC_2025_ONLY_ROLES matches what MCU 0.4.0 leaves undefined in spec 2021', () => {
    const require = createRequire(import.meta.url);
    // The package exports only "."; its main entry sits at the package root.
    const pkg = dirname(require.resolve('@material/material-color-utilities'));
    const spec2021 = readFileSync(join(pkg, 'dynamiccolor/color_spec_2021.js'), 'utf8');
    const undefinedRoles = [...spec2021.matchAll(/^ {4}(\w+)\(\) \{\n {8}return undefined;/gm)].map(
      (m) => m[1],
    );
    expect(undefinedRoles.sort()).toEqual([...SPEC_2025_ONLY_ROLES].sort());
  });
});

describe('createTheme options', () => {
  it('defaults to tonalSpot, spec 2025 (D3), system mode, expressive motion', () => {
    const { tokens, cssText } = createTheme({ seed: '#6750a4' });
    expect(tokens).toMatchObject({
      seed: '#6750a4',
      variant: 'tonalSpot',
      contrast: 0,
      specVersion: '2025',
      motionScheme: 'expressive',
    });
    expect(tokens.light).toBeDefined();
    expect(tokens.dark).toBeDefined();
    expect(cssText).toContain('@media (prefers-color-scheme: dark)');
    expect(cssText).toContain(
      '--m3e-sys-motion-spring-fast-spatial-stiffness: var(--m3e-sys-motion-spring-expressive-fast-spatial-stiffness);',
    );
  });

  it('switches every spring alias, including CSS curves, with motionScheme', () => {
    const { cssText } = createTheme({ seed: '#6750a4', motionScheme: 'standard' });
    for (const field of [
      'damping-ratio',
      'stiffness',
      'easing',
      'duration',
      'bezier',
      'bezier-duration',
    ]) {
      expect(cssText).toContain(
        `--m3e-sys-motion-spring-fast-spatial-${field}: var(--m3e-sys-motion-spring-standard-fast-spatial-${field});`,
      );
    }
  });

  it('accepts contrast presets', () => {
    expect(createTheme({ seed: '#6750a4', contrast: 'high' }).tokens.contrast).toBe(1);
    expect(createTheme({ seed: '#6750a4', contrast: 'medium' }).tokens.contrast).toBe(0.5);
  });

  it('spec 2025 treats negative contrast as standard; spec 2021 does not', () => {
    const at = (specVersion: '2021' | '2025', contrast: number) =>
      createTheme({ seed: '#6750a4', mode: 'light', contrast, specVersion }).tokens.light![
        'primary'
      ];
    expect(at('2025', -1)).toBe(at('2025', 0));
    expect(at('2021', -1)).not.toBe(at('2021', 0));
  });

  it('emits only the requested mode', () => {
    const light = createTheme({ seed: '#6750a4', mode: 'light' });
    expect(light.tokens.dark).toBeUndefined();
    expect(light.cssText).not.toContain('prefers-color-scheme');
    expect(createTheme({ seed: '#6750a4', mode: 'dark' }).cssText).toContain('color-scheme: dark;');
  });

  it('applies per-mode overrides', () => {
    const { tokens } = createTheme({ seed: '#6750a4', overrides: { light: { primary: '#ABC' } } });
    expect(tokens.light!['primary']).toBe('#aabbcc');
    expect(tokens.dark!['primary']).not.toBe('#aabbcc');
  });

  it('applies to a custom selector', () => {
    const { cssText } = createTheme({ seed: '#6750a4', selector: '.brand' });
    expect(cssText).toContain('.brand {');
    expect(cssText).toContain('.brand[data-theme="dark"] {');
    expect(cssText).toContain('.brand:not([data-theme="light"]) {');
  });

  it.each([
    [{ seed: 'red' }, 'seed must be'],
    [{ seed: '#6750a4', variant: 'loud' as Variant }, 'unknown variant'],
    [{ seed: '#6750a4', contrast: 2 }, 'contrast must be within'],
    [{ seed: '#6750a4', overrides: { light: { notARole: '#fff' } } }, 'unknown color role'],
    [{ seed: '#6750a4', selector: ':root, .x' }, 'single compound selector'],
  ])('rejects %j', (options, message) => {
    expect(() => createTheme(options)).toThrow(message);
  });
});

describe('core colors', () => {
  const SEED = '#d84848';
  const GREY = '#808080';
  const MCU_VARIANT: Record<Variant, McuVariant> = {
    monochrome: McuVariant.MONOCHROME,
    neutral: McuVariant.NEUTRAL,
    tonalSpot: McuVariant.TONAL_SPOT,
    vibrant: McuVariant.VIBRANT,
    expressive: McuVariant.EXPRESSIVE,
    fidelity: McuVariant.FIDELITY,
    content: McuVariant.CONTENT,
    rainbow: McuVariant.RAINBOW,
    fruitSalad: McuVariant.FRUIT_SALAD,
  };
  const PALETTE = {
    secondary: 'secondaryPalette',
    tertiary: 'tertiaryPalette',
    neutral: 'neutralPalette',
    neutralVariant: 'neutralVariantPalette',
    error: 'errorPalette',
  } as const satisfies Record<CoreColor, keyof DynamicScheme>;
  interface Role {
    getArgb(s: DynamicScheme): number;
    palette(s: DynamicScheme): TonalPalette;
  }
  const role = (name: string) => (mdc as unknown as Record<string, () => Role>)[name]!.call(mdc);
  /** Independent reference: MCU's `DynamicScheme` given `TonalPalette.fromInt` palettes. */
  const referenceScheme = (
    variant: Variant,
    isDark: boolean,
    specVersion: '2021' | '2025',
    core: Partial<Record<CoreColor, string>>,
  ) =>
    new DynamicScheme({
      sourceColorHct: Hct.fromInt(argbFromHex(SEED)),
      variant: MCU_VARIANT[variant],
      contrastLevel: 0,
      isDark,
      specVersion,
      ...Object.fromEntries(
        Object.entries(core).map(([key, hex]) => [
          PALETTE[key as CoreColor],
          TonalPalette.fromInt(argbFromHex(hex)),
        ]),
      ),
    });
  const chroma = (hex: string) => Hct.fromInt(argbFromHex(hex)).chroma;
  /** max − min of the 8-bit RGB channels: 0 for a pure grey. */
  const spread = (hex: string) => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return Math.max(...channels) - Math.min(...channels);
  };
  /** Variants MCU 0.4.0 keeps on spec 2025 (`dynamiccolor/dynamic_scheme.js` L31–L41). */
  const SPEC_2025_NEUTRAL_VARIANTS: readonly Variant[] = [
    'expressive',
    'vibrant',
    'tonalSpot',
    'neutral',
  ];
  const ALL: Record<CoreColor, string> = {
    secondary: '#3d5afe',
    tertiary: '#386a20',
    neutral: GREY,
    neutralVariant: '#7a7f86',
    error: '#ffb300',
  };

  it('unset (or empty) core colors change nothing', () => {
    for (const variant of VARIANTS) {
      const plain = createTheme({ seed: SEED, variant });
      expect(createTheme({ seed: SEED, variant, coreColors: {} })).toEqual(plain);
      expect(createTheme({ seed: SEED, variant, coreColors: { neutral: undefined } })).toEqual(
        plain,
      );
      expect(plain.tokens).not.toHaveProperty('coreColors');
    }
  });

  for (const specVersion of ['2021', '2025'] as const) {
    for (const variant of VARIANTS) {
      it(`match DynamicScheme with TonalPalette.fromInt palettes (${variant}, spec ${specVersion})`, () => {
        const { tokens } = createTheme({ seed: SEED, variant, specVersion, coreColors: ALL });
        for (const mode of ['light', 'dark'] as const) {
          const scheme = referenceScheme(variant, mode === 'dark', specVersion, ALL);
          const expected = Object.fromEntries(
            rolesFor(specVersion).map((r) => [r, hexFromArgb(role(r).getArgb(scheme))]),
          );
          expect(tokens[mode]).toEqual(expected);
        }
      });
    }
  }

  it('each core color changes only the roles drawn from its own palette (seed #d84848)', () => {
    for (const specVersion of ['2021', '2025'] as const) {
      for (const variant of VARIANTS) {
        const base = createTheme({ seed: SEED, variant, specVersion });
        for (const key of CORE_COLORS) {
          const withCore = createTheme({
            seed: SEED,
            variant,
            specVersion,
            coreColors: { [key]: ALL[key] },
          });
          for (const mode of ['light', 'dark'] as const) {
            // Which palette each role reads, from MCU's own DynamicColor.palette.
            const scheme = referenceScheme(variant, mode === 'dark', specVersion, {});
            const roles = rolesFor(specVersion);
            const own = roles.filter((r) => role(r).palette(scheme) === scheme[PALETTE[key]]);
            const label = `${variant} ${specVersion} ${key} ${mode}`;
            if (key === 'neutralVariant' && SPEC_2025_NEUTRAL_VARIANTS.includes(variant)) {
              // Spec 2025 draws the surface-variant and outline roles from the neutral palette.
              if (specVersion === '2025') {
                expect(own, label).toEqual([]);
                expect(withCore.tokens[mode], label).toEqual(base.tokens[mode]);
                continue;
              }
            }
            expect(own.length, label).toBeGreaterThan(0);
            for (const r of roles.filter((r) => !own.includes(r))) {
              expect(withCore.tokens[mode]![r], `${label} ${r}`).toBe(base.tokens[mode]![r]);
            }
            expect(
              own.some((r) => withCore.tokens[mode]![r] !== base.tokens[mode]![r]),
              label,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('a grey neutral gives grey surfaces while primary stays red (seed #d84848, fidelity)', () => {
    const red = createTheme({ seed: SEED, variant: 'fidelity' }).tokens;
    const grey = createTheme({
      seed: SEED,
      variant: 'fidelity',
      coreColors: { neutral: GREY, neutralVariant: GREY },
    }).tokens;
    // The owner's site theme today (seed only): a red-tinted dark surface.
    expect(red.dark).toMatchObject({ surface: '#1d100f', onSurface: '#f6dddb' });
    for (const mode of ['light', 'dark'] as const) {
      for (const r of ['background', 'surface', 'surfaceContainer', 'onSurface', 'outline']) {
        // HCT chroma is noisy near white after 8-bit rounding, so measure the RGB channel spread.
        const [before, after] = [spread(red[mode]![r]!), spread(grey[mode]![r]!)];
        expect(before, `${mode} ${r} ${red[mode]![r]!} (seed only)`).toBeGreaterThan(6);
        expect(after, `${mode} ${r} ${grey[mode]![r]!} (grey neutral)`).toBeLessThanOrEqual(2);
      }
      for (const r of ['primary', 'primaryContainer', 'onPrimary', 'secondary', 'tertiary']) {
        expect(grey[mode]![r], `${mode} ${r}`).toBe(red[mode]![r]);
      }
      expect(chroma(grey[mode]!['primary']!), 'primary stays colorful').toBeGreaterThan(20);
    }
  });

  it('exposes normalized core colors in tokens, in CORE_COLORS order', () => {
    const { tokens } = createTheme({
      seed: SEED,
      coreColors: { neutralVariant: '#ABC', tertiary: '#4A6FA5' },
    });
    expect(tokens.coreColors).toEqual({ tertiary: '#4a6fa5', neutralVariant: '#aabbcc' });
    expect(Object.keys(tokens.coreColors!)).toEqual(['tertiary', 'neutralVariant']);
  });

  it('keeps per-role overrides on top of core colors', () => {
    const { tokens } = createTheme({
      seed: SEED,
      coreColors: { neutral: GREY },
      overrides: { dark: { surface: '#000' } },
    });
    expect(tokens.dark!['surface']).toBe('#000000');
  });

  it.each([
    [{ neutral: 'grey' }, 'core color neutral must be #rgb or #rrggbb'],
    [{ tertiary: '#12345' }, 'core color tertiary must be #rgb or #rrggbb'],
    [{ primary: '#ff0000' }, 'unknown core color "primary"'],
  ])('rejects core colors %j', (coreColors, message) => {
    expect(() => createTheme({ seed: SEED, coreColors: coreColors as CoreColors })).toThrow(
      message,
    );
  });
});

describe('baseline theme.css', () => {
  const css = readFileSync(join(root, 'packages/m3e-tokens/src/generated/theme.css'), 'utf8');

  it('is exactly the shared writer applied to baselineColors', () => {
    const body = themeCss({
      light: baselineColors.light,
      dark: baselineColors.dark,
      layer: 'm3e.tokens',
    });
    expect(css.replace(/^\/\*[\s\S]*?\*\/\n/, '').replace(/\r\n/g, '\n')).toBe(body);
  });

  it('uses the expressive light overrides (ColorScheme.kt expressiveLightColorScheme)', () => {
    expect(baselineColors.light.onPrimaryContainer).toBe('#4f378b');
    expect(baselineColors.dark.onPrimaryContainer).not.toBe(
      baselineColors.light.onPrimaryContainer,
    );
  });

  it('defines every color the component tokens reference', () => {
    const components = readFileSync(
      join(root, 'packages/m3e-tokens/src/generated/PARITY.md'),
      'utf8',
    );
    const referenced = new Set(
      [...components.matchAll(/var\((--m3e-sys-color-[\w-]+)\)/g)].map((m) => m[1]),
    );
    for (const ref of referenced) {
      expect(css, ref).toContain(`${ref!}:`);
    }
    expect(colorVar('onPrimaryContainer')).toBe('--m3e-sys-color-on-primary-container');
  });
});
