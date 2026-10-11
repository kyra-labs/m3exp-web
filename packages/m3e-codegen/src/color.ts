// Baseline (static) color scheme: Compose `expressiveLightColorScheme()` for light and
// `darkColorScheme()` for dark, resolved from ColorLightTokens / ColorDarkTokens / PaletteTokens.
import type { Expr, Member, TokenFile } from './kotlin.js';

export interface BaselineColor {
  /** camelCase role, e.g. `onPrimaryContainer`. */
  role: string;
  hex: string;
  /** Source of the value, e.g. `ColorLightTokens.Primary → PaletteTokens.Primary40`. */
  via: string;
  file: string;
  line: number;
  note?: string;
}

export interface Baseline {
  light: BaselineColor[];
  dark: BaselineColor[];
}

type Parsed = ReadonlyMap<string, TokenFile & { file: string }>;

const hex2 = (n: number) => n.toString(16).padStart(2, '0');
const camel = (name: string) => name[0]!.toLowerCase() + name.slice(1);

/**
 * Parses the `expressiveLightColorScheme()` body in ColorScheme.kt: a `lightColorScheme(...)` call
 * whose only arguments are `role = PaletteTokens.X` overrides.
 */
export function expressiveLightOverrides(colorSchemeKt: string): {
  overrides: Map<string, string>;
  line: number;
} {
  const src = colorSchemeKt.replace(/\r\n/g, '\n');
  const match =
    /fun expressiveLightColorScheme\(\): ColorScheme =\s*lightColorScheme\(([\s\S]*?)\n\s*\)/.exec(
      src,
    );
  if (!match) throw new Error('ColorScheme.kt: expressiveLightColorScheme() not found');
  const overrides = new Map<string, string>();
  for (const raw of match[1]!.split('\n')) {
    const line = raw
      .replace(/\/\/.*$/, '')
      .trim()
      .replace(/,$/, '');
    if (!line) continue;
    const arg = /^(\w+) = PaletteTokens\.(\w+)$/.exec(line);
    if (!arg)
      throw new Error(`ColorScheme.kt: unexpected expressiveLightColorScheme argument "${line}"`);
    overrides.set(arg[1]!, arg[2]!);
  }
  return { overrides, line: src.slice(0, match.index).split('\n').length };
}

/** Compose `Color` constants used by the UI defaults read here (ui-graphics `Color.kt`). */
const NAMED_COLORS: Readonly<Record<string, string>> = { Black: '#000000', White: '#ffffff' };

/**
 * `DefaultShadowColor` from compose/ui GraphicsLayerScope.kt: the color of every layer shadow.
 * ColorScheme has no shadow role, so this is the baseline `shadow` (MCU's `shadow` for themes).
 */
export function defaultShadowColor(graphicsLayerScopeKt: string): BaselineColor {
  const src = graphicsLayerScopeKt.replace(/\r\n/g, '\n');
  const match = /public val DefaultShadowColor: Color\n\s*get\(\) = Color\.(\w+)\n/.exec(src);
  const hex = match ? NAMED_COLORS[match[1]!] : undefined;
  if (!match || !hex) throw new Error('GraphicsLayerScope.kt: DefaultShadowColor not found');
  return {
    role: 'shadow',
    hex,
    via: `DefaultShadowColor → Color.${match[1]!}`,
    file: 'GraphicsLayerScope.kt',
    line: src.slice(0, match.index).split('\n').length,
    note: 'Compose UI default; ColorScheme has no shadow role',
  };
}

export function baselineColors(
  parsed: Parsed,
  colorSchemeKt: string,
  graphicsLayerScopeKt: string,
): Baseline {
  const palette = parsed.get('PaletteTokens');
  if (!palette) throw new Error('PaletteTokens missing');
  const paletteHex = (member: string): string => {
    const m = palette.members.find((p) => p.name === member);
    if (m?.expr.kind !== 'rgb') throw new Error(`PaletteTokens.${member} is not an rgb color`);
    return `#${hex2(m.expr.red)}${hex2(m.expr.green)}${hex2(m.expr.blue)}`;
  };

  const scheme = (object: string): BaselineColor[] => {
    const tokens = parsed.get(object);
    if (!tokens) throw new Error(`${object} missing`);
    const resolve = (m: Member, expr: Expr, depth = 0): { hex: string; via: string } => {
      if (depth > 4) throw new Error(`${object}.${m.name}: reference cycle`);
      if (expr.kind === 'ref' && expr.object === 'PaletteTokens') {
        return { hex: paletteHex(expr.member), via: `PaletteTokens.${expr.member}` };
      }
      if (expr.kind === 'ref' && expr.object === object) {
        const target = tokens.members.find((t) => t.name === expr.member);
        if (!target) throw new Error(`${object}.${expr.member} missing`);
        const inner = resolve(target, target.expr, depth + 1);
        return { hex: inner.hex, via: `${object}.${expr.member} → ${inner.via}` };
      }
      throw new Error(`${object}.${m.name}: unsupported color ${expr.kind}`);
    };
    return tokens.members.map((m) => {
      const { hex, via } = resolve(m, m.expr);
      return {
        role: camel(m.name),
        hex,
        via: `${object}.${m.name} → ${via}`,
        file: tokens.file,
        line: m.line,
      };
    });
  };

  const light = scheme('ColorLightTokens');
  const { overrides, line } = expressiveLightOverrides(colorSchemeKt);
  for (const [role, member] of overrides) {
    const entry = light.find((c) => c.role === role);
    if (!entry) throw new Error(`expressiveLightColorScheme overrides unknown role ${role}`);
    entry.hex = paletteHex(member);
    entry.via = `expressiveLightColorScheme(): ${role} = PaletteTokens.${member}`;
    entry.file = 'ColorScheme.kt';
    entry.line = line;
    entry.note = 'expressive override (MaterialExpressiveTheme default)';
  }
  const shadow = defaultShadowColor(graphicsLayerScopeKt);
  return { light: [...light, shadow], dark: [...scheme('ColorDarkTokens'), { ...shadow }] };
}
