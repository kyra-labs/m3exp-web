import { springValue } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { M3eModalWideNavigationRail } from '../modal-wide-navigation-rail/modal-wide-navigation-rail.js';
import '../modal-wide-navigation-rail/index.js';
import type { M3eShortNavigationBar } from '../short-navigation-bar/short-navigation-bar.js';
import '../short-navigation-bar/index.js';
import type { M3eWideNavigationRail } from './wide-navigation-rail.js';
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

// happy-dom computes no styles from m3e-css: give the rail the tokens WideNavigationRailLayout
// reads (expressive motion scheme, NavigationRail*Tokens), as the generated CSS would.
const TOKENS: Record<string, string> = {
  '--m3e-comp-navigation-rail-collapsed-container-width': '96px',
  '--m3e-comp-navigation-rail-expanded-container-width-minimum': '220px',
  '--m3e-comp-navigation-rail-expanded-container-width-maximum': '360px',
  '--m3e-comp-wide-navigation-rail-item-horizontal-padding': '20px',
  '--m3e-comp-navigation-rail-baseline-item-icon-size': '24px',
  '--m3e-comp-navigation-rail-horizontal-item-icon-label-space': '8px',
  '--m3e-comp-navigation-rail-vertical-item-active-indicator-width': '56px',
  '--m3e-comp-navigation-rail-horizontal-item-full-width-leading-space': '16px',
};
const SPRINGS: Record<string, [number, number]> = {
  'wide-navigation-rail-width': [0.8, 380],
  'wide-navigation-rail-modal-width': [0.6, 800],
  'wide-navigation-rail-icon-position': [0.8, 380],
  'modal-wide-navigation-rail-position': [1, 1600],
  'modal-wide-navigation-rail-scrim': [1, 1600],
  'modal-wide-navigation-rail-slide': [0.8, 380],
};
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };

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

const ITEMS = [
  '<m3e-navigation-item value="home" icon="home" href="/home">Home</m3e-navigation-item>',
  '<m3e-navigation-item value="search" icon="search">Search</m3e-navigation-item>',
  '<m3e-navigation-item value="star" icon="star" disabled>Starred</m3e-navigation-item>',
].join('');

/** Mounts `html`; happy-dom does not inherit custom properties, so the rail gets the tokens. */
async function mount<T extends HTMLElement>(html: string): Promise<T> {
  document.body.innerHTML = html;
  await flush();
  for (const nav of document.querySelectorAll<HTMLElement>('nav')) {
    for (const [name, value] of Object.entries(TOKENS)) nav.style.setProperty(name, value);
    for (const [name, [damping, stiffness]] of Object.entries(SPRINGS)) {
      nav.style.setProperty(`--m3e-comp-${name}-duration`, '500ms');
      nav.style.setProperty(`--m3e-comp-${name}-damping-ratio`, String(damping));
      nav.style.setProperty(`--m3e-comp-${name}-stiffness`, String(stiffness));
    }
  }
  return document.body.querySelector('[data-m3e-navigation]') as T;
}

const items = (host: Element) => [...host.querySelectorAll<HTMLElement>('.m3e-navigation-item')];
const current = (host: Element) =>
  items(host)
    .filter((el) => el.hasAttribute('aria-current'))
    .map((el) => el.querySelector('.m3e-navigation-item__label')?.textContent);

describe('<m3e-short-navigation-bar>', () => {
  it('renders the nav and item contract with React Aria link / button attributes', async () => {
    const host = await mount<M3eShortNavigationBar>(
      `<m3e-short-navigation-bar label="Main" selected="home" layout="horizontal">${ITEMS}</m3e-short-navigation-bar>`,
    );
    const nav = host.querySelector('nav')!;
    expect(nav.className).toBe('m3e-short-navigation-bar m3e-short-navigation-bar--horizontal');
    expect(nav.getAttribute('aria-label')).toBe('Main');
    const [home, search, star] = items(host);
    expect(home!.localName).toBe('a');
    expect(home!.getAttribute('href')).toBe('/home');
    expect(home!.getAttribute('tabindex')).toBe('0');
    expect(home!.getAttribute('aria-current')).toBe('page');
    expect(search!.localName).toBe('button');
    expect(search!.getAttribute('type')).toBe('button');
    expect(star!.hasAttribute('disabled')).toBe(true);
    expect(star!.getAttribute('aria-disabled')).toBe('true');
    expect(star!.hasAttribute('tabindex')).toBe(false);
    const parts = [...home!.querySelector('.m3e-navigation-item__content')!.children].map(
      (el) => el.className,
    );
    expect(parts).toEqual([
      'm3e-navigation-item__indicator',
      'm3e-navigation-item__state',
      'm3e-icon m3e-navigation-item__icon',
      'm3e-navigation-item__label',
    ]);
    expect(home!.querySelector('.m3e-navigation-item__state')!.hasAttribute('data-ripple')).toBe(
      true,
    );
  });

  it('moves aria-current on press (one item), unless selection-change is canceled', async () => {
    const host = await mount<M3eShortNavigationBar>(
      `<m3e-short-navigation-bar selected="home">${ITEMS}</m3e-short-navigation-bar>`,
    );
    const values: string[] = [];
    host.addEventListener('selection-change', (e) => {
      values.push((e as CustomEvent<{ value: string }>).detail.value);
    });
    items(host)[1]!.click();
    await flush();
    expect(values).toEqual(['search']);
    expect(host.selected).toBe('search');
    expect(current(host)).toEqual(['Search']);
    host.addEventListener('selection-change', (e) => {
      e.preventDefault();
    });
    items(host)[0]!.click();
    await flush();
    expect(current(host)).toEqual(['Search']);
  });

  it('hides labels on request and follows item changes', async () => {
    const host = await mount<M3eShortNavigationBar>(
      `<m3e-short-navigation-bar>${ITEMS}</m3e-short-navigation-bar>`,
    );
    const item = host.querySelector('m3e-navigation-item')!;
    item.setAttribute('label-hidden', '');
    item.setAttribute('icon', 'house');
    await flush();
    const home = items(host)[0]!;
    expect(home.getAttribute('aria-label')).toBe('Home');
    expect(home.querySelector('.m3e-navigation-item__label')).toBeNull();
    expect(home.querySelector('.m3e-navigation-item__icon')!.textContent).toBe('house');
    item.remove();
    await flush();
    expect(items(host)).toHaveLength(2);
  });
});

describe('<m3e-wide-navigation-rail>', () => {
  it('puts other children in the header and reflects expanded in the class', async () => {
    const host = await mount<M3eWideNavigationRail>(
      `<m3e-wide-navigation-rail label="Main"><button aria-label="Menu"></button>${ITEMS}</m3e-wide-navigation-rail>`,
    );
    const nav = host.querySelector('nav')!;
    expect(nav.className).toBe('m3e-wide-navigation-rail');
    expect(nav.firstElementChild!.className).toBe('m3e-wide-navigation-rail__header');
    expect(nav.querySelector('.m3e-wide-navigation-rail__header > [aria-label="Menu"]')).not.toBe(
      null,
    );
    expect(items(host)).toHaveLength(3);
  });

  it('animates on the default spatial spring, then rests on the classes alone', async () => {
    const host = await mount<M3eWideNavigationRail>(
      `<m3e-wide-navigation-rail>${ITEMS}</m3e-wide-navigation-rail>`,
    );
    const nav = host.querySelector('nav')!;
    const changes: boolean[] = [];
    host.addEventListener('expanded-change', (e) => {
      changes.push((e as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    host.expand();
    await flush();
    expect(changes).toEqual([true]);
    expect(host.hasAttribute('expanded')).toBe(true);
    expect(nav.classList.contains('m3e-wide-navigation-rail--expanded')).toBe(true);
    expect(nav.hasAttribute('data-animating')).toBe(true);
    runFrames(3);
    const p = Number(nav.style.getPropertyValue('--_m3e-wnr-progress'));
    expect(p).toBeCloseTo(springValue(DEFAULT_SPATIAL, 48, 0, 1), 3);
    expect(Number(nav.style.getPropertyValue('--_m3e-wnr-layout'))).toBeCloseTo(p, 3);
    // No item sizes in happy-dom: the narrow path, minWidth = lerp(96, 220, p).
    expect(Number.parseFloat(nav.style.getPropertyValue('--_m3e-wnr-inline-size'))).toBeCloseTo(
      96 + 124 * p,
      1,
    );
    runFrames(120);
    expect(nav.hasAttribute('data-animating')).toBe(false);
    expect(nav.style.getPropertyValue('--_m3e-wnr-progress')).toBe('');
    host.toggle();
    await flush();
    expect(host.expanded).toBe(false);
    expect(changes).toEqual([true, false]);
  });
});

describe('<m3e-modal-wide-navigation-rail>', () => {
  const mountModal = (attrs = '') =>
    mount<M3eModalWideNavigationRail>(
      `<m3e-modal-wide-navigation-rail label="Main" selected="home" ${attrs}><button aria-label="Menu"></button>${ITEMS}</m3e-modal-wide-navigation-rail>`,
    );

  it('renders the root, the rail and the scrim', async () => {
    const host = await mountModal();
    const root = host.modalElement!;
    expect(root.className).toBe('m3e-modal-wide-navigation-rail');
    expect([...root.children].map((el) => el.className)).toEqual([
      'm3e-wide-navigation-rail',
      'm3e-modal-wide-navigation-rail__scrim',
    ]);
    expect(root.lastElementChild!.getAttribute('aria-hidden')).toBe('true');
    expect(root.hasAttribute('role')).toBe(false);
  });

  it('opens as a dialog once positionProgress moves, and Escape asks to collapse', async () => {
    const host = await mountModal();
    const root = host.modalElement!;
    const menu = host.querySelector<HTMLButtonElement>('[aria-label="Menu"]')!;
    menu.focus();
    host.expand();
    await flush();
    expect(root.hasAttribute('data-open')).toBe(false);
    runFrames(1);
    expect(root.hasAttribute('data-open')).toBe(true);
    expect(root.getAttribute('role')).toBe('dialog');
    expect(root.getAttribute('aria-modal')).toBe('true');
    expect(root.getAttribute('aria-label')).toBe('Navigation rail');
    expect(document.documentElement.style.overflow).toBe('hidden');
    runFrames(60);
    const changes: boolean[] = [];
    host.addEventListener('expanded-change', (e) => {
      changes.push((e as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    items(host)[1]!.focus();
    items(host)[1]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await flush();
    expect(changes).toEqual([false]);
    expect(host.expanded).toBe(false);
    // Focus returns to the opener at once; the window closes once positionProgress reaches 0.
    expect(document.activeElement).toBe(menu);
    runFrames(60);
    expect(root.hasAttribute('data-open')).toBe(false);
    expect(root.hasAttribute('role')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('a press on the scrim asks to collapse; canceling keeps it open', async () => {
    const host = await mountModal('expanded');
    const root = host.modalElement!;
    expect(root.hasAttribute('data-open')).toBe(true);
    host.addEventListener('expanded-change', (e) => {
      e.preventDefault();
    });
    root.querySelector<HTMLElement>('.m3e-modal-wide-navigation-rail__scrim')!.click();
    await flush();
    expect(host.expanded).toBe(true);
  });

  it('hide-on-collapse keeps the rail laid out expanded and moves focus into it', async () => {
    const host = await mount<M3eModalWideNavigationRail>(
      `<button id="opener">Open</button><m3e-modal-wide-navigation-rail hide-on-collapse selected="search">${ITEMS}</m3e-modal-wide-navigation-rail>`,
    );
    const root = host.modalElement!;
    expect(root.className).toBe(
      'm3e-modal-wide-navigation-rail m3e-modal-wide-navigation-rail--hide-on-collapse',
    );
    expect(host.querySelector('nav')!.className).toBe(
      'm3e-wide-navigation-rail m3e-wide-navigation-rail--expanded',
    );
    const opener = document.getElementById('opener')!;
    opener.focus();
    host.expand();
    await flush();
    runFrames(2);
    expect(root.hasAttribute('data-open')).toBe(true);
    expect(document.activeElement).toBe(items(host)[1]);
    const slide = Number(root.style.getPropertyValue('--_m3e-wnr-slide'));
    expect(slide).toBeGreaterThan(0);
    expect(slide).toBeLessThan(1);
    host.collapse();
    await flush();
    expect(document.activeElement).toBe(opener);
    runFrames(120);
    expect(root.hasAttribute('data-open')).toBe(false);
  });
});
