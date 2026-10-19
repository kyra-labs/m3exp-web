import {
  SpringAnimatable,
  type TimePickerSelection,
  scrollFieldInitialPage,
  scrollFieldTargetPage,
  timeScrollHourFromIndex,
  timeScrollHourIndex,
} from '@kyralabs/m3e-motion';
import { DRAG_SLOP, releaseVelocity } from '../base/drag.js';
import { readSpringTokens } from '../base/scroll.js';
import { TimePickerFieldsBase } from './side.js';
import {
  type TimePickerBaseOptions,
  el,
  localNumber,
  numberDescription,
  setAttr,
  setText,
} from './shared.js';

export interface TimeScrollLayoutOptions extends TimePickerBaseOptions {
  /** The uncontained variant (Compose's TimeScroll with a `toggle`; see TimeInputLayoutOptions). */
  uncontained?: boolean;
  /** The side column's mode toggle was pressed (switch to the text input). */
  onModeToggle?: () => void;
}

const ROOT = 'm3e-time-scroll';
const PAGE_SPRING = '--m3e-comp-time-picker-scroll-page';
const SETTLE_SPRING = '--m3e-comp-time-picker-scroll-settle';
const PAGE_HEIGHT = '--m3e-comp-time-picker-scroll-field-height';
const PAGES = '--m3e-comp-time-picker-scroll-field-pages';
/** Rows drawn around the wheel's position (a 120–136dp wheel shows parts of three). */
const AROUND = 2;
/** compose foundation snapping/SnapFlingBehavior.kt `MinFlingVelocityDp` (dp/s). */
const MIN_FLING_VELOCITY = 400;

interface Wheel {
  selection: TimePickerSelection;
  el: HTMLElement;
  items: HTMLElement[];
  /** The infinite pager's position in pages (ScrollFieldState's PagerState). */
  anim: SpringAnimatable;
  count: number;
  drag: {
    id: number;
    start: number;
    y: number;
    dragging: boolean;
    samples: { t: number; v: number }[];
  } | null;
  wheelDelta: number;
}

/**
 * Behavior of a `.m3e-time-scroll` (COMPONENT_SPEC §28; Compose TimeScroll and ScrollField),
 * shared by `<m3e-time-scroll>` and m3e-react's `<TimeScroll>`: it builds the m3e-css DOM inside
 * the root.
 *
 * - Two infinite wheels (ScrollField: a vertical pager of ScrollFieldHeight / 3 rows; m3e-motion's
 *   ports of rememberScrollFieldState / calculateTargetPage and TimeScrollImpl's hour ⇄ index).
 *   The centered row is the selected option, and the time follows it while the wheel moves.
 * - Up / Down (ScrollField's onKeyEvent) and a click on a row animate to the next / previous / that
 *   row on PagerState.animateScrollToPage's spring(); a drag moves the wheel and settles on the
 *   pager's snapAnimationSpec, one row further when released at fling speed
 *   (PagerSnapDistance.atMost(1)); mouse wheels step a row per row height scrolled.
 * - Each wheel is a spinbutton named "Select hour" / "Select minutes" (the rows are hidden from
 *   assistive technology); its value text is Compose's fieldAccessibilityDescription.
 */
export class TimeScrollLayout extends TimePickerFieldsBase<TimeScrollLayoutOptions> {
  #wheels!: [Wheel, Wheel];
  #frame = 0;

  constructor(root: HTMLElement, options: TimeScrollLayoutOptions = {}) {
    super(root, options);
    this.#build();
    this.render(true);
  }

  override destroy(): void {
    super.destroy();
    cancelAnimationFrame(this.#frame);
  }

  #build(): void {
    const doc = this.root.ownerDocument;
    const fields = el(doc, 'div', `${ROOT}__fields`);
    const make = (selection: TimePickerSelection): Wheel => {
      const wheel = el(doc, 'div', `${ROOT}__field`, { role: 'spinbutton', tabindex: '0' });
      const items = Array.from({ length: AROUND * 2 + 1 }, () =>
        el(doc, 'span', `${ROOT}__item`, { 'aria-hidden': 'true' }),
      );
      wheel.append(...items);
      const w: Wheel = {
        selection,
        el: wheel,
        items,
        anim: new SpringAnimatable(0, 1 / 1000),
        count: 1,
        drag: null,
        wheelDelta: 0,
      };
      this.#listen(w);
      return w;
    };
    this.#wheels = [make('hour'), make('minute')];
    const separator = el(doc, 'span', `${ROOT}__separator`, { 'aria-hidden': 'true' });
    separator.textContent = ':';
    fields.append(this.#wheels[0].el, separator, this.#wheels[1].el);
    this.buildPeriod('m3e-time-picker__period');
    this.root.replaceChildren(fields);
    this.#resetPages();
  }

  /** The option (0-based index) each wheel shows for the state. */
  #option(wheel: Wheel): number {
    const state = this.model;
    return wheel.selection === 'hour'
      ? timeScrollHourIndex(state.hour, state.is24Hour)
      : state.minute;
  }

  /** rememberScrollFieldState: both wheels at their option, mid pager. */
  #resetPages(): void {
    for (const wheel of this.#wheels) {
      wheel.count = wheel.selection === 'hour' ? (this.model.is24Hour ? 24 : 12) : 60;
      wheel.anim.snapTo(scrollFieldInitialPage(wheel.count, this.#option(wheel)));
    }
  }

  protected override setTime(hour: number, minute: number): void {
    super.setTime(hour, minute);
    // LaunchedEffect(state.hour / state.minute): scrollToOption (no animation).
    for (const wheel of this.#wheels) {
      const page = Math.round(wheel.anim.value);
      wheel.anim.snapTo(scrollFieldTargetPage(page, wheel.count, this.#option(wheel)));
    }
  }

  protected override render(structural = false): void {
    const state = this.model;
    const uncontained = Boolean(this.options.uncontained);
    if (structural) this.#resetPages();
    this.root.className = [
      ROOT,
      uncontained ? `${ROOT}--uncontained` : '',
      state.is24Hour ? `${ROOT}--24h` : '',
      this.options.className ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    for (const wheel of this.#wheels) this.#renderWheel(wheel);
    this.renderSide(uncontained, this.options.onModeToggle);
  }

  #renderWheel(wheel: Wheel): void {
    const state = this.model;
    const strings = this.strings;
    const locale = this.locale;
    const hour = wheel.selection === 'hour';
    const position = wheel.anim.value;
    const current = Math.round(position);
    const base = Math.floor(position) - AROUND;
    const label = (index: number) => (hour && !state.is24Hour ? index + 1 : index);
    wheel.items.forEach((item, i) => {
      const page = base + i;
      const index = ((page % wheel.count) + wheel.count) % wheel.count;
      setText(item, localNumber(label(index), locale, 2));
      item.style.setProperty('--_m3e-time-scroll-offset', String(round(page - position)));
      item.toggleAttribute('data-selected', page === current);
      item.dataset['page'] = String(page);
    });
    // The spinbutton: Compose's contentDescription and the target option's description.
    const target = ((Math.round(wheel.anim.target) % wheel.count) + wheel.count) % wheel.count;
    setAttr(wheel.el, 'aria-label', hour ? strings.hourSelection : strings.minuteSelection);
    setAttr(wheel.el, 'aria-valuenow', String(label(target)));
    setAttr(wheel.el, 'aria-valuemin', hour && !state.is24Hour ? '1' : '0');
    setAttr(wheel.el, 'aria-valuemax', String(label(wheel.count - 1)));
    setAttr(
      wheel.el,
      'aria-valuetext',
      numberDescription(strings, wheel.selection, state.is24Hour, label(target), locale),
    );
  }

  // --- Motion -----------------------------------------------------------------------------------

  #pageSize(): number {
    const style = getComputedStyle(this.root);
    const height = Number.parseFloat(style.getPropertyValue(PAGE_HEIGHT));
    const pages = Number.parseFloat(style.getPropertyValue(PAGES));
    return height > 0 && pages > 0 ? height / pages : 1;
  }

  #animate(wheel: Wheel, page: number, spring: string, velocity?: number): void {
    const spec = readSpringTokens(getComputedStyle(this.root), spring);
    const now = performance.now();
    wheel.anim.animateTo(page, spec, now, velocity);
    this.#tick(now);
  }

  #tick(now: number): void {
    let running = false;
    for (const wheel of this.#wheels) {
      wheel.anim.sample(now);
      running ||= wheel.anim.isRunning;
    }
    this.#moved();
    if (running && this.#frame === 0) {
      this.#frame = requestAnimationFrame((t) => {
        this.#frame = 0;
        this.#tick(Math.max(t, performance.now()));
      });
    }
  }

  /** The wheels moved: the selected options become the time (LaunchedEffect(selectedOption)). */
  #moved(): void {
    const state = this.model;
    const [hourWheel, minuteWheel] = this.#wheels;
    const option = (w: Wheel) => ((Math.round(w.anim.value) % w.count) + w.count) % w.count;
    const hour = timeScrollHourFromIndex(option(hourWheel), state.is24Hour, state.isPm);
    const minute = option(minuteWheel);
    if (hour !== state.hour || minute !== state.minute) {
      state.hour = hour;
      state.minute = minute;
      this.changed();
    } else {
      for (const wheel of this.#wheels) this.#renderWheel(wheel);
    }
  }

  // --- Input --------------------------------------------------------------------------------------

  #listen(wheel: Wheel): void {
    const { signal } = this.abort;
    const target = wheel.el;
    target.addEventListener(
      'keydown',
      (e) => {
        // ScrollField: Down → the next page, Up → the previous one.
        const direction = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (direction === 0) return;
        e.preventDefault();
        this.#animate(wheel, Math.round(wheel.anim.target) + direction, PAGE_SPRING);
      },
      { signal },
    );
    target.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        wheel.wheelDelta += e.deltaMode === 0 ? e.deltaY : e.deltaY * this.#pageSize();
        const steps = Math.trunc(wheel.wheelDelta / this.#pageSize());
        if (steps === 0) return;
        wheel.wheelDelta -= steps * this.#pageSize();
        this.#animate(wheel, Math.round(wheel.anim.target) + steps, PAGE_SPRING);
      },
      { signal, passive: false },
    );
    target.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 0 || wheel.drag) return;
        wheel.drag = {
          id: e.pointerId,
          start: e.clientY,
          y: e.clientY,
          dragging: false,
          samples: [],
        };
        if ('setPointerCapture' in target) target.setPointerCapture(e.pointerId);
      },
      { signal },
    );
    target.addEventListener(
      'pointermove',
      (e) => {
        const drag = wheel.drag;
        if (drag?.id !== e.pointerId) return;
        if (!drag.dragging) {
          if (Math.abs(e.clientY - drag.start) <= DRAG_SLOP) return;
          drag.dragging = true;
          drag.y = e.clientY;
          target.setAttribute('data-dragging', '');
        }
        const page = this.#pageSize();
        const position = wheel.anim.value - (e.clientY - drag.y) / page;
        drag.y = e.clientY;
        drag.samples.push({ t: e.timeStamp, v: position });
        wheel.anim.snapTo(position);
        this.#moved();
      },
      { signal },
    );
    const end = (e: PointerEvent) => {
      const drag = wheel.drag;
      if (drag?.id !== e.pointerId) return;
      wheel.drag = null;
      target.removeAttribute('data-dragging');
      if (!drag.dragging) {
        // A click on a row: animateScrollToOption(index).
        if (e.type !== 'pointerup') return;
        const row =
          e.target instanceof Element ? e.target.closest<HTMLElement>(`.${ROOT}__item`) : null;
        const page = Number(row?.dataset['page']);
        if (!Number.isFinite(page)) return;
        const index = ((page % wheel.count) + wheel.count) % wheel.count;
        this.#animate(
          wheel,
          scrollFieldTargetPage(Math.round(wheel.anim.value), wheel.count, index),
          PAGE_SPRING,
        );
        return;
      }
      // The release: a page further at fling speed (pages / s → dp / s), else the closest page.
      const velocity = releaseVelocity(drag.samples.map((s) => ({ t: s.t, x: s.v })));
      const position = wheel.anim.value;
      const fling = Math.abs(velocity * this.#pageSize()) >= MIN_FLING_VELOCITY;
      const page = fling
        ? velocity > 0
          ? Math.floor(position) + 1
          : Math.ceil(position) - 1
        : Math.round(position);
      this.#animate(wheel, page, SETTLE_SPRING, velocity);
    };
    target.addEventListener('pointerup', end, { signal });
    target.addEventListener('pointercancel', end, { signal });
  }

  /** ScrollDisplayModeToggle in Scroll mode: to the text input (TimePickerDialog.kt). */
  protected override toggleIcon(): string {
    return 'keyboard';
  }

  protected override toggleLabel(): string {
    return this.strings.toggleKeyboard;
  }
}

/** Six decimals: enough for sub-pixel positions, stable in the DOM. */
const round = (v: number): number => Math.round(v * 1e6) / 1e6;
