import type { WindowSizeClass } from '@kyralabs/m3e-motion';
import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWindowSizeClass, type UseWindowSizeClassOptions } from './useWindowSizeClass.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** matchMedia answering `(min-width|min-height: Npx)` from a fake viewport. */
const viewport = { width: 0, height: 0 };
let lists: (EventTarget & { media: string; matches: boolean })[] = [];

function resize(width: number, height: number) {
  const before = lists.map((l) => l.matches);
  viewport.width = width;
  viewport.height = height;
  lists.forEach((l, i) => {
    if (l.matches !== before[i]) l.dispatchEvent(new Event('change'));
  });
}

let observers: { callback: ResizeObserverCallback; disconnected: boolean }[] = [];

beforeEach(() => {
  lists = [];
  observers = [];
  viewport.width = 700;
  viewport.height = 500;
  vi.stubGlobal('matchMedia', (media: string) => {
    const [, feature, bound] = /^\(min-(width|height): (\d+)px\)$/.exec(media)!;
    const list = Object.assign(new EventTarget(), { media });
    Object.defineProperty(list, 'matches', {
      get: () => viewport[feature as 'width' | 'height'] >= Number(bound),
    });
    lists.push(list as EventTarget & { media: string; matches: boolean });
    return list;
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      record: { callback: ResizeObserverCallback; disconnected: boolean };
      constructor(callback: ResizeObserverCallback) {
        this.record = { callback, disconnected: false };
        observers.push(this.record);
      }
      observe() {
        // The test fires the callback itself.
      }
      disconnect() {
        this.record.disconnected = true;
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

async function mount(ui: React.ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(ui);
    await Promise.resolve();
  });
  return root;
}

describe('useWindowSizeClass', () => {
  it('reads the viewport on the first render and re-renders only on a class change', async () => {
    const renders: WindowSizeClass[] = [];
    function Probe(props: UseWindowSizeClassOptions) {
      renders.push(useWindowSizeClass(props));
      return null;
    }
    const root = await mount(<Probe />);
    expect(renders[0]).toEqual({
      widthClass: 'medium',
      heightClass: 'medium',
      minWidth: 600,
      minHeight: 480,
    });
    const count = renders.length;
    await act(async () => {
      resize(800, 600); // same buckets
      await Promise.resolve();
    });
    expect(renders).toHaveLength(count);
    await act(async () => {
      resize(840, 600);
      await Promise.resolve();
    });
    expect(renders.at(-1)).toMatchObject({ widthClass: 'expanded' });
    await act(async () => {
      resize(1600, 900);
      await Promise.resolve();
    });
    expect(renders.at(-1)).toMatchObject({ widthClass: 'extra-large', heightClass: 'expanded' });

    await act(async () => {
      root.render(<Probe largeAndExtraLargeWidth={false} />);
      await Promise.resolve();
    });
    expect(renders.at(-1)).toMatchObject({ widthClass: 'expanded', minWidth: 840 });

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    const after = renders.length;
    resize(300, 300);
    expect(renders).toHaveLength(after);
  });

  it("follows a target element's content box", async () => {
    const seen: WindowSizeClass[] = [];
    function Pane() {
      const ref = useRef<HTMLDivElement>(null);
      seen.push(useWindowSizeClass({ target: ref }));
      return (
        <div
          ref={(el) => {
            ref.current = el;
            if (el) {
              Object.defineProperty(el, 'clientWidth', { configurable: true, value: 1250 });
              Object.defineProperty(el, 'clientHeight', { configurable: true, value: 400 });
            }
          }}
        />
      );
    }
    const root = await mount(<Pane />);
    // Default before the target is measured, then the measured content box.
    expect(seen[0]).toMatchObject({ widthClass: 'compact', heightClass: 'compact' });
    expect(seen.at(-1)).toMatchObject({ widthClass: 'large', heightClass: 'compact' });
    expect(lists).toHaveLength(0);
    await act(async () => {
      observers[0]!.callback(
        [{ contentRect: { width: 650, height: 950 } } as unknown as ResizeObserverEntry],
        {} as ResizeObserver,
      );
      await Promise.resolve();
    });
    expect(seen.at(-1)).toMatchObject({ widthClass: 'medium', heightClass: 'expanded' });
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    expect(observers[0]!.disconnected).toBe(true);
  });

  it('uses `initial` until a target is measured', async () => {
    const initial = {
      widthClass: 'expanded',
      heightClass: 'medium',
      minWidth: 840,
      minHeight: 480,
    } as const;
    const seen: WindowSizeClass[] = [];
    function Pane() {
      const ref = useRef<HTMLDivElement>(null);
      seen.push(useWindowSizeClass({ target: ref, initial }));
      return null; // the ref never attaches
    }
    await mount(<Pane />);
    expect(seen.every((c) => c === initial)).toBe(true);
    expect(observers).toHaveLength(0);
  });
});
