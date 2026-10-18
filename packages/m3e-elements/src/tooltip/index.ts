import { M3eTooltip } from './tooltip.js';

export { M3eTooltip } from './tooltip.js';

M3eTooltip.define('m3e-tooltip');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-tooltip': M3eTooltip;
  }
}
