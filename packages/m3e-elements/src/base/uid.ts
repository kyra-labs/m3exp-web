// Document-unique ids for code that more than one bundle can carry. The element entries load the
// layouts from dist (e.g. `@kyralabs/m3e-elements/date-field.js`), while m3e-react bundles the
// same layouts from source, so a module-level counter exists once per bundle and both copies
// start at 1: an element and a React docked date picker on one page both made
// `id="m3e-date-field-1"` (M11 a11y audit M2). The counters live on `globalThis` under a
// `Symbol.for` key instead, which every copy of this module resolves to the same slot.
// Internal: not exported from an entry of its own.

const COUNTERS = Symbol.for('@kyralabs/m3e-elements/uid');

type Counters = Partial<Record<string, number>>;

/** `<prefix>-<n>`, where n counts up per prefix across every copy of m3e-elements on the page. */
export function uid(prefix: string): string {
  const scope = globalThis as unknown as Record<symbol, Counters | undefined>;
  let counters = scope[COUNTERS];
  if (!counters) {
    counters = {};
    scope[COUNTERS] = counters;
  }
  const n = (counters[prefix] ?? 0) + 1;
  counters[prefix] = n;
  return `${prefix}-${String(n)}`;
}
