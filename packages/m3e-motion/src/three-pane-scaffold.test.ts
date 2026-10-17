import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/pane-motion-reference.json' with { type: 'json' };
import {
  LIST_DETAIL_ADAPT_STRATEGIES,
  LIST_DETAIL_INITIAL_HISTORY,
  LIST_DETAIL_PANE_ORDER,
  PANE_EXPANSION_SAMPLE_ANCHORS,
  type PaneAdaptedValue,
  SUPPORTING_PANE_ADAPT_STRATEGIES,
  SUPPORTING_PANE_ORDER,
  type ThreePaneScaffoldAdaptStrategies,
  ThreePaneScaffoldAnimation,
  type ThreePaneScaffoldDestinationItem,
  ThreePaneScaffoldNavigator,
  type ThreePaneScaffoldRole,
  type ThreePaneScaffoldValue,
  calculatePaneMotion,
  calculateThreePaneScaffoldValue,
  closestPaneExpansionAnchor,
  nextPaneExpansionAnchor,
  paneExpansionAnchorPosition,
  paneTransitions,
  threePaneScaffoldDirective,
  threePaneScaffoldLayout,
} from './three-pane-scaffold.js';
import { paneScaffoldDirective, windowSizeClass } from './window-size-class.js';

const value = (
  primary: PaneAdaptedValue,
  secondary: PaneAdaptedValue,
  tertiary: PaneAdaptedValue,
  currentDestination: ThreePaneScaffoldRole | null = null,
): ThreePaneScaffoldValue => ({ primary, secondary, tertiary, currentDestination });
const strip = ({ primary, secondary, tertiary }: ThreePaneScaffoldValue) => [
  primary,
  secondary,
  tertiary,
];
const dest = (pane: ThreePaneScaffoldRole, contentKey?: unknown) => ({ pane, contentKey });
const directive = (width: number, height = 800) =>
  paneScaffoldDirective(windowSizeClass({ width, height }));

// androidx ThreePaneScaffoldValueTest (adaptive-layout commonTest @19991f2c), with the hide
// strategy for every pane (MockAdaptStrategies' adapted states are Hidden for our port).
describe('calculateThreePaneScaffoldValue (ThreePaneScaffoldValueTest)', () => {
  const hide = LIST_DETAIL_ADAPT_STRATEGIES;
  it.each([
    ['onePaneLayout_noDestination', 1, [], ['expanded', 'hidden', 'hidden']],
    ['onePaneLayout', 1, [dest('tertiary'), dest('secondary')], ['hidden', 'expanded', 'hidden']],
    ['twoPaneLayout_noDestination', 2, [], ['expanded', 'expanded', 'hidden']],
    ['twoPaneLayout (no history)', 2, [dest('tertiary')], ['expanded', 'hidden', 'expanded']],
    ['twoPaneLayout', 2, [dest('tertiary'), dest('secondary')], ['hidden', 'expanded', 'expanded']],
    [
      'twoPaneLayout_longHistory',
      2,
      ['primary', 'tertiary', 'secondary', 'primary', 'tertiary'].map((p) =>
        dest(p as ThreePaneScaffoldRole),
      ),
      ['expanded', 'hidden', 'expanded'],
    ],
    ['threePaneLayout', 3, [dest('secondary')], ['expanded', 'expanded', 'expanded']],
  ] as const)('%s', (_name, partitions, history, expected) => {
    expect(
      strip(
        calculateThreePaneScaffoldValue(
          partitions,
          hide,
          history as readonly ThreePaneScaffoldDestinationItem[],
        ),
      ),
    ).toEqual(expected);
  });

  const reflow = (
    p: ThreePaneScaffoldAdaptStrategies['primary'],
    s: ThreePaneScaffoldAdaptStrategies['secondary'],
    t: ThreePaneScaffoldAdaptStrategies['tertiary'],
  ): ThreePaneScaffoldAdaptStrategies => ({ primary: p, secondary: s, tertiary: t });
  it.each([
    [
      'reflowCurrentDestination',
      reflow('hide', { reflowUnder: 'tertiary' }, 'hide'),
      [dest('secondary')],
      ['hidden', 'reflowed', 'expanded'],
    ],
    [
      'currentDestinationIsReflowAnchor',
      reflow('hide', 'hide', { reflowUnder: 'secondary' }),
      [dest('secondary')],
      ['hidden', 'expanded', 'reflowed'],
    ],
    [
      'currentDestinationIsNotReflowAnchor',
      reflow('hide', 'hide', { reflowUnder: 'secondary' }),
      [dest('primary')],
      ['expanded', 'hidden', 'hidden'],
    ],
    [
      'history: reflowCurrentDestination',
      reflow('hide', 'hide', { reflowUnder: 'secondary' }),
      [dest('secondary'), dest('primary'), dest('tertiary')],
      ['hidden', 'expanded', 'reflowed'],
    ],
    [
      'history: expandedPaneIsReflowAnchor',
      reflow('hide', 'hide', { reflowUnder: 'primary' }),
      [dest('tertiary'), dest('secondary'), dest('primary')],
      ['expanded', 'hidden', 'reflowed'],
    ],
    [
      'history: expandedPaneIsNotReflowAnchor',
      reflow('hide', 'hide', { reflowUnder: 'secondary' }),
      [dest('tertiary'), dest('secondary'), dest('primary')],
      ['expanded', 'hidden', 'hidden'],
    ],
    [
      'reflowPrimaryPaneWhenNoCurrentDestination',
      reflow({ reflowUnder: 'tertiary' }, 'hide', 'hide'),
      [],
      ['reflowed', 'hidden', 'expanded'],
    ],
  ] as const)('onePaneLayout with reflow: %s', (_name, strategies, history, expected) => {
    expect(
      strip(
        calculateThreePaneScaffoldValue(
          1,
          strategies,
          history as readonly ThreePaneScaffoldDestinationItem[],
          2,
        ),
      ),
    ).toEqual(expected);
  });

  it('never reflows with one vertical partition or two horizontal ones', () => {
    const s = reflow({ reflowUnder: 'tertiary' }, 'hide', 'hide');
    expect(strip(calculateThreePaneScaffoldValue(1, s, [], 1))).toEqual([
      'expanded',
      'hidden',
      'hidden',
    ]);
    expect(strip(calculateThreePaneScaffoldValue(2, s, [], 2))).toEqual([
      'expanded',
      'expanded',
      'hidden',
    ]);
  });

  it('supporting pane defaults: the supporting pane reflows under main at expanded height', () => {
    const tall = paneScaffoldDirective(windowSizeClass({ width: 700, height: 1000 }));
    expect(tall.maxVerticalPartitions).toBe(2);
    expect(
      strip(
        calculateThreePaneScaffoldValue(
          tall.maxHorizontalPartitions,
          SUPPORTING_PANE_ADAPT_STRATEGIES,
          [dest('primary')],
          tall.maxVerticalPartitions,
        ),
      ),
    ).toEqual(['expanded', 'reflowed', 'hidden']);
  });
});

describe('threePaneScaffoldDirective', () => {
  it.each([
    [400, 1, 1],
    [700, 1, 1],
    [1000, 2, 2],
    [1300, 3, 2],
    [1700, 3, 3],
  ])('%ipx: compose %i, recommended (default) %i', (width, compose, recommended) => {
    const sizeClass = windowSizeClass({ width, height: 800 });
    // Default: m3.material.io's recommendation (owner decision 2026-10-18).
    expect(threePaneScaffoldDirective(sizeClass).maxHorizontalPartitions).toBe(recommended);
    expect(
      threePaneScaffoldDirective(sizeClass, { paneRule: 'recommended' }).maxHorizontalPartitions,
    ).toBe(recommended);
    // Opt-in: Compose's calculatePaneScaffoldDirective, unchanged.
    const composeDirective = threePaneScaffoldDirective(sizeClass, { paneRule: 'compose' });
    expect(composeDirective).toEqual(paneScaffoldDirective(sizeClass));
    expect(composeDirective.maxHorizontalPartitions).toBe(compose);
  });

  it('a navigator at large shows two panes by default, three with the compose rule', () => {
    const large = windowSizeClass({ width: 1300, height: 800 });
    const nav = (paneRule?: 'compose' | 'recommended') =>
      new ThreePaneScaffoldNavigator({
        scaffoldDirective: threePaneScaffoldDirective(large, { paneRule }),
        adaptStrategies: LIST_DETAIL_ADAPT_STRATEGIES,
        initialDestinationHistory: [dest('secondary'), dest('primary'), dest('tertiary')],
      });
    expect(strip(nav().scaffoldValue)).toEqual(['expanded', 'hidden', 'expanded']);
    expect(strip(nav('compose').scaffoldValue)).toEqual(['expanded', 'expanded', 'expanded']);
  });
});

// androidx ListDetailPaneScaffoldNavigatorTest (adaptive-navigation androidDeviceTest @19991f2c).
describe('ThreePaneScaffoldNavigator (ListDetailPaneScaffoldNavigatorTest)', () => {
  const single = directive(400);
  const dual = directive(1000);
  const nav = (
    scaffoldDirective = single,
    initialDestinationHistory: readonly ThreePaneScaffoldDestinationItem<number>[] = LIST_DETAIL_INITIAL_HISTORY,
    isDestinationHistoryAware = true,
  ) =>
    new ThreePaneScaffoldNavigator<number>({
      scaffoldDirective,
      adaptStrategies: LIST_DETAIL_ADAPT_STRATEGIES,
      initialDestinationHistory,
      isDestinationHistoryAware,
    });

  it('singlePaneLayout_navigateTo_makeDestinationPaneExpanded', () => {
    const n = nav();
    expect(n.canNavigateBack()).toBe(false);
    expect(n.scaffoldValue.primary).toBe('hidden');
    n.navigateTo('primary', 0);
    expect(n.scaffoldValue.primary).toBe('expanded');
    expect(n.currentDestination).toEqual({ pane: 'primary', contentKey: 0 });
    expect(n.canNavigateBack()).toBe(true);
  });

  it('dualPaneLayout_navigateTo_keepDestinationPaneExpanded', () => {
    const n = nav(dual);
    expect(n.scaffoldValue.primary).toBe('expanded');
    n.navigateTo('primary', 0);
    expect(n.scaffoldValue.primary).toBe('expanded');
    expect(n.canNavigateBack()).toBe(false);
  });

  it('dualPaneLayout_navigateToExtra: hides the list unless history aware', () => {
    const notAware = nav(dual, LIST_DETAIL_INITIAL_HISTORY, false);
    notAware.navigateTo('tertiary', 0);
    expect(notAware.scaffoldValue.secondary).toBe('hidden');
    expect(notAware.canNavigateBack()).toBe(true);
    const aware = nav(dual);
    aware.navigateTo('tertiary', 0);
    expect(aware.scaffoldValue.secondary).toBe('expanded');
  });

  it('singlePaneLayout_navigateBack_makeDestinationPaneHidden', () => {
    const n = nav();
    n.navigateTo('primary', 0);
    expect(n.navigateBack()).toBe(true);
    expect(n.scaffoldValue.primary).toBe('hidden');
    expect(n.currentDestination).toEqual({ pane: 'secondary' });
    expect(n.canNavigateBack()).toBe(false);
  });

  it('dualPaneLayout back behaviors', () => {
    const history = [
      dest('secondary'),
      dest('primary', 0),
    ] as ThreePaneScaffoldDestinationItem<number>[];
    expect(nav(dual, history).canNavigateBack()).toBe(false);
    const pop = nav(dual, history);
    expect(pop.canNavigateBack('pop-latest')).toBe(true);
    pop.navigateBack('pop-latest');
    expect(pop.currentDestination?.pane).toBe('secondary');

    const three = [
      dest('secondary'),
      dest('primary', 0),
      dest('primary', 1),
    ] as ThreePaneScaffoldDestinationItem<number>[];
    const pane = nav(dual, three);
    expect(pane.canNavigateBack('pop-until-current-destination-change')).toBe(true);
    pane.navigateBack('pop-until-current-destination-change');
    expect(pane.currentDestination?.pane).toBe('secondary');
    expect(nav(dual, three.slice(1)).canNavigateBack('pop-until-current-destination-change')).toBe(
      false,
    );

    const content = nav(dual, three);
    content.navigateBack('pop-until-content-change');
    expect(content.currentDestination).toEqual({ pane: 'primary', contentKey: 0 });
    const valueOnly = nav(dual, [
      dest('secondary', 0),
      dest('primary', 0),
      dest('tertiary', 0),
    ] as ThreePaneScaffoldDestinationItem<number>[]);
    valueOnly.navigateBack('pop-until-content-change');
    expect(valueOnly.currentDestination).toEqual({ pane: 'primary', contentKey: 0 });
    expect(
      nav(dual, [
        dest('secondary', 0),
        dest('primary', 0),
      ] as ThreePaneScaffoldDestinationItem<number>[]).canNavigateBack('pop-until-content-change'),
    ).toBe(false);
  });

  it('history awareness: skips or keeps back stack entries', () => {
    const start = [
      dest('tertiary', 0),
      dest('secondary'),
    ] as ThreePaneScaffoldDestinationItem<number>[];
    const aware = nav(dual, start, true);
    expect(strip(aware.scaffoldValue)).toEqual(['hidden', 'expanded', 'expanded']);
    aware.navigateTo('primary', 0);
    expect(strip(aware.scaffoldValue)).toEqual(['expanded', 'expanded', 'hidden']);
    aware.navigateBack();
    expect(strip(aware.scaffoldValue)).toEqual(['hidden', 'expanded', 'expanded']);
    expect(aware.currentDestination?.pane).toBe('secondary');

    const notAware = nav(dual, start, false);
    expect(strip(notAware.scaffoldValue)).toEqual(['expanded', 'expanded', 'hidden']);
    notAware.navigateTo('primary', 0);
    notAware.navigateBack();
    expect(strip(notAware.scaffoldValue)).toEqual(['expanded', 'hidden', 'expanded']);
    expect(notAware.currentDestination).toEqual({ pane: 'tertiary', contentKey: 0 });
  });

  it('peekPreviousScaffoldValue, directive changes and listeners', () => {
    const n = nav();
    n.navigateTo('primary', 0);
    expect(strip(n.peekPreviousScaffoldValue('pop-latest'))).toEqual([
      'hidden',
      'expanded',
      'hidden',
    ]);
    let calls = 0;
    const off = n.subscribe(() => calls++);
    n.scaffoldDirective = dual;
    expect(strip(n.scaffoldValue)).toEqual(['expanded', 'expanded', 'hidden']);
    n.scaffoldDirective = directive(1100);
    expect(calls).toBe(1); // same value: no notification
    off();
    n.navigateBack();
    expect(calls).toBe(1);
  });
});

// androidx PaneMotionTest.test_allThreePaneMotions: every transition between the eight
// expanded / hidden combinations, order primary, secondary, tertiary.
describe('calculatePaneMotion (PaneMotionTest)', () => {
  const values = reference.values.map(([p, s, t]) =>
    value(p as PaneAdaptedValue, s as PaneAdaptedValue, t as PaneAdaptedValue),
  );
  it.each(values.map((from, i) => [i, from] as const))('from #%i', (i, from) => {
    values.forEach((to, j) => {
      const motions = calculatePaneMotion(from, to, ['primary', 'secondary', 'tertiary']);
      expect(
        [motions.primary, motions.secondary, motions.tertiary],
        `${String(i)} → ${String(j)}`,
      ).toEqual(reference.expected[i]![j]);
    });
  });
});

describe('threePaneScaffoldLayout (ThreePaneContentMeasurePolicy)', () => {
  const layout = (width: number, v: ThreePaneScaffoldValue, extra: object = {}) =>
    threePaneScaffoldLayout({
      width,
      height: 600,
      directive: directive(width),
      value: v,
      order: LIST_DETAIL_PANE_ORDER,
      adaptStrategies: LIST_DETAIL_ADAPT_STRATEGIES,
      ...extra,
    });

  it('single pane fills the width', () => {
    expect(layout(500, value('hidden', 'expanded', 'hidden')).panes).toEqual({
      secondary: { x: 0, y: 0, width: 500, height: 600 },
    });
  });

  it('two panes: list at its preferred 360, the rest to the detail (highest priority)', () => {
    const { panes, handleOffset } = layout(1000, value('expanded', 'expanded', 'hidden'));
    expect(panes.secondary).toEqual({ x: 0, y: 0, width: 360, height: 600 });
    expect(panes.primary).toEqual({ x: 384, y: 0, width: 616, height: 600 });
    expect(handleOffset).toBe(372);
  });

  it('three panes scale down when they do not fit (412 each from large)', () => {
    const { panes } = layout(1200, value('expanded', 'expanded', 'expanded'));
    // allocatable 1152, preferred 1236: scale 0.932… → trunc(412 × scale) = 384.
    expect(panes.secondary?.width).toBe(384);
    expect(panes.primary).toMatchObject({ x: 408, width: 384 });
    expect(panes.tertiary).toMatchObject({ x: 816, width: 384 });
  });

  it('the highest-priority expanded pane takes the rest when the detail is hidden', () => {
    const { panes } = layout(1000, value('hidden', 'expanded', 'expanded'));
    expect(panes.secondary?.width).toBe(616); // secondary (5) outranks tertiary (1)
    expect(panes.tertiary?.width).toBe(360);
  });

  it('preferred widths per pane (the samples’ 200dp list)', () => {
    const { panes } = layout(1000, value('expanded', 'expanded', 'hidden'), {
      preferredWidths: { secondary: 200 },
    });
    expect(panes.secondary?.width).toBe(200);
    expect(panes.primary).toMatchObject({ x: 224, width: 776 });
  });

  it('reflow: the supporting pane under main, at most its preferred 420 or half', () => {
    const tall = paneScaffoldDirective(windowSizeClass({ width: 700, height: 1000 }));
    const reflowed = (height: number) =>
      threePaneScaffoldLayout({
        width: 700,
        height,
        directive: tall,
        value: value('expanded', 'reflowed', 'hidden'),
        order: SUPPORTING_PANE_ORDER,
        adaptStrategies: SUPPORTING_PANE_ADAPT_STRATEGIES,
      }).panes;
    expect(reflowed(1000)).toEqual({
      primary: { x: 0, y: 0, width: 700, height: 556 },
      secondary: { x: 0, y: 580, width: 700, height: 420 },
    });
    expect(reflowed(600)).toEqual({
      primary: { x: 0, y: 0, width: 700, height: 288 },
      secondary: { x: 0, y: 312, width: 700, height: 288 },
    });
  });

  it('pane expansion: resting first pane width, dragging, collapsing', () => {
    const v = value('expanded', 'expanded', 'hidden');
    expect(layout(1000, v, { expansion: { firstPaneWidth: 500 } }).panes).toMatchObject({
      secondary: { x: 0, width: 500 },
      primary: { x: 524, width: 476 },
    });
    const dragged = layout(1000, v, { expansion: { draggingOffset: 300 } });
    expect(dragged.panes).toMatchObject({
      secondary: { x: 0, width: 288 },
      primary: { x: 312, width: 688 },
    });
    expect(dragged.handleOffset).toBe(300);
    expect(layout(1000, v, { expansion: { draggingOffset: 5 } }).panes).toMatchObject({
      secondary: { width: 0 },
      primary: { x: 10, width: 990 },
    });
    expect(layout(1000, v, { expansion: { firstPaneWidth: 0 } }).panes).toMatchObject({
      secondary: { width: 0 },
      primary: { x: 0, width: 1000 },
    });
  });

  it('only the panes that exist are laid out', () => {
    const { panes } = layout(1300, value('expanded', 'expanded', 'expanded'), {
      present: ['primary', 'secondary'],
    });
    expect(Object.keys(panes).sort()).toEqual(['primary', 'secondary']);
    expect(panes.secondary?.width).toBe(412);
  });
});

describe('paneTransitions', () => {
  it('single pane list → detail: list exits left, detail enters from the right', () => {
    const from = value('hidden', 'expanded', 'hidden');
    const to = value('expanded', 'hidden', 'hidden');
    const motions = calculatePaneMotion(from, to, LIST_DETAIL_PANE_ORDER);
    expect(motions).toEqual({
      primary: 'enter-from-right',
      secondary: 'exit-to-left',
      tertiary: 'none',
    });
    const full = { x: 0, y: 0, width: 400, height: 600 };
    const t = paneTransitions(
      motions,
      LIST_DETAIL_PANE_ORDER,
      { secondary: full },
      { primary: full },
      400,
    );
    expect(t.primary).toMatchObject({ from: { x: 400 }, to: { x: 0 }, delayed: false });
    expect(t.secondary).toMatchObject({ from: { x: 0 }, to: { x: -400 } });
  });

  it('two panes list|detail → detail|extra: list out left, detail moves, extra in from the right', () => {
    const order = LIST_DETAIL_PANE_ORDER;
    const before = value('expanded', 'expanded', 'hidden');
    const after = value('expanded', 'hidden', 'expanded');
    const motions = calculatePaneMotion(before, after, order);
    expect(motions).toEqual({
      primary: 'animate-bounds',
      secondary: 'exit-to-left',
      tertiary: 'enter-from-right',
    });
    const origin = {
      secondary: { x: 0, y: 0, width: 360, height: 1 },
      primary: { x: 384, y: 0, width: 616, height: 1 },
    };
    const target = {
      primary: { x: 0, y: 0, width: 616, height: 1 },
      tertiary: { x: 640, y: 0, width: 360, height: 1 },
    };
    const t = paneTransitions(motions, order, origin, target, 1000);
    expect(t.primary).toMatchObject({ from: origin.primary, to: target.primary });
    // Out to the left by the left edge of the next shown pane's origin (384).
    expect(t.secondary?.to.x).toBe(-384);
    // In from the right by width − the right edge of the shown pane's target (1000 − 616).
    expect(t.tertiary?.from.x).toBe(640 + 384);
  });
});

describe('ThreePaneScaffoldAnimation', () => {
  const spec = { dampingRatio: 0.8, stiffness: 380 };
  const rect = (x: number) => ({ x, y: 0, width: 100, height: 100 });

  it('runs the bounds spring and lands on the target', () => {
    const a = new ThreePaneScaffoldAnimation();
    a.start(
      { primary: { motion: 'enter-from-right', from: rect(400), to: rect(0), delayed: false } },
      spec,
      0,
    );
    const mid = a.sample(100);
    expect(mid.running).toBe(true);
    expect(mid.panes.primary!.x).toBeGreaterThan(0);
    expect(mid.panes.primary!.x).toBeLessThan(400);
    const end = a.sample(2000);
    expect(end.running).toBe(false);
    expect(end.panes.primary).toEqual(rect(0));
  });

  it('delays EnterFrom*Delayed by 10 % of the spring’s duration', () => {
    const a = new ThreePaneScaffoldAnimation();
    a.start(
      {
        primary: {
          motion: 'enter-from-right-delayed',
          from: rect(400),
          to: rect(0),
          delayed: true,
        },
      },
      spec,
      0,
    );
    expect(a.sample(20).panes.primary!.x).toBe(400);
    expect(a.sample(200).panes.primary!.x).toBeLessThan(400);
  });

  it('keeps position and velocity when retargeted', () => {
    const a = new ThreePaneScaffoldAnimation();
    a.start(
      { primary: { motion: 'animate-bounds', from: rect(0), to: rect(400), delayed: false } },
      spec,
      0,
    );
    const at = a.sample(80).panes.primary!.x;
    a.start(
      { primary: { motion: 'animate-bounds', from: rect(999), to: rect(0), delayed: false } },
      spec,
      80,
    );
    // Starts from where it was (not from `from`) and keeps moving right for a moment.
    expect(a.sample(80).panes.primary!.x).toBeCloseTo(at, 6);
    expect(a.sample(90).panes.primary!.x).toBeGreaterThan(at);
  });

  it('jumps without a spec (reduced motion)', () => {
    const a = new ThreePaneScaffoldAnimation();
    a.start(
      { primary: { motion: 'enter-from-right', from: rect(400), to: rect(0), delayed: false } },
      null,
      0,
    );
    expect(a.sample(0)).toEqual({ panes: { primary: rect(0) }, running: false });
  });
});

describe('pane expansion anchors', () => {
  const anchors = PANE_EXPANSION_SAMPLE_ANCHORS;
  it('positions (LTR / RTL)', () => {
    expect(anchors.map((a) => paneExpansionAnchorPosition(a, 1000))).toEqual([
      0, 240, 500, 760, 1000,
    ]);
    expect(anchors.map((a) => paneExpansionAnchorPosition(a, 1000, true))).toEqual([
      1000, 760, 500, 240, 0,
    ]);
  });
  it('closest anchor, or the next one in a fling’s direction', () => {
    expect(closestPaneExpansionAnchor(anchors, 1000, 300, 0)).toBe(1);
    expect(closestPaneExpansionAnchor(anchors, 1000, 300, 500)).toBe(2);
    expect(closestPaneExpansionAnchor(anchors, 1000, 300, -500)).toBe(1);
    expect(closestPaneExpansionAnchor(anchors, 1000, 1000, 500)).toBe(4);
    expect(closestPaneExpansionAnchor([], 1000, 300, 0)).toBe(-1);
  });
  it('next anchor wraps', () => {
    expect(nextPaneExpansionAnchor(anchors, 1000, 372)).toBe(2);
    expect(nextPaneExpansionAnchor(anchors, 1000, 1000)).toBe(0);
  });
});
