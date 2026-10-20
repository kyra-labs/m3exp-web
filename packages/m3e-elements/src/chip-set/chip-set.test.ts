import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.js';
import type { ChipSetRemoveDetail, M3eChipSet } from './chip-set.js';

const flush = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

const mount = async (html: string) => {
  document.body.innerHTML = html;
  await flush();
  return document.body.firstElementChild as M3eChipSet;
};

const key = (el: Element, k: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

const inputChip = (label: string, attrs = '') =>
  `<div class="m3e-input-chip"${attrs}><div class="m3e-input-chip__cell"><span class="m3e-input-chip__label">${label}</span><button class="m3e-input-chip__remove"><span class="m3e-icon" aria-hidden="true">close</span></button></div></div>`;

const filterChip = (label: string, attrs = '') =>
  `<label class="m3e-filter-chip"><input class="m3e-filter-chip__input" type="checkbox"${attrs} /><span class="m3e-filter-chip__leading" aria-hidden="true"><span class="m3e-icon m3e-filter-chip__check" data-fill>check</span></span><span class="m3e-filter-chip__label">${label}</span></label>`;

afterEach(() => {
  document.body.replaceChildren();
});

describe('<m3e-chip-set>', () => {
  it('renders .m3e-chip-set inside itself and moves the chips in; a group without input chips', async () => {
    const el = await mount(
      `<m3e-chip-set label="Diet">${filterChip('Vegan')}${filterChip('Halal', ' disabled')}${filterChip('Kosher')}</m3e-chip-set>`,
    );
    expect(el.style.display).toBe('contents');
    expect(el.children).toHaveLength(1);
    const root = el.setElement!;
    expect(root.className).toBe('m3e-chip-set');
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-label')).toBe('Diet');
    expect(root.querySelectorAll('.m3e-filter-chip')).toHaveLength(3);
    // One tab stop; the disabled checkbox is skipped.
    const inputs = [...root.querySelectorAll('input')];
    expect(inputs.map((i) => i.getAttribute('tabindex'))).toEqual(['0', null, '-1']);
    inputs[0]!.focus();
    key(inputs[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(inputs[2]);
  });

  it('the arrows wrap at both ends, as React Aria TagGroup (LTR and RTL)', async () => {
    const chips = `${filterChip('A')}${filterChip('B')}${filterChip('C')}`;
    for (const [dir, next, previous] of [
      ['ltr', 'ArrowRight', 'ArrowLeft'],
      ['rtl', 'ArrowLeft', 'ArrowRight'],
    ] as const) {
      document.body.innerHTML = `<div dir="${dir}" style="direction: ${dir}"><m3e-chip-set>${chips}</m3e-chip-set></div>`;
      await flush();
      const [a, b, c] = [...document.querySelectorAll('input')] as [
        HTMLInputElement,
        HTMLInputElement,
        HTMLInputElement,
      ];
      c.focus();
      key(c, next);
      expect(document.activeElement, dir).toBe(a);
      key(a, previous);
      expect(document.activeElement, dir).toBe(c);
      key(c, previous);
      expect(document.activeElement, dir).toBe(b);
      expect(b.getAttribute('tabindex'), dir).toBe('0');
    }
  });

  it('wrapping skips disabled chips at the ends', async () => {
    const el = await mount(
      `<m3e-chip-set>${inputChip('A', ' aria-disabled="true"')}${inputChip('B')}${inputChip('C')}${filterChip('D', ' disabled')}</m3e-chip-set>`,
    );
    const [, b, c] = [...el.setElement!.querySelectorAll<HTMLElement>('.m3e-input-chip')];
    c!.focus();
    key(c!, 'ArrowRight');
    expect(document.activeElement).toBe(b);
    key(b!, 'ArrowLeft');
    expect(document.activeElement).toBe(c);
  });

  it('single-line adds the modifier', async () => {
    const el = await mount(`<m3e-chip-set single-line>${filterChip('A')}</m3e-chip-set>`);
    expect(el.setElement!.className).toBe('m3e-chip-set m3e-chip-set--single-line');
  });

  it('input chips: a grid of rows wired as React Aria TagGroup', async () => {
    const el = await mount(
      `<m3e-chip-set id="to" label="To">${inputChip('Ada Lovelace', ' data-value="ada"')}${inputChip('Grace')}</m3e-chip-set>`,
    );
    const root = el.setElement!;
    expect(root.getAttribute('role')).toBe('grid');
    expect(root.getAttribute('aria-live')).toBe('off');
    const [ada, grace] = [...root.querySelectorAll<HTMLElement>('.m3e-input-chip')];
    expect(ada!.getAttribute('role')).toBe('row');
    expect(ada!.id).toBe('to-ada');
    expect(grace!.id).toBe('to-Grace');
    expect(ada!.getAttribute('aria-label')).toBe('Ada Lovelace');
    const description = document.getElementById(ada!.getAttribute('aria-describedby')!)!;
    expect(description.hidden).toBe(true);
    expect(description.textContent).toBe('Press Delete to remove tag.');
    expect(ada!.getAttribute('tabindex')).toBe('0');
    expect(grace!.getAttribute('tabindex')).toBe('-1');
    expect(ada!.querySelector('.m3e-input-chip__cell')!.getAttribute('role')).toBe('gridcell');
    const remove = ada!.querySelector('button')!;
    expect(remove.getAttribute('tabindex')).toBe('-1');
    expect(remove.getAttribute('type')).toBe('button');
    expect(remove.getAttribute('aria-label')).toBe('Remove');
    expect(remove.getAttribute('aria-labelledby')).toBe(`${remove.id} to-ada`);
  });

  it('Backspace / Delete remove the focused input chip and focus the next one', async () => {
    const el = await mount(
      `<m3e-chip-set>${inputChip('A')}${inputChip('B')}${inputChip('C')}</m3e-chip-set>`,
    );
    const events: ChipSetRemoveDetail[] = [];
    el.addEventListener('remove', (e) => {
      events.push(e.detail);
    });
    const chips = () => [...el.setElement!.querySelectorAll<HTMLElement>('.m3e-input-chip')];
    const [a, b] = chips();
    b!.focus();
    key(b!, 'Delete');
    expect(events.map((d) => d.value)).toEqual(['B']);
    expect(chips().map((c) => c.getAttribute('aria-label'))).toEqual(['A', 'C']);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('C');
    key(document.activeElement!, 'Backspace');
    expect(document.activeElement).toBe(a);
    key(a!, 'Backspace');
    expect(chips()).toHaveLength(0);
    expect(document.activeElement).toBe(el.setElement);
  });

  it('the remove button removes its chip; preventDefault keeps it', async () => {
    const el = await mount(`<m3e-chip-set>${inputChip('A')}${inputChip('B')}</m3e-chip-set>`);
    const keep = vi.fn((e: Event) => {
      if ((e as CustomEvent<ChipSetRemoveDetail>).detail.value === 'A') e.preventDefault();
    });
    el.addEventListener('remove', keep);
    const buttons = [...el.querySelectorAll('button')];
    buttons[0]!.click();
    buttons[1]!.click();
    expect(keep).toHaveBeenCalledTimes(2);
    expect([...el.querySelectorAll('.m3e-input-chip')].map((c) => c.textContent)).toEqual([
      'Aclose',
    ]);
  });

  it('disabled input chips are skipped and cannot be removed', async () => {
    const el = await mount(
      `<m3e-chip-set>${inputChip('A', ' aria-disabled="true"')}${inputChip('B')}</m3e-chip-set>`,
    );
    const [a, b] = [...el.querySelectorAll<HTMLElement>('.m3e-input-chip')];
    expect(a!.getAttribute('tabindex')).toBe('-1');
    expect(b!.getAttribute('tabindex')).toBe('0');
    expect(a!.querySelector('button')!.disabled).toBe(true);
    const removed = vi.fn();
    el.addEventListener('remove', removed);
    key(a!, 'Delete');
    a!.querySelector('button')!.click();
    expect(removed).not.toHaveBeenCalled();
  });

  it('chips appended to the host later are moved into the set', async () => {
    const el = await mount(`<m3e-chip-set>${inputChip('A')}</m3e-chip-set>`);
    el.insertAdjacentHTML('beforeend', inputChip('B'));
    await flush();
    // The set and the hidden remove description.
    expect([...el.children].map((c) => c.localName)).toEqual(['div', 'span']);
    const b = el.setElement!.querySelectorAll('.m3e-input-chip')[1]!;
    expect(b.getAttribute('role')).toBe('row');
    expect(b.getAttribute('tabindex')).toBe('-1');
  });
});
