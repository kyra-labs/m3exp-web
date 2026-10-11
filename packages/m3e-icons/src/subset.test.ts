// M2 DoD: "subset CLI output renders the requested glyphs". Rendering is checked by shaping with
// HarfBuzz (what browsers use): each requested name must ligate to the same glyph as its
// code point, and unrequested ligatures must not survive.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as hb from 'harfbuzzjs';
import { describe, expect, it } from 'vitest';
import { parseAxis, parseNames } from './args.js';
import {
  UnknownIconError,
  iconFontFace,
  parseCodepoints,
  subsetIcons,
  subsetText,
} from './subset.js';

const require = createRequire(import.meta.url);
const font = readFileSync(
  require.resolve('@kyralabs/m3e-tokens/fonts/material-symbols-rounded.woff2'),
);
const codepoints = parseCodepoints(
  readFileSync(
    require.resolve('@kyralabs/m3e-tokens/fonts/material-symbols-rounded.codepoints'),
    'utf8',
  ),
);

function glyphs(fontData: Uint8Array, text: string): number[] {
  const shaped = new hb.Font(new hb.Face(new hb.Blob(fontData), 0));
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(shaped, buffer);
  return buffer.getGlyphInfos().map((g) => g.codepoint);
}
const axes = (fontData: Uint8Array) =>
  Object.keys(new hb.Face(new hb.Blob(fontData), 0).getAxisInfos()).sort();

const NAMES = ['home', 'search', 'menu', 'arrow_back', '10k'];

describe('subsetIcons', async () => {
  const ttf = await subsetIcons({ font, codepoints, names: NAMES, format: 'truetype' });
  const woff2 = await subsetIcons({ font, codepoints, names: NAMES });

  it.each(NAMES)('renders "%s" via its ligature and its code point', (name) => {
    const viaLigature = glyphs(ttf, name);
    const viaCodepoint = glyphs(ttf, String.fromCodePoint(codepoints.get(name)!));
    expect(viaLigature).toHaveLength(1);
    expect(viaLigature[0]).not.toBe(0);
    expect(viaLigature).toEqual(viaCodepoint);
  });

  it('drops icons that were not requested, even when their letters are present', () => {
    // "house" is spelled entirely from letters of the requested names.
    const house = glyphs(ttf, 'house');
    expect(house).toHaveLength(5);
    expect(glyphs(ttf, String.fromCodePoint(codepoints.get('house')!))).toEqual([0]);
  });

  it('is tiny compared with the full font, and keeps every axis by default', () => {
    expect(woff2.length).toBeLessThan(16 * 1024);
    expect(font.length).toBeGreaterThan(1024 * 1024);
    expect(new TextDecoder().decode(woff2.slice(0, 4))).toBe('wOF2');
    expect(axes(ttf)).toEqual(['FILL', 'GRAD', 'opsz', 'wght']);
  });

  it('pins axes when asked', async () => {
    const pinned = await subsetIcons({
      font,
      codepoints,
      names: NAMES,
      format: 'truetype',
      axes: { FILL: 1, GRAD: 0, opsz: 24, wght: { min: 300, max: 500 } },
    });
    expect(axes(pinned)).toEqual(['wght']);
    expect(glyphs(pinned, 'home')).toHaveLength(1);
  });

  it('rejects unknown names', async () => {
    await expect(subsetIcons({ font, codepoints, names: ['home', 'nope_nope'] })).rejects.toThrow(
      UnknownIconError,
    );
  });
});

describe('helpers', () => {
  it('parses .codepoints files', () => {
    expect(parseCodepoints('home e9b2\nmenu e5d2\n').get('menu')).toBe(0xe5d2);
    expect(codepoints.size).toBeGreaterThan(4000);
  });

  it('builds the subset text from letters and code points, deduplicated', () => {
    const text = subsetText(['home', 'home'], codepoints);
    expect(Array.from(text).sort()).toEqual(
      ['e', 'h', 'm', 'o', String.fromCodePoint(0xe9b2)].sort(),
    );
  });

  it('parses CLI names and axis values', () => {
    expect(parseNames('home, menu\n# comment\narrow_back')).toEqual(['home', 'menu', 'arrow_back']);
    expect(parseAxis('400')).toBe(400);
    expect(parseAxis('-25..200')).toEqual({ min: -25, max: 200 });
    expect(() => parseAxis('bold')).toThrow('invalid axis value');
  });

  it('writes a drop-in @font-face', () => {
    expect(iconFontFace({ family: 'Material Symbols Rounded', url: './icons.woff2' })).toContain(
      'src: url("./icons.woff2") format("woff2");',
    );
  });
});
