import { M3eMenu, M3eMenuGroup, M3eMenuItem } from './menu.js';

export { M3eMenu, M3eMenuGroup, M3eMenuItem, type MenuFocusStrategy } from './menu.js';

M3eMenuItem.define('m3e-menu-item');
M3eMenuGroup.define('m3e-menu-group');
M3eMenu.define('m3e-menu');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-menu': M3eMenu;
    'm3e-menu-item': M3eMenuItem;
    'm3e-menu-group': M3eMenuGroup;
  }
}
