import {
  M3eTimePickerElement,
  type M3eTimePickerElementEventMap,
} from '../time-picker-layout/element.js';
import { TimePickerLayout, type TimePickerLayoutOptions } from '../time-picker-layout/dial.js';

/**
 * `<m3e-time-picker hour="7" minute="30">` (COMPONENT_SPEC §28; Compose TimePicker): the dial
 * picker. Attributes `hour` (0–23), `minute`, `hour-cycle="12 | 24"` (default: the locale's,
 * from `lang`), `selection="hour | minute"`, `vibrant` (the expressive overload), `layout="auto |
 * vertical | horizontal"` (auto: horizontal in a landscape window, as Compose). Property `labels`
 * (string overrides). Events `change` (`detail: { hour, minute }`) and `selection-change`
 * (`detail: { selection }`). The DOM is m3e-css's `.m3e-time-picker` contract, built and run by
 * {@link TimePickerLayout} (shared with m3e-react).
 */
export class M3eTimePicker extends M3eTimePickerElement<TimePickerLayout, TimePickerLayoutOptions> {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eTimePickerElement.properties,
    layout: {},
  }))();

  declare layout: string | null | undefined;

  protected override options(): TimePickerLayoutOptions {
    const layout = this.layout;
    return {
      ...super.options(),
      layout: layout === 'vertical' || layout === 'horizontal' ? layout : 'auto',
    };
  }

  protected override createLayout(
    root: HTMLElement,
    options: TimePickerLayoutOptions,
  ): TimePickerLayout {
    return new TimePickerLayout(root, options);
  }
}

/** Events of `<m3e-time-picker>` (M1). */
export type M3eTimePickerEventMap = M3eTimePickerElementEventMap;

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eTimePicker {
  addEventListener<K extends keyof M3eTimePickerEventMap>(
    type: K,
    listener: (this: M3eTimePicker, ev: M3eTimePickerEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eTimePickerEventMap>(
    type: K,
    listener: (this: M3eTimePicker, ev: M3eTimePickerEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
