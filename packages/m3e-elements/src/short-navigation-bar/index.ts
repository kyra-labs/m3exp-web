import { M3eNavigationItem } from '../navigation-item/navigation-item.js';
import { M3eShortNavigationBar } from './short-navigation-bar.js';

// Only the class (m3e-react exports the navigation types; one name per package in the umbrella).
// Registers <m3e-navigation-item> too (its class: the navigation-item.js entry).
export { M3eShortNavigationBar } from './short-navigation-bar.js';

M3eNavigationItem.define('m3e-navigation-item');
M3eShortNavigationBar.define('m3e-short-navigation-bar');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-short-navigation-bar': M3eShortNavigationBar;
  }
}
