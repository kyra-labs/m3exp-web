import { badgeLabelText, badgeValueText } from '@kyralabs/m3e-motion';

// The m3e-css `.m3e-badged-box` / `.m3e-badge` contract (COMPONENT_SPEC §34), exactly as m3e-react's
// <BadgedBox> / <Badge> render it, for the elements that build a badge into their items: the
// navigation bar / rail / suite destinations and tabs (owner decisions M9 #6, #7, #30).

/** What a `badge` / `badge-label` attribute pair shows: `text` null is the dot. */
export interface BadgeContent {
  text: string | null;
  /** The visually hidden text that joins the item's name ('' leaves it out). */
  label: string;
}

/**
 * Reads a `badge` attribute (absent: no badge; `""`: the dot; digits: a count, `999+` above 999;
 * other text as is) and its `badge-label` (the hidden text; default "New notification" for the
 * dot, the shown text otherwise).
 */
export function badgeContent(
  badge: string | null | undefined,
  label: string | null | undefined,
): BadgeContent | null {
  if (badge === null || badge === undefined) return null;
  const text = badgeValueText(badge);
  return { text, label: badgeLabelText(text, label) };
}

/** An item's accessible name when an `aria-label` replaces its content: the label, then the badge. */
export const nameWithBadge = (label: string, badge: BadgeContent | null): string =>
  badge?.label ? `${label} ${badge.label}` : label;

const make = (doc: Document, className: string, hidden = false): HTMLSpanElement => {
  const el = doc.createElement('span');
  el.className = className;
  if (hidden) el.setAttribute('aria-hidden', 'true');
  return el;
};

const setChildren = (parent: Element, children: readonly Element[]): void => {
  const current = [...parent.children];
  if (current.length !== children.length || children.some((c, i) => current[i] !== c)) {
    parent.replaceChildren(...children);
  }
};

/**
 * Renders (reusing `box` when given) `<span class="m3e-badged-box">{anchor}<span class="m3e-badge">`
 * — `--large` with an `aria-hidden` `__text` when it has text, then the hidden `__label` unless
 * `withLabel` is false (the item's `aria-label` carries it instead) or the label is empty.
 */
export function renderBadgedBox(
  doc: Document,
  box: Element | null,
  anchor: Element,
  content: BadgeContent,
  withLabel = true,
): HTMLSpanElement {
  const root = (box as HTMLSpanElement | null) ?? make(doc, 'm3e-badged-box');
  const badge =
    root.querySelector<HTMLSpanElement>(':scope > .m3e-badge') ?? make(doc, 'm3e-badge');
  const large = content.text !== null;
  const className = large ? 'm3e-badge m3e-badge--large' : 'm3e-badge';
  if (badge.className !== className) badge.className = className;
  const parts: HTMLSpanElement[] = [];
  if (content.text !== null) {
    const text =
      badge.querySelector<HTMLSpanElement>(':scope > .m3e-badge__text') ??
      make(doc, 'm3e-badge__text', true);
    if (text.textContent !== content.text) text.textContent = content.text;
    parts.push(text);
  }
  if (withLabel && content.label) {
    const label =
      badge.querySelector<HTMLSpanElement>(':scope > .m3e-badge__label') ??
      make(doc, 'm3e-badge__label');
    if (label.textContent !== content.label) label.textContent = content.label;
    parts.push(label);
  }
  setChildren(badge, parts);
  setChildren(root, [anchor, badge]);
  return root;
}
