// The meta description of a component page, built from the same data as its facts line (the
// layers come from src/data/components.ts and the generated API), so it names only the layers the
// page documents and stays unique per page. Search results show up to 160 characters, and
// scripts/check-seo.js asks for 50–160.

/** Which layers a component page documents. */
export interface ComponentLayers {
  css: boolean;
  elements: boolean;
  react: boolean;
}

const MIN = 50;
const MAX = 160;

/** "A, B and C". */
const listOf = (items: string[]) =>
  [items.slice(0, -1).join(', '), items.at(-1)].filter(Boolean).join(' and ');

/** The title inside a sentence: "Date pickers" → "date pickers", "FAB menu" stays. */
const inSentence = (title: string) =>
  /^[A-Z][a-z]/.test(title) ? title.charAt(0).toLowerCase() + title.slice(1) : title;

/**
 * The summary, then shorter versions of it that end at a sentence, clause or comma break, longest
 * first. Commas after a colon or semicolon separate list items, so it never cuts there: the
 * shorter text would read as the whole list.
 */
function shortenings(summary: string): string[] {
  const listStart = summary.search(/[:;]/);
  const cuts = [...summary.matchAll(/[.;:,](?=\s)/g)]
    .map((m) => m.index)
    .filter((i) => summary[i] !== ',' || listStart < 0 || i < listStart);
  return [summary, ...cuts.reverse().map((i) => `${summary.slice(0, i)}.`)];
}

/**
 * "Material 3 Expressive date pickers for the web in CSS, web components and React." followed by
 * as much of the summary as fits in 160 characters. Custom elements are named "web components",
 * the term people search for. Falls back to the summary when nothing fits.
 */
export function componentDescription(
  title: string,
  summary: string,
  layers: ComponentLayers,
): string {
  const names = [
    layers.css && 'CSS',
    layers.elements && 'web components',
    layers.react && 'React',
  ].filter((name): name is string => Boolean(name));
  const lead = `Material 3 Expressive ${inSentence(title)} for the web${
    names.length > 0 ? ` in ${listOf(names)}` : ''
  }.`;
  const candidates = [...shortenings(summary).map((text) => `${lead} ${text}`), lead];
  return candidates.find((text) => text.length >= MIN && text.length <= MAX) ?? summary;
}
