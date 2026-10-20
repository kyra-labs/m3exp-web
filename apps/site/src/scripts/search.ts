// Site search: the top app bar's <m3e-search> (COMPONENT_SPEC §12) over the Pagefind index that
// the build writes to /pagefind/ (DECISIONS D27). The index and its script load on first use.

interface PagefindResult {
  data(): Promise<{ url: string; excerpt: string; meta: { title?: string } }>;
}

interface Pagefind {
  init(): Promise<void>;
  debouncedSearch(query: string): Promise<{ results: PagefindResult[] } | null>;
}

const MAX_RESULTS = 8;
const PAGEFIND_URL = '/pagefind/pagefind.js';

let pagefind: Promise<Pagefind | null> | null = null;

function loadPagefind(): Promise<Pagefind | null> {
  pagefind ??= (import(/* @vite-ignore */ PAGEFIND_URL) as Promise<Pagefind>)
    .then(async (module) => {
      await module.init();
      return module;
    })
    // `astro dev` has no index (the build writes it): search shows nothing there.
    .catch(() => null);
  return pagefind;
}

/** Pagefind excerpts are HTML with <mark>s; the result row takes plain text. */
function text(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent;
}

export function attachSearch(search: HTMLElement): void {
  let latest: { url: string }[] = [];

  const render = (results: { url: string; title: string; excerpt: string }[]) => {
    latest = results;
    const rows = results.map((result) => {
      const row = document.createElement('m3e-search-result');
      row.setAttribute('value', result.url);
      row.setAttribute('icon', 'description');
      row.setAttribute('supporting-text', result.excerpt);
      row.textContent = result.title;
      return row;
    });
    search.querySelectorAll('m3e-search-result').forEach((row) => {
      row.remove();
    });
    search.append(...rows);
  };

  const run = async (query: string) => {
    const index = await loadPagefind();
    if (!index) return;
    if (!query.trim()) {
      render([]);
      return;
    }
    const found = await index.debouncedSearch(query);
    if (!found) return; // superseded by a newer query
    const data = await Promise.all(found.results.slice(0, MAX_RESULTS).map((r) => r.data()));
    render(
      data.map((d) => ({
        url: d.url,
        title: d.meta.title ?? d.url,
        excerpt: text(d.excerpt),
      })),
    );
  };

  search.addEventListener('input', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement) void run(input.value);
  });
  search.addEventListener('focusin', () => void loadPagefind(), { once: true });
  search.addEventListener('select', (event) => {
    const { value } = (event as CustomEvent<{ value: string }>).detail;
    event.preventDefault();
    location.assign(value);
  });
  search.addEventListener('search', (event) => {
    const first = latest[0];
    if (!first) return;
    event.preventDefault();
    location.assign(first.url);
  });

  void import('@kyralabs/m3e-elements/search.js');
}
