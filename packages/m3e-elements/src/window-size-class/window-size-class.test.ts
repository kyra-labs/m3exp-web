import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentWindowSizeClass, observeWindowSizeClass } from './index.js';
import type { WindowSizeClass } from './index.js';

/** A fake viewport: matchMedia answers `(min-width|min-height: Npx)` from `viewport`. */
const viewport = { width: 0, height: 0 };
const lists: FakeMediaQueryList[] = [];

class FakeMediaQueryList extends EventTarget {
  readonly feature: 'width' | 'height';
  readonly bound: number;
  constructor(readonly media: string) {
    super();
    const m = /^\(min-(width|height): (\d+)px\)$/.exec(media);
    if (!m) throw new Error(`unexpected query ${media}`);
    this.feature = m[1] as 'width' | 'height';
    this.bound = Number(m[2]);
  }
  get matches(): boolean {
    return viewport[this.feature] >= this.bound;
  }
  listeners(): number {
    return listenerCounts.get(this) ?? 0;
  }
}
const listenerCounts = new Map<EventTarget, number>();

/** Resizes the fake viewport and fires `change` on every query whose result flipped. */
function resize(width: number, height: number) {
  const before = lists.map((l) => l.matches);
  viewport.width = width;
  viewport.height = height;
  lists.forEach((l, i) => {
    if (l.matches !== before[i]) l.dispatchEvent(new Event('change'));
  });
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  disconnected = false;
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
    this.disconnected = true;
  }
  fire(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as unknown as ResizeObserverEntry],
      this,
    );
  }
}

beforeEach(() => {
  lists.length = 0;
  listenerCounts.clear();
  FakeResizeObserver.instances = [];
  viewport.width = 1024;
  viewport.height = 768;
  vi.stubGlobal('matchMedia', (media: string) => {
    const list = new FakeMediaQueryList(media);
    const add = list.addEventListener.bind(list);
    list.addEventListener = (type, cb, opts) => {
      listenerCounts.set(list, (listenerCounts.get(list) ?? 0) + 1);
      const signal = typeof opts === 'object' ? opts.signal : undefined;
      signal?.addEventListener('abort', () => {
        listenerCounts.set(list, (listenerCounts.get(list) ?? 1) - 1);
      });
      add(type, cb, opts);
    };
    lists.push(list);
    return list as unknown as MediaQueryList;
  });
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('observeWindowSizeClass (viewport)', () => {
  it('reports the current class at once, then only when a breakpoint is crossed', () => {
    const seen: WindowSizeClass[] = [];
    const controller = new AbortController();
    observeWindowSizeClass((c) => seen.push(c), { signal: controller.signal });
    expect(seen).toEqual([
      { widthClass: 'expanded', heightClass: 'medium', minWidth: 840, minHeight: 480 },
    ]);
    // One query per breakpoint: 4 widths + 2 heights.
    expect(lists.map((l) => l.media)).toEqual([
      '(min-width: 600px)',
      '(min-width: 840px)',
      '(min-width: 1200px)',
      '(min-width: 1600px)',
      '(min-height: 480px)',
      '(min-height: 900px)',
    ]);

    resize(1100, 800); // same buckets: no change event fires
    expect(seen).toHaveLength(1);
    resize(1199, 899);
    expect(seen).toHaveLength(1);
    resize(1200, 899);
    expect(seen.at(-1)).toMatchObject({ widthClass: 'large', heightClass: 'medium' });
    resize(1600, 900);
    // Two queries flip at once: the first change event reads both, the second is not a change.
    expect(seen.slice(2).map((c) => [c.widthClass, c.heightClass])).toEqual([
      ['extra-large', 'expanded'],
    ]);
    resize(599, 479);
    expect(seen.at(-1)).toMatchObject({ widthClass: 'compact', heightClass: 'compact' });
    resize(600, 480);
    expect(seen.at(-1)).toMatchObject({ widthClass: 'medium', heightClass: 'medium' });
    resize(839, 480);
    expect(seen.at(-1)).toMatchObject({ widthClass: 'medium' });
    resize(840, 480);
    expect(seen.at(-1)).toMatchObject({ widthClass: 'expanded' });
  });

  it('stops listening when the signal aborts', () => {
    const callback = vi.fn();
    const controller = new AbortController();
    observeWindowSizeClass(callback, { signal: controller.signal });
    expect(lists.every((l) => l.listeners() === 1)).toBe(true);
    controller.abort();
    expect(lists.every((l) => l.listeners() === 0)).toBe(true);
    resize(400, 400);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does nothing with an already aborted signal', () => {
    const callback = vi.fn();
    observeWindowSizeClass(callback, { signal: AbortSignal.abort() });
    expect(callback).not.toHaveBeenCalled();
    expect(lists).toHaveLength(0);
  });

  it('keeps wide windows expanded with largeAndExtraLargeWidth: false (V1)', () => {
    const callback = vi.fn();
    viewport.width = 1700;
    observeWindowSizeClass(callback, {
      signal: new AbortController().signal,
      largeAndExtraLargeWidth: false,
    });
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ widthClass: 'expanded' }));
  });

  it('falls back to resize events and innerWidth/innerHeight without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    vi.stubGlobal('innerWidth', 500);
    vi.stubGlobal('innerHeight', 1000);
    const callback = vi.fn();
    const controller = new AbortController();
    observeWindowSizeClass(callback, { signal: controller.signal });
    expect(callback).toHaveBeenLastCalledWith(
      expect.objectContaining({ widthClass: 'compact', heightClass: 'expanded' }),
    );
    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ widthClass: 'expanded' }));
    controller.abort();
    vi.stubGlobal('innerWidth', 300);
    window.dispatchEvent(new Event('resize'));
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('observeWindowSizeClass (container target)', () => {
  const box = (width: number, height: number, padding = '0px') => {
    const el = document.createElement('div');
    el.style.padding = padding;
    document.body.append(el);
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: height });
    return el;
  };

  it("classifies the target's content box and follows its ResizeObserver", () => {
    const el = box(640, 520, '20px');
    const seen: WindowSizeClass[] = [];
    const controller = new AbortController();
    observeWindowSizeClass((c) => seen.push(c), { target: el, signal: controller.signal });
    // 640 - 2 × 20 = 600 wide, 520 - 40 = 480 tall.
    expect(seen).toEqual([
      { widthClass: 'medium', heightClass: 'medium', minWidth: 600, minHeight: 480 },
    ]);
    expect(lists).toHaveLength(0);
    const [observer] = FakeResizeObserver.instances;
    expect(observer!.observed).toEqual([el]);

    observer!.fire(700, 500); // same buckets
    expect(seen).toHaveLength(1);
    observer!.fire(599.5, 500);
    expect(seen.at(-1)).toMatchObject({ widthClass: 'compact' });
    observer!.fire(1599, 479);
    expect(seen.at(-1)).toMatchObject({ widthClass: 'large', heightClass: 'compact' });

    controller.abort();
    expect(observer!.disconnected).toBe(true);
  });

  it('reports once without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const callback = vi.fn();
    observeWindowSizeClass(callback, {
      target: box(300, 300),
      signal: new AbortController().signal,
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ widthClass: 'compact' }));
  });
});

describe('currentWindowSizeClass', () => {
  it('reads the viewport or a target once', () => {
    expect(currentWindowSizeClass()).toMatchObject({
      widthClass: 'expanded',
      heightClass: 'medium',
    });
    viewport.width = 1600;
    expect(currentWindowSizeClass()).toMatchObject({ widthClass: 'extra-large' });
    expect(currentWindowSizeClass({ largeAndExtraLargeWidth: false })).toMatchObject({
      widthClass: 'expanded',
    });
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientWidth', { value: 1250 });
    Object.defineProperty(el, 'clientHeight', { value: 950 });
    expect(currentWindowSizeClass({ target: el })).toMatchObject({
      widthClass: 'large',
      heightClass: 'expanded',
    });
  });
});
