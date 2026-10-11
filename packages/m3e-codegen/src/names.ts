// CSS custom-property naming (CLAUDE.md "Naming"):
//   --m3e-comp-<component>-<part>-<property>[-<state>]
// androidx names put states first (SelectedFocusedIconColor); the generator moves state words
// to the end in their original order (icon-color-selected-focused).

/** Words that are always interaction/selection states in component token names. */
export const STATE_WORDS: ReadonlySet<string> = new Set([
  'Disabled',
  'Dragged',
  'Error',
  'Focus',
  'Focused',
  'Hover',
  'Hovered',
  'Pressed',
  'Selected',
  'Unselected',
]);

/**
 * State words that are part names when followed by the given word. `Focus(ed)Indicator` is the
 * focus ring itself (e.g. CheckboxTokens.FocusIndicatorColor), not a focused state.
 * `Active`/`Inactive` are never treated as states: in the token set they mostly name parts
 * (ActiveIndicator, ActiveTrack, ActiveHandle).
 */
export const PART_COMPOUNDS: ReadonlyMap<string, string> = new Map([
  ['Focus', 'Indicator'],
  ['Focused', 'Indicator'],
]);

/** Splits PascalCase into words: `XSmallIconButton` → X, Small, Icon, Button; `Level1` stays. */
export function words(name: string): string[] {
  return name.match(/[A-Z](?:[a-z]+|[A-Z]*(?![a-z]))\d*|\d+/g) ?? [];
}

export const kebab = (parts: readonly string[]): string =>
  parts.map((w) => w.toLowerCase()).join('-');

export const kebabName = (name: string): string => kebab(words(name));

/** Moves state words to the end, preserving their relative order. */
export function reorderStates(parts: readonly string[]): string[] {
  const rest: string[] = [];
  const states: string[] = [];
  parts.forEach((word, i) => {
    const isPart = PART_COMPOUNDS.get(word) === parts[i + 1];
    (STATE_WORDS.has(word) && !isPart ? states : rest).push(word);
  });
  return [...rest, ...states];
}

/** `FilledButtonTokens` → `filled-button`. */
export const componentName = (object: string): string => kebabName(object.replace(/Tokens$/, ''));

/**
 * Component token variable for `member`, optionally extended with sub-property words (typography
 * fields, logical corners) that sit before the states. `reorder: false` keeps upstream word order;
 * the generator uses it when reordering two different members would produce the same name.
 */
export function compVar(
  object: string,
  member: string,
  extra: readonly string[] = [],
  reorder = true,
): string {
  const parts = [...words(member), ...extra];
  return `--m3e-comp-${componentName(object)}-${kebab(reorder ? reorderStates(parts) : parts)}`;
}
