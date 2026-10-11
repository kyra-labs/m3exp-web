import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ICON_STYLE,
  ICON_STYLES,
  type IconSourceManifest,
  buildIconCss,
  css2Descriptors,
  iconFamily,
} from './icons.js';
import { readPin } from './pin.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fontsDir = join(root, 'packages/m3e-tokens/fonts');
const vendorDir = join(root, 'packages/m3e-codegen/vendor/material-symbols');
const manifest = JSON.parse(
  readFileSync(join(vendorDir, 'manifest.json'), 'utf8'),
) as IconSourceManifest;
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

describe('Material Symbols pin (register item 9)', () => {
  it('matches SOURCE_PIN', () => {
    const pin = readPin(root);
    expect(manifest.commit).toBe(pin['material_symbols_commit']);
    expect(manifest.version).toBe(pin['material_symbols']);
  });

  it('axis ranges and defaults read from the font (fvar)', () => {
    expect(manifest.axes).toEqual({
      FILL: { min: 0, default: 0, max: 1 },
      GRAD: { min: -50, default: 0, max: 200 },
      opsz: { min: 20, default: 24, max: 48 },
      wght: { min: 100, default: 400, max: 700 },
    });
  });

  it('ships byte-exact upstream files for every style, plus the Apache license', () => {
    for (const style of ICON_STYLES) {
      for (const ext of ['woff2', 'codepoints']) {
        const file = `material-symbols-${style}.${ext}`;
        expect(sha256(readFileSync(join(fontsDir, file))), file).toBe(manifest.files[file]?.sha256);
      }
    }
    expect(readFileSync(join(fontsDir, 'LICENSE-material-symbols.txt'), 'utf8')).toContain(
      'Apache License',
    );
  });
});

describe('icon CSS', () => {
  const css = buildIconCss(vendorDir, fontsDir);

  it('uses the descriptors Google Fonts serves', () => {
    const descriptors = css2Descriptors(readFileSync(join(vendorDir, 'css2-rounded.css'), 'utf8'));
    expect(descriptors).toEqual({ 'font-style': 'normal', 'font-weight': '100 700' });
  });

  it('material-symbols.css is the default style (D12)', () => {
    expect(DEFAULT_ICON_STYLE).toBe('rounded');
    expect(css.get('material-symbols.css')).toContain(`font-family: "${iconFamily('rounded')}";`);
    expect(css.get('material-symbols.css')).toContain('url("./material-symbols-rounded.woff2")');
  });

  it.each(ICON_STYLES)('material-symbols-%s.css points at its own font', (style) => {
    expect(css.get(`material-symbols-${style}.css`)).toContain(
      `url("./material-symbols-${style}.woff2")`,
    );
  });
});
