import { M3eFabMenu, M3eFabMenuItem } from './fab-menu.js';

// Only the classes: m3e-react exports the FabMenu types and fabMenuClassName (one name per
// package in the umbrella).
export {
  M3eFabMenu,
  M3eFabMenuItem,
  type FabMenuActionDetail,
  type M3eFabMenuEventMap,
  type M3eFabMenuItemEventMap,
} from './fab-menu.js';

M3eFabMenuItem.define('m3e-fab-menu-item');
M3eFabMenu.define('m3e-fab-menu');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-fab-menu': M3eFabMenu;
    'm3e-fab-menu-item': M3eFabMenuItem;
  }
}
