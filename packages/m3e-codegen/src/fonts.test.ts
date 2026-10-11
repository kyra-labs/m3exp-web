// Integrity of the committed Google Sans Flex build (packages/m3e-tokens/fonts). Rebuilding
// needs the pinned TTF (network); CI runs `pnpm fonts:check` for byte-identical regeneration.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import { describe, expect, it } from 'vitest';
import { FALLBACK_FAMILY, FAMILY, expandUnicodeRange, parseCss2 } from './fonts.js';
import { readPin } from './pin.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fontsDir = join(root, 'packages/m3e-tokens/fonts');
const vendorDir = join(root, 'packages/m3e-codegen/vendor/google-fonts-googlesansflex');

interface Chunk {
  file: string;
  codepoints: number;
  bytes: number;
  sha256: string;
}
const output = JSON.parse(
  readFileSync(join(fontsDir, 'google-sans-flex.manifest.json'), 'utf8'),
) as {
  version: string;
  chunks: Record<string, Record<string, Chunk>>;
};
const source = JSON.parse(readFileSync(join(vendorDir, 'manifest.json'), 'utf8')) as {
  commit: string;
  version: string;
};
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

describe('unicode ranges', () => {
  it('expands ranges, single points and wildcards', () => {
    expect(expandUnicodeRange('U+0041-0043, U+00E9')).toEqual([0x41, 0x42, 0x43, 0xe9]);
    expect(expandUnicodeRange('U+00F?')).toHaveLength(16);
  });

  it('parses the vendored Google Fonts CSS2 response into named chunks', () => {
    const faces = parseCss2(readFileSync(join(vendorDir, 'css2.css'), 'utf8'));
    expect(faces.map((f) => f.subset)).toEqual(
      expect.arrayContaining(['latin', 'latin-ext', 'vietnamese']),
    );
    for (const face of faces) {
      expect(face.descriptors['font-weight']).toBe('1 1000');
      expect(face.descriptors['font-stretch']).toBe('25% 151%');
      expect(face.descriptors['font-style']).toBe('oblique 0deg 10deg');
    }
  });
});

describe('pinned source', () => {
  it('matches SOURCE_PIN', () => {
    const pin = readPin(root);
    expect(source.commit).toBe(pin['google_fonts_commit']);
    expect(source.version).toBe(pin['google_sans_flex']);
    expect(output.version).toBe(source.version);
  });

  it('is OFL without reserved font names', () => {
    expect(readFileSync(join(vendorDir, 'METADATA.pb'), 'utf8')).toContain('license: "OFL"');
    expect(readFileSync(join(vendorDir, 'TRADEMARKS.md'), 'utf8')).toContain(
      'does not include within the Open Font License',
    );
  });
});

describe('built fonts', () => {
  it('ships the license and trademark files beside the fonts (D9)', () => {
    expect(readFileSync(join(fontsDir, 'LICENSE-google-sans-flex.txt'), 'utf8')).toContain(
      'SIL OPEN FONT LICENSE Version 1.1',
    );
    expect(existsSync(join(fontsDir, 'TRADEMARKS-google-sans-flex.md'))).toBe(true);
  });

  it('every chunk on disk matches the manifest, and nothing else is shipped', () => {
    const listed = Object.values(output.chunks).flatMap((profile) => Object.values(profile));
    for (const chunk of listed) {
      expect(sha256(readFileSync(join(fontsDir, chunk.file))), chunk.file).toBe(chunk.sha256);
    }
    const woff2 = readdirSync(fontsDir).filter(
      (f) => f.startsWith('google-sans-flex') && f.endsWith('.woff2'),
    );
    expect(woff2.sort()).toEqual(listed.map((c) => c.file).sort());
  });

  it.each(['fonts.css', 'fonts-full.css'])('%s references only shipped files', (css) => {
    const text = readFileSync(join(fontsDir, css), 'utf8');
    const urls = [...text.matchAll(/url\("\.\/([^"]+)"\)/g)].map((m) => m[1]!);
    expect(urls.sort()).toEqual(
      Object.values(output.chunks[css]!)
        .map((c) => c.file)
        .sort(),
    );
    expect(text).toContain(`font-family: "${FAMILY}";`);
    expect(text).toContain(`font-family: "${FALLBACK_FAMILY}";`);
    expect(text).toMatch(/size-adjust: [\d.]+%;/);
  });

  it('default profile keeps wght + opsz; full profile keeps every axis', () => {
    const axes = (file: string) =>
      Object.keys((fontkit.openSync(join(fontsDir, file)) as fontkit.Font).variationAxes).sort();
    expect(axes(output.chunks['fonts.css']!['latin']!.file)).toEqual(['opsz', 'wght']);
    expect(axes(output.chunks['fonts-full.css']!['latin']!.file)).toEqual([
      'ROND',
      'opsz',
      'slnt',
      'wdth',
      'wght',
    ]);
  });

  it('default profile declares the instanced descriptors', () => {
    const css = readFileSync(join(fontsDir, 'fonts.css'), 'utf8');
    expect(css).toContain('font-style: normal;');
    expect(css).toContain('font-stretch: 100%;');
    expect(css).not.toContain('oblique');
  });

  it('latin chunk covers Basic Latin', () => {
    const font = fontkit.openSync(
      join(fontsDir, output.chunks['fonts.css']!['latin']!.file),
    ) as fontkit.Font;
    for (let cp = 0x20; cp <= 0x7e; cp++)
      expect(font.hasGlyphForCodePoint(cp), String(cp)).toBe(true);
  });
});
