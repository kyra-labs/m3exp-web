import { M3ePullToRefresh } from './pull-to-refresh.js';

// Only the class (m3e-react exports its own PullToRefresh; one name per package in the umbrella).
// PullToRefreshLayout has its own entry (pull-to-refresh-layout.js).
export { M3ePullToRefresh } from './pull-to-refresh.js';

M3ePullToRefresh.define('m3e-pull-to-refresh');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-pull-to-refresh': M3ePullToRefresh;
  }
}
