// Mounts React islands (Island.astro) when they come within a medium window height of the
// viewport, so a page only loads React and the components it shows. Client-side rendering only
// (DECISIONS D6): createRoot replaces the static fallback, nothing is hydrated.
import { windowBreakpoints } from '@kyralabs/m3e-tokens';
import { type ComponentType, createElement } from 'react';
import { createRoot } from 'react-dom/client';

interface IslandModule {
  default: ComponentType<Record<string, unknown>>;
}

const islands = import.meta.glob<IslandModule>('../islands/*.tsx');

async function mount(el: HTMLElement): Promise<void> {
  const name = el.dataset.island;
  const load = islands[`../islands/${name ?? ''}.tsx`];
  if (!load) {
    console.error(`Unknown island "${name ?? ''}"`);
    return;
  }
  const { default: Component } = await load();
  const props = el.dataset.props ? (JSON.parse(el.dataset.props) as object) : {};
  el.dataset.mounted = '';
  createRoot(el).render(createElement(Component, props as Record<string, unknown>));
}

let observer: IntersectionObserver | null = null;

export function mountIslands(): void {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        void mount(entry.target as HTMLElement);
      }
    },
    { rootMargin: `${String(windowBreakpoints.height.medium)}px` },
  );
  for (const el of document.querySelectorAll<HTMLElement>('[data-island]:not([data-observed])')) {
    el.dataset.observed = '';
    observer.observe(el);
  }
}
