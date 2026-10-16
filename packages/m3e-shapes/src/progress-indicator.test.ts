// Wavy progress geometry (Linear/CircularWavyProgressModifiers.kt) and the PathMeasure it cuts
// with. Android's PathMeasure needs Skia, so there is no JVM reference export: the checks compare
// with closed-form values (lengths, wave peaks, segment ends) and Compose's own formulas.
import { describe, expect, it } from 'vitest';
import {
  circularProgressIndicatorTokens as circular,
  linearProgressIndicatorTokens as linear,
} from '../../m3e-tokens/src/generated/components.js';
import { type PathCommand, pathBounds } from './path.js';
import { PathMeasure } from './path-measure.js';
import {
  CircularWavyPathCache,
  LinearWavyPathCache,
  linearWavyStopIndicator,
} from './progress-indicator.js';

const ends = (path: readonly PathCommand[]) => {
  const xs: number[] = [];
  for (const c of path) if (c.length > 2) xs.push(c[c.length - 2] as number);
  return { first: xs[0]!, last: xs[xs.length - 1]! };
};
const close = (actual: readonly PathCommand[], expected: readonly PathCommand[]) => {
  expect(actual.map((c) => c[0])).toEqual(expected.map((c) => c[0]));
  actual.forEach((c, i) => {
    c.slice(1).forEach((v, j) => {
      expect(v as number).toBeCloseTo(expected[i]![j + 1] as number, 6);
    });
  });
};
const points = (path: readonly PathCommand[]) =>
  path.flatMap((c) => {
    const out: [number, number][] = [];
    for (let i = 1; i + 1 < c.length; i += 2) out.push([c[i] as number, c[i + 1] as number]);
    return out;
  });

describe('PathMeasure (Skia SkContourMeasure semantics)', () => {
  it('measures lines and curves', () => {
    expect(
      new PathMeasure([
        ['M', 0, 0],
        ['L', 30, 40],
      ]).length,
    ).toBeCloseTo(50, 9);
    // A cubic quarter circle of radius 100 (κ = 0.5523) is 157.08 long within 0.03%.
    const k = 55.22847498;
    const quarter = new PathMeasure([
      ['M', 100, 0],
      ['C', 100, k, k, 100, 0, 100],
    ]);
    expect(quarter.length).toBeCloseTo((Math.PI * 100) / 2, 1);
  });

  it('measures the first contour only, closing it when asked', () => {
    const square: PathCommand[] = [
      ['M', 0, 0],
      ['L', 10, 0],
      ['L', 10, 10],
      ['L', 0, 10],
    ];
    expect(new PathMeasure(square).length).toBeCloseTo(30, 9);
    expect(new PathMeasure(square, true).length).toBeCloseTo(40, 9);
    expect(new PathMeasure([...square, ['Z'], ['M', 50, 50], ['L', 90, 50]]).length).toBeCloseTo(
      40,
      9,
    );
  });

  it('cuts segments by distance, clamped; start > stop is empty; start == stop a zero-length line', () => {
    const m = new PathMeasure([
      ['M', 0, 0],
      ['L', 10, 0],
      ['L', 10, 10],
    ]);
    expect(m.getSegment(5, 15)).toEqual([
      ['M', 5, 0],
      ['L', 10, 0],
      ['L', 10, 5],
    ]);
    expect(m.getSegment(-5, 2)).toEqual([
      ['M', 0, 0],
      ['L', 2, 0],
    ]);
    expect(m.getSegment(12, 99)).toEqual([
      ['M', 10, 2],
      ['L', 10, 10],
    ]);
    expect(m.getSegment(6, 4)).toEqual([]);
    expect(m.getSegment(4, 4)).toEqual([
      ['M', 4, 0],
      ['L', 4, 0],
    ]);
  });

  it('cuts curves at the interpolated parameter, preserving their shape', () => {
    const q: PathCommand[] = [
      ['M', 0, 0],
      ['Q', 10, 20, 20, 0],
    ];
    const m = new PathMeasure(q);
    const half = m.getSegment(0, m.length / 2);
    // Symmetric curve: half its length ends at the apex (10, 10).
    const [x, y] = points(half).at(-1)!;
    expect(x).toBeCloseTo(10, 2);
    expect(y).toBeCloseTo(10, 2);
    expect(new PathMeasure(half).length).toBeCloseTo(m.length / 2, 2);
  });
});

describe('linear wavy paths (LinearProgressDrawingCache)', () => {
  const base = {
    width: 240,
    height: linear.waveHeight,
    wavelength: linear.activeWaveWavelength,
    stroke: linear.activeThickness,
    trackStroke: linear.trackThickness,
    gap: linear.trackActiveSpace,
    waveOffset: 0,
  };

  it('a flat determinate bar: progress from the cap to p·w, the track after the gap and both caps', () => {
    const cache = new LinearWavyPathCache();
    const { progress, track, capWidth } = cache.paths({
      ...base,
      fractions: [0, 0.5],
      amplitude: 0,
    });
    expect(capWidth).toBe(2);
    close(progress[0]!, [
      ['M', 2, 5],
      ['L', 120, 5],
    ]);
    // Track from the end (w − cap) back to head + gap + 2 caps.
    close(track, [
      ['M', 238, 5],
      ['L', 120 + 4 + 4, 5],
      ['M', 2, 5],
    ]);
  });

  it('gap = min(progress length, gap token) while the progress enters the track', () => {
    const cache = new LinearWavyPathCache();
    // barHead 3px: past the 2px cap by 1px, so the gap is 1px (plus the caps).
    const small = cache.paths({ ...base, fractions: [0, 3 / 240], amplitude: 0 });
    expect(small.track[1]).toEqual(['L', 3 + 1 + 4, 5]);
    // Before the head passes the cap, no progress room: gap 0, the caps only touch.
    const tiny = cache.paths({ ...base, fractions: [0, 1 / 240], amplitude: 0 });
    expect(tiny.track[1]).toEqual(['L', 2, 5]);
  });

  it('no progress part at 0; the track spans the whole bar', () => {
    const { progress, track } = new LinearWavyPathCache().paths({
      ...base,
      fractions: [0, 0],
      amplitude: 0,
    });
    expect(progress[0]).toEqual([]);
    expect(track).toEqual([
      ['M', 238, 5],
      ['L', 2, 5],
      ['L', 2, 5],
    ]);
  });

  it('the wave peaks at (height − stroke) / 2 = ActiveWaveAmplitude, scaled by the amplitude', () => {
    const cache = new LinearWavyPathCache();
    const full = cache.paths({ ...base, fractions: [0, 0.9], amplitude: 1 }).progress[0]!;
    const ys = points(full).map(([, y]) => y);
    // Quadratic control points sit at ±(h − sw); the curve itself peaks at half of it.
    expect(Math.max(...ys) - 5).toBeCloseTo(base.height - base.stroke, 6);
    expect(linear.activeWaveAmplitude).toBe((base.height - base.stroke) / 2);
    const halfAmp = cache.paths({ ...base, fractions: [0, 0.9], amplitude: 0.5 }).progress[0]!;
    expect(Math.max(...points(halfAmp).map(([, y]) => y)) - 5).toBeCloseTo(
      (base.height - base.stroke) / 2,
      6,
    );
  });

  it('a wave part spans the same x range; the offset shifts the wave by offset × wavelength', () => {
    const cache = new LinearWavyPathCache();
    const at = (waveOffset: number) =>
      cache.paths({ ...base, fractions: [0, 0.5], amplitude: 1, waveOffset }).progress[0]!;
    // Distances map to x by the mean path length per px (progressPathScale), as in Compose, so
    // the ends land within a fraction of a pixel of the cap and the head.
    const still = at(0);
    expect(Math.abs(ends(still).first - 2)).toBeLessThan(0.5);
    expect(Math.abs(ends(still).last - 120)).toBeLessThan(0.5);
    const quarter = at(0.25);
    expect(Math.abs(ends(quarter).first - 2)).toBeLessThan(0.5);
    expect(Math.abs(ends(quarter).last - 120)).toBeLessThan(0.5);
    // A whole wavelength later the wave looks the same again.
    const whole = at(1);
    points(whole).forEach(([x, y], i) => {
      const [x0, y0] = points(still)[i]!;
      expect(x).toBeCloseTo(x0, 1);
      expect(y).toBeCloseTo(y0, 1);
    });
  });

  it('two indeterminate parts, the track drawn around both', () => {
    const { progress, track } = new LinearWavyPathCache().paths({
      ...base,
      // [first tail, first head, second tail, second head]: the first line leads.
      fractions: [0.6, 0.8, 0.1, 0.3],
      amplitude: 0,
    });
    close(progress[0]!, [
      ['M', 144, 5],
      ['L', 192, 5],
    ]);
    close(progress[1]!, [
      ['M', 24, 5],
      ['L', 72, 5],
    ]);
    close(track, [
      ['M', 238, 5],
      ['L', 192 + 8, 5],
      ['M', 144 - 8, 5],
      ['L', 72 + 8, 5],
      ['M', 24 - 8, 5],
      ['L', 2, 5],
    ]);
  });
});

describe('wavy linear stop indicator (drawStopIndicator)', () => {
  it('sits at the end; shrinks as the progress reaches it', () => {
    expect(linearWavyStopIndicator(0.5, 240, 4, 2, 4)).toEqual({ x: 236, size: 4 });
    // Progress end + insets reaches 1px past the dot's left edge (236): it shrinks by 1px.
    expect(linearWavyStopIndicator(235 / 240, 240, 4, 2, 4)).toEqual({ x: 237, size: 3 });
    expect(linearWavyStopIndicator(1, 240, 4, 2, 4)).toBeNull();
    // Smaller than a thick track: offset by a quarter of it.
    expect(linearWavyStopIndicator(0.5, 240, 4, 4, 8)).toEqual({ x: 234, size: 4 });
  });
});

describe('circular wavy paths (CircularShapes + CircularProgressDrawingCache)', () => {
  const base = {
    size: circular.waveSize,
    wavelength: circular.activeWaveWavelength,
    stroke: circular.activeThickness,
    trackStroke: circular.trackThickness,
    gap: circular.trackActiveSpace,
    start: 0,
    waveOffset: 0,
    motion: false,
  };
  const radius = (path: readonly PathCommand[]) =>
    points(path).map(([x, y]) => Math.hypot(x - base.size / 2, y - base.size / 2));

  it('fits round(2πr / wavelength) waves (r inset by half the stroke), at least 5', () => {
    const cache = new CircularWavyPathCache();
    // 2π × 22 / 15 = 9.2 → 9.
    expect(cache.paths({ ...base, end: 0.5, amplitude: 1 }, false).vertexCount).toBe(9);
    expect(
      new CircularWavyPathCache().paths({ ...base, size: 12, end: 0.5, amplitude: 1 }, false)
        .vertexCount,
    ).toBe(5);
  });

  // The polygons are normalized to their approximate (control point) bounds, so the circle's
  // curve sits slightly inside (size − stroke) / 2: about 21.45px for 9 vertices at 48px.
  const trackRadius = (path: readonly PathCommand[]) => radius(path.filter((c) => c[0] !== 'C'));

  it('the track is a circle just inside (size − stroke) / 2, starting after the progress and the gap', () => {
    const { track } = new CircularWavyPathCache().paths(
      { ...base, end: 0.25, amplitude: 0 },
      false,
    );
    const radii = trackRadius(track);
    const r = radii[0]!;
    expect(r).toBeGreaterThan(21);
    expect(r).toBeLessThan(22);
    for (const each of radii) expect(each).toBeCloseTo(r, 1);
    const [x, y] = points(track)[0]!;
    const angle = (Math.atan2(y - 24, x - 24) * 180) / Math.PI;
    // Progress ends at 12 o'clock + 90° (3 o'clock); the track starts gap + 2 caps (8px) later.
    expect(angle).toBeCloseTo((8 / r) * (180 / Math.PI), 0);
  });

  it('progress starts at 12 o’clock and runs clockwise; the full wave stays inside the track circle', () => {
    const { progress } = new CircularWavyPathCache().paths(
      { ...base, end: 0.5, amplitude: 1 },
      false,
    );
    const [x0, y0] = points(progress)[0]!;
    expect(x0).toBeCloseTo(24, 0);
    expect(y0).toBeLessThan(24);
    const [x1, y1] = points(progress).at(-1)!;
    expect(x1).toBeCloseTo(24, 0);
    expect(y1).toBeGreaterThan(24);
    const [left, top, right, bottom] = pathBounds(progress);
    expect(Math.min(left, top)).toBeGreaterThanOrEqual(1.9);
    expect(Math.max(right, bottom)).toBeLessThanOrEqual(46.1);
  });

  it('0% draws a zero-length progress segment (a dot with round caps) and the whole track', () => {
    const { progress, track } = new CircularWavyPathCache().paths(
      { ...base, end: 0, amplitude: 0 },
      false,
    );
    expect(progress).toHaveLength(2);
    expect(progress[1]![0]).toBe('L');
    expect(new PathMeasure(track).length).toBeCloseTo(2 * Math.PI * trackRadius(track)[0]!, 0);
  });

  it('the wave offset rotates the wave back: the segment ends stay put', () => {
    const cache = new CircularWavyPathCache();
    const input = { ...base, end: 0.5, amplitude: 1, motion: true };
    const a = cache.paths({ ...input, waveOffset: 0 }, false).progress;
    const b = cache.paths({ ...input, waveOffset: 0.37 }, false).progress;
    const [ax, ay] = points(a)[0]!;
    const [bx, by] = points(b)[0]!;
    // The start moves along the wave's radius only (it is on a different part of the wave).
    const angleA = Math.atan2(ay - 24, ax - 24);
    const angleB = Math.atan2(by - 24, bx - 24);
    expect(Math.abs(angleA - angleB)).toBeLessThan(0.05);
  });

  it('morphs between the circle and the star by amplitude once a morph is required', () => {
    const cache = new CircularWavyPathCache();
    const flat = cache.paths({ ...base, end: 0.99, amplitude: 0.0001 }, true).progress;
    for (const r of radius(flat.filter((c) => c[0] === 'M' || c[0] === 'L')))
      expect(r).toBeCloseTo(21.5, 0);
    const half = cache.paths({ ...base, end: 0.99, amplitude: 0.5 }, true).progress;
    const full = cache.paths({ ...base, end: 0.99, amplitude: 1 }, true).progress;
    const depth = (p: readonly PathCommand[]) => Math.max(...radius(p)) - Math.min(...radius(p));
    expect(depth(half)).toBeGreaterThan(depth(flat));
    expect(depth(full)).toBeGreaterThan(depth(half));
  });
});
