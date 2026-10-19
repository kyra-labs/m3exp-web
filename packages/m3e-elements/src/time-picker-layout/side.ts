import { attachRipple } from '../base/ripple.js';
import { TimePickerBase, type TimePickerBaseOptions, el, setAttr, setText } from './shared.js';

/**
 * TimeInput and TimeScroll: 12-hour, the vertical AM/PM toggle after the fields; uncontained, the
 * side control column (SideControlColumn L2693–2767: AM, PM and the mode toggle button).
 */
export abstract class TimePickerFieldsBase<
  O extends TimePickerBaseOptions,
> extends TimePickerBase<O> {
  #side: { el: HTMLElement; toggle: HTMLButtonElement; icon: HTMLElement } | null = null;
  #onModeToggle: (() => void) | undefined;

  /** The mode toggle's Material Symbol (ScrollDisplayModeToggle). */
  protected toggleIcon(): string {
    return '';
  }

  protected toggleLabel(): string {
    return '';
  }

  protected renderSide(uncontained: boolean, onModeToggle: (() => void) | undefined): void {
    const period = this.period;
    const is24Hour = this.model.is24Hour;
    this.#onModeToggle = onModeToggle;
    if (!period.contains(this.periodItems[0])) period.replaceChildren(...this.periodItems);
    if (uncontained) {
      this.#side ??= this.#buildSide();
      const { el: side, toggle, icon } = this.#side;
      const parts = is24Hour ? [toggle] : [period, toggle];
      if (side.childNodes.length !== parts.length || side.firstChild !== parts[0]) {
        side.replaceChildren(...parts);
      }
      setText(icon, this.toggleIcon());
      setAttr(toggle, 'aria-label', this.toggleLabel());
      if (side.parentNode !== this.root) this.root.append(side);
    } else {
      this.#side?.el.remove();
      if (is24Hour) period.remove();
      else if (period.parentNode !== this.root) this.root.append(period);
    }
    this.renderPeriod();
  }

  #buildSide(): { el: HTMLElement; toggle: HTMLButtonElement; icon: HTMLElement } {
    const doc = this.root.ownerDocument;
    const side = el(doc, 'div', 'm3e-time-picker__side');
    const toggle = el(doc, 'button', 'm3e-icon-button', { type: 'button' });
    const icon = el(doc, 'span', 'm3e-icon', { 'aria-hidden': 'true' });
    toggle.append(icon);
    attachRipple(toggle, this.abort.signal);
    toggle.addEventListener(
      'click',
      () => {
        this.#onModeToggle?.();
      },
      { signal: this.abort.signal },
    );
    return { el: side, toggle, icon };
  }
}
