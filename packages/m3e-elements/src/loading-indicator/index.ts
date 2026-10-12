import { M3eLoadingIndicator } from './loading-indicator.js';

export {
  type LoadingIndicatorContract,
  M3eLoadingIndicator,
  renderLoadingIndicator,
} from './loading-indicator.js';

M3eLoadingIndicator.define('m3e-loading-indicator');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-loading-indicator': M3eLoadingIndicator;
  }
}
