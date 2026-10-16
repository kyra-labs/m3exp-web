import { attachRipple } from '../base/ripple.js';
import {
  type M3eNavigationItem,
  setItemAttributes,
  span,
} from '../navigation-item/navigation-item.js';

// The `.m3e-navigation-drawer-item` contract (Compose NavigationDrawerItem) for an
// `<m3e-navigation-item>`, shared by <m3e-navigation-drawer> and <m3e-navigation-suite> (its
// drawer type) so both render what m3e-react's drawer item renders.

const ITEM = 'm3e-navigation-drawer-item';

/** Builds a new drawer item's fixed DOM on `el` (`<a>` or `<button>`): the class and the ripple. */
export function createDrawerItemElement(el: HTMLElement, signal: AbortSignal): void {
  el.className = ITEM;
  attachRipple(el, signal);
}

/** NavigationDrawerItem: [icon] label [badge], plus the link / button attributes. */
export function fillDrawerItemElement(
  doc: Document,
  item: M3eNavigationItem,
  el: HTMLElement,
  selected: boolean,
): void {
  setItemAttributes(el, item, selected);
  const label = item.textContent.trim();
  const part = (name: string) => el.querySelector<HTMLSpanElement>(`:scope > .${ITEM}__${name}`);
  const parts: HTMLSpanElement[] = [];
  if (item.icon) {
    const icon = part('icon') ?? span(doc, `m3e-icon ${ITEM}__icon`);
    if (icon.textContent !== item.icon) icon.textContent = item.icon;
    parts.push(icon);
  }
  const text = part('label') ?? span(doc, `${ITEM}__label`, undefined, false);
  if (text.textContent !== label) text.textContent = label;
  parts.push(text);
  if (item.badge) {
    const badge = part('badge') ?? span(doc, `${ITEM}__badge`, undefined, false);
    if (badge.textContent !== item.badge) badge.textContent = item.badge;
    parts.push(badge);
  }
  const current = [...el.children];
  if (current.length !== parts.length || parts.some((p, i) => current[i] !== p)) {
    el.replaceChildren(...parts);
  }
}
