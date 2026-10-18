import { TYPEAHEAD_TIMEOUT_MS, typeSelectTarget } from '@kyralabs/m3e-motion';

/**
 * The typed string of a typeahead (React Aria useTypeSelect, shared by `<m3e-menu>` and
 * `<m3e-list>`): each printable key extends it, it clears TYPEAHEAD_TIMEOUT_MS after the last key
 * and as soon as nothing matches. Space extends it only while it is not empty (otherwise Space
 * belongs to the item).
 */
export class TypeSelect {
  #search = '';
  #timer: ReturnType<typeof setTimeout> | undefined;

  /** True while a typed string is pending (then Space is part of it). */
  get active(): boolean {
    return this.#search !== '';
  }

  /**
   * Handles `e` (a keydown): returns the index in `texts` to focus, or −1 when the key is not a
   * typeahead key or nothing matches. `from` is the focused item's index (−1: none).
   */
  type(e: KeyboardEvent, texts: readonly string[], from: number): number {
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return -1;
    if (e.key === ' ' && !this.active) return -1;
    this.#search += e.key;
    const found = typeSelectTarget(texts, from, this.#search);
    if (found < 0) {
      this.reset();
      return -1;
    }
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#search = '';
    }, TYPEAHEAD_TIMEOUT_MS);
    return found;
  }

  reset(): void {
    this.#search = '';
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }
}
