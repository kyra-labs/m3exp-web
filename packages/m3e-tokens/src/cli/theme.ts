// m3e-theme --seed "#6750A4" [--variant expressive] [--mode system] [--contrast 0|medium]
//           [--spec 2025] [--motion expressive] [--selector :root] [--out theme.css]
//           [--secondary #hex] [--tertiary #hex] [--neutral #hex] [--neutral-variant #hex]
//           [--error #hex]
import { writeFileSync } from 'node:fs';
import { createTheme } from '../theme/create-theme.js';
import { USAGE, parseThemeArgs } from './theme-args.js';

function run(argv: string[]): number {
  const args = parseThemeArgs(argv);
  if (args.help) {
    console.error(USAGE);
    return args.exitCode;
  }
  const { cssText } = createTheme(args.options);
  if (args.out) writeFileSync(args.out, cssText);
  else process.stdout.write(cssText);
  return 0;
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
