import { M3eIcon } from './icon.js';

export { M3eIcon, renderIcon, type IconContract } from './icon.js';

M3eIcon.define('m3e-icon');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-icon': M3eIcon;
  }
}
