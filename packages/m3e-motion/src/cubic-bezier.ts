// A CSS / Compose `CubicBezierEasing(a, b, c, d)`: the curve from (0, 0) to (1, 1) with control
// points (a, b) and (c, d), solved for y at x = fraction (animation-core Easing.kt@19991f2c: x is
// solved for its first root in [0, 1], y evaluated there; fractions outside ]0, 1[ pass through).
// Compose solves the cubic in closed form (ui-graphics Bezier.kt); this bisects x(t), which is
// monotonic for control x in [0, 1], to 2^-30 (far below what a frame can show).

export type Easing = (fraction: number) => number;

const bezier = (p1: number, p2: number, t: number) =>
  3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;

/** `cubic-bezier(a, b, c, d)` as an easing function. */
export const cubicBezier =
  (a: number, b: number, c: number, d: number): Easing =>
  (fraction) => {
    if (!(fraction > 0 && fraction < 1)) return fraction;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (bezier(a, c, mid) < fraction) lo = mid;
      else hi = mid;
    }
    return bezier(b, d, (lo + hi) / 2);
  };

/** Parses a resolved CSS `cubic-bezier(a, b, c, d)` (e.g. a motion easing token); null otherwise. */
export function parseCubicBezier(css: string): Easing | null {
  const values = /cubic-bezier\(([^)]*)\)/.exec(css)?.[1]?.split(',').map(Number);
  return values?.length === 4 && values.every(Number.isFinite)
    ? cubicBezier(...(values as [number, number, number, number]))
    : null;
}
