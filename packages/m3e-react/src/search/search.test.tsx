import '@kyralabs/m3e-elements/search.js';
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { AppBarWithSearch } from './AppBarWithSearch.js';
import { SearchBar, SearchResult } from './SearchBar.js';

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const key = async (el: Element, k: string) => {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};
const type = async (input: HTMLInputElement, text: string) => {
  await act(async () => {
    // React tracks the value property: set it the way the browser does before 'input'.
    Reflect.set(Object.getPrototypeOf(input) as object, 'value', text, input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
};

/**
 * Element and React ids differ by construction: name them by order of appearance. React also
 * mirrors a controlled input's value into the `value` attribute; the property is what counts.
 */
function normalizeIds(html: string): string {
  html = html.replace(/ value="[^"]*"/, '');
  const ids = new Map<string, string>();
  const name = (id: string) => ids.get(id) ?? ids.set(id, `id${String(ids.size)}`).get(id)!;
  for (const [, id] of html.matchAll(/ id="([^"]+)"/g)) name(id!);
  return html.replace(
    /(id|aria-controls|aria-activedescendant)="([^"]+)"/g,
    (_, attr: string, id: string) => `${attr}="${name(id)}"`,
  );
}

function Demo({ onSelect }: { onSelect?: (value: string) => void }) {
  const [query, setQuery] = useState('');
  return (
    <SearchBar
      variant="docked"
      placeholder="Search"
      value={query}
      onChange={setQuery}
      onSelect={(value) => {
        onSelect?.(value);
      }}
    >
      {['Apple', 'Banana', 'Cherry']
        .filter((f) => f.toLowerCase().includes(query.toLowerCase()))
        .map((f) => (
          <SearchResult key={f} value={f.toLowerCase()} icon="history" isDisabled={f === 'Banana'}>
            {f}
          </SearchResult>
        ))}
    </SearchBar>
  );
}

describe('<SearchBar>', () => {
  it('combobox: typing expands and filters; arrows set aria-activedescendant; Enter selects', async () => {
    const selected: string[] = [];
    const container = await renderReact(<Demo onSelect={(v) => selected.push(v)} />);
    const root = container.querySelector<HTMLElement>('.m3e-search')!;
    const input = container.querySelector<HTMLInputElement>('.m3e-search__input')!;
    expect(root.getAttribute('role')).toBe('search');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    input.focus();
    await type(input, 'a');
    expect(root.hasAttribute('data-expanded')).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const results = container.querySelector('.m3e-search__results')!;
    expect(input.getAttribute('aria-controls')).toBe(results.id);
    const options = [...container.querySelectorAll<HTMLElement>('.m3e-search__result')];
    expect(options.map((o) => o.querySelector('.m3e-search__result-label')!.textContent)).toEqual([
      'Apple',
      'Banana',
    ]);
    await key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
    // Banana is disabled: ArrowDown stays on Apple.
    await key(input, 'ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]!.id);
    await key(input, 'Enter');
    expect(selected).toEqual(['apple']);
    expect(input.value).toBe('Apple');
    expect(root.hasAttribute('data-expanded')).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape collapses; the back button collapses and returns focus to the input', async () => {
    const changes: boolean[] = [];
    const container = await renderReact(
      <SearchBar defaultExpanded onExpandedChange={(e) => changes.push(e)}>
        <SearchResult>One</SearchResult>
      </SearchBar>,
    );
    const input = container.querySelector<HTMLInputElement>('.m3e-search__input')!;
    expect(container.querySelector('.m3e-search')!.hasAttribute('data-open')).toBe(true);
    const back = container.querySelector<HTMLButtonElement>('.m3e-search__back')!;
    back.focus();
    await act(async () => {
      back.click();
      await Promise.resolve();
    });
    expect(changes).toEqual([false]);
    expect(document.activeElement).toBe(input);
    expect(container.querySelector('.m3e-search__back')).toBeNull();
    await key(input, 'ArrowDown');
    expect(changes).toEqual([false, true]);
    await key(input, 'Escape');
    expect(changes).toEqual([false, true, false]);
  });

  it('onSearch on Enter without an active result; returning false keeps it expanded', async () => {
    const searches: string[] = [];
    const container = await renderReact(
      <SearchBar
        defaultValue="kiwi"
        defaultExpanded
        onSearch={(q) => {
          searches.push(q);
          return false;
        }}
      />,
    );
    const input = container.querySelector<HTMLInputElement>('.m3e-search__input')!;
    await key(input, 'Enter');
    expect(searches).toEqual(['kiwi']);
    expect(container.querySelector('.m3e-search')!.hasAttribute('data-expanded')).toBe(true);
  });

  it('controlled isExpanded follows the prop', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            id="toggle"
            onClick={() => {
              setOpen((o) => !o);
            }}
          >
            toggle
          </button>
          <SearchBar isExpanded={open} onExpandedChange={setOpen} />
        </>
      );
    }
    const container = await renderReact(<Controlled />);
    const root = container.querySelector('.m3e-search')!;
    await act(async () => {
      container.querySelector<HTMLButtonElement>('#toggle')!.click();
      await Promise.resolve();
    });
    expect(root.hasAttribute('data-expanded')).toBe(true);
    expect(container.querySelector('.m3e-search__back')).not.toBeNull();
  });

  it('AppBarWithSearch renders the top app bar search contract', async () => {
    const container = await renderReact(
      <AppBarWithSearch
        navigationIcon={<button type="button">menu</button>}
        actions={<button type="button">account</button>}
      >
        <SearchBar />
      </AppBarWithSearch>,
    );
    const bar = container.querySelector('header')!;
    expect(bar.className).toBe('m3e-top-app-bar m3e-top-app-bar--search');
    expect([...bar.children].map((c) => c.className)).toEqual([
      'm3e-top-app-bar__navigation',
      'm3e-search',
      'm3e-top-app-bar__actions',
    ]);
  });
});

describe('<SearchBar> ⇔ <m3e-search> DOM parity', () => {
  const trailing =
    '<button type="button" class="m3e-icon-button" aria-label="Voice search"><span class="m3e-icon" aria-hidden="true">mic</span></button>';
  it.each([
    [
      'docked, collapsed, trailing button, results with icons / supporting text / disabled',
      <SearchBar
        key="a"
        variant="docked"
        placeholder="Search mail"
        trailing={
          <button type="button" className="m3e-icon-button" aria-label="Voice search">
            <span className="m3e-icon" aria-hidden="true">
              mic
            </span>
          </button>
        }
      >
        <SearchResult icon="history" supportingText="Recent">
          Inbox
        </SearchResult>
        <SearchResult trailingIcon="north_west" isDisabled>
          Drafts
        </SearchResult>
      </SearchBar>,
      `<m3e-search variant="docked" placeholder="Search mail">
        <m3e-search-result icon="history" supporting-text="Recent">Inbox</m3e-search-result>
        <m3e-search-result trailing-icon="north_west" disabled>Drafts</m3e-search-result>
        ${trailing}
      </m3e-search>`,
    ],
    [
      'full-screen contained, expanded (back button, open view)',
      <SearchBar
        key="b"
        variant="full-screen-contained"
        defaultExpanded
        aria-label="Find"
        backLabel="Close"
      >
        <SearchResult>One</SearchResult>
      </SearchBar>,
      `<m3e-search variant="full-screen-contained" expanded label="Find" back-label="Close">
        <m3e-search-result>One</m3e-search-result>
      </m3e-search>`,
    ],
  ])('%s', async (_, react, html) => {
    const fromReact = normalizeIds(
      canonical((await renderReact(react)).querySelector('.m3e-search')!),
    );
    const host = await renderElement(html);
    const fromElement = normalizeIds(canonical(host.querySelector('.m3e-search')!));
    expect(fromElement).toBe(fromReact);
  });
});

describe('M11 API (D16 aliases)', () => {
  it('<SearchBar expanded> still works and warns once in development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = await renderReact(
      <>
        {/* eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias */}
        <SearchBar expanded aria-label="A" />
        {/* eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias */}
        <SearchBar expanded aria-label="B" />
      </>,
    );
    for (const root of container.querySelectorAll('.m3e-search')) {
      expect(root.hasAttribute('data-expanded')).toBe(true);
    }
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.filter((m) => m.includes('deprecated'))).toEqual([
      '[m3exp-web] <SearchBar expanded> is deprecated since 1.8 and will be removed in 2.0. Use <SearchBar isExpanded>.',
    ]);
  });
});
