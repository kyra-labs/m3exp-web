import type { TimePickerSelection } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import type { TimePickerBase, TimePickerBaseOptions } from './shared.js';
import type { TimePickerStrings } from './strings.js';

const stopPropagation = (e: Event): void => {
  e.stopPropagation();
};

/** `change` event detail: the time the user picked. */
export interface TimePickerChangeDetail {
  hour: number;
  minute: number;
}

/** `selection-change` detail: the field (hour or minute) the user moved to. */
export interface TimePickerSelectionChangeDetail {
  value: TimePickerSelection;
  /** @deprecated Since 1.8: use `value`. Removed in 2.0. */
  selection: TimePickerSelection;
}

/**
 * What `<m3e-time-picker>`, `<m3e-time-input>` and `<m3e-time-scroll>` share: the attributes
 * (`hour`, `minute`, `hour-cycle="12 | 24"`, `selection`, `vibrant`), the `labels` property
 * (string overrides), the `change` (`detail: { hour, minute }`) / `selection-change` (`detail: { value }`; its
 * `selection` key is deprecated since 1.8) events, and a root `<div>` inside the
 * host (`display: contents`) that the layout builds.
 */
export abstract class M3eTimePickerElement<
  L extends TimePickerBase<O>,
  O extends TimePickerBaseOptions,
> extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    hour: { type: Number },
    minute: { type: Number },
    hourCycle: {},
    selection: { reflect: true },
    vibrant: { type: Boolean, reflect: true },
    labels: { attribute: false as const },
  }))();

  declare hour: number | null | undefined;
  declare minute: number | null | undefined;
  declare hourCycle: string | null | undefined;
  declare selection: string | null | undefined;
  declare vibrant: boolean | undefined;
  /** String overrides (TIME_PICKER_STRINGS keys), e.g. for other languages. */
  declare labels: Partial<TimePickerStrings> | null | undefined;

  #layout: L | undefined;

  /** The layout (shared with m3e-react) that builds and runs the picker. */
  get controller(): L | undefined {
    return this.#layout;
  }

  protected abstract createLayout(root: HTMLElement, options: O): L;

  /** The element's options for the layout (subclasses add theirs). */
  protected options(): O {
    const cycle = this.hourCycle;
    const selection = this.selection === 'minute' ? 'minute' : 'hour';
    return {
      hour: this.hour ?? 0,
      minute: this.minute ?? 0,
      is24Hour: cycle === '24' ? true : cycle === '12' ? false : undefined,
      selection,
      vibrant: Boolean(this.vibrant),
      labels: this.labels ?? undefined,
      onChange: (hour: number, minute: number) => {
        this.hour = hour;
        this.minute = minute;
        this.emit('change', { hour, minute } satisfies TimePickerChangeDetail);
      },
      onSelectionChange: (value: TimePickerSelection) => {
        this.selection = value;
        // `value` (M2: as the other `selection-change` events); `selection` is the deprecated key.
        this.emit('selection-change', {
          value,
          selection: value,
        } satisfies TimePickerSelectionChangeDetail);
      },
    } as O;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  protected override update(): void {
    if (!this.#layout) {
      const root = this.ownerDocument.createElement('div');
      this.replaceChildren(root);
      // The inner <input>s' native `input` / `change` stop at the root (the layout's own listeners
      // have run by then): the host's `change` is only this element's CustomEvent with `detail`.
      for (const type of ['input', 'change']) this.listen(root, type, stopPropagation);
      this.#layout = this.createLayout(root, this.options());
    } else {
      this.#layout.update(this.options());
    }
  }
}

/** Events of the time pickers (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eTimePickerElementEventMap extends HTMLElementEventMap {
  /** The user changed the time (the inputs' native `input` / `change` stop inside). */
  change: CustomEvent<TimePickerChangeDetail>;
  /** The selected field (hour or minute) changed. */
  'selection-change': CustomEvent<TimePickerSelectionChangeDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eTimePickerElement<
  L extends TimePickerBase<O>,
  O extends TimePickerBaseOptions,
> {
  addEventListener<K extends keyof M3eTimePickerElementEventMap>(
    type: K,
    listener: (this: M3eTimePickerElement<L, O>, ev: M3eTimePickerElementEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eTimePickerElementEventMap>(
    type: K,
    listener: (this: M3eTimePickerElement<L, O>, ev: M3eTimePickerElementEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
