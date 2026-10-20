import {
  sliderClosestThumb,
  sliderKeyAction,
  sliderKeyValue,
  sliderThumbBounds,
  sliderThumbValue,
  sliderValueAt,
} from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import {
  SLIDER_RANGE_END_LABEL,
  SLIDER_RANGE_START_LABEL,
  SLIDER_TICK_INDEX,
  type SliderScale,
  type SliderSize,
  formatSliderValue,
  sliderClassName,
  sliderInputBounds,
  sliderInputStep,
  sliderPointerFraction,
  sliderScaleSteps,
  sliderStyle,
  sliderTickCount,
} from '../slider-layout/slider-layout.js';

const BLOCK = 'm3e-slider';

let instances = 0;

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

const span = (doc: Document, className: string, hidden = true): HTMLSpanElement => {
  const el = doc.createElement('span');
  el.className = className;
  if (hidden) el.setAttribute('aria-hidden', 'true');
  return el;
};

/** What the track holds; a change rebuilds it. */
interface SliderParts {
  readonly thumbs: number;
  readonly ticks: number;
  readonly icon: string;
}

/**
 * Builds the `.m3e-slider__track` children (m3e-css slider.css) in contract order: the three
 * track parts, the ticks, the inset icon's two copies, then one thumb per value (a range's first
 * is `--start`), each with its native `<input type="range">`, handle and value indicator.
 * m3e-react's `<Slider>` / `<RangeSlider>` render the same DOM.
 * @internal Shared with m3e-react; not part of the public API.
 */
export function renderSliderTrack(track: HTMLElement, parts: SliderParts): HTMLInputElement[] {
  const doc = track.ownerDocument;
  const children: Element[] = [
    span(doc, `${BLOCK}__inactive-start`),
    span(doc, `${BLOCK}__active`),
    span(doc, `${BLOCK}__inactive-end`),
  ];
  if (parts.ticks > 0) {
    const ticks = span(doc, `${BLOCK}__ticks`);
    for (let i = 0; i < parts.ticks; i++) {
      const tick = doc.createElement('span');
      tick.className = `${BLOCK}__tick`;
      tick.style.setProperty(SLIDER_TICK_INDEX, String(i));
      ticks.append(tick);
    }
    children.push(ticks);
  }
  if (parts.icon) {
    for (const modifier of ['', ` ${BLOCK}__icon--inactive`]) {
      const icon = span(doc, `m3e-icon ${BLOCK}__icon${modifier}`);
      icon.textContent = parts.icon;
      children.push(icon);
    }
  }
  const inputs: HTMLInputElement[] = [];
  for (let i = 0; i < parts.thumbs; i++) {
    const thumb = doc.createElement('div');
    thumb.className =
      parts.thumbs > 1 && i === 0 ? `${BLOCK}__thumb ${BLOCK}__thumb--start` : `${BLOCK}__thumb`;
    const input = doc.createElement('input');
    input.className = `${BLOCK}__input`;
    input.type = 'range';
    thumb.append(input, span(doc, `${BLOCK}__handle`), span(doc, `${BLOCK}__value-indicator`));
    children.push(thumb);
    inputs.push(input);
  }
  track.replaceChildren(...children);
  return inputs;
}

/** Detail of `input` / `change`: a slider's value, or a range slider's start and end. */
export type SliderValueDetail = { value: number } | { start: number; end: number };

/**
 * `<m3e-slider label="Volume" value="0.4">` (COMPONENT_SPEC §25): renders the m3e-css slider
 * inside itself (the host is `display: contents`) and adds what CSS cannot do:
 *
 * - Pointer: a press on the track moves the thumb there (a range slider: the closer thumb, Compose's
 *   RangeSliderLogic) and drags it; values snap to the stops; range thumbs meet but never cross.
 * - Keyboard, on each thumb's native `<input type="range">` (its role, value and form name):
 *   arrows by one step (`step`, or 1 % of the range), Shift + arrow and PageUp / PageDown by a
 *   page, Home / End to the thumb's bounds; horizontal arrows mirror in RTL, and a vertical
 *   slider has its minimum at the bottom (owner decision M8 #21). Shared with m3e-react through
 *   m3e-motion's slider math and the slider-layout entry.
 * - `[data-dragging]` on the dragged thumb (its handle halves and the value indicator shows; keyboard
 *   focus does the same through `:focus-visible`).
 * - Events: `input` while the value changes and `change` when a drag, press or key ends
 *   (Compose's onValueChangeFinished), both `CustomEvent`s with `detail: { value }` or, for a range,
 *   `{ start, end }`.
 *
 * Attributes: `min` (0), `max` (1), `step` (absent or 0: continuous), `value`; `range` with
 * `start-value` / `end-value` (the thumbs are labelled `start-label` / `end-label`, default
 * "Range start" / "Range end" as Compose); `variant` (`standard` | `centered`), `orientation`
 * (`horizontal` | `vertical`; set a vertical slider's block-size), the deprecated booleans
 * `centered` and `vertical` (since 1.8, removed in 2.0; `variant` / `orientation` win), `size` (xs, s, m, l, xl), `icon` (an inset Material Symbols icon,
 * standard M / L / XL), `disabled`, `label` (the accessible name), `name`.
 */
export class M3eSlider extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    value: { type: Number },
    range: { type: Boolean },
    startValue: { type: Number },
    endValue: { type: Number },
    variant: {},
    orientation: {},
    centered: { type: Boolean },
    vertical: { type: Boolean },
    disabled: { type: Boolean },
    size: {},
    label: {},
    startLabel: {},
    endLabel: {},
    icon: {},
    name: {},
  }))();

  declare min: number | null | undefined;
  declare max: number | null | undefined;
  declare step: number | null | undefined;
  declare value: number | null | undefined;
  declare range: boolean | undefined;
  declare startValue: number | null | undefined;
  declare endValue: number | null | undefined;
  /** `standard` (default) | `centered` (React's `variant`). */
  declare variant: 'standard' | 'centered' | null | undefined;
  /** `horizontal` (default) | `vertical` (set its block-size). */
  declare orientation: 'horizontal' | 'vertical' | null | undefined;
  /**
   * A centered slider.
   * @deprecated Since 1.8: use `variant="centered"`. Removed in 2.0.
   */
  declare centered: boolean | undefined;
  /**
   * A vertical slider.
   * @deprecated Since 1.8: use `orientation="vertical"`. Removed in 2.0.
   */
  declare vertical: boolean | undefined;
  declare disabled: boolean | undefined;
  declare size: string | null | undefined;
  declare label: string | null | undefined;
  declare startLabel: string | null | undefined;
  declare endLabel: string | null | undefined;
  declare icon: string | null | undefined;
  declare name: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #track: HTMLDivElement | undefined;
  #inputs: HTMLInputElement[] = [];
  #parts = '';
  #values: number[] = [];
  #id = `${BLOCK}-${String(++instances)}`;
  /** The thumb a pointer drags, its pointer, and the values when it started. */
  #drag: { index: number; pointer: number; from: readonly number[] } | undefined;
  /** Values before the key that is down (for `change` on key up). */
  #keyFrom: readonly number[] | undefined;
  #listening = false;

  /** The rendered `.m3e-slider`. */
  get sliderElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** The native inputs (one per thumb). */
  get inputs(): readonly HTMLInputElement[] {
    return this.#inputs;
  }

  /** The thumb values (one, or a range's start and end). */
  get values(): readonly number[] {
    return this.#values;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#listening = false;
    this.#drag = undefined;
  }

  // The new attributes win; `centered` / `vertical` are the deprecated 1.x aliases (D16).
  #centered(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return this.variant ? this.variant === 'centered' : Boolean(this.centered);
  }

  #vertical(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return this.orientation ? this.orientation === 'vertical' : Boolean(this.vertical);
  }

  #scale(): SliderScale {
    const min = this.min ?? 0;
    const max = this.max ?? 1;
    return { min, max: max > min ? max : min, step: this.step ?? undefined };
  }

  /** Values from the attributes: coerced (a range's in order) and snapped to the stops. */
  #valuesFromProperties(scale: SliderScale): number[] {
    const { min, max } = scale;
    const steps = sliderScaleSteps(scale);
    const fit = (v: number, lo: number, hi: number) =>
      sliderThumbValue(Number.isFinite(v) ? v : lo, { min: lo, max: hi }, steps, min, max);
    if (!this.range) return [fit(this.value ?? min, min, max)];
    const a = fit(this.startValue ?? min, min, max);
    const b = fit(this.endValue ?? max, min, max);
    return [Math.min(a, b), Math.max(a, b)];
  }

  protected override update(changed: ReadonlySet<string>): void {
    const doc = this.ownerDocument;
    const root = (this.#root ??= doc.createElement('div'));
    const track = (this.#track ??= doc.createElement('div'));
    if (track.parentNode !== root) {
      track.className = `${BLOCK}__track`;
      root.replaceChildren(track);
    }
    if (root.parentNode !== this || this.childNodes.length !== 1) this.replaceChildren(root);
    const scale = this.#scale();
    const valueProps = ['min', 'max', 'step', 'value', 'range', 'startValue', 'endValue'];
    if (this.#values.length === 0 || valueProps.some((p) => changed.has(p))) {
      this.#values = this.#valuesFromProperties(scale);
    }
    const icon = this.icon ?? '';
    const parts = { thumbs: this.#values.length, ticks: sliderTickCount(scale), icon };
    const key = `${String(parts.thumbs)}|${String(parts.ticks)}|${icon}`;
    if (key !== this.#parts) {
      this.#parts = key;
      this.#inputs = renderSliderTrack(track, parts);
    }
    root.className = sliderClassName({
      size: (this.size ?? undefined) as SliderSize | undefined,
      range: this.range,
      centered: this.#centered(),
      vertical: this.#vertical(),
    });
    root.id = this.#id;
    setAttr(root, 'role', 'group');
    setAttr(root, 'aria-label', this.label ?? null);
    this.#listen(track);
    this.#sync();
  }

  /** Writes the values: the custom properties, each input and value indicator. */
  #sync(): void {
    const root = this.#root;
    if (!root) return;
    const scale = this.#scale();
    const values = this.#values;
    const style = sliderStyle(values, scale);
    for (const name of [
      '--m3e-comp-slider-value',
      '--m3e-comp-slider-start-value',
      '--m3e-comp-slider-steps',
    ]) {
      const v = style[name];
      if (v === undefined) root.style.removeProperty(name);
      else root.style.setProperty(name, v);
    }
    const locale = this.#locale();
    const step = String(sliderInputStep(scale));
    const disabled = this.disabled ?? false;
    const range = values.length > 1;
    this.#inputs.forEach((input, i) => {
      const value = values[i] ?? scale.min;
      const bounds = sliderInputBounds(values, i, scale);
      const text = formatSliderValue(value, locale);
      const id = `${this.#id}-${String(i)}`;
      input.id = id;
      // As React Aria's useSliderThumb: labelled by the group (after itself when it has a label).
      const label = range
        ? i === 0
          ? (this.startLabel ?? SLIDER_RANGE_START_LABEL)
          : (this.endLabel ?? SLIDER_RANGE_END_LABEL)
        : null;
      setAttr(input, 'aria-label', label);
      setAttr(input, 'aria-labelledby', label ? `${id} ${this.#id}` : this.#id);
      setAttr(input, 'min', String(bounds.min));
      setAttr(input, 'max', String(bounds.max));
      setAttr(input, 'step', step);
      setAttr(input, 'value', String(value));
      input.value = String(value);
      setAttr(input, 'aria-orientation', this.#vertical() ? 'vertical' : 'horizontal');
      setAttr(input, 'aria-valuetext', text);
      setAttr(input, 'name', this.name ?? null);
      input.disabled = disabled;
      setAttr(input, 'tabindex', disabled ? null : '0');
      const indicator = input.parentElement?.querySelector(`.${BLOCK}__value-indicator`);
      if (indicator && indicator.textContent !== text) indicator.textContent = text;
    });
  }

  #locale(): string {
    const lang = this.closest('[lang]')?.getAttribute('lang');
    if (lang) return lang;
    const nav = typeof navigator === 'undefined' ? '' : navigator.language;
    return nav ? nav : 'en-US';
  }

  #rtl(): boolean {
    return this.#root ? getComputedStyle(this.#root).direction === 'rtl' : false;
  }

  /** Sets thumb `index` (coerced to its bounds and snapped); returns whether it changed. */
  #set(index: number, requested: number): boolean {
    const scale = this.#scale();
    const values = [...this.#values];
    const steps = sliderScaleSteps(scale);
    const bounds = sliderThumbBounds(values, index, scale.min, scale.max);
    const next = sliderThumbValue(requested, bounds, steps, scale.min, scale.max);
    if (next === values[index]) return false;
    values[index] = next;
    this.#values = values;
    if (values.length > 1) {
      this.startValue = values[0];
      this.endValue = values[1];
    } else {
      this.value = next;
    }
    this.#sync();
    return true;
  }

  #detail(): SliderValueDetail {
    const [first = 0, second] = this.#values;
    return second === undefined ? { value: first } : { start: first, end: second };
  }

  #emitChange(from: readonly number[] | undefined): void {
    if (from?.some((v, i) => v !== this.#values[i])) this.emit('change', this.#detail());
  }

  #indexOf(target: EventTarget | null): number {
    return this.#inputs.findIndex((input) => input === target);
  }

  #listen(track: HTMLDivElement): void {
    if (this.#listening) return;
    this.#listening = true;
    this.listen(track, 'pointerdown', (e) => {
      if (this.disabled || this.#drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const scale = this.#scale();
      const fraction = sliderPointerFraction(
        track.getBoundingClientRect(),
        e.clientX,
        e.clientY,
        this.#vertical(),
        this.#rtl(),
      );
      const target = sliderValueAt(fraction, scale.min, scale.max);
      const index = sliderClosestThumb(this.#values, target);
      e.preventDefault();
      this.#drag = { index, pointer: e.pointerId, from: [...this.#values] };
      track.setPointerCapture(e.pointerId);
      // A pointer focus is not a keyboard one: no ring, no focus-visible handle (decision M8 #17).
      this.#inputs[index]?.focus({ preventScroll: true, focusVisible: false });
      this.#dragging(index, true);
      if (this.#set(index, target)) this.emit('input', this.#detail());
    });
    this.listen(track, 'pointermove', (e) => {
      const drag = this.#drag;
      if (drag?.pointer !== e.pointerId) return;
      const scale = this.#scale();
      const fraction = sliderPointerFraction(
        track.getBoundingClientRect(),
        e.clientX,
        e.clientY,
        this.#vertical(),
        this.#rtl(),
      );
      if (this.#set(drag.index, sliderValueAt(fraction, scale.min, scale.max))) {
        this.emit('input', this.#detail());
      }
    });
    const end = (e: PointerEvent) => {
      const drag = this.#drag;
      if (drag?.pointer !== e.pointerId) return;
      this.#drag = undefined;
      this.#dragging(drag.index, false);
      this.#emitChange(drag.from);
    };
    this.listen(track, 'pointerup', end);
    this.listen(track, 'pointercancel', end);
    this.listen(track, 'lostpointercapture', end);
    this.listen(track, 'keydown', (e) => {
      const index = this.#indexOf(e.target);
      if (index < 0 || this.disabled) return;
      const action = sliderKeyAction(e.key, {
        vertical: this.#vertical(),
        rtl: this.#rtl(),
        shiftKey: e.shiftKey,
      });
      if (!action) return;
      e.preventDefault();
      this.#keyFrom ??= [...this.#values];
      const scale = this.#scale();
      const next = sliderKeyValue(
        action,
        this.#values,
        index,
        sliderScaleSteps(scale),
        scale.min,
        scale.max,
      );
      if (this.#set(index, next)) this.emit('input', this.#detail());
    });
    this.listen(track, 'keyup', () => {
      const from = this.#keyFrom;
      this.#keyFrom = undefined;
      this.#emitChange(from);
    });
    // A value set on the input itself (assistive technology): take it, and re-emit the events as
    // this element's (the native ones stop here).
    this.listen(track, 'input', (e) => {
      const index = this.#indexOf(e.target);
      if (index < 0) return;
      e.stopPropagation();
      const from = [...this.#values];
      if (this.#set(index, Number((e.target as HTMLInputElement).value))) {
        this.emit('input', this.#detail());
        this.#emitChange(from);
      }
    });
    this.listen(track, 'change', (e) => {
      if (this.#indexOf(e.target) >= 0) e.stopPropagation();
    });
  }

  #dragging(index: number, on: boolean): void {
    const thumb = this.#inputs[index]?.parentElement;
    if (thumb) setAttr(thumb, 'data-dragging', on ? '' : null);
  }
}

/** Events of `<m3e-slider>` (M1): typed `addEventListener` / `removeEventListener`. */
// Native `input` is an InputEvent; the slider's is a CustomEvent (the inputs' native ones stop inside).
export interface M3eSliderEventMap extends Omit<HTMLElementEventMap, 'input'> {
  /** While the value changes (the inputs' native `input` stops at the slider). */
  input: CustomEvent<SliderValueDetail>;
  /** When a drag, press or key ends (Compose onValueChangeFinished). */
  change: CustomEvent<SliderValueDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eSlider {
  addEventListener<K extends keyof M3eSliderEventMap>(
    type: K,
    listener: (this: M3eSlider, ev: M3eSliderEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eSliderEventMap>(
    type: K,
    listener: (this: M3eSlider, ev: M3eSliderEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
