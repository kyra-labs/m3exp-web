/*
 * Copyright 2023 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Ported to TypeScript by Kyra Labs from compose/material3/adaptive/adaptive-layout/src/commonMain/kotlin/androidx/compose/material3/adaptive/layout/ThreePaneScaffoldValue.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and (Copyright 2023-2025 The Android Open Source Project, same license), at the same commit, from
// compose/material3/adaptive/adaptive-layout/src/commonMain/kotlin/androidx/compose/material3/adaptive/layout/ThreePaneScaffold.kt,
// .../layout/PaneMotion.kt, .../layout/AdaptStrategy.kt, .../layout/PaneExpansionState.kt,
// .../layout/ListDetailPaneScaffold.kt, .../layout/SupportingPaneScaffold.kt and
// compose/material3/adaptive/adaptive-navigation/src/commonMain/kotlin/androidx/compose/material3/adaptive/navigation/ThreePaneScaffoldNavigator.kt,
// .../navigation/BackNavigationBehavior.kt.
//
// The canonical list-detail and supporting-pane layouts (COMPONENT_SPEC §16a) as pure functions:
// - calculateThreePaneScaffoldValue (ThreePaneScaffoldValue.kt L86-190): which pane is expanded,
//   reflowed or hidden for a directive's partitions, the adapt strategies and the destination
//   history. AdaptStrategy.Levitate is not ported (its dialog / sheet presentation waits for M9).
// - ThreePaneScaffoldNavigator (DefaultThreePaneScaffoldNavigator, ThreePaneScaffoldNavigator.kt
//   L359-490): the destination history behind navigateTo / navigateBack and the four
//   BackNavigationBehaviors. Synchronous here: the caller animates.
// - threePaneScaffoldLayout (ThreePaneContentMeasurePolicy.measure, ThreePaneScaffold.kt
//   L256-771): pane bounds from the preferred widths (the directive's default or a pane's own),
//   the remaining width to the highest-priority expanded pane or every pane scaled down, the
//   reflowed pane under its anchor, and the pane expansion (drag handle) split. Hinges
//   (excludedBounds) and levitated panes are not ported.
// - calculatePaneMotion and the slide offsets (PaneMotion.kt L276-476, L636-750).
// - Pane expansion anchors (PaneExpansionState.kt L345-366, L610-646, L700-860).
// Sizes are dp, which the web reads as CSS px; geometry is physical left-to-right: pass the pane
// order already mirrored for RTL (ThreePaneScaffoldHorizontalOrder.toLtrOrder).
import { SpringAnimatable } from './animatable.js';
import { type SpringSpec, springDurationMillis } from './spring.js';
import type { WindowSizeClass, WindowWidthSizeClass } from './window-size-class.js';
import { type PaneScaffoldDirective, paneScaffoldDirective } from './window-size-class.js';

/** ThreePaneScaffoldRole. */
export type ThreePaneScaffoldRole = 'primary' | 'secondary' | 'tertiary';

/** Roles in priority order (forEachPaneByPriority's tail, ThreePaneScaffoldValue.kt L187-189). */
export const THREE_PANE_SCAFFOLD_ROLES: readonly ThreePaneScaffoldRole[] = [
  'primary',
  'secondary',
  'tertiary',
];

/** ThreePaneScaffoldDefaults.Primary/Secondary/TertiaryPanePriority (ThreePaneScaffold.kt L1049-1051). */
const PRIORITY: Readonly<Record<ThreePaneScaffoldRole, number>> = {
  primary: 10,
  secondary: 5,
  tertiary: 1,
};

/** AdaptStrategy.Hide, or AdaptStrategy.Reflow(reflowUnder). */
export type AdaptStrategy = 'hide' | { readonly reflowUnder: ThreePaneScaffoldRole };

export type ThreePaneScaffoldAdaptStrategies = Readonly<
  Record<ThreePaneScaffoldRole, AdaptStrategy>
>;

/** ListDetailPaneScaffoldDefaults.adaptStrategies() (L208-217): every pane hides. */
export const LIST_DETAIL_ADAPT_STRATEGIES: ThreePaneScaffoldAdaptStrategies = {
  primary: 'hide',
  secondary: 'hide',
  tertiary: 'hide',
};

/**
 * SupportingPaneScaffoldDefaults.adaptStrategies() (L190-200): the supporting pane reflows under
 * the main pane; the others hide.
 */
export const SUPPORTING_PANE_ADAPT_STRATEGIES: ThreePaneScaffoldAdaptStrategies = {
  primary: 'hide',
  secondary: { reflowUnder: 'primary' },
  tertiary: 'hide',
};

/** ListDetailPaneScaffoldRole (ListDetailPaneScaffold.kt L238-259). */
export const ListDetailPaneScaffoldRole = /* @__PURE__ */ Object.freeze({
  List: 'secondary',
  Detail: 'primary',
  Extra: 'tertiary',
} as const);

/** SupportingPaneScaffoldRole (SupportingPaneScaffold.kt L221-243). */
export const SupportingPaneScaffoldRole = /* @__PURE__ */ Object.freeze({
  Main: 'primary',
  Supporting: 'secondary',
  Extra: 'tertiary',
} as const);

/** Start-to-end order: list (secondary), detail (primary), extra (ListDetailPaneScaffold L224-229). */
export const LIST_DETAIL_PANE_ORDER: readonly ThreePaneScaffoldRole[] = [
  'secondary',
  'primary',
  'tertiary',
];

/** Start-to-end order: main, supporting, extra (SupportingPaneScaffold L207-212). */
export const SUPPORTING_PANE_ORDER: readonly ThreePaneScaffoldRole[] = [
  'primary',
  'secondary',
  'tertiary',
];

/** PaneAdaptedValue (Levitated is not ported). */
export type PaneAdaptedValue = 'expanded' | 'reflowed' | 'hidden';

/** ThreePaneScaffoldValue. */
export interface ThreePaneScaffoldValue {
  readonly primary: PaneAdaptedValue;
  readonly secondary: PaneAdaptedValue;
  readonly tertiary: PaneAdaptedValue;
  /** The destination the value was calculated for (internal in Compose; not part of equality). */
  readonly currentDestination: ThreePaneScaffoldRole | null;
}

/** ThreePaneScaffoldValue.equals (L260-267): the three adapted values. */
export function sameThreePaneScaffoldValue(
  a: ThreePaneScaffoldValue,
  b: ThreePaneScaffoldValue,
): boolean {
  return a.primary === b.primary && a.secondary === b.secondary && a.tertiary === b.tertiary;
}

/** ThreePaneScaffoldDestinationItem. */
export interface ThreePaneScaffoldDestinationItem<T = unknown> {
  readonly pane: ThreePaneScaffoldRole;
  readonly contentKey?: T | undefined;
}

/**
 * calculateThreePaneScaffoldValue (ThreePaneScaffoldValue.kt L86-179): the last destination
 * first, then the earlier ones (newest first), then primary, secondary, tertiary each take a free
 * horizontal partition; with a single partition and `maxVerticalPartitions` ≥ 2, the first pane
 * whose strategy is Reflow goes under its (expanded) anchor instead.
 */
export function calculateThreePaneScaffoldValue(
  maxHorizontalPartitions: number,
  adaptStrategies: ThreePaneScaffoldAdaptStrategies,
  destinationHistory: readonly ThreePaneScaffoldDestinationItem[],
  maxVerticalPartitions = 1,
): ThreePaneScaffoldValue {
  let expandedCount = 0;
  const values: Partial<Record<ThreePaneScaffoldRole, PaneAdaptedValue>> = {};
  let checkReflowedPane =
    maxHorizontalPartitions === 1 &&
    maxVerticalPartitions > 1 &&
    THREE_PANE_SCAFFOLD_ROLES.some((r) => adaptStrategies[r] !== 'hide');
  const order = [...destinationHistory.map((d) => d.pane).reverse(), ...THREE_PANE_SCAFFOLD_ROLES];
  for (const pane of order) {
    const hasAvailablePartition = expandedCount < maxHorizontalPartitions;
    if (!hasAvailablePartition && !checkReflowedPane) break;
    if (values[pane] !== undefined) continue;
    let reflowedPane: ThreePaneScaffoldRole | null = null;
    let anchorPane = pane;
    let anchorValue: PaneAdaptedValue | undefined;
    const strategy = adaptStrategies[pane];
    if (checkReflowedPane && strategy !== 'hide') {
      reflowedPane = pane;
      anchorPane = strategy.reflowUnder;
      anchorValue = values[anchorPane];
    }
    if (anchorValue === undefined) {
      if (!hasAvailablePartition) continue;
      values[anchorPane] = 'expanded';
      expandedCount++;
    } else if (anchorValue !== 'expanded') {
      continue;
    }
    if (reflowedPane !== null) {
      values[reflowedPane] = 'reflowed';
      checkReflowedPane = false;
    }
  }
  return {
    primary: values.primary ?? 'hidden',
    secondary: values.secondary ?? 'hidden',
    tertiary: values.tertiary ?? 'hidden',
    currentDestination: destinationHistory[destinationHistory.length - 1]?.pane ?? null,
  };
}

/** The roles a value expands, in `order` (start to end). */
export function expandedPanes(
  value: ThreePaneScaffoldValue,
  order: readonly ThreePaneScaffoldRole[],
): ThreePaneScaffoldRole[] {
  return order.filter((r) => value[r] === 'expanded');
}

// --- Directive ----------------------------------------------------------------------------------

/**
 * How many panes may sit side by side: `recommended` (the default, owner decision 2026-10-18) =
 * m3.material.io Breakpoints (1 / 1 / 2 / 2 / 3: two panes at large, three at extra-large), never
 * more than Compose allows; `compose` = calculatePaneScaffoldDirective (1 / 1 / 2 / 3 / 3 by width
 * class: three panes from large).
 */
export type PaneRule = 'compose' | 'recommended';

/** m3.material.io Foundations › Layout › Breakpoints, "recommended" pane counts (FOUNDATIONS §9). */
export const RECOMMENDED_MAX_PANES: Readonly<Record<WindowWidthSizeClass, number>> =
  /* @__PURE__ */ Object.freeze({
    compact: 1,
    medium: 1,
    expanded: 2,
    large: 2,
    'extra-large': 3,
  });

export interface ThreePaneScaffoldDirectiveOptions {
  /** Default `recommended`; `compose` keeps calculatePaneScaffoldDirective's counts. */
  paneRule?: PaneRule | undefined;
  isTabletop?: boolean | undefined;
}

/**
 * paneScaffoldDirective (calculatePaneScaffoldDirective) with the `paneRule` cap applied: capped by
 * RECOMMENDED_MAX_PANES unless `paneRule` is `compose`.
 */
export function threePaneScaffoldDirective(
  sizeClass: WindowSizeClass,
  options: ThreePaneScaffoldDirectiveOptions = {},
): PaneScaffoldDirective {
  const directive = paneScaffoldDirective(sizeClass, options);
  if (options.paneRule === 'compose') return directive;
  return {
    ...directive,
    maxHorizontalPartitions: Math.min(
      directive.maxHorizontalPartitions,
      RECOMMENDED_MAX_PANES[sizeClass.widthClass],
    ),
  };
}

// --- Navigator ----------------------------------------------------------------------------------

/** BackNavigationBehavior (BackNavigationBehavior.kt L40-75). */
export type BackNavigationBehavior =
  | 'pop-latest'
  | 'pop-until-scaffold-value-change'
  | 'pop-until-current-destination-change'
  | 'pop-until-content-change';

export interface ThreePaneScaffoldNavigatorOptions<T> {
  scaffoldDirective: PaneScaffoldDirective;
  adaptStrategies: ThreePaneScaffoldAdaptStrategies;
  /** Default `true` (rememberListDetailPaneScaffoldNavigator). */
  isDestinationHistoryAware?: boolean | undefined;
  /** Default: the list pane (list-detail) or main pane (supporting pane); see the defaults below. */
  initialDestinationHistory: readonly ThreePaneScaffoldDestinationItem<T>[];
}

/** DefaultListDetailPaneHistory (ThreePaneScaffoldNavigator.kt L536-537): the list. */
export const LIST_DETAIL_INITIAL_HISTORY: readonly ThreePaneScaffoldDestinationItem<never>[] = [
  { pane: 'secondary' },
];

/** DefaultSupportingPaneHistory (L540-541): the main pane. */
export const SUPPORTING_PANE_INITIAL_HISTORY: readonly ThreePaneScaffoldDestinationItem<never>[] = [
  { pane: 'primary' },
];

/**
 * DefaultThreePaneScaffoldNavigator (ThreePaneScaffoldNavigator.kt L359-490) without Compose's
 * transition state: navigateTo / navigateBack change the history and the value at once; the
 * caller animates (and Compose's directive change snaps, L349-354: so does setting
 * `scaffoldDirective` here). Content keys compare with Object.is (Kotlin `equals` for data
 * classes: use primitives or shared objects).
 */
export class ThreePaneScaffoldNavigator<T = unknown> {
  #history: ThreePaneScaffoldDestinationItem<T>[];
  #directive: PaneScaffoldDirective;
  #strategies: ThreePaneScaffoldAdaptStrategies;
  #historyAware: boolean;
  #value: ThreePaneScaffoldValue;
  readonly #listeners = new Set<() => void>();

  constructor(options: ThreePaneScaffoldNavigatorOptions<T>) {
    this.#history = [...options.initialDestinationHistory];
    this.#directive = options.scaffoldDirective;
    this.#strategies = options.adaptStrategies;
    this.#historyAware = options.isDestinationHistoryAware ?? true;
    this.#value = this.#calculate(this.#history.length - 1);
  }

  get scaffoldDirective(): PaneScaffoldDirective {
    return this.#directive;
  }

  set scaffoldDirective(directive: PaneScaffoldDirective) {
    this.#directive = directive;
    this.#recalculate();
  }

  get adaptStrategies(): ThreePaneScaffoldAdaptStrategies {
    return this.#strategies;
  }

  set adaptStrategies(strategies: ThreePaneScaffoldAdaptStrategies) {
    this.#strategies = strategies;
    this.#recalculate();
  }

  get isDestinationHistoryAware(): boolean {
    return this.#historyAware;
  }

  set isDestinationHistoryAware(aware: boolean) {
    this.#historyAware = aware;
    this.#recalculate();
  }

  /** The destination history, oldest first. */
  get destinationHistory(): readonly ThreePaneScaffoldDestinationItem<T>[] {
    return this.#history;
  }

  get currentDestination(): ThreePaneScaffoldDestinationItem<T> | null {
    return this.#history[this.#history.length - 1] ?? null;
  }

  get scaffoldValue(): ThreePaneScaffoldValue {
    return this.#value;
  }

  /** Calls `listener` after every change of the history or the value; returns the unsubscriber. */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  peekPreviousScaffoldValue(
    behavior: BackNavigationBehavior = 'pop-until-scaffold-value-change',
  ): ThreePaneScaffoldValue {
    const index = this.#previousIndex(behavior);
    return index === -1 ? this.#value : this.#calculate(index);
  }

  navigateTo(pane: ThreePaneScaffoldRole, contentKey?: T): void {
    this.#history.push({ pane, contentKey });
    this.#recalculate(true);
  }

  canNavigateBack(behavior: BackNavigationBehavior = 'pop-until-scaffold-value-change'): boolean {
    return this.#previousIndex(behavior) >= 0;
  }

  /** Returns true when there was a destination to go back to (else the history is cleared). */
  navigateBack(behavior: BackNavigationBehavior = 'pop-until-scaffold-value-change'): boolean {
    const previous = this.#previousIndex(behavior);
    if (previous < 0) {
      this.#history = [];
      this.#recalculate(true);
      return false;
    }
    this.#history.length = previous + 1;
    this.#recalculate(true);
    return true;
  }

  #recalculate(force = false): void {
    const next = this.#calculate(this.#history.length - 1);
    const changed = force || !sameThreePaneScaffoldValue(next, this.#value);
    this.#value = next;
    if (changed) for (const listener of [...this.#listeners]) listener();
  }

  /** getPreviousDestinationIndex (L430-466). */
  #previousIndex(behavior: BackNavigationBehavior): number {
    const history = this.#history;
    if (history.length <= 1) return -1;
    const last = history.length - 1;
    const current = history[last];
    for (let i = last - 1; i >= 0; i--) {
      const item = history[i];
      if (!item) continue;
      switch (behavior) {
        case 'pop-latest':
          return i;
        case 'pop-until-scaffold-value-change':
          if (!sameThreePaneScaffoldValue(this.#calculate(i), this.#value)) return i;
          break;
        case 'pop-until-current-destination-change':
          if (item.pane !== current?.pane) return i;
          break;
        case 'pop-until-content-change':
          if (!Object.is(item.contentKey, current?.contentKey)) return i;
          if (!sameThreePaneScaffoldValue(this.#calculate(i), this.#value)) return i;
          break;
      }
    }
    return -1;
  }

  /** calculateScaffoldValue (L468-490). */
  #calculate(index: number): ThreePaneScaffoldValue {
    const { maxHorizontalPartitions, maxVerticalPartitions } = this.#directive;
    const history =
      index === -1
        ? []
        : this.#historyAware
          ? this.#history.slice(0, index + 1)
          : this.#history.slice(index, index + 1);
    return calculateThreePaneScaffoldValue(
      maxHorizontalPartitions,
      this.#strategies,
      history,
      maxVerticalPartitions,
    );
  }
}

// --- Layout -------------------------------------------------------------------------------------

/** A pane's bounds in the scaffold, CSS px, physical (x from the left edge). */
export interface PaneRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** PaneExpansionState as the layout reads it (all CSS px). */
export interface PaneExpansionLayout {
  /** currentDraggingOffset: the handle's centre while dragging or settling. */
  readonly draggingOffset?: number | undefined;
  /** firstPaneWidth: a resting split (set from an anchor or a released drag). */
  readonly firstPaneWidth?: number | undefined;
}

export interface ThreePaneScaffoldLayoutInput {
  readonly width: number;
  readonly height: number;
  readonly directive: PaneScaffoldDirective;
  readonly value: ThreePaneScaffoldValue;
  /** Start to end, already mirrored for RTL (physical left to right). */
  readonly order: readonly ThreePaneScaffoldRole[];
  readonly adaptStrategies: ThreePaneScaffoldAdaptStrategies;
  /** Panes that exist (a scaffold without an extra pane has no tertiary pane). Default: all. */
  readonly present?: readonly ThreePaneScaffoldRole[] | undefined;
  /** PaneScaffoldScope.preferredWidth per pane (px); default the directive's. */
  readonly preferredWidths?: Partial<Record<ThreePaneScaffoldRole, number>> | undefined;
  /** PaneScaffoldScope.preferredHeight per pane (px); default the directive's. */
  readonly preferredHeights?: Partial<Record<ThreePaneScaffoldRole, number>> | undefined;
  readonly expansion?: PaneExpansionLayout | undefined;
}

export interface ThreePaneScaffoldLayout {
  /** Bounds of the expanded and reflowed panes (a collapsed pane of a split has width 0). */
  readonly panes: Partial<Record<ThreePaneScaffoldRole, PaneRect>>;
  /** The drag handle's centre x when exactly two panes are expanded, else null. */
  readonly handleOffset: number | null;
}

interface Measuring {
  role: ThreePaneScaffoldRole;
  width: number;
  height: number;
  bounds: PaneRect | null;
}

/** ThreePaneContentMeasurePolicy.measure (ThreePaneScaffold.kt L256-594), no hinges. */
export function threePaneScaffoldLayout(
  input: ThreePaneScaffoldLayoutInput,
): ThreePaneScaffoldLayout {
  const { width: W, height: H, directive, value, order } = input;
  const present = input.present ?? THREE_PANE_SCAFFOLD_ROLES;
  const make = (role: ThreePaneScaffoldRole): Measuring => ({
    role,
    width: input.preferredWidths?.[role] ?? directive.defaultPanePreferredWidth,
    height: input.preferredHeights?.[role] ?? directive.defaultPanePreferredHeight,
    bounds: null,
  });
  const select = (pick: (v: PaneAdaptedValue) => boolean) =>
    order.filter((r) => present.includes(r) && pick(value[r])).map(make);
  const expanded = select((v) => v === 'expanded');
  const reflowed = select((v) => v === 'reflowed');
  const spacer = directive.horizontalPartitionSpacerSize;
  const vSpacer = directive.verticalPartitionSpacerSize;
  const outer: PaneRect = { x: 0, y: 0, width: W, height: H };
  const right = (r: PaneRect) => r.x + r.width;
  const between = (left: number, rightEdge: number): PaneRect => ({
    x: left,
    y: 0,
    width: rightEdge - left,
    height: H,
  });

  /** measureAndPlacePanesInPartition (L737-771). */
  const inPartition = (partition: PaneRect, pane: Measuring) => {
    const flowed = reflowed[0];
    const strategy = flowed ? input.adaptStrategies[flowed.role] : 'hide';
    if (flowed && strategy !== 'hide' && strategy.reflowUnder === pane.role) {
      const available = partition.height - vSpacer;
      pane.height = Math.max(available - flowed.height, Math.trunc(available / 2));
      flowed.height = available - pane.height;
      flowed.bounds = {
        x: partition.x,
        y: partition.y + pane.height + vSpacer,
        width: partition.width,
        height: partition.height - pane.height - vSpacer,
      };
    } else {
      pane.height = partition.height;
    }
    pane.bounds = { ...partition, height: pane.height };
  };

  /** measureAndPlacePartitionsInBounds (L700-735). */
  const partitions = (bounds: PaneRect, panes: Measuring[]) => {
    if (panes.length === 0) return;
    const allocatable = bounds.width - (panes.length - 1) * spacer;
    const total = panes.reduce((sum, p) => sum + p.width, 0);
    if (allocatable > total) {
      const top = panes.reduce((a, b) => (PRIORITY[b.role] > PRIORITY[a.role] ? b : a));
      top.width += allocatable - total;
    } else if (allocatable < total) {
      const scale = Math.fround(allocatable / total);
      for (const p of panes) p.width = Math.trunc(Math.fround(p.width * scale));
    }
    let x = bounds.x;
    for (const p of panes) {
      inPartition({ x, y: bounds.y, width: p.width, height: bounds.height }, p);
      x += p.width + spacer;
    }
  };

  const expansion = input.expansion;
  const first = expanded[0];
  const second = expanded[1];
  const dragging = expansion?.draggingOffset;
  const resting = expansion?.firstPaneWidth;
  if (
    expanded.length === 2 &&
    first &&
    second &&
    (dragging !== undefined || resting !== undefined)
  ) {
    const half = Math.trunc(spacer / 2);
    if (dragging !== undefined) {
      // Respect the user's drag (L363-439); the bounds shift while dragging or settling.
      if (dragging <= half)
        inPartition({ ...outer, x: dragging * 2, width: W - dragging * 2 }, second);
      else if (dragging >= W - half) inPartition({ ...outer, width: dragging * 2 - W }, first);
      else {
        inPartition(between(0, dragging - half), first);
        inPartition(between(dragging + half, W), second);
      }
    } else if (resting !== undefined) {
      // Pane expansion from a resting value (L382-437).
      const firstWidth = Math.max(0, Math.min(resting, W));
      if (firstWidth === 0) inPartition(outer, second);
      else if (firstWidth >= W - spacer) inPartition(outer, first);
      else {
        inPartition(between(0, firstWidth), first);
        inPartition(between(firstWidth + spacer, W), second);
      }
    }
  } else {
    partitions(outer, expanded);
  }

  // The drag handle sits in the middle of the spacer (getSpacerMiddleOffsetX L914-922).
  let handleOffset: number | null = null;
  if (expanded.length === 2 && first && second) {
    if (dragging !== undefined) handleOffset = dragging;
    else if (first.bounds && second.bounds)
      handleOffset = Math.trunc((right(first.bounds) + second.bounds.x) / 2);
    else if (first.bounds) handleOffset = right(first.bounds);
    else if (second.bounds) handleOffset = 0;
  }

  const panes: Partial<Record<ThreePaneScaffoldRole, PaneRect>> = {};
  for (const p of [...expanded, ...reflowed]) {
    panes[p.role] = p.bounds ?? { x: 0, y: 0, width: 0, height: 0 };
  }
  return { panes, handleOffset };
}

// --- Motion -------------------------------------------------------------------------------------

/** PaneMotion (PaneMotion.kt L556-632; EnterAsModal / ExitAsModal belong to Levitate). */
export type PaneMotion =
  | 'none'
  | 'animate-bounds'
  | 'enter-from-left'
  | 'enter-from-right'
  | 'enter-from-left-delayed'
  | 'enter-from-right-delayed'
  | 'exit-to-left'
  | 'exit-to-right'
  | 'enter-with-expand'
  | 'exit-with-shrink';

type MotionType = 'hidden' | 'exiting' | 'entering' | 'shown';

const motionType = (motion: PaneMotion): MotionType =>
  motion === 'none'
    ? 'hidden'
    : motion === 'animate-bounds'
      ? 'shown'
      : motion.startsWith('enter')
        ? 'entering'
        : 'exiting';

/** PaneMotion.Type.calculate (L531-547). */
function typeOf(previous: PaneAdaptedValue, current: PaneAdaptedValue): MotionType {
  const was = previous !== 'hidden';
  const is = current !== 'hidden';
  return was && is ? 'shown' : was ? 'exiting' : is ? 'entering' : 'hidden';
}

/** calculatePaneMotion (PaneMotion.kt L636-750) for the panes in `order` (physical, LTR). */
export function calculatePaneMotion(
  previous: ThreePaneScaffoldValue,
  current: ThreePaneScaffoldValue,
  order: readonly ThreePaneScaffoldRole[],
): Record<ThreePaneScaffoldRole, PaneMotion> {
  const n = order.length;
  const types = order.map((r) => typeOf(previous[r], current[r]));
  const motions: PaneMotion[] = order.map(() => 'none');
  let firstShown = n;
  let firstEntering = n;
  let lastShown = -1;
  let lastEntering = -1;
  types.forEach((t, i) => {
    if (t === 'shown') {
      firstShown = Math.min(firstShown, i);
      lastShown = Math.max(lastShown, i);
      motions[i] = 'animate-bounds';
    } else if (t === 'entering') {
      firstEntering = Math.min(firstEntering, i);
      lastEntering = Math.max(lastEntering, i);
    }
  });
  let exitRight = false;
  let exitLeft = false;
  let firstExitRight = n;
  let lastExitLeft = -1;
  types.forEach((t, i) => {
    if (t !== 'exiting') return;
    const shownLeft = firstShown < i;
    const enteringLeft = firstEntering < i;
    const shownRight = lastShown > i;
    const enteringRight = lastEntering > i;
    const toRight = () => {
      exitRight = true;
      firstExitRight = Math.min(firstExitRight, i);
      motions[i] = 'exit-to-right';
    };
    const toLeft = () => {
      exitLeft = true;
      lastExitLeft = Math.max(lastExitLeft, i);
      motions[i] = 'exit-to-left';
    };
    // Nothing on that side, else only shown panes block it, else both sides are blocked.
    if (!shownRight && !enteringRight) toRight();
    else if (!shownLeft && !enteringLeft) toLeft();
    else if (!shownRight) toRight();
    else if (!shownLeft) toLeft();
    else motions[i] = 'exit-with-shrink';
  });
  types.forEach((t, i) => {
    if (t !== 'entering') return;
    const freeRight = !(lastShown > i) && !(lastExitLeft > i);
    const freeLeft = !(firstShown < i) && !(firstExitRight < i);
    motions[i] =
      freeRight && !exitRight
        ? 'enter-from-right'
        : freeLeft && !exitLeft
          ? 'enter-from-left'
          : freeRight
            ? 'enter-from-right-delayed'
            : freeLeft
              ? 'enter-from-left-delayed'
              : 'enter-with-expand';
  });
  const out = { primary: 'none', secondary: 'none', tertiary: 'none' } as Record<
    ThreePaneScaffoldRole,
    PaneMotion
  >;
  order.forEach((r, i) => {
    out[r] = motions[i] ?? 'none';
  });
  return out;
}

/** Where each pane animates from and to for a motion (the default enter / exit transitions). */
export interface PaneTransition {
  readonly motion: PaneMotion;
  readonly from: PaneRect;
  readonly to: PaneRect;
  /** EnterFrom*Delayed: DelayedSpringSpec's delayedRatio (PaneMotionDefaults L167-173). */
  readonly delayed: boolean;
}

/** PaneMotionDefaults.DelayedAnimationSpec's delayedRatio (PaneMotion.kt L171). */
export const PANE_MOTION_DELAYED_RATIO = 0.1;

/**
 * calculateDefaultEnterTransition / calculateDefaultExitTransition (PaneMotion.kt L425-476) with
 * the slide offsets (L276-414): `origin` holds the bounds before the change (the panes shown
 * then), `target` the bounds after it, both from threePaneScaffoldLayout. Entering panes slide (or
 * expand) from outside to `target`; exiting panes slide (or shrink) from `origin` out; panes shown
 * before and after animate their bounds.
 */
export function paneTransitions(
  motions: Readonly<Record<ThreePaneScaffoldRole, PaneMotion>>,
  order: readonly ThreePaneScaffoldRole[],
  origin: Partial<Record<ThreePaneScaffoldRole, PaneRect>>,
  target: Partial<Record<ThreePaneScaffoldRole, PaneRect>>,
  scaffoldWidth: number,
): Partial<Record<ThreePaneScaffoldRole, PaneTransition>> {
  const zero: PaneRect = { x: 0, y: 0, width: 0, height: 0 };
  const t = (r: ThreePaneScaffoldRole) => target[r] ?? origin[r] ?? zero;
  const o = (r: ThreePaneScaffoldRole) => origin[r] ?? target[r] ?? zero;
  const type = (r: ThreePaneScaffoldRole) => motionType(motions[r]);
  const shown = (r: ThreePaneScaffoldRole, other: MotionType) =>
    type(r) === 'shown' || type(r) === other;
  const reversed = [...order].reverse();

  const slideInFromLeft = (): number => {
    let previous: ThreePaneScaffoldRole | null = null;
    for (const r of reversed) {
      const m = motions[r];
      if (m === 'enter-from-left' || m === 'enter-from-left-delayed')
        return -(previous ? t(previous).x : t(r).x + t(r).width);
      if (shown(r, 'entering')) previous = r;
    }
    return 0;
  };
  const slideInFromRight = (): number => {
    let previous: ThreePaneScaffoldRole | null = null;
    for (const r of order) {
      const m = motions[r];
      if (m === 'enter-from-right' || m === 'enter-from-right-delayed')
        return scaffoldWidth - (previous ? t(previous).x + t(previous).width : t(r).x);
      if (shown(r, 'entering')) previous = r;
    }
    return 0;
  };
  const slideOutToLeft = (): number => {
    let previous: ThreePaneScaffoldRole | null = null;
    for (const r of reversed) {
      if (motions[r] === 'exit-to-left') return -(previous ? o(previous).x : o(r).x + o(r).width);
      if (shown(r, 'exiting')) previous = r;
    }
    return 0;
  };
  const slideOutToRight = (): number => {
    let previous: ThreePaneScaffoldRole | null = null;
    for (const r of order) {
      if (motions[r] === 'exit-to-right')
        return scaffoldWidth - (previous ? o(previous).x + o(previous).width : o(r).x);
      if (shown(r, 'exiting')) previous = r;
    }
    return 0;
  };
  /** getHiddenPaneCurrentLeft (L379-393) / getHidingPaneTargetLeft (L397-414). */
  const leftEdge = (role: ThreePaneScaffoldRole, other: MotionType, rect: typeof t) => {
    let edge = 0;
    for (const r of order) {
      if (r === role) return edge;
      if (shown(r, other)) edge = rect(r).x + rect(r).width;
    }
    return edge;
  };

  const out: Partial<Record<ThreePaneScaffoldRole, PaneTransition>> = {};
  for (const r of order) {
    const motion = motions[r];
    const to = t(r);
    const from = o(r);
    const shift = (rect: PaneRect, dx: number): PaneRect => ({ ...rect, x: rect.x + dx });
    let transition: PaneTransition | null = null;
    switch (motion) {
      case 'animate-bounds':
        transition = { motion, from, to, delayed: false };
        break;
      case 'enter-from-left':
      case 'enter-from-left-delayed':
        transition = {
          motion,
          from: shift(to, slideInFromLeft()),
          to,
          delayed: motion.endsWith('delayed'),
        };
        break;
      case 'enter-from-right':
      case 'enter-from-right-delayed':
        transition = {
          motion,
          from: shift(to, slideInFromRight()),
          to,
          delayed: motion.endsWith('delayed'),
        };
        break;
      case 'enter-with-expand':
        // expandHorizontally(CenterHorizontally) + slideInHorizontally from the hidden left edge.
        transition = {
          motion,
          from: { ...to, x: leftEdge(r, 'exiting', o), width: 0 },
          to,
          delayed: false,
        };
        break;
      case 'exit-to-left':
        transition = { motion, from, to: shift(from, slideOutToLeft()), delayed: false };
        break;
      case 'exit-to-right':
        transition = { motion, from, to: shift(from, slideOutToRight()), delayed: false };
        break;
      case 'exit-with-shrink':
        transition = {
          motion,
          from,
          to: { ...from, x: leftEdge(r, 'entering', t), width: 0 },
          delayed: false,
        };
        break;
      case 'none':
        break;
    }
    if (transition) out[r] = transition;
  }
  return out;
}

// --- Pane expansion -----------------------------------------------------------------------------

/** PaneExpansionAnchor: Proportion, Offset.fromStart or Offset.fromEnd (px). */
export type PaneExpansionAnchor =
  | { readonly proportion: number }
  | { readonly offsetFromStart: number }
  | { readonly offsetFromEnd: number };

/**
 * The samples' anchors (ThreePaneScaffoldSample.kt L1102-1109): 0 %, 240dp from the start, 50 %,
 * 240dp from the end, 100 %. Compose's own default is no anchors.
 */
export const PANE_EXPANSION_SAMPLE_ANCHORS: readonly PaneExpansionAnchor[] = [
  { proportion: 0 },
  { offsetFromStart: 240 },
  { proportion: 0.5 },
  { offsetFromEnd: 240 },
  { proportion: 1 },
];

/** PaneExpansionState.AnchoringVelocityThreshold (px/s, L648). */
export const PANE_EXPANSION_ANCHORING_VELOCITY_THRESHOLD = 200;

/** PaneExpansionAnchor.positionIn (L700-712, L754-755, L835-856): the handle's centre x. */
export function paneExpansionAnchorPosition(
  anchor: PaneExpansionAnchor,
  width: number,
  rtl = false,
): number {
  const offset =
    'proportion' in anchor
      ? Math.min(Math.max(Math.round(width * anchor.proportion), 0), width)
      : 'offsetFromStart' in anchor
        ? Math.round(anchor.offsetFromStart)
        : width - Math.round(anchor.offsetFromEnd);
  return rtl ? width - offset : offset;
}

/**
 * The anchor a release settles to (getPositionOfTheClosestAnchor, L610-646): the closest one, or
 * with |velocity| ≥ 200 px/s the closest in the direction of the fling (the closest overall when
 * none lies that way). Returns the index into `anchors`, or -1 without anchors. Compose first runs
 * the fling's decay and settles from where it stops; this picks from the release position.
 */
export function closestPaneExpansionAnchor(
  anchors: readonly PaneExpansionAnchor[],
  width: number,
  position: number,
  velocity: number,
  rtl = false,
): number {
  let best = -1;
  let bestScore = Infinity;
  const candidates: { at: number; index: number; score: number }[] = [];
  anchors.forEach((anchor, index) => {
    const at = paneExpansionAnchorPosition(anchor, width, rtl);
    let score: number;
    if (velocity >= PANE_EXPANSION_ANCHORING_VELOCITY_THRESHOLD) {
      const delta = at - position;
      score = delta < 0 ? width - delta : delta;
    } else if (velocity <= -PANE_EXPANSION_ANCHORING_VELOCITY_THRESHOLD) {
      const delta = position - at;
      score = delta < 0 ? width - delta : delta;
    } else score = Math.abs(position - at);
    candidates.push({ at, index, score });
  });
  // Compose sorts the anchors by position and keeps the first minimum.
  candidates.sort((a, b) => a.at - b.at || a.index - b.index);
  for (const c of candidates) {
    if (c.score < bestScore) {
      best = c.index;
      bestScore = c.score;
    }
  }
  return best;
}

/**
 * PaneExpansionState.nextAnchor (L345-366): the first anchor (by position) right of `position`,
 * wrapping to the leftmost. The drag handle's click action moves there. -1 without anchors.
 */
export function nextPaneExpansionAnchor(
  anchors: readonly PaneExpansionAnchor[],
  width: number,
  position: number,
  rtl = false,
): number {
  const sorted = anchors
    .map((anchor, index) => ({ at: paneExpansionAnchorPosition(anchor, width, rtl), index }))
    .sort((a, b) => a.at - b.at || a.index - b.index);
  return (sorted.find((a) => position < a.at) ?? sorted[0])?.index ?? -1;
}

// --- Animation ----------------------------------------------------------------------------------

/** PaneMotionDefaults' IntRect / IntOffset visibility threshold (PaneMotion.kt L148): 1px. */
export const PANE_MOTION_VISIBILITY_THRESHOLD = 1;

const KEYS = ['x', 'y', 'width', 'height'] as const;

interface PaneSprings {
  readonly springs: Record<(typeof KEYS)[number], SpringAnimatable>;
  readonly to: PaneRect;
  readonly spec: SpringSpec | null;
  /** Start time of a delayed spring that has not started yet. */
  delayUntil: number | null;
}

export interface ThreePaneScaffoldSample {
  /** The animated bounds of every pane in the transition (entering, shown, exiting). */
  readonly panes: Partial<Record<ThreePaneScaffoldRole, PaneRect>>;
  readonly running: boolean;
}

/**
 * The pane transitions of one scaffold change, driven by the caller's clock (ms): each pane's
 * bounds run on PaneMotionDefaults.AnimationSpec (spring 0.8 / 380 at a 1px threshold, each
 * component on its own, as Compose's IntRect / IntOffset springs), EnterFrom*Delayed after 10 % of
 * that spring's duration (DelayedSpringSpec, PaneMotion.kt L822-908). A new `start` mid-flight
 * continues every pane still in the transition from its current bounds and velocity. `spec` null
 * (reduced motion) jumps to the end.
 */
export class ThreePaneScaffoldAnimation {
  #panes = new Map<ThreePaneScaffoldRole, PaneSprings>();

  start(
    transitions: Partial<Record<ThreePaneScaffoldRole, PaneTransition>>,
    spec: SpringSpec | null,
    now: number,
  ): void {
    const next = new Map<ThreePaneScaffoldRole, PaneSprings>();
    for (const role of THREE_PANE_SCAFFOLD_ROLES) {
      const transition = transitions[role];
      if (!transition) continue;
      const { from, to } = transition;
      const previous = this.#panes.get(role);
      if (previous) for (const k of KEYS) previous.springs[k].sample(now);
      const springs =
        previous?.springs ??
        (Object.fromEntries(
          KEYS.map((k) => [k, new SpringAnimatable(from[k], PANE_MOTION_VISIBILITY_THRESHOLD)]),
        ) as PaneSprings['springs']);
      const pane: PaneSprings = { springs, to, spec, delayUntil: null };
      if (transition.delayed && spec !== null && !previous) {
        const duration = Math.max(
          ...KEYS.map((k) =>
            springDurationMillis(spec, from[k], to[k], 0, PANE_MOTION_VISIBILITY_THRESHOLD),
          ),
        );
        pane.delayUntil = now + Math.trunc(duration * PANE_MOTION_DELAYED_RATIO);
      } else {
        for (const k of KEYS) springs[k].animateTo(to[k], spec, now);
      }
      next.set(role, pane);
    }
    this.#panes = next;
  }

  /** Jumps every pane to its target. */
  finish(): void {
    for (const pane of this.#panes.values()) {
      pane.delayUntil = null;
      for (const k of KEYS) pane.springs[k].snapTo(pane.to[k]);
    }
  }

  sample(now: number): ThreePaneScaffoldSample {
    const panes: Partial<Record<ThreePaneScaffoldRole, PaneRect>> = {};
    let running = false;
    for (const [role, pane] of this.#panes) {
      const s = pane.springs;
      if (pane.delayUntil !== null && now >= pane.delayUntil) {
        for (const k of KEYS) s[k].animateTo(pane.to[k], pane.spec, pane.delayUntil);
        pane.delayUntil = null;
      }
      panes[role] = {
        x: s.x.sample(now),
        y: s.y.sample(now),
        width: Math.max(0, s.width.sample(now)),
        height: Math.max(0, s.height.sample(now)),
      };
      if (pane.delayUntil !== null || KEYS.some((k) => s[k].isRunning)) running = true;
    }
    return { panes, running };
  }
}
