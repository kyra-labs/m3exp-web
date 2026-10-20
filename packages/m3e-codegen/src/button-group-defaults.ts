// Values Compose's ButtonGroup.kt renders that are not in ButtonGroupSmallTokens /
// ConnectedButtonGroupSmallTokens: ButtonGroupDefaults.ExpandedRatio, the motion-scheme spring the
// press expansion uses, and the release wait of EnlargeOnPressNode (a released item keeps growing
// until it is 75 % expanded, at most 1 s, before it springs back). Each is read with a targeted
// regex from the vendored file and cited by line.
//
// Compose ButtonGroup is not size-aware: it spaces items with ButtonGroupSmallTokens and shapes
// connected items with ConnectedButtonGroupSmallTokens whatever the button size. The other sizes
// (XS, M, L, XL) come from m3.material.io (source priority 2, CLAUDE.md): its token DB set
// md.comp.button-group.{standard,connected}.{xsmall,medium,large,xlarge}, which also lists the
// small values; the generator checks those against the Compose tokens.

export interface ButtonGroupDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts (number, or the var()/time string). */
  js: number | string;
  /** Source expression as written upstream (or the token DB value). */
  raw: string;
  owner: string;
  member: string;
  /** Vendored file and line (Compose rows). */
  file?: string;
  line?: number;
  /** Full citation for rows that come from m3.material.io. */
  cite?: string;
  note?: string;
}

const FILE = 'ButtonGroup.kt';

export const BUTTON_GROUP_DEFAULTS_SOURCES = [FILE];

/** m3.material.io token DB the per-size values come from (read 2026-10-15). */
export const BUTTON_GROUP_DSDB =
  'm3.material.io token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.082d7fd6e058b011.json, Button groups › Tokens & specs)';

interface Rule {
  /** Variable name without `--m3e-comp-button-group-`. */
  name: string;
  owner: string;
  member: string;
  /** First capture group is the value; `d` flag required for its line. */
  pattern: RegExp;
  kind: 'float' | 'millis' | 'spring';
  note?: string;
}

const RULES: readonly Rule[] = [
  {
    name: 'expanded-ratio',
    owner: 'ButtonGroupDefaults',
    member: 'ExpandedRatio',
    pattern: /public val ExpandedRatio: Float = ([\d.]+)f/d,
    kind: 'float',
    note: 'share of the pressed item width it grows by (middle items: half to each side); m3.material.io token DB: md.comp.button-group.standard.*.pressed.item.width.multiplier = 15% at every size',
  },
  {
    name: 'width-spring',
    owner: 'ButtonGroup',
    member: 'defaultAnimationSpec',
    pattern: /val defaultAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    kind: 'spring',
    note: 'press expansion (animateWidth / EnlargeOnPressNode); upstream TODO: load from the component tokens; m3.material.io token DB: md.sys.motion.spring.fast.spatial at every size',
  },
  {
    name: 'release-threshold',
    owner: 'EnlargeOnPressNode',
    member: 'waitUntil { pressedAnimatable.value > … }',
    pattern: /waitUntil \{ pressedAnimatable\.value > ([\d.]+)f \}/d,
    kind: 'float',
    note: 'on release, the item keeps expanding until it passes this fraction before it springs back',
  },
  {
    name: 'release-max-wait',
    owner: FILE,
    member: 'MAX_WAIT_TIME_MILLIS',
    pattern: /private const val MAX_WAIT_TIME_MILLIS = ([\d_]+)L/d,
    kind: 'millis',
    note: 'longest a release waits for the threshold',
  },
];

/** Wiring the emitted values depend on (fails the generator if upstream changes it). */
const WIRING: readonly [what: string, pattern: RegExp][] = [
  [
    'standard spacing = ButtonGroupSmallTokens.BetweenSpace',
    /HorizontalArrangement: Arrangement\.Horizontal =\s*Arrangement\.spacedBy\(ButtonGroupSmallTokens\.BetweenSpace\)/,
  ],
  [
    'connected spacing = ConnectedButtonGroupSmallTokens.BetweenSpace',
    /ConnectedSpaceBetween: Dp = ConnectedButtonGroupSmallTokens\.BetweenSpace/,
  ],
  [
    'connected checked shape = CornerFull',
    /connectedButtonCheckedShape: RoundedCornerShape = ShapeTokens\.CornerFull/,
  ],
  [
    'connected pressed inner corners',
    /topEnd = ConnectedButtonGroupSmallTokens\.PressedInnerCornerCornerSize/,
  ],
  [
    'compression limit = end content padding',
    /ButtonDefaults\.ContentPadding\.calculateEndPadding\(layoutDirection\)/,
  ],
];

type DsdbSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

/** Token DB size names → the size words the generated Compose token objects use. */
const SIZE_WORDS: Readonly<Record<DsdbSize, string>> = {
  xsmall: 'x-small',
  small: 'small',
  medium: 'medium',
  large: 'large',
  xlarge: 'x-large',
};

type DsdbValue = { dp: number } | { space: number } | { corner: string } | { percent: number };

/**
 * md.comp.button-group.* from the token DB, verbatim: lengths in dp, md.sys.measurement.space*
 * and md.sys.shape.corner-value.* references, percentages.
 */
export const BUTTON_GROUP_DSDB_TOKENS: Readonly<
  Record<DsdbSize, { standard: DsdbValue; connected: Record<string, DsdbValue> }>
> = {
  xsmall: {
    standard: { dp: 18 },
    connected: {
      'between-space': { space: 25 },
      'inner-corner.corner-size': { corner: 'small' },
      'pressed.inner-corner.corner-size': { corner: 'extra-small' },
      'selected.inner-corner.corner-size': { percent: 50 },
    },
  },
  small: {
    standard: { space: 150 },
    connected: {
      'between-space': { space: 25 },
      'inner-corner.corner-size': { corner: 'small' },
      'pressed.inner-corner.corner-size': { corner: 'extra-small' },
      'selected.inner-corner.corner-size': { percent: 50 },
    },
  },
  medium: {
    standard: { space: 100 },
    connected: {
      'between-space': { space: 25 },
      'inner-corner.corner-size': { corner: 'small' },
      'pressed.inner-corner.corner-size': { corner: 'extra-small' },
      'selected.inner-corner.corner-size': { percent: 50 },
    },
  },
  large: {
    standard: { space: 100 },
    connected: {
      'between-space': { space: 25 },
      'inner-corner.corner-size': { corner: 'large' },
      'pressed.inner-corner.corner-size': { corner: 'medium' },
      'selected.inner-corner.corner-size': { percent: 50 },
    },
  },
  xlarge: {
    standard: { space: 100 },
    connected: {
      'between-space': { space: 25 },
      'inner-corner.corner-size': { corner: 'large-increased' },
      'pressed.inner-corner.corner-size': { corner: 'large' },
      'selected.inner-corner.corner-size': { percent: 50 },
    },
  },
};

/** Connected token DB field → the suffix the generated Compose small tokens use. */
const CONNECTED_FIELDS: readonly [field: string, suffix: string][] = [
  ['between-space', 'between-space'],
  ['inner-corner.corner-size', 'inner-corner-corner-size'],
  ['pressed.inner-corner.corner-size', 'inner-corner-corner-size-pressed'],
  ['selected.inner-corner.corner-size', 'inner-corner-corner-size-percent-selected'],
];

/** Resolved px of the md.sys tokens the DB references (FOUNDATIONS; generated sys tokens). */
const SPACE_DP = (step: number) => (8 * step) / 100;

function dsdbCss(v: DsdbValue): { value: string; js: number | string; raw: string; dp?: number } {
  if ('dp' in v)
    return { value: `${String(v.dp)}px`, js: v.dp, raw: `${String(v.dp)}dp`, dp: v.dp };
  if ('space' in v) {
    const value = `var(--m3e-sys-space-${String(v.space)})`;
    return {
      value,
      js: value,
      raw: `md.sys.measurement.space${String(v.space)}`,
      dp: SPACE_DP(v.space),
    };
  }
  if ('corner' in v) {
    const value = `var(--m3e-sys-shape-corner-value-${v.corner})`;
    return { value, js: value, raw: `md.sys.shape.corner-value.${v.corner}` };
  }
  return { value: String(v.percent), js: v.percent, raw: `${String(v.percent)}%` };
}

/**
 * The per-size values Compose lacks, from the token DB. `small` is not emitted (the Compose
 * ButtonGroupSmallTokens / ConnectedButtonGroupSmallTokens already are); `checkSmall` compares it.
 */
function dsdbDefaults(): ButtonGroupDefault[] {
  const out: ButtonGroupDefault[] = [];
  for (const size of ['xsmall', 'medium', 'large', 'xlarge'] as const) {
    const words = SIZE_WORDS[size];
    const standard = dsdbCss(BUTTON_GROUP_DSDB_TOKENS[size].standard);
    out.push({
      name: `--m3e-comp-button-group-${words}-between-space`,
      value: standard.value,
      js: standard.js,
      raw: standard.raw,
      owner: `md.comp.button-group.standard.${size}`,
      member: 'between-space',
      cite: BUTTON_GROUP_DSDB,
      note: 'Compose spaces every size with ButtonGroupSmallTokens; m3.material.io specs: XS 18, S 12, M/L/XL 8 "to ensure a minimum accessible target size of 48dp"',
    });
    for (const [field, suffix] of CONNECTED_FIELDS) {
      const v = BUTTON_GROUP_DSDB_TOKENS[size].connected[field]!;
      const css = dsdbCss(v);
      out.push({
        name: `--m3e-comp-connected-button-group-${words}-${suffix}`,
        value: css.value,
        js: css.js,
        raw: css.raw,
        owner: `md.comp.button-group.connected.${size}`,
        member: field,
        cite: BUTTON_GROUP_DSDB,
        ...(size === 'xsmall' && field === 'inner-corner.corner-size'
          ? {
              note: 'SOURCES #63: Compose renders ConnectedButtonGroupSmallTokens.InnerCornerCornerSize (8dp) at every size (ButtonGroup.kt L195–245) and the token DB agrees; only the m3.material.io Measurements caption says XS 4dp',
            }
          : {}),
      });
    }
  }
  return out;
}

/**
 * The token DB's small values must equal the Compose small tokens (generated from
 * ButtonGroupSmallTokens.kt / ConnectedButtonGroupSmallTokens.kt), or the table above is stale.
 */
export function checkSmallAgainstCompose(
  composeSmall: Readonly<Record<string, string>>,
  sysPx: Readonly<Record<string, number>>,
): void {
  const resolve = (value: string): number | string => {
    const ref = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
    if (ref !== undefined) return sysPx[ref] ?? value;
    return value.endsWith('px') ? Number.parseFloat(value) : value;
  };
  const small = BUTTON_GROUP_DSDB_TOKENS.small;
  const expected: [string, DsdbValue][] = [
    ['--m3e-comp-button-group-small-between-space', small.standard],
    ...CONNECTED_FIELDS.map(([field, suffix]): [string, DsdbValue] => [
      `--m3e-comp-connected-button-group-small-${suffix}`,
      small.connected[field]!,
    ]),
  ];
  for (const [name, v] of expected) {
    const compose = composeSmall[name];
    if (compose === undefined) throw new Error(`${name} missing from the Compose tokens`);
    const css = dsdbCss(v);
    const want = css.dp ?? resolve(css.value);
    if (resolve(compose) !== want) {
      throw new Error(`${name}: Compose ${compose} ≠ m3.material.io token DB ${css.raw}`);
    }
  }
}

export function extractButtonGroupDefaults(
  sources: Readonly<Record<string, string>>,
): ButtonGroupDefault[] {
  const text = sources[FILE]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`${FILE} is not vendored`);
  for (const [what, pattern] of WIRING) {
    if (!pattern.test(text)) throw new Error(`${FILE}: ${what} changed upstream`);
  }
  const compose = RULES.flatMap((rule): ButtonGroupDefault[] => {
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined) {
      throw new Error(
        `${FILE}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    }
    const captured = match[1]!;
    const base = {
      owner: rule.owner,
      member: rule.member,
      file: FILE,
      line: text.slice(0, at).split('\n').length,
      ...(rule.note === undefined ? {} : { note: rule.note }),
    };
    const name = `--m3e-comp-button-group-${rule.name}`;
    switch (rule.kind) {
      case 'float': {
        const n = Number(captured);
        return [{ ...base, name, value: String(n), js: n, raw: `${captured}f` }];
      }
      case 'millis': {
        const n = Number(captured.replace(/_/g, ''));
        return [{ ...base, name, value: `${String(n)}ms`, js: n, raw: `${captured}L` }];
      }
      case 'spring': {
        const token = captured.replace(/[A-Z]/g, (c, i: number) =>
          i === 0 ? c.toLowerCase() : `-${c.toLowerCase()}`,
        );
        return (['damping-ratio', 'stiffness', 'duration'] as const).map((field) => {
          const value = `var(--m3e-sys-motion-spring-${token}-${field})`;
          return {
            ...base,
            name: `${name}-${field}`,
            value,
            js: value,
            raw: `MotionSchemeKeyTokens.${captured}`,
          };
        });
      }
    }
  });
  return [...compose, ...dsdbDefaults()];
}
