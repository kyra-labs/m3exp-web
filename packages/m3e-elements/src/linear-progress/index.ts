import { M3eLinearProgress } from './linear-progress.js';

export { M3eLinearProgress } from './linear-progress.js';

M3eLinearProgress.define('m3e-linear-progress');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-linear-progress': M3eLinearProgress;
  }
}
