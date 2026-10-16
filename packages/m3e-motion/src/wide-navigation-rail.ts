/*
 * Copyright 2024 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/WideNavigationRail.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// and compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/NavigationItem.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The animated wide navigation rail (COMPONENT_SPEC §14):
// - WideNavigationRailLayout (WideNavigationRail.kt L314-476): minWidth / widthFullRange on the
//   rail's spring (DefaultSpatial; FastSpatial in the modal window), itemVerticalSpacedBy and
//   itemMinHeight on DefaultSpatial, and the measure policy's width (wideNavigationRailWidth).
// - AnimatedNavigationItem (NavigationItem.kt L486-493, L1103-1199): the item's
//   iconPositionProgress on DefaultSpatial and its width (wideNavigationRailItemWidth); the rest of
//   the item geometry is CSS (wide-navigation-rail.css) driven by the same progress.
// - ModalWideNavigationRail / ModalWideNavigationRailImpl (L593-600, L726-863): positionProgress
//   on DefaultEffects shows the modal window while > 0 and expands its rail from 0.3
//   (modalExpanded); the window rail's width / spacing / scrim animate from there and are dropped
//   with the window. hideOnCollapse: ModalWideNavigationRailState slides the always-expanded rail
//   in from minus its width on DefaultSpatial; the window closes once the slide is done (the scrim
//   path, animateToDismiss).
// Time is injected (ms): m3e-elements drives it from its frame loop and tests step it.

import { SpringAnimatable } from './animatable.js';
import type { SpringSpec } from './spring.js';

/** ModalWideNavigationRail: the window rail expands once positionProgress reaches this (L600). */
export const MODAL_RAIL_EXPANDED_PROGRESS = 0.3;

/** The springs of a wide navigation rail (null jumps: reduced motion snaps spatial springs). */
export interface WideNavigationRailSpecs {
  /** WideNavigationRailLayout `animationSpec` (L324): non-modal width, item spacing / min height. */
  readonly width: SpringSpec | null;
  /** `modalAnimationSpec` (L325): the modal window rail's width. */
  readonly modalWidth: SpringSpec | null;
  /** AnimatedNavigationItem `iconPositionProgress` (NavigationItem.kt L489-493). */
  readonly iconPosition: SpringSpec | null;
  /** ModalWideNavigationRail `positionProgress` (L593-598). */
  readonly position: SpringSpec | null;
  /** The modal scrim alpha (L826-831). */
  readonly scrim: SpringSpec | null;
  /** hideOnCollapse: ModalWideNavigationRailState (L732-736). */
  readonly slide: SpringSpec | null;
}

/** One frame of a {@link WideNavigationRailAnimation}. */
export interface WideNavigationRailSample {
  /** The items' iconPositionProgress (0 top icon … 1 start icon); expressive springs overshoot. */
  readonly item: number;
  /** The rail's minWidth / widthFullRange progress (0 collapsed … 1 expanded). */
  readonly width: number;
  /** itemVerticalSpacedBy / itemMinHeight progress (0 collapsed … 1 expanded). */
  readonly layout: number;
  /** Modal: the window (scrim + rail in the top layer) is shown. */
  readonly open: boolean;
  /**
   * The `expanded` WideNavigationRailLayout measures with: the target (non-modal); in the modal
   * window `hideOnCollapse || modalExpanded`; false for the collapsed rail of a modal one.
   */
  readonly railExpanded: boolean;
  /** Modal: the scrim alpha, 0…1. */
  readonly scrim: number;
  /** hideOnCollapse: 0 off screen (offset −width) … 1 in place. */
  readonly slide: number;
  /** Any value is still moving. */
  readonly running: boolean;
}

export interface WideNavigationRailAnimationOptions {
  readonly expanded: boolean;
  /** ModalWideNavigationRail. */
  readonly modal?: boolean;
  /** ModalWideNavigationRail(hideOnCollapse = true): slides in expanded instead of expanding. */
  readonly hideOnCollapse?: boolean;
  /**
   * Visibility threshold of the width spring in progress units: animateDpAsState uses
   * Spring.DefaultDisplacementThreshold (0.01dp) over the width range (default: 0.01 / 264dp).
   */
  readonly widthThreshold?: number;
  /** Likewise for spacing / min height (default: 0.01 / 16dp, the min-height range). */
  readonly layoutThreshold?: number;
}

const to = (expanded: boolean) => (expanded ? 1 : 0);

/**
 * WideNavigationRailState plus the animations it drives. `setExpanded` retargets every value from
 * its current value and velocity (Compose `animate*AsState` / `Animatable.animateTo`).
 */
export class WideNavigationRailAnimation {
  readonly modal: boolean;
  readonly hideOnCollapse: boolean;
  #expanded: boolean;
  readonly #item: SpringAnimatable;
  readonly #width: SpringAnimatable;
  readonly #layout: SpringAnimatable;
  readonly #position: SpringAnimatable;
  readonly #scrim = new SpringAnimatable(0);
  readonly #slide: SpringAnimatable;
  #specs: WideNavigationRailSpecs | null = null;
  #open = false;
  #modalExpanded = false;
  /** hideOnCollapse: positionProgress waits for the slide out (animateToDismiss). */
  #closeAfterSlide = false;

  constructor(options: WideNavigationRailAnimationOptions) {
    this.modal = Boolean(options.modal);
    this.hideOnCollapse = this.modal && Boolean(options.hideOnCollapse);
    this.#expanded = options.expanded;
    const v = to(options.expanded);
    // hideOnCollapse lays the window rail out expanded (`expanded = hideOnCollapse || …`, L839).
    const laidOut = this.hideOnCollapse ? 1 : this.modal ? (options.expanded ? 1 : 0) : v;
    this.#item = new SpringAnimatable(this.hideOnCollapse ? 1 : v);
    this.#width = new SpringAnimatable(laidOut, options.widthThreshold ?? 0.01 / 264);
    this.#layout = new SpringAnimatable(laidOut, options.layoutThreshold ?? 0.01 / 16);
    this.#position = new SpringAnimatable(this.modal ? v : 0);
    this.#slide = new SpringAnimatable(v, 0.01 / 360);
    if (this.modal && options.expanded) {
      this.#open = true;
      this.#modalExpanded = true;
      this.#scrim.snapTo(1);
    }
  }

  /** WideNavigationRailState.targetValue. */
  get expanded(): boolean {
    return this.#expanded;
  }

  get isRunning(): boolean {
    return (
      this.#item.isRunning ||
      this.#width.isRunning ||
      this.#layout.isRunning ||
      this.#position.isRunning ||
      this.#scrim.isRunning ||
      this.#slide.isRunning ||
      this.#closeAfterSlide
    );
  }

  /** expand() / collapse() at `now` (ms). */
  setExpanded(expanded: boolean, specs: WideNavigationRailSpecs, now: number): void {
    this.sample(now);
    this.#specs = specs;
    if (expanded === this.#expanded) return;
    this.#expanded = expanded;
    const v = to(expanded);
    if (!this.modal) {
      this.#item.animateTo(v, specs.iconPosition, now);
      this.#width.animateTo(v, specs.width, now);
      this.#layout.animateTo(v, specs.width, now);
      return;
    }
    if (this.hideOnCollapse) {
      // isScrimVisible = modalState.targetValue != Collapsed (L819-824).
      this.#slide.animateTo(v, specs.slide, now);
      this.#scrim.animateTo(v, specs.scrim, now);
      if (expanded) {
        this.#closeAfterSlide = false;
        this.#position.animateTo(1, specs.position, now);
      } else {
        this.#closeAfterSlide = true;
      }
      this.sample(now);
      return;
    }
    // The items follow the state at once (railExpanded = state.targetValue in the samples).
    this.#item.animateTo(v, specs.iconPosition, now);
    this.#position.animateTo(v, specs.position, now);
    this.sample(now);
  }

  /** WideNavigationRailState.snapTo. */
  snapTo(expanded: boolean): void {
    this.#expanded = expanded;
    const v = to(expanded);
    this.#closeAfterSlide = false;
    if (!this.modal) {
      for (const a of [this.#item, this.#width, this.#layout]) a.snapTo(v);
      return;
    }
    this.#position.snapTo(v);
    this.#slide.snapTo(v);
    this.#scrim.snapTo(v);
    this.#open = expanded;
    this.#modalExpanded = expanded;
    if (!this.hideOnCollapse) {
      for (const a of [this.#item, this.#width, this.#layout]) a.snapTo(v);
    }
  }

  sample(now: number): WideNavigationRailSample {
    const item = this.#item.sample(now);
    if (this.modal) this.#sampleModal(now);
    const width = this.#width.sample(now);
    const layout = this.#layout.sample(now);
    return {
      item: Math.max(item, 0), // iconPositionProgress.coerceAtLeast(0f) (NavigationItem.kt L544)
      width,
      layout,
      open: this.#open,
      railExpanded: !this.modal
        ? this.#expanded
        : this.#open && (this.hideOnCollapse || this.#modalExpanded),
      scrim: Math.min(Math.max(this.#scrim.value, 0), 1),
      slide: this.#slide.value,
      running: this.isRunning,
    };
  }

  #sampleModal(now: number): void {
    const specs = this.#specs;
    if (this.hideOnCollapse) {
      this.#slide.sample(now);
      this.#scrim.sample(now);
      if (this.#closeAfterSlide && !this.#slide.isRunning) {
        this.#closeAfterSlide = false;
        this.#position.animateTo(0, specs?.position ?? null, now);
      }
      this.#open = this.#position.sample(now) > 0;
      return;
    }
    // isCollapsed = positionProgress == 0 (L599): the window shows while it is above 0.
    const position = this.#position.sample(now);
    const open = position > 0;
    const modalExpanded = position >= MODAL_RAIL_EXPANDED_PROGRESS;
    if (!open) {
      // The window and its animate*AsState values are dropped; the collapsed rail stays.
      this.#width.snapTo(0);
      this.#layout.snapTo(0);
      this.#scrim.snapTo(0);
    } else if (!this.#open) {
      // A new window composes its animate*AsState values at their targets.
      const v = to(modalExpanded);
      this.#width.snapTo(v);
      this.#layout.snapTo(v);
      this.#scrim.snapTo(v);
    } else if (modalExpanded !== this.#modalExpanded) {
      const v = to(modalExpanded);
      this.#width.animateTo(v, specs?.modalWidth ?? null, now);
      this.#layout.animateTo(v, specs?.width ?? null, now);
      this.#scrim.animateTo(v, specs?.scrim ?? null, now);
    }
    this.#scrim.sample(now);
    this.#open = open;
    this.#modalExpanded = open && modalExpanded;
  }
}

/** The dp values WideNavigationRailLayout and AnimatedNavigationItem measure with. */
export interface WideNavigationRailMetrics {
  /** NavigationRailCollapsedTokens.ContainerWidth (96dp). */
  readonly collapsedWidth: number;
  /** NavigationRailExpandedTokens.ContainerWidthMinimum (220dp). */
  readonly expandedMinWidth: number;
  /** NavigationRailExpandedTokens.ContainerWidthMaximum (360dp). */
  readonly expandedMaxWidth: number;
  /** WNRItemHorizontalPadding (20dp). */
  readonly itemHorizontalPadding: number;
  /** NavigationRailBaselineItemTokens.IconSize (24dp). */
  readonly iconSize: number;
  /** NavigationRailHorizontalItemTokens.IconLabelSpace (8dp). */
  readonly iconLabelSpace: number;
  /** Indicator horizontal padding per side, collapsed: (ActiveIndicatorWidth − IconSize) / 2. */
  readonly collapsedIndicatorPadding: number;
  /** Expanded: NavigationRailHorizontalItemTokens.FullWidthLeadingSpace. */
  readonly expandedIndicatorPadding: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * An item's measured width (placeAnimatedLabelAndIcon, NavigationItem.kt L1119-1133). `content` is
 * the item's start-icon pill width (icon + gap + label + both expanded paddings), or null for an
 * icon-only item (TopIconOrIconOnlyMeasurePolicy: the 56dp circle plus the padding on both sides).
 * `maxWidth` is the rail's item constraint (expanded: rail maximum − item padding).
 */
export function wideNavigationRailItemWidth(
  content: number | null,
  progress: number,
  m: WideNavigationRailMetrics,
  maxWidth: number,
): number {
  const pad = m.itemHorizontalPadding;
  const indicatorPadding = lerp(m.collapsedIndicatorPadding, m.expandedIndicatorPadding, progress);
  if (content === null)
    return Math.min(m.iconSize + 2 * m.collapsedIndicatorPadding + 2 * pad, maxWidth);
  const gapAndLabel = content - m.iconSize - 2 * m.expandedIndicatorPadding;
  const label = gapAndLabel - m.iconLabelSpace;
  // widthTopIcon = max(label, topIconIndicatorWidth + 2·padding + indicator padding).
  const widthTop = Math.min(Math.max(label, m.iconSize + 2 * pad + 2 * indicatorPadding), maxWidth);
  // indicatorRipple: lerp(icon, icon + gap + label, p) + indicator padding; widthStartIcon adds one padding.
  const ripple = lerp(m.iconSize, m.iconSize + gapAndLabel, progress) + 2 * indicatorPadding;
  const widthStart = Math.min(ripple + pad, maxWidth);
  return widthTop + (widthStart - widthTop) * progress;
}

export interface WideNavigationRailWidthInput {
  /** `expanded` passed to WideNavigationRailLayout (the state's target, or modalExpanded). */
  readonly expanded: boolean;
  /** minWidth / widthFullRange progress. */
  readonly widthProgress: number;
  /** The items' iconPositionProgress. */
  readonly itemProgress: number;
  /** Each item's start-icon pill width (null: icon only). */
  readonly items: readonly (number | null)[];
  /** The header's width (0 without one). */
  readonly header: number;
  /** The width of the previous frame (`currentWidth`). */
  readonly previousWidth: number;
  /** `actualMaxExpandedWidth > 0`: the rail was wider than its expanded minimum. */
  readonly wide: boolean;
  /** The available width (the rail's maximum when unconstrained). */
  readonly maxWidth?: number;
  readonly metrics: WideNavigationRailMetrics;
}

/**
 * WideNavigationRailLayout's measured width (L373-476): expanding, `widthFullRange` up to the
 * widest item (+ padding) or header when that is wider than the expanded minimum, else
 * `minWidth`; collapsing from such a rail, `widthFullRange` kept between `minWidth` and the previous
 * width. Returns the width and whether the rail is now `wide`.
 */
export function wideNavigationRailWidth(input: WideNavigationRailWidthInput): {
  width: number;
  wide: boolean;
} {
  const m = input.metrics;
  const max = Math.min(input.maxWidth ?? m.expandedMaxWidth, m.expandedMaxWidth);
  const minWidth = Math.min(lerp(m.collapsedWidth, m.expandedMinWidth, input.widthProgress), max);
  const fullRange = lerp(m.collapsedWidth, m.expandedMaxWidth, input.widthProgress);
  const expandedMin = Math.min(m.expandedMinWidth, max);
  if (input.expanded) {
    const itemMax = max - m.itemHorizontalPadding;
    let widestItem = 0;
    for (const content of input.items) {
      const w = wideNavigationRailItemWidth(content, input.itemProgress, m, itemMax);
      widestItem = Math.max(widestItem, w + m.itemHorizontalPadding);
    }
    const widest = Math.max(widestItem, input.header);
    if (widest > minWidth && widest > expandedMin) {
      const constrain = Math.min(Math.max(widest, expandedMin), max);
      return { width: Math.min(fullRange, constrain), wide: true };
    }
    return { width: minWidth, wide: input.wide };
  }
  if (input.wide) {
    const upper = Math.max(input.previousWidth, minWidth);
    return { width: Math.min(Math.max(fullRange, minWidth), upper), wide: true };
  }
  return { width: minWidth, wide: false };
}
