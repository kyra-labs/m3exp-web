import { RovingFocus } from '../roving-focus/roving-focus.js';

/** The focusable part of each chip: the chip itself, or a filter chip's native checkbox. */
const ITEMS =
  ':scope > :is(.m3e-assist-chip, .m3e-suggestion-chip, .m3e-input-chip), :scope > .m3e-filter-chip > .m3e-filter-chip__input';
const INPUT_CHIP = 'm3e-input-chip';
/** Keys that remove the focused input chip (m3.material.io Chips › Accessibility). */
const REMOVE_KEYS: ReadonlySet<string> = new Set(['Backspace', 'Delete']);
/** React Aria's remove button label (@react-aria/tag `removeButtonLabel`, en-US). */
export const CHIP_REMOVE_LABEL = 'Remove';
/** React Aria's description of a removable tag (@react-aria/tag `removeDescription`, en-US). */
export const CHIP_REMOVE_DESCRIPTION = 'Press Delete to remove tag.';

let sets = 0;

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

const isDisabled = (el: Element): boolean =>
  el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';

/** An input chip's key: `data-value`, else its label (spaces removed, as React Aria's ids). */
export const inputChipValue = (chip: Element): string =>
  chip.getAttribute('data-value') ??
  (chip.querySelector('.m3e-input-chip__label')?.textContent ?? '').trim();

export interface ChipSetLayoutOptions {
  /**
   * An input chip is to be removed (Backspace / Delete while it has focus, or its remove button).
   * The caller removes it (or not); the layout only reports it.
   */
  onRemove?: ((chip: HTMLElement) => void) | undefined;
  /** Id of an element holding CHIP_REMOVE_DESCRIPTION: the input chips' `aria-describedby`. */
  descriptionId?: (() => string | undefined) | undefined;
  /** Prefix for the ids of input chips and their remove buttons. Default (or ''): a unique one. */
  idPrefix?: (() => string | undefined) | undefined;
}

/**
 * Behavior of a `.m3e-chip-set` (COMPONENT_SPEC §18), shared by `<m3e-chip-set>` and m3e-react's
 * `<ChipSet>`, so both write one DOM contract:
 *
 * - **Focus:** one tab stop for the whole set and arrow keys between the chips (m3e-elements
 *   RovingFocus: ArrowLeft / ArrowRight mirrored in RTL, Home / End, no wrapping;
 *   m3.material.io: "Arrow keys move focus between chips"). The items are the chips (a filter
 *   chip's native checkbox); natively disabled ones and `aria-disabled` input chips are skipped,
 *   as React Aria's TagGroup skips disabled tags.
 * - **Input chips** (owner decision M8 #10): the set is a `role="grid"` of `role="row"` chips with
 *   one `role="gridcell"` each, wired as React Aria's TagGroup wires them: row ids
 *   (`<prefix>-<value>`), `aria-label` = the label text, the remove button
 *   (`.m3e-input-chip__remove`) out of the tab order and labelled "Remove <label>"
 *   (`aria-labelledby` = itself and the row), disabled with its chip, and the live-region
 *   attributes. Backspace or Delete on a focused input chip, or a press on its remove button,
 *   calls `onRemove(chip)`.
 *
 * Call `update()` after the chips change (it also runs on child-list mutations).
 */
export class ChipSetLayout {
  readonly root: HTMLElement;
  #focus: RovingFocus;
  #options: ChipSetLayoutOptions;
  #abort = new AbortController();
  #mutations: MutationObserver;
  #prefix = `m3e-chip-set-${String(++sets)}`;

  constructor(root: HTMLElement, options: ChipSetLayoutOptions = {}) {
    this.root = root;
    this.#options = options;
    this.#focus = new RovingFocus(root, {
      items: () => this.items(),
    });
    const { signal } = this.#abort;
    root.addEventListener(
      'keydown',
      (e) => {
        if (!REMOVE_KEYS.has(e.key) || e.defaultPrevented || e.repeat) return;
        const chip = e.target instanceof HTMLElement ? e.target : null;
        if (!chip?.classList.contains(INPUT_CHIP) || chip.parentElement !== root) return;
        if (isDisabled(chip)) return;
        e.preventDefault();
        this.#options.onRemove?.(chip);
      },
      { signal },
    );
    root.addEventListener(
      'click',
      (e) => {
        const button =
          e.target instanceof Element ? e.target.closest('.m3e-input-chip__remove') : null;
        const chip = button?.closest<HTMLElement>(`.${INPUT_CHIP}`);
        if (!button || chip?.parentElement !== root || isDisabled(button)) return;
        this.#options.onRemove?.(chip);
      },
      { signal },
    );
    root.addEventListener(
      'focusin',
      () => {
        this.#live();
      },
      { signal },
    );
    root.addEventListener(
      'focusout',
      (e) => {
        if (!(e.relatedTarget instanceof Node && root.contains(e.relatedTarget))) this.#live(false);
      },
      { signal },
    );
    this.#mutations = new MutationObserver(() => {
      this.update();
    });
    this.#mutations.observe(root, { childList: true });
    this.update();
  }

  /** The chips' focusable parts, in order. */
  items(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(ITEMS)].filter(
      (el) =>
        !(el as HTMLInputElement).disabled &&
        !(el.classList.contains(INPUT_CHIP) && isDisabled(el)) &&
        (typeof el.checkVisibility !== 'function' ||
          el.checkVisibility({ visibilityProperty: true })),
    );
  }

  /** The set's input chips. */
  inputChips(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>(`:scope > .${INPUT_CHIP}`)];
  }

  /** Re-wires the input chips' ARIA and the tab stop. */
  update(): void {
    const chips = this.inputChips();
    if (chips.length > 0) {
      setAttr(this.root, 'role', 'grid');
      setAttr(this.root, 'aria-atomic', 'false');
      setAttr(this.root, 'aria-relevant', 'additions');
      if (!this.root.hasAttribute('aria-live')) this.#live(false);
    }
    const custom = this.#options.idPrefix?.();
    const prefix = custom === undefined || custom === '' ? this.#prefix : custom;
    for (const chip of chips) {
      const key = inputChipValue(chip).replace(/\s*/g, '');
      const id = `${prefix}-${key}`;
      const label = (chip.querySelector('.m3e-input-chip__label')?.textContent ?? '').trim();
      setAttr(chip, 'role', 'row');
      setAttr(chip, 'id', id);
      setAttr(chip, 'aria-label', label || null);
      setAttr(chip, 'aria-describedby', this.#options.descriptionId?.() ?? null);
      const cell = chip.querySelector(':scope > .m3e-input-chip__cell');
      if (cell) {
        setAttr(cell, 'role', 'gridcell');
        setAttr(cell, 'aria-colindex', '1');
      }
      const remove = chip.querySelector<HTMLButtonElement>('.m3e-input-chip__remove');
      if (remove) {
        const buttonId = `${id}-remove`;
        setAttr(remove, 'type', 'button');
        setAttr(remove, 'id', buttonId);
        setAttr(remove, 'tabindex', '-1');
        setAttr(remove, 'aria-label', CHIP_REMOVE_LABEL);
        setAttr(remove, 'aria-labelledby', `${buttonId} ${id}`);
        remove.disabled = isDisabled(chip);
      }
      if (isDisabled(chip)) setAttr(chip, 'tabindex', '-1');
    }
    this.#focus.update();
  }

  /** The chip to focus after `chip` is removed: the next one, else the previous one. */
  focusAfterRemoving(chip: HTMLElement): HTMLElement | null {
    const items = this.items();
    const index = items.findIndex((el) => el === chip || chip.contains(el));
    if (index < 0) return null;
    return items[index + 1] ?? items[index - 1] ?? null;
  }

  destroy(): void {
    this.#abort.abort();
    this.#mutations.disconnect();
    this.#focus.destroy();
  }

  /** React Aria's TagGroup announces additions politely while focus is inside. */
  #live(within = true): void {
    if (this.inputChips().length === 0) return;
    setAttr(this.root, 'aria-live', within ? 'polite' : 'off');
  }
}
