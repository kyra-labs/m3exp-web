// Argument parsing for the m3e-theme CLI, kept apart from cli/theme.ts so it can be unit-tested.
import { parseArgs } from 'node:util';
import {
  CONTRAST,
  type CoreColors,
  type CreateThemeOptions,
  SPEC_VERSIONS,
  VARIANTS,
} from '../theme/create-theme.js';

export const USAGE = `usage: m3e-theme --seed <#hex> [options]

  --variant          ${VARIANTS.join(' | ')}  (default tonalSpot)
  --mode             light | dark | system  (default system)
  --contrast         -1…1 or ${Object.keys(CONTRAST).join(' | ')}  (default standard)
  --spec             ${SPEC_VERSIONS.join(' | ')}  (default 2025)
  --motion           expressive | standard  (default expressive)
  --selector         single compound selector  (default :root)
  --out              file to write  (default stdout)

Core colors (optional; each replaces the palette derived from --seed):
  --secondary        <#hex>
  --tertiary         <#hex>
  --neutral          <#hex>  surfaces and backgrounds
  --neutral-variant  <#hex>  surface variants and outlines
  --error            <#hex>`;

/** CLI flag → `CoreColors` key. */
const CORE_COLOR_FLAGS = {
  secondary: 'secondary',
  tertiary: 'tertiary',
  neutral: 'neutral',
  'neutral-variant': 'neutralVariant',
  error: 'error',
} as const satisfies Record<string, keyof CoreColors>;

export type ThemeArgs =
  | { help: true; exitCode: number }
  | { help: false; options: CreateThemeOptions; out: string | undefined };

/** Parses m3e-theme arguments into `createTheme` options (validation happens in `createTheme`). */
export function parseThemeArgs(argv: string[]): ThemeArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      seed: { type: 'string' },
      variant: { type: 'string' },
      mode: { type: 'string' },
      contrast: { type: 'string' },
      spec: { type: 'string' },
      motion: { type: 'string' },
      selector: { type: 'string' },
      out: { type: 'string' },
      secondary: { type: 'string' },
      tertiary: { type: 'string' },
      neutral: { type: 'string' },
      'neutral-variant': { type: 'string' },
      error: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || !values.seed) return { help: true, exitCode: values.help ? 0 : 2 };
  const coreColors: CoreColors = {};
  for (const [flag, key] of Object.entries(CORE_COLOR_FLAGS)) {
    const value = values[flag as keyof typeof CORE_COLOR_FLAGS];
    if (value !== undefined) coreColors[key] = value;
  }
  const contrast = values.contrast;
  const options = {
    seed: values.seed,
    ...(Object.keys(coreColors).length > 0 ? { coreColors } : {}),
    ...(values.variant ? { variant: values.variant } : {}),
    ...(values.mode ? { mode: values.mode } : {}),
    ...(contrast === undefined
      ? {}
      : { contrast: contrast in CONTRAST ? contrast : Number(contrast) }),
    ...(values.spec ? { specVersion: values.spec } : {}),
    ...(values.motion ? { motionScheme: values.motion } : {}),
    ...(values.selector ? { selector: values.selector } : {}),
  } as CreateThemeOptions;
  return { help: false, options, out: values.out };
}
