import { Spring, readSpring } from '../base/spring.js';

// Compose SnackbarHostState / SnackbarHost / FadeInFadeOutWithScale (SnackbarHost.kt@19991f2c),
// shared by <m3e-snackbar-host> and m3e-react's <SnackbarHost>.

/** SnackbarDuration. */
export type SnackbarDuration = 'short' | 'long' | 'indefinite';

/** SnackbarResult: the snackbar was dismissed (timeout, the dismiss action, Escape) or acted on. */
export type SnackbarResult = 'dismissed' | 'action-performed';

/** SnackbarVisuals, as passed to `showSnackbar`. */
export interface SnackbarVisuals {
  /** The text. */
  message: string;
  /** The label of the action (a text button). */
  actionLabel?: string | null | undefined;
  /** Shows the dismiss (close) icon button. Recommended with `indefinite` (Compose). */
  withDismissAction?: boolean | undefined;
  /**
   * How long it stays: `short` (4s) without an action, `indefinite` with one (Compose's
   * defaults; m3.material.io: actionable snackbars should not time out); or `long` (10s).
   */
  duration?: SnackbarDuration | undefined;
}

export interface ShowSnackbarOptions extends SnackbarVisuals {
  /**
   * Cancels the call (Compose: cancelling the caller's coroutine): the snackbar leaves the queue,
   * or the screen if it is showing, and the promise rejects with the signal's reason.
   */
  signal?: AbortSignal | undefined;
}

/** SnackbarData: one snackbar of the queue. */
export interface SnackbarData {
  readonly visuals: Readonly<{
    message: string;
    actionLabel: string | null;
    withDismissAction: boolean;
    duration: SnackbarDuration;
  }>;
  /** The action was pressed: resolves `showSnackbar` with `action-performed`. */
  performAction(): void;
  /** Resolves `showSnackbar` with `dismissed` (timeout, the dismiss action, Escape). */
  dismiss(): void;
}

/** The signal's reason as an Error (the default reason is an AbortError DOMException). */
const abortReason = (signal: AbortSignal): Error =>
  signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason));

interface Entry {
  data: SnackbarData;
  settle: (result: SnackbarResult) => void;
  reject: (reason: Error) => void;
  done: boolean;
}

/**
 * SnackbarHostState: shows at most one snackbar at a time. `showSnackbar` queues the snackbar
 * (first in, first out, as Compose's fair Mutex) and resolves once it has been addressed;
 * `currentSnackbarData` is the one showing. A host (`<m3e-snackbar-host>`, m3e-react's
 * `<SnackbarHost>`) renders it and dismisses it after its duration.
 */
export class SnackbarHostState {
  #queue: Entry[] = [];
  #current: Entry | null = null;
  #listeners = new Set<() => void>();

  /** The snackbar being shown, or null. */
  get currentSnackbarData(): SnackbarData | null {
    return this.#current?.data ?? null;
  }

  /**
   * Moves keyboard focus to the current snackbar's action (or dismiss button) in the host showing
   * this state. Nothing moves focus to a snackbar on its own (m3.material.io): bind this to a
   * shortcut of your app so keyboard users can reach actionable snackbars. Returns whether it did.
   */
  focus(options?: FocusOptions): boolean {
    for (const host of [...this.#hosts]) if (host(options)) return true;
    return false;
  }

  /** For hosts (SnackbarHostController): registers what `focus()` calls. Returns the unregister. */
  attachHost(focus: (options?: FocusOptions) => boolean): () => void {
    this.#hosts.add(focus);
    return () => {
      this.#hosts.delete(focus);
    };
  }

  #hosts = new Set<(options?: FocusOptions) => boolean>();

  /** Calls `listener` whenever `currentSnackbarData` changes. Returns the unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /**
   * Shows `message` (or the visuals) once the snackbars before it have been addressed. Resolves
   * with `action-performed` when the action was pressed, else `dismissed`.
   */
  showSnackbar(visuals: string | ShowSnackbarOptions): Promise<SnackbarResult> {
    const options: ShowSnackbarOptions =
      typeof visuals === 'string' ? { message: visuals } : visuals;
    const { signal } = options;
    if (signal?.aborted) return Promise.reject(abortReason(signal));
    const actionLabel = options.actionLabel ?? null;
    const normalized = Object.freeze({
      message: options.message,
      actionLabel,
      withDismissAction: Boolean(options.withDismissAction),
      // showSnackbar: Short without an action label, Indefinite with one.
      duration: options.duration ?? (actionLabel === null ? 'short' : 'indefinite'),
    });
    return new Promise<SnackbarResult>((resolve, reject) => {
      const entry: Entry = {
        done: false,
        settle: (result) => {
          if (entry.done) return;
          entry.done = true;
          signal?.removeEventListener('abort', onAbort);
          resolve(result);
          this.#release(entry);
        },
        reject: (reason) => {
          if (entry.done) return;
          entry.done = true;
          reject(reason);
          this.#release(entry);
        },
        data: {
          visuals: normalized,
          // Only the first call counts (Compose: continuation.isActive).
          performAction: () => {
            entry.settle('action-performed');
          },
          dismiss: () => {
            entry.settle('dismissed');
          },
        },
      };
      const onAbort = () => {
        if (signal) entry.reject(abortReason(signal));
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      this.#queue.push(entry);
      if (!this.#current) this.#next();
    });
  }

  #release(entry: Entry): void {
    const queued = this.#queue.indexOf(entry);
    if (queued >= 0) this.#queue.splice(queued, 1);
    if (this.#current === entry) {
      this.#current = null;
      this.#next();
    }
  }

  #next(): void {
    this.#current = this.#queue.shift() ?? null;
    for (const listener of [...this.#listeners]) listener();
  }
}

/** What a timeout counts (Android AccessibilityManager.calculateRecommendedTimeoutMillis flags). */
export interface SnackbarTimeoutContent {
  containsIcons: boolean;
  containsText: boolean;
  containsControls: boolean;
}

/**
 * Android's `calculateRecommendedTimeoutMillis` (the user's accessibility timeout setting):
 * returns the time to use for `originalMillis`. The web has no such setting; apps that keep one
 * pass it here. Default: `originalMillis`.
 */
export type RecommendedTimeout = (
  originalMillis: number,
  content: SnackbarTimeoutContent,
) => number;

/** A `<time>` custom property in ms (minifiers may rewrite `4000ms` as `4s`). */
function readMillis(style: CSSStyleDeclaration | null, name: string): number {
  const raw = style?.getPropertyValue(name) ?? '';
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return Number.NaN;
  return /[^m]s\s*$/.test(raw) ? value * 1000 : value;
}

/** Compose's SnackbarDuration.toMillis without a platform timeout (SnackbarHost.kt L298–317). */
const FALLBACK_MILLIS: Readonly<Record<'short' | 'long', number>> = { short: 4000, long: 10000 };

/**
 * SnackbarDuration.toMillis: `--m3e-comp-snackbar-duration-short` / `-long` (4000 / 10000ms) or
 * Infinity for `indefinite`, then `recommended` (containsIcons, containsText, containsControls =
 * has an action, as Compose asks it).
 */
export function snackbarDurationMillis(
  data: SnackbarData,
  style: CSSStyleDeclaration | null,
  recommended?: RecommendedTimeout,
): number {
  const { duration, actionLabel } = data.visuals;
  let millis = Number.POSITIVE_INFINITY;
  if (duration !== 'indefinite') {
    const read = readMillis(style, `--m3e-comp-snackbar-duration-${duration}`);
    millis = Number.isFinite(read) ? read : FALLBACK_MILLIS[duration];
  }
  if (!recommended) return millis;
  return recommended(millis, {
    containsIcons: true,
    containsText: true,
    containsControls: actionLabel !== null,
  });
}

/** Compose `Strings.SnackbarDismiss` (material3 res strings.xml `m3c_snackbar_dismiss`). */
export const SNACKBAR_DISMISS_LABEL = 'Dismiss';

const FOCUSABLE = 'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

interface Item {
  data: SnackbarData;
  scale: Spring;
  opacity: Spring;
  visible: boolean;
  onRemoved: (() => void) | null;
}

export interface SnackbarHostControllerOptions {
  state: SnackbarHostState;
  /** See {@link RecommendedTimeout}. */
  recommendedTimeout?: RecommendedTimeout | undefined;
}

/**
 * SnackbarHost behavior for a rendered `.m3e-snackbar-host`, shared by `<m3e-snackbar-host>` and
 * m3e-react's `<SnackbarHost>` (the layer renders one `.m3e-snackbar-host__item` per snackbar):
 *
 * - `enter(item, data)`: the item fades in on the fast effects spring and scales from
 *   `--m3e-comp-snackbar-closed-scale` on the fast spatial spring (FadeInFadeOutWithScale;
 *   interruptible); `exit(item, onRemoved)` reverses it and calls `onRemoved` once the fade ends.
 *   Writes `data-driven`, `--_m3e-snackbar-scale` and `--_m3e-snackbar-opacity` on the item.
 * - The current snackbar is dismissed after its duration (from when it shows), paused while the
 *   pointer is over the host or focus is in it (owner decision M9 #20: the web stand-in for
 *   Android's accessibility timeout; Compose does not pause).
 * - Escape in the current snackbar dismisses it (m3.material.io). Focus never moves to a snackbar
 *   on its own; `focus()` moves it to the current one's first control (owner decision M9 #20), and
 *   when a focused snackbar leaves, focus returns to where it came from.
 */
export class SnackbarHostController {
  readonly host: HTMLElement;
  readonly state: SnackbarHostState;
  recommendedTimeout: RecommendedTimeout | undefined;
  #items = new Map<HTMLElement, Item>();
  #current: HTMLElement | null = null;
  #frame = 0;
  #listeners = new AbortController();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #timed: SnackbarData | null = null;
  #remaining = 0;
  #startedAt = 0;
  #hovered = false;
  #focused = false;
  #returnFocus: HTMLElement | null = null;

  constructor(host: HTMLElement, options: SnackbarHostControllerOptions) {
    this.host = host;
    this.state = options.state;
    this.recommendedTimeout = options.recommendedTimeout;
    const opts = { signal: this.#listeners.signal };
    host.addEventListener(
      'pointerover',
      () => {
        this.#setHovered(true);
      },
      opts,
    );
    host.addEventListener(
      'pointerout',
      (e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !host.contains(next)) this.#setHovered(false);
      },
      opts,
    );
    host.addEventListener(
      'focusin',
      (e) => {
        const from = e.relatedTarget as HTMLElement | null;
        if (from && !host.contains(from)) this.#returnFocus = from;
        this.#setFocused(true);
      },
      opts,
    );
    host.addEventListener(
      'focusout',
      (e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !host.contains(next)) this.#setFocused(false);
      },
      opts,
    );
    host.addEventListener('keydown', this.#onKeyDown, opts);
    this.#detach = this.state.attachHost((o) => this.focus(o));
  }

  #detach: () => void;

  /** The current snackbar's item, if shown. */
  get currentItem(): HTMLElement | null {
    return this.#current;
  }

  /** Whether the auto-dismiss timer is paused (pointer over the host, or focus in it). */
  get isPaused(): boolean {
    return this.#hovered || this.#focused;
  }

  /** A rendered item shows `data` (the current snackbar): springs it in and starts its timer. */
  enter(item: HTMLElement, data: SnackbarData): void {
    // Driven before its style is first resolved, so the CSS-only @starting-style transition never
    // starts under the springs.
    if (!this.#items.has(item)) item.setAttribute('data-driven', '');
    const style = getComputedStyle(item);
    let entry = this.#items.get(item);
    if (!entry) {
      entry = {
        data,
        scale: new Spring(this.#closed(style, 'scale')),
        opacity: new Spring(this.#closed(style, 'opacity')),
        visible: true,
        onRemoved: null,
      };
      this.#items.set(item, entry);
    }
    entry.visible = true;
    entry.onRemoved = null;
    this.#current = item;
    this.#animate(entry, 1, 1, style);
    this.#startTimer(data);
  }

  /** The item's snackbar is no longer current: springs it out, then calls `onRemoved`. */
  exit(item: HTMLElement, onRemoved: () => void): void {
    const entry = this.#items.get(item);
    if (this.#current === item) this.#current = null;
    if (entry?.data === this.#timed) this.#stopTimer();
    this.#restoreFocus(item);
    if (!entry) {
      onRemoved();
      return;
    }
    entry.visible = false;
    entry.onRemoved = onRemoved;
    const style = getComputedStyle(item);
    this.#animate(entry, this.#closed(style, 'scale'), this.#closed(style, 'opacity'), style);
  }

  /** Moves focus to the current snackbar's first control. Returns whether it did. */
  focus(options?: FocusOptions): boolean {
    const target = this.#current?.querySelector<HTMLElement>(FOCUSABLE);
    if (!target) return false;
    target.focus(options);
    return true;
  }

  /** Stops the timer, the springs and the listeners. */
  destroy(): void {
    this.#stopTimer();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#listeners.abort();
    this.#detach();
    this.#items.clear();
    this.#current = null;
  }

  // --- Timer -----------------------------------------------------------------------------------

  #startTimer(data: SnackbarData): void {
    if (this.#timed === data) return;
    this.#stopTimer();
    this.#timed = data;
    this.#remaining = snackbarDurationMillis(
      data,
      getComputedStyle(this.host),
      this.recommendedTimeout,
    );
    if (!this.isPaused) this.#run();
  }

  #run(): void {
    if (!this.#timed || !Number.isFinite(this.#remaining)) return;
    const data = this.#timed;
    this.#startedAt = performance.now();
    this.#timer = setTimeout(
      () => {
        this.#timer = undefined;
        data.dismiss();
      },
      Math.max(0, this.#remaining),
    );
  }

  #pause(): void {
    if (this.#timer === undefined) return;
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#remaining -= performance.now() - this.#startedAt;
  }

  #stopTimer(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#timed = null;
  }

  #setHovered(hovered: boolean): void {
    if (hovered === this.#hovered) return;
    this.#hovered = hovered;
    this.#onPauseChange();
  }

  #setFocused(focused: boolean): void {
    if (focused === this.#focused) return;
    this.#focused = focused;
    this.#onPauseChange();
  }

  #onPauseChange(): void {
    if (this.isPaused) this.#pause();
    else if (this.#timer === undefined) this.#run();
  }

  // --- Keyboard and focus ----------------------------------------------------------------------

  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const item = this.#current;
    const data = item ? this.#items.get(item)?.data : undefined;
    if (!item || !data || !item.contains(e.target as Node)) return;
    e.preventDefault();
    e.stopPropagation();
    data.dismiss();
  };

  /** A focused snackbar leaves: focus goes back to where it came from. */
  #restoreFocus(item: HTMLElement): void {
    const active = item.ownerDocument.activeElement;
    if (!active || !item.contains(active)) return;
    const back = this.#returnFocus;
    this.#returnFocus = null;
    if (back?.isConnected) back.focus({ preventScroll: true });
    else (active as HTMLElement).blur();
  }

  // --- Motion ----------------------------------------------------------------------------------

  #closed(style: CSSStyleDeclaration, which: 'scale' | 'opacity'): number {
    const value = Number.parseFloat(style.getPropertyValue(`--m3e-comp-snackbar-closed-${which}`));
    return Number.isFinite(value) ? value : which === 'scale' ? 0.8 : 0;
  }

  #animate(entry: Item, scale: number, opacity: number, style: CSSStyleDeclaration): void {
    const now = performance.now();
    // FadeInFadeOutWithScale: scale on FastSpatial, alpha on FastEffects.
    entry.scale.to(scale, readSpring(style, 'fast-spatial'), now);
    entry.opacity.to(opacity, readSpring(style, 'fast-effects'), now);
    this.#writeAll();
    this.#settle();
    if (this.#frame === 0 && this.#moving()) this.#frame = requestAnimationFrame(this.#tick);
  }

  #moving(): boolean {
    for (const entry of this.#items.values()) {
      if (entry.scale.isMoving || entry.opacity.isMoving) return true;
    }
    return false;
  }

  #tick = (now: number): void => {
    this.#frame = 0;
    for (const entry of this.#items.values()) {
      entry.scale.step(now);
      entry.opacity.step(now);
    }
    this.#writeAll();
    this.#settle();
    if (this.#moving()) this.#frame = requestAnimationFrame(this.#tick);
  };

  /** Removes the items whose fade-out ended (onAnimationFinish). */
  #settle(): void {
    for (const [item, entry] of [...this.#items]) {
      if (entry.visible || entry.opacity.isMoving) continue;
      this.#items.delete(item);
      const done = entry.onRemoved;
      entry.onRemoved = null;
      done?.();
      // A node removed under the pointer gets no pointerout: ask the host again once the layer
      // has removed it (React commits later).
      if (this.#hovered) {
        requestAnimationFrame(() => {
          if (this.#hovered) this.#setHovered(this.#matchesHover());
        });
      }
    }
  }

  #matchesHover(): boolean {
    try {
      return this.host.matches(':hover');
    } catch {
      return false;
    }
  }

  #writeAll(): void {
    const round = (v: number) => String(Math.round(v * 1e4) / 1e4);
    for (const [item, entry] of this.#items) {
      item.style.setProperty('--_m3e-snackbar-scale', round(entry.scale.value));
      item.style.setProperty('--_m3e-snackbar-opacity', round(entry.opacity.value));
    }
  }
}
