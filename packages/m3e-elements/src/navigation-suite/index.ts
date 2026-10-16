import { M3eNavigationItem } from '../navigation-item/navigation-item.js';
import { M3eNavigationSuite } from './navigation-suite.js';

// Only the class (m3e-react exports the navigation types; one name per package in the umbrella).
// Registers <m3e-navigation-item> too. NavigationSuiteLayout has its own entry
// (navigation-suite-layout.js).
export { M3eNavigationSuite } from './navigation-suite.js';

M3eNavigationItem.define('m3e-navigation-item');
M3eNavigationSuite.define('m3e-navigation-suite');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-navigation-suite': M3eNavigationSuite;
  }
}
