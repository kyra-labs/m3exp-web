import { M3eSnackbarHost } from './snackbar-host.js';

// Only the class (m3e-react exports its own snackbar components; one name per package in the
// umbrella). SnackbarHostState and the host behavior have their own entry (snackbar-layout.js).
export { M3eSnackbarHost } from './snackbar-host.js';

M3eSnackbarHost.define('m3e-snackbar-host');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-snackbar-host': M3eSnackbarHost;
  }
}
