import {
  PullToRefreshPull,
  SpringAnimatable,
  pullToRefreshArrowGeometry,
  pullToRefreshArrowPaths,
} from '@kyralabs/m3e-motion';
import { type PointerDrag, pointerDrag } from '../base/drag.js';
import { observeScroll, readSpringTokens } from '../base/scroll.js';

export interface PullToRefreshLayoutOptions {
  /** The initial `isRefreshing` (the indicator rests at the threshold, as Compose's onAttach). */
  refreshing?: boolean;
  /** Compose `enabled`: false ignores pulls. */
  enabled?: boolean;
  /**
   * A release past the threshold (Compose `onRefresh`). The caller sets the refreshing state
   * (`setRefreshing(true)`), now or later, as Compose's `isRefreshing`.
   */
  onRefresh?: () => void;
  /** Every change of the distanceFraction (the LoadingIndicator variant's progress). */
  onFraction?: (fraction: number) => void;
}

const ROOT = 'm3e-pull-to-refresh';
const THRESHOLD = '--m3e-comp-pull-to-refresh-positional-threshold';
const STATE_SPRING = '--m3e-comp-pull-to-refresh-state';

const setAttr = (el: Element | null, name: string, value: string | null): void => {
  if (!el) return;
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

/**
 * Behavior of a `.m3e-pull-to-refresh` (COMPONENT_SPEC §38; Compose Modifier.pullToRefresh,
 * PullToRefreshState and the default indicator), shared by `<m3e-pull-to-refresh>` and m3e-react's
 * `<PullToRefresh>` so both layers write one DOM contract.
 *
 * - Pulls (owner decision M9 #28): touch and pen drags (base/drag.ts pointerDrag, vertical) that
 *   start while the content (`__content`, the scroll container) is at its top, enabled, not
 *   refreshing and not animating, and move down. Each move goes through m3e-motion's
 *   PullToRefreshPull (Compose's consumeAvailableOffset: × 0.5, the tension past the threshold);
 *   moving back up retracts the pull first, then scrolls the content, as Compose's nested scroll
 *   does. Touch moves down at the top are kept from the browser (a non-passive `touchmove` and,
 *   `[data-at-top]`, `touch-action: pan-x pan-down`). Mouse drags and wheels never pull.
 * - The release: past the threshold it calls `onRefresh`, then animates to hidden unless the
 *   caller set refreshing meanwhile (Compose's onRelease; `isRefreshing` then animates to the
 *   threshold). `setRefreshing` animates to the threshold or back to hidden.
 * - Motion: the distanceFraction on PullToRefreshStateImpl's spring (Animatable's default spring,
 *   `--m3e-comp-pull-to-refresh-state-*`; jumps under reduced motion) with m3e-motion's
 *   SpringAnimatable. Each change writes `--_m3e-ptr-fraction` (removed at 0), `data-pulled`
 *   (above 0), `data-armed` (at or past 1: the arrow's MaxAlpha), the arrow's paths (m3e-motion's
 *   port of CircularArrowProgressIndicator), the pull indicator's `aria-valuenow` and which part is
 *   `aria-hidden`; `data-animating` while the spring runs, `data-dragging` while pulled.
 */
export class PullToRefreshLayout {
  readonly root: HTMLElement;
  #options: PullToRefreshLayoutOptions;
  #refreshing: boolean;
  #enabled: boolean;
  #pull = new PullToRefreshPull(80);
  #anim: SpringAnimatable;
  #frame = 0;
  #abort = new AbortController();
  #scrollAbort: AbortController | null = null;
  #content: HTMLElement | null = null;
  #drag: PointerDrag;
  #pulling = false;
  #touch: { y: number; eligible: boolean } | null = null;
  #reported = Number.NaN;
  #resize: ResizeObserver | undefined;

  constructor(root: HTMLElement, options: PullToRefreshLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.#refreshing = options.refreshing ?? false;
    this.#enabled = options.enabled ?? true;
    // onAttach: snapTo(if (isRefreshing) 1f else 0f).
    this.#anim = new SpringAnimatable(this.#refreshing ? 1 : 0);
    this.#pull.thresholdPx = this.#thresholdPx();
    this.#pull.reset(this.#refreshing);
    this.#drag = pointerDrag(root, {
      axis: 'y',
      accept: (e) => e.pointerType !== 'mouse' && this.#canPull() && this.#fromContent(e.target),
      start: (_e, delta) => {
        if (delta <= 0 || !this.#canPull()) return false;
        this.#pull.thresholdPx = this.#thresholdPx();
        this.#pulling = true;
        return true;
      },
      move: (delta) => {
        this.#move(delta);
      },
      end: (_velocity, e) => {
        this.#release(e.type !== 'pointercancel');
      },
    });
    const signal = this.#abort.signal;
    root.addEventListener(
      'touchstart',
      (e) => {
        const touch = e.touches[0];
        this.#touch =
          touch && e.touches.length === 1
            ? { y: touch.clientY, eligible: this.#canPull() && this.#fromContent(e.target) }
            : null;
      },
      { passive: true, signal },
    );
    // Keep touch moves down at the top from the browser (Safari has no directional touch-action).
    root.addEventListener(
      'touchmove',
      (e) => {
        if (!e.cancelable) return;
        if (this.#pulling) {
          e.preventDefault();
          return;
        }
        const touch = e.touches[0];
        const t = this.#touch;
        if (!t?.eligible || !touch) return;
        const dy = touch.clientY - t.y;
        if (dy > 0 && this.#atTop()) e.preventDefault();
        else if (dy < 0) t.eligible = false;
      },
      { passive: false, signal },
    );
    this.update();
    this.#render();
  }

  /** The state's distanceFraction (0 hidden, 1 at the threshold, up to 2 past it). */
  get distanceFraction(): number {
    return this.#anim.value;
  }

  get isRefreshing(): boolean {
    return this.#refreshing;
  }

  setOptions(options: PullToRefreshLayoutOptions): void {
    this.#options = { ...this.#options, ...options };
    if (options.enabled !== undefined) this.setEnabled(options.enabled);
  }

  /** Compose `enabled`. A pull in progress ends (without refreshing). */
  setEnabled(enabled: boolean): void {
    if (enabled === this.#enabled) return;
    this.#enabled = enabled;
    if (!enabled && this.#pulling) {
      this.#drag.cancel();
      this.root.removeAttribute('data-dragging');
      this.#release(false);
    }
    this.#syncAtTop();
  }

  /**
   * Compose `isRefreshing` (PullToRefreshModifierNode.update): animates to the threshold while
   * refreshing, back to hidden after.
   */
  setRefreshing(refreshing: boolean): void {
    if (refreshing === this.#refreshing) return;
    this.#refreshing = refreshing;
    if (refreshing && this.#pulling) {
      this.#drag.cancel();
      this.#pulling = false;
      this.root.removeAttribute('data-dragging');
    }
    this.#pull.thresholdPx = this.#thresholdPx();
    this.#animateTo(refreshing ? 1 : 0);
    this.#pull.reset(refreshing);
  }

  /** Re-reads the DOM after a render (the content replaced). */
  update(): void {
    const content = this.root.querySelector<HTMLElement>(`:scope > .${ROOT}__content`);
    if (content !== this.#content) {
      this.#scrollAbort?.abort();
      this.#content = content;
      if (content) {
        const abort = new AbortController();
        this.#scrollAbort = abort;
        observeScroll(
          content,
          {
            onScroll: () => {
              this.#syncAtTop();
            },
            onSettle: () => undefined,
          },
          abort.signal,
        );
      }
    }
    // The content and its children: their sizes decide whether the content overflows.
    if (typeof ResizeObserver !== 'undefined') {
      this.#resize ??= new ResizeObserver(() => {
        this.#updateScrolls();
      });
      this.#resize.disconnect();
      if (content) {
        this.#resize.observe(content);
        for (const child of content.children) this.#resize.observe(child);
      }
    }
    this.#updateScrolls();
    this.#syncAtTop();
    this.#render();
  }

  destroy(): void {
    this.#abort.abort();
    this.#resize?.disconnect();
    this.#scrollAbort?.abort();
    this.#drag.destroy();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  /** Overflowing content is a keyboard-focusable scroll region (`tabindex="0"`), as the sheets'. */
  #updateScrolls(): void {
    const content = this.#content;
    if (!content) return;
    if (content.scrollHeight > content.clientHeight) content.setAttribute('tabindex', '0');
    else if (content.getAttribute('tabindex') === '0') content.removeAttribute('tabindex');
  }

  // --- Pulls -------------------------------------------------------------------------------------

  #fromContent(target: EventTarget | null): boolean {
    return target instanceof Node && this.#content?.contains(target) === true;
  }

  #atTop(): boolean {
    return (this.#content?.scrollTop ?? 0) <= 0;
  }

  /** Pulls start only at the top, enabled, not refreshing, not animating (onPre/PostScroll). */
  #canPull(): boolean {
    return this.#enabled && !this.#refreshing && !this.#anim.isRunning && this.#atTop();
  }

  #syncAtTop(): void {
    this.root.toggleAttribute(
      'data-at-top',
      this.#enabled && !this.#refreshing && this.#content !== null && this.#atTop(),
    );
  }

  /** `delta` px down (negative: up), as nested scroll hands it to the pull and the content. */
  #move(delta: number): void {
    const content = this.#content;
    let available = delta;
    // Down: the content scrolls back to its top first (it scrolled if the pull went up past 0).
    if (available > 0 && content && content.scrollTop > 0) {
      const scrolled = Math.min(content.scrollTop, available);
      content.scrollTop -= scrolled;
      available -= scrolled;
    }
    // Up: the pull retracts first (onPreScroll); down at the top: the pull takes it (onPostScroll).
    const consumed = this.#pull.consume(available, this.#refreshing);
    const rest = available - consumed;
    if (rest < 0 && content) content.scrollTop -= rest;
    if (!this.#anim.isRunning) {
      this.#anim.snapTo(this.#pull.distanceFraction);
      this.#render();
    }
  }

  /** onRelease: refresh past the threshold, then animate to hidden (unless refreshing now). */
  #release(allowRefresh: boolean): void {
    if (!this.#pulling) return;
    this.#pulling = false;
    if (allowRefresh && this.#pull.release(this.#refreshing)) this.#options.onRefresh?.();
    if (this.#refreshing) return;
    this.#animateTo(0);
    this.#pull.reset(false);
    this.#syncAtTop();
  }

  // --- Motion ------------------------------------------------------------------------------------

  #thresholdPx(): number {
    const value = Number.parseFloat(getComputedStyle(this.root).getPropertyValue(THRESHOLD));
    // Compose `threshold.roundToPx()`; 80dp (PositionalThreshold) when the token is missing.
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 80;
  }

  #animateTo(target: number): void {
    const now = performance.now();
    const spec = readSpringTokens(getComputedStyle(this.root), STATE_SPRING);
    this.#anim.animateTo(target, spec, now);
    this.#tick(now);
  }

  #tick(now: number): void {
    this.#anim.sample(now);
    const running = this.#anim.isRunning;
    this.root.toggleAttribute('data-animating', running);
    this.#render();
    this.#syncAtTop();
    if (running && this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  #render(): void {
    const root = this.root;
    const fraction = this.#anim.value;
    const refreshing = this.#refreshing;
    if (fraction === 0) root.style.removeProperty('--_m3e-ptr-fraction');
    else root.style.setProperty('--_m3e-ptr-fraction', String(Math.round(fraction * 1e4) / 1e4));
    if (root.getAttribute('style') === '') root.removeAttribute('style');
    root.toggleAttribute('data-pulled', fraction > 0);
    // derivedStateOf { if (progress() >= 1f) MaxAlpha else MinAlpha }
    root.toggleAttribute('data-armed', fraction >= 1);
    root.toggleAttribute('data-refreshing', refreshing);

    const pull = root.querySelector(`.${ROOT}__pull`);
    const busy = root.querySelector(`.${ROOT}__refreshing`);
    // The arrow's semantics exist while it shows progress (progressBarRangeInfo when > 0).
    setAttr(pull, 'aria-hidden', fraction > 0 && !refreshing ? null : 'true');
    setAttr(busy, 'aria-hidden', refreshing ? null : 'true');
    if (pull?.getAttribute('role') === 'progressbar') {
      setAttr(pull, 'aria-valuenow', String(Math.round(Math.min(Math.max(fraction, 0), 1) * 100)));
    }
    const arc = root.querySelector(`.${ROOT}__arc`);
    const head = root.querySelector(`.${ROOT}__head`);
    if (arc || head) {
      const paths = pullToRefreshArrowPaths(pullToRefreshArrowGeometry(fraction));
      setAttr(arc, 'd', paths.arc);
      setAttr(head, 'd', paths.arrow);
    }
    if (fraction !== this.#reported) {
      this.#reported = fraction;
      this.#options.onFraction?.(fraction);
    }
  }
}
