import { M3eElement } from '../base/M3eElement.js';
import type { ProgressIndicatorDriver, ProgressIndicatorOptions } from './driver.js';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** The attributes `<m3e-linear-progress>` and `<m3e-circular-progress>` share. */
export interface ProgressContract extends ProgressIndicatorOptions {
  thickness: 'default' | 'thick';
  label?: string | null | undefined;
}

/**
 * Base of `<m3e-linear-progress>` and `<m3e-circular-progress>` (COMPONENT_SPEC §8): renders the
 * m3e-css contract inside the host (`display: contents`) and hands it to the driver. Attributes:
 * `value` (0–1; absent = indeterminate), `shape` (`flat` | `wavy`), `thickness` (`thick`),
 * `amplitude` (0–1, fixed), `wavelength` (px), `wave-speed` (px/s), `label` (or the host's
 * `aria-label`, which moves onto the progress bar).
 */
export abstract class M3eProgressElement extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    value: { type: Number },
    shape: {},
    thickness: {},
    amplitude: { type: Number },
    wavelength: { type: Number },
    waveSpeed: { type: Number },
    label: {},
    hostLabel: { attribute: 'aria-label' },
  };

  declare value: number | null | undefined;
  declare shape: string | null | undefined;
  declare thickness: string | null | undefined;
  declare amplitude: number | null | undefined;
  declare wavelength: number | null | undefined;
  declare waveSpeed: number | null | undefined;
  declare label: string | null | undefined;
  declare hostLabel: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #driver: ProgressIndicatorDriver | undefined;

  protected abstract render(root: HTMLElement, contract: ProgressContract): void;
  protected abstract createDriver(root: HTMLElement): ProgressIndicatorDriver;

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof matchMedia === 'function') {
      this.listen(matchMedia(REDUCED_MOTION), 'change', () => {
        this.requestUpdate();
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#driver?.disconnect();
    this.#driver = undefined;
  }

  protected override update(): void {
    // The host's aria-label names the progress bar instead (a generic host cannot carry it).
    if (this.hostLabel != null) {
      this.label = this.hostLabel;
      this.removeAttribute('aria-label');
      return;
    }
    const root = (this.#root ??= this.ownerDocument.createElement('div'));
    if (root.parentNode !== this || this.childNodes.length !== 1) this.replaceChildren(root);
    const value = this.value;
    const finite = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? undefined : n);
    const contract: ProgressContract = {
      value: value ?? null,
      shape: this.shape === 'wavy' ? 'wavy' : 'flat',
      thickness: this.thickness === 'thick' ? 'thick' : 'default',
      amplitude: finite(this.amplitude),
      wavelength: finite(this.wavelength),
      waveSpeed: finite(this.waveSpeed),
      label: this.label,
    };
    this.render(root, contract);
    (this.#driver ??= this.createDriver(root)).update(contract);
  }
}
