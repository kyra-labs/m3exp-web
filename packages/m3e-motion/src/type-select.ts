// Typeahead ("type to select") in a collection, as React Aria's useTypeSelect and
// ListKeyboardDelegate.getKeyForSearch do it: the item whose text starts with the typed string
// (compared with a base-sensitivity search collator: case and accents ignored), looking from the
// focused item to the end first, then from the start. Pure index math shared by m3e-elements'
// menu and interactive list; m3e-react gets it from React Aria.

/** React Aria useTypeSelect clears the typed string after this long (TYPEAHEAD_DEBOUNCE_WAIT_MS). */
export const TYPEAHEAD_TIMEOUT_MS = 1000;

let collator: Intl.Collator | undefined;

/**
 * Index of the first item in `texts` that starts with `search`, from `from` (the focused item,
 * −1: none) to the end, then from the start; −1 when none does.
 */
export function typeSelectTarget(texts: readonly string[], from: number, search: string): number {
  collator ??= new Intl.Collator(undefined, { usage: 'search', sensitivity: 'base' });
  const compare = collator;
  const matches = (text: string) =>
    text !== '' && compare.compare(text.slice(0, search.length), search) === 0;
  const start = Math.max(from, 0);
  for (let i = start; i < texts.length; i++) if (matches(texts[i]!)) return i;
  for (let i = 0; i < start; i++) if (matches(texts[i]!)) return i;
  return -1;
}
