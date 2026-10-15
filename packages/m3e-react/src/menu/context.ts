import type { MenuPopup } from '@kyralabs/m3e-elements/menu-popup.js';
import type { MenuAnchorPosition } from '@kyralabs/m3e-motion';
import { type KeyboardEvent, type RefObject, createContext } from 'react';
import type { RootMenuTriggerState } from 'react-stately';

/** What a `<Menu>` rendered as a popup needs from its trigger (root) or submenu trigger item. */
export interface MenuPopupContextValue {
  isOpen: boolean;
  /** `first` / `last` focus an item on open; null focuses the menu itself. */
  focusStrategy: 'first' | 'last' | null;
  close: () => void;
  /** Closes the whole chain (an action was performed). */
  closeAll: () => void;
  /** Shared by the root menu and its submenus (react-stately `useMenuTriggerState`). */
  rootState: RootMenuTriggerState;
  anchorRef: RefObject<HTMLElement | null>;
  /** The id the menu gets, so the trigger can point `aria-controls` at it. */
  menuId: string;
  /** Labels the menu when it has no `aria-label`. */
  labelledBy: string;
  /** Default placement (`below` for a trigger, `end` for a submenu). */
  position: MenuAnchorPosition;
  /** The popup of the parent menu (submenus only), for light dismiss. */
  parentPopup: RefObject<MenuPopup | null> | null;
  /** Submenus: ref RA's useSubmenuTrigger watches; key handlers it returns. */
  submenuRef?: RefObject<HTMLDivElement | null>;
  onKeyDown?: ((e: KeyboardEvent) => void) | undefined;
  onKeyUp?: ((e: KeyboardEvent) => void) | undefined;
}

export const MenuPopupContext = /* @__PURE__ */ createContext<MenuPopupContextValue | null>(null);
