import { afterEach, describe, expect, it } from 'vitest';
import type { ListActionDetail, ListSelectionChangeDetail } from './index.js';
import './index.js';
import { createListControl, listControlTree, listItemClassName } from '../list-layout/index.js';

const flush = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }),
  );

const item = (value: string, headline: string, extra = '', attrs = '') =>
  `<div class="m3e-list-item" data-value="${value}"${attrs}>${extra}<span class="m3e-list-item__content"><span class="m3e-list-item__headline">${headline}</span></span></div>`;

async function mount(html: string) {
  document.body.innerHTML = html;
  await flush();
  const host = document.body.querySelector('m3e-list')!;
  const root = host.listElement!;
  const options = () => [...root.querySelectorAll<HTMLElement>('.m3e-list-item')];
  return { host, root, options };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<m3e-list>', () => {
  it('renders a listbox of options (React Aria ids, labels, tab stop on the listbox)', async () => {
    const { root, options } = await mount(
      `<m3e-list id="pets" label="Pets" selection="multiple">` +
        `<div class="m3e-list-item" data-value="cat"><span class="m3e-list-item__content"><span class="m3e-list-item__overline">Indoor</span><span class="m3e-list-item__headline">Cat</span><span class="m3e-list-item__supporting">Purrs</span></span></div>` +
        item('dog', 'Dog') +
        `</m3e-list>`,
    );
    expect(root.className).toBe('m3e-list');
    expect(root.getAttribute('role')).toBe('listbox');
    expect(root.id).toBe('pets-listbox');
    expect(root.getAttribute('aria-label')).toBe('Pets');
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
    expect(root.getAttribute('aria-multiselectable')).toBe('true');
    expect(root.getAttribute('tabindex')).toBe('0');
    const [cat, dog] = options() as [HTMLElement, HTMLElement];
    expect(cat.className).toBe('m3e-list-item m3e-list-item--interactive');
    expect(cat.getAttribute('role')).toBe('option');
    expect(cat.id).toBe('pets-listbox-option-cat');
    expect(cat.getAttribute('data-key')).toBe('cat');
    expect(cat.getAttribute('aria-selected')).toBe('false');
    expect(cat.getAttribute('tabindex')).toBe('-1');
    expect(cat.getAttribute('aria-labelledby')).toBe(
      'pets-listbox-option-cat-overline pets-listbox-option-cat-headline',
    );
    expect(cat.getAttribute('aria-describedby')).toBe('pets-listbox-option-cat-supporting');
    expect(dog.hasAttribute('aria-describedby')).toBe(false);
    expect(cat.hasAttribute('data-ripple')).toBe(true);
  });

  it('focus enters at the first selected option; arrows wrap; Home / End; disabled skipped', async () => {
    const { root, options } = await mount(
      `<m3e-list label="L" selection="single">${item('a', 'Alpha')}${item('b', 'Beta', '', ' aria-selected="true"')}${item('c', 'Gamma', '', ' aria-disabled="true"')}${item('d', 'Delta')}</m3e-list>`,
    );
    const [a, b, c, d] = options() as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];
    expect(c.hasAttribute('tabindex')).toBe(false);
    root.focus();
    expect(document.activeElement).toBe(b);
    expect(root.getAttribute('tabindex')).toBe('-1');
    expect(b.getAttribute('tabindex')).toBe('0');
    key(b, 'ArrowDown');
    expect(document.activeElement).toBe(d);
    key(d, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    key(a, 'ArrowUp');
    expect(document.activeElement).toBe(d);
    key(d, 'ArrowLeft');
    expect(document.activeElement).toBe(b);
    key(b, 'ArrowRight');
    expect(document.activeElement).toBe(d);
    key(d, 'Home');
    expect(document.activeElement).toBe(a);
    key(a, 'End');
    expect(document.activeElement).toBe(d);
    expect(d.getAttribute('tabindex')).toBe('0');
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  it('typeahead focuses the next option whose headline starts with the typed text', async () => {
    const { options } = await mount(
      `<m3e-list label="L">${item('1', 'Apple')}${item('2', 'Banana')}${item('3', 'Avocado')}</m3e-list>`,
    );
    const [apple, , avocado] = options() as [HTMLElement, HTMLElement, HTMLElement];
    apple.focus();
    key(apple, 'a');
    expect(document.activeElement).toBe(apple);
    key(apple, 'v');
    expect(document.activeElement).toBe(avocado);
  });

  it('single selection: click / Space / Enter toggle; the indicator follows; events cancel', async () => {
    const radio = (sel = '') =>
      `<span class="m3e-list-item__leading"><span class="m3e-radio-button"><input class="m3e-radio-button__input" type="radio"><span class="m3e-radio-button__icon" aria-hidden="true"></span><span class="m3e-radio-button__state" aria-hidden="true"></span></span></span>${sel}`;
    const { host, options } = await mount(
      `<m3e-list label="L" selection="single">${item('a', 'A', radio())}${item('b', 'B', radio())}</m3e-list>`,
    );
    const [a, b] = options() as [HTMLElement, HTMLElement];
    const changes: ListSelectionChangeDetail[] = [];
    host.addEventListener('selection-change', (e) => {
      changes.push((e as CustomEvent<ListSelectionChangeDetail>).detail);
    });
    const input = (el: HTMLElement) => el.querySelector('input')!;
    expect(a.querySelector('.m3e-radio-button')!.hasAttribute('inert')).toBe(true);
    a.click();
    await flush();
    expect(a.getAttribute('aria-selected')).toBe('true');
    expect(input(a).checked).toBe(true);
    b.focus();
    key(b, ' ');
    await flush();
    expect(a.getAttribute('aria-selected')).toBe('false');
    expect(b.getAttribute('aria-selected')).toBe('true');
    expect(input(a).checked).toBe(false);
    expect(input(b).checked).toBe(true);
    key(b, 'Enter');
    await flush();
    expect(b.getAttribute('aria-selected')).toBe('false');
    expect(host.selectedValues).toEqual([]);
    expect(changes).toEqual([
      { values: ['a'], value: 'a' },
      { values: ['b'], value: 'b' },
      { values: [], value: 'b' },
    ]);
    host.addEventListener('selection-change', (e) => {
      e.preventDefault();
    });
    a.click();
    await flush();
    expect(a.getAttribute('aria-selected')).toBe('false');
  });

  it('multiple selection: toggles, Ctrl+A selects all enabled, Escape clears; disallow-empty-selection', async () => {
    const { host, options } = await mount(
      `<m3e-list label="L" selection="multiple">${item('a', 'A')}${item('b', 'B', '', ' aria-disabled="true"')}${item('c', 'C')}</m3e-list>`,
    );
    const [a, b, c] = options() as [HTMLElement, HTMLElement, HTMLElement];
    a.click();
    c.click();
    b.click();
    await flush();
    expect(host.selectedValues).toEqual(['a', 'c']);
    a.focus();
    key(a, 'Escape');
    await flush();
    expect(host.selectedValues).toEqual([]);
    key(a, 'a', { ctrlKey: true });
    await flush();
    expect(host.selectedValues).toEqual(['a', 'c']);
    host.disallowEmptySelection = true;
    await flush();
    a.click();
    c.click();
    await flush();
    expect(host.selectedValues).toEqual(['c']);
    host.selectedValues = ['a'];
    expect(a.getAttribute('aria-selected')).toBe('true');
    expect(c.getAttribute('aria-selected')).toBe('false');
  });

  it('selection none: options without aria-selected; click and Enter emit action', async () => {
    const { host, options } = await mount(`<m3e-list label="L">${item('a', 'A')}</m3e-list>`);
    const [a] = options() as [HTMLElement];
    expect(a.hasAttribute('aria-selected')).toBe(false);
    const actions: string[] = [];
    host.addEventListener('action', (e) => {
      actions.push((e as CustomEvent<ListActionDetail>).detail.value);
    });
    a.click();
    a.focus();
    key(a, 'Enter');
    key(a, ' ');
    expect(actions).toEqual(['a', 'a']);
  });

  it('moves items appended to the host into the list', async () => {
    const { host, options } = await mount(`<m3e-list label="L">${item('a', 'A')}</m3e-list>`);
    host.insertAdjacentHTML('beforeend', item('b', 'B'));
    await flush();
    await flush();
    expect(options().map((el) => el.getAttribute('role'))).toEqual(['option', 'option']);
  });
});

describe('list contract helpers', () => {
  it('listItemClassName adds the modifiers', () => {
    expect(listItemClassName({})).toBe('m3e-list-item');
    expect(
      listItemClassName({ segmented: true, interactive: true, threeLine: true, disabled: true }),
    ).toBe(
      'm3e-list-item m3e-list-item--segmented m3e-list-item--interactive m3e-list-item--three-line m3e-list-item--disabled',
    );
    expect(listItemClassName({ baseline: true })).toBe('m3e-list-item m3e-list-item--baseline');
  });

  it('builds the indicator markup inert', () => {
    const control = createListControl(document, 'switch');
    expect(control.outerHTML).toBe(
      '<span class="m3e-switch" inert=""><input class="m3e-switch__input" type="checkbox" role="switch"><span class="m3e-switch__track" aria-hidden="true"><span class="m3e-switch__handle"><span class="m3e-switch__state"></span></span></span></span>',
    );
    const checkbox = createListControl(document, 'checkbox');
    expect(checkbox.querySelector('svg')!.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(listControlTree('radio')[2]).toHaveLength(3);
  });
});
