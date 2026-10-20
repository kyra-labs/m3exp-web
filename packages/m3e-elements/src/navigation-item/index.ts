import { M3eNavigationItem } from './navigation-item.js';

// The data element of the navigation bar / rail elements (each of their entries registers it too).
export { M3eNavigationItem, type M3eNavigationContainerEventMap } from './navigation-item.js';

M3eNavigationItem.define('m3e-navigation-item');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-navigation-item': M3eNavigationItem;
  }
}
