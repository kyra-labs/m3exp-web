// Reference values worked by hand from Slider.kt@19991f2c (the line refs in slider.ts).
import { describe, expect, it } from 'vitest';
import {
  SLIDER_KEY_DIVISIONS,
  sliderClosestThumb,
  sliderFraction,
  sliderKeyAction,
  sliderKeyDelta,
  sliderKeyValue,
  sliderPageSteps,
  sliderSnap,
  sliderSteps,
  sliderThumbBounds,
  sliderThumbValue,
  sliderTickFractions,
  sliderTrackGeometry,
} from './slider.js';

describe('steps and ticks', () => {
  it('maps a web step to Compose steps (stops between the ends)', () => {
    // StepsSliderSample: 0..100 in tens = steps 9.
    expect(sliderSteps(0, 100, 10)).toBe(9);
    expect(sliderSteps(0, 1, 0.25)).toBe(3);
    expect(sliderSteps(0, 1, 1)).toBe(0);
    expect(sliderSteps(0, 1)).toBe(0);
    expect(sliderSteps(0, 1, 0)).toBe(0);
    expect(sliderSteps(-50, 50, 10)).toBe(9);
  });

  it('stepsToTickFractions: steps + 2 fractions i / (steps + 1)', () => {
    expect(sliderTickFractions(0)).toEqual([]);
    expect(sliderTickFractions(3)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('snapValueToTick picks the nearest tick (the first of equals)', () => {
    expect(sliderSnap(34, 9, 0, 100)).toBe(30);
    expect(sliderSnap(36, 9, 0, 100)).toBe(40);
    expect(sliderSnap(35, 9, 0, 100)).toBe(30);
    expect(sliderSnap(0.3333, 0, 0, 1)).toBe(0.3333);
  });

  it('calcFraction is coerced into 0..1', () => {
    expect(sliderFraction(25, 0, 100)).toBe(0.25);
    expect(sliderFraction(-5, 0, 100)).toBe(0);
    expect(sliderFraction(3, 3, 3)).toBe(0);
  });
});

describe('thumb values', () => {
  it('coerces into the thumb bounds, then snaps: range thumbs cannot cross', () => {
    const values = [20, 60];
    expect(sliderThumbBounds(values, 0, 0, 100)).toEqual({ min: 0, max: 60 });
    expect(sliderThumbBounds(values, 1, 0, 100)).toEqual({ min: 20, max: 100 });
    // Start dragged past the end: stops at the end thumb.
    expect(sliderThumbValue(80, sliderThumbBounds(values, 0, 0, 100), 0, 0, 100)).toBe(60);
    expect(sliderThumbValue(5, sliderThumbBounds(values, 1, 0, 100), 0, 0, 100)).toBe(20);
    expect(sliderThumbValue(57, { min: 0, max: 100 }, 9, 0, 100)).toBe(60);
  });

  it('a press moves the closer range thumb; stacked thumbs: start if the press is before them', () => {
    expect(sliderClosestThumb([20, 60], 30)).toBe(0);
    expect(sliderClosestThumb([20, 60], 50)).toBe(1);
    expect(sliderClosestThumb([20, 60], 40)).toBe(1);
    expect(sliderClosestThumb([50, 50], 40)).toBe(0);
    expect(sliderClosestThumb([50, 50], 60)).toBe(1);
    expect(sliderClosestThumb([30], 90)).toBe(0);
  });
});

describe('keys (slideOnKeyEvents / rangeSliderOnKeyEvents)', () => {
  it('a key step is range / (steps + 1), 1 % without steps', () => {
    expect(SLIDER_KEY_DIVISIONS).toBe(100);
    expect(sliderKeyDelta(9, 0, 100)).toBe(10);
    expect(sliderKeyDelta(0, 0, 1)).toBe(0.01);
    expect(sliderKeyDelta(0, 0, 200)).toBe(2);
  });

  it('a page is clamp(actualSteps / 10, 1, 10) steps', () => {
    expect(sliderPageSteps(0)).toBe(10); // 100 / 10
    expect(sliderPageSteps(9)).toBe(1); // 10 / 10
    expect(sliderPageSteps(3)).toBe(1); // 4 / 10 → 0 → 1
    expect(sliderPageSteps(49)).toBe(5);
    expect(sliderPageSteps(999)).toBe(10);
  });

  it('keyboard steps equal the step', () => {
    expect(sliderKeyValue('increment', [40], 0, 9, 0, 100)).toBe(50);
    expect(sliderKeyValue('decrement', [40], 0, 9, 0, 100)).toBe(30);
    expect(sliderKeyValue('increment', [100], 0, 9, 0, 100)).toBe(100);
    expect(sliderKeyValue('page-increment', [0.5], 0, 0, 0, 1)).toBeCloseTo(0.6, 10);
    expect(sliderKeyValue('increment', [0.5], 0, 0, 0, 1)).toBeCloseTo(0.51, 10);
    expect(sliderKeyValue('min', [40], 0, 9, 0, 100)).toBe(0);
    expect(sliderKeyValue('max', [40], 0, 9, 0, 100)).toBe(100);
  });

  it('range: Home / End stop at the other thumb; arrows cannot cross it', () => {
    expect(sliderKeyValue('max', [20, 60], 0, 0, 0, 100)).toBe(60);
    expect(sliderKeyValue('min', [20, 60], 1, 0, 0, 100)).toBe(20);
    expect(sliderKeyValue('increment', [60, 60], 0, 9, 0, 100)).toBe(60);
    expect(sliderKeyValue('decrement', [60, 60], 1, 9, 0, 100)).toBe(60);
  });

  it('maps keys: ArrowRight / ArrowLeft mirror in RTL; vertical up increases', () => {
    expect(sliderKeyAction('ArrowRight')).toBe('increment');
    expect(sliderKeyAction('ArrowLeft')).toBe('decrement');
    expect(sliderKeyAction('ArrowRight', { rtl: true })).toBe('decrement');
    expect(sliderKeyAction('ArrowLeft', { rtl: true })).toBe('increment');
    expect(sliderKeyAction('ArrowUp', { vertical: true })).toBe('increment');
    expect(sliderKeyAction('ArrowDown', { vertical: true })).toBe('decrement');
    expect(sliderKeyAction('ArrowRight', { vertical: true, rtl: true })).toBe('increment');
    expect(sliderKeyAction('ArrowUp')).toBe('increment');
    expect(sliderKeyAction('ArrowRight', { shiftKey: true })).toBe('page-increment');
    expect(sliderKeyAction('PageDown')).toBe('page-decrement');
    expect(sliderKeyAction('Home')).toBe('min');
    expect(sliderKeyAction('End')).toBe('max');
    expect(sliderKeyAction('Enter')).toBeNull();
  });
});

describe('track geometry (SliderImpl + drawTrack)', () => {
  // A 404dp slider at XS: a 400dp track, 8dp corners, 2dp inside corners, 4dp thumb, 6dp gaps.
  const base = {
    length: 400,
    cornerSize: 8,
    insideCornerSize: 2,
    thumbWidth: 4,
    gapSize: 6,
    steps: 0,
  };

  it('standard: active [0, x − 8], inactive [x + 8, 400], stop at 392', () => {
    const g = sliderTrackGeometry({ ...base, fraction: 0.4 });
    expect(g.thumbs).toEqual([160]);
    expect(g.parts).toEqual([
      { kind: 'inactive-end', start: 168, end: 400, startRadius: 2, endRadius: 8 },
      { kind: 'active', start: 0, end: 152, startRadius: 8, endRadius: 2 },
    ]);
    expect(g.stops).toEqual([392]);
    expect(g.ticks).toEqual([]);
  });

  it('parts at or under the corner size are not drawn (no corner shrinking)', () => {
    // x = 16: the active part is 8dp long (= corner) → not drawn.
    expect(sliderTrackGeometry({ ...base, fraction: 0.04 }).parts.map((p) => p.kind)).toEqual([
      'inactive-end',
    ]);
    // Shrinking corners (Track(trackCornerSize)): drawn from any length.
    expect(
      sliderTrackGeometry({ ...base, fraction: 0.04, cornerShrinking: true }).parts.map(
        (p) => p.kind,
      ),
    ).toEqual(['inactive-end', 'active']);
    // At the end the inactive part and its stop go.
    const end = sliderTrackGeometry({ ...base, fraction: 1 });
    expect(end.parts.map((p) => p.kind)).toEqual(['active']);
    expect(end.stops).toEqual([]);
  });

  it('steps: a value off the end ticks sits between the corners; ticks skip the gap and the stop', () => {
    const g = sliderTrackGeometry({ ...base, steps: 4, fraction: 0.4 });
    // (400 − 16) × 0.4 + 8 = 161.6
    expect(g.thumbs[0]).toBeCloseTo(161.6, 10);
    // Ticks at 8 + i × 76.8: 8, 84.8, 161.6 (in the gap), 238.4, 315.2, 392 (the stop).
    expect(g.ticks.map((t) => [Number(t.position.toFixed(1)), t.active])).toEqual([
      [8, true],
      [84.8, true],
      [238.4, false],
      [315.2, false],
    ]);
    expect(sliderTrackGeometry({ ...base, steps: 4, fraction: 1 }).thumbs).toEqual([400]);
  });

  it('range: stops at both ends, the active part between the gaps', () => {
    const g = sliderTrackGeometry({ ...base, fraction: 0.7, startFraction: 0.2 });
    expect(g.thumbs).toEqual([80, 280]);
    expect(g.parts).toEqual([
      { kind: 'inactive-start', start: 0, end: 72, startRadius: 8, endRadius: 2 },
      { kind: 'inactive-end', start: 288, end: 400, startRadius: 2, endRadius: 8 },
      { kind: 'active', start: 88, end: 272, startRadius: 2, endRadius: 2 },
    ]);
    expect(g.stops).toEqual([8, 392]);
  });

  it('centered: the active part runs from the centre; no thumb width in the centre gap past it', () => {
    const before = sliderTrackGeometry({
      ...base,
      fraction: 0.3,
      centered: true,
      cornerShrinking: true,
    });
    // x = 120: start gap 8, end gap (no end thumb) 6.
    expect(before.parts).toEqual([
      { kind: 'inactive-start', start: 0, end: 112, startRadius: 8, endRadius: 2 },
      { kind: 'inactive-end', start: 206, end: 400, startRadius: 2, endRadius: 8 },
      { kind: 'active', start: 128, end: 200, startRadius: 2, endRadius: 2 },
    ]);
    const after = sliderTrackGeometry({
      ...base,
      fraction: 0.8,
      centered: true,
      cornerShrinking: true,
    });
    expect(after.parts).toEqual([
      { kind: 'inactive-start', start: 0, end: 194, startRadius: 8, endRadius: 2 },
      { kind: 'inactive-end', start: 328, end: 400, startRadius: 2, endRadius: 8 },
      { kind: 'active', start: 200, end: 312, startRadius: 2, endRadius: 2 },
    ]);
    const centre = sliderTrackGeometry({
      ...base,
      fraction: 0.5,
      centered: true,
      cornerShrinking: true,
    });
    expect(centre.parts.map((p) => [p.kind, p.start, p.end])).toEqual([
      ['inactive-start', 0, 192],
      ['inactive-end', 208, 400],
    ]);
    expect(centre.stops).toEqual([8, 392]);
  });

  it('centered ticks: the centre gap hides the ticks around the centre', () => {
    const g = sliderTrackGeometry({
      ...base,
      steps: 9,
      fraction: 0.7,
      centered: true,
      cornerShrinking: true,
    });
    // Ticks every 38.4 from 8; the centre tick (200) and the thumb tick (276.8) are hidden.
    expect(g.ticks.map((t) => Number(t.position.toFixed(1)))).toEqual([
      46.4, 84.8, 123.2, 161.6, 238.4, 315.2, 353.6,
    ]);
    expect(g.ticks.filter((t) => t.active).map((t) => Number(t.position.toFixed(1)))).toEqual([
      238.4,
    ]);
  });

  it('without stop indicators (inset icon) the end ticks are drawn', () => {
    const g = sliderTrackGeometry({ ...base, steps: 1, fraction: 0, stopIndicator: false });
    expect(g.stops).toEqual([]);
    expect(g.ticks.map((t) => t.position)).toEqual([200, 392]);
  });
});
