// Material Symbols subsetting (D5): keep only the requested icons, reachable both by ligature
// ("home") and by their private-use code point.
//
// HarfBuzz runs with layout closure *off*: the subset keeps the letters of the requested names
// plus the requested icon glyphs, and every ligature whose output glyph was not requested is
// pruned. With closure on, the letters of "home" + "menu" + "search" would also pull in
// "house", "mouse", … (measured: 4 icons → 4.7 KB without closure vs 141 KB with).
import subsetFont from 'subset-font';

export type AxisTag = 'FILL' | 'GRAD' | 'opsz' | 'wght';
/** A pinned value, or a narrowed range to keep variable. */
export type AxisSetting = number | { min: number; max: number; default?: number };

export interface SubsetIconsOptions {
  /** Source font (woff2/ttf), e.g. `@kyralabs/m3e-tokens/fonts/material-symbols-rounded.woff2`. */
  font: Uint8Array;
  /** Icon name → code point, from the matching `.codepoints` file. */
  codepoints: ReadonlyMap<string, number>;
  /** Icon names, e.g. `['home', 'arrow_back']`. */
  names: readonly string[];
  /** Pin or narrow variation axes to shrink the output further. */
  axes?: Partial<Record<AxisTag, AxisSetting>>;
  /** Output format. Defaults to woff2. */
  format?: 'woff2' | 'truetype';
}

/** Parses a Material Symbols `.codepoints` file (`name hex` per line). */
export function parseCodepoints(text: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\S+) ([0-9a-f]+)$/i.exec(line.trim());
    if (m) map.set(m[1]!, parseInt(m[2]!, 16));
  }
  return map;
}

export class UnknownIconError extends Error {
  constructor(readonly names: readonly string[]) {
    super(`Unknown Material Symbols icon name(s): ${names.join(', ')}`);
    this.name = 'UnknownIconError';
  }
}

/** The text HarfBuzz must keep: every character of the names plus each icon's code point. */
export function subsetText(
  names: readonly string[],
  codepoints: ReadonlyMap<string, number>,
): string {
  const unique = [...new Set(names)].sort();
  const unknown = unique.filter((n) => !codepoints.has(n));
  if (unknown.length > 0) throw new UnknownIconError(unknown);
  const chars = new Set<string>();
  for (const name of unique) {
    for (const ch of name) chars.add(ch);
    chars.add(String.fromCodePoint(codepoints.get(name) ?? 0));
  }
  return [...chars].sort().join('');
}

export async function subsetIcons(options: SubsetIconsOptions): Promise<Uint8Array> {
  const { font, codepoints, names, axes, format = 'woff2' } = options;
  if (names.length === 0) throw new Error('subsetIcons: no icon names given');
  return subsetFont(font, subsetText(names, codepoints), {
    targetFormat: format,
    noLayoutClosure: true,
    ...(axes && Object.keys(axes).length > 0 ? { variationAxes: axes } : {}),
  });
}

export interface IconFontFaceOptions {
  family: string;
  /** URL of the woff2, relative to the CSS file. */
  url: string;
}

/** `@font-face` for a subset font. Declares Material Symbols' full weight range so browsers never
 * synthesize bold, even when wght is pinned. Also points `.m3e-icon` at the subset through
 * `--m3e-ref-typeface-icon`, as `material-symbols*.css` does for the full fonts. */
export function iconFontFace({ family, url }: IconFontFaceOptions): string {
  return [
    '@font-face {',
    `  font-family: "${family}";`,
    '  font-style: normal;',
    '  font-weight: 100 700;',
    `  src: url("${url}") format("woff2");`,
    '}',
    '',
    '@layer m3e.tokens {',
    '  :root {',
    `    --m3e-ref-typeface-icon: "${family}";`,
    '  }',
    '}',
    '',
  ].join('\n');
}
