import { M3eTimePickerElement } from '../time-picker-layout/element.js';
import { TimeScrollLayout, type TimeScrollLayoutOptions } from '../time-picker-layout/scroll.js';

/**
 * `<m3e-time-scroll hour="7" minute="30">` (COMPONENT_SPEC §28; Compose TimeScroll, vibrant only):
 * the scroll wheel picker. The `<m3e-time-input>` attributes and events (`vibrant` has no effect:
 * TimeScroll is always vibrant). Built and run by {@link TimeScrollLayout} (shared with
 * m3e-react).
 */
export class M3eTimeScroll extends M3eTimePickerElement<TimeScrollLayout, TimeScrollLayoutOptions> {
  static override properties = {
    ...M3eTimePickerElement.properties,
    uncontained: { type: Boolean, reflect: true },
  };

  declare uncontained: boolean | undefined;

  protected override options(): TimeScrollLayoutOptions {
    return {
      ...super.options(),
      uncontained: Boolean(this.uncontained),
      onModeToggle: () => {
        this.emit('mode-toggle', null);
      },
    };
  }

  protected override createLayout(
    root: HTMLElement,
    options: TimeScrollLayoutOptions,
  ): TimeScrollLayout {
    return new TimeScrollLayout(root, options);
  }
}
