import { M3eNavigationItem } from '../navigation-item/navigation-item.js';
import { M3eWideNavigationRail } from './wide-navigation-rail.js';

// Only the class (m3e-react exports the navigation types; one name per package in the umbrella).
// Registers <m3e-navigation-item> too. WideNavigationRailLayout has its own entry
// (wide-navigation-rail-layout.js).
export { M3eWideNavigationRail } from './wide-navigation-rail.js';

M3eNavigationItem.define('m3e-navigation-item');
M3eWideNavigationRail.define('m3e-wide-navigation-rail');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-wide-navigation-rail': M3eWideNavigationRail;
  }
}
