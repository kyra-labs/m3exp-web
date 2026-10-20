import { M3eList } from './list.js';

// Only the class and its event details (m3e-react exports List / ListItem; one name per package
// in the umbrella). Registers <m3e-list>. ListLayout and the contract helpers have their own
// entry (list-layout.js).
export {
  M3eList,
  type ListActionDetail,
  type ListSelectionChangeDetail,
  type M3eListEventMap,
} from './list.js';

M3eList.define('m3e-list');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-list': M3eList;
  }
}
