// m3e-theme --seed "#6750A4" [--variant expressive] [--mode system] [--contrast 0|medium]
//           [--spec 2025] [--motion expressive] [--selector :root] [--out theme.css]
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  CONTRAST,
  type CreateThemeOptions,
  SPEC_VERSIONS,
  VARIANTS,
  createTheme,
} from '../theme/create-theme.js';

const USAGE = `usage: m3e-theme --seed <#hex> [options]

  --variant   ${VARIANTS.join(' | ')}  (default tonalSpot)
  --mode      light | dark | system  (default system)
  --contrast  -1…1 or ${Object.keys(CONTRAST).join(' | ')}  (default standard)
  --spec      ${SPEC_VERSIONS.join(' | ')}  (default 2025)
  --motion    expressive | standard  (default expressive)
  --selector  single compound selector  (default :root)
  --out       file to write  (default stdout)`;

function run(argv: string[]): number {
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
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || !values.seed) {
    console.error(USAGE);
    return values.help ? 0 : 2;
  }
  const contrast = values.contrast;
  const options = {
    seed: values.seed,
    ...(values.variant ? { variant: values.variant } : {}),
    ...(values.mode ? { mode: values.mode } : {}),
    ...(contrast === undefined
      ? {}
      : { contrast: contrast in CONTRAST ? contrast : Number(contrast) }),
    ...(values.spec ? { specVersion: values.spec } : {}),
    ...(values.motion ? { motionScheme: values.motion } : {}),
    ...(values.selector ? { selector: values.selector } : {}),
  } as CreateThemeOptions;
  const { cssText } = createTheme(options);
  if (values.out) writeFileSync(values.out, cssText);
  else process.stdout.write(cssText);
  return 0;
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
