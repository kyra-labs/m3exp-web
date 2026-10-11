// System tokens with no androidx source at the pin. Values come from m3.material.io (source
// priority 2, CLAUDE.md) and are cross-checked against Material Web 2.5.0. Every entry cites
// both. Accessed 2026-10-11.

export interface SupplementaryToken {
  /** m3.material.io token name. */
  token: string;
  /** Value in dp. */
  dp: number;
  name: string;
  cite: string;
}

const DSDB =
  'm3.material.io token DB "Google Material 3" v38.2.9 (_dsm/data/dsdb-m3/2026-09-23_06-10-05/MEASUREMENT.20543ce18892f7d9.json)';

/** "State - focus indicator: Common focus indicator tokens for all components". */
export const FOCUS_INDICATOR: readonly SupplementaryToken[] = [
  ['thickness', 3],
  ['outer-offset', 2],
  ['inner-offset', -3],
].map(([field, dp]) => ({
  token: `md.sys.state.focus-indicator.${String(field)}`,
  dp: dp as number,
  name: `--m3e-sys-state-focus-indicator-${String(field)}`,
  cite: `${DSDB}; matches material-web v2.5.0 tokens/versions/latest/sass/_md-sys-state-focus-indicator.scss L18-23`,
}));

/**
 * Spacing scale: "measured on an 8dp scale, where space100 = 8dp" (m3.material.io/styles/spacing).
 * Not present in Compose Material3 at the pin.
 */
export const SPACE: readonly SupplementaryToken[] = [
  0, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 450, 500, 600, 700, 800, 900,
].map((step) => ({
  token: `md.sys.measurement.space${String(step)}`,
  dp: (8 * step) / 100,
  name: `--m3e-sys-space-${String(step)}`,
  cite: `${DSDB} set md.sys.measurement; matches material-web v2.5.0 labs/gb/styles/space/md-space-tokens.scss L6-27`,
}));

export interface SpringCurve {
  scheme: 'standard' | 'expressive';
  /** camelCase spring token, e.g. `fastSpatial`. */
  token: string;
  bezier: readonly [number, number, number, number];
  durationMillis: number;
}

export const SPRING_CURVES_CITE =
  'm3.material.io/styles/motion/overview/specs "Web: Convert springs to curves" (_dsm/content/m3/2026-09-23_06-10-05/ccf2c3e9-82b5-4c4a-9570-b0d08d95c0c1.json sections[1].contentBlocks[5], updated 2026-06-23)';

/**
 * Official cubic-bezier + duration stand-ins for the motion-scheme springs, for platforms without
 * springs. Verbatim from the m3.material.io table (the page lists "Curve" as four numbers; they are
 * cubic-bezier control points). No official token names exist for these.
 */
export const SPRING_CURVES: readonly SpringCurve[] = (
  [
    ['expressive', 'fastSpatial', [0.42, 1.67, 0.21, 0.9], 350],
    ['expressive', 'defaultSpatial', [0.38, 1.21, 0.22, 1.0], 500],
    ['expressive', 'slowSpatial', [0.39, 1.29, 0.35, 0.98], 650],
    ['expressive', 'fastEffects', [0.31, 0.94, 0.34, 1.0], 150],
    ['expressive', 'defaultEffects', [0.34, 0.8, 0.34, 1.0], 200],
    ['expressive', 'slowEffects', [0.34, 0.88, 0.34, 1.0], 300],
    ['standard', 'fastSpatial', [0.27, 1.06, 0.18, 1.0], 350],
    ['standard', 'defaultSpatial', [0.27, 1.06, 0.18, 1.0], 500],
    ['standard', 'slowSpatial', [0.27, 1.06, 0.18, 1.0], 750],
    ['standard', 'fastEffects', [0.31, 0.94, 0.34, 1.0], 150],
    ['standard', 'defaultEffects', [0.34, 0.8, 0.34, 1.0], 200],
    ['standard', 'slowEffects', [0.34, 0.88, 0.34, 1.0], 300],
  ] as const
).map(([scheme, token, bezier, durationMillis]) => ({ scheme, token, bezier, durationMillis }));
