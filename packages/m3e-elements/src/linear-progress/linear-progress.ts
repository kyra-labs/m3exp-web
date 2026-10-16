import { LinearProgressDriver, renderLinearProgress } from '../progress-indicator/linear.js';
import { M3eProgressElement, type ProgressContract } from '../progress-indicator/element.js';

/**
 * `<m3e-linear-progress value="0.4" shape="wavy" aria-label="Loading">` (COMPONENT_SPEC §8).
 * Renders the m3e-css `.m3e-linear-progress` contract inside itself (the host is
 * `display: contents`):
 *
 * ```html
 * <div class="m3e-linear-progress" role="progressbar" aria-label="Loading" aria-valuemin="0"
 *      aria-valuemax="100" aria-valuenow="40" data-driven
 *      style="--m3e-comp-progress-indicator-value: 0.4">
 *   <span class="m3e-linear-progress__track"></span>
 *   <span class="m3e-linear-progress__indicator"></span>
 *   <span class="m3e-linear-progress__stop"></span>
 * </div>
 * ```
 *
 * Without `value` it is indeterminate. `shape="wavy"` draws Compose's wave into an SVG every
 * frame; `thickness="thick"` is the 8dp sample configuration. Value changes run on Compose's
 * progress spring (velocity kept when interrupted). `amplitude`, `wavelength` and `wave-speed`
 * override the wave (Compose `amplitude`, `wavelength`, `waveSpeed`).
 */
export class M3eLinearProgress extends M3eProgressElement {
  protected render(root: HTMLElement, contract: ProgressContract): void {
    renderLinearProgress(root, contract);
  }

  protected createDriver(root: HTMLElement): LinearProgressDriver {
    return new LinearProgressDriver(root);
  }
}
