// Shared engine for the selection controls' `*-defaults` generators (checkbox-defaults.ts,
// radio-button-defaults.ts, switch-defaults.ts, chip-defaults.ts): the literals a composable renders that are not in its token file,
// each read from a vendored file with a targeted regex and cited by line, plus wiring CHECKS that
// throw when what the component CSS assumes changes upstream.
import { compVar, kebabName } from './names.js';

export interface ComposeLiteral {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts (dp / fraction number or the CSS string). */
  js: number | string;
  /** Source expression as written upstream. */
  raw: string;
  owner: string;
  member: string;
  /** Vendored file name. */
  file: string;
  line: number;
  /** Citation for a value that does not come from an androidx file. */
  cite?: string;
  note?: string;
}

export type LiteralKind =
  | 'dp'
  | 'fraction'
  | 'ms'
  | 'motion'
  | 'token'
  | 'type'
  | 'typeToken'
  | 'composite'
  | 'alpha'
  | 'shadow'
  | 'alias'
  | 'flag'
  | 'keyword';

export interface LiteralRule {
  kind: LiteralKind;
  name: string;
  owner: string;
  member: string;
  file: string;
  /**
   * First capture group: a literal, a motion key, a `<Object>Tokens.<Member>` reference (`type`:
   * a `MaterialTheme.typography` style; `typeToken`: a TypographyToken). `composite`: the color
   * token, then its alpha token, then the ColorScheme role it is composited over
   * (`fromToken(<color>).copy(alpha = <alpha>).compositeOver(<role>)`). `alpha`: the color token,
   * then its alpha token (`fromToken(<color>).copy(alpha = <alpha>)`, translucent). `shadow`: an
   * elevation token (`<Object>Tokens.<Member>Elevation`), emitted as its generated shadow.
   */
  pattern: RegExp;
  /** `flag`: the value emitted instead of the upstream default (an owner decision). */
  enabled?: boolean;
  /** `alias`: the emitted variable whose value this one repeats. */
  alias?: string;
  /** `keyword`: the Compose value looked up in KEYWORDS instead of the capture (an implied default). */
  keyword?: string;
  note?: string;
}

/** [file, what the CSS assumes, pattern that must match]. */
export type LiteralCheck = readonly [string, string, RegExp];

const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;
const TYPE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;

/** Compose values with a fixed CSS meaning. */
const KEYWORDS: Readonly<Record<string, string>> = {
  'Color.Transparent': 'transparent',
  'Color.Unspecified': 'currentcolor',
  'Dp.Unspecified': '0px',
  'snap(delayMillis = SnapAnimationDelay)': 'steps(1, jump-end)',
  // SnapSpec() (delay 0): the value jumps, a transition of no duration.
  'SnapSpec<Float>()': '0ms',
  CircleShape: 'var(--m3e-sys-shape-corner-full)',
};

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** `CheckboxTokens.SelectedIconColor` → `var(--m3e-comp-checkbox-icon-color-selected)`. */
const tokenVar = (ref: string) => {
  const [object, member] = ref.split('.') as [string, string];
  return `var(${compVar(object, member)})`;
};

/**
 * Runs `checks`, then `rules` in order, over `sources` (vendored Material3 files and samples by
 * name). `label` prefixes the errors (the generator's name).
 */
export function extractLiterals(
  label: string,
  files: readonly string[],
  rules: readonly LiteralRule[],
  checks: readonly LiteralCheck[],
  sources: Readonly<Record<string, string>>,
): ComposeLiteral[] {
  const texts = Object.fromEntries(files.map((file) => [file, normalize(sources[file], file)]));
  for (const [file, what, pattern] of checks) {
    if (!pattern.test(texts[file]!)) throw new Error(`${file}: ${what} (changed upstream?)`);
  }
  const out: ComposeLiteral[] = [];
  for (const rule of rules) out.push(...extractRule(label, rule, texts, out));
  return out;
}

function extractRule(
  label: string,
  rule: LiteralRule,
  texts: Readonly<Record<string, string>>,
  previous: readonly ComposeLiteral[],
): ComposeLiteral[] {
  const text = texts[rule.file]!;
  const match = rule.pattern.exec(text);
  const at = match?.indices?.[1]?.[0];
  if (!match || at === undefined)
    throw new Error(
      `${rule.file}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
    );
  const captured = match[1]!;
  const base = {
    name: rule.name,
    owner: rule.owner,
    member: rule.member,
    file: rule.file,
    line: text.slice(0, at).split('\n').length,
    ...(rule.note === undefined ? {} : { note: rule.note }),
  };
  switch (rule.kind) {
    case 'dp':
      return [{ ...base, value: `${captured}px`, js: Number(captured), raw: `${captured}.dp` }];
    case 'fraction':
      return [{ ...base, value: captured, js: Number(captured), raw: `${captured}f` }];
    case 'ms':
      return [
        { ...base, value: `${captured}ms`, js: Number(captured), raw: `${captured} (millis)` },
      ];
    case 'token':
      return [{ ...base, value: tokenVar(captured), js: tokenVar(captured), raw: captured }];
    case 'type': {
      // `bodyLarge` → `body-large`.
      const style = kebabName(captured[0]!.toUpperCase() + captured.slice(1));
      return TYPE_FIELDS.map((field) => ({
        ...base,
        name: `${rule.name}-${field}`,
        value: `var(--m3e-sys-typescale-${style}-${field})`,
        js: `var(--m3e-sys-typescale-${style}-${field})`,
        raw: `MaterialTheme.typography.${captured}`,
      }));
    }
    case 'typeToken': {
      // `ListTokens.ItemLabelTextFont` → the generated `--m3e-comp-list-item-label-text-*` set.
      const font = /^var\((--[\w-]+)-font\)$/.exec(tokenVar(captured));
      if (!font) throw new Error(`${label}: ${captured} is not a typography token`);
      return TYPE_FIELDS.map((field) => ({
        ...base,
        name: `${rule.name}-${field}`,
        value: `var(${font[1]!}-${field})`,
        js: `var(${font[1]!}-${field})`,
        raw: captured,
      }));
    }
    case 'composite': {
      // Color.copy(alpha).compositeOver(role): an opaque mix over the role, in sRGB (Compose
      // composites in the color's space; ColorScheme colors are sRGB).
      const alpha = match[2];
      const role = match[3];
      if (alpha === undefined || role === undefined)
        throw new Error(`${label}: ${rule.name} needs the alpha and role captures`);
      const over = kebabName(role[0]!.toUpperCase() + role.slice(1));
      const value = `color-mix(in srgb, ${tokenVar(captured)} calc(${tokenVar(alpha)} * 100%), var(--m3e-sys-color-${over}))`;
      return [
        {
          ...base,
          value,
          js: value,
          raw: `${captured}.copy(alpha = ${alpha}).compositeOver(${role})`,
        },
      ];
    }
    case 'alpha': {
      // Color.copy(alpha): translucent, drawn over whatever is behind (not composited).
      const alpha = match[2];
      if (alpha === undefined) throw new Error(`${label}: ${rule.name} needs the alpha capture`);
      const value = `color-mix(in srgb, ${tokenVar(captured)} calc(${tokenVar(alpha)} * 100%), transparent)`;
      return [{ ...base, value, js: value, raw: `${captured}.copy(alpha = ${alpha})` }];
    }
    case 'shadow': {
      // `FilterChipTokens.FlatSelectedHoverContainerElevation` → the generated
      // `--m3e-comp-filter-chip-flat-container-shadow-selected-hover` (the token generator emits
      // a shadow beside each elevation token).
      const elevation = tokenVar(captured);
      if (!elevation.includes('-elevation'))
        throw new Error(`${label}: ${captured} is not an elevation token`);
      const value = elevation.replace('-elevation', '-shadow');
      return [{ ...base, value, js: value, raw: captured }];
    }
    case 'motion':
      return SPRING_FIELDS.map((field) => ({
        ...base,
        name: `${rule.name}-${field}`,
        value: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
        js: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
        raw: `MotionSchemeKeyTokens.${captured}`,
      }));
    case 'flag':
      return [
        {
          ...base,
          value: (rule.enabled ?? captured === 'true') ? '1' : '0',
          js: (rule.enabled ?? captured === 'true') ? 1 : 0,
          raw: `${captured} (upstream default)`,
        },
      ];
    case 'keyword': {
      const raw = rule.keyword ?? captured;
      const keyword = KEYWORDS[raw];
      if (keyword === undefined) throw new Error(`${label}: no CSS for ${raw}`);
      return [{ ...base, value: keyword, js: keyword, raw }];
    }
    case 'alias': {
      const target = previous.find((d) => d.name === rule.alias);
      if (!target) throw new Error(`${label}: ${String(rule.alias)} must come first`);
      return [
        { ...base, value: target.value, js: target.js, raw: `${captured}(state) = ${target.raw}` },
      ];
    }
  }
}
