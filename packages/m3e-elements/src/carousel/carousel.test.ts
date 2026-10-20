import {
  calculateMaxScrollOffset,
  carouselItemLayout,
  carouselItemScrollOffset,
  carouselStrategy,
  getSnapPositionOffset,
} from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { carouselLayoutType, carouselStyle } from './carousel.js';
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
const settle = () => {
  for (let i = 0; i < 300 && frames.length > 0; i++) runFrames(1);
};

/** happy-dom lays nothing out: the carousel is 412px wide (the Compose samples' window). */
const WIDTH = 412;
class FakeResizeObserver {
  constructor(private readonly cb: ResizeObserverCallback) {}
  observe(target: Element): void {
    this.cb(
      [
        {
          target,
          contentBoxSize: [{ inlineSize: WIDTH, blockSize: 221 }],
          contentRect: { width: WIDTH, height: 221 },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve = vi.fn();
  disconnect = vi.fn();
}

let reduced = false;
beforeEach(() => {
  frames = [];
  now = 0;
  reduced = false;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const items = (n: number, attrs: (i: number) => string = () => '') =>
  Array.from(
    { length: n },
    (_, i) =>
      `<m3e-carousel-item${attrs(i)}><img alt="Photo ${String(i + 1)}"></m3e-carousel-item>`,
  ).join('');

const mount = async (html: string) => {
  document.body.innerHTML = html;
  await flush();
  const host = document.querySelector('m3e-carousel')!;
  await host.ready;
  const root = host.rootElement!;
  const viewport = root.querySelector<HTMLElement>('.m3e-carousel__viewport')!;
  // The scroll position as the layout reads it (happy-dom does not scroll).
  let position = 0;
  Object.defineProperty(viewport, 'scrollLeft', {
    configurable: true,
    get: () => position,
    set: (v: number) => {
      position = v;
    },
  });
  return {
    host,
    root,
    viewport,
    items: () => [...viewport.querySelectorAll<HTMLElement>('.m3e-carousel__item')],
    scroll: (v: number) => {
      position = v;
      viewport.dispatchEvent(new Event('scroll'));
      runFrames(1);
    },
  };
};

describe('<m3e-carousel> DOM contract', () => {
  it('renders an APG carousel region of slides and moves the item content into the masks', async () => {
    const {
      host,
      root,
      items: rendered,
    } = await mount(`<m3e-carousel label="Featured" item-width="186">${items(3)}</m3e-carousel>`);
    expect(host.style.display).toBe('contents');
    expect(root.className).toBe('m3e-carousel m3e-carousel--multi-browse');
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-roledescription')).toBe('carousel');
    expect(root.getAttribute('aria-label')).toBe('Featured');
    expect(root.style.getPropertyValue('--m3e-comp-carousel-item-width')).toBe('186px');
    const [first] = rendered();
    expect(first!.getAttribute('role')).toBe('group');
    expect(first!.getAttribute('aria-roledescription')).toBe('slide');
    expect(rendered().map((i) => i.getAttribute('aria-label'))).toEqual([
      '1 of 3',
      '2 of 3',
      '3 of 3',
    ]);
    expect(first!.getAttribute('tabindex')).toBe('0');
    expect(first!.querySelector(':scope > .m3e-carousel__mask > img')?.getAttribute('alt')).toBe(
      'Photo 1',
    );
    expect(host.querySelector('m3e-carousel-item')!.childNodes).toHaveLength(0);
  });

  it('links and buttons: the mask is the action (state layer, ripple), the item no tab stop', async () => {
    const { host, items: rendered } = await mount(
      `<m3e-carousel item-width="186">${items(2, (i) => (i === 0 ? ' href="/a"' : ' action label="Second"'))}</m3e-carousel>`,
    );
    const [link, button] = rendered().map((i) => i.firstElementChild as HTMLElement);
    expect(link!.localName).toBe('a');
    expect(link!.className).toBe('m3e-carousel__mask m3e-carousel__action');
    expect(link!.getAttribute('href')).toBe('/a');
    expect(link!.hasAttribute('data-ripple')).toBe(true);
    expect(button!.localName).toBe('button');
    expect(button!.getAttribute('type')).toBe('button');
    expect(rendered()[0]!.hasAttribute('tabindex')).toBe(false);
    expect(rendered()[1]!.getAttribute('aria-label')).toBe('Second');
    const clicks: unknown[] = [];
    host.addEventListener('item-click', (e) => clicks.push((e as CustomEvent).detail));
    button!.click();
    expect(clicks).toEqual([{ index: 1 }]);
  });

  it('layouts and the style helpers', () => {
    expect(carouselLayoutType('hero')).toBe('hero');
    expect(carouselLayoutType('nope')).toBe('multi-browse');
    expect(carouselStyle(186, 8, 16)).toEqual({
      '--m3e-comp-carousel-item-width': '186px',
      '--m3e-comp-carousel-item-spacing': '8px',
      '--m3e-comp-carousel-content-padding-start': '16px',
      '--m3e-comp-carousel-content-padding-end': '16px',
    });
    expect(carouselStyle(null, undefined, null)).toEqual({});
  });
});

describe('CarouselLayout (keylines)', () => {
  const input = {
    layout: 'multi-browse' as const,
    availableSpace: WIDTH,
    itemSize: 186,
    itemSpacing: 8,
    itemCount: 6,
    beforeContentPadding: 16,
    afterContentPadding: 16,
  };
  const html = `<m3e-carousel item-width="186" item-spacing="8" content-padding="16">${items(6)}</m3e-carousel>`;

  it('sizes the items at the focal size and snaps each to its keyline', async () => {
    const { root, items: rendered } = await mount(html);
    const strategy = carouselStrategy(input);
    expect(root.hasAttribute('data-keylines')).toBe(true);
    expect(root.style.getPropertyValue('--_m3e-carousel-item-size')).toBe(
      `${String(strategy.itemMainAxisSize)}px`,
    );
    rendered().forEach((item, i) => {
      const rest = Math.min(
        Math.max(carouselItemScrollOffset(strategy, i, 6), 0),
        calculateMaxScrollOffset(strategy, 6),
      );
      const margin = i * (strategy.itemMainAxisSize + 8) - rest;
      expect(item.style.getPropertyValue('--_m3e-carousel-snap')).toBe(
        `${String(Math.round(margin * 100) / 100)}px`,
      );
      if (rest === carouselItemScrollOffset(strategy, i, 6)) {
        expect(margin).toBe(getSnapPositionOffset(strategy, i, 6));
      }
    });
  });

  it('masks and translates every item as Modifier.carouselItem on each scroll frame', async () => {
    const { items: rendered, scroll } = await mount(html);
    const strategy = carouselStrategy(input);
    const max = calculateMaxScrollOffset(strategy, 6);
    for (const offset of [0, 97, 250]) {
      scroll(offset);
      rendered().forEach((item, i) => {
        const placed = carouselItemLayout(strategy, i, offset, max);
        const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
        expect(item.style.getPropertyValue('--_m3e-carousel-translate')).toBe(
          px(placed.translation),
        );
        expect(item.style.getPropertyValue('--_m3e-carousel-inset')).toBe(
          placed.clipped ? px(placed.maskStart) : '',
        );
      });
    }
    // z-index falls off from the current item.
    scroll(0);
    expect(rendered().map((i) => i.style.getPropertyValue('--_m3e-carousel-z'))).toEqual([
      '6',
      '5',
      '4',
      '3',
      '2',
      '1',
    ]);
  });

  it('reduced motion: the focal size, no masks or snap margins (owner decision M9 #24)', async () => {
    reduced = true;
    const { root, items: rendered } = await mount(html);
    expect(root.hasAttribute('data-keylines')).toBe(false);
    expect(root.style.getPropertyValue('--_m3e-carousel-item-size')).not.toBe('');
    expect(rendered()[2]!.getAttribute('style') ?? '').toBe('');
  });

  it('without an item width (multi-browse) or for full screen: the CSS layout alone', async () => {
    const plain = await mount(`<m3e-carousel>${items(3)}</m3e-carousel>`);
    expect(plain.root.hasAttribute('data-keylines')).toBe(false);
    expect(plain.root.style.getPropertyValue('--_m3e-carousel-item-size')).toBe('');
    const full = await mount(`<m3e-carousel layout="full-screen">${items(3)}</m3e-carousel>`);
    expect(full.root.className).toBe('m3e-carousel m3e-carousel--full-screen');
    expect(full.root.hasAttribute('data-keylines')).toBe(false);
  });

  it('hero without an item width fills the carousel but for the small item', async () => {
    const { root } = await mount(`<m3e-carousel layout="hero">${items(4)}</m3e-carousel>`);
    expect(root.style.getPropertyValue('--_m3e-carousel-item-size')).toBe(
      `${String(WIDTH - 40)}px`,
    );
  });
});

describe('CarouselLayout (keys and focus, owner decision M9 #26)', () => {
  const html = `<m3e-carousel item-width="186" item-spacing="8">${items(5)}</m3e-carousel>`;
  const key = (target: Element, k: string) => {
    const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(e);
    return e.defaultPrevented;
  };

  it('arrows, Home and End move between the items’ own tab stops without wrapping', async () => {
    const { items: rendered } = await mount(html);
    const all = rendered();
    all[0]!.focus();
    expect(key(all[0]!, 'ArrowRight')).toBe(true);
    expect(document.activeElement).toBe(all[1]);
    key(all[1]!, 'End');
    expect(document.activeElement).toBe(all[4]);
    key(all[4]!, 'ArrowRight');
    expect(document.activeElement).toBe(all[4]);
    key(all[4]!, 'Home');
    expect(document.activeElement).toBe(all[0]);
    expect(key(all[0]!, 'ArrowDown')).toBe(false);
    // Every item stays a tab stop.
    expect(all.every((i) => i.getAttribute('tabindex') === '0')).toBe(true);
  });

  it('a focused item scrolls to its snap position on the scroll spring', async () => {
    const { host, viewport, items: rendered, root } = await mount(html);
    root.style.setProperty('--m3e-comp-carousel-scroll-duration', '238ms');
    root.style.setProperty('--m3e-comp-carousel-scroll-damping-ratio', '1');
    root.style.setProperty('--m3e-comp-carousel-scroll-stiffness', '1500');
    rendered()[3]!.focus();
    expect(root.hasAttribute('data-scrolling')).toBe(true);
    runFrames(2);
    const mid = viewport.scrollLeft;
    settle();
    expect(root.hasAttribute('data-scrolling')).toBe(false);
    const strategy = carouselStrategy({
      layout: 'multi-browse',
      availableSpace: WIDTH,
      itemSize: 186,
      itemSpacing: 8,
      itemCount: 5,
      beforeContentPadding: 0,
      afterContentPadding: 0,
    });
    const target = Math.min(
      carouselItemScrollOffset(strategy, 3, 5),
      calculateMaxScrollOffset(strategy, 5),
    );
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(target);
    expect(viewport.scrollLeft).toBeCloseTo(target, 1);
    // Items resting at the end of the range resolve to the first of them.
    expect(host.currentItem).toBeLessThanOrEqual(3);
  });

  it('scrollToItem without animation jumps', async () => {
    const { host, viewport } = await mount(html);
    host.scrollToItem(1, false);
    expect(viewport.scrollLeft).toBeGreaterThan(0);
    expect(frames).toHaveLength(0);
  });
});

describe('<m3e-carousel>: M11 API', () => {
  it('an action item dispatches a bubbling action { index }; the deprecated item-click still fires', async () => {
    const { host, items: rendered } = await mount(
      `<m3e-carousel item-width="186">${items(3, (i) => (i === 2 ? ' action' : ''))}</m3e-carousel>`,
    );
    const events: [string, EventTarget | null, unknown][] = [];
    host.addEventListener('action', (e) => events.push([e.type, e.target, e.detail]));
    host.addEventListener('item-click', (e) => events.push([e.type, e.target, e.detail]));
    (rendered()[2]!.firstElementChild as HTMLElement).click();
    const source = host.querySelectorAll('m3e-carousel-item')[2];
    expect(events).toEqual([
      ['action', source, { index: 2 }],
      ['item-click', host, { index: 2 }],
    ]);
  });
});
