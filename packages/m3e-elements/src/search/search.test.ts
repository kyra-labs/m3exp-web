import { springValue } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { M3eSearch } from './search.js';
import './index.js';

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

let frames: FrameRequestCallback[];
let now: number;
const runFrames = (n: number) => {
  for (let i = 0; i < n; i++) {
    now += 16;
    const run = frames;
    frames = [];
    for (const cb of run) cb(now);
  }
};

beforeEach(() => {
  frames = [];
  now = 1000;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(attrs = '', results = 3): Promise<M3eSearch> {
  document.body.innerHTML = `<m3e-search ${attrs}>${Array.from(
    { length: results },
    (_, i) =>
      `<m3e-search-result value="v${String(i)}" icon="history"${i === 1 ? ' disabled' : ''}>Result ${String(i)}</m3e-search-result>`,
  ).join(
    '',
  )}<button class="m3e-icon-button" aria-label="Mic"><span class="m3e-icon">mic</span></button></m3e-search>`;
  await flush();
  return document.querySelector('m3e-search')!;
}

const parts = (host: M3eSearch) => ({
  root: host.querySelector<HTMLElement>('.m3e-search')!,
  input: host.querySelector<HTMLInputElement>('.m3e-search__input')!,
  results: host.querySelector<HTMLElement>('.m3e-search__results')!,
  options: [...host.querySelectorAll<HTMLElement>('.m3e-search__result')],
});
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }),
  );

describe('<m3e-search>', () => {
  it('renders the role="search" combobox contract', async () => {
    const host = await mount('placeholder="Search mail" variant="docked"');
    const { root, input, results, options } = parts(host);
    expect(root.className).toBe('m3e-search m3e-search--docked');
    expect(root.getAttribute('role')).toBe('search');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-label')).toBe('Search');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-controls')).toBe(false);
    expect(input.placeholder).toBe('Search mail');
    expect(results.getAttribute('role')).toBe('listbox');
    expect(results.getAttribute('aria-label')).toBe('Suggestions');
    expect(options).toHaveLength(3);
    expect(options[0]!.getAttribute('role')).toBe('option');
    expect(options[0]!.getAttribute('aria-selected')).toBe('false');
    expect(options[1]!.getAttribute('aria-disabled')).toBe('true');
    expect(options[0]!.querySelector('.m3e-search__result-label')!.textContent).toBe('Result 0');
    // The extra child went to the trailing slot; the leading slot shows the search icon.
    expect(host.querySelector('.m3e-search__trailing [aria-label="Mic"]')).not.toBeNull();
    expect(host.querySelector('.m3e-search__leading .m3e-icon')!.textContent).toBe('search');
  });

  it('ArrowDown expands; arrows move the active option; Enter selects it and collapses', async () => {
    const host = await mount();
    const { root, input, results, options } = parts(host);
    const changes: boolean[] = [];
    host.addEventListener('expanded-change', (e) => {
      changes.push((e as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    input.focus();
    key(input, 'ArrowDown');
    await flush();
    expect(host.expanded).toBe(true);
    expect(root.hasAttribute('data-expanded')).toBe(true);
    expect(root.hasAttribute('data-open')).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(results.id);
    // Expanded: a back button replaces the search icon.
    expect(host.querySelector('.m3e-search__back')!.getAttribute('aria-label')).toBe('Back');

    key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
    expect(options[0]!.getAttribute('aria-selected')).toBe('true');
    expect(options[0]!.hasAttribute('data-focus-visible')).toBe(true);
    // The disabled option is skipped.
    key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[2]!.id);
    expect(options[0]!.getAttribute('aria-selected')).toBe('false');
    key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[2]!.id);
    key(input, 'ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
    key(input, 'ArrowUp');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);

    const selected: unknown[] = [];
    host.addEventListener('select', (e) => selected.push((e as CustomEvent).detail));
    key(input, 'ArrowDown');
    key(input, 'Enter');
    await flush();
    expect(selected).toEqual([{ value: 'v0', label: 'Result 0' }]);
    expect(input.value).toBe('Result 0');
    expect(host.expanded).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(changes).toEqual([true, false]);
    // Without springs (no tokens here) the view closes on the next frame.
    runFrames(1);
    expect(root.hasAttribute('data-open')).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it('Escape collapses and keeps focus in the input; Enter without an active option searches', async () => {
    const host = await mount();
    const { input } = parts(host);
    input.focus();
    host.expand();
    await flush();
    key(input, 'Escape');
    await flush();
    expect(host.expanded).toBe(false);
    expect(document.activeElement).toBe(input);

    const searches: unknown[] = [];
    host.addEventListener('search', (e) => {
      searches.push((e as CustomEvent).detail);
      e.preventDefault();
    });
    host.expand();
    input.value = 'kiwi';
    key(input, 'Enter');
    await flush();
    expect(searches).toEqual([{ value: 'kiwi' }]);
    // preventDefault() kept it expanded.
    expect(host.expanded).toBe(true);
  });

  it('a click on the field and typing expand; the back button collapses', async () => {
    const host = await mount();
    const { input } = parts(host);
    input.click();
    await flush();
    expect(host.expanded).toBe(true);
    host.querySelector<HTMLButtonElement>('.m3e-search__back')!.click();
    await flush();
    expect(host.expanded).toBe(false);
    expect(document.activeElement).toBe(input);
    // A click on a trailing button does not expand.
    host.querySelector<HTMLButtonElement>('[aria-label="Mic"]')!.click();
    await flush();
    expect(host.expanded).toBe(false);
    input.focus();
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(host.expanded).toBe(true);
  });

  it('a click on a result selects it (disabled ones do nothing)', async () => {
    const host = await mount('expanded');
    const { options, input } = parts(host);
    expect(host.expanded).toBe(true);
    options[1]!.click();
    expect(host.expanded).toBe(true);
    options[2]!.click();
    await flush();
    expect(input.value).toBe('Result 2');
    expect(host.expanded).toBe(false);
  });

  it('full-screen views trap Tab inside the view and become a modal dialog', async () => {
    const host = await mount();
    const { root, input } = parts(host);
    host.expand();
    await flush();
    const view = root.querySelector('.m3e-search__view')!;
    expect(view.getAttribute('role')).toBe('dialog');
    expect(view.getAttribute('aria-modal')).toBe('true');
    // happy-dom has no layout: give every focusable a client rect.
    for (const el of view.querySelectorAll<HTMLElement>('button, input')) {
      el.getClientRects = () => [{}] as unknown as DOMRectList;
    }
    const back = host.querySelector<HTMLElement>('.m3e-search__back')!;
    const mic = host.querySelector<HTMLElement>('[aria-label="Mic"]')!;
    mic.focus();
    key(mic, 'Tab');
    expect(document.activeElement).toBe(back);
    key(back, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(mic);
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  it('docked: a pointer down outside the panel collapses it', async () => {
    const host = await mount('variant="docked"');
    host.expand();
    await flush();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await flush();
    expect(host.expanded).toBe(false);
  });

  it('expands on the variant’s expand spring and writes the geometry each frame', async () => {
    const host = await mount('variant="docked"');
    const { root } = parts(host);
    root.style.setProperty('--m3e-comp-search-expand-duration', '500ms');
    root.style.setProperty('--m3e-comp-search-expand-damping-ratio', '0.8');
    root.style.setProperty('--m3e-comp-search-expand-stiffness', '200');
    root.style.setProperty('--m3e-comp-search-docked-max-height-ratio', 'calc(2 / 3)');
    root.style.setProperty('--m3e-comp-search-docked-min-height', '240px');
    root.getBoundingClientRect = () => ({ left: 10, top: 20, width: 360, height: 56 }) as DOMRect;
    host.expand();
    expect(root.style.getPropertyValue('--_m3e-search-surface-max-height')).toBe('56px');
    runFrames(5);
    const value = springValue({ dampingRatio: 0.8, stiffness: 200 }, 80, 0, 1);
    const tableMax = document.documentElement.clientHeight * (2 / 3);
    const expected = Math.round((56 + (tableMax - 56) * value) * 100) / 100;
    expect(root.style.getPropertyValue('--_m3e-search-surface-max-height')).toBe(
      `${String(expected)}px`,
    );
    expect(root.style.getPropertyValue('--_m3e-search-surface-x')).toBe('10px');
  });
});
