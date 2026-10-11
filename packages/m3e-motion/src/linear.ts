// CSS `linear()` approximation of a spring (FOUNDATIONS §4).
//
// - Duration: Compose's own settle estimate (`FloatSpringSpec.getDurationNanos`) for a 0 → 1
//   animation at a visibility threshold of 0.001 (0.1% of the travel; e.g. Compose's 0.1 dp
//   Dp threshold over a 100 dp move).
// - Samples: the exact spring at every whole millisecond (Compose's time resolution), last stop
//   forced to 1 so the animation lands on its target.
// - Stops: Ramer–Douglas–Peucker in (progress, value) space with the smallest tolerance that fits
//   `maxStops`.
//
// Limits (FOUNDATIONS §4): no velocity carry-over on interruption and a fixed duration; use the JS
// spring for drags, rapid toggles and other interruptible motion.
import { type SpringSpec, springDurationMillis } from './spring.js';
import { SpringSimulation } from './spring-simulation.js';

export interface LinearEasingOptions {
  /** Fraction of the travel considered settled. Default 0.001. */
  visibilityThreshold?: number;
  /** Maximum stops in the `linear()` function (FOUNDATIONS §4: ≤ 40). Default 40. */
  maxStops?: number;
}

export interface LinearEasing {
  /** e.g. `linear(0, 0.1234 5%, …, 1)` */
  easing: string;
  durationMillis: number;
  /** `[progress 0–1, value]` pairs after rounding. */
  stops: readonly (readonly [number, number])[];
  /** Max |linear(t) − spring(t)| over every millisecond sample. */
  maxError: number;
}

const round = (n: number, digits: number) => {
  const r = Number(n.toFixed(digits));
  return Object.is(r, -0) ? 0 : r;
};

type Point = readonly [number, number];

function at<T>(list: readonly T[], i: number): T {
  const item = list[i];
  if (item === undefined) throw new RangeError(`index ${String(i)} out of range`);
  return item;
}

/** Ramer–Douglas–Peucker: indices of points to keep (vertical distance, monotone x). */
function simplify(points: readonly Point[], tolerance: number): number[] {
  const keep = new Set<number>([0, points.length - 1]);
  const stack: [number, number][] = [[0, points.length - 1]];
  for (let range = stack.pop(); range; range = stack.pop()) {
    const [a, b] = range;
    const [x0, y0] = at(points, a);
    const [x1, y1] = at(points, b);
    let worst = -1;
    let worstDistance = tolerance;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = at(points, i);
      const expected = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      const distance = Math.abs(y - expected);
      if (distance > worstDistance) {
        worst = i;
        worstDistance = distance;
      }
    }
    if (worst !== -1) {
      keep.add(worst);
      stack.push([a, worst], [worst, b]);
    }
  }
  return [...keep].sort((x, y) => x - y);
}

function interpolate(stops: readonly Point[], x: number): number {
  for (let i = 1; i < stops.length; i++) {
    const [x1, y1] = at(stops, i);
    const [x0, y0] = at(stops, i - 1);
    if (x <= x1) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return at(stops, stops.length - 1)[1];
}

export function springToLinear(spec: SpringSpec, options: LinearEasingOptions = {}): LinearEasing {
  const { visibilityThreshold = 0.001, maxStops = 40 } = options;
  if (maxStops < 2) throw new RangeError('maxStops must be at least 2');
  const durationMillis = Math.max(1, springDurationMillis(spec, 0, 1, 0, visibilityThreshold));

  const sim = new SpringSimulation(1);
  sim.dampingRatio = spec.dampingRatio;
  sim.stiffness = spec.stiffness;
  const samples: Point[] = [];
  for (let t = 0; t <= durationMillis; t++) {
    samples.push([t / durationMillis, sim.updateValues(0, 0, t).value]);
  }
  samples[samples.length - 1] = [1, 1];

  // Smallest tolerance (bisection) whose simplification fits maxStops.
  let lo = 0;
  let hi = 0.5;
  let best = simplify(samples, hi);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const kept = simplify(samples, mid);
    if (kept.length <= maxStops) {
      best = kept;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const stops = best.map((i) => {
    const [x, y] = at(samples, i);
    return [round(x, 4), round(y, 4)] as const;
  });
  const maxError = samples.reduce(
    (m, [x, y]) => Math.max(m, Math.abs(interpolate(stops, x) - y)),
    0,
  );
  const body = stops.map(([x, y], i) =>
    i === 0 || i === stops.length - 1 ? String(y) : `${String(y)} ${String(round(x * 100, 2))}%`,
  );
  return { easing: `linear(${body.join(', ')})`, durationMillis, stops, maxError };
}
