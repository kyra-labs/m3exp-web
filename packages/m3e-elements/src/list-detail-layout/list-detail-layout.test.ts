import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../pane-motion/index.js';
import '../pane-expansion/index.js';
import './index.js';
import '../supporting-pane-layout/index.js';
import type { M3eListDetailLayout } from './index.js';
import type { M3eSupportingPaneLayout } from '../supporting-pane-layout/index.js';

/** ResizeObserver stand-in: `fire(w, h)` reports a content box for every observed element. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {
    this.observed = [];
  }
  disconnect() {
    this.observed = [];
  }
}

/** Sizes the layout container (the size class source) and the scaffold's box (the model). */
function resize(host: HTMLElement, width: number, height = 800) {
  const scaffold = host.querySelector<HTMLElement>('.m3e-pane-scaffold')!;
  scaffold.getBoundingClientRect = () => ({ left: 0, top: 0, width, height }) as DOMRect;
  Object.defineProperty(scaffold, 'clientWidth', { value: width, configurable: true });
  for (const ro of FakeResizeObserver.instances) {
    for (const el of ro.observed) {
      if (el.classList.contains('m3e-layout'))
        ro.callback(
          [{ target: el, contentRect: { width, height } } as unknown as ResizeObserverEntry],
          ro,
        );
    }
  }
}

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
/** Lets batched renders and the lazily imported pane-motion / pane-expansion entries land. */
const settle = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

beforeEach(() => {
  FakeResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
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

async function mount<T extends HTMLElement = M3eListDetailLayout>(html: string): Promise<T> {
  document.body.innerHTML = html;
  await settle();
  return document.body.firstElementChild as T;
}

const LIST_DETAIL = `<m3e-list-detail-layout list-label="Inbox" detail-label="Message">
  <div slot="list"><button id="item" data-pane-navigate="detail" data-content-key="7">Item</button></div>
  <div slot="detail"><button id="back" data-pane-navigate="back">Back</button><p>Detail</p></div>
</m3e-list-detail-layout>`;

const pane = (host: HTMLElement, role: string) =>
  host.querySelector<HTMLElement>(`.m3e-pane-scaffold__pane--${role}`)!;
const values = (host: HTMLElement) =>
  ['secondary', 'primary', 'tertiary'].map(
    (r) => host.querySelector<HTMLElement>(`.m3e-pane-scaffold__pane--${r}`)?.dataset['paneValue'],
  );

describe('<m3e-list-detail-layout>', () => {
  it('renders the m3e-css contract: one region per pane, children in their slots', async () => {
    const host = await mount(LIST_DETAIL);
    const layout = host.querySelector(':scope > .m3e-layout')!;
    const scaffold = layout.querySelector(':scope > .m3e-pane-scaffold')!;
    expect(scaffold.className).toBe('m3e-pane-scaffold m3e-pane-scaffold--list-detail');
    expect(scaffold.hasAttribute('data-managed')).toBe(true);
    expect([...scaffold.children].map((c) => c.className)).toEqual([
      'm3e-pane-scaffold__pane m3e-pane-scaffold__pane--secondary',
      'm3e-pane-scaffold__pane m3e-pane-scaffold__pane--primary',
    ]);
    expect(pane(host, 'secondary').getAttribute('role')).toBe('region');
    expect(pane(host, 'secondary').getAttribute('aria-label')).toBe('Inbox');
    expect(pane(host, 'primary').getAttribute('aria-label')).toBe('Message');
    expect(pane(host, 'primary').getAttribute('tabindex')).toBe('-1');
    expect(pane(host, 'secondary').querySelector('#item')).not.toBeNull();
    expect(pane(host, 'primary').querySelector('#back')).not.toBeNull();
  });

  it('single pane: list, navigate to the detail and back (focus follows, back hides)', async () => {
    const host = await mount(LIST_DETAIL);
    resize(host, 400);
    expect(values(host)).toEqual(['expanded', 'hidden', undefined]);
    const back = host.querySelector<HTMLElement>('#back')!;
    expect(back.hidden).toBe(true);
    const item = host.querySelector<HTMLElement>('#item')!;
    item.focus();
    const events: unknown[] = [];
    host.addEventListener('scaffold-value-change', (e) => events.push((e as CustomEvent).detail));
    item.click();
    expect(values(host)).toEqual(['hidden', 'expanded', undefined]);
    expect(host.currentDestination).toEqual({ pane: 'primary', contentKey: '7' });
    expect(document.activeElement).toBe(pane(host, 'primary'));
    expect(back.hidden).toBe(false);
    expect(events).toHaveLength(1);
    back.click();
    expect(values(host)).toEqual(['expanded', 'hidden', undefined]);
    expect(document.activeElement).toBe(item);
    expect(back.hidden).toBe(true);
    expect(host.canNavigateBack()).toBe(false);
  });

  it('two panes from 840px of the layout’s own width; the detail takes the rest', async () => {
    const host = await mount(LIST_DETAIL);
    resize(host, 1000);
    expect(values(host)).toEqual(['expanded', 'expanded', undefined]);
    expect(pane(host, 'primary').hasAttribute('data-grow')).toBe(true);
    expect(pane(host, 'secondary').hasAttribute('data-grow')).toBe(false);
    resize(host, 700);
    expect(values(host)).toEqual(['expanded', 'hidden', undefined]);
    expect(pane(host, 'secondary').hasAttribute('data-grow')).toBe(true);
  });

  it('two panes at large with an extra pane, three from 1600px; pane-rule="compose" shows three from 1200px', async () => {
    const html = (rule = '') =>
      `<m3e-list-detail-layout ${rule}><p slot="list">L</p><p slot="detail">D</p><p slot="extra">E</p></m3e-list-detail-layout>`;
    // Default: m3.material.io's recommendation (owner decision 2026-10-18).
    const host = await mount(html());
    expect(host.querySelector('.m3e-pane-scaffold')!.className).toBe(
      'm3e-pane-scaffold m3e-pane-scaffold--list-detail',
    );
    resize(host, 1300);
    expect(values(host)).toEqual(['expanded', 'expanded', 'hidden']);
    resize(host, 1700);
    expect(values(host)).toEqual(['expanded', 'expanded', 'expanded']);
    document.body.innerHTML = '';
    // Opt-in: Compose's calculatePaneScaffoldDirective.
    const compose = await mount(html('pane-rule="compose"'));
    expect(compose.querySelector('.m3e-pane-scaffold')!.className).toBe(
      'm3e-pane-scaffold m3e-pane-scaffold--list-detail m3e-pane-scaffold--compose',
    );
    resize(compose, 1000);
    expect(values(compose)).toEqual(['expanded', 'expanded', 'hidden']);
    resize(compose, 1300);
    expect(values(compose)).toEqual(['expanded', 'expanded', 'expanded']);
    // Switching the attribute back re-applies the default.
    compose.removeAttribute('pane-rule');
    await settle();
    expect(compose.querySelector('.m3e-pane-scaffold')!.className).toBe(
      'm3e-pane-scaffold m3e-pane-scaffold--list-detail',
    );
    expect(values(compose)).toEqual(['expanded', 'expanded', 'hidden']);
  });

  it('animates navigation on the pane motion spring, writing only the pane bounds', async () => {
    const host = await mount(LIST_DETAIL);
    const scaffold = host.scaffoldElement!;
    scaffold.style.setProperty('--m3e-comp-pane-scaffold-motion-damping-ratio', '0.8');
    scaffold.style.setProperty('--m3e-comp-pane-scaffold-motion-stiffness', '380');
    scaffold.style.setProperty('--m3e-comp-pane-scaffold-motion-duration', '475ms');
    resize(host, 400);
    host.navigateTo('detail', 1);
    expect(scaffold.hasAttribute('data-animating')).toBe(true);
    const detail = pane(host, 'primary');
    const list = pane(host, 'secondary');
    expect(list.hasAttribute('data-exiting')).toBe(true);
    expect(list.hasAttribute('inert')).toBe(true);
    // Detail enters from the right (x: 400 → 0), the list exits to the left (0 → −400).
    expect(detail.style.getPropertyValue('--_m3e-pane-x')).toBe('400px');
    runFrames(6);
    const x = Number.parseFloat(detail.style.getPropertyValue('--_m3e-pane-x'));
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(400);
    expect(Number.parseFloat(list.style.getPropertyValue('--_m3e-pane-x'))).toBeLessThan(0);
    runFrames(120);
    expect(scaffold.hasAttribute('data-animating')).toBe(false);
    expect(detail.style.getPropertyValue('--_m3e-pane-x')).toBe('');
    expect(list.hasAttribute('data-exiting')).toBe(false);
    expect(list.hasAttribute('inert')).toBe(false);
  });

  it('a size class change snaps (no animation), as Compose’s navigator does', async () => {
    const host = await mount(LIST_DETAIL);
    host.scaffoldElement!.style.setProperty('--m3e-comp-pane-scaffold-motion-duration', '475ms');
    resize(host, 400);
    resize(host, 1000);
    expect(host.scaffoldElement!.hasAttribute('data-animating')).toBe(false);
    expect(values(host)).toEqual(['expanded', 'expanded', undefined]);
  });

  it('drag handle: shown between two panes; keyboard moves the split to the anchors', async () => {
    const host = await mount(
      LIST_DETAIL.replace('<m3e-list-detail-layout', '<m3e-list-detail-layout drag-handle'),
    );
    const scaffold = host.scaffoldElement!;
    const handle = scaffold.querySelector<HTMLElement>('.m3e-pane-scaffold__drag-handle')!;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-label')).toBe('Pane expansion drag handle');
    resize(host, 400);
    expect(scaffold.hasAttribute('data-handle')).toBe(false);
    resize(host, 1000);
    await settle(); // the pane-expansion entry loads on first use
    expect(scaffold.hasAttribute('data-handle')).toBe(true);
    expect(scaffold.style.getPropertyValue('--_m3e-pane-handle-x')).toBe('372px');
    expect(handle.getAttribute('aria-valuenow')).toBe('37');
    handle.focus();
    // End: the end-most anchor (100 %): the list takes everything, the detail collapses.
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(pane(host, 'primary').hasAttribute('data-collapsed')).toBe(true);
    expect(pane(host, 'secondary').hasAttribute('data-grow')).toBe(true);
    // Enter: the next anchor, wrapping to 0 %: the detail takes everything.
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(pane(host, 'secondary').hasAttribute('data-collapsed')).toBe(true);
    // ArrowRight: 240dp from the start → the list is 228px wide.
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(pane(host, 'secondary').style.getPropertyValue('--_m3e-pane-basis')).toBe('228px');
    expect(pane(host, 'primary').hasAttribute('data-grow')).toBe(true);
  });
});

describe('<m3e-supporting-pane-layout>', () => {
  it('main first; the supporting pane reflows under it when the layout is tall', async () => {
    const host = await mount<M3eSupportingPaneLayout>(
      `<m3e-supporting-pane-layout supporting-label="Related"><p>Main</p><p slot="supporting">S</p></m3e-supporting-pane-layout>`,
    );
    const order = [...host.scaffoldElement!.children].map((c) => c.className.split('--')[1]);
    expect(order).toEqual(['primary', 'secondary']);
    expect(pane(host, 'secondary').getAttribute('aria-label')).toBe('Related');
    resize(host, 700, 800);
    expect(values(host)).toEqual(['hidden', 'expanded', undefined]);
    resize(host, 700, 1000);
    expect(values(host)).toEqual(['reflowed', 'expanded', undefined]);
    expect(host.scaffoldElement!.hasAttribute('data-reflow')).toBe(true);
    // Still reflowed: navigating to the supporting pane expands its anchor, the main pane.
    host.navigateTo('supporting');
    expect(values(host)).toEqual(['reflowed', 'expanded', undefined]);
    resize(host, 700, 800);
    expect(values(host)).toEqual(['expanded', 'hidden', undefined]);
  });
});
