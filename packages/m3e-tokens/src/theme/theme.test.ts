import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type DynamicScheme,
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
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';
import { describe, expect, it } from 'vitest';
import { baselineColors } from '../generated/baseline-colors.js';
import {
  COLOR_ROLES,
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
