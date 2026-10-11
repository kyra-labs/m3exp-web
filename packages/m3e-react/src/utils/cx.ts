/** Drops `undefined` entries (for option types under exactOptionalPropertyTypes). */
export function defined<T extends object>(obj: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

/** Joins class names, skipping falsy entries. */
export const cx = (...names: (string | false | null | undefined)[]): string =>
  names.filter(Boolean).join(' ');
