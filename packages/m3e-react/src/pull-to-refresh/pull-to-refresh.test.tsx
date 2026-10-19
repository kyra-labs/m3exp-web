import '@kyralabs/m3e-elements/loading-indicator.js';
import '@kyralabs/m3e-elements/pull-to-refresh.js';
import { act, createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { PullToRefresh } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const pointer = (target: Element, type: string, y: number) => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 3,
      pointerType: 'touch',
      clientX: 10,
      clientY: y,
    }),
  );
};

const stubCapture = (root: HTMLElement) => {
  root.setPointerCapture = () => undefined;
  root.hasPointerCapture = () => false;
  root.releasePointerCapture = () => undefined;
};

/** A touch pull of `distance` px past the slop. */
const pull = (target: Element, distance: number, release = true) => {
  pointer(target, 'pointerdown', 0);
  pointer(target, 'pointermove', 9);
  pointer(target, 'pointermove', 9 + distance);
  if (release) pointer(target, 'pointerup', 9 + distance);
};

describe('<PullToRefresh>', () => {
  it('renders the contract and calls onRefresh on a release past the threshold', async () => {
    function App() {
      const [refreshing, setRefreshing] = useState(false);
      return (
        <PullToRefresh
          isRefreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
          }}
          style={{ blockSize: 300 }}
        >
          <ul>
            <li>One</li>
          </ul>
        </PullToRefresh>
      );
    }
    const container = await renderReact(<App />);
    const root = container.querySelector<HTMLElement>('.m3e-pull-to-refresh')!;
    stubCapture(root);
    expect(root.style.blockSize).toBe('300px');
    const content = root.querySelector('.m3e-pull-to-refresh__content')!;
    expect(content.innerHTML).toBe('<ul><li>One</li></ul>');
    await act(async () => {
      pull(content, 400);
      await Promise.resolve();
    });
    expect(root.hasAttribute('data-refreshing')).toBe(true);
    expect(root.style.getPropertyValue('--_m3e-ptr-fraction')).toBe('1');
    expect(
      root.querySelector('.m3e-pull-to-refresh__refreshing')!.hasAttribute('aria-hidden'),
    ).toBe(false);
  });

  it('forwards the ref to the root; mouse drags do not pull', async () => {
    const ref = createRef<HTMLDivElement>();
    const onRefresh = vi.fn();
    const container = await renderReact(
      <PullToRefresh ref={ref} onRefresh={onRefresh} className="extra">
        <p>Content</p>
      </PullToRefresh>,
    );
    const root = container.querySelector<HTMLElement>('.m3e-pull-to-refresh')!;
    expect(ref.current).toBe(root);
    expect(root.className).toBe('m3e-pull-to-refresh extra');
    stubCapture(root);
    const content = root.querySelector('.m3e-pull-to-refresh__content')!;
    content.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }),
    );
    expect(root.hasAttribute('data-pulled')).toBe(false);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('the loading indicator variant follows the pull (determinate progress)', async () => {
    const container = await renderReact(
      <PullToRefresh indicator="loading-indicator">
        <p>Content</p>
      </PullToRefresh>,
    );
    const root = container.querySelector<HTMLElement>('.m3e-pull-to-refresh')!;
    stubCapture(root);
    await act(async () => {
      pull(root.querySelector('.m3e-pull-to-refresh__content')!, 80, false);
      await Promise.resolve();
    });
    const li = root.querySelector('.m3e-pull-to-refresh__pull > .m3e-loading-indicator')!;
    expect(li.getAttribute('aria-valuenow')).toBe('50');
  });
});

/** The element's contract with its child custom-element hosts unwrapped (they render inside). */
const unwrapHosts = (host: HTMLElement): string => {
  const clone = host.cloneNode(true) as HTMLElement;
  for (const inner of clone.querySelectorAll('m3e-loading-indicator')) {
    inner.replaceWith(...inner.childNodes);
  }
  return [...clone.childNodes].map(canonical).join('');
};

describe('<PullToRefresh> ⇔ <m3e-pull-to-refresh> DOM parity', () => {
  it.each([
    [
      'default',
      <PullToRefresh>
        <p>Content</p>
      </PullToRefresh>,
      '<m3e-pull-to-refresh><p>Content</p></m3e-pull-to-refresh>',
    ],
    [
      'refreshing, threshold, label',
      <PullToRefresh isRefreshing threshold={120} indicatorLabel="Reload">
        <p>Content</p>
      </PullToRefresh>,
      '<m3e-pull-to-refresh refreshing threshold="120" indicator-label="Reload"><p>Content</p></m3e-pull-to-refresh>',
    ],
    [
      'loading indicator',
      <PullToRefresh indicator="loading-indicator">
        <p>Content</p>
      </PullToRefresh>,
      '<m3e-pull-to-refresh indicator="loading-indicator"><p>Content</p></m3e-pull-to-refresh>',
    ],
    [
      'loading indicator, refreshing',
      <PullToRefresh indicator="loading-indicator" isRefreshing>
        <p>Content</p>
      </PullToRefresh>,
      '<m3e-pull-to-refresh indicator="loading-indicator" refreshing><p>Content</p></m3e-pull-to-refresh>',
    ],
  ])('%s', async (_, ui, html) => {
    const container = await renderReact(ui);
    const react = [...container.childNodes].map(canonical).join('');
    const host = await renderElement(html);
    // The child loading indicators render on their own microtasks.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(unwrapHosts(host)).toBe(react);
  });
});
