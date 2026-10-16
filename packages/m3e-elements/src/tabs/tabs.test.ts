import { springValue, springVelocity } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { M3eTabs } from './tabs.js';
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

const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };
const EDGE = 52;

/**
 * happy-dom lays nothing out: tabs report `TAB` px (scrollable rows: 90 + 10 per label
 * character), their content 8px per label character (an icon alone 24), the row 400px.
 */
let TAB = 100;
const width = (el: Element, scrollable: boolean): number => {
  if (el.classList.contains('m3e-tabs__list')) return 400;
  const label = el.closest('.m3e-tab')?.querySelector('.m3e-tab__label')?.textContent ?? '';
  if (el.classList.contains('m3e-tab__content')) return label ? label.length * 8 : 24;
  return scrollable ? 90 + label.length * 10 : TAB;
};
const observed: Element[] = [];
class FakeResizeObserver {
  constructor(private readonly cb: ResizeObserverCallback) {}
  observe(target: Element): void {
    observed.push(target);
    const w = width(target, Boolean(target.closest('.m3e-tabs--scrollable')));
    this.cb(
      [
        {
          target,
          borderBoxSize: [{ inlineSize: w, blockSize: 48 }],
          contentRect: { width: w, height: 48 },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  frames = [];
  now = 1000;
  TAB = 100;
  observed.length = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const TABS = [
  '<m3e-tab value="videos" icon="videocam">Videos</m3e-tab>',
  '<m3e-tab value="photos" icon="photo">Photos</m3e-tab>',
  '<m3e-tab value="audio" icon="music_note" disabled>Audio</m3e-tab>',
  '<m3e-tab value="fav" icon="favorite" label-hidden>Favorites</m3e-tab>',
].join('');
const PANELS = [
  '<m3e-tab-panel value="videos">V</m3e-tab-panel>',
  '<m3e-tab-panel value="photos">P</m3e-tab-panel>',
].join('');

/** The tokens TabsLayout reads (happy-dom has no m3e-tokens; a stylesheet on the root). */
const TOKENS = [
  ...['indicator', 'scroll'].flatMap((name) => [
    `--m3e-comp-tabs-${name}-duration: 500ms;`,
    `--m3e-comp-tabs-${name}-damping-ratio: 0.8;`,
    `--m3e-comp-tabs-${name}-stiffness: 380;`,
  ]),
  `--m3e-comp-tabs-scrollable-edge-padding: ${String(EDGE)}px;`,
  '--m3e-comp-tabs-indicator-min-width: 24px;',
].join(' ');

async function mount(html: string, rootStyle = ''): Promise<M3eTabs> {
  document.head.innerHTML = `<style>.m3e-tabs { ${TOKENS} ${rootStyle} }</style>`;
  document.body.innerHTML = html;
  const host = document.querySelector<M3eTabs>('m3e-tabs')!;
  await flush();
  return host;
}

const tabsOf = (host: M3eTabs) => [...host.rootElement!.querySelectorAll<HTMLElement>('.m3e-tab')];
const key = (el: Element, k: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const shift = (host: M3eTabs) =>
  Number.parseFloat(host.rootElement!.style.getPropertyValue('--_m3e-tabs-indicator-shift'));
const indicatorWidth = (host: M3eTabs) =>
  Number.parseFloat(host.rootElement!.style.getPropertyValue('--_m3e-tabs-indicator-width'));

describe('<m3e-tabs>', () => {
  it('renders the APG contract: tablist, tabs, panels', async () => {
    const host = await mount(
      `<m3e-tabs id="media" label="Media" selected="photos">${TABS}${PANELS}</m3e-tabs>`,
    );
    const root = host.rootElement!;
    expect(host.firstElementChild).toBe(root);
    expect(root.className).toBe('m3e-tabs m3e-tabs--primary');
    const list = root.querySelector('.m3e-tabs__list')!;
    expect(list.getAttribute('role')).toBe('tablist');
    expect(list.getAttribute('aria-label')).toBe('Media');
    const [videos, photos, audio, fav] = tabsOf(host);
    expect(photos!.getAttribute('role')).toBe('tab');
    expect(photos!.getAttribute('aria-selected')).toBe('true');
    expect(videos!.getAttribute('aria-selected')).toBe('false');
    expect(photos!.id).toBe('media-tab-1');
    expect(photos!.getAttribute('aria-controls')).toBe('media-panel-1');
    expect(audio!.getAttribute('aria-controls')).toBeNull();
    expect(audio!.getAttribute('aria-disabled')).toBe('true');
    expect(fav!.getAttribute('aria-label')).toBe('Favorites');
    expect(fav!.querySelector('.m3e-tab__label')).toBeNull();
    expect([...photos!.firstElementChild!.children].map((c) => c.className)).toEqual([
      'm3e-icon m3e-tab__icon',
      'm3e-tab__label',
    ]);
    // Roving tab stop on the selected tab.
    expect(tabsOf(host).map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);
    const panels = [...host.querySelectorAll('m3e-tab-panel')];
    expect(panels.map((p) => [p.id, p.getAttribute('aria-labelledby'), p.hidden])).toEqual([
      ['media-panel-0', 'media-tab-0', true],
      ['media-panel-1', 'media-tab-1', false],
    ]);
    expect(panels[1]!.getAttribute('role')).toBe('tabpanel');
    expect(panels[1]!.getAttribute('tabindex')).toBe('0');
    expect(panels[1]!.className).toBe('m3e-tab-panel');
  });

  it('variant, scrollable and icon-position set the modifiers; the first enabled tab is the default', async () => {
    const host = await mount(
      `<m3e-tabs variant="secondary" scrollable icon-position="leading">${TABS}</m3e-tabs>`,
    );
    expect(host.rootElement!.className).toBe(
      'm3e-tabs m3e-tabs--secondary m3e-tabs--scrollable m3e-tabs--leading-icon',
    );
    expect(tabsOf(host)[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('a press selects (cancelable selection-change); disabled tabs and the selected one do not emit', async () => {
    const host = await mount(`<m3e-tabs selected="videos">${TABS}${PANELS}</m3e-tabs>`);
    const events: unknown[] = [];
    host.addEventListener('selection-change', (e) => events.push((e as CustomEvent).detail));
    tabsOf(host)[1]!.click();
    await flush();
    expect(host.selected).toBe('photos');
    expect(host.getAttribute('selected')).toBe('photos');
    expect(tabsOf(host)[1]!.getAttribute('aria-selected')).toBe('true');
    expect(host.querySelectorAll('m3e-tab-panel')[0]!.hidden).toBe(true);
    tabsOf(host)[2]!.click();
    tabsOf(host)[1]!.click();
    await flush();
    expect(events).toEqual([{ value: 'photos' }]);
    host.addEventListener('selection-change', (e) => {
      e.preventDefault();
    });
    tabsOf(host)[0]!.click();
    await flush();
    expect(host.selected).toBe('photos');
  });

  it('arrow keys move focus without selecting (manual activation), no wrap; Home / End', async () => {
    const host = await mount(`<m3e-tabs selected="videos">${TABS}</m3e-tabs>`);
    const tabs = tabsOf(host);
    tabs[0]!.focus();
    key(tabs[0]!, 'ArrowLeft');
    expect(document.activeElement).toBe(tabs[0]);
    key(tabs[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]!.getAttribute('tabindex')).toBe('0');
    key(tabs[1]!, 'ArrowRight');
    // aria-disabled tabs stay reachable (APG).
    expect(document.activeElement).toBe(tabs[2]);
    key(tabs[2]!, 'End');
    expect(document.activeElement).toBe(tabs[3]);
    key(tabs[3]!, 'ArrowRight');
    expect(document.activeElement).toBe(tabs[3]);
    key(tabs[3]!, 'Home');
    expect(document.activeElement).toBe(tabs[0]);
    // Leaving the tablist puts the tab stop back on the selected tab.
    tabs[1]!.focus();
    const outside = document.createElement('button');
    document.body.append(outside);
    tabs[1]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
  });

  it('the primary indicator slides on the spring from the previous tab (content width), interruptibly', async () => {
    const host = await mount(`<m3e-tabs selected="videos">${TABS}</m3e-tabs>`);
    expect(host.rootElement!.hasAttribute('data-animating')).toBe(false);
    // Videos content 48px at 0 → Photos content 48px at 100.
    tabsOf(host)[1]!.click();
    await flush();
    expect(host.rootElement!.hasAttribute('data-animating')).toBe(true);
    // The first frame is written synchronously: the indicator still sits on Videos.
    expect(shift(host)).toBeCloseTo(-100, 2);
    runFrames(5);
    const offset = springValue(DEFAULT_SPATIAL, 80, 0, 100);
    expect(shift(host)).toBeCloseTo(offset - 100, 1);
    expect(indicatorWidth(host)).toBeCloseTo(48, 2);
    // Retarget to the icon-only tab (content 24 → indicator 24) mid-flight: velocity kept.
    const velocity = springVelocity(DEFAULT_SPATIAL, 80, 0, 100);
    host.selected = 'fav';
    await flush();
    runFrames(3);
    expect(shift(host)).toBeCloseTo(
      springValue(DEFAULT_SPATIAL, 48, offset, 300, velocity) - 300,
      1,
    );
    expect(indicatorWidth(host)).toBeCloseTo(springValue(DEFAULT_SPATIAL, 48, 48, 24), 1);
    runFrames(200);
    expect(host.rootElement!.hasAttribute('data-animating')).toBe(false);
    expect(host.rootElement!.getAttribute('style')).toBeNull();
  });

  it('secondary indicators animate the tab width; RTL mirrors the shift', async () => {
    const host = await mount(
      `<m3e-tabs variant="secondary" scrollable selected="videos">${TABS}</m3e-tabs>`,
      'direction: rtl;',
    );
    tabsOf(host)[1]!.click();
    await flush();
    // Videos tab 150px wide at 52, Photos 150px at 202: shift −150, mirrored → +150.
    expect(shift(host)).toBeCloseTo(150, 2);
    expect(indicatorWidth(host)).toBeCloseTo(150, 2);
  });

  it('scrollable rows scroll to centre the selected tab: at once on the first layout, then on the spring', async () => {
    const tabs = Array.from(
      { length: 8 },
      (_, i) => `<m3e-tab value="t${String(i)}">Tab ${String(i)}</m3e-tab>`,
    ).join('');
    const host = await mount(`<m3e-tabs scrollable selected="t5">${tabs}</m3e-tabs>`);
    const list = host.rootElement!.querySelector<HTMLElement>('.m3e-tabs__list')!;
    // Tabs 140px from 52: t5 at 752, row 52 + 8 × 140 + 52 = 1224, centred: 752 − (200 − 70).
    expect(list.scrollLeft).toBeCloseTo(622, 0);
    host.selected = 't1';
    await flush();
    runFrames(5);
    // t1 at 192 → 62.
    expect(list.scrollLeft).toBeCloseTo(springValue(DEFAULT_SPATIAL, 80, 622, 62), 0);
    runFrames(200);
    expect(list.scrollLeft).toBeCloseTo(62, 0);
  });

  it('observes the row, every tab and every tab content; new tabs join', async () => {
    const host = await mount(`<m3e-tabs>${TABS}</m3e-tabs>`);
    expect(observed).toHaveLength(9);
    host.insertAdjacentHTML('beforeend', '<m3e-tab value="x">X</m3e-tab>');
    await flush();
    expect(tabsOf(host)).toHaveLength(5);
    expect(observed).toHaveLength(11);
  });

  it('reduced motion (spatial duration 0) jumps', async () => {
    const host = await mount(
      `<m3e-tabs selected="videos">${TABS}</m3e-tabs>`,
      '--m3e-comp-tabs-indicator-duration: 0ms;',
    );
    tabsOf(host)[1]!.click();
    await flush();
    expect(host.rootElement!.hasAttribute('data-animating')).toBe(false);
    expect(frames).toHaveLength(0);
  });
});
