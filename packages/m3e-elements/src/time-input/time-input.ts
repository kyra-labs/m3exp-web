import { M3eTimePickerElement } from '../time-picker-layout/element.js';
import { TimeInputLayout, type TimeInputLayoutOptions } from '../time-picker-layout/input.js';

/**
 * `<m3e-time-input hour="7" minute="30">` (COMPONENT_SPEC §28; Compose TimeInput): the text input
 * picker. The `<m3e-time-picker>` attributes, events and `labels` (no `layout`), plus `uncontained`
 * (Compose's TimeInput with a toggle: the side column with AM, PM and a mode toggle button, which
 * fires `mode-toggle`). Built and run by {@link TimeInputLayout} (shared with m3e-react).
 */
export class M3eTimeInput extends M3eTimePickerElement<TimeInputLayout, TimeInputLayoutOptions> {
  static override properties = {
    ...M3eTimePickerElement.properties,
    uncontained: { type: Boolean, reflect: true },
  };

  declare uncontained: boolean | undefined;

  protected override options(): TimeInputLayoutOptions {
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
    options: TimeInputLayoutOptions,
  ): TimeInputLayout {
    return new TimeInputLayout(root, options);
  }
}
