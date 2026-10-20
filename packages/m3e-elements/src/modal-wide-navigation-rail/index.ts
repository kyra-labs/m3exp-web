import { M3eNavigationItem } from '../navigation-item/navigation-item.js';
import { M3eModalWideNavigationRail } from './modal-wide-navigation-rail.js';

// Only the class (m3e-react exports the navigation types; one name per package in the umbrella).
// Registers <m3e-navigation-item> too.
export {
  M3eModalWideNavigationRail,
  type M3eModalWideNavigationRailEventMap,
} from './modal-wide-navigation-rail.js';

M3eNavigationItem.define('m3e-navigation-item');
M3eModalWideNavigationRail.define('m3e-modal-wide-navigation-rail');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-modal-wide-navigation-rail': M3eModalWideNavigationRail;
  }
}
