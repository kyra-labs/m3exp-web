import {
  type ButtonGroupItemSize,
  type SpringSpec,
  buttonGroupVisibleCount,
  buttonGroupWidths,
} from '@kyralabs/m3e-motion';
import { Spring, readSpring } from '../menu-popup/menu-popup.js';

const ITEM = '.m3e-button-group__item';
const OVERFLOW = '.m3e-button-group__overflow';
const CONNECTED = 'm3e-button-group--connected';
const OVERFLOWING = 'm3e-button-group--overflow';
const TOGGLE = '[aria-pressed],[aria-checked]';

export interface ButtonGroupLayoutOptions {
  /**
   * Called (synchronously, from `update()` or a resize) whenever the number of leading items that
   * fit changes, for `.m3e-button-group--overflow` groups. The caller hides the other items
   * (`hidden`), shows `.m3e-button-group__overflow` when some are hidden, and lists them in its menu.
   */
  onVisibleCountChange?: ((count: number) => void) | undefined;
}

interface ItemState {
  /** Press animation value: 0 at rest, 1 expanded (Compose EnlargeOnPressNode.pressedAnimatable). */
  press: Spring;
  pressed: boolean;
  /** When the release happened while the item waits to pass the threshold (ms), or null. */
  releasedAt: number | null;
  /** Corner springs: one radius (standard) or the start and end corners (connected). */
  start: Spring | null;
  end: Spring | null;
}

const num = (style: CSSStyleDeclaration, name: string) =>
  Number.parseFloat(style.getPropertyValue(name));
const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `--m3e-comp-button-group-width-spring-*` (fast spatial), or null when its duration is 0. */
function widthSpring(style: CSSStyleDeclaration): SpringSpec | null {
  const prefix = '--m3e-comp-button-group-width-spring';
  if (num(style, `${prefix}-duration`) === 0) return null;
  const dampingRatio = num(style, `${prefix}-damping-ratio`);
  const stiffness = num(style, `${prefix}-stiffness`);
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}

/**
 * The motion and measurement of a rendered `.m3e-button-group` (COMPONENT_SPEC §3), shared by
 * `<m3e-button-group>` and m3e-react's `<ButtonGroup>` so both layers write the same DOM:
 *
 * - **Width on press** (standard groups; Compose `animateWidth` / ButtonGroupMeasurePolicy): an
 *   item whose `data-pressed` appears springs a 0→1 value on `--m3e-comp-button-group-width-spring-*`
 *   (fast spatial); every frame the resting widths go through m3e-motion `buttonGroupWidths` with
 *   `--m3e-comp-button-group-expanded-ratio` and each item's end padding as its compression limit,
 *   written as inline `inline-size` (plus `min-inline-size: 0`). On release the value keeps going
 *   until it passes `--m3e-comp-button-group-release-threshold` (at most
 *   `--m3e-comp-button-group-release-max-wait`), then springs back. A new press retargets from the
 *   current value and velocity.
 * - **Shape**: the corner radius m3e-css resolves for the item's state (`--_m3e-button-shape`, or
 *   `--_m3e-button-group-start` / `-end` in connected groups) is sprung and written inline: the
 *   default effects spring for plain buttons (Button.kt), fast spatial for toggles and radios
 *   (ToggleButton.kt). Items need `data-spring` so m3e-css stops transitioning the radius.
 * - **Overflow** (`.m3e-button-group--overflow`): on resize, the resting widths, the spacing and
 *   the overflow button go through m3e-motion `buttonGroupVisibleCount`; changes are reported to
 *   `onVisibleCountChange`.
 *
 * Reduced motion: spatial springs resolve to 0ms and jump; the default effects press morph falls
 * back to the fast effects spring.
 */
export class ButtonGroupLayout {
  readonly root: HTMLElement;
  #options: ButtonGroupLayoutOptions;
  #items = new Map<HTMLElement, ItemState>();
  #mutations: MutationObserver;
  #resize: ResizeObserver | null = null;
  #frame = 0;
  /** Resting sizes for the running width animation (measured when it starts). */
  #rest: ButtonGroupItemSize[] | null = null;
  #visible = -1;
  #connected: boolean;
  #destroyed = false;
  #listeners = new AbortController();
  /** The item (or overflow button) that holds the tab stop. */
  #current: HTMLElement | null = null;

  constructor(root: HTMLElement, options: ButtonGroupLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.#connected = root.classList.contains(CONNECTED);
    this.#mutations = new MutationObserver((records) => {
      let shapes = false;
      let measure = false;
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (r.type === 'childList') {
          measure = true;
          shapes = true;
        } else if (r.attributeName === 'data-pressed' && el.matches(ITEM)) {
          this.#press(el, el.hasAttribute('data-pressed'));
          shapes = true;
        } else if (el === root && r.attributeName === 'class') {
          measure = true;
          shapes = true;
        } else {
          shapes = true;
        }
      }
      if (measure) this.measure();
      if (shapes) {
        this.#syncShapes();
        this.#syncTabStop();
      }
    });
    this.#mutations.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-pressed',
        'aria-pressed',
        'aria-checked',
        'class',
        'hidden',
        'disabled',
      ],
    });
    const { signal } = this.#listeners;
    root.addEventListener(
      'focusin',
      (e) => {
        const target = (e.target as Element).closest<HTMLElement>(`${ITEM},${OVERFLOW}`);
        if (target?.parentElement === root) {
          this.#current = target;
          this.#syncTabStop();
        }
      },
      { signal },
    );
    root.addEventListener(
      'keydown',
      (e) => {
        this.#onKeyDown(e);
      },
      { signal },
    );
  }

  /** Number of items shown (all of them unless the group overflows). */
  get visibleCount(): number {
    return this.#visible < 0 ? this.#itemElements().length : this.#visible;
  }

  /** Call after (re)rendering the group: re-reads items, shapes and the available width. */
  update(): void {
    if (this.#destroyed) return;
    this.#observeSizes();
    this.measure();
    this.#syncShapes();
    this.#syncTabStop();
  }

  /** Recomputes how many items fit (overflow groups); reports a change. */
  measure(): void {
    const items = this.#itemElements();
    let count = items.length;
    if (this.root.classList.contains(OVERFLOWING) && items.length > 0) {
      if (this.#rest) return; // Mid-animation widths are not resting widths: re-measured on settle.
      const trigger = this.root.querySelector<HTMLElement>(`:scope > ${OVERFLOW}`);
      const revealed = [...items, ...(trigger ? [trigger] : [])].filter((el) => el.hidden);
      for (const el of revealed) el.hidden = false;
      const widths = items.map((el) => el.getBoundingClientRect().width);
      const overflowWidth = trigger?.getBoundingClientRect().width ?? 0;
      const style = getComputedStyle(this.root);
      const spacing = Number.parseFloat(style.columnGap) || 0;
      const available = this.root.clientWidth;
      for (const el of revealed) el.hidden = true;
      count = buttonGroupVisibleCount(widths, spacing, available, overflowWidth);
    }
    if (count !== this.#visible) {
      this.#visible = count;
      this.#options.onVisibleCountChange?.(count);
    }
  }

  destroy(): void {
    this.#destroyed = true;
    this.#listeners.abort();
    this.#mutations.disconnect();
    this.#resize?.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  #itemElements(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(`:scope > ${ITEM}`)];
  }

  #visibleItems(): HTMLElement[] {
    return this.#itemElements().filter((el) => !el.hidden);
  }

  #state(el: HTMLElement): ItemState {
    let state = this.#items.get(el);
    if (!state) {
      state = { press: new Spring(0), pressed: false, releasedAt: null, start: null, end: null };
      this.#items.set(el, state);
    }
    return state;
  }

  #observeSizes(): void {
    this.#resize?.disconnect();
    if (!this.root.classList.contains(OVERFLOWING) || typeof ResizeObserver === 'undefined') {
      this.#resize = null;
      return;
    }
    this.#resize ??= new ResizeObserver(() => {
      this.measure();
    });
    this.#resize.observe(this.root);
    for (const el of this.#itemElements()) this.#resize.observe(el);
  }

  // --- Keyboard: roving tabindex ------------------------------------------------------------

  /** Items and the overflow button that can take focus, in order. */
  #focusables(): HTMLElement[] {
    return [
      ...this.root.querySelectorAll<HTMLElement>(`:scope > :is(${ITEM}, ${OVERFLOW})`),
    ].filter((el) => !el.hidden && !(el as HTMLButtonElement).disabled);
  }

  /**
   * One tab stop (COMPONENT_SPEC §3; m3.material.io: initial focus lands on the first button): the
   * last focused item while it can take focus, else the checked radio, else the first item.
   */
  #syncTabStop(): void {
    const focusables = this.#focusables();
    let stop = this.#current && focusables.includes(this.#current) ? this.#current : null;
    stop ??=
      focusables.find((el) => el.getAttribute('aria-checked') === 'true') ?? focusables[0] ?? null;
    for (const el of this.root.querySelectorAll<HTMLElement>(
      `:scope > :is(${ITEM}, ${OVERFLOW})`,
    )) {
      const value = el === stop ? '0' : '-1';
      if (el.getAttribute('tabindex') !== value) el.setAttribute('tabindex', value);
    }
  }

  /** Arrow keys move focus (mirrored in RTL), Home/End go to the ends; no wrapping. */
  #onKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = (e.target as Element).closest<HTMLElement>(`${ITEM},${OVERFLOW}`);
    if (target?.parentElement !== this.root) return;
    const focusables = this.#focusables();
    const index = focusables.indexOf(target);
    if (index < 0) return;
    const rtl = getComputedStyle(this.root).direction === 'rtl';
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const forward = (e.key === 'ArrowRight') !== rtl;
      next = focusables[index + (forward ? 1 : -1)];
    } else if (e.key === 'Home') {
      next = focusables[0];
    } else if (e.key === 'End') {
      next = focusables.at(-1);
    } else {
      return;
    }
    e.preventDefault();
    if (next && next !== target) next.focus();
  }

  // --- Press: width redistribution ---------------------------------------------------------

  #press(el: HTMLElement, pressed: boolean): void {
    const state = this.#state(el);
    if (state.pressed === pressed) return;
    state.pressed = pressed;
    if (this.#connected) return; // Connected groups only change the pressed item's shape.
    const now = performance.now();
    if (pressed) {
      if (!this.#rest) this.#measureRest();
      state.releasedAt = null;
      state.press.to(1, widthSpring(getComputedStyle(this.root)), now);
    } else {
      state.releasedAt = now;
    }
    this.#schedule();
  }

  /** Resting widths and compression limits (the end padding) of the visible items. */
  #measureRest(): void {
    this.#rest = this.#visibleItems().map((el) => ({
      width: el.getBoundingClientRect().width,
      compressionLimit: Number.parseFloat(getComputedStyle(el).paddingInlineEnd) || 0,
    }));
  }

  // --- Shapes --------------------------------------------------------------------------------

  #syncShapes(): void {
    if (this.#destroyed) return;
    const connected = this.root.classList.contains(CONNECTED);
    if (connected !== this.#connected) {
      this.#connected = connected;
      for (const [el, state] of this.#items) {
        state.start = null;
        state.end = null;
        for (const prop of [
          'border-radius',
          'border-start-start-radius',
          'border-start-end-radius',
          'border-end-start-radius',
          'border-end-end-radius',
        ]) {
          el.style.removeProperty(prop);
        }
      }
    }
    const now = performance.now();
    const trigger = this.root.querySelector<HTMLElement>(`:scope > ${OVERFLOW}`);
    const items = [...this.#itemElements(), ...(trigger ? [trigger] : [])];
    for (const el of this.#items.keys()) if (!items.includes(el)) this.#items.delete(el);
    let moving = false;
    for (const el of items) {
      const state = this.#state(el);
      const style = getComputedStyle(el);
      const isTrigger = el === trigger;
      const corners = connected && !isTrigger;
      // Button.kt / IconButton.kt: default effects ("to prevent any bounce"); toggles fast spatial.
      const token =
        corners || (!isTrigger && el.matches(TOGGLE))
          ? 'fast-spatial'
          : reducedMotion()
            ? 'fast-effects'
            : 'default-effects';
      const spec = readSpring(style, token);
      const retarget = (spring: Spring | null, target: number): Spring => {
        if (!spring) return new Spring(target);
        if (spring.target !== target) spring.to(target, spec, now);
        return spring;
      };
      if (corners) {
        const start = num(style, '--_m3e-button-group-start');
        const end = num(style, '--_m3e-button-group-end');
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
        state.start = retarget(state.start, start);
        state.end = retarget(state.end, end);
      } else {
        state.end = null;
        const resolved = num(style, isTrigger ? '--_m3e-icon-button-shape' : '--_m3e-button-shape');
        if (!Number.isFinite(resolved)) continue;
        // CircleShape: never more than half the smaller side.
        const half = Math.min(el.offsetWidth, el.offsetHeight) / 2;
        state.start = retarget(state.start, half > 0 ? Math.min(resolved, half) : resolved);
      }
      moving ||= state.start.isMoving || (state.end?.isMoving ?? false);
      this.#writeShape(el, state, corners);
    }
    if (moving) this.#schedule();
  }

  #writeShape(el: HTMLElement, state: ItemState, corners: boolean): void {
    if (!state.start) return;
    if (corners && state.end) {
      const start = px(state.start.value);
      const end = px(state.end.value);
      el.style.setProperty('border-start-start-radius', start);
      el.style.setProperty('border-end-start-radius', start);
      el.style.setProperty('border-start-end-radius', end);
      el.style.setProperty('border-end-end-radius', end);
    } else {
      el.style.setProperty('border-radius', px(state.start.value));
    }
  }

  // --- Frame loop ----------------------------------------------------------------------------

  #schedule(): void {
    if (this.#frame === 0 && !this.#destroyed) this.#frame = requestAnimationFrame(this.#tick);
  }

  #tick = (now: number): void => {
    this.#frame = 0;
    const rootStyle = getComputedStyle(this.root);
    const threshold = num(rootStyle, '--m3e-comp-button-group-release-threshold');
    const maxWait = num(rootStyle, '--m3e-comp-button-group-release-max-wait');
    let active = false;
    for (const [el, state] of this.#items) {
      // EnlargeOnPressNode: a released item keeps expanding until it passes the threshold.
      if (state.releasedAt !== null) {
        const waited = now - state.releasedAt;
        if (
          !(state.press.value <= threshold) ||
          !(waited < (Number.isFinite(maxWait) ? maxWait : 0))
        ) {
          state.releasedAt = null;
          state.press.to(0, widthSpring(rootStyle), now);
        } else {
          active = true;
        }
      }
      if (state.press.step(now)) active = true;
      const shapes = [state.start?.step(now), state.end?.step(now)].some(Boolean);
      if (shapes) active = true;
      this.#writeShape(el, state, state.end !== null);
    }
    this.#writeWidths(rootStyle);
    if (active) this.#schedule();
  };

  #writeWidths(rootStyle: CSSStyleDeclaration): void {
    const rest = this.#rest;
    if (!rest) return;
    const items = this.#visibleItems();
    const values = items.map((el) => this.#items.get(el)?.press.value ?? 0);
    const settled = items.every((el) => {
      const state = this.#items.get(el);
      return !state || (state.press.value === 0 && state.releasedAt === null && !state.pressed);
    });
    if (settled || items.length !== rest.length) {
      for (const el of items) {
        el.style.removeProperty('inline-size');
        el.style.removeProperty('min-inline-size');
      }
      this.#rest = null;
      this.measure();
      return;
    }
    const ratio = num(rootStyle, '--m3e-comp-button-group-expanded-ratio') || 0;
    const widths = buttonGroupWidths(rest, values, ratio);
    items.forEach((el, i) => {
      el.style.setProperty('inline-size', px(widths[i]!));
      el.style.setProperty('min-inline-size', '0px');
    });
  }
}
