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

  it('center-aligned: the small contract plus the modifier', async () => {
    const container = await renderReact(<TopAppBar variant="center-aligned" title="Centered" />);
    expect(canonical(container.firstElementChild!)).toBe(
      '<header class="m3e-top-app-bar m3e-top-app-bar--center-aligned">' +
        '<div class="m3e-top-app-bar__headline"><h1 class="m3e-top-app-bar__title">Centered</h1></div>' +
        '</header>',
    );
  });

  it('medium flexible: collapsed headline (aria-hidden) in the top row, expanded row after', async () => {
    const container = await renderReact(
      <TopAppBar
        variant="medium-flexible"
        titleHorizontalAlignment="center"
        title="Inbox"
        subtitle="3 unread"
        headingLevel={2}
        navigationIcon={<button type="button">menu</button>}
        actions={<button type="button">search</button>}
      />,
    );
    const headline =
      '<h2 class="m3e-top-app-bar__title">Inbox</h2><p class="m3e-top-app-bar__subtitle">3 unread</p>';
    expect(canonical(container.firstElementChild!)).toBe(
      '<header class="m3e-top-app-bar m3e-top-app-bar--medium-flexible m3e-top-app-bar--center-aligned">' +
        '<div class="m3e-top-app-bar__navigation"><button type="button">menu</button></div>' +
        `<div aria-hidden="true" class="m3e-top-app-bar__headline">${headline}</div>` +
        '<div class="m3e-top-app-bar__actions"><button type="button">search</button></div>' +
        `<div class="m3e-top-app-bar__expanded"><div class="m3e-top-app-bar__headline">${headline}</div></div>` +
        '</header>',
    );
  });

  it('two-rows: per-row titles and custom heights', async () => {
    const container = await renderReact(
      <TopAppBar
        variant="two-rows"
        title={(expanded) => (expanded ? 'Expanded' : 'Collapsed')}
        collapsedHeight={64}
        expandedHeight="156px"
        style={{ color: 'inherit' }}
      />,
    );
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).toBe('m3e-top-app-bar m3e-top-app-bar--two-rows');
    expect(bar.style.getPropertyValue('--_m3e-top-app-bar-collapsed-height')).toBe('64px');
    expect(bar.style.getPropertyValue('--_m3e-top-app-bar-expanded-height')).toBe('156px');
    expect(bar.style.color).toBe('inherit');
    const titles = [...bar.querySelectorAll('.m3e-top-app-bar__title')].map((t) => t.textContent);
    expect(titles).toEqual(['Collapsed', 'Expanded']);
  });

  it('single-row bars ignore the two-rows heights', async () => {
    const container = await renderReact(<TopAppBar title="Inbox" expandedHeight={200} />);
    expect(container.firstElementChild!.hasAttribute('style')).toBe(false);
  });

  it('two-rows scroll: the semantics swap survives a re-render', async () => {
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
    const render = (title: string) =>
      act(async () => {
        root.render(
          <TopAppBar
            variant="large-flexible"
            title={title}
            scrollBehavior="exit-until-collapsed"
            scrollTarget={target}
          />,
        );
        await Promise.resolve();
      });
    await render('Inbox');
    const bar = container.firstElementChild as HTMLElement;
    const [collapsed, expanded] = bar.querySelectorAll('.m3e-top-app-bar__headline');
    await act(async () => {
      scroller.scrollTop = 40; // 40 of the 64px row: past half collapsed
      scroller.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
    });
    expect(bar.style.getPropertyValue('--_m3e-top-app-bar-offset')).toBe('-40px');
    expect(collapsed!.hasAttribute('aria-hidden')).toBe(false);
    expect(expanded!.getAttribute('aria-hidden')).toBe('true');
    await render('Archive');
    expect(collapsed!.hasAttribute('aria-hidden')).toBe(false);
    expect(expanded!.getAttribute('aria-hidden')).toBe('true');
    expect(expanded!.textContent).toBe('Archive');
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', height);
  });

  it('static by default: no scroll attributes', async () => {
    const container = await renderReact(<TopAppBar title="Inbox" />);
    expect(container.firstElementChild!.hasAttribute('data-scroll-behavior')).toBe(false);
  });
});
