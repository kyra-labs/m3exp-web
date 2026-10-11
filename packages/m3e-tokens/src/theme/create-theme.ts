// Runtime theming from a seed color with material-color-utilities 0.4.0 (bundled at build time:
// its published ESM uses extensionless relative imports that Node cannot load).
import {
  DynamicColor,
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
import { type ColorRoles, type MotionScheme, type ThemeMode, themeCss } from './css.js';

/** MCU `Variant` values, in MCU enum order. */
export const VARIANTS = [
  'monochrome',
  'neutral',
  'tonalSpot',
  'vibrant',
  'expressive',
  'fidelity',
  'content',
  'rainbow',
  'fruitSalad',
] as const;
export type Variant = (typeof VARIANTS)[number];

/** Contrast presets (REQUIREMENTS §9). Any number in [-1, 1] is also accepted. */
export const CONTRAST = { standard: 0, medium: 0.5, high: 1 } as const;

/** `SpecVersion` values shipped by MCU 0.4.0 (`dynamiccolor/color_spec.d.ts` L21). */
export const SPEC_VERSIONS = ['2021', '2025'] as const;
export type SpecVersion = (typeof SPEC_VERSIONS)[number];
/** D3: the latest spec MCU 0.4.0 ships. MCU's own default is still 2021. */
export const DEFAULT_SPEC_VERSION: SpecVersion = '2025';

/**
 * Roles MCU 0.4.0 defines only for spec 2025: `ColorSpecDelegateImpl2021.primaryDim()` etc.
 * return undefined (`dynamiccolor/color_spec_2021.js`; guarded by a test).
 */
export const SPEC_2025_ONLY_ROLES: readonly string[] = [
  'primaryDim',
  'secondaryDim',
  'tertiaryDim',
  'errorDim',
];

type SchemeClass = new (
  source: Hct,
  isDark: boolean,
  contrast: number,
  specVersion?: SpecVersion,
) => DynamicScheme;

const SCHEMES: Readonly<Record<Variant, SchemeClass>> = {
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

const dynamicColors = new MaterialDynamicColors();

/**
 * Every color role `MaterialDynamicColors` defines, in declaration order: its zero-argument
 * methods that return a `DynamicColor`, minus the internal palette key colors. (Helpers such as
 * `highestSurface(scheme)` take an argument and are skipped.)
 */
export const COLOR_ROLES: readonly string[] = Object.getOwnPropertyNames(
  MaterialDynamicColors.prototype,
).filter((name) => {
  if (name === 'constructor' || name.endsWith('PaletteKeyColor')) return false;
  const member = (dynamicColors as unknown as Record<string, unknown>)[name];
  if (typeof member !== 'function' || member.length !== 0) return false;
  return (member as () => unknown).call(dynamicColors) instanceof DynamicColor;
});

export const rolesFor = (specVersion: SpecVersion): readonly string[] =>
  specVersion === '2025'
    ? COLOR_ROLES
    : COLOR_ROLES.filter((r) => !SPEC_2025_ONLY_ROLES.includes(r));

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const normalizeHex = (hex: string): string => hexFromArgb(argbFromHex(hex));

export interface CreateThemeOptions {
  /** Source color, `#rgb` or `#rrggbb`. */
  seed: string;
  variant?: Variant;
  mode?: ThemeMode;
  /** −1…1 (0 = standard) or a preset name. Spec 2025 treats negative contrast as 0. */
  contrast?: number | keyof typeof CONTRAST;
  specVersion?: SpecVersion;
  motionScheme?: MotionScheme;
  /** Per-mode role overrides, e.g. `{ light: { primary: '#6750a4' } }`. */
  overrides?: { light?: ColorRoles; dark?: ColorRoles };
  /** Single compound selector the theme applies to. Defaults to `:root`. */
  selector?: string;
}

export interface Theme {
  /** Unlayered CSS: beats the layered defaults in `@kyralabs/m3e-tokens/theme.css`. */
  cssText: string;
  tokens: {
    seed: string;
    variant: Variant;
    contrast: number;
    specVersion: SpecVersion;
    motionScheme: MotionScheme;
    light?: ColorRoles;
    dark?: ColorRoles;
  };
}

/** Resolves every role of one scheme to `#rrggbb`. */
export function schemeColors(
  seed: string,
  variant: Variant,
  isDark: boolean,
  contrast: number,
  specVersion: SpecVersion,
): Record<string, string> {
  const scheme = new SCHEMES[variant](
    Hct.fromInt(argbFromHex(seed)),
    isDark,
    contrast,
    specVersion,
  );
  const out: Record<string, string> = {};
  for (const role of rolesFor(specVersion)) {
    const method = (dynamicColors as unknown as Record<string, (() => DynamicColor) | undefined>)[
      role
    ];
    if (!method) throw new Error(`MaterialDynamicColors has no role "${role}"`);
    out[role] = hexFromArgb(method.call(dynamicColors).getArgb(scheme));
  }
  return out;
}

export function createTheme(options: CreateThemeOptions): Theme {
  const {
    seed,
    variant = 'tonalSpot',
    mode = 'system',
    specVersion = DEFAULT_SPEC_VERSION,
    motionScheme = 'expressive',
    overrides = {},
    selector,
  } = options;
  if (!HEX.test(seed)) throw new Error(`createTheme: seed must be #rgb or #rrggbb, got "${seed}"`);
  if (!(VARIANTS as readonly string[]).includes(variant)) {
    throw new Error(`createTheme: unknown variant "${variant}"`);
  }
  if (!(SPEC_VERSIONS as readonly string[]).includes(specVersion)) {
    throw new Error(`createTheme: unknown specVersion "${specVersion}"`);
  }
  const contrast =
    typeof options.contrast === 'string' ? CONTRAST[options.contrast] : (options.contrast ?? 0);
  if (!(contrast >= -1 && contrast <= 1)) {
    throw new Error(
      `createTheme: contrast must be within [-1, 1], got ${String(options.contrast)}`,
    );
  }
  const roles = rolesFor(specVersion);
  const build = (isDark: boolean, extra: ColorRoles | undefined) => {
    const colors = schemeColors(seed, variant, isDark, contrast, specVersion);
    for (const [role, hex] of Object.entries(extra ?? {})) {
      if (!roles.includes(role)) throw new Error(`createTheme: unknown color role "${role}"`);
      if (!HEX.test(hex)) throw new Error(`createTheme: override ${role} must be a hex color`);
      colors[role] = normalizeHex(hex);
    }
    return colors;
  };
  const light = mode === 'dark' ? undefined : build(false, overrides.light);
  const dark = mode === 'light' ? undefined : build(true, overrides.dark);
  const cssText = themeCss({
    light,
    dark,
    mode,
    motionScheme,
    ...(selector === undefined ? {} : { selector }),
  });
  return {
    cssText,
    tokens: {
      seed: normalizeHex(seed),
      variant,
      contrast,
      specVersion,
      motionScheme,
      ...(light ? { light } : {}),
      ...(dark ? { dark } : {}),
    },
  };
}
