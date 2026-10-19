import { describe, expect, it } from 'vitest';
import {
  SHEET_POSITIONAL_THRESHOLD,
  SHEET_VELOCITY_THRESHOLD,
  type SheetSpecs,
  SheetState,
  type SheetValue,
  bottomSheetAnchors,
  dampenSheetFlingVelocity,
} from './bottom-sheet.js';
import { springValue } from './spring.js';

// MotionScheme.expressive() (ExpressiveMotionTokens.kt@19991f2c) as BottomSheet reads it: show
// and the release settle DefaultSpatial, hide FastEffects (bottom-sheet-defaults.css, PARITY.md).
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };
const FAST_EFFECTS = { dampingRatio: 1, stiffness: 3800 };
const SPECS: SheetSpecs = { show: DEFAULT_SPATIAL, hide: FAST_EFFECTS, settle: DEFAULT_SPATIAL };
const ALL = new Set<SheetValue>(['hidden', 'partially-expanded', 'expanded']);

const run = (s: SheetState, t0: number) => {
  let t = t0;
  let highest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 1000; i++) {
    const frame = s.sample(t);
    highest = Math.min(highest, frame.offset);
    if (!frame.running) break;
    t += 16;
  }
  return { t, highest };
};

describe('bottomSheetAnchors (BottomSheetImpl / StandardBottomSheet)', () => {
  it('a tall sheet: Hidden at the container, PartiallyExpanded at half, Expanded at the top', () => {
    const a = bottomSheetAnchors({ fullHeight: 800, sheetHeight: 700 }, ALL);
    expect(a.keys).toEqual(['hidden', 'partially-expanded', 'expanded']);
    expect(
      ['hidden', 'partially-expanded', 'expanded'].map((k) => a.positionOf(k as SheetValue)),
    ).toEqual([800, 400, 100]);
  });

  // isBottomSheetPartiallyExpandedDeterministicEnabled (true at the pin): a sheet shorter than
  // half the container keeps PartiallyExpanded, converged with Expanded (ModalBottomSheetTest's
  // defaultStateForSmallContentIsFullExpanded checks the same position with the flag off).
  it('a short sheet: PartiallyExpanded converges with Expanded', () => {
    const a = bottomSheetAnchors({ fullHeight: 800, sheetHeight: 300 }, ALL);
    expect(a.positionOf('partially-expanded')).toBe(500);
    expect(a.positionOf('expanded')).toBe(500);
  });

  it('skipPartiallyExpanded, an empty sheet', () => {
    const skip = new Set<SheetValue>(['hidden', 'expanded']);
    expect(bottomSheetAnchors({ fullHeight: 800, sheetHeight: 700 }, skip).keys).toEqual([
      'hidden',
      'expanded',
    ]);
    expect(bottomSheetAnchors({ fullHeight: 800, sheetHeight: 0 }, ALL).keys).toEqual([
      'hidden',
      'partially-expanded',
    ]);
  });

  it('a peek height (StandardBottomSheet): PartiallyExpanded shows the peek; Hidden only when enabled', () => {
    const scaffold = new Set<SheetValue>(['partially-expanded', 'expanded']);
    const a = bottomSheetAnchors({ fullHeight: 800, sheetHeight: 500, peekHeight: 56 }, scaffold);
    expect(a.keys).toEqual(['partially-expanded', 'expanded']);
    expect(a.positionOf('partially-expanded')).toBe(744);
    expect(a.positionOf('expanded')).toBe(300);
    const withHidden = bottomSheetAnchors(
      { fullHeight: 800, sheetHeight: 500, peekHeight: 56 },
      ALL,
    );
    expect(withHidden.positionOf('hidden')).toBe(800);
  });
});

describe('dampenSheetFlingVelocity (BottomSheetImpl fling behavior)', () => {
  const a = bottomSheetAnchors({ fullHeight: 800, sheetHeight: 700 }, ALL);

  it('scales a downward fling by (distance / 125dp)² within 125dp of Hidden', () => {
    expect(dampenSheetFlingVelocity(100, 800 - 62.5, a)).toBeCloseTo(25, 9);
    expect(dampenSheetFlingVelocity(100, 600, a)).toBe(100);
    expect(dampenSheetFlingVelocity(-3000, 790, a)).toBe(-3000);
  });

  it('keeps a valid fling at the velocity threshold', () => {
    expect(dampenSheetFlingVelocity(2000, 790, a)).toBe(SHEET_VELOCITY_THRESHOLD);
  });
});

describe('SheetState', () => {
  const tall = { fullHeight: 800, sheetHeight: 700 };

  it('show() goes to PartiallyExpanded on the default spatial spring, overshooting upwards', () => {
    const s = new SheetState();
    s.updateLayout(tall);
    expect([s.currentValue, s.offset, s.isVisible]).toEqual(['hidden', 800, false]);
    expect(s.show(SPECS, 0)).toBe(true);
    s.sample(64);
    expect(s.offset).toBeCloseTo(springValue(DEFAULT_SPATIAL, 64, 800, 400), 6);
    const { highest } = run(s, 64);
    expect(highest).toBeLessThan(400);
    expect([s.currentValue, s.offset]).toEqual(['partially-expanded', 400]);
  });

  it('skipPartiallyExpanded: show() expands', () => {
    const s = new SheetState({ enabledValues: ['hidden', 'expanded'] });
    s.updateLayout(tall);
    s.show(SPECS, 0);
    run(s, 0);
    expect(s.currentValue).toBe('expanded');
  });

  it('the stretch past Expanded is the overflow (verticalScaleUp)', () => {
    const s = new SheetState({ enabledValues: ['hidden', 'expanded'] });
    s.updateLayout(tall);
    s.show(SPECS, 0);
    let overflow = 0;
    for (let t = 0; t < 1000; t += 16) overflow = Math.max(overflow, s.sample(t).overflow);
    expect(overflow).toBeGreaterThan(0);
  });

  it('hide() and partialExpand() run on the fast effects spring', () => {
    const s = new SheetState({ initialValue: 'expanded' });
    s.updateLayout(tall);
    expect(s.partialExpand(SPECS, 0)).toBe(true);
    s.sample(16);
    expect(s.offset).toBeCloseTo(springValue(FAST_EFFECTS, 16, 100, 400), 6);
    run(s, 16);
    expect(s.hide(SPECS, 1000)).toBe(true);
    run(s, 1000);
    expect([s.currentValue, s.isVisible]).toEqual(['hidden', false]);
  });

  // SheetStateTest.state_respectsConfirmValueChange (L317-361).
  it('confirmValueChange vetoes programmatic moves', () => {
    const s = new SheetState({
      initialValue: 'partially-expanded',
      confirmValueChange: () => false,
    });
    s.updateLayout(tall);
    expect(s.expand(SPECS, 0)).toBe(false);
    expect(s.hide(SPECS, 0)).toBe(false);
    expect(s.currentValue).toBe('partially-expanded');
  });

  it('hide() needs the Hidden state; partialExpand() the PartiallyExpanded one', () => {
    const s = new SheetState({ enabledValues: ['expanded'], initialValue: 'expanded' });
    s.updateLayout({ ...tall, peekHeight: 56 });
    expect(s.hide(SPECS, 0)).toBe(false);
    expect(s.partialExpand(SPECS, 0)).toBe(false);
    expect(() => new SheetState({ enabledValues: ['hidden'] })).toThrow(/Expanded/);
  });

  it('a drag down released past 56dp from PartiallyExpanded hides it', () => {
    const s = new SheetState({ initialValue: 'partially-expanded' });
    s.updateLayout(tall);
    s.startDrag(0);
    expect(s.dragBy(SHEET_POSITIONAL_THRESHOLD)).toBe(56);
    expect(s.release(10, SPECS, 0)).toBe('hidden');
    run(s, 0);
    expect(s.currentValue).toBe('hidden');
  });

  it('a short drag back released under both thresholds returns', () => {
    const s = new SheetState({ initialValue: 'partially-expanded' });
    s.updateLayout(tall);
    s.startDrag(0);
    s.dragBy(55);
    expect(s.release(100, SPECS, 0)).toBe('partially-expanded');
    run(s, 0);
    expect(s.offset).toBe(400);
  });

  it('a fling up from PartiallyExpanded expands, the settle cut at the anchor', () => {
    const s = new SheetState({ initialValue: 'partially-expanded' });
    s.updateLayout(tall);
    s.startDrag(0);
    s.dragBy(-10);
    expect(s.release(-2000, SPECS, 0)).toBe('expanded');
    const { highest } = run(s, 0);
    expect(highest).toBe(100);
    expect(s.currentValue).toBe('expanded');
  });

  // BottomSheetTest.bottomSheet_smallSheet_escapesDampeningAndDismisses (L404-440): a 100dp sheet
  // in a 100dp box, PartiallyExpanded 50dp above Hidden; a swipe down dismisses it although the
  // fling starts inside the dampening zone.
  it('a small sheet escapes the dampening and dismisses', () => {
    const s = new SheetState({ initialValue: 'partially-expanded' });
    s.updateLayout({ fullHeight: 100, sheetHeight: 100 });
    expect(s.offset).toBe(50);
    s.startDrag(0);
    s.dragBy(20);
    expect(s.release(1500, SPECS, 0)).toBe('hidden');
    run(s, 0);
    expect(s.isVisible).toBe(false);
  });

  // SheetStateTest.state_*_anchorChangeHandler_previousTargetNotInAnchors_reconciles (L475-590)
  // and BottomSheetImpl's shouldPromoteToExpanded: a converged PartiallyExpanded target becomes
  // Expanded when the sheet grows.
  it('anchor changes keep the target; a converged PartiallyExpanded is promoted to Expanded', () => {
    const s = new SheetState();
    // An empty sheet: no Expanded anchor yet, PartiallyExpanded at the Hidden position.
    s.updateLayout({ fullHeight: 800, sheetHeight: 0 });
    s.show(SPECS, 0);
    expect([s.currentValue, s.offset]).toEqual(['partially-expanded', 800]);
    s.updateLayout({ fullHeight: 800, sheetHeight: 320 });
    expect([s.currentValue, s.offset]).toEqual(['partially-expanded', 480]);

    const short = new SheetState({ initialValue: 'partially-expanded' });
    short.updateLayout({ fullHeight: 800, sheetHeight: 300 });
    expect(short.offset).toBe(500);
    short.updateLayout({ fullHeight: 800, sheetHeight: 700 });
    expect([short.currentValue, short.offset]).toEqual(['expanded', 100]);
  });

  it('the drag handle (BottomSheetImpl / StandardBottomSheet clickable)', () => {
    const s = new SheetState({ initialValue: 'partially-expanded' });
    s.updateLayout(tall);
    expect(s.handleAction()).toBe('expand');
    s.snapTo('expanded');
    expect(s.handleAction()).toBe('dismiss');
    s.snapTo('hidden');
    expect(s.handleAction()).toBe('show');
    const scaffold = new SheetState({
      enabledValues: ['partially-expanded', 'expanded'],
      initialValue: 'expanded',
    });
    scaffold.updateLayout({ ...tall, peekHeight: 56 });
    expect(scaffold.handleAction()).toBe('partial-expand');
  });
});
