// A CSS / Compose `CubicBezierEasing(a, b, c, d)`: the curve from (0, 0) to (1, 1) with control
// points (a, b) and (c, d), solved for y at x = fraction (animation-core Easing.kt@19991f2c: x is
// solved for its first root in [0, 1], y evaluated there; fractions outside ]0, 1[ pass through).
// Compose solves the cubic in closed form (ui-graphics Bezier.kt); this solves it numerically
// (Newton steps, bisection fallback) to well under 1e-6, which no frame can tell apart.

export type Easing = (fraction: number) => number;

const curve = (p1: number, p2: number, t: number) => {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
};
const slope = (p1: number, p2: number, t: number) => {
  const u = 1 - t;
  return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (1 - p2);
};

/** `cubic-bezier(a, b, c, d)` as an easing function. */
export function cubicBezier(a: number, b: number, c: number, d: number): Easing {
  return (fraction) => {
    if (!(fraction > 0 && fraction < 1)) return fraction;
    let t = fraction;
    for (let i = 0; i < 8; i++) {
      const error = curve(a, c, t) - fraction;
      if (Math.abs(error) < 1e-7) return curve(b, d, t);
      const s = slope(a, c, t);
      if (Math.abs(s) < 1e-6) break;
      t = Math.min(1, Math.max(0, t - error / s));
    }
    let lo = 0;
    let hi = 1;
    t = fraction;
    for (let i = 0; i < 40; i++) {
      const x = curve(a, c, t);
      if (Math.abs(x - fraction) < 1e-7) break;
      if (x < fraction) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return curve(b, d, t);
  };
}

/** Parses a resolved CSS `cubic-bezier(a, b, c, d)` (e.g. a motion easing token); null otherwise. */
export function parseCubicBezier(css: string): Easing | null {
  const m = /cubic-bezier\(([^)]*)\)/.exec(css);
  const values = m?.[1]?.split(',').map(Number);
  if (values?.length !== 4 || values.some((v) => !Number.isFinite(v))) return null;
  const [a, b, c, d] = values as [number, number, number, number];
  return cubicBezier(a, b, c, d);
}
