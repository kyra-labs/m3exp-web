import {
  LIST_DETAIL_ADAPT_STRATEGIES,
  LIST_DETAIL_INITIAL_HISTORY,
  LIST_DETAIL_PANE_ORDER,
  PANE_EXPANSION_SAMPLE_ANCHORS,
  type PaneExpansionAnchor,
  type PaneRect,
  type PaneRule,
  SUPPORTING_PANE_ADAPT_STRATEGIES,
  SUPPORTING_PANE_INITIAL_HISTORY,
  SUPPORTING_PANE_ORDER,
  type SpringSpec,
  THREE_PANE_SCAFFOLD_ROLES as ROLES,
  type ThreePaneScaffoldAdaptStrategies,
  type ThreePaneScaffoldAnimation,
  type ThreePaneScaffoldDestinationItem,
  type ThreePaneScaffoldLayout,
  ThreePaneScaffoldNavigator,
  type ThreePaneScaffoldRole,
  type ThreePaneScaffoldValue,
  type WindowSizeClass,
  expandedPanes,
  paneExpansionAnchorPosition,
  sameThreePaneScaffoldValue,
  threePaneScaffoldDirective,
  threePaneScaffoldLayout,
  windowSizeClass,
} from '@kyralabs/m3e-motion';
import { readSpringTokens } from '../base/scroll.js';
import type * as PaneMotion from '../pane-motion/index.js';

/** The pane-motion entry (`@kyralabs/m3e-elements/pane-motion.js`). */
export type PaneMotionModule = typeof PaneMotion;
/** The pane-expansion entry's `attachPaneExpansion`. */
export type AttachPaneExpansion = (layout: PaneScaffoldLayout, signal: AbortSignal) => void;
import {
  currentWindowSizeClass,
  observeWindowSizeClass,
} from '../window-size-class/window-size-class.js';

/** ListDetailPaneScaffold or SupportingPaneScaffold. */
export type PaneScaffoldVariant = 'list-detail' | 'supporting-pane';

/**
 * Spoken pane titles (material3-adaptive androidMain res/values/strings.xml @ 19991f2c L19-30,
 * `m3_adaptive_default_pane_title_*`): each pane's default region name.
 */
export const PANE_SCAFFOLD_PANE_TITLES: Readonly<Record<ThreePaneScaffoldRole, string>> = {
  primary: 'Primary pane',
  secondary: 'Secondary pane',
  tertiary: 'Tertiary pane',
};

/** `m3_adaptive_default_pane_expansion_drag_handle_content_description` (strings.xml L32-34). */
export const PANE_EXPANSION_DRAG_HANDLE_LABEL = 'Pane expansion drag handle';

/** Pane names per variant (Compose's ListDetailPaneScaffoldRole / SupportingPaneScaffoldRole). */
export const PANE_SCAFFOLD_PANE_NAMES: Readonly<
  Record<PaneScaffoldVariant, Readonly<Record<string, ThreePaneScaffoldRole>>>
> = {
  'list-detail': { list: 'secondary', detail: 'primary', extra: 'tertiary' },
  'supporting-pane': { main: 'primary', supporting: 'secondary', extra: 'tertiary' },
};

/** A pane name (`list`, `detail`, `main`, …) or a role (`primary`, …) as a role, else null. */
export function paneScaffoldRole(
  variant: PaneScaffoldVariant,
  name: string | null | undefined,
): ThreePaneScaffoldRole | null {
  if (!name) return null;
  if ((ROLES as readonly string[]).includes(name)) return name as ThreePaneScaffoldRole;
  return PANE_SCAFFOLD_PANE_NAMES[variant][name] ?? null;
}

/** Start-to-end pane order of a variant. */
export const paneScaffoldOrder = (
  variant: PaneScaffoldVariant,
): readonly ThreePaneScaffoldRole[] =>
  variant === 'list-detail' ? LIST_DETAIL_PANE_ORDER : SUPPORTING_PANE_ORDER;

export interface PaneScaffoldNavigatorOptions<T> {
  adaptStrategies?: ThreePaneScaffoldAdaptStrategies | undefined;
  isDestinationHistoryAware?: boolean | undefined;
  initialDestinationHistory?: readonly ThreePaneScaffoldDestinationItem<T>[] | undefined;
  paneRule?: PaneRule | undefined;
}

const viewport = () => currentWindowSizeClass() ?? windowSizeClass({ width: 0, height: 0 });

/**
 * rememberListDetailPaneScaffoldNavigator / rememberSupportingPaneScaffoldNavigator: a navigator
 * with the variant's adapt strategies and initial destination, its directive from the viewport
 * until a PaneScaffoldLayout sizes it by its own container.
 */
export function createPaneScaffoldNavigator<T = unknown>(
  variant: PaneScaffoldVariant,
  options: PaneScaffoldNavigatorOptions<T> = {},
): ThreePaneScaffoldNavigator<T> {
  const list = variant === 'list-detail';
  return new ThreePaneScaffoldNavigator<T>({
    scaffoldDirective: threePaneScaffoldDirective(viewport(), { paneRule: options.paneRule }),
    adaptStrategies:
      options.adaptStrategies ??
      (list ? LIST_DETAIL_ADAPT_STRATEGIES : SUPPORTING_PANE_ADAPT_STRATEGIES),
    isDestinationHistoryAware: options.isDestinationHistoryAware,
    initialDestinationHistory:
      options.initialDestinationHistory ??
      (list ? LIST_DETAIL_INITIAL_HISTORY : SUPPORTING_PANE_INITIAL_HISTORY),
  });
}

export interface PaneScaffoldLayoutOptions {
  variant: PaneScaffoldVariant;
  /**
   * `recommended` (default: m3.material.io, two panes at large, three from 1600px) or `compose`
   * (Compose's calculatePaneScaffoldDirective: three panes from large, 1200px).
   */
  paneRule?: PaneRule | undefined;
  /** Anchors the drag handle snaps to (default: the samples' 0 %, 240dp, 50 %, −240dp, 100 %). */
  anchors?: readonly PaneExpansionAnchor[] | undefined;
  /**
   * The navigation motion (the `pane-motion.js` entry), or a promise of it (the elements load it
   * lazily). Without it navigation jumps.
   */
  motion?: PaneMotionModule | Promise<PaneMotionModule> | undefined;
  /**
   * The drag handle behavior (`attachPaneExpansion` from the `pane-expansion.js` entry), attached
   * the first time a handle shows; or `loadExpansion`, which loads it then. Without either the
   * handle only shows the split.
   */
  expansion?: AttachPaneExpansion | undefined;
  loadExpansion?: (() => Promise<AttachPaneExpansion>) | undefined;
}

/** A resting split: an anchor (index) or a released drag without anchors (handle centre, px). */
export type PaneExpansionValue = { anchor: number } | { offset: number };

/** Size, direction and preferred pane sizes, read once when a change starts. */
export interface PaneScaffoldMeasure {
  readonly width: number;
  readonly height: number;
  readonly rtl: boolean;
  readonly widths: Partial<Record<ThreePaneScaffoldRole, number>>;
  readonly heights: Partial<Record<ThreePaneScaffoldRole, number>>;
}

const S = 'm3e-pane-scaffold';
export const PANE_SCAFFOLD_MOTION_TOKENS = '--m3e-comp-pane-scaffold-motion';
const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const BOUNDS = ['x', 'y', 'w', 'h'] as const;

/**
 * Behavior of a `.m3e-pane-scaffold` (COMPONENT_SPEC §16a), shared by `<m3e-list-detail-layout>`,
 * `<m3e-supporting-pane-layout>` and m3e-react's ListDetailPaneScaffold / SupportingPaneScaffold so
 * both layers write one DOM contract. The caller renders the scaffold inside its `.m3e-layout`
 * (the panes, and the drag handle when wanted); this sets `[data-managed]` and keeps the panes in
 * step with a ThreePaneScaffoldNavigator (m3e-motion):
 *
 * - Size: the layout's own (observeWindowSizeClass on the `.m3e-layout`), through
 *   threePaneScaffoldDirective (Compose's calculatePaneScaffoldDirective, capped by
 *   m3.material.io's recommendation unless `paneRule` is `compose`). A size class change snaps,
 *   as Compose's navigator does.
 * - Navigation (navigateTo / navigateBack, from the navigator or `[data-pane-navigate]` clicks):
 *   panes move on Compose's pane motion (calculatePaneMotion, the default enter / exit
 *   transitions, spring 0.8 / 380 — `--m3e-comp-pane-scaffold-motion-*`, jumps under reduced
 *   motion), each frame writing only the panes' `--_m3e-pane-x/y/w/h` with `data-animating`;
 *   sizes are read once when a change starts, never while it moves. Focus moves to the new
 *   destination pane (shouldAutoFocusCurrentDestination); going back returns it to the element
 *   that navigated, when it is still shown. `[data-pane-navigate="back"]` controls hide while
 *   there is nothing to go back to.
 * - Drag handle (when the scaffold has a `__drag-handle`): shown between two expanded panes at
 *   the split; its pointer and keyboard behavior (PaneExpansionState) is the `pane-expansion.js`
 *   entry (`options.expansion`). One split per pair of expanded panes, as Compose keys its state.
 *
 * The motion and the drag handle are separate entries so the element entries stay within their
 * size budget (D17): the elements import them lazily, m3e-react statically.
 */
export class PaneScaffoldLayout<T = unknown> {
  readonly root: HTMLElement;
  readonly navigator: ThreePaneScaffoldNavigator<T>;
  options: PaneScaffoldLayoutOptions;
  /** @internal Resting splits by pair of expanded panes (PaneExpansionStateKey). */
  readonly expansions = new Map<string, PaneExpansionValue>();
  /** @internal Set while the drag handle drives the panes (pane-expansion.js). */
  dragging = false;
  #abort = new AbortController();
  #off: () => void;
  #sizeClass: WindowSizeClass | null = null;
  #applied: ThreePaneScaffoldValue | null = null;
  #length: number;
  #origins: (Element | null)[] = [];
  #motion: typeof PaneMotion | null = null;
  #animation: ThreePaneScaffoldAnimation | null = null;
  #frame = 0;
  #exiting = new Set<ThreePaneScaffoldRole>();
  #resizing = false;
  #expansion = false;

  constructor(
    root: HTMLElement,
    options: PaneScaffoldLayoutOptions,
    navigator: ThreePaneScaffoldNavigator<T> = createPaneScaffoldNavigator<T>(options.variant, {
      paneRule: options.paneRule,
    }),
  ) {
    this.root = root;
    this.navigator = navigator;
    this.options = options;
    this.#length = navigator.destinationHistory.length;
    root.toggleAttribute('data-managed', true);
    const { signal } = this.#abort;
    this.#off = navigator.subscribe(() => {
      this.#onChange();
    });
    observeWindowSizeClass(
      (sizeClass) => {
        this.#sizeClass = sizeClass;
        this.#directive();
      },
      { target: root.parentElement ?? root, signal },
    );
    root.addEventListener(
      'click',
      (e) => {
        this.#onClick(e);
      },
      { signal },
    );
    this.render();
    void Promise.resolve(options.motion).then((motion) => {
      this.#motion = motion ?? null;
    });
    if (options.motion && !('then' in options.motion)) this.#motion = options.motion;
  }

  /** New options (pane rule, anchors). */
  setOptions(options: PaneScaffoldLayoutOptions): void {
    const rule = options.paneRule !== this.options.paneRule;
    this.options = options;
    if (rule) this.#directive();
    this.update();
  }

  /** Re-reads the DOM after the caller rendered (panes added or removed, new controls). */
  update(): void {
    if (this.#frame === 0 && !this.dragging) this.render();
    else this.#controls();
  }

  destroy(): void {
    this.#abort.abort();
    this.#off();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  /** The panes the caller rendered, by role. */
  panes(): Map<ThreePaneScaffoldRole, HTMLElement> {
    const panes = new Map<ThreePaneScaffoldRole, HTMLElement>();
    for (const role of ROLES) {
      const pane = this.root.querySelector<HTMLElement>(`:scope > .${S}__pane--${role}`);
      if (pane) panes.set(role, pane);
    }
    return panes;
  }

  get handle(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${S}__drag-handle`);
  }

  get anchors(): readonly PaneExpansionAnchor[] {
    return this.options.anchors ?? PANE_EXPANSION_SAMPLE_ANCHORS;
  }

  /** The pair of expanded panes a split belongs to (PaneExpansionStateKey), or null. */
  key(value = this.navigator.scaffoldValue): string | null {
    const expanded = expandedPanes(value, paneScaffoldOrder(this.options.variant)).filter((r) =>
      this.panes().has(r),
    );
    return expanded.length === 2 ? expanded.join('|') : null;
  }

  /** Reads the scaffold's size, direction and the panes' preferred sizes (style + layout read). */
  measure(): PaneScaffoldMeasure {
    const rect = this.root.getBoundingClientRect();
    const widths: Partial<Record<ThreePaneScaffoldRole, number>> = {};
    const heights: Partial<Record<ThreePaneScaffoldRole, number>> = {};
    for (const [role, pane] of this.panes()) {
      const style = getComputedStyle(pane);
      const read = (what: string) =>
        Number.parseFloat(
          style.getPropertyValue(`--m3e-comp-pane-scaffold-pane-preferred-${what}`),
        );
      const w = read('width');
      const h = read('height');
      if (w === w) widths[role] = w;
      if (h === h) heights[role] = h;
    }
    const rtl = getComputedStyle(this.root).direction === 'rtl';
    return { width: rect.width, height: rect.height, rtl, widths, heights };
  }

  /** The model layout (ThreePaneScaffold's measure policy) of `value` at `m`. */
  layout(
    m: PaneScaffoldMeasure,
    value = this.navigator.scaffoldValue,
    draggingOffset?: number,
  ): ThreePaneScaffoldLayout {
    const directive = this.navigator.scaffoldDirective;
    const key = this.key(value);
    const expansion = key && this.handle ? this.expansions.get(key) : undefined;
    let firstPaneWidth: number | undefined;
    if (expansion && draggingOffset === undefined) {
      const offset =
        'offset' in expansion
          ? expansion.offset
          : paneExpansionAnchorPosition(
              this.anchors[expansion.anchor] ?? { proportion: 0.5 },
              m.width,
              m.rtl,
            );
      firstPaneWidth = Math.max(
        0,
        offset - Math.trunc(directive.horizontalPartitionSpacerSize / 2),
      );
    }
    const order = [...paneScaffoldOrder(this.options.variant)];
    return threePaneScaffoldLayout({
      width: m.width,
      height: m.height,
      directive,
      value,
      order: m.rtl ? order.reverse() : order,
      adaptStrategies: this.navigator.adaptStrategies,
      present: [...this.panes().keys()],
      preferredWidths: m.widths,
      preferredHeights: m.heights,
      expansion: { draggingOffset, firstPaneWidth },
    });
  }

  /** @internal Writes animated (or dragged) pane bounds and the handle position. */
  frame(panes: ThreePaneScaffoldLayout['panes'], handleOffset?: number | null): void {
    this.root.toggleAttribute('data-animating', true);
    for (const [role, pane] of this.panes()) {
      const r: PaneRect = panes[role] ?? { x: 0, y: 0, width: 0, height: 0 };
      const values = [r.x, r.y, r.width, r.height];
      BOUNDS.forEach((name, i) => {
        pane.style.setProperty(`--_m3e-pane-${name}`, px(values[i] ?? 0));
      });
    }
    if (handleOffset != null) this.root.style.setProperty('--_m3e-pane-handle-x', px(handleOffset));
  }

  /** Writes the current value's resting state: attributes, splits, the handle, back controls. */
  render(animate = false): void {
    const value = this.navigator.scaffoldValue;
    const previous = this.#applied;
    this.#applied = value;
    const spec: SpringSpec | null =
      animate && previous && !sameThreePaneScaffoldValue(previous, value)
        ? readSpringTokens(getComputedStyle(this.root), PANE_SCAFFOLD_MOTION_TOKENS)
        : null;
    if (spec && previous && this.#motion) this.#transition(this.#motion, previous, value, spec);
    else if (this.#frame !== 0 && !animate) this.#rest(); // a resize mid-flight jumps
    this.#resting(value);
    if (this.#frame !== 0) this.#tick(performance.now());
  }

  // --- State --------------------------------------------------------------------------------------

  #directive(): void {
    const directive = threePaneScaffoldDirective(this.#sizeClass ?? viewport(), {
      paneRule: this.options.paneRule,
    });
    const current = this.navigator.scaffoldDirective;
    if (
      (
        ['maxHorizontalPartitions', 'maxVerticalPartitions', 'defaultPanePreferredWidth'] as const
      ).every((k) => current[k] === directive[k])
    ) {
      return;
    }
    // Compose snaps the scaffold state when the directive changes (ThreePaneScaffoldNavigator L349).
    this.#resizing = true;
    this.navigator.scaffoldDirective = directive;
    this.#resizing = false;
    if (this.#applied) this.render();
  }

  #onChange(): void {
    const length = this.navigator.destinationHistory.length;
    const active = this.root.ownerDocument.activeElement;
    let restore: Element | null = null;
    if (length > this.#length)
      this.#origins[length - 1] = active && this.root.contains(active) ? active : null;
    else if (length < this.#length) {
      restore = this.#origins[length] ?? null;
      this.#origins.length = length;
    }
    // A navigation changes the history; anything else (strategies, history awareness) snaps.
    const navigated = length !== this.#length;
    this.#length = length;
    if (this.#resizing) return; // #directive renders
    this.render(navigated);
    if (navigated) this.#focus(restore);
  }

  #resting(value: ThreePaneScaffoldValue): void {
    const root = this.root;
    const panes = this.panes();
    const handle = this.handle;
    const expanded = paneScaffoldOrder(this.options.variant).filter(
      (r) => value[r] === 'expanded' && panes.has(r),
    );
    const destination = value.currentDestination;
    if (destination) root.dataset['destination'] = destination;
    else delete root.dataset['destination'];
    root.toggleAttribute(
      'data-reflow',
      ROLES.some((r) => value[r] === 'reflowed' && panes.has(r)),
    );
    // The highest-priority expanded pane takes the remaining width.
    let grow = ROLES.find((r) => expanded.includes(r));
    const key = this.key(value);
    const split = key !== null && handle !== null && this.#exiting.size === 0;
    const m = split ? this.measure() : null;
    const model = m ? this.layout(m, value) : null;
    const expansion = key && this.expansions.has(key);
    for (const [role, pane] of panes) {
      const exiting = this.#exiting.has(role);
      pane.dataset['paneValue'] = value[role];
      pane.toggleAttribute('data-exiting', exiting);
      pane.toggleAttribute('inert', exiting);
      let basis: string | null = null;
      let collapsed = false;
      if (model && expansion && expanded.includes(role)) {
        // A resting split: the first pane at its model width, the second takes the rest.
        const width = model.panes[role]?.width ?? 0;
        collapsed = width === 0;
        if (role === expanded[0]) basis = px(width);
        else grow = collapsed ? expanded[0] : role;
      }
      pane.toggleAttribute('data-collapsed', collapsed);
      if (basis === null) pane.style.removeProperty('--_m3e-pane-basis');
      else pane.style.setProperty('--_m3e-pane-basis', basis);
      if (pane.getAttribute('style') === '') pane.removeAttribute('style');
    }
    for (const [role, pane] of panes) pane.toggleAttribute('data-grow', role === grow);
    root.toggleAttribute('data-handle', split);
    if (handle && m && model && model.handleOffset !== null) {
      root.style.setProperty('--_m3e-pane-handle-x', px(model.handleOffset));
      const start = m.rtl ? m.width - model.handleOffset : model.handleOffset;
      handle.setAttribute(
        'aria-valuenow',
        String(m.width > 0 ? Math.round((start / m.width) * 100) : 0),
      );
      handle.setAttribute('aria-valuemin', '0');
      handle.setAttribute('aria-valuemax', '100');
      const { expansion, loadExpansion } = this.options;
      if (!this.#expansion && (expansion ?? loadExpansion)) {
        this.#expansion = true;
        const signal = this.#abort.signal;
        if (expansion) expansion(this, signal);
        else
          void loadExpansion?.().then((attach) => {
            attach(this, signal);
          });
      }
    }
    this.#controls();
  }

  /** `[data-pane-navigate="back"]` controls hide while there is nothing to go back to. */
  #controls(): void {
    const hidden = !this.navigator.canNavigateBack();
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-pane-navigate="back"]')) {
      el.hidden = hidden;
    }
  }

  // --- Navigation motion ---------------------------------------------------------------------------

  #transition(
    motion: typeof PaneMotion,
    previous: ThreePaneScaffoldValue,
    value: ThreePaneScaffoldValue,
    spec: SpringSpec,
  ) {
    const m = this.measure();
    const order = [...paneScaffoldOrder(this.options.variant)];
    if (m.rtl) order.reverse();
    const transitions = motion.paneTransitions(
      motion.calculatePaneMotion(previous, value, order),
      order,
      this.layout(m, previous).panes,
      this.layout(m, value).panes,
      m.width,
    );
    (this.#animation ??= new motion.ThreePaneScaffoldAnimation()).start(
      transitions,
      spec,
      performance.now(),
    );
    this.#exiting = new Set(ROLES.filter((r) => transitions[r] && value[r] === 'hidden'));
    this.root.toggleAttribute('data-animating', true);
    this.#request();
  }

  #request(): void {
    this.#frame ||= requestAnimationFrame((t) => {
      this.#frame = 0;
      this.#tick(Math.max(t, performance.now()));
    });
  }

  #tick(now: number): void {
    const sample = this.#animation?.sample(now);
    if (!sample?.running) {
      this.#rest();
      return;
    }
    this.frame(sample.panes);
    this.#request();
  }

  /** @internal Back to rest: the attributes alone describe the scaffold. */
  rest(): void {
    this.#rest();
  }

  #rest(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#animation?.finish();
    this.root.removeAttribute('data-animating');
    for (const pane of this.panes().values()) {
      for (const p of BOUNDS) pane.style.removeProperty(`--_m3e-pane-${p}`);
    }
    this.#exiting.clear();
    if (this.#applied) this.#resting(this.navigator.scaffoldValue);
  }

  #focus(restore: Element | null): void {
    const shown = (el: Element | null | undefined) =>
      el instanceof HTMLElement &&
      el.isConnected &&
      el.closest<HTMLElement>(`.${S}__pane`)?.dataset['paneValue'] !== 'hidden';
    const destination = this.navigator.currentDestination?.pane;
    const pane = destination ? this.panes().get(destination) : undefined;
    const target = shown(restore) && this.root.contains(restore) ? restore : pane;
    if (shown(target)) (target as HTMLElement).focus({ preventScroll: true });
  }

  #onClick(e: MouseEvent): void {
    const target = e.target;
    const control =
      target instanceof Element ? target.closest<HTMLElement>('[data-pane-navigate]') : null;
    if (!control || !this.root.contains(control)) return;
    const to = control.dataset['paneNavigate'];
    const role = paneScaffoldRole(this.options.variant, to);
    if (to !== 'back' && !role) return;
    e.preventDefault();
    if (role) this.navigator.navigateTo(role, control.dataset['contentKey'] as T | undefined);
    else this.navigator.navigateBack();
  }
}
