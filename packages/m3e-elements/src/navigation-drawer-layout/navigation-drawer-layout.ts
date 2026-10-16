import {
  DRAWER_VELOCITY_THRESHOLD,
  DrawerAnimation,
  type DrawerSpecs,
  parseCubicBezier,
} from '@kyralabs/m3e-motion';
import { lockScroll, tabStops, trapTab, unlockScroll } from '../base/modal.js';
import { readSpringTokens } from '../base/scroll.js';

export type NavigationDrawerVariant = 'permanent' | 'dismissible' | 'modal';

export interface NavigationDrawerLayoutOptions {
  /** The initial state (rendered without animating). */
  open?: boolean;
  /**
   * The drawer asks to change state: Escape, a press on the scrim or a drag released past the
   * thresholds (DrawerState's confirmStateChange). Return `false` to veto (the drawer stays, or a
   * drag settles back); without it the drawer follows itself. Controlled callers then call
   * `setOpen` (a no-op when the drawer already heads there).
   */
  onOpenChange?: (open: boolean) => boolean | undefined;
  /** Modal only: the window's accessible name (Compose `Strings.NavigationMenu`). */
  dialogLabel?: string;
  /** Drags on the sheet / scrim close the drawer (Compose `gesturesEnabled`). Default true. */
  gesturesEnabled?: boolean;
}

const DRAWER = 'm3e-navigation-drawer';
const ITEM = 'm3e-navigation-drawer-item';
const VARS = [
  '--_m3e-nd-offset',
  '--_m3e-nd-stretch',
  '--_m3e-nd-fraction',
  '--_m3e-nd-inline-size',
] as const;
/** Compose `Strings.NavigationMenu` (compose/ui androidMain res/values/strings.xml L38). */
const PANE_TITLE = 'Navigation menu';
/**
 * Pointer travel before a drag starts: Android's touch slop (8dp, ViewConfiguration), which
 * Compose's anchoredDraggable reads (SOURCES register #33).
 */
const DRAG_SLOP = 8;
/**
 * Release velocity (an approximation of Compose's VelocityTracker1D, which fits the samples of the
 * last 100ms and drops everything before a 40ms pause, AssumePointerMoveStoppedMilliseconds):
 * the average speed over the trailing samples within that horizon, the release included.
 */
const VELOCITY_WINDOW = 100;
const VELOCITY_PAUSE = 40;

/** px/s over the trailing run of samples (newest last) without a pause, within the window. */
export function releaseVelocity(samples: readonly { t: number; x: number }[]): number {
  const last = samples.at(-1);
  if (!last) return 0;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    const s = samples[i];
    if (!s || first.t - s.t > VELOCITY_PAUSE || last.t - s.t > VELOCITY_WINDOW) break;
    first = s;
  }
  const dt = (last.t - first.t) / 1000;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}

const round = (v: number) => String(Math.round(v * 1e4) / 1e4);
const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const canPopover = (el: HTMLElement) => typeof el.showPopover === 'function';

/**
 * Behavior of a `.m3e-navigation-drawer` (COMPONENT_SPEC §15), shared by `<m3e-navigation-drawer>`
 * and m3e-react's `<NavigationDrawer>` so both layers write one DOM contract. The variant comes
 * from the root's class (`--modal`, `--dismissible`, else permanent); the caller renders the
 * target state (`m3e-navigation-drawer--open`) and calls `setOpen`.
 *
 * - Open / close (DrawerState.open() / close()): m3e-motion's DrawerAnimation runs Compose's
 *   springs from the current offset and velocity (navigation-drawer-defaults.css: open on the
 *   default spatial spring, close on the fast effects spring; both jump under reduced motion) and
 *   each frame writes `--_m3e-nd-offset`, `--_m3e-nd-stretch`, `--_m3e-nd-fraction` and, for the
 *   dismissible drawer, `--_m3e-nd-inline-size`, with `data-animating`, and nothing else; the
 *   sheet width comes from a ResizeObserver, so no layout is read while it moves. `data-open` is
 *   set while the sheet is visible.
 * - Drags (anchoredDraggable): a horizontal drag on the open sheet (or the modal scrim) moves it
 *   with the pointer; the release settles open or closed with Compose's thresholds (50% of the
 *   width, 400dp/s) on its decay or 256ms tween, asking `onOpenChange` first.
 * - Modal: while visible the root gets `role="dialog"`, `aria-modal` and a label, and the scrim
 *   and the sheet move into the top layer (`popover="manual"`; fixed positioning where the
 *   Popover API is missing); the document scroll locks and Tab stays in the sheet. Escape (both
 *   collapsible variants) and a press on the scrim ask to close.
 * - Focus: opening moves focus to the sheet's first stop (Compose requests focus on the drawer);
 *   closing returns it to the element that had it when the drawer opened. ArrowDown / ArrowUp
 *   move between items (Compose's directional focus; m3.material.io keyboard table).
 */
export class NavigationDrawerLayout {
  readonly root: HTMLElement;
  readonly variant: NavigationDrawerVariant;
  #options: NavigationDrawerLayoutOptions;
  #animation: DrawerAnimation;
  #abort = new AbortController();
  #openAbort: AbortController | null = null;
  #frame = 0;
  #observer: ResizeObserver | null = null;
  #shown = false;
  #locked = false;
  #opener: HTMLElement | null = null;
  #drag: {
    id: number;
    x: number;
    y: number;
    last: number;
    active: boolean;
    /** 1, or −1 in RTL (anchoredDraggable reverseDirection = isRtl). */
    dir: number;
    samples: { t: number; x: number }[];
  } | null = null;

  constructor(root: HTMLElement, options: NavigationDrawerLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.variant = root.classList.contains(`${DRAWER}--modal`)
      ? 'modal'
      : root.classList.contains(`${DRAWER}--dismissible`)
        ? 'dismissible'
        : 'permanent';
    const open =
      this.variant === 'permanent' || (options.open ?? root.classList.contains(`${DRAWER}--open`));
    this.#animation = new DrawerAnimation(open, 0);
    const { signal } = this.#abort;
    root.addEventListener('keydown', this.#onKeyDown, { signal });
    if (this.variant !== 'permanent') {
      if (typeof ResizeObserver !== 'undefined') {
        this.#observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const size = entry.borderBoxSize[0];
            this.#animation.setWidth(size ? size.inlineSize : entry.contentRect.width);
          }
        });
      }
      this.update();
      root.addEventListener('pointerdown', this.#onPointerDown, { signal });
      if (open) this.#show(false);
    }
  }

  /** DrawerState.targetValue === Open. */
  get isOpen(): boolean {
    return this.#animation.isOpen;
  }

  /** The `<nav>`. */
  get sheet(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${DRAWER}__sheet`);
  }

  get #scrim(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`:scope > .${DRAWER}__scrim`);
  }

  /** Re-reads the DOM after a render (the sheet replaced). */
  update(): void {
    const sheet = this.sheet;
    if (!this.#observer || !sheet) return;
    this.#observer.disconnect();
    this.#observer.observe(sheet);
  }

  /** Opens / closes with animation (`animate = false` jumps). Permanent drawers stay open. */
  setOpen(open: boolean, animate = true): void {
    if (this.variant === 'permanent') return;
    if (open === this.#animation.isOpen) return;
    const doc = this.root.ownerDocument;
    if (open) {
      const active = doc.activeElement;
      this.#opener =
        active instanceof HTMLElement && active !== doc.body && !this.root.contains(active)
          ? active
          : this.#opener;
    }
    this.#drag = null;
    const now = performance.now();
    if (!animate) {
      this.#animation.snapTo(open);
      if (open) this.#show(true);
      else this.#hide();
      this.#rest();
      return;
    }
    this.#animation.animateTo(open, this.#specs(), now);
    if (open) this.#show(true);
    else this.#returnFocus();
    this.#tick(now);
  }

  /** Asks to close (Escape, the scrim): the caller decides, or the drawer closes itself. */
  requestClose(): void {
    if (!this.#animation.isOpen) return;
    if (this.#confirm(false)) this.setOpen(false);
  }

  destroy(): void {
    this.#abort.abort();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#observer?.disconnect();
    this.#hide();
    this.#rest();
  }

  #confirm(open: boolean): boolean {
    const handler = this.#options.onOpenChange;
    return handler ? handler(open) !== false : true;
  }

  // --- Animation ------------------------------------------------------------------------------

  #specs(): DrawerSpecs {
    const style = getComputedStyle(this.root);
    const duration = Number.parseFloat(
      style.getPropertyValue('--m3e-comp-navigation-drawer-settle-duration'),
    );
    const easing = parseCubicBezier(
      style.getPropertyValue('--m3e-comp-navigation-drawer-settle-easing'),
    );
    return {
      open: readSpringTokens(style, '--m3e-comp-navigation-drawer-open'),
      close: readSpringTokens(style, '--m3e-comp-navigation-drawer-close'),
      settle: duration > 0 && easing ? { duration, easing } : null,
    };
  }

  #tick(now: number): void {
    const s = this.#animation.sample(now);
    if (!s.running) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      if (!this.#animation.isOpen) this.#hide();
      this.#rest();
      return;
    }
    if (s.visible && !this.#shown) this.#show(false);
    const style = this.root.style;
    this.root.toggleAttribute('data-animating', true);
    style.setProperty('--_m3e-nd-offset', px(s.offset));
    style.setProperty('--_m3e-nd-stretch', px(Math.max(0, s.offset)));
    style.setProperty('--_m3e-nd-fraction', round(s.fraction));
    if (this.variant === 'dismissible') {
      style.setProperty('--_m3e-nd-inline-size', px(Math.max(0, this.#animation.width + s.offset)));
    }
    if (this.#frame === 0 && !this.#animation.isDragging) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  /** At rest: the classes alone describe the drawer. */
  #rest(): void {
    this.root.removeAttribute('data-animating');
    for (const name of VARS) this.root.style.removeProperty(name);
    if (this.root.getAttribute('style') === '') this.root.removeAttribute('style');
  }

  // --- Drags ----------------------------------------------------------------------------------

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || this.#options.gesturesEnabled === false) return;
    if (!this.#shown) return;
    const target = e.target as Element | null;
    const sheet = this.sheet;
    if (!target || !(sheet?.contains(target) || target === this.#scrim)) return;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const now = e.timeStamp || performance.now();
    this.#drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      last: e.clientX,
      active: false,
      dir: getComputedStyle(this.root).direction === 'rtl' ? -1 : 1,
      samples: [{ t: now, x: e.clientX }],
    };
    const { signal } = this.#abort;
    const options = { signal };
    this.root.addEventListener('pointermove', this.#onPointerMove, options);
    this.root.addEventListener('pointerup', this.#onPointerUp, options);
    this.root.addEventListener('pointercancel', this.#onPointerUp, options);
  };

  #onPointerMove = (e: PointerEvent): void => {
    const drag = this.#drag;
    if (drag?.id !== e.pointerId) return;
    const now = e.timeStamp || performance.now();
    drag.samples.push({ t: now, x: e.clientX });
    while (drag.samples.length > 2 && now - (drag.samples[0]?.t ?? now) > VELOCITY_WINDOW) {
      drag.samples.shift();
    }
    if (!drag.active) {
      const dx = Math.abs(e.clientX - drag.x);
      const dy = Math.abs(e.clientY - drag.y);
      if (dy > DRAG_SLOP && dy > dx) {
        this.#endPointer();
        return;
      }
      if (dx <= DRAG_SLOP || dx < dy) return;
      drag.active = true;
      drag.last = e.clientX;
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      this.#animation.startDrag(performance.now());
      this.root.setPointerCapture(e.pointerId);
    }
    this.#animation.dragBy((e.clientX - drag.last) * drag.dir);
    drag.last = e.clientX;
    e.preventDefault();
    this.#tick(performance.now());
  };

  #onPointerUp = (e: PointerEvent): void => {
    const drag = this.#drag;
    if (drag?.id !== e.pointerId) return;
    this.#endPointer();
    if (!drag.active) return;
    // A drag is not a click: swallow the click that follows this pointerup (dispatched before
    // any timer), then stop listening.
    const guard = (click: Event) => {
      click.preventDefault();
      click.stopPropagation();
    };
    this.root.addEventListener('click', guard, { capture: true, once: true });
    setTimeout(() => {
      this.root.removeEventListener('click', guard, { capture: true });
    }, 0);
    drag.samples.push({ t: e.timeStamp || performance.now(), x: e.clientX });
    const velocity = e.type === 'pointercancel' ? 0 : releaseVelocity(drag.samples) * drag.dir;
    const now = performance.now();
    const open = this.#animation.release(
      velocity,
      this.#specs(),
      now,
      DRAWER_VELOCITY_THRESHOLD,
      (next) => this.#confirm(next),
    );
    if (!open) this.#returnFocus();
    this.#tick(now);
  };

  #endPointer(): void {
    const drag = this.#drag;
    this.#drag = null;
    this.root.removeEventListener('pointermove', this.#onPointerMove);
    this.root.removeEventListener('pointerup', this.#onPointerUp);
    this.root.removeEventListener('pointercancel', this.#onPointerUp);
    if (drag && this.root.hasPointerCapture(drag.id)) this.root.releasePointerCapture(drag.id);
  }

  // --- Keyboard -------------------------------------------------------------------------------

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;
    const sheet = this.sheet;
    if (!sheet) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const current = (e.target as Element | null)?.closest<HTMLElement>(`.${ITEM}`);
      if (current?.parentElement !== sheet) return;
      const items = [...sheet.querySelectorAll<HTMLElement>(`:scope > .${ITEM}`)].filter(
        (el) => el.getAttribute('aria-disabled') !== 'true',
      );
      const next = items[items.indexOf(current) + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) {
        e.preventDefault();
        next.focus();
      }
      return;
    }
    if (this.variant === 'permanent' || !this.#animation.isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.requestClose();
    } else if (e.key === 'Tab' && this.variant === 'modal') {
      trapTab(e, sheet);
    }
  };

  // --- Visibility -----------------------------------------------------------------------------

  #show(focus: boolean): void {
    const sheet = this.sheet;
    if (this.#shown || !sheet) return;
    this.#shown = true;
    const root = this.root;
    const doc = root.ownerDocument;
    root.setAttribute('data-open', '');
    if (this.variant === 'modal') {
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', this.#options.dialogLabel ?? PANE_TITLE);
      for (const el of [this.#scrim, sheet]) {
        if (el && canPopover(el)) {
          el.setAttribute('popover', 'manual');
          if (!el.matches(':popover-open')) el.showPopover();
        }
      }
      lockScroll(doc);
      this.#locked = true;
      this.#openAbort = new AbortController();
      this.#scrim?.addEventListener(
        'click',
        () => {
          this.requestClose();
        },
        { signal: this.#openAbort.signal },
      );
    }
    const active = doc.activeElement;
    if (focus && (!active || !sheet.contains(active))) {
      tabStops(sheet)[0]?.focus({ preventScroll: true });
    }
  }

  #hide(): void {
    if (!this.#shown) return;
    this.#shown = false;
    this.#openAbort?.abort();
    this.#openAbort = null;
    const root = this.root;
    for (const el of [this.sheet, this.#scrim]) {
      if (!el) continue;
      if (typeof el.hidePopover === 'function' && el.matches(':popover-open')) el.hidePopover();
      el.removeAttribute('popover');
    }
    root.removeAttribute('data-open');
    if (this.variant === 'modal') {
      root.removeAttribute('role');
      root.removeAttribute('aria-modal');
      root.removeAttribute('aria-label');
    }
    if (this.#locked) {
      unlockScroll(root.ownerDocument);
      this.#locked = false;
    }
    this.#returnFocus();
  }

  /** Focus inside the drawer (or lost to the body) goes back to the opener. */
  #returnFocus(): void {
    const doc = this.root.ownerDocument;
    const active = doc.activeElement;
    const opener = this.#opener;
    if (!opener?.isConnected || opener === active) return;
    if (active && active !== doc.body && !this.root.contains(active)) return;
    opener.focus({ preventScroll: true });
  }
}
