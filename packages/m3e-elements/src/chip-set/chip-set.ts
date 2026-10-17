import { M3eElement } from '../base/M3eElement.js';
import {
  CHIP_REMOVE_DESCRIPTION,
  ChipSetLayout,
  inputChipValue,
} from '../chip-set-layout/chip-set-layout.js';

const BLOCK = 'm3e-chip-set';

let instances = 0;

/** Sets (or, for null, removes) an attribute, touching the DOM only when it changes. */
const setAttr = (el: Element, name: string, value: string | null): void => {
  if (value === null) el.removeAttribute(name);
  else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

/** Detail of the `remove` event. */
export interface ChipSetRemoveDetail {
  /** The input chip's `data-value`, else its label. */
  value: string;
  /** The `.m3e-input-chip` element. */
  chip: HTMLElement;
}

/**
 * `<m3e-chip-set label="Recipients">…chips…</m3e-chip-set>` (COMPONENT_SPEC §18; owner decisions
 * M8 #10 and #15). Renders the m3e-css `.m3e-chip-set` contract inside itself (the host is
 * `display: contents`) and moves its children, chips in the m3e-css markup, into it. It exists for
 * what CSS cannot do (m3e-elements ChipSetLayout, shared with m3e-react's `<ChipSet>`):
 *
 * - One tab stop for the set and arrow keys between the chips (Home / End; mirrored in RTL).
 * - Input chips (`.m3e-input-chip`): the set becomes a `role="grid"` of rows wired as React
 *   Aria's TagGroup (m3e-react `<InputChipGroup>` renders the same DOM), and Backspace or Delete
 *   on a focused input chip, or a press on its remove button, emits `remove`
 *   (`detail: { value, chip }`, cancelable). Unless it is canceled, the chip is removed and the
 *   focus moves to the next chip (else the previous one, else the set).
 * - Without input chips the set is a `role="group"`.
 *
 * Attributes: `label` (the set's accessible name), `single-line` (one scrolling row,
 * Compose's ChipGroupSingleLineSample; default: chips wrap, ChipGroupReflowSample).
 */
export class M3eChipSet extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    label: {},
    singleLine: { type: Boolean },
  };

  declare label: string | null | undefined;
  declare singleLine: boolean | undefined;

  #root: HTMLDivElement | undefined;
  #layout: ChipSetLayout | undefined;
  #observer: MutationObserver | undefined;
  /** The hidden "Press Delete to remove tag." the input chips are described by. */
  #description: HTMLSpanElement | undefined;
  #instance = ++instances;

  /** The rendered `.m3e-chip-set`. */
  get setElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** ChipSetLayout's behavior, while connected. */
  get layout(): ChipSetLayout | undefined {
    return this.#layout;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
    // Chips added to the host (not to the rendered set) are moved in on the next update.
    this.#observer = new MutationObserver(() => {
      if ([...this.childNodes].some((n) => n !== this.#root && n !== this.#description)) {
        this.requestUpdate();
      }
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  protected override update(): void {
    const root = (this.#root ??= this.ownerDocument.createElement('div'));
    root.className = this.singleLine ? `${BLOCK} ${BLOCK}--single-line` : BLOCK;
    const moved = [...this.childNodes].filter((n) => n !== root && n !== this.#description);
    if (root.parentNode !== this) this.prepend(root);
    if (moved.length > 0) root.append(...moved);
    setAttr(root, 'aria-label', this.label ?? null);
    const inputChips = root.querySelector(':scope > .m3e-input-chip') !== null;
    if (inputChips && !this.#description) {
      // React Aria's TagGroup describes removable tags (in keyboard modality) the same way.
      const description = (this.#description = this.ownerDocument.createElement('span'));
      description.id = `${this.id || BLOCK}-${String(this.#instance)}-description`;
      description.hidden = true;
      description.textContent = CHIP_REMOVE_DESCRIPTION;
      this.append(description);
    }
    this.#layout ??= new ChipSetLayout(root, {
      onRemove: (chip) => {
        this.#remove(chip);
      },
      idPrefix: () => this.id,
      descriptionId: () => this.#description?.id,
    });
    if (!inputChips) setAttr(root, 'role', 'group');
    this.#layout.update();
  }

  #remove(chip: HTMLElement): void {
    const detail: ChipSetRemoveDetail = { value: inputChipValue(chip), chip };
    if (!this.emit('remove', detail, { cancelable: true })) return;
    const layout = this.#layout;
    const next = layout?.focusAfterRemoving(chip) ?? null;
    const hadFocus = chip.contains(this.ownerDocument.activeElement);
    chip.remove();
    if (!hadFocus) return;
    if (next) {
      next.focus();
    } else if (this.#root) {
      this.#root.tabIndex = -1;
      this.#root.focus();
    }
  }
}
