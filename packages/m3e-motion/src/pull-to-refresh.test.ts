// The pull-to-refresh math against Compose: the JVM reference dump (`pnpm reference:pull-to-refresh`,
// __fixtures__/pull-to-refresh-reference.json), which runs PullToRefresh.kt@19991f2c's node
// bookkeeping (consumeAvailableOffset, calculateVerticalOffset, onRelease, the animations'
// `finally`s) and the arrow's PullToRefreshArrowValues / drawing code verbatim, compared bit for bit; plus the
// SVG paths the web draws from that geometry.
import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/pull-to-refresh-reference.json' with { type: 'json' };
import {
  PULL_TO_REFRESH_DRAG_MULTIPLIER,
  PULL_TO_REFRESH_MAX_ALPHA,
  PULL_TO_REFRESH_MIN_ALPHA,
  PullToRefreshPull,
  pullToRefreshArrowGeometry,
  pullToRefreshArrowPaths,
  pullToRefreshArrowValues,
  pullToRefreshIndicatorTranslation,
  pullToRefreshLoadingIndicatorRotation,
  pullToRefreshVerticalOffset,
} from './pull-to-refresh.js';

const f = Math.fround;
const fs = (values: readonly number[]) => values.map((v) => f(v));

describe('constants', () => {
  it('match PullToRefresh.kt', () => {
    expect(PULL_TO_REFRESH_DRAG_MULTIPLIER).toBe(f(reference.dragMultiplier));
    expect(PULL_TO_REFRESH_MIN_ALPHA).toBe(f(reference.minAlpha));
    expect(PULL_TO_REFRESH_MAX_ALPHA).toBe(f(reference.maxAlpha));
  });
});

describe('arrow (CircularArrowProgressIndicator)', () => {
  it.each(reference.arrows.map((a) => [a.progress, a.density, a] as const))(
    'progress %f at density %f matches the reference',
    (progress, density, a) => {
      const values = pullToRefreshArrowValues(f(progress));
      expect(values).toEqual({
        rotation: f(a.rotation),
        startAngle: f(a.startAngle),
        endAngle: f(a.endAngle),
        scale: f(a.scale),
      });
      const g = pullToRefreshArrowGeometry(f(progress), f(density));
      expect(g.size).toBe(a.size);
      expect([g.rotation]).toEqual(fs(a.arcRotations));
      expect([
        g.arc.left,
        g.arc.top,
        g.arc.width,
        g.arc.height,
        g.arc.startAngle,
        g.arc.sweepAngle,
        g.strokeWidth,
      ]).toEqual(fs(a.arc));
      expect([...g.points]).toEqual(fs(a.points));
      expect([g.rotation, g.arrowRotation]).toEqual(fs(a.arrowRotations));
      expect(g.strokeWidth).toBe(f(a.arrowStroke));
    },
  );

  it('draws nothing below 40% (no sweep, no arrow)', () => {
    expect(pullToRefreshArrowPaths(pullToRefreshArrowGeometry(0.4))).toEqual({
      arc: '',
      arrow: '',
    });
    expect(pullToRefreshArrowPaths(pullToRefreshArrowGeometry(0))).toEqual({ arc: '', arrow: '' });
  });

  it('draws the arc from its start angle clockwise, rotated about the center', () => {
    const g = pullToRefreshArrowGeometry(1);
    const { arc, arrow } = pullToRefreshArrowPaths(g);
    // At the threshold: 80% of a turn, a large arc, radius 6.75 about (8, 8).
    expect(g.arc.sweepAngle).toBe(f(f(0.8) * 360));
    const m = /^M([\d.-]+) ([\d.-]+)A6\.75 6\.75 0 1 1 ([\d.-]+) ([\d.-]+)$/.exec(arc);
    expect(m).not.toBeNull();
    const angle = ((g.arc.startAngle + g.rotation) * Math.PI) / 180;
    expect(Number(m![1])).toBeCloseTo(8 + 6.75 * Math.cos(angle), 3);
    expect(Number(m![2])).toBeCloseTo(8 + 6.75 * Math.sin(angle), 3);
    const end = ((g.arc.startAngle + g.arc.sweepAngle + g.rotation) * Math.PI) / 180;
    expect(Number(m![3])).toBeCloseTo(8 + 6.75 * Math.cos(end), 3);
    expect(Number(m![4])).toBeCloseTo(8 + 6.75 * Math.sin(end), 3);
    // The arrow: three points, its corners 10dp apart (full scale), the tip 5dp from their line.
    const pts = arrow
      .slice(1)
      .split('L')
      .map((p) => p.split(' ').map(Number) as [number, number]);
    expect(pts).toHaveLength(3);
    const [a, tip, b] = pts as [[number, number], [number, number], [number, number]];
    expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(10, 3);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    expect(Math.hypot(tip[0] - mid[0]!, tip[1] - mid[1]!)).toBeCloseTo(5, 3);
  });

  it('uses a small-arc flag up to 180°', () => {
    const g = pullToRefreshArrowGeometry(0.7);
    expect(g.arc.sweepAngle).toBeLessThan(180);
    expect(pullToRefreshArrowPaths(g).arc).toMatch(/A6\.75 6\.75 0 0 1 /);
  });
});

describe('PullToRefreshPull (PullToRefreshModifierNode)', () => {
  it.each(reference.drags.map((d) => [d.name, d] as const))('%s matches the reference', (_, d) => {
    const pull = new PullToRefreshPull(d.thresholdPx);
    for (const step of d.steps) {
      const consumed = pull.consume(f(step.available), d.refreshing);
      expect(consumed).toBe(f(step.consumed));
      expect(pull.distancePulled).toBe(f(step.distancePulled));
      expect(pull.verticalOffset).toBe(f(step.verticalOffset));
      expect(pull.distanceFraction).toBe(f(step.fraction));
    }
    const refreshed = pull.release(d.refreshing);
    expect(refreshed).toBe(d.refreshed);
    pull.reset(false);
    expect(pull.distancePulled).toBe(f(d.afterRelease.distancePulled));
    expect(pull.verticalOffset).toBe(f(d.afterRelease.verticalOffset));
    pull.reset(refreshed);
    expect(pull.distancePulled).toBe(f(d.afterRefreshing.distancePulled));
    expect(pull.verticalOffset).toBe(f(d.afterRefreshing.verticalOffset));
  });

  it('caps the indicator at twice the threshold', () => {
    expect(pullToRefreshVerticalOffset(80, 80)).toBe(80);
    expect(pullToRefreshVerticalOffset(240, 80)).toBe(160);
    expect(pullToRefreshVerticalOffset(10_000, 80)).toBe(160);
    expect(pullToRefreshVerticalOffset(40, 80)).toBe(40);
  });

  it('refreshes only past the threshold (strictly), never while refreshing', () => {
    const pull = new PullToRefreshPull(80);
    pull.consume(160, false);
    expect(pull.release(false)).toBe(false);
    pull.consume(0.5, false);
    expect(pull.release(false)).toBe(true);
    expect(pull.release(true)).toBe(false);
  });
});

describe('indicator box', () => {
  it('translates by the fraction of the max distance, from its own height above', () => {
    expect(pullToRefreshIndicatorTranslation(0, 80, 40)).toBe(-40);
    expect(pullToRefreshIndicatorTranslation(1, 80, 40)).toBe(40);
    expect(pullToRefreshIndicatorTranslation(0.5, 80, 48)).toBe(-8);
    expect(pullToRefreshIndicatorTranslation(2, 80.4, 40)).toBe(120);
  });

  it('rotates the loading indicator counterclockwise past the threshold only', () => {
    expect(pullToRefreshLoadingIndicatorRotation(0.5)).toBe(0);
    expect(pullToRefreshLoadingIndicatorRotation(1)).toBe(0);
    expect(pullToRefreshLoadingIndicatorRotation(1.5)).toBe(-90);
    expect(pullToRefreshLoadingIndicatorRotation(2)).toBe(-180);
  });
});
