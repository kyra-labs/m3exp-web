import { CircularProgressDriver, renderCircularProgress } from '../progress-indicator/circular.js';
import { M3eProgressElement, type ProgressContract } from '../progress-indicator/element.js';

/**
 * `<m3e-circular-progress value="0.4" shape="wavy" aria-label="Downloading">` (COMPONENT_SPEC §8).
 * Renders the m3e-css `.m3e-circular-progress` contract inside itself (the host is
 * `display: contents`):
 *
 * ```html
 * <div class="m3e-circular-progress" role="progressbar" aria-label="Downloading"
 *      aria-valuemin="0" aria-valuemax="100" aria-valuenow="40" data-driven
 *      style="--m3e-comp-progress-indicator-value: 0.4">
 *   <svg class="m3e-circular-progress__svg" aria-hidden="true" focusable="false">
 *     <circle class="m3e-circular-progress__track"></circle>
 *     <circle class="m3e-circular-progress__indicator"></circle>
 *   </svg>
 * </div>
 * ```
 *
 * Without `value` it is indeterminate. `shape="wavy"` draws Compose's wavy star (bundled
 * m3e-shapes, D7) into `<path>`s every frame; `thickness="thick"` is the 8dp / 52dp sample
 * configuration. Value changes run on Compose's progress spring (velocity kept when interrupted).
 * `amplitude`, `wavelength` and `wave-speed` override the wave.
 */
export class M3eCircularProgress extends M3eProgressElement {
  protected render(root: HTMLElement, contract: ProgressContract): void {
    renderCircularProgress(root, contract);
  }

  protected createDriver(root: HTMLElement): CircularProgressDriver {
    return new CircularProgressDriver(root);
  }
}
