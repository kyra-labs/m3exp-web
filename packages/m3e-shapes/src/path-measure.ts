// A Compose / Skia `PathMeasure` for the paths of this package: the length of a path's first
// contour and `getSegment(startD, stopD)` (Skia SkContourMeasure semantics: distances are clamped
// to [0, length], `startD > stopD` gives an empty path, and `startD == stopD` a zero-length line,
// which a round-capped stroke draws as a dot). Like Skia, curves are measured on a table of
// samples and cut at the parameter interpolated in it; Skia samples to a 0.5px tolerance, this
// uses a fixed number of samples per curve, so lengths differ from Android's by well under a pixel.
import type { PathCommand } from './path.js';

type Pts = readonly number[];
interface Seg {
  /** Control polygon: 2 (line), 3 (quadratic) or 4 (cubic) points, flattened. */
  p: Pts;
  /** Cumulative distance at the end of each sample (SAMPLES + 1 entries, starting at the offset). */
  d: number[];
}

const SAMPLES = 32;

/** de Casteljau point at `t` of a control polygon. */
function at(p: Pts, t: number): [number, number] {
  let q = [...p];
  while (q.length > 2) {
    const next: number[] = [];
    for (let i = 0; i + 3 < q.length; i += 2) {
      next.push(q[i]! + (q[i + 2]! - q[i]!) * t, q[i + 1]! + (q[i + 3]! - q[i + 1]!) * t);
    }
    q = next;
  }
  return [q[0]!, q[1]!];
}

/** The part of a control polygon from `t0` to `t1` (de Casteljau splits). */
function sub(p: Pts, t0: number, t1: number): number[] {
  // Split at t1 keeping the left part, then at t0 / t1 keeping the right part.
  const left = (q: Pts, t: number): number[] => {
    const out: number[] = [q[0]!, q[1]!];
    let r = [...q];
    while (r.length > 2) {
      const next: number[] = [];
      for (let i = 0; i + 3 < r.length; i += 2) {
        next.push(r[i]! + (r[i + 2]! - r[i]!) * t, r[i + 1]! + (r[i + 3]! - r[i + 1]!) * t);
      }
      out.push(next[0]!, next[1]!);
      r = next;
    }
    return out;
  };
  const reverse = (q: Pts) => {
    const out: number[] = [];
    for (let i = q.length - 2; i >= 0; i -= 2) out.push(q[i]!, q[i + 1]!);
    return out;
  };
  const head = t1 < 1 ? left(p, t1) : [...p];
  const s = t1 > 0 ? t0 / t1 : 0;
  return s > 0 ? reverse(left(reverse(head), 1 - s)) : head;
}

const command = (p: Pts): PathCommand =>
  p.length === 4
    ? ['L', p[2]!, p[3]!]
    : p.length === 6
      ? ['Q', p[2]!, p[3]!, p[4]!, p[5]!]
      : ['C', p[2]!, p[3]!, p[4]!, p[5]!, p[6]!, p[7]!];

export class PathMeasure {
  readonly #segs: Seg[] = [];
  /** Length of the first contour. */
  readonly length: number = 0;

  /**
   * Measures the first contour of `path`. With `forceClosed` (or a `Z`), a closing line back to
   * the contour's start is part of it.
   */
  constructor(path: readonly PathCommand[], forceClosed = false) {
    let x = 0;
    let y = 0;
    let startX = 0;
    let startY = 0;
    let total = 0;
    let started = false;
    let closed = forceClosed;
    const add = (p: Pts) => {
      const d = [total];
      let [px, py] = [p[0]!, p[1]!];
      for (let i = 1; i <= SAMPLES; i++) {
        const [qx, qy] = at(p, i / SAMPLES);
        total += Math.hypot(qx - px, qy - py);
        d.push(total);
        px = qx;
        py = qy;
      }
      // Zero-length segments are skipped, as in Skia.
      if (total > d[0]!) this.#segs.push({ p, d });
    };
    for (const c of path) {
      if (c[0] === 'M') {
        if (started) break;
        started = true;
        [x, y, startX, startY] = [c[1], c[2], c[1], c[2]];
        continue;
      }
      if (c[0] === 'Z') {
        closed = true;
        break;
      }
      const p = [x, y, ...c.slice(1)] as number[];
      add(p);
      x = p[p.length - 2]!;
      y = p[p.length - 1]!;
    }
    if (closed && (x !== startX || y !== startY)) add([x, y, startX, startY]);
    this.length = total;
  }

  /** The segment and its parameter at distance `d` (0 ≤ d ≤ length). */
  #find(d: number): [Seg, number] {
    const segs = this.#segs;
    let i = 0;
    while (i < segs.length - 1 && segs[i]!.d[SAMPLES]! < d) i++;
    const seg = segs[i]!;
    let k = 1;
    while (k < SAMPLES && seg.d[k]! < d) k++;
    const d0 = seg.d[k - 1]!;
    const d1 = seg.d[k]!;
    const t = (k - 1 + (d1 > d0 ? (d - d0) / (d1 - d0) : 0)) / SAMPLES;
    return [seg, Math.min(1, Math.max(0, t))];
  }

  /** Compose `PathMeasure.getSegment(startD, stopD, destination)` (moveTo first). */
  getSegment(startD: number, stopD: number): PathCommand[] {
    const start = Math.max(0, startD);
    const stop = Math.min(this.length, stopD);
    if (!(start <= stop) || this.#segs.length === 0) return [];
    const [seg0, t0] = this.#find(start);
    const [seg1, t1] = this.#find(stop);
    const [mx, my] = at(seg0.p, t0);
    const out: PathCommand[] = [['M', mx, my]];
    if (seg0 === seg1) {
      out.push(t0 === t1 ? ['L', mx, my] : command(sub(seg0.p, t0, t1)));
      return out;
    }
    const segs = this.#segs;
    out.push(command(sub(seg0.p, t0, 1)));
    for (let i = segs.indexOf(seg0) + 1; segs[i] !== seg1; i++) out.push(command(segs[i]!.p));
    out.push(command(sub(seg1.p, 0, t1)));
    return out;
  }
}
