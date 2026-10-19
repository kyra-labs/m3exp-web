import { badgeContent, nameWithBadge, renderBadgedBox } from '../base/badge.js';
import { attachRipple } from '../base/ripple.js';
import { type M3eNavigationItem, setAttr, setItemAttributes, span } from './navigation-item.js';

// The `.m3e-navigation-item` contract (navigation-item.css) for an `<m3e-navigation-item>`, as
// m3e-react's NavigationItem renders it, shared by the short navigation bar, the wide / modal
// rails and the navigation suite's bar and rail types (the drawer renders drawer-item.js).

const ITEM = 'm3e-navigation-item';

/** Builds a new item's fixed DOM inside `el` (`<a>` or `<button>`) and its ripple. */
export function createItemElement(doc: Document, el: HTMLElement, signal: AbortSignal): void {
  el.className = ITEM;
  const content = span(doc, `${ITEM}__content`, undefined, false);
  const state = span(doc, `${ITEM}__state`);
  content.append(span(doc, `${ITEM}__indicator`), state);
  el.append(content);
  attachRipple(state, signal, el);
}

/**
 * Writes an item's attributes (React Aria's link / button attributes) and content: indicator,
 * state layer, then the icon and the label — or, with a badge (Compose BadgedBox in the icon), the
 * label and then the icon in a badged box, so the badge's hidden text is read after the label
 * (owner decision M9 #7). Without a label, the `aria-label` carries the badge's text.
 */
export function fillItemElement(
  doc: Document,
  item: M3eNavigationItem,
  el: HTMLElement,
  selected: boolean,
): void {
  const label = item.textContent.trim();
  const badge = badgeContent(item.badge, item.badgeLabel);
  setItemAttributes(el, item, selected);
  setAttr(el, 'aria-label', item.labelHidden ? nameWithBadge(label, badge) : null);
  const content = el.firstElementChild;
  if (!content) return;
  const parts = [
    ...content.querySelectorAll(`:scope > .${ITEM}__indicator, :scope > .${ITEM}__state`),
  ];
  const icon = content.querySelector(`.${ITEM}__icon`) ?? span(doc, `m3e-icon ${ITEM}__icon`);
  if (icon.textContent !== (item.icon ?? '')) icon.textContent = item.icon ?? '';
  let text: Element | null = null;
  if (!item.labelHidden) {
    text =
      content.querySelector(`:scope > .${ITEM}__label`) ??
      span(doc, `${ITEM}__label`, undefined, false);
    if (text.textContent !== label) text.textContent = label;
  }
  if (badge) {
    const box = content.querySelector(':scope > .m3e-badged-box');
    if (text) parts.push(text);
    parts.push(renderBadgedBox(doc, box, icon, badge, !item.labelHidden));
  } else {
    parts.push(icon);
    if (text) parts.push(text);
  }
  const current = [...content.children];
  if (current.length !== parts.length || parts.some((p, i) => current[i] !== p)) {
    content.replaceChildren(...parts);
  }
}
