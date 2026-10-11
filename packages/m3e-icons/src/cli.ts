// m3e-icons subset --names home,search,menu [options]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  type AxisSetting,
  type AxisTag,
  UnknownIconError,
  iconFontFace,
  parseCodepoints,
  subsetIcons,
} from './subset.js';
import { parseAxis, parseNames } from './args.js';

const STYLES = ['rounded', 'outlined', 'sharp'] as const;
type Style = (typeof STYLES)[number];

const USAGE = `usage: m3e-icons subset --names <a,b,…> [options]

  --names       comma-separated icon names (e.g. home,arrow_back)
  --names-file  file with names (comma/newline separated, # comments)
  --style       ${STYLES.join(' | ')}  (default rounded)
  --fill        pin (0 or 1) or narrow (0..1) the FILL axis
  --wght        pin (e.g. 400) or narrow (e.g. 300..500) the weight axis
  --grad        pin or narrow the GRAD axis (-50..200)
  --opsz        pin or narrow the optical size axis (20..48)
  --out         output woff2  (default material-symbols-subset.woff2)
  --css         also write @font-face CSS here (url relative to the CSS file)
  --family      font-family in the CSS  (default "Material Symbols <Style>": drop-in)
  --font        source font  (default: the full font from @kyralabs/m3e-tokens)`;

const title = (style: Style) => style[0]!.toUpperCase() + style.slice(1);

async function subsetCommand(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      names: { type: 'string' },
      'names-file': { type: 'string' },
      style: { type: 'string', default: 'rounded' },
      fill: { type: 'string' },
      wght: { type: 'string' },
      grad: { type: 'string' },
      opsz: { type: 'string' },
      out: { type: 'string', default: 'material-symbols-subset.woff2' },
      css: { type: 'string' },
      family: { type: 'string' },
      font: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  const style = values.style as Style;
  if (!STYLES.includes(style)) throw new Error(`unknown --style "${values.style}"`);
  const names = [
    ...(values.names ? parseNames(values.names) : []),
    ...(values['names-file'] ? parseNames(readFileSync(values['names-file'], 'utf8')) : []),
  ];
  if (names.length === 0) {
    console.error(USAGE);
    return 2;
  }
  const require = createRequire(import.meta.url);
  const fontPath =
    values.font ?? require.resolve(`@kyralabs/m3e-tokens/fonts/material-symbols-${style}.woff2`);
  const codepointsPath = require.resolve(
    `@kyralabs/m3e-tokens/fonts/material-symbols-${style}.codepoints`,
  );
  const axes: Partial<Record<AxisTag, AxisSetting>> = {};
  for (const [flag, tag] of [
    ['fill', 'FILL'],
    ['wght', 'wght'],
    ['grad', 'GRAD'],
    ['opsz', 'opsz'],
  ] as const) {
    const value = values[flag];
    if (value !== undefined) axes[tag] = parseAxis(value);
  }

  const woff2 = await subsetIcons({
    font: readFileSync(fontPath),
    codepoints: parseCodepoints(readFileSync(codepointsPath, 'utf8')),
    names,
    axes,
  });
  const out = resolve(values.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, woff2);
  console.log(
    `${relative(process.cwd(), out)}: ${String(new Set(names).size)} icons, ${String(woff2.length)} bytes`,
  );
  if (values.css) {
    const cssPath = resolve(values.css);
    mkdirSync(dirname(cssPath), { recursive: true });
    const url = relative(dirname(cssPath), out).replace(/\\/g, '/');
    writeFileSync(
      cssPath,
      iconFontFace({
        family: values.family ?? `Material Symbols ${title(style)}`,
        url: url.startsWith('.') ? url : `./${url}`,
      }),
    );
    console.log(`${relative(process.cwd(), cssPath)}: @font-face`);
  }
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command === 'subset') return subsetCommand(rest);
  console.error(USAGE);
  return command === '--help' || command === '-h' ? 0 : 2;
}

main(process.argv.slice(2)).then(
  (code) => (process.exitCode = code),
  (error: unknown) => {
    console.error(
      error instanceof UnknownIconError || error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  },
);
