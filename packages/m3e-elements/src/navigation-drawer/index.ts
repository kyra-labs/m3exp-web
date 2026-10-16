import { M3eNavigationItem } from '../navigation-item/navigation-item.js';
import { M3eNavigationDrawer } from './navigation-drawer.js';

// Only the class (m3e-react exports the navigation types; one name per package in the umbrella).
// Registers <m3e-navigation-item> too. NavigationDrawerLayout has its own entry
// (navigation-drawer-layout.js).
export { M3eNavigationDrawer } from './navigation-drawer.js';

M3eNavigationItem.define('m3e-navigation-item');
M3eNavigationDrawer.define('m3e-navigation-drawer');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-navigation-drawer': M3eNavigationDrawer;
  }
}
