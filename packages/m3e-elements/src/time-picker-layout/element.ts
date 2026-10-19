import type { TimePickerSelection } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import type { TimePickerBase, TimePickerBaseOptions } from './shared.js';
import type { TimePickerStrings } from './strings.js';

/** `change` event detail: the time the user picked. */
export interface TimePickerChangeDetail {
  hour: number;
  minute: number;
}

/**
 * What `<m3e-time-picker>`, `<m3e-time-input>` and `<m3e-time-scroll>` share: the attributes
 * (`hour`, `minute`, `hour-cycle="12 | 24"`, `selection`, `vibrant`), the `labels` property
 * (string overrides), the `change` / `selection-change` events, and a root `<div>` inside the
 * host (`display: contents`) that the layout builds.
 */
export abstract class M3eTimePickerElement<
  L extends TimePickerBase<O>,
  O extends TimePickerBaseOptions,
> extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    hour: { type: Number },
    minute: { type: Number },
    hourCycle: {},
    selection: { reflect: true },
    vibrant: { type: Boolean, reflect: true },
    labels: { attribute: false as const },
  };

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
        this.emit('selection-change', { selection: value });
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
      this.#layout = this.createLayout(root, this.options());
    } else {
      this.#layout.update(this.options());
    }
  }
}
