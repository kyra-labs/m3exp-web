import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { canonical, renderReact } from '../test/parity.js';
import { TopAppBar } from './TopAppBar.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<TopAppBar>', () => {
  it('renders the m3e-css contract', async () => {
    const container = await renderReact(
      <TopAppBar
        title="Inbox"
        subtitle="3 unread"
        navigationIcon={<button type="button">menu</button>}
        actions={<button type="button">search</button>}
      />,
    );
    expect(canonical(container.firstElementChild!)).toBe(
      '<header class="m3e-top-app-bar">' +
        '<div class="m3e-top-app-bar__navigation"><button type="button">menu</button></div>' +
        '<div class="m3e-top-app-bar__headline"><h1 class="m3e-top-app-bar__title">Inbox</h1>' +
        '<p class="m3e-top-app-bar__subtitle">3 unread</p></div>' +
        '<div class="m3e-top-app-bar__actions"><button type="button">search</button></div>' +
        '</header>',
    );
  });

  it('omits empty slots and uses the requested heading level', async () => {
    const container = await renderReact(<TopAppBar title="Settings" headingLevel={2} />);
    expect(canonical(container.firstElementChild!)).toBe(
      '<header class="m3e-top-app-bar"><div class="m3e-top-app-bar__headline">' +
        '<h2 class="m3e-top-app-bar__title">Settings</h2></div></header>',
    );
  });

  it('attaches the scroll behavior to its target and detaches on unmount', async () => {
    // happy-dom has no layout: give every element a 64px height for the duration of the test.
    const height = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 64,
    });
    const scroller = document.createElement('div');
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 500 });
    document.body.append(scroller);
    const target = createRef<HTMLElement>();
    (target as { current: HTMLElement }).current = scroller;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<TopAppBar title="Inbox" scrollBehavior="pinned" scrollTarget={target} />);
      await Promise.resolve();
    });
    const bar = container.firstElementChild!;
    expect(bar.getAttribute('data-scroll-behavior')).toBe('pinned');
    await act(async () => {
      scroller.scrollTop = 100;
      scroller.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
    });
    expect(bar.hasAttribute('data-scrolled')).toBe(true);
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    expect(bar.hasAttribute('data-scroll-behavior')).toBe(false);
    expect(bar.hasAttribute('data-scrolled')).toBe(false);
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
  });

  it('static by default: no scroll attributes', async () => {
    const container = await renderReact(<TopAppBar title="Inbox" />);
    expect(container.firstElementChild!.hasAttribute('data-scroll-behavior')).toBe(false);
  });
});
