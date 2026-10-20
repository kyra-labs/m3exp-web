import {
  type SheetSpecs,
  SheetState,
  type SheetValue,
  SpringAnimatable,
  type SpringSpec,
} from '@kyralabs/m3e-motion';
import { type PointerDrag, pointerDrag } from '../base/drag.js';
import { ModalSession, activeOpener, returnFocus } from '../base/modal.js';
import { releaseRipple } from '../base/ripple.js';
import { readSpringTokens } from '../base/scroll.js';

export type { SheetValue };
export type BottomSheetVariant = 'standard' | 'modal';

export interface BottomSheetLayoutOptions {
  /** The initial value (rendered without animating). Default `hidden`. */
  value?: SheetValue;
  /** No PartiallyExpanded state (Compose `enabledValues` without it). */
  skipPartiallyExpanded?: boolean;
  /** With a peek height (`--peek`): no Hidden state (BottomSheetScaffold's default). */
  skipHiddenState?: boolean;
  /** Drags and the handle's arrow keys move the sheet (Compose `gesturesEnabled`). Default true. */
  gesturesEnabled?: boolean;
  /** Modal: a press on the scrim dismisses (`shouldDismissOnClickOutside`). Default true. */
  dismissOnClickOutside?: boolean;
  /**
   * The sheet asks to change its value: the drag handle, a drag released past the thresholds,
   * Escape, a press on the scrim (SheetState's confirmValueChange; `hidden` is Compose's
   * onDismissRequest). Return `false` to veto (it stays, or a drag settles back); without it the
   * sheet follows itself. Callers then render the value (`m3e-bottom-sheet--<value>`) and call
   * `setValue` (a no-op when it already heads there).
   */
  onValueChange?: (value: SheetValue) => boolean | undefined;
}

const SHEET = 'm3e-bottom-sheet';
const VARS = ['--_m3e-bs-translate', '--_m3e-bs-stretch', '--_m3e-bs-scrim'] as const;
export { BOTTOM_SHEET_DRAG_HANDLE_LABEL, BOTTOM_SHEET_PANE_TITLE } from './strings.js';

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};
const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const round = (v: number) => String(Math.round(v * 1e4) / 1e4);
const EDITABLE = 'input, textarea, select, [contenteditable="true"]';

/**
 * Behavior of a `.m3e-bottom-sheet` (COMPONENT_SPEC §30), shared by `<m3e-bottom-sheet>` and
 * m3e-react's `<BottomSheet>` / `<ModalBottomSheet>` so both layers write one DOM contract. The
 * variant comes from the root's class (`--modal`: a `<dialog>`; `--peek`: the scaffold's peek
 * anchor); the caller renders the value (`--expanded` / `--partially-expanded`) and calls
 * `setValue`.
 *
 * - Anchors and springs: m3e-motion's SheetState (Compose SheetState / BottomSheet), measured
 *   with ResizeObservers. Show / expand on the default spatial spring, hide / partially expand on
 *   the fast effects spring (both jump under reduced motion), from the current offset and
 *   velocity; each frame writes `--_m3e-bs-translate`, `--_m3e-bs-stretch` and (modal)
 *   `--_m3e-bs-scrim` (the scrim alpha on the default effects spring) with `data-animating`, and
 *   nothing else.
 * - Drags (anchoredDraggable, vertical): on the visible sheet, past the 8dp slop; from scrolling
 *   content only where Compose's nested scroll gives the drag to the sheet (up while not fully
 *   expanded, down when scrolled to the top). The release settles with Compose's thresholds (56dp
 *   from the anchor behind, 125dp/s, the fling dampened near Hidden) on the default spatial spring
 *   started at the release velocity, asking `onValueChange` first.
 * - Drag handle (`.m3e-bottom-sheet__handle`): a click dismisses an expanded sheet, expands a
 *   partially expanded one, else shows it (the peek variant partially expands or hides);
 *   ArrowUp / ArrowDown expand / collapse or dismiss it (Compose's accessibility actions). Its
 *   press ripple comes from the `ripple.js` entry (as for the other plain m3e-css buttons).
 * - Modal: `showModal()` (the page inert), the page scroll locked, Tab kept inside, focus moved to
 *   the first stop (the handle) once the opening motion rests (its tooltip is placed from there)
 *   and returned to the opener after it hides (`ModalSession`);
 *   Escape partially expands an expanded sheet that has that state, else hides it (Compose's
 *   back handling); a press on the scrim hides it. The dialog closes once the sheet is hidden.
 * - Standard: Escape in the sheet does the same (BottomSheet's back handler); focus inside a
 *   sheet that hides returns to where it was before it showed.
 */
export class BottomSheetLayout {
  readonly root: HTMLElement;
  readonly variant: BottomSheetVariant;
  #options: BottomSheetLayoutOptions;
  #state: SheetState;
  #scrim = new SpringAnimatable(0);
  #abort = new AbortController();
  #frame = 0;
  #observer: ResizeObserver | null = null;
  #observed: Element[] = [];
  #fullHeight = 0;
  #sheetHeight = 0;
  #session: ModalSession | null = null;
  #opener: HTMLElement | null = null;
  #shown = false;
  /** Focus moves in once the opening motion rests (the handle's tooltip is placed from there). */
  #focusPending = false;
  #drag: PointerDrag;

  constructor(root: HTMLElement, options: BottomSheetLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.variant = root.classList.contains(`${SHEET}--modal`) ? 'modal' : 'standard';
    this.#state = this.#createState(options.value ?? 'hidden');
    const { signal } = this.#abort;
    if (this.variant === 'modal') {
      this.#session = new ModalSession(root, {
        onEscape: () => {
          this.#settleToDismiss();
        },
      });
      root.addEventListener('cancel', this.#onCancel, { signal });
      root.addEventListener('close', this.#onClose, { signal });
    }
    root.addEventListener('click', this.#onClick, { signal });
    root.addEventListener('keydown', this.#onKeyDown, { signal });
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const size = entry.borderBoxSize[0];
          const height = size ? size.blockSize : entry.contentRect.height;
          if (entry.target === this.root) this.#fullHeight = this.root.clientHeight || height;
          else if (entry.target === this.sheet) this.#sheetHeight = height;
        }
        this.#relayout(performance.now());
        this.#updateScrolls();
      });
    }
    this.#drag = pointerDrag(root, {
      axis: 'y',
      accept: this.#acceptDrag,
      start: this.#startDrag,
      move: (delta) => {
        this.#state.dragBy(delta);
        this.#tick(performance.now());
      },
      end: (velocity) => {
        const now = performance.now();
        this.#state.release(velocity, this.#specs(), now);
        this.#tick(now);
      },
    });
    this.update();
    if (this.#state.currentValue !== 'hidden') {
      this.#show();
      this.#focusIn();
    }
    // The first anchors (the observers then follow size changes); a closed modal has no layout.
    if (this.variant === 'standard' || this.#shown) this.#relayout();
  }

  /** The value the sheet is at or heading to (SheetState.targetValue). */
  get value(): SheetValue {
    return this.#state.targetValue;
  }

  /** The value it last settled on (SheetState.currentValue). */
  get currentValue(): SheetValue {
    return this.#state.currentValue;
  }

  /** The m3e-motion SheetState (offset, anchors). */
  get state(): SheetState {
    return this.#state;
  }

  get sheet(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${SHEET}__sheet`);
  }

  get #handle(): HTMLElement | null {
    return this.sheet?.querySelector<HTMLElement>(`:scope > .${SHEET}__handle`) ?? null;
  }

  get #content(): HTMLElement | null {
    return this.sheet?.querySelector<HTMLElement>(`:scope > .${SHEET}__content`) ?? null;
  }

  /** New options (the enabled values rebuild the state at its current value). */
  setOptions(options: BottomSheetLayoutOptions): void {
    const before = this.#enabledValues();
    this.#options = { ...this.#options, ...options };
    const after = this.#enabledValues();
    if (before.join() !== after.join()) {
      this.#state = this.#createState(this.#normalize(this.#state.currentValue));
      this.#relayout();
    }
  }

  /** Re-reads the DOM after a render (the sheet replaced). */
  update(): void {
    const sheet = this.sheet;
    const targets = [this.root, sheet].filter((el): el is HTMLElement => el !== null);
    if (this.#observer && targets.some((el, i) => this.#observed[i] !== el)) {
      this.#observer.disconnect();
      for (const el of targets) this.#observer.observe(el);
      this.#observed = targets;
    }
    // A render may have renamed the sheet; the scroll region follows.
    this.#updateScrolls();
  }

  /**
   * Moves to `value` (the caller decided; nothing is asked): Expanded on the show spring, Hidden
   * and PartiallyExpanded (from a visible sheet) on the hide spring, a hidden sheet shown on the
   * show spring. `animate = false` jumps.
   */
  setValue(value: SheetValue, animate = true): void {
    const target = this.#normalize(value);
    const opening = target !== 'hidden' && !this.#shown;
    if (target === this.#state.targetValue && !opening) return;
    const now = performance.now();
    const from = this.#state.currentValue;
    if (opening) {
      this.#show();
      this.#focusPending = this.variant === 'modal';
    }
    this.#relayout();
    if (!animate) {
      this.#state.snapTo(target);
      this.#tick(now);
    } else {
      const specs = this.#specs();
      const spec =
        target === 'expanded' || (target === 'partially-expanded' && from === 'hidden')
          ? specs.show
          : specs.hide;
      this.#state.draggable.animateTo(target, spec, now);
      this.#tick(now);
    }
  }

  /**
   * SheetState.show() (asks first): PartiallyExpanded when it has that state (with the
   * deterministic anchors, whenever it is enabled), else Expanded.
   */
  show(): void {
    this.#request(this.#state.skipPartiallyExpanded ? 'expanded' : 'partially-expanded');
  }

  /** SheetState.hide() (asks first). */
  hide(): void {
    if (!this.#state.skipHiddenState) this.#request('hidden');
  }

  /** SheetState.expand() (asks first). */
  expand(): void {
    this.#request('expanded');
  }

  /** SheetState.partialExpand() (asks first). */
  partialExpand(): void {
    if (!this.#state.skipPartiallyExpanded) this.#request('partially-expanded');
  }

  destroy(): void {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#observer?.disconnect();
    this.#drag.destroy();
    this.#rest();
    this.#hide();
  }

  // --- State ----------------------------------------------------------------------------------

  #enabledValues(): SheetValue[] {
    const peek = this.root.classList.contains(`${SHEET}--peek`);
    const values: SheetValue[] = [];
    if (!(peek && this.#options.skipHiddenState)) values.push('hidden');
    if (!this.#options.skipPartiallyExpanded) values.push('partially-expanded');
    values.push('expanded');
    return values;
  }

  #createState(value: SheetValue): SheetState {
    const enabledValues = this.#enabledValues();
    const initialValue = enabledValues.includes(value)
      ? value
      : value === 'partially-expanded'
        ? 'expanded'
        : (enabledValues[0] ?? 'expanded');
    const state: SheetState = new SheetState({
      enabledValues,
      initialValue,
      confirmValueChange: (next): boolean => next === state.currentValue || this.#ask(next),
    });
    return state;
  }

  /** A value the state can take: PartiallyExpanded without that state is Expanded. */
  #normalize(value: SheetValue): SheetValue {
    const enabled = this.#state.enabledValues;
    if (enabled.has(value)) return value;
    return value === 'hidden' && enabled.has('partially-expanded')
      ? 'partially-expanded'
      : 'expanded';
  }

  /** hasPartiallyExpandedState, or before the first layout whether the state is enabled. */
  #hasPartial(): boolean {
    const state = this.#state;
    return state.draggable.anchors.size > 0
      ? state.hasPartiallyExpandedState
      : !state.skipPartiallyExpanded;
  }

  #ask(value: SheetValue): boolean {
    const handler = this.#options.onValueChange;
    return handler ? handler(value) !== false : true;
  }

  /** A user request: asks, then moves (the caller may already have called setValue). */
  #request(value: SheetValue): void {
    const target = this.#normalize(value);
    if (target === this.#state.targetValue && (target === 'hidden' || this.#shown)) return;
    if (!this.#ask(target)) return;
    this.setValue(target);
  }

  #specs(): SheetSpecs {
    const style = getComputedStyle(this.root);
    return {
      show: readSpringTokens(style, '--m3e-comp-bottom-sheet-show'),
      hide: readSpringTokens(style, '--m3e-comp-bottom-sheet-hide'),
      settle: readSpringTokens(style, '--m3e-comp-bottom-sheet-settle'),
    };
  }

  /** The container and sheet heights, measured now when the observers have none yet. */
  #measure(): void {
    if (this.#fullHeight <= 0) this.#fullHeight = this.root.clientHeight;
    const sheet = this.sheet;
    if (this.#sheetHeight <= 0 && sheet) this.#sheetHeight = sheet.getBoundingClientRect().height;
  }

  #relayout(now?: number): void {
    this.#measure();
    if (this.#fullHeight <= 0) return;
    const peek = this.root.classList.contains(`${SHEET}--peek`);
    const peekHeight = peek
      ? Number.parseFloat(
          getComputedStyle(this.root).getPropertyValue('--m3e-comp-bottom-sheet-peek-height'),
        )
      : undefined;
    this.#state.updateLayout(
      {
        fullHeight: this.#fullHeight,
        sheetHeight: Math.min(this.#sheetHeight, this.#fullHeight),
        peekHeight:
          peekHeight !== undefined && Number.isFinite(peekHeight) ? peekHeight : undefined,
      },
      now,
    );
    if (now !== undefined && this.#state.isAnimationRunning) this.#tick(now);
  }

  // --- Animation ------------------------------------------------------------------------------

  #scrimSpec(): SpringSpec | null {
    return readSpringTokens(getComputedStyle(this.root), '--m3e-comp-bottom-sheet-scrim');
  }

  #tick(now: number): void {
    const s = this.#state.sample(now);
    if (this.variant === 'modal') {
      // isScrimVisible = targetValue != Hidden, on DefaultEffects (animateFloatAsState).
      const target = this.#state.targetValue !== 'hidden' ? 1 : 0;
      if (this.#scrim.target !== target) {
        const spec = this.#scrimSpec();
        if (spec) this.#scrim.animateTo(target, spec, now);
        else this.#scrim.snapTo(target);
      }
      this.#scrim.sample(now);
    }
    const moving = s.running && !this.#state.draggable.isDragging;
    const running = s.running || this.#scrim.isRunning;
    if (!running) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      this.#rest();
      if (this.#state.currentValue === 'hidden') this.#hide();
      else if (this.#focusPending) this.#focusIn();
      return;
    }
    const style = this.root.style;
    this.root.toggleAttribute('data-animating', true);
    const rest = this.#fullHeight - Math.min(this.#sheetHeight, this.#fullHeight);
    if (!Number.isNaN(s.offset)) style.setProperty('--_m3e-bs-translate', px(s.offset - rest));
    style.setProperty('--_m3e-bs-stretch', px(s.overflow));
    if (this.variant === 'modal') style.setProperty('--_m3e-bs-scrim', round(this.#scrim.value));
    if (this.#frame === 0 && (moving || this.#scrim.isRunning)) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  /** At rest: the classes alone place the sheet. */
  #rest(): void {
    this.root.removeAttribute('data-animating');
    for (const name of VARS) this.root.style.removeProperty(name);
    if (this.root.getAttribute('style') === '') this.root.removeAttribute('style');
    this.#updateScrolls();
  }

  /**
   * While the content overflows it is a keyboard-focusable scroll region (`tabindex="0"`) with a
   * role and a name (M11 a11y audit L9): `role="group"` named like the sheet (the dialog's or the
   * sheet region's `aria-label`). Not a second `region`: a landmark with the sheet's own name
   * would repeat it (axe `landmark-unique`). On an expanded sheet `data-scrolls` lets touch
   * scroll it instead of dragging the sheet.
   */
  #updateScrolls(): void {
    const content = this.#content;
    if (!content) return;
    const overflows = content.scrollHeight > content.clientHeight;
    this.root.toggleAttribute('data-scrolls', overflows && this.#state.currentValue === 'expanded');
    if (overflows) {
      const named = this.variant === 'modal' ? this.root : this.sheet;
      const name = named?.getAttribute('aria-label') ?? '';
      setAttr(content, 'tabindex', '0');
      setAttr(content, 'role', 'group');
      setAttr(content, 'aria-label', name === '' ? null : name);
    } else if (content.getAttribute('tabindex') === '0') {
      content.removeAttribute('tabindex');
      content.removeAttribute('role');
      content.removeAttribute('aria-label');
    }
  }

  // --- Visibility -----------------------------------------------------------------------------

  #show(): void {
    if (this.#shown) return;
    this.#shown = true;
    const root = this.root;
    if (this.variant === 'modal') {
      this.#session?.start();
      const dialog = root as HTMLDialogElement;
      if (!dialog.open) {
        if (dialog.isConnected && typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
      // The window's size: measured now (the closed dialog had none).
      this.#fullHeight = 0;
      this.#sheetHeight = 0;
      this.#scrim.snapTo(0);
    } else {
      const sheet = this.sheet;
      this.#opener = sheet ? activeOpener(sheet) : null;
    }
  }

  #focusIn(): void {
    this.#focusPending = false;
    if (this.variant === 'modal' && this.#shown) this.#session?.focusFirst();
  }

  #hide(): void {
    if (!this.#shown) return;
    this.#shown = false;
    this.#drag.cancel();
    if (this.variant === 'modal') {
      const dialog = this.root as HTMLDialogElement;
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      this.#session?.end();
    } else {
      const sheet = this.sheet;
      if (sheet) returnFocus(this.#opener, sheet);
      this.#opener = null;
    }
  }

  // --- Requests -------------------------------------------------------------------------------

  /** animateToDismiss: hides (a press on the scrim, the handle of an expanded sheet). */
  #dismiss(): void {
    this.#request('hidden');
  }

  /**
   * settleToDismiss (Escape: Compose's back handling): an expanded sheet that has the
   * PartiallyExpanded state partially expands, any other hides.
   */
  #settleToDismiss(): void {
    const state = this.#state;
    if (state.currentValue === 'expanded' && this.#hasPartial()) {
      this.#request('partially-expanded');
    } else if (!state.skipHiddenState) {
      this.#request('hidden');
    }
  }

  #onHandle(): void {
    switch (this.#state.handleAction()) {
      case 'dismiss':
        this.#dismiss();
        break;
      case 'hide':
        this.hide();
        break;
      case 'expand':
        this.expand();
        break;
      case 'partial-expand':
        this.partialExpand();
        break;
      case 'show':
        this.show();
        break;
    }
  }

  #onClick = (e: MouseEvent): void => {
    const target = e.target as Element | null;
    if (!target) return;
    if (target.closest(`.${SHEET}__handle`)?.parentElement === this.sheet) {
      this.#onHandle();
    } else if (
      this.variant === 'modal' &&
      target.classList.contains(`${SHEET}__scrim`) &&
      this.#options.dismissOnClickOutside !== false
    ) {
      this.#dismiss();
    }
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;
    const target = e.target as Element | null;
    const onHandle = target?.closest(`.${SHEET}__handle`)?.parentElement === this.sheet;
    if (onHandle && this.#options.gesturesEnabled !== false) {
      // The handle's accessibility actions (expand / collapse / dismiss) from the keyboard.
      const state = this.#state;
      if (e.key === 'ArrowUp' && state.currentValue !== 'expanded') {
        e.preventDefault();
        if (state.currentValue === 'hidden') this.show();
        else this.expand();
        return;
      }
      if (e.key === 'ArrowDown' && state.currentValue !== 'hidden') {
        e.preventDefault();
        if (state.currentValue === 'expanded' && this.#hasPartial()) {
          this.partialExpand();
        } else {
          this.hide();
        }
        return;
      }
    }
    // BottomSheet's back handler (the modal's Escape goes through its ModalSession).
    if (
      e.key === 'Escape' &&
      this.variant === 'standard' &&
      !this.root.classList.contains(`${SHEET}--peek`) &&
      this.#state.currentValue !== 'hidden'
    ) {
      e.preventDefault();
      this.#settleToDismiss();
    }
  };

  /** A browser close request (Escape is handled first by the session; this covers the others). */
  #onCancel = (e: Event): void => {
    if (e.target !== this.root) return;
    e.preventDefault();
    this.#settleToDismiss();
  };

  /** Closed natively (`<form method="dialog">`, an uncancelable close request): follow it. */
  #onClose = (e: Event): void => {
    if (e.target !== this.root || !this.#shown) return;
    this.#state.snapTo('hidden');
    this.#rest();
    this.#hide();
    this.#options.onValueChange?.('hidden');
  };

  // --- Drags ----------------------------------------------------------------------------------

  #acceptDrag = (e: PointerEvent): boolean => {
    if (this.#options.gesturesEnabled === false || !this.#shown) return false;
    // anchoredDraggable(enabled = currentValue != Hidden).
    if (this.#state.currentValue === 'hidden' && this.#state.targetValue === 'hidden') return false;
    const target = e.target as Element | null;
    const sheet = this.sheet;
    if (!target || !sheet?.contains(target)) return false;
    return !target.closest(EDITABLE);
  };

  #startDrag = (e: PointerEvent, delta: number): boolean => {
    const content = this.#content;
    const target = e.target as Element | null;
    if (
      content &&
      target &&
      content.contains(target) &&
      content.scrollHeight > content.clientHeight
    ) {
      // Nested scroll: the sheet takes upward drags until it is fully expanded (onPreScroll) and
      // downward ones once the content is at its top (onPostScroll); the content scrolls the rest.
      const atTop = this.#state.offset <= this.#state.draggable.anchors.minPosition();
      const sheetTakes = delta < 0 ? !atTop : content.scrollTop <= 0;
      if (!sheetTakes) return false;
    }
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    const handle = this.#handle;
    if (handle) releaseRipple(handle);
    this.#state.startDrag(performance.now());
    return true;
  };
}
