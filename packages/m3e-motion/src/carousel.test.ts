// The carousel math against Compose: every case of the pure-JVM androidHostTest suites at the pin
// (compose/material3/material3/src/androidHostTest/kotlin/androidx/compose/material3/carousel/
// {Arrangement,CenteredHero,KeylineSnapPosition,Keyline,MultiBrowse,Strategy,Uncontained}Test.kt
// @19991f2c, vendored in packages/m3e-codegen/vendor/androidx-material3-carousel), ported one to
// one (assertThat(x).isEqualTo(y) → toBe: Float equality is exact there too), plus the JVM
// reference dump (`pnpm reference:carousel`, __fixtures__/carousel-reference.json) compared bit for
// bit over the layouts, sizes, paddings and scroll offsets the web carousel uses.
import { describe, expect, it } from 'vitest';
import reference from './__fixtures__/carousel-reference.json' with { type: 'json' };
import {
  Arrangement,
  CAROUSEL_ANCHOR_SIZE,
  CAROUSEL_MAX_SMALL_ITEM_SIZE,
  CAROUSEL_MIN_SMALL_ITEM_SIZE,
  type Keyline,
  KeylineList,
  emptyKeylineList,
  heroKeylineList,
  keylineListOf,
  lerpKeylineList,
  multiBrowseKeylineList,
  uncontainedKeylineList,
} from './carousel-keylines.js';
import { Strategy, getSnapPositionOffset } from './carousel-strategy.js';
import {
  calculateMaxScrollOffset,
  carouselCurrentItem,
  carouselItemLayout,
  carouselItemScrollOffset,
  carouselItemZIndex,
  carouselStrategy,
} from './carousel.js';

const f = Math.fround;
const roundToInt = (v: number) => Math.round(v);
const offsets = (l: KeylineList) => l.keylines.map((k) => k.offset);
const unadjusted = (l: KeylineList) => l.keylines.map((k) => k.unadjustedOffset);
const strategyOf = (keylines: KeylineList, space: number, spacing = 0, before = 0, after = 0) =>
  Strategy.create(keylines, space, spacing, before, after);

describe('ArrangementTest', () => {
  const find = (
    availableSpace: number,
    targetSmallSize: number,
    targetMediumSize: number,
    targetLargeSize: number,
    counts: [number, number, number],
  ) =>
    Arrangement.findLowestCostArrangement(
      f(availableSpace),
      0,
      targetSmallSize,
      40,
      56,
      [counts[2]],
      targetMediumSize,
      [counts[1]],
      targetLargeSize,
      [counts[0]],
    );

  it('test1L1M1S_noAdjustmentsMade', () => {
    const s = 56;
    const l = f(56 * 3);
    const m = f(f(l + s) / 2);
    const a = find(f(f(l + m) + s), s, m, l, [1, 1, 1]);
    expect(a?.largeSize).toBe(l);
    expect(a?.mediumSize).toBe(m);
    expect(a?.smallSize).toBe(s);
  });

  it('test1L1M1S_decreasesSmallSize', () => {
    const s = 56;
    const l = f(56 * 3);
    const m = f(f(l + s) / 2);
    const a = find(f(f(f(l + m) + s) - 10), s, m, l, [1, 1, 1]);
    expect(a?.largeSize).toBe(l);
    expect(roundToInt(a!.mediumSize)).toBe(roundToInt(m));
    expect(a?.smallSize).toBe(s - 10);
  });

  it('test1L1M1S_increasesSmallSize', () => {
    const s = 40;
    const l = f(40 * 3);
    const m = f(f(l + s) / 2);
    const a = find(f(f(f(l + m) + s) + 10), s, m, l, [1, 1, 1]);
    expect(a?.largeSize).toBe(l);
    expect(roundToInt(a!.mediumSize)).toBe(roundToInt(m));
    expect(a?.smallSize).toBe(s + 10);
  });

  it('test1L1M1S_decreasesMediumSize', () => {
    const s = 40;
    const l = f(40 * 3);
    const m = f(f(l + s) / 2);
    const adj = f(m * f(0.05));
    const a = find(f(f(f(l + m) + s) - adj), s, m, l, [1, 1, 1]);
    expect(a?.largeSize).toBe(l);
    expect(roundToInt(a!.mediumSize)).toBe(roundToInt(f(m - adj)));
    expect(a?.smallSize).toBe(s);
  });

  it('test1L1M1S_increasesMediumSize', () => {
    const s = 56;
    const l = f(56 * 3);
    const m = f(f(l + s) / 2);
    const adj = f(m * f(0.05));
    const a = find(f(f(f(l + m) + s) + adj), s, m, l, [1, 1, 1]);
    expect(a?.largeSize).toBe(l);
    expect(roundToInt(a!.mediumSize)).toBe(roundToInt(f(m + adj)));
    expect(a?.smallSize).toBe(s);
  });

  it('test1L1M2S_increasesSmallSize', () => {
    const s = 40;
    const l = f(40 * 3);
    const m = f(f(l + s) / 2);
    const a = find(f(f(f(l + m) + f(s * 2)) + f(10 * 2)), s, m, l, [1, 1, 2]);
    expect(a?.largeSize).toBe(l);
    expect(roundToInt(a!.mediumSize)).toBe(roundToInt(m));
    expect(a?.smallSize).toBe(s + 10);
  });

  it('test1L1M2S_decreasesSmallSize', () => {
    const s = 56;
    const l = f(56 * 3);
    const m = f(f(l + s) / 2);
    const a = find(f(f(f(l + m) + f(s * 2)) - f(10 * 2)), s, m, l, [1, 1, 2]);
    expect(a?.largeSize).toBe(l);
    expect(roundToInt(a!.mediumSize)).toBe(roundToInt(m));
    expect(a?.smallSize).toBe(s - 10);
  });

  it('test2L2M2S_increasesMediumSize', () => {
    const s = 56;
    const l = f(56 * 3);
    const m = f(f(l + s) / 2);
    const adj = f(m * f(0.05));
    const space = f(f(f(f(l * 2) + f(m * 2)) + f(s * 2)) + f(adj * 2));
    const a = find(space, s, m, l, [2, 2, 2]);
    expect(a?.largeSize).toBe(l);
    expect(roundToInt(a!.mediumSize)).toBe(roundToInt(f(m + adj)));
    expect(a?.smallSize).toBe(s);
  });

  it('test2L2M2S_decreasesMediumSize', () => {
    const s = 40;
    const l = f(40 * 3);
    const m = f(f(l + s) / 2);
    const adj = f(m * f(0.05));
    const space = f(f(f(f(l * 2) + f(m * 2)) + f(s * 2)) - f(adj * 2));
    const a = find(space, s, m, l, [2, 2, 2]);
    expect(a?.largeSize).toBe(l);
    expect(roundToInt(a!.mediumSize)).toBe(roundToInt(f(m - adj)));
    expect(a?.smallSize).toBe(s);
  });
});

describe('CenteredHeroTest', () => {
  const hero = (space: number, preferred: number | null, spacing: number, count: number) => {
    const keylines = heroKeylineList(space, preferred, spacing, count, true);
    return strategyOf(keylines, space, spacing);
  };

  it('enoughRoom_shouldFitOneLargeTwoSmall', () => {
    expect(hero(100 + 40 + 40, null, 0, 6).itemMainAxisSize).toBe(100);
  });

  it('lessThan3Items_shouldChangeToLeftAlignedArrangement', () => {
    const s = hero(100 + 40 + 40, null, 0, 2);
    expect(s.itemMainAxisSize).toBeGreaterThan(100);
    expect(s.defaultKeylines.firstFocalIndex).toBe(1);
  });

  it('oneItemOnly_shouldGoFullscreen', () => {
    expect(hero(40 + 40 + 40, null, 0, 1).itemMainAxisSize).toBe(120);
  });

  it('lessThanFullscreenThreshold_shouldGoFullscreen', () => {
    expect(hero(40 + 40 + 40, null, 0, 6).itemMainAxisSize).toBe(120);
  });

  it.each([
    ['withoutItemSpacing', 0, 7],
    ['withItemSpacing', 12, 7],
    ['withItemSpacing_evenCount', 12, 10],
  ])('maxItemWidth_%s_firstAndLastDefaultItemsShouldAlignToStartAndEnd', (_, spacing, count) => {
    const space = 300 + 300 + 300 + 40 + 40;
    const s = hero(space, 300, spacing, count);
    expect(s.defaultKeylines.firstNonAnchor.offset).toBe(20);
    expect(s.defaultKeylines.lastNonAnchor.offset).toBe(space - 20);
  });

  it('negativeCarouselSize_shouldReturnEmptyList', () => {
    expect(heroKeylineList(-10, 100, 0, 5, true).isEmpty()).toBe(true);
  });
});

describe('KeylineSnapPositionTest', () => {
  const snaps = (s: Strategy, count: number) =>
    Array.from({ length: count }, (_, i) => getSnapPositionOffset(s, i, count));

  const testCenterAlignedStrategy = () =>
    strategyOf(
      keylineListOf(1000, 0, 'center', (k) => {
        k.add(5, true);
        k.add(100);
        k.add(200);
        k.add(400);
        k.add(200);
        k.add(100);
        k.add(5, true);
      }),
      1000,
    );
  const testStartAlignedStrategy = () =>
    strategyOf(
      keylineListOf(1000, 0, 'start', (k) => {
        k.add(5, true);
        k.add(400);
        k.add(200);
        k.add(200);
        k.add(100);
        k.add(100);
        k.add(5, true);
      }),
      1000,
    );
  const testStartAlignedStrategyWithMultipleFocal = () =>
    strategyOf(
      keylineListOf(1000, 0, 'start', (k) => {
        k.add(5, true);
        k.add(400);
        k.add(400);
        k.add(125);
        k.add(75);
        k.add(5, true);
      }),
      1000,
    );

  it('testCenterAlignedSnapPosition_singleFocalItem', () => {
    expect(snaps(testCenterAlignedStrategy(), 6)).toEqual([0, 200, 300, 300, 400, 600]);
  });

  it('testCenterAlignedSnapPosition_multipleFocalItems', () => {
    const size = 10 + 40 + 100 + 100 + 40 + 10;
    const keylines = keylineListOf(size, 0, 'center', (k) => {
      k.add(5, true);
      k.add(10);
      k.add(40);
      k.add(100);
      k.add(100);
      k.add(40);
      k.add(10);
      k.add(5, true);
    });
    expect(snaps(strategyOf(keylines, size), 10)).toEqual([
      0,
      40,
      50,
      50,
      50,
      50,
      50,
      10 + 40 + 100,
      10 + 10 + 40 + 100,
      10 + 10 + 40 + 40 + 100,
    ]);
  });

  it('testSnapPosition_forStartAlignedStrategy', () => {
    expect(snaps(testStartAlignedStrategy(), 6)).toEqual([0, 0, 100, 200, 400, 600]);
  });

  it('testSnapPosition_forStartAlignedStrategyWithMultipleFocal', () => {
    expect(snaps(testStartAlignedStrategyWithMultipleFocal(), 5)).toEqual([
      0,
      0,
      400,
      75 + 400,
      75 + 125 + 400,
    ]);
  });

  it('testSnapPosition_forStartAlignedStrategyWithMultipleFocalAndLessItems', () => {
    const s = testStartAlignedStrategyWithMultipleFocal();
    expect(snaps(s, s.defaultKeylines.size - 2)).toEqual([0, 400, 75 + 400, 75 + 125 + 400]);
  });

  it('testSnapPosition_forStartAlignedStrategyWithLessItemsThanFocal', () => {
    const s = testStartAlignedStrategyWithMultipleFocal();
    const count = s.defaultKeylines.lastFocalIndex - s.defaultKeylines.firstFocalIndex;
    expect(snaps(s, count)).toEqual([0]);
  });
});

// StrategyTest companion values.
const LARGE = 100;
const SMALL = 20;
const MEDIUM = f(f(LARGE + SMALL) / 2);
const X_SMALL = 5;

describe('KeylineTest', () => {
  const LargeSize = 100;
  const SmallSize = 20;
  const XSmallSize = 5;
  const MediumSize = f(f(LargeSize + SmallSize) / 2);
  const createTestKeylineList = () =>
    keylineListOf(
      f(f(f(XSmallSize * 2) + f(SmallSize * 4)) + f(MediumSize * 2)) + f(LargeSize * 2),
      0,
      'center',
      (k) => {
        k.add(XSmallSize, true);
        k.add(SmallSize);
        k.add(SmallSize);
        k.add(MediumSize);
        k.add(LargeSize);
        k.add(LargeSize);
        k.add(MediumSize);
        k.add(SmallSize);
        k.add(SmallSize);
        k.add(XSmallSize, true);
      },
    );

  it('testKeylineList_findsFirstAndLastFocalKeylines', () => {
    const l = createTestKeylineList();
    expect(l.firstFocalIndex).toBe(4);
    expect(l.lastFocalIndex).toBe(5);
  });

  it('testKeylineList_pivotsWithCorrectCutoffsRight', () => {
    const size = LargeSize + roundToInt(f(MediumSize * f(0.75)));
    const l = keylineListOf(size, 0, 'start', (k) => {
      k.add(SmallSize, true);
      k.add(LargeSize);
      k.add(MediumSize);
      k.add(SmallSize, true);
    });
    expect(l.get(2).cutoff).toBe(MediumSize - roundToInt(f(MediumSize * f(0.75))));
  });

  it('testKeylineList_pivotsWithCorrectCutoffsLeft', () => {
    const size = roundToInt(f(MediumSize * f(0.75))) + LargeSize;
    const l = keylineListOf(size, 0, 'end', (k) => {
      k.add(SmallSize, true);
      k.add(MediumSize);
      k.add(LargeSize);
      k.add(SmallSize, true);
    });
    expect(l.get(1).cutoff).toBe(f(MediumSize * f(0.25)));
  });

  it('testKeylineList_findsFirstIndexAfterFocalRangeWithSize', () => {
    expect(createTestKeylineList().firstIndexAfterFocalRangeWithSize(SmallSize)).toBe(7);
  });

  it('testKeylineList_findsLastIndexBeforeFocalRangeWithSize', () => {
    expect(createTestKeylineList().lastIndexBeforeFocalRangeWithSize(SmallSize)).toBe(2);
  });

  it('testKeylineList_getKeylineBefore', () => {
    const l = createTestKeylineList();
    expect(l.getKeylineBefore(60)).toEqual(l.get(3));
    expect(l.getKeylineBefore(-3.4028235e38)).toEqual(l.get(0));
    expect(l.getKeylineBefore(3.4028235e38)).toEqual(l.last());
  });

  it('testKeylineList_getKeylineAfter', () => {
    const l = createTestKeylineList();
    expect(l.getKeylineAfter(60)).toEqual(l.get(4));
    expect(l.getKeylineAfter(-3.4028235e38)).toEqual(l.get(0));
    expect(l.getKeylineAfter(3.4028235e38)).toEqual(l.last());
  });

  it('testKeylineListLerp', () => {
    const size = f(f(LARGE + MEDIUM) + SMALL);
    const from = keylineListOf(size, 0, 1, LARGE / 2, (k) => {
      k.add(X_SMALL, true);
      k.add(LARGE);
      k.add(MEDIUM);
      k.add(SMALL);
      k.add(X_SMALL, true);
    });
    const to = keylineListOf(size, 0, 2, SMALL + LARGE / 2, (k) => {
      k.add(X_SMALL, true);
      k.add(SMALL);
      k.add(LARGE);
      k.add(MEDIUM);
      k.add(X_SMALL, true);
    });
    const kl = (
      size: number,
      offset: number,
      unadjustedOffset: number,
      isFocal: boolean,
      isAnchor: boolean,
      isPivot: boolean,
      cutoff: number,
    ): Keyline => ({ size, offset, unadjustedOffset, isFocal, isAnchor, isPivot, cutoff });
    const half = new KeylineList([
      kl(X_SMALL, -2.5, -90, false, true, false, 0),
      kl(60, 30, 10, false, false, false, 0),
      kl(80, 100, 110, true, false, true, 0),
      kl(40, 160, 210, false, false, false, 0),
      kl(X_SMALL, 182.5, 310, false, true, false, 0),
    ]);
    expect(lerpKeylineList(from, to, 0).equals(from)).toBe(true);
    expect(lerpKeylineList(from, to, 1).equals(to)).toBe(true);
    expect(lerpKeylineList(from, to, 0.5).equals(half)).toBe(true);
  });

  const list = (anchor: number) =>
    keylineListOf(120, 0, 'start', (k) => {
      k.add(anchor, true);
      k.add(100);
      k.add(20);
      k.add(10, true);
    });

  it('test_keylineListsShouldBeEqual', () => {
    expect(list(10).equals(list(10))).toBe(true);
  });

  it('testDifferentSizedItem_keylineListsShouldNotBeEqual', () => {
    expect(list(11).equals(list(10))).toBe(false);
  });

  it('testStartKeylines_shouldAddSpacingBetweenItems', () => {
    const l = keylineListOf(380, 8, 'start', (k) => {
      k.add(10, true);
      k.add(186);
      k.add(122);
      k.add(56);
      k.add(10, true);
    });
    expect(offsets(l)).toEqual([-13, 93, 255, 352, 393]);
    expect(unadjusted(l)).toEqual([-101, 93, 287, 481, 675]);
  });

  it('testCenteredKeylines_shouldAddSpacingBetweenItems', () => {
    const l = keylineListOf(768, 8, 'center', (k) => {
      k.add(10, true);
      k.add(56);
      k.add(122);
      k.add(186);
      k.add(186);
      k.add(122);
      k.add(56);
      k.add(10, true);
    });
    expect(offsets(l)).toEqual([-13, 28, 125, 287, 481, 643, 740, 781]);
    expect(unadjusted(l)).toEqual([-295, -101, 93, 287, 481, 675, 869, 1063]);
  });

  it('testEndKeylines_shouldAddSpacingBetweenItems', () => {
    const l = keylineListOf(380, 8, 'end', (k) => {
      k.add(10, true);
      k.add(56);
      k.add(122);
      k.add(186);
      k.add(10, true);
    });
    expect(offsets(l)).toEqual([-13, 28, 125, 287, 393]);
    expect(unadjusted(l)).toEqual([-295, -101, 93, 287, 481]);
  });

  it('testKeylineList_emptyScope_shouldReturnEmptyList', () => {
    expect(keylineListOf(100, 0, 'start', () => undefined).isEmpty()).toBe(true);
  });

  it('testKeylineList_onlyAnchors_shouldReturnEmptyList', () => {
    const l = keylineListOf(100, 0, 'start', (k) => {
      k.add(10, true);
      k.add(10, true);
    });
    expect(l.isEmpty()).toBe(true);
  });

  it('testKeylineList_nonPositiveSizes_shouldReturnEmptyList', () => {
    const l = keylineListOf(100, 0, 'start', (k) => {
      k.add(0, false);
      k.add(-10, false);
    });
    expect(l.isEmpty()).toBe(true);
  });

  it('testKeylineList_invalidPivotIndex_shouldReturnEmptyList', () => {
    expect(
      keylineListOf(100, 0, 10, 50, (k) => {
        k.add(100);
      }).isEmpty(),
    ).toBe(true);
  });
});

describe('MultiBrowseTest', () => {
  const browse = (space: number, item: number, spacing: number, count: number) =>
    multiBrowseKeylineList(space, item, spacing, count);

  it('testMultiBrowse_doesNotResizeLargeWhenEnoughRoom', () => {
    expect(strategyOf(browse(500, 120, 0, 10), 500).itemMainAxisSize).toBe(120);
  });

  it('testMultiBrowse_resizesItemLargerThanContainerToFit1Small', () => {
    const s = strategyOf(browse(100, 200, 0, 10), 100);
    const keylines = s.defaultKeylines;
    expect(s.itemMainAxisSize).toBeLessThanOrEqual(100);
    expect(keylines.size).toBe(4);
    expect(keylines.get(0).unadjustedOffset).toBeLessThan(0);
    expect(keylines.last().unadjustedOffset).toBeGreaterThan(100);
    expect(keylines.get(1).isFocal).toBe(true);
    expect(keylines.get(2).size).toBe(CAROUSEL_MIN_SMALL_ITEM_SIZE);
  });

  it('testMultiBrowse_hasNoSmallItemsIfNotEnoughRoom', () => {
    const s = strategyOf(browse(CAROUSEL_MIN_SMALL_ITEM_SIZE, 200, 0, 10), 40);
    const keylines = s.defaultKeylines;
    expect(s.itemMainAxisSize).toBe(CAROUSEL_MIN_SMALL_ITEM_SIZE);
    expect(keylines.firstFocal).toEqual(keylines.firstNonAnchor);
    expect(keylines.lastFocal).toEqual(keylines.lastNonAnchor);
  });

  it('testMultiBrowse_isNullIfAvailableSpaceIsZero', () => {
    expect(browse(0, 200, 0, 10).isEmpty()).toBe(true);
  });

  it('testMultiBrowse_negativeCarouselSize_shouldReturnEmptyList', () => {
    expect(browse(-10, 200, 0, 10).isEmpty()).toBe(true);
  });

  it('testMultiBrowse_adjustsMediumSizeToBeProportional', () => {
    const size = 200 * 2 + CAROUSEL_MAX_SMALL_ITEM_SIZE * 2;
    const keylines = strategyOf(browse(size, 200, 0, 10), size).defaultKeylines;
    expect(keylines.size).toBe(6);
    expect(keylines.get(1).isFocal).toBe(true);
    expect(keylines.get(2).isFocal).toBe(true);
    expect(keylines.get(3).size).toBeLessThan(keylines.get(2).size);
    expect(keylines.get(4).size).toBeLessThan(keylines.get(3).size);
  });

  it('testMultiBrowse_withLessItemsThanKeylines', () => {
    const size = 200 * 2 + CAROUSEL_MAX_SMALL_ITEM_SIZE * 2;
    const keylines = strategyOf(browse(size, 200, 0, 3), size).defaultKeylines;
    expect(keylines.size).toBe(5);
    expect(keylines.get(1).isFocal).toBe(true);
    expect(keylines.get(2).isFocal).toBe(true);
    expect(keylines.get(3).size).toBeLessThan(keylines.get(2).size);
  });

  it('testMultiBrowse_adjustsForItemSpacing', () => {
    const keylineList = browse(380, 186, 8, 10);
    const s = strategyOf(keylineList, 380, 8);
    expect(keylineList.firstFocal.size).toBe(186);
    expect(keylineList.firstFocal.offset).toBe(186 / 2);
    expect(keylineList.lastNonAnchor.offset + keylineList.lastNonAnchor.size / 2).toBe(380);
    expect(s.itemMainAxisSize).toBe(186);
    const lastVisible = s.defaultKeylines.get(3);
    expect(lastVisible.size).toBe(56);
    expect(lastVisible.offset).toBe(380 - 56 / 2);
    const maxScrollOffset = 186 * 10 + 8 * 10 - 380;
    expect(unadjusted(s.getKeylineListForScrollOffset(0, maxScrollOffset))).toEqual([
      -101, 93, 287, 481, 675,
    ]);
  });
});

describe('StrategyTest', () => {
  const createCenterAlignedKeylineList = () =>
    keylineListOf(
      f(f(f(f(SMALL * 2) + MEDIUM) + f(LARGE * 2)) + MEDIUM) + f(SMALL * 2),
      0,
      'center',
      (k) => {
        k.add(X_SMALL, true);
        k.add(SMALL);
        k.add(SMALL);
        k.add(MEDIUM);
        k.add(LARGE);
        k.add(LARGE);
        k.add(MEDIUM);
        k.add(SMALL);
        k.add(SMALL);
        k.add(X_SMALL, true);
      },
    );
  const createStartAlignedKeylineList = () =>
    keylineListOf(f(f(LARGE + MEDIUM) + SMALL), 0, 'start', (k) => {
      k.add(X_SMALL, true);
      k.add(LARGE);
      k.add(MEDIUM);
      k.add(SMALL);
      k.add(X_SMALL, true);
    });
  const cutoffList = (alignment: 'start' | 'end', cutoff: number) =>
    keylineListOf(f(f(LARGE + MEDIUM) + MEDIUM), 0, alignment, (k) => {
      k.add(X_SMALL, true);
      if (alignment === 'start') {
        k.add(LARGE + cutoff);
        k.add(MEDIUM);
        k.add(MEDIUM);
      } else {
        k.add(MEDIUM);
        k.add(MEDIUM);
        k.add(LARGE + cutoff);
      }
      k.add(X_SMALL, true);
    });
  const expectClose = (actual: Keyline, expected: Keyline, tolerance: number) => {
    expect(Math.abs(actual.size - expected.size)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(actual.offset - expected.offset)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(actual.unadjustedOffset - expected.unadjustedOffset)).toBeLessThanOrEqual(0.01);
    expect(actual.isFocal).toBe(expected.isFocal);
    expect(actual.isAnchor).toBe(expected.isAnchor);
    expect(actual.isPivot).toBe(expected.isPivot);
    expect(Math.abs(actual.cutoff - expected.cutoff)).toBeLessThanOrEqual(tolerance);
  };
  const pivoted = (size: number, pivotIndex: number, pivotOffset: number, sizes: number[]) =>
    keylineListOf(size, 0, pivotIndex, pivotOffset, (k) => {
      k.add(X_SMALL, true);
      for (const s of sizes) k.add(s);
      k.add(X_SMALL, true);
    });

  it('testStrategy_startAlignedStrategyShiftsEnd', () => {
    const size = f(f(LARGE + MEDIUM) + SMALL);
    const maxScrollOffset = 10 * LARGE - size;
    const defaults = createStartAlignedKeylineList();
    const s = strategyOf(defaults, size);
    expect(s.getKeylineListForScrollOffset(0, maxScrollOffset).equals(defaults)).toBe(true);
    const end = s.getKeylineListForScrollOffset(maxScrollOffset, maxScrollOffset);
    expect(offsets(end)).toEqual([-2.5, 10, 50, 130, 182.5]);
    expect(unadjusted(end)).toEqual([130 - 300, 130 - 200, 130 - 100, 130, 130 + 100]);
  });

  it('testStrategy_startAlignedCutoffStrategyShiftsEndWithCutoff', () => {
    const size = f(f(LARGE + MEDIUM) + MEDIUM);
    const defaults = cutoffList('start', 50);
    const s = strategyOf(defaults, size);
    const end = s.endKeylineSteps[s.endKeylineSteps.length - 1]!;
    expect(defaults.lastNonAnchor.cutoff).toBe(50);
    expect(defaults.firstNonAnchor.offset - defaults.firstNonAnchor.size / 2).toBe(0);
    expect(end.firstNonAnchor.cutoff).toBe(50);
    expect(end.firstNonAnchor.offset - end.firstNonAnchor.size / 2).toBe(-50);
    expect(end.lastNonAnchor.offset + end.lastNonAnchor.size / 2).toBe(size);
  });

  it('testStrategy_endAlignedCutoffStrategyShiftsStartWithCutoff', () => {
    const size = f(f(LARGE + MEDIUM) + MEDIUM);
    const defaults = cutoffList('end', 50);
    const s = strategyOf(defaults, size);
    const start = s.startKeylineSteps[s.startKeylineSteps.length - 1]!;
    expect(defaults.firstNonAnchor.cutoff).toBe(50);
    expect(defaults.lastNonAnchor.offset + defaults.lastNonAnchor.size / 2).toBe(size);
    expect(start.lastNonAnchor.cutoff).toBe(50);
    expect(start.firstNonAnchor.offset - start.firstNonAnchor.size / 2).toBe(0);
    expect(start.lastNonAnchor.offset + start.lastNonAnchor.size / 2).toBe(size + 50);
  });

  it('testStrategy_overlappingShiftOffsetsSkipsDefaultKeylineList', () => {
    const size = LARGE + SMALL;
    const maxScrollOffset = LARGE * 2 - size;
    const defaults = keylineListOf(size, 0, 'start', (k) => {
      k.add(X_SMALL, true);
      k.add(LARGE);
      k.add(SMALL);
      k.add(X_SMALL, true);
    });
    const s = strategyOf(defaults, size, 0, 24, 48);
    const start = s.getKeylineListForScrollOffset(0, maxScrollOffset, false);
    expect(start.firstFocal.offset).toBe(24 + start.firstFocal.size / 2);
    const end = s.getKeylineListForScrollOffset(maxScrollOffset, maxScrollOffset, false);
    expect(end.lastFocal.offset).toBe(size - 48 - end.lastFocal.size / 2);
    const mid = s.getKeylineListForScrollOffset(maxScrollOffset / 2, maxScrollOffset, true);
    expect(offsets(mid)).not.toEqual(offsets(defaults));
  });

  it('testStrategy_centerAlignedShiftsStart', () => {
    const size = f(f(f(f(SMALL * 2) + MEDIUM) + f(LARGE * 2)) + MEDIUM) + f(SMALL * 2);
    const maxScrollOffset = 12 * LARGE - size;
    const s = strategyOf(createCenterAlignedKeylineList(), size);
    const startSteps = [
      createCenterAlignedKeylineList(),
      pivoted(size, 3, f(f(SMALL + MEDIUM) + LARGE / 2), [
        SMALL,
        MEDIUM,
        LARGE,
        LARGE,
        MEDIUM,
        SMALL,
        SMALL,
        SMALL,
      ]),
      pivoted(size, 2, f(MEDIUM + LARGE / 2), [
        MEDIUM,
        LARGE,
        LARGE,
        MEDIUM,
        SMALL,
        SMALL,
        SMALL,
        SMALL,
      ]),
      pivoted(size, 1, LARGE / 2, [LARGE, LARGE, MEDIUM, MEDIUM, SMALL, SMALL, SMALL, SMALL]),
    ];
    const shiftedStart = s.getKeylineListForScrollOffset(0, maxScrollOffset);
    expect(shiftedStart.equals(startSteps[3]!)).toBe(true);
    expect(shiftedStart.firstFocal.offset - shiftedStart.firstFocal.size / 2).toBe(0);
    const firstU = (l: KeylineList) => l.first().unadjustedOffset;
    const total = f(firstU(startSteps[3]!) - firstU(startSteps[0]!));
    const scrolls = [
      total,
      f(total - f(firstU(startSteps[1]!) - firstU(startSteps[0]!))),
      f(total - f(firstU(startSteps[2]!) - firstU(startSteps[0]!))),
      f(total - f(firstU(startSteps[3]!) - firstU(startSteps[0]!))),
    ];
    scrolls.forEach((scroll, i) => {
      const list = s.getKeylineListForScrollOffset(scroll, maxScrollOffset);
      list.keylines.forEach((k, j) => {
        expectClose(k, startSteps[i]!.get(j), 0.01);
      });
    });
  });

  it('testStrategy_centerAlignedShiftsEnd', () => {
    const size = f(f(f(f(SMALL * 2) + MEDIUM) + f(LARGE * 2)) + MEDIUM) + f(SMALL * 2);
    const maxScrollOffset = 12 * LARGE - size;
    const s = strategyOf(createCenterAlignedKeylineList(), size);
    const endSteps = [
      createCenterAlignedKeylineList(),
      pivoted(size, 5, f(f(SMALL * 3) + MEDIUM) + LARGE / 2, [
        SMALL,
        SMALL,
        SMALL,
        MEDIUM,
        LARGE,
        LARGE,
        MEDIUM,
        SMALL,
      ]),
      pivoted(size, 6, f(f(SMALL * 4) + MEDIUM) + LARGE / 2, [
        SMALL,
        SMALL,
        SMALL,
        SMALL,
        MEDIUM,
        LARGE,
        LARGE,
        MEDIUM,
      ]),
      pivoted(size, 7, f(f(SMALL * 4) + f(MEDIUM * 2)) + LARGE / 2, [
        SMALL,
        SMALL,
        SMALL,
        SMALL,
        MEDIUM,
        MEDIUM,
        LARGE,
        LARGE,
      ]),
    ];
    const shiftedEnd = s.getKeylineListForScrollOffset(maxScrollOffset, maxScrollOffset);
    expect(shiftedEnd.equals(endSteps[3]!)).toBe(true);
    expect(shiftedEnd.lastFocal.offset + shiftedEnd.lastFocal.size / 2).toBe(size);
    const lastU = (l: KeylineList) => l.last().unadjustedOffset;
    const total = f(lastU(endSteps[0]!) - lastU(endSteps[3]!));
    const base = f(maxScrollOffset - total);
    const scrolls = [
      base,
      f(base - f(lastU(endSteps[1]!) - lastU(endSteps[0]!))),
      f(base - f(lastU(endSteps[2]!) - lastU(endSteps[0]!))),
      f(base - f(lastU(endSteps[3]!) - lastU(endSteps[0]!))),
    ];
    scrolls.forEach((scroll, i) => {
      const list = s.getKeylineListForScrollOffset(scroll, maxScrollOffset);
      list.keylines.forEach((k, j) => {
        expectClose(k, endSteps[i]!.get(j), 0.01);
      });
    });
    const almostToStepOne = f(scrolls[0]! + f(f(scrolls[1]! - scrolls[0]!) * f(0.75)));
    expect(
      s.getKeylineListForScrollOffset(almostToStepOne, maxScrollOffset, true).equals(endSteps[1]!),
    ).toBe(true);
    const halfWayToStepTwo = f(scrolls[1]! + f(f(scrolls[2]! - scrolls[1]!) * 0.5));
    expect(
      s.getKeylineListForScrollOffset(halfWayToStepTwo, maxScrollOffset, true).equals(endSteps[2]!),
    ).toBe(true);
    const justPastStepTwo = f(scrolls[2]! + f(f(scrolls[3]! - scrolls[2]!) * f(0.1)));
    expect(
      s.getKeylineListForScrollOffset(justPastStepTwo, maxScrollOffset, true).equals(endSteps[2]!),
    ).toBe(true);
  });

  it('testStrategy_sameAvailableSpaceCreatesEqualObjects', () => {
    const a = strategyOf(multiBrowseKeylineList(500, LARGE, 0, 10), 500);
    const b = strategyOf(multiBrowseKeylineList(500, LARGE, 0, 10), 500);
    expect(a.equals(b)).toBe(true);
  });

  it('testStrategy_differentAvailableSpaceCreatesUnequalObjects', () => {
    const a = strategyOf(multiBrowseKeylineList(500, LARGE, 0, 10), 500);
    const b = strategyOf(multiBrowseKeylineList(501, LARGE, 0, 10), 501);
    expect(a.equals(b)).toBe(false);
  });

  it('testStrategy_invalidObjectDoesNotEqualValidObject', () => {
    const a = strategyOf(multiBrowseKeylineList(500, LARGE, 0, 10), 500);
    const b = strategyOf(emptyKeylineList(), 500);
    expect(a.equals(b)).toBe(false);
  });

  it('testStrategy_startAlignedStrategyWithNegativeMaxScroll', () => {
    const size = f(f(LARGE + MEDIUM) + SMALL);
    const defaults = createStartAlignedKeylineList();
    const s = strategyOf(defaults, size);
    expect(s.getKeylineListForScrollOffset(0, LARGE - size).equals(defaults)).toBe(true);
  });

  it('testStartKeylineStrategy_endStepsShouldAccountForItemSpacing', () => {
    const s = strategyOf(
      keylineListOf(380, 8, 'start', (k) => {
        k.add(10, true);
        k.add(186);
        k.add(122);
        k.add(56);
        k.add(10, true);
      }),
      380,
      8,
    );
    expect(offsets(s.endKeylineSteps[1]!)).toEqual([-13, 28, 157, 319, 393]);
    expect(unadjusted(s.endKeylineSteps[1]!)).toEqual([-231, -37, 157, 351, 545]);
    expect(offsets(s.endKeylineSteps[2]!)).toEqual([-13, 28, 125, 287, 393]);
    expect(unadjusted(s.endKeylineSteps[2]!)).toEqual([-295, -101, 93, 287, 481]);
  });

  it('testCenterKeylineStrategy_startAndEndStepsShouldAccountForItemSpacing', () => {
    const s = strategyOf(
      keylineListOf(768, 8, 'center', (k) => {
        k.add(10, true);
        k.add(56);
        k.add(122);
        k.add(186);
        k.add(186);
        k.add(122);
        k.add(56);
        k.add(10, true);
      }),
      768,
      8,
    );
    expect(s.startKeylineSteps).toHaveLength(3);
    expect(s.endKeylineSteps).toHaveLength(3);
    const [, s1, s2] = s.startKeylineSteps;
    expect(offsets(s1!)).toEqual([-13, 61, 223, 417, 579, 676, 740, 781]);
    expect(unadjusted(s1!)).toEqual([-165, 29, 223, 417, 611, 805, 999, 1193]);
    expect(offsets(s2!)).toEqual([-13, 93, 287, 449, 579, 676, 740, 781]);
    expect(unadjusted(s2!)).toEqual([-101, 93, 287, 481, 675, 869, 1063, 1257]);
    const [, e1, e2] = s.endKeylineSteps;
    expect(offsets(e1!)).toEqual([-13, 28, 92, 189, 351, 545, 707, 781]);
    expect(unadjusted(e1!)).toEqual([-425, -231, -37, 157, 351, 545, 739, 933]);
    expect(offsets(e2!)).toEqual([-13, 28, 92, 189, 319, 481, 675, 781]);
    expect(unadjusted(e2!)).toEqual([-489, -295, -101, 93, 287, 481, 675, 869]);
  });

  it('testCenterStrategy_stepsShouldAccountForContentPadding', () => {
    const s = strategyOf(
      keylineListOf(500, 0, 'center', (k) => {
        k.add(10, true);
        k.add(50);
        k.add(100);
        k.add(200);
        k.add(100);
        k.add(50);
        k.add(10, true);
      }),
      500,
      0,
      16,
      24,
    );
    const lastStart = s.startKeylineSteps[s.startKeylineSteps.length - 1]!;
    const lastEnd = s.endKeylineSteps[s.endKeylineSteps.length - 1]!;
    expect(f(lastStart.firstFocal.offset - f(lastStart.firstFocal.size / 2))).toBe(16);
    expect(f(lastStart.lastNonAnchor.offset + f(lastStart.lastNonAnchor.size / 2))).toBe(500);
    expect(f(lastEnd.lastFocal.offset + f(lastEnd.lastFocal.size / 2))).toBe(500 - 24);
    expect(
      Math.abs(f(lastEnd.firstNonAnchor.offset - f(lastEnd.firstNonAnchor.size / 2))),
    ).toBeLessThanOrEqual(0.01);
  });

  it('testStartStrategy_twoLargeOneSmall_shouldAccountForPadding', () => {
    const s = strategyOf(
      keylineListOf(444, 8, 'start', (k) => {
        k.add(10, true);
        k.add(186);
        k.add(186);
        k.add(56);
        k.add(10, true);
      }),
      444,
      8,
      16,
      16,
    );
    expect(s.itemMainAxisSize).toBe(186);
    const lastStartSmall = s.startKeylineSteps[s.startKeylineSteps.length - 1]!.get(3);
    expect(Math.abs(lastStartSmall.offset + lastStartSmall.size / 2 - 444)).toBeLessThanOrEqual(
      0.001,
    );
    const lastEnd = s.endKeylineSteps[s.endKeylineSteps.length - 1]!;
    expect(
      f(f(f(f(lastEnd.get(1).size + 8) + lastEnd.get(2).size) + 8) + lastEnd.get(3).size),
    ).toBe(444 - 16);
    const lastEndSmall = lastEnd.get(1);
    expect(Math.abs(lastEndSmall.offset - lastEndSmall.size / 2)).toBeLessThanOrEqual(0.001);
  });

  it('testStrategy_getKeylineListForScrollOffset_caching', () => {
    const size = f(f(LARGE + MEDIUM) + SMALL);
    const max = 10 * LARGE - size;
    const s = strategyOf(createStartAlignedKeylineList(), size);
    const list1 = s.getKeylineListForScrollOffset(max - 20, max);
    expect(s.getKeylineListForScrollOffset(max - 20, max)).toBe(list1);
    const list3 = s.getKeylineListForScrollOffset(max - 10, max);
    expect(list3).not.toBe(list1);
    const list4 = s.getKeylineListForScrollOffset(max - 10, max + 10);
    expect(list4).not.toBe(list3);
    expect(s.getKeylineListForScrollOffset(max - 10, max + 10, true)).not.toBe(list4);
  });
});

describe('UncontainedTest', () => {
  const unc = (size: number, item: number) =>
    strategyOf(uncontainedKeylineList(size, item, 0), size);

  it('testLargeItem_withFullCarouselWidth', () => {
    const k = unc(500, 500).defaultKeylines;
    expect(k.size).toBe(3);
    expect(k.get(0).offset).toBe(-CAROUSEL_ANCHOR_SIZE / 2);
    expect(k.get(1).size).toBe(500);
    expect(k.get(2).offset).toBe(500 + CAROUSEL_ANCHOR_SIZE / 2);
  });

  it('testLargeItem_largerThanFullCarouselWidth', () => {
    const k = unc(400, 500).defaultKeylines;
    expect(k.size).toBe(3);
    expect(k.get(0).offset).toBe(-CAROUSEL_ANCHOR_SIZE / 2);
    expect(k.get(1).size).toBe(400);
    expect(k.get(2).offset).toBe(400 + CAROUSEL_ANCHOR_SIZE / 2);
  });

  it('testLargeItem_largerThanHalfCarouselWidth', () => {
    const k = unc(1000, 501).defaultKeylines;
    expect(k.size).toBe(4);
    expect(k.get(0).offset).toBe(-125.25);
    expect(k.get(1).size).toBe(501);
    expect(k.get(2).size).toBe(501);
    expect(k.get(3).size).toBe(CAROUSEL_ANCHOR_SIZE);
    expect(k.get(3).offset).toBe(501 * 2 + CAROUSEL_ANCHOR_SIZE / 2);
  });

  it('testRemainingSpaceWithItemSize_fitsItemWithThirdCutoff', () => {
    const k = unc(400, 125).defaultKeylines;
    expect(k.size).toBe(6);
    expect([k.get(1).size, k.get(2).size, k.get(3).size]).toEqual([125, 125, 125]);
    expect(k.get(4).size).toBe(25 * 1.5);
    expect(k.get(4).offset).toBe(393.75);
    expect(k.get(0).size).toBe(18.75);
    expect(k.get(0).offset).toBe(-9.375);
    expect(k.get(5).size).toBe(CAROUSEL_ANCHOR_SIZE);
    expect(k.get(5).offset).toBe(125 * 3 + 25 * 1.5 + CAROUSEL_ANCHOR_SIZE / 2);
  });

  it('testRemainingSpaceWithItemSize_fitsMediumItemWithCutoff', () => {
    const k = unc(400, 105).defaultKeylines;
    expect(k.size).toBe(6);
    expect([k.get(1).size, k.get(2).size, k.get(3).size]).toEqual([105, 105, 105]);
    expect(k.get(4).size).toBe(f(85 * f(1.2)));
    expect(k.get(0).size).toBe(f(f(85 * f(1.2)) * 0.5));
    expect(k.get(5).size).toBe(CAROUSEL_ANCHOR_SIZE);
    expect(k.get(0).offset).toBe(f(-f(f(85 * f(1.2)) * 0.5) / 2));
    expect(k.get(5).offset).toBe(f(f(105 * 3 + f(85 * f(1.2))) + CAROUSEL_ANCHOR_SIZE / 2));
  });

  it('testNegativeCarouselSize_shouldReturnEmptyList', () => {
    expect(uncontainedKeylineList(-10, 100, 0).isEmpty()).toBe(true);
  });
});

// --- Web glue (carousel.ts) --------------------------------------------------------------------

describe('carousel item layout (Modifier.carouselItem)', () => {
  // HorizontalMultiBrowseCarouselSample in a 412dp window: 186dp preferred, 8dp spacing, 16dp
  // horizontal content padding (CarouselSamples.kt L96–137).
  const input = {
    layout: 'multi-browse' as const,
    availableSpace: 412,
    itemSize: 186,
    itemSpacing: 8,
    itemCount: 10,
    beforeContentPadding: 16,
    afterContentPadding: 16,
  };

  it('rests every item on its snap position, from 0 to the end of the scroll range', () => {
    const s = carouselStrategy(input);
    const max = calculateMaxScrollOffset(s, 10);
    expect(max).toBe(f(f(s.itemMainAxisSize * 10) + 8 * 9) - 412);
    expect(carouselItemScrollOffset(s, 0, 10)).toBe(0);
    expect(carouselItemScrollOffset(s, 9, 10)).toBeCloseTo(max, 0);
    // Items whose rest positions coincide (clamped to the range) resolve to the first of them.
    for (let i = 0; i < 10; i++) {
      const rest = carouselItemScrollOffset(s, i, 10);
      const current = carouselCurrentItem(s, 10, rest);
      expect(current).toBeLessThanOrEqual(i);
      expect(carouselItemScrollOffset(s, current, 10)).toBe(rest);
    }
  });

  it('starts at the padding, masks the medium and small items and pins them together', () => {
    const s = carouselStrategy(input);
    const max = calculateMaxScrollOffset(s, 10);
    const items = [0, 1, 2, 3].map((i) => carouselItemLayout(s, i, 0, max));
    // The first (large) item's visible start is the 16dp padding (the padding step shrinks it).
    expect(items[0]!.translation + items[0]!.maskStart).toBeCloseTo(16, 3);
    expect(items[0]!.size).toBeLessThanOrEqual(s.itemMainAxisSize);
    // Each visible item's mask starts 8dp after the previous one's end.
    for (let i = 1; i < 3; i++) {
      const prev = items[i - 1]!;
      const cur = items[i]!;
      const prevEnd = (i - 1) * (s.itemMainAxisSize + 8) + prev.translation + prev.maskEnd;
      const curStart = i * (s.itemMainAxisSize + 8) + cur.translation + cur.maskStart;
      expect(curStart - prevEnd).toBeCloseTo(8, 3);
    }
    expect(items[2]!.clipped).toBe(true);
    expect(items[2]!.size).toBeLessThan(items[1]!.size);
  });

  it('z-index falls off with the distance from the current item', () => {
    expect(carouselItemZIndex(3, 3)).toBe(1);
    expect(carouselItemZIndex(1, 3)).toBe(1 / 3);
  });

  it('an invalid layout (no item size) is not valid', () => {
    expect(carouselStrategy({ ...input, itemSize: null }).isValid).toBe(false);
  });
});

// --- JVM reference (pnpm reference:carousel) -----------------------------------------------------

interface ReferenceCase {
  name: string;
  layout: 'multi-browse' | 'uncontained' | 'hero' | 'centered-hero';
  availableSpace: number;
  itemSize: number | null;
  itemSpacing: number;
  itemCount: number;
  beforeContentPadding: number;
  afterContentPadding: number;
  valid: boolean;
  itemMainAxisSize?: number;
  defaultKeylines: number[][];
  startSteps: number[][][];
  endSteps: number[][][];
  snapOffsets: number[];
  maxScrollOffset: number;
  frames: { scrollOffset: number; items: number[][] }[];
}

const encode = (l: KeylineList) =>
  l.keylines.map((k) => [
    k.size,
    k.offset,
    k.unadjustedOffset,
    k.cutoff,
    Number(k.isFocal),
    Number(k.isAnchor),
    Number(k.isPivot),
  ]);

/** Kotlin prints a Float's shortest decimal; Math.fround turns it back into that Float. */
const toFloats = <T>(value: T): T =>
  (typeof value === 'number'
    ? f(value)
    : Array.isArray(value)
      ? value.map(toFloats)
      : value !== null && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFloats(v)]))
        : value) as T;

describe('JVM reference (Keylines.kt / Strategy.kt / KeylineSnapPosition.kt / carouselItem)', () => {
  const cases = toFloats((reference as { cases: ReferenceCase[] }).cases);

  it('covers every layout', () => {
    expect(new Set(cases.map((c) => c.layout))).toEqual(
      new Set(['multi-browse', 'uncontained', 'hero', 'centered-hero']),
    );
  });

  it.each(cases.map((c) => [c.name, c] as const))('%s', (_, c) => {
    const s = carouselStrategy(c);
    expect(s.isValid).toBe(c.valid);
    expect(encode(s.defaultKeylines)).toEqual(c.defaultKeylines);
    expect(s.startKeylineSteps.map(encode)).toEqual(c.startSteps);
    expect(s.endKeylineSteps.map(encode)).toEqual(c.endSteps);
    if (!c.valid) return;
    expect(s.itemMainAxisSize).toBe(c.itemMainAxisSize);
    expect(
      Array.from({ length: c.itemCount }, (_, i) => getSnapPositionOffset(s, i, c.itemCount)),
    ).toEqual(c.snapOffsets);
    const max = calculateMaxScrollOffset(s, c.itemCount);
    expect(max).toBe(c.maxScrollOffset);
    for (const frame of c.frames) {
      const items = Array.from({ length: c.itemCount }, (_, i) => {
        const item = carouselItemLayout(s, i, frame.scrollOffset, max);
        return [item.size, item.maskStart, item.maskEnd, item.translation, Number(item.clipped)];
      });
      expect(items, `scroll ${String(frame.scrollOffset)}`).toEqual(frame.items);
    }
  });
});
