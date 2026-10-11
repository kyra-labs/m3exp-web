// Elevation shadows. Compose draws platform shadows (ambient + spot) from a dp elevation, so no
// androidx file carries shadow geometry. Material Web 2.5.0 (secondary source, CLAUDE.md) renders
// each level as two box-shadows, documented per level in elevation/internal/_elevation.scss:
//   // Key box shadow …     // levelN: box-shadow: 0px Ypx Bpx Spx;   … opacity: 0.3;
//   // Ambient box shadow … // levelN: box-shadow: 0px Ypx Bpx Spx;   … opacity: 0.15;
// The comment tables agree with the clamp() formulas below them for levels 0–5.

export interface ShadowLayer {
  /** Opacity applied to the shadow color. */
  opacity: number;
  /** Per level 0–5: [x, y, blur, spread] in px. */
  levels: (readonly [number, number, number, number])[];
  /** 1-based line of the layer's `opacity:` declaration. */
  line: number;
}

export interface ElevationShadows {
  key: ShadowLayer;
  ambient: ShadowLayer;
}

function layer(scss: string, heading: string): ShadowLayer {
  const start = scss.indexOf(heading);
  if (start < 0) throw new Error(`_elevation.scss: "${heading}" not found`);
  const body = scss.slice(start, scss.indexOf('}', start));
  const levels: ShadowLayer['levels'] = [];
  for (const m of body.matchAll(
    /\/\/ level(\d): box-shadow: (-?\d+)px (-?\d+)px (-?\d+)px (-?\d+)px;/g,
  )) {
    const level = Number(m[1]);
    if (level !== levels.length)
      throw new Error(`_elevation.scss: ${heading} level ${String(level)} out of order`);
    levels.push([Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])]);
  }
  if (levels.length !== 6)
    throw new Error(`_elevation.scss: ${heading} has ${String(levels.length)} levels`);
  const opacity = /\n\s*opacity: ([\d.]+);/.exec(body);
  if (!opacity) throw new Error(`_elevation.scss: ${heading} has no opacity`);
  const line = scss.slice(0, start + opacity.index + 1).split('\n').length;
  return { opacity: Number(opacity[1]), levels, line };
}

export const parseElevationShadows = (scss: string): ElevationShadows => {
  const src = scss.replace(/\r\n/g, '\n');
  return { key: layer(src, '// Key box shadow'), ambient: layer(src, '// Ambient box shadow') };
};

/** CSS `box-shadow` for `level` with the shadow color role, or `none` for a flat level. */
export function boxShadow(shadows: ElevationShadows, level: number, colorVar: string): string {
  const parts = [shadows.key, shadows.ambient].flatMap((l) => {
    const geometry = l.levels[level];
    if (!geometry) throw new Error(`no elevation level ${String(level)}`);
    if (geometry.every((v) => v === 0)) return [];
    const [x, y, blur, spread] = geometry.map((v) => (v === 0 ? '0' : `${String(v)}px`));
    const percent = `${String(Math.round(l.opacity * 1000) / 10)}%`;
    return [
      `${x!} ${y!} ${blur!} ${spread!} color-mix(in srgb, var(${colorVar}) ${percent}, transparent)`,
    ];
  });
  return parts.length === 0 ? 'none' : parts.join(', ');
}
