import {
  type TooltipAnchorPosition,
  type TooltipRect,
  tooltipCaret,
  tooltipPosition,
} from '@kyralabs/m3e-motion';
import { AnchoredPopup } from '../base/anchored-popup.js';

export type { TooltipAnchorPosition };

const readNumber = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name));

const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;

/**
 * The anchor's bounds as Compose measures them: its Material components lay out at the minimum
 * interactive size (minimumInteractiveComponentSize), which m3e-css draws as an absolutely
 * positioned `::after` touch target around a smaller visual box, so that target counts.
 * @internal Shared with m3e-react; not part of the public API.
 */
export function anchorBounds(anchor: Element): TooltipRect {
  const box = anchor.getBoundingClientRect();
  const after = getComputedStyle(anchor, '::after');
  if (after.position !== 'absolute' || after.content === 'none' || after.content === '') {
    return box;
  }
  const out = (side: string) =>
    Math.max(0, -(Number.parseFloat(after.getPropertyValue(side)) || 0));
  return {
    left: box.left - out('left'),
    top: box.top - out('top'),
    right: box.right + out('right'),
    bottom: box.bottom + out('bottom'),
  };
}

/**
 * Shows a `.m3e-tooltip` as a popover the way Compose's TooltipBox does: placed by the
 * TooltipPositionProviderImpl port (m3e-motion `tooltipPosition`, `--m3e-comp-tooltip-spacing`
 * from the anchor), scaled from `--m3e-comp-tooltip-closed-scale` around its center on the fast
 * spatial spring and faded on the fast effects spring (interruptible), with the caret of a
 * `--caret` tooltip on the edge facing the anchor (Modifier.layoutCaret). Writes on the tooltip:
 * `data-driven`, `data-positioned`, `data-caret`, `--_m3e-tooltip-x/-y`,
 * `--_m3e-tooltip-caret-x/-y`, `--_m3e-tooltip-scale` and `--_m3e-tooltip-opacity`.
 */
export class TooltipPopup extends AnchoredPopup {
  /** TooltipAnchorPosition. Default `above`. */
  placement: TooltipAnchorPosition = 'above';

  constructor(tooltip: HTMLElement) {
    // TooltipBox: scaleSpec FastSpatial, alphaSpec FastEffects (tooltip-defaults.css).
    super(tooltip, { name: 'tooltip', scaleSpring: 'fast-spatial', opacitySpring: 'fast-effects' });
  }

  /** Shows (or keeps showing) the tooltip next to `anchor` and springs it in. */
  open(anchor: Element): void {
    this.show(anchor);
  }

  protected override place(anchor: Element, style: CSSStyleDeclaration): void {
    const el = this.element;
    const bounds = anchorBounds(anchor);
    const doc = el.ownerDocument.documentElement;
    const win = { width: doc.clientWidth, height: doc.clientHeight };
    // offsetWidth/Height ignore the scale transform, like Compose's measured size.
    const size = { width: el.offsetWidth, height: el.offsetHeight };
    const position = this.placement;
    const { x, y } = tooltipPosition({
      anchor: bounds,
      window: win,
      tooltip: size,
      rtl: getComputedStyle(anchor).direction === 'rtl',
      position,
      spacing: readNumber(style, '--m3e-comp-tooltip-spacing') || 0,
    });
    this.setProperty('--_m3e-tooltip-x', px(x));
    this.setProperty('--_m3e-tooltip-y', px(y));
    if (!el.classList.contains('m3e-tooltip--caret')) {
      el.removeAttribute('data-caret');
      return;
    }
    const caret = tooltipCaret({
      anchor: bounds,
      tooltip: { left: x, top: y, right: x + size.width, bottom: y + size.height },
      windowWidth: win.width,
      position,
    });
    el.setAttribute('data-caret', caret.direction);
    this.setProperty('--_m3e-tooltip-caret-x', px(caret.x));
    this.setProperty('--_m3e-tooltip-caret-y', px(caret.y));
  }

  protected override onPointerDown(e: PointerEvent): void {
    this.onOutsidePointerDown?.(e);
  }

  /** Set by the controller: a pointer went down while the tooltip was shown. */
  onOutsidePointerDown: ((e: PointerEvent) => void) | null = null;

  protected override onHidden(): void {
    this.element.removeAttribute('data-caret');
  }
}

/** Text of `node` as an accessible name would read it (aria-hidden subtrees skipped). */
function nameText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element) || node.getAttribute('aria-hidden') === 'true') return '';
  return [...node.childNodes].map(nameText).join('');
}

/**
 * The anchor's accessible name: aria-labelledby, aria-label, else its (visible) text.
 * @internal Shared with m3e-react; not part of the public API.
 */
export function accessibleName(el: Element): string {
  const root = el.getRootNode() as Document | ShadowRoot;
  const ids = el.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? [];
  const labelled = ids
    .map((id) => ('getElementById' in root ? root.getElementById(id) : null))
    .filter((n): n is HTMLElement => n !== null);
  if (labelled.length > 0) return labelled.map(nameText).join(' ');
  return el.getAttribute('aria-label') ?? nameText(el);
}

const normalizeName = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Whether a tooltip's text repeats its anchor's accessible name (an icon button whose label is the
 * tooltip text, as in every Compose sample). Owner decision M9 #2: then the anchor does not point
 * `aria-describedby` at it and it is `aria-hidden`, so screen readers do not read it twice.
 * @internal Shared with m3e-react; not part of the public API.
 */
export function tooltipRepeatsName(anchor: Element, tooltip: Element): boolean {
  // The tooltip's own aria-hidden (set by this rule) does not count.
  const text = normalizeName([...tooltip.childNodes].map(nameText).join(''));
  return text !== '' && text === normalizeName(accessibleName(anchor));
}

/** MutatePriority: Default < UserInput (mouse hover) < PreventUserInput (long press, focus). */
export type TooltipShowPriority = 'default' | 'user-input' | 'prevent-user-input';

const RANK: Readonly<Record<TooltipShowPriority, number>> = {
  default: 0,
  'user-input': 1,
  'prevent-user-input': 2,
};

/**
 * Compose shows the tooltip after `viewConfiguration.longPressTimeoutMillis`
 * (`internal/BasicTooltip.kt@19991f2c` L221), which on Android reads
 * `android.view.ViewConfiguration.getLongPressTimeout()` (`AndroidViewConfiguration.android.kt`
 * L31–32): the platform default, 400ms (AOSP `ViewConfiguration.DEFAULT_LONG_PRESS_TIMEOUT`).
 * The web has no such setting, so the default ships (SOURCES.md register #71, DECISIONS D19 (10)).
 * @internal Shared with m3e-react; not part of the public API.
 */
export const LONG_PRESS_TIMEOUT_MS = 400;

interface Job {
  owner: TooltipController;
  rank: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  /** Shown by a long press: hides once the press ends (BasicTooltip handleGestures). */
  longPress: boolean;
}

const focusVisible = (el: Element) => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

/** BasicTooltipDefaults.GlobalMutatorMutex: the show() currently holding the mutex. */
let holder: Job | null = null;

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface TooltipControllerOptions {
  /** The `.m3e-tooltip` (a `popover="manual"` element). */
  tooltip: HTMLElement;
  /**
   * Called when the tooltip asks to be shown or hidden (TooltipState.isVisible). The layer applies
   * it (or not) and calls `render()` with the visible state.
   */
  onVisibleChange: (visible: boolean) => void;
}

/**
 * TooltipBox / BasicTooltipBox behavior for an anchor and its tooltip, shared by `<m3e-tooltip>`
 * and m3e-react's `<TooltipTrigger>`:
 *
 * - Mouse: entering the anchor shows the tooltip (MutatePriority.UserInput: no timeout, it stays
 *   while the anchor or the tooltip is hovered); a non-persistent tooltip hides
 *   `--m3e-comp-tooltip-duration` after the pointer has left both (owner decision M9 #1:
 *   m3.material.io's 1.5s "after navigating away"; Compose hides on leaving the anchor).
 * - Touch / pen: a long press shows it (PreventUserInput) and swallows the click that follows; a
 *   non-persistent tooltip hides when the press ends, but not before `--m3e-comp-tooltip-duration`.
 * - Keyboard: focusing the anchor (`:focus-visible`) shows it (PreventUserInput) until focus leaves
 *   or Escape. Tab moves into a tooltip that `hasAction` (focus stays in it until Escape, which
 *   returns to the anchor, or a click outside), as Compose makes the popup focusable.
 * - `show()` (TooltipState.show, Default priority): a non-persistent tooltip hides after
 *   `--m3e-comp-tooltip-duration`; a persistent one stays until `dismiss()`.
 * - A pointer going down outside the tooltip (the anchor included) hides it (Popup
 *   onDismissRequest).
 * - One mutex for every tooltip (BasicTooltipDefaults.GlobalMutatorMutex): a show cancels the one
 *   holding it, which hides unless it was shown by a long press or focus, and a lower priority
 *   than the holder's does not show. Unlike Compose, `dismiss()` always releases the mutex (a
 *   mouse-hovered, non-persistent tooltip otherwise keeps it until another hover or press, so
 *   programmatic shows would be refused).
 */
export class TooltipController {
  readonly popup: TooltipPopup;
  readonly tooltip: HTMLElement;
  /** TooltipState.isPersistent. */
  isPersistent = false;
  /** TooltipBox hasAction: Tab from the anchor moves into the tooltip. */
  hasAction = false;
  /** TooltipBox enableUserInput: hover, long press and focus show it. */
  enableUserInput = true;
  #onVisibleChange: (visible: boolean) => void;
  #anchor: HTMLElement | null = null;
  #anchorListeners: AbortController | null = null;
  #visible = false;
  #job: Job | null = null;
  #longPressTimer: ReturnType<typeof setTimeout> | undefined;
  #pressing = false;
  #longPressed = false;
  #showingByLongPress = false;
  #dismissOnRelease = false;
  #receivedKeyboardFocus = false;
  #returningFocus = false;
  #tooltipListeners = false;
  #lingerTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: TooltipControllerOptions) {
    this.tooltip = options.tooltip;
    this.popup = new TooltipPopup(options.tooltip);
    this.#onVisibleChange = options.onVisibleChange;
    this.popup.onOutsidePointerDown = (e) => {
      const target = e.composedPath()[0] as Node | undefined;
      if (target && this.tooltip.contains(target)) return;
      this.dismiss();
    };
  }

  /** Whether the tooltip is (asked to be) shown. */
  get visible(): boolean {
    return this.#visible;
  }

  get anchor(): HTMLElement | null {
    return this.#anchor;
  }

  /** Binds the anchor's hover, long-press, focus and key handling (null unbinds). */
  setAnchor(anchor: HTMLElement | null): void {
    if (anchor === this.#anchor) return;
    this.#anchorListeners?.abort();
    this.#anchorListeners = null;
    this.#anchor = anchor;
    this.#cancelLongPress();
    if (!anchor) return;
    const controller = new AbortController();
    this.#anchorListeners = controller;
    const opts = { signal: controller.signal };
    anchor.addEventListener('pointerenter', this.#onPointerEnter, opts);
    anchor.addEventListener('pointerleave', this.#onPointerLeave, opts);
    anchor.addEventListener('pointerdown', this.#onPointerDown, opts);
    anchor.addEventListener('focusin', this.#onFocusIn, opts);
    anchor.addEventListener('focusout', this.#onFocusOut, opts);
    anchor.addEventListener('keydown', this.#onAnchorKeyDown, opts);
    // A long press swallows the click that ends it (Compose consumes the up event).
    anchor.addEventListener(
      'click',
      (e) => {
        if (!this.#longPressed) return;
        this.#longPressed = false;
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      { ...opts, capture: true },
    );
    anchor.addEventListener(
      'contextmenu',
      (e) => {
        if (this.#pressing || this.#longPressTimer !== undefined) e.preventDefault();
      },
      opts,
    );
    this.#bindTooltip();
  }

  /**
   * TooltipState.show: shows the tooltip unless a higher-priority show holds the mutex. Returns
   * whether it showed.
   */
  show(priority: TooltipShowPriority = 'default'): boolean {
    const rank = RANK[priority];
    this.#cancelLinger();
    if (holder && holder.owner !== this && holder.rank > rank) return false;
    if (holder) holder.owner.#endJob(holder, holder.owner === this);
    const job: Job = { owner: this, rank, timer: undefined, longPress: this.#showingByLongPress };
    holder = job;
    this.#job = job;
    if (!this.isPersistent && rank !== RANK['user-input']) {
      job.timer = setTimeout(() => {
        this.#endJob(job, false);
      }, this.#duration());
    }
    this.#setVisible(true);
    return true;
  }

  /** TooltipState.dismiss: hides the tooltip (and releases the mutex). */
  dismiss(): void {
    this.#cancelLinger();
    this.#setVisible(false);
    if (this.#job) this.#endJob(this.#job, true);
  }

  /** Shows or hides the popup for the layer's visible state (call after `onVisibleChange`). */
  render(visible: boolean): void {
    this.#visible = visible;
    const anchor = this.#anchor;
    if (visible && anchor) this.popup.open(anchor);
    else if (!visible) this.popup.close();
  }

  /** Unbinds everything and hides immediately. */
  destroy(): void {
    this.setAnchor(null);
    if (this.#job) this.#endJob(this.#job, true);
    this.popup.destroy();
    this.#visible = false;
  }

  /** `--m3e-comp-tooltip-duration` in ms (minifiers may rewrite `1500ms` as `1.5s`). */
  #duration(): number {
    const raw = getComputedStyle(this.tooltip).getPropertyValue('--m3e-comp-tooltip-duration');
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return 0;
    return /[^m]s\s*$/.test(raw) ? value * 1000 : value;
  }

  #setVisible(visible: boolean): void {
    if (visible === this.#visible) return;
    this.#visible = visible;
    if (!visible) {
      this.#receivedKeyboardFocus = false;
      this.#cancelLinger();
    }
    this.#onVisibleChange(visible);
  }

  /**
   * The show() coroutine ends (timeout, or cancelled): Compose's `finally` hides the tooltip unless
   * it was shown with PreventUserInput; a long-pressed one then hides once the press ends.
   * `quiet`: replaced by the same tooltip, or already dismissed (nothing to hide).
   */
  #endJob(job: Job, quiet: boolean): void {
    if (job.timer !== undefined) clearTimeout(job.timer);
    job.timer = undefined;
    if (holder === job) holder = null;
    if (this.#job === job) this.#job = null;
    if (quiet) return;
    if (job.rank !== RANK['prevent-user-input']) {
      this.#setVisible(false);
    } else if (job.longPress) {
      if (this.#pressing) this.#dismissOnRelease = true;
      else this.#setVisible(false);
    }
  }

  // --- Pointer ---------------------------------------------------------------------------------

  #onPointerEnter = (e: PointerEvent): void => {
    if (!this.enableUserInput || e.pointerType !== 'mouse') return;
    this.show('user-input');
  };

  #onPointerLeave = (e: PointerEvent): void => {
    if (!this.enableUserInput || e.pointerType !== 'mouse') return;
    this.#linger();
  };

  /** The pointer left the anchor or the tooltip: hide a non-persistent tooltip after a while. */
  #linger(): void {
    if (this.isPersistent || !this.#visible) return;
    this.#cancelLinger();
    this.#lingerTimer = setTimeout(() => {
      this.#lingerTimer = undefined;
      this.dismiss();
    }, this.#duration());
  }

  #cancelLinger(): void {
    if (this.#lingerTimer !== undefined) clearTimeout(this.#lingerTimer);
    this.#lingerTimer = undefined;
  }

  #onPointerDown = (e: PointerEvent): void => {
    if (!this.enableUserInput || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
    this.#cancelLongPress();
    this.#longPressed = false;
    const anchor = this.#anchor;
    const id = e.pointerId;
    const doc = anchor?.ownerDocument;
    if (!anchor || !doc) return;
    const end = new AbortController();
    const release = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      end.abort();
      this.#cancelLongPress();
      this.#pressing = false;
      if (this.#dismissOnRelease) {
        this.#dismissOnRelease = false;
        this.#setVisible(false);
      }
      // The click (if any) follows pointerup; a cancelled press has none.
      if (ev.type === 'pointercancel') this.#longPressed = false;
    };
    doc.addEventListener('pointerup', release, { signal: end.signal, capture: true });
    doc.addEventListener('pointercancel', release, { signal: end.signal, capture: true });
    this.#pressing = true;
    this.#longPressTimer = setTimeout(() => {
      this.#longPressTimer = undefined;
      this.#longPressed = true;
      this.#dismissOnRelease = false;
      this.#showingByLongPress = true;
      this.show('prevent-user-input');
      this.#showingByLongPress = false;
    }, LONG_PRESS_TIMEOUT_MS);
  };

  #cancelLongPress(): void {
    if (this.#longPressTimer !== undefined) clearTimeout(this.#longPressTimer);
    this.#longPressTimer = undefined;
  }

  // --- Keyboard --------------------------------------------------------------------------------

  #onFocusIn = (): void => {
    const anchor = this.#anchor;
    if (!this.enableUserInput || !anchor || this.#returningFocus) return;
    // Compose shows on any focus; on the web a click focuses buttons too, so keyboard focus only.
    if (!focusVisible(anchor)) return;
    this.#receivedKeyboardFocus = true;
    this.show('prevent-user-input');
  };

  #onFocusOut = (e: FocusEvent): void => {
    const next = e.relatedTarget as Node | null;
    if (next && (this.tooltip.contains(next) || this.#anchor?.contains(next))) return;
    if (this.#receivedKeyboardFocus && this.#visible) this.dismiss();
  };

  #onAnchorKeyDown = (e: KeyboardEvent): void => {
    if (!this.enableUserInput || !this.#visible) return;
    if (this.hasAction && e.key === 'Tab') {
      const first = this.tooltip.querySelector<HTMLElement>(FOCUSABLE);
      if (first) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.dismiss();
    }
  };

  #bindTooltip(): void {
    if (this.#tooltipListeners) return;
    this.#tooltipListeners = true;
    // The tooltip itself is hoverable (WCAG 1.4.13): it stays while hovered.
    this.tooltip.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && this.#visible) this.#cancelLinger();
    });
    this.tooltip.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && this.enableUserInput) this.#linger();
    });
    this.tooltip.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // dismissOnBackPress → onDismissRequest; focus goes back to the anchor's window.
        e.preventDefault();
        e.stopPropagation();
        this.dismiss();
        this.#returnFocus();
      } else if (e.key === 'Tab') {
        // The focusable popup keeps focus (its focus search wraps) until it is dismissed.
        const items = [...this.tooltip.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const index = items.indexOf(e.target as HTMLElement);
        const next = (index + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        e.preventDefault();
        items[next]?.focus();
      }
    });
    this.tooltip.addEventListener('focusout', (e) => {
      const next = e.relatedTarget as Node | null;
      if (next && (this.tooltip.contains(next) || this.#anchor?.contains(next))) return;
      if (next) this.dismiss();
    });
  }

  #returnFocus(): void {
    const anchor = this.#anchor;
    if (!anchor || !this.tooltip.contains(anchor.ownerDocument.activeElement)) return;
    this.#returningFocus = true;
    anchor.focus({ preventScroll: true });
    this.#returningFocus = false;
  }
}
