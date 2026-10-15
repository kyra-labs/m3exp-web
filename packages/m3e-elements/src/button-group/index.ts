import { M3eButtonGroup, M3eButtonGroupItem } from './button-group.js';

export { BUTTON_GROUP_MORE_OPTIONS, M3eButtonGroup, M3eButtonGroupItem } from './button-group.js';

M3eButtonGroupItem.define('m3e-button-group-item');
M3eButtonGroup.define('m3e-button-group');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-button-group': M3eButtonGroup;
    'm3e-button-group-item': M3eButtonGroupItem;
  }
}
