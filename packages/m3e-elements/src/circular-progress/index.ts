import { M3eCircularProgress } from './circular-progress.js';

export { M3eCircularProgress } from './circular-progress.js';

M3eCircularProgress.define('m3e-circular-progress');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-circular-progress': M3eCircularProgress;
  }
}
