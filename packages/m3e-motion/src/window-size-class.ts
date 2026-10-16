/*
 * Copyright 2022 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from window/window-core/src/commonMain/kotlin/androidx/window/core/layout/WindowSizeClass.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and (Copyright 2023-2025 The Android Open Source Project, same license)
// compose/material3/adaptive/adaptive/src/commonMain/kotlin/androidx/compose/material3/adaptive/WindowSizeClassHelper.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898,
// compose/material3/adaptive/adaptive/src/commonMain/kotlin/androidx/compose/material3/adaptive/WindowAdaptiveInfo.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898,
// compose/material3/adaptive/adaptive-layout/src/commonMain/kotlin/androidx/compose/material3/adaptive/layout/PaneScaffoldDirective.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/material3/material3-adaptive-navigation-suite/src/commonMain/kotlin/androidx/compose/material3/adaptive/navigationsuite/NavigationSuiteScaffold.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The breakpoints are WindowSizeClass's companion lower bounds (L146-161; the released
// window-core 1.5.0 that material3-adaptive depends on has the identical file). Classification is
// computeFromDpSize (WindowSizeClassHelper.kt L162-170): the largest supported lower bound <= the
// window size, with the V2 width set (Compact, Medium, Expanded, Large, ExtraLarge; L96, used by
// currentWindowAdaptiveInfoV2, WindowAdaptiveInfo.kt L40-41) by default and the V1 set (L90,
// the deprecated currentWindowAdaptiveInfo()) on request. paneScaffoldDirective is
// calculatePaneScaffoldDirective (PaneScaffoldDirective.kt L48-106) without hinge exclusion, and
// navigationSuiteType is NavigationSuiteScaffoldDefaults.navigationSuiteType (L1167-1180). Sizes
// are dp, which the web reads as CSS px.

/** Width size classes, smallest first (DpWidthSizeClasses). */
export type WindowWidthSizeClass = 'compact' | 'medium' | 'expanded' | 'large' | 'extra-large';

/** Height size classes, smallest first (DpHeightSizeClasses). */
export type WindowHeightSizeClass = 'compact' | 'medium' | 'expanded';

/** Lower bound (min-width, dp = CSS px) of each width size class (WindowSizeClass L146-155). */
export const WINDOW_WIDTH_BREAKPOINTS: Readonly<Record<WindowWidthSizeClass, number>> =
  /* @__PURE__ */ Object.freeze({
    compact: 0,
    medium: 600,
    expanded: 840,
    large: 1200,
    'extra-large': 1600,
  });

/** Lower bound (min-height, dp = CSS px) of each height size class (WindowSizeClass L158-161). */
export const WINDOW_HEIGHT_BREAKPOINTS: Readonly<Record<WindowHeightSizeClass, number>> =
  /* @__PURE__ */ Object.freeze({ compact: 0, medium: 480, expanded: 900 });

/** A window's (or container's) size class: androidx `WindowSizeClass` plus its bucket names. */
export interface WindowSizeClass {
  readonly widthClass: WindowWidthSizeClass;
  readonly heightClass: WindowHeightSizeClass;
  /** Lower bound of the width class in CSS px (`minWidthDp`). */
  readonly minWidth: number;
  /** Lower bound of the height class in CSS px (`minHeightDp`). */
  readonly minHeight: number;
}

export interface WindowSizeClassOptions {
  /**
   * Classify widths into the large and extra-large classes (currentWindowAdaptiveInfoV2; default
   * `true`). `false` keeps the V1 set, where every width from 840 is `expanded`.
   */
  largeAndExtraLargeWidth?: boolean | undefined;
}

const WIDTH_CLASSES: readonly WindowWidthSizeClass[] = [
  'compact',
  'medium',
  'expanded',
  'large',
  'extra-large',
];
const HEIGHT_CLASSES: readonly WindowHeightSizeClass[] = ['compact', 'medium', 'expanded'];

/** The largest class whose lower bound is <= `size` (computeFromDpSize's filter + maxOf). */
function bucket<T extends string>(
  size: number,
  compact: T,
  classes: readonly T[],
  bounds: Readonly<Record<T, number>>,
): T {
  let match = compact;
  for (const c of classes) if (size >= bounds[c]) match = c;
  return match;
}

/**
 * The width size class of a window `widthPx` CSS px wide. Negative or NaN widths (androidx
 * rejects them) classify as compact.
 */
export function windowWidthSizeClass(
  widthPx: number,
  options: WindowSizeClassOptions = {},
): WindowWidthSizeClass {
  const classes =
    options.largeAndExtraLargeWidth === false ? WIDTH_CLASSES.slice(0, 3) : WIDTH_CLASSES;
  return bucket(widthPx, 'compact', classes, WINDOW_WIDTH_BREAKPOINTS);
}

/** The height size class of a window `heightPx` CSS px tall. */
export function windowHeightSizeClass(heightPx: number): WindowHeightSizeClass {
  return bucket(heightPx, 'compact', HEIGHT_CLASSES, WINDOW_HEIGHT_BREAKPOINTS);
}

/** The size class of a `width` × `height` CSS px window or container. */
export function windowSizeClass(
  size: { readonly width: number; readonly height: number },
  options: WindowSizeClassOptions = {},
): WindowSizeClass {
  const widthClass = windowWidthSizeClass(size.width, options);
  const heightClass = windowHeightSizeClass(size.height);
  return {
    widthClass,
    heightClass,
    minWidth: WINDOW_WIDTH_BREAKPOINTS[widthClass],
    minHeight: WINDOW_HEIGHT_BREAKPOINTS[heightClass],
  };
}

/** Whether two size classes are the same bucket (WindowSizeClass.equals). */
export function sameWindowSizeClass(a: WindowSizeClass, b: WindowSizeClass): boolean {
  return a.minWidth === b.minWidth && a.minHeight === b.minHeight;
}

const widthBound = (b: WindowWidthSizeClass | number) =>
  typeof b === 'number' ? b : WINDOW_WIDTH_BREAKPOINTS[b];
const heightBound = (b: WindowHeightSizeClass | number) =>
  typeof b === 'number' ? b : WINDOW_HEIGHT_BREAKPOINTS[b];

/**
 * `minWidth >= breakpoint` (isWidthAtLeastBreakpoint, L98-100). `breakpoint` is a class name or a
 * px lower bound. Like androidx, check from the largest breakpoint down.
 */
export function isWidthAtLeastBreakpoint(
  sizeClass: WindowSizeClass,
  breakpoint: WindowWidthSizeClass | number,
): boolean {
  return sizeClass.minWidth >= widthBound(breakpoint);
}

/** `minHeight >= breakpoint` (isHeightAtLeastBreakpoint, L107-109). */
export function isHeightAtLeastBreakpoint(
  sizeClass: WindowSizeClass,
  breakpoint: WindowHeightSizeClass | number,
): boolean {
  return sizeClass.minHeight >= heightBound(breakpoint);
}

/** Both of the above (isAtLeastBreakpoint, L117-120). */
export function isAtLeastBreakpoint(
  sizeClass: WindowSizeClass,
  widthBreakpoint: WindowWidthSizeClass | number,
  heightBreakpoint: WindowHeightSizeClass | number,
): boolean {
  return (
    isWidthAtLeastBreakpoint(sizeClass, widthBreakpoint) &&
    isHeightAtLeastBreakpoint(sizeClass, heightBreakpoint)
  );
}

/** Posture input for the directive and the navigation suite (Compose `Posture.isTabletop`). */
export interface WindowPostureOptions {
  /** A half-folded device with a horizontal hinge. Default `false`. */
  isTabletop?: boolean | undefined;
}

/** Material's recommended pane layout for a size class (PaneScaffoldDirective, without hinges). */
export interface PaneScaffoldDirective {
  /** Panes side by side at most: 1 at compact/medium, 2 at expanded, 3 from large. */
  readonly maxHorizontalPartitions: number;
  /** Spacer between side-by-side panes, CSS px. */
  readonly horizontalPartitionSpacerSize: number;
  /** Panes stacked at most: 2 on a tabletop posture or a single-pane expanded-height window. */
  readonly maxVerticalPartitions: number;
  readonly verticalPartitionSpacerSize: number;
  /** Default preferred pane width, CSS px (the fixed pane of a fixed-and-flexible layout). */
  readonly defaultPanePreferredWidth: number;
  readonly defaultPanePreferredHeight: number;
}

// PaneScaffoldDirective.kt: partition spacers (L68, L73, L88) and the companion's default pane
// sizes (L346-348).
const PARTITION_SPACER = 24;
const DEFAULT_PREFERRED_WIDTH = 360;
const DEFAULT_PREFERRED_WIDTH_XL = 412;
const DEFAULT_PREFERRED_HEIGHT = 420;

/** calculatePaneScaffoldDirective (PaneScaffoldDirective.kt L48-106), without hinge bounds. */
export function paneScaffoldDirective(
  sizeClass: WindowSizeClass,
  options: WindowPostureOptions = {},
): PaneScaffoldDirective {
  let maxHorizontalPartitions: number;
  let horizontalPartitionSpacerSize: number;
  let defaultPanePreferredWidth: number;
  switch (sizeClass.minWidth) {
    case WINDOW_WIDTH_BREAKPOINTS.compact:
    case WINDOW_WIDTH_BREAKPOINTS.medium:
      maxHorizontalPartitions = 1;
      horizontalPartitionSpacerSize = 0;
      defaultPanePreferredWidth = DEFAULT_PREFERRED_WIDTH;
      break;
    case WINDOW_WIDTH_BREAKPOINTS.expanded:
      maxHorizontalPartitions = 2;
      horizontalPartitionSpacerSize = PARTITION_SPACER;
      defaultPanePreferredWidth = DEFAULT_PREFERRED_WIDTH;
      break;
    default:
      maxHorizontalPartitions = 3;
      horizontalPartitionSpacerSize = PARTITION_SPACER;
      defaultPanePreferredWidth = DEFAULT_PREFERRED_WIDTH_XL;
  }
  const stacked =
    options.isTabletop === true ||
    (maxHorizontalPartitions === 1 && sizeClass.minHeight === WINDOW_HEIGHT_BREAKPOINTS.expanded);
  return {
    maxHorizontalPartitions,
    horizontalPartitionSpacerSize,
    maxVerticalPartitions: stacked ? 2 : 1,
    verticalPartitionSpacerSize: stacked ? PARTITION_SPACER : 0,
    defaultPanePreferredWidth,
    defaultPanePreferredHeight: DEFAULT_PREFERRED_HEIGHT,
  };
}

/**
 * NavigationSuiteType (NavigationSuiteScaffold.kt L1068-1155) without the types of deprecated
 * components (`NavigationBar`, `NavigationRail`: the legacy bar / rail, D4): which navigation
 * component a navigation suite shows. `none` shows none.
 */
export type NavigationSuiteType =
  | 'short-navigation-bar-compact'
  | 'short-navigation-bar-medium'
  | 'wide-navigation-rail-collapsed'
  | 'wide-navigation-rail-expanded'
  | 'navigation-drawer'
  | 'none';

/** The suite types, in NavigationSuiteType's order. */
export const NAVIGATION_SUITE_TYPES: readonly NavigationSuiteType[] = [
  'short-navigation-bar-compact',
  'short-navigation-bar-medium',
  'wide-navigation-rail-collapsed',
  'wide-navigation-rail-expanded',
  'navigation-drawer',
  'none',
];

/** Whether a type puts the navigation at the bottom (`NavigationSuiteType.isNavigationBar`). */
export function isNavigationBarType(type: NavigationSuiteType): boolean {
  return type === 'short-navigation-bar-compact' || type === 'short-navigation-bar-medium';
}

export interface NavigationSuiteTypeOptions extends WindowPostureOptions {
  /**
   * From this width class (or px lower bound, compared with the class's lower bound like
   * `isWidthAtLeastBreakpoint`) on, windows that would get the collapsed rail get `expandedType`
   * instead. Compose's default never expands (`undefined` / `null`); the navigation suite scaffold
   * passes {@link NAVIGATION_SUITE_EXPANDED_FROM}. The bar rules (compact width, then tabletop or
   * compact height) still come first, as in Compose's custom configuration sample.
   */
  expandedFrom?: WindowWidthSizeClass | number | null | undefined;
  /** What the expanded suite shows: the expanded wide navigation rail (default) or a drawer. */
  expandedType?: 'wide-navigation-rail-expanded' | 'navigation-drawer' | undefined;
}

/**
 * The navigation suite scaffold's default `expandedFrom`: the expanded wide navigation rail at
 * large and extra-large widths (m3.material.io guidance, owner decision 2026-10-17, COMPONENT_SPEC
 * §16). Not a Compose default: Compose's navigationSuiteType never returns the expanded rail.
 */
export const NAVIGATION_SUITE_EXPANDED_FROM: WindowWidthSizeClass = 'large';

/**
 * NavigationSuiteScaffoldDefaults.navigationSuiteType (L1167-1180): a short navigation bar at
 * compact width (compact arrangement), a short navigation bar with the medium (horizontal item)
 * arrangement on a tabletop posture or at compact height, otherwise a collapsed wide navigation
 * rail. With `expandedFrom`, the collapsed rail becomes `expandedType` (default: the expanded wide
 * navigation rail) from that width on.
 */
export function navigationSuiteType(
  sizeClass: WindowSizeClass,
  options: NavigationSuiteTypeOptions = {},
): NavigationSuiteType {
  if (sizeClass.minWidth === WINDOW_WIDTH_BREAKPOINTS.compact)
    return 'short-navigation-bar-compact';
  if (options.isTabletop === true || sizeClass.minHeight === WINDOW_HEIGHT_BREAKPOINTS.compact) {
    return 'short-navigation-bar-medium';
  }
  const { expandedFrom } = options;
  if (
    expandedFrom !== undefined &&
    expandedFrom !== null &&
    isWidthAtLeastBreakpoint(sizeClass, expandedFrom)
  ) {
    return options.expandedType ?? 'wide-navigation-rail-expanded';
  }
  return 'wide-navigation-rail-collapsed';
}
