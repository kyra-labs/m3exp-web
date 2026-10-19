import {
  ClockDialModel,
  SpringAnimatable,
  TIME_PICKER_CLOCK_DIAL_SIZE,
  TIME_PICKER_EXTRA_HOURS,
  TIME_PICKER_HOURS,
  TIME_PICKER_INNER_RATIO,
  TIME_PICKER_LABEL_SIZE as ITEM,
  TIME_PICKER_MAX_DISTANCE,
  TIME_PICKER_MINUTES,
  TIME_PICKER_OUTER_RATIO,
  type TimePickerSelection,
  clockDialIsSelectedValue,
  clockDialItemOffset,
  timePickerAtan,
} from '@kyralabs/m3e-motion';
import { DRAG_SLOP } from '../base/drag.js';
import { attachRipple } from '../base/ripple.js';
import { readSpringTokens } from '../base/scroll.js';
import {
  TimePickerBase,
  type TimePickerBaseOptions,
  el,
  localNumber,
  numberDescription,
  setAttr,
  setText,
} from './shared.js';

export type TimePickerLayoutType = 'auto' | 'vertical' | 'horizontal';

export interface TimePickerLayoutOptions extends TimePickerBaseOptions {
  /**
   * Compose's TimePickerLayoutType. `auto` (default) follows TimePickerDefaults.layoutType():
   * horizontal when the window is wider than tall (TimePicker.android.kt; owner decision M10 T6).
   */
  layout?: TimePickerLayoutType;
}

const ROOT = 'm3e-time-picker';
const SELECTOR_SPRING = '--m3e-comp-time-picker-selector';
const AUTO_SWITCH_DELAY = '--m3e-comp-time-picker-auto-switch-delay';

interface Label {
  value: number;
  /** The radio. */
  el: HTMLElement;
  /** Its copy in the highlight. */
  copy: HTMLElement;
}

interface Face {
  /** The radiogroup of labels. */
  el: HTMLElement;
  /** Its copy in the highlight. */
  copy: HTMLElement;
  /** Outer circle first. */
  labels: Label[];
}

interface Selector {
  selection: TimePickerSelection;
  el: HTMLButtonElement;
  value: HTMLElement;
}

/**
 * Behavior of a `.m3e-time-picker` (COMPONENT_SPEC §28; Compose TimePicker), shared by
 * `<m3e-time-picker>` and m3e-react's `<TimePicker>`: it builds the m3e-css DOM inside the root
 * and keeps it in sync, so both layers write one DOM contract.
 *
 * - The display: the hour / minute selectors (radios; activating one picks what the dial sets
 *   and, from the keyboard, moves focus to the dial's selected label as Compose's
 *   isDialFocusable does) and, 12-hour, the AM/PM toggle.
 * - The dial: m3e-motion's port of AnalogTimePickerState. A tap (ClockDialNode's
 *   detectTapGestures) snaps to an hour / five minutes and animates the selector on the
 *   selector spring (DefaultSpatial; jumps under reduced motion); a drag past the slop follows
 *   the pointer and settles at its end. After a pointer tap or drag on the hours it switches to
 *   the minutes (100ms later for a tap). Keyboard and assistive-technology activation never
 *   switch (owner decision M10 T8).
 * - Keyboard (owner decision M10 T4, Compose's ClockText): the dial's selected label is its tab
 *   stop; the arrow keys move around the dial (looping, through the 24-hour inner circle);
 *   Enter / Space pick the focused label at once.
 * - The hour / minute faces cross-fade (CSS); the selector position is written as
 *   `--_m3e-time-picker-cos` / `-sin`, the label positions likewise.
 */
export class TimePickerLayout extends TimePickerBase<TimePickerLayoutOptions> {
  #dial: ClockDialModel;
  #anim: SpringAnimatable;
  #frame = 0;
  #switchTimer = 0;
  #display!: HTMLElement;
  #fields!: HTMLElement;
  #selectors!: [Selector, Selector];
  #separator!: HTMLElement;
  #dialEl!: HTMLElement;
  #highlight!: HTMLElement;
  #faces: Record<TimePickerSelection, Face> | null = null;
  #landscape: MediaQueryList | null = null;
  #press: { x: number; y: number; id: number; dragging: boolean } | null = null;

  constructor(root: HTMLElement, options: TimePickerLayoutOptions = {}) {
    super(root, options);
    this.#dial = new ClockDialModel(this.model);
    this.#anim = new SpringAnimatable(this.#dial.value);
    this.#build();
    if (typeof matchMedia === 'function') {
      this.#landscape = matchMedia('(orientation: landscape)');
      this.#landscape.addEventListener(
        'change',
        () => {
          this.render();
        },
        { signal: this.abort.signal },
      );
    }
    this.render(true);
  }

  override destroy(): void {
    super.destroy();
    cancelAnimationFrame(this.#frame);
    clearTimeout(this.#switchTimer);
  }

  protected override setTime(hour: number, minute: number): void {
    // AnalogTimePickerState's hourInput / minuteInput overrides: the selector jumps there.
    this.#dial.setHour(hour);
    this.#dial.setMinute(minute);
    this.#snap();
  }

  #build(): void {
    const doc = this.root.ownerDocument;
    const { signal } = this.abort;
    this.#display = el(doc, 'div', `${ROOT}__display`);
    this.#fields = el(doc, 'div', `${ROOT}__fields`);
    const selector = (selection: TimePickerSelection): Selector => {
      const button = el(doc, 'button', `${ROOT}__selector`, { type: 'button', role: 'radio' });
      const value = el(doc, 'span', `${ROOT}__value`);
      button.append(value);
      attachRipple(button, signal);
      button.addEventListener(
        'click',
        (e) => {
          this.select(selection);
          this.#animateToCurrent();
          // From the keyboard (no pointer: detail 0), Compose moves focus into the dial.
          if (e.detail === 0) this.#focusSelected();
        },
        { signal },
      );
      return { selection, el: button, value };
    };
    this.#selectors = [selector('hour'), selector('minute')];
    this.#separator = el(doc, 'span', `${ROOT}__separator`, { 'aria-hidden': 'true' });
    this.#separator.textContent = ':';
    this.#fields.append(this.#selectors[0].el, this.#separator, this.#selectors[1].el);
    this.#display.append(this.#fields);
    this.buildPeriod(`${ROOT}__period`);

    this.#dialEl = el(doc, 'div', `${ROOT}__dial`);
    this.#highlight = el(doc, 'div', `${ROOT}__highlight`, { 'aria-hidden': 'true' });
    this.#dialEl.addEventListener('pointerdown', this.#onPointerDown, { signal });
    this.#dialEl.addEventListener('pointermove', this.#onPointerMove, { signal });
    this.#dialEl.addEventListener('pointerup', this.#onPointerUp, { signal });
    this.#dialEl.addEventListener('pointercancel', this.#onPointerCancel, { signal });
    this.#dialEl.addEventListener('keydown', this.#onKeyDown, { signal });
    this.#dialEl.addEventListener('click', this.#onLabelClick, { signal });
    this.root.replaceChildren(this.#display, this.#dialEl);
  }

  /** The faces (rebuilt when the clock changes: 24-hour adds the inner circle). */
  #buildFaces(): Record<TimePickerSelection, Face> {
    const doc = this.root.ownerDocument;
    const is24Hour = this.model.is24Hour;
    const make = (selection: TimePickerSelection): Face => {
      const values =
        selection === 'minute'
          ? TIME_PICKER_MINUTES
          : is24Hour
            ? [...TIME_PICKER_HOURS.map((h) => h % 12), ...TIME_PICKER_EXTRA_HOURS]
            : TIME_PICKER_HOURS;
      const labels = values.map((value, i): Label => {
        // CircularLayout: label i of 12 at i × 30° from 12 o'clock (L3951–3963).
        const angle = ((i % 12) * Math.PI * 2) / 12 - Math.PI / 2;
        const style = `--_m3e-time-picker-label-cos: ${String(round(Math.cos(angle)))}; --_m3e-time-picker-label-sin: ${String(round(Math.sin(angle)))}`;
        const className = i >= 12 ? `${ROOT}__label ${ROOT}__label--inner` : `${ROOT}__label`;
        const label = el(doc, 'span', className, { role: 'radio', style });
        attachRipple(label, this.abort.signal);
        return { value, el: label, copy: el(doc, 'span', className, { style }) };
      });
      const face = el(doc, 'div', `${ROOT}__face`, { 'data-face': selection, role: 'radiogroup' });
      const copy = el(doc, 'div', `${ROOT}__face`, { 'data-face': selection });
      face.append(...labels.map((l) => l.el));
      copy.append(...labels.map((l) => l.copy));
      return { el: face, copy, labels };
    };
    const faces = { hour: make('hour'), minute: make('minute') };
    this.#faces = faces;
    const parts = ['handle', 'track', 'center'].map((part) =>
      el(doc, 'span', `${ROOT}__${part}`, { 'aria-hidden': 'true' }),
    );
    this.#highlight.replaceChildren(faces.hour.copy, faces.minute.copy);
    this.#dialEl.replaceChildren(faces.hour.el, faces.minute.el, ...parts, this.#highlight);
    return faces;
  }

  #layoutType(): 'vertical' | 'horizontal' {
    const layout = this.options.layout ?? 'auto';
    if (layout !== 'auto') return layout;
    return this.#landscape?.matches ? 'horizontal' : 'vertical';
  }

  protected override render(structural = false): void {
    const state = this.model;
    const strings = this.strings;
    const locale = this.locale;
    const is24Hour = state.is24Hour;
    const faces = structural || !this.#faces ? this.#buildFaces() : this.#faces;

    this.root.className = [
      ROOT,
      this.options.vibrant ? `${ROOT}--vibrant` : '',
      this.#layoutType() === 'horizontal' ? `${ROOT}--horizontal` : '',
      is24Hour ? `${ROOT}--24h` : '',
      this.options.className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    this.root.dataset['selection'] = state.selection;

    // The display: hourForDisplay / minute, two locale digits.
    for (const selector of this.#selectors) {
      const hour = selector.selection === 'hour';
      const value = hour ? state.hourForDisplay : state.minute;
      setText(selector.value, localNumber(value, locale, 2));
      setAttr(selector.el, 'aria-checked', String(state.selection === selector.selection));
      const description = numberDescription(strings, selector.selection, is24Hour, value, locale);
      const name = hour ? strings.hourSelection : strings.minuteSelection;
      setAttr(selector.el, 'aria-label', `${name}, ${description}`);
    }
    if (is24Hour) this.period.remove();
    else if (this.period.parentNode !== this.#display) this.#display.append(this.period);
    this.renderPeriod();

    // The faces: texts, names, which is active, the tab stop and the checked label.
    for (const selection of ['hour', 'minute'] as const) {
      const face = faces[selection];
      const active = state.selection === selection;
      face.el.toggleAttribute('data-active', active);
      face.copy.toggleAttribute('data-active', active);
      setAttr(
        face.el,
        'aria-label',
        selection === 'hour' ? strings.hourSelection : strings.minuteSelection,
      );
      for (const label of face.labels) {
        const text = localNumber(label.value, locale);
        setText(label.el, text);
        setText(label.copy, text);
        setAttr(
          label.el,
          'aria-label',
          numberDescription(strings, state.selection, is24Hour, label.value, locale),
        );
        label.el.tabIndex = active && clockDialIsSelectedValue(state, label.value) ? 0 : -1;
      }
    }
    this.#renderChecked();
    this.#writeSelector();
  }

  /** ClockText's `selected`: the label whose bounds hold the selector's center. */
  #renderChecked(): void {
    const faces = this.#faces;
    if (!faces) return;
    const pos = this.#dial.selectorPos(TIME_PICKER_CLOCK_DIAL_SIZE);
    for (const selection of ['hour', 'minute'] as const) {
      faces[selection].labels.forEach(({ el: label }, i) => {
        const ratio = i >= 12 ? TIME_PICKER_INNER_RATIO : TIME_PICKER_OUTER_RATIO;
        const o = clockDialItemOffset(i % 12, 12, TIME_PICKER_CLOCK_DIAL_SIZE, ratio, ITEM, ITEM);
        const inside = pos.x >= o.x && pos.x < o.x + ITEM && pos.y >= o.y && pos.y < o.y + ITEM;
        setAttr(label, 'aria-checked', String(this.model.selection === selection && inside));
      });
    }
  }

  /** The selector's angle and circle (selectorPos). */
  #writeSelector(): void {
    const style = this.#dialEl.style;
    style.setProperty('--_m3e-time-picker-cos', String(round(Math.cos(this.#dial.value))));
    style.setProperty('--_m3e-time-picker-sin', String(round(Math.sin(this.#dial.value))));
    const state = this.model;
    this.#dialEl.toggleAttribute(
      'data-inner',
      state.is24Hour && state.isPm && state.selection === 'hour',
    );
  }

  #focusSelected(): void {
    const face = this.#faces?.[this.model.selection];
    face?.labels.find((l) => l.el.tabIndex === 0)?.el.focus();
  }

  // --- Motion ---------------------------------------------------------------------------------

  #snap(): void {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#anim.snapTo(this.#dial.value);
  }

  #animate(): void {
    const spec = readSpringTokens(getComputedStyle(this.root), SELECTOR_SPRING);
    const now = performance.now();
    this.#anim.animateTo(this.#dial.target, spec, now);
    this.#tick(now);
  }

  #tick(now: number): void {
    this.#dial.value = Math.fround(this.#anim.sample(now));
    this.#writeSelector();
    if (this.#anim.isRunning) {
      if (this.#frame === 0) {
        this.#frame = requestAnimationFrame((t) => {
          this.#frame = 0;
          this.#tick(Math.max(t, performance.now()));
        });
      }
    } else {
      this.#renderChecked();
    }
  }

  /** ClockDialNode.updateNode: the selection changed → animateToCurrent. */
  #animateToCurrent(): void {
    if (this.#dial.animateToCurrent() !== null) this.#animate();
  }

  // --- Pointer (ClockDialNode) ----------------------------------------------------------------

  /** The dial's geometry in CSS px (a dp on the web). */
  #geometry() {
    const rect = this.#dialEl.getBoundingClientRect();
    const size = Math.round(rect.width) || TIME_PICKER_CLOCK_DIAL_SIZE;
    return {
      rect,
      cx: Math.trunc(size / 2),
      cy: Math.trunc(Math.round(rect.height || size) / 2),
      // maxDist: MaxDistance × the diameter / ClockDialContainerSize.
      maxDist: (TIME_PICKER_MAX_DISTANCE * size) / TIME_PICKER_CLOCK_DIAL_SIZE,
    };
  }

  #onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || this.#press) return;
    const { rect } = this.#geometry();
    // onPress: clearFocus().
    const focused = this.root.ownerDocument.activeElement;
    if (focused instanceof HTMLElement) focused.blur();
    this.#press = {
      x: Math.fround(e.clientX - rect.left),
      y: Math.fround(e.clientY - rect.top),
      id: e.pointerId,
      dragging: false,
    };
    if ('setPointerCapture' in this.#dialEl) this.#dialEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  #onPointerMove = (e: PointerEvent): void => {
    const press = this.#press;
    if (press?.id !== e.pointerId) return;
    const { rect, cx, cy, maxDist } = this.#geometry();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!press.dragging) {
      const dx = x - press.x;
      const dy = y - press.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= DRAG_SLOP) return;
      // detectDragGestures: the first onDrag reports the movement past the slop.
      press.dragging = true;
      press.x = Math.fround(press.x + Math.fround(dx - (dx / distance) * DRAG_SLOP));
      press.y = Math.fround(press.y + Math.fround(dy - (dy / distance) * DRAG_SLOP));
    } else {
      press.x = Math.fround(x);
      press.y = Math.fround(y);
    }
    this.#cancelSwitch();
    const before = this.model.hour * 60 + this.model.minute;
    this.#dial.rotateTo(timePickerAtan(Math.fround(press.y - cy), Math.fround(press.x - cx)));
    this.#dial.moveSelector(press.x, press.y, maxDist, cx, cy);
    this.#snap();
    if (this.model.hour * 60 + this.model.minute !== before) this.changed();
    else this.#writeSelector();
  };

  #onPointerUp = (e: PointerEvent): void => {
    const press = this.#press;
    if (press?.id !== e.pointerId) return;
    this.#press = null;
    const { cx, cy, maxDist } = this.#geometry();
    if (press.dragging) {
      // onDragEnd: switch to the minutes (pointer input), then settle.
      if (this.model.selection === 'hour') this.select('minute');
      this.#dial.onGestureEnd();
      this.#animate();
      this.render();
      return;
    }
    // onTap.
    this.#tap(press.x, press.y, cx, cy, maxDist, true);
  };

  #onPointerCancel = (e: PointerEvent): void => {
    if (this.#press?.id !== e.pointerId) return;
    const dragging = this.#press.dragging;
    this.#press = null;
    if (dragging) {
      this.#dial.onGestureEnd();
      this.#animate();
    }
  };

  /** AnalogTimePickerState.onTap: snap, move, animate (or jump), then maybe switch to minutes. */
  #tap(x: number, y: number, cx: number, cy: number, maxDist: number, autoSwitch: boolean): void {
    const wasHour = this.model.selection === 'hour';
    this.#dial.onTap(x, y, maxDist, cx, cy);
    if (autoSwitch) this.#animate();
    else {
      this.#dial.value = this.#dial.target;
      this.#snap();
    }
    this.changed();
    if (!autoSwitch) return;
    this.#cancelSwitch();
    if (wasHour) {
      const delay = Number.parseFloat(
        getComputedStyle(this.root).getPropertyValue(AUTO_SWITCH_DELAY),
      );
      this.#switchTimer = window.setTimeout(
        () => {
          this.#switchTimer = 0;
          this.select('minute');
          this.#animateToCurrent();
        },
        Number.isFinite(delay) ? delay : 0,
      );
    }
  }

  #cancelSwitch(): void {
    clearTimeout(this.#switchTimer);
    this.#switchTimer = 0;
  }

  // --- Keyboard and assistive technology (ClockText) ------------------------------------------

  #label(target: EventTarget | null): { face: Face; index: number } | null {
    const label = target instanceof Element ? target.closest(`.${ROOT}__label`) : null;
    const faces = this.#faces;
    if (!label || !faces) return null;
    const face = faces[this.model.selection];
    const index = face.labels.findIndex((l) => l.el === label);
    return index < 0 ? null : { face, index };
  }

  /** onClockTextClick(autoSwitch = false): a tap at the label's center, without animation. */
  #pick(face: Face, index: number): void {
    const ratio = index >= 12 ? TIME_PICKER_INNER_RATIO : TIME_PICKER_OUTER_RATIO;
    const { cx, cy, maxDist } = this.#geometry();
    const size = cx * 2;
    const o = clockDialItemOffset(index % 12, 12, size, ratio, ITEM, ITEM);
    this.#tap(Math.fround(o.x + ITEM / 2), Math.fround(o.y + ITEM / 2), cx, cy, maxDist, false);
    face.labels.find((l) => l.el.tabIndex === 0)?.el.focus();
  }

  #onLabelClick = (e: MouseEvent): void => {
    // Pointer clicks are taps on the dial (pointerup); a click without a pointer is the keyboard
    // or assistive technology (Compose's semantics onClick, no auto switch then).
    if (e.detail !== 0) return;
    const hit = this.#label(e.target);
    if (hit) this.#pick(hit.face, hit.index);
  };

  #onKeyDown = (e: KeyboardEvent): void => {
    const hit = this.#label(e.target);
    if (!hit) return;
    const { face, index } = hit;
    const count = face.labels.length;
    let next: number | null = null;
    // Arrow keys loop focus around the dial (outer circle, then the 24-hour inner one).
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % count;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (index - 1 + count) % count;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.#pick(face, index);
      return;
    }
    const from = face.labels[index];
    const to = next === null ? undefined : face.labels[next];
    if (!from || !to) return;
    e.preventDefault();
    from.el.tabIndex = -1;
    to.el.tabIndex = 0;
    to.el.focus();
  };
}

/** Six decimals: enough for sub-pixel positions, stable in the DOM. */
const round = (v: number): number => Math.round(v * 1e6) / 1e6;
