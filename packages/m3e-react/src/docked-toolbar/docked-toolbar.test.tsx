/* eslint-disable @typescript-eslint/no-deprecated -- the D4 legacy BottomAppBar is tested too */
import '@kyralabs/m3e-elements/docked-toolbar.js';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { BottomAppBar } from './BottomAppBar.js';
import { DockedToolbar, dockedToolbarClassName } from './DockedToolbar.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const key = async (target: Element, k: string) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};

/** A plain icon button (the same markup in both layers). */
const Icon = ({ name }: { name: string }) => (
  <button type="button" className="m3e-icon-button" aria-label={name}>
    <span className="m3e-icon" aria-hidden="true">
      {name}
    </span>
  </button>
);
const iconHtml = (name: string) =>
  `<button type="button" class="m3e-icon-button" aria-label="${name}"><span class="m3e-icon" aria-hidden="true">${name}</span></button>`;

const scroller = () => {
  const el = document.createElement('div');
  document.body.append(el);
  Object.defineProperty(el, 'scrollHeight', { value: 2000 });
  Object.defineProperty(el, 'clientHeight', { value: 500 });
  return el;
};

describe('dockedToolbarClassName', () => {
  it('builds the m3e-css modifiers (spread and standard have none)', () => {
    expect(dockedToolbarClassName({})).toBe('m3e-docked-toolbar');
    expect(dockedToolbarClassName({ arrangement: 'center', colorStyle: 'vibrant' }, 'x')).toBe(
      'm3e-docked-toolbar m3e-docked-toolbar--center m3e-docked-toolbar--vibrant x',
    );
    expect(dockedToolbarClassName({ arrangement: 'space-evenly' })).toBe(
      'm3e-docked-toolbar m3e-docked-toolbar--space-evenly',
    );
  });
});

describe('<DockedToolbar>', () => {
  it('renders role="toolbar" with a roving tab stop', async () => {
    const container = await renderReact(
      <DockedToolbar aria-label="Actions" arrangement="center">
        <Icon name="arrow_back" />
        <Icon name="add" />
        <Icon name="edit" />
      </DockedToolbar>,
    );
    const root = container.querySelector<HTMLElement>('.m3e-docked-toolbar')!;
    expect(root.getAttribute('role')).toBe('toolbar');
    expect(root.getAttribute('aria-label')).toBe('Actions');
    expect(root.classList.contains('m3e-docked-toolbar--center')).toBe(true);
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    buttons[0]!.focus();
    await key(buttons[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(buttons[1]);
    await key(buttons[1]!, 'End');
    expect(document.activeElement).toBe(buttons[2]);
    await key(buttons[2]!, 'Home');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('exit-always hides with the scroll (offset written on the root)', async () => {
    const target = scroller();
    const container = await renderReact(
      <DockedToolbar aria-label="t" scrollBehavior="exit-always" scrollTarget={{ current: target }}>
        <Icon name="add" />
      </DockedToolbar>,
    );
    const root = container.querySelector<HTMLElement>('.m3e-docked-toolbar')!;
    Object.defineProperty(root, 'offsetHeight', { value: 64 });
    expect(root.getAttribute('data-scroll-behavior')).toBe('exit-always');
    await act(async () => {
      target.scrollTop = 30;
      target.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
    });
    expect(root.style.getPropertyValue('--_m3e-docked-toolbar-offset')).toBe('-30px');
  });
});

describe('<BottomAppBar> (@deprecated, D4)', () => {
  it('renders the legacy contract (actions + FAB slot) and warns once in dev', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = await renderReact(
      <>
        <BottomAppBar
          aria-label="Actions"
          actions={<Icon name="check" />}
          floatingActionButton={
            <button type="button" className="m3e-fab" aria-label="Add">
              <span className="m3e-icon" aria-hidden="true">
                add
              </span>
            </button>
          }
        />
        <BottomAppBar aria-label="More" actions={<Icon name="edit" />} />
      </>,
    );
    const bars = container.querySelectorAll<HTMLElement>('.m3e-bottom-app-bar');
    expect(bars).toHaveLength(2);
    expect(bars[0]!.getAttribute('role')).toBe('toolbar');
    expect(bars[0]!.querySelector('.m3e-bottom-app-bar__actions .m3e-icon-button')).not.toBeNull();
    expect(bars[0]!.querySelector('.m3e-bottom-app-bar__fab > .m3e-fab')).not.toBeNull();
    expect(bars[1]!.querySelector('.m3e-bottom-app-bar__fab')).toBeNull();
    // One tab stop across the actions and the FAB.
    expect([...bars[0]!.querySelectorAll('button')].map((b) => b.getAttribute('tabindex'))).toEqual(
      ['0', '-1'],
    );
    const deprecations = warn.mock.calls.filter((c) => String(c[0]).includes('<BottomAppBar>'));
    expect(deprecations).toHaveLength(1);
    expect(String(deprecations[0]![0])).toContain('<DockedToolbar>');
  });

  it('exitAlways writes --_m3e-bottom-app-bar-offset', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const target = scroller();
    const container = await renderReact(
      <BottomAppBar
        aria-label="t"
        actions={<Icon name="check" />}
        scrollBehavior="exitAlways"
        scrollTarget={{ current: target }}
      />,
    );
    const root = container.querySelector<HTMLElement>('.m3e-bottom-app-bar')!;
    Object.defineProperty(root, 'offsetHeight', { value: 80 });
    await act(async () => {
      target.scrollTop = 100;
      target.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
    });
    expect(root.style.getPropertyValue('--_m3e-bottom-app-bar-offset')).toBe('-80px');
  });
});

describe('<DockedToolbar> ⇔ <m3e-docked-toolbar> DOM parity', () => {
  it.each([
    [
      'spread, standard',
      <DockedToolbar key="a" aria-label="Actions">
        <Icon name="arrow_back" />
        <Icon name="add" />
        <Icon name="edit" />
      </DockedToolbar>,
      `<m3e-docked-toolbar label="Actions">${iconHtml('arrow_back')}${iconHtml('add')}${iconHtml('edit')}</m3e-docked-toolbar>`,
    ],
    [
      'center, vibrant',
      <DockedToolbar key="b" aria-label="Edit" arrangement="center" colorStyle="vibrant">
        <Icon name="check" />
        <Icon name="edit" />
      </DockedToolbar>,
      `<m3e-docked-toolbar label="Edit" arrangement="center" color-style="vibrant">${iconHtml('check')}${iconHtml('edit')}</m3e-docked-toolbar>`,
    ],
    [
      'space-around',
      <DockedToolbar key="c" aria-label="Nav" arrangement="space-around">
        <Icon name="home" />
      </DockedToolbar>,
      `<m3e-docked-toolbar label="Nav" arrangement="space-around">${iconHtml('home')}</m3e-docked-toolbar>`,
    ],
  ])('%s', async (_, react, html) => {
    const fromReact = canonical((await renderReact(react)).querySelector('.m3e-docked-toolbar')!);
    const host = await renderElement(html);
    const fromElement = canonical(host.querySelector('.m3e-docked-toolbar')!);
    expect(fromElement).toBe(fromReact);
  });
});

describe('M11 API (D16 aliases)', () => {
  it("scrollBehavior='exitAlways' still works and warns once in development", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = await renderReact(
      <>
        <DockedToolbar aria-label="a" scrollBehavior="exitAlways">
          <Icon name="add" />
        </DockedToolbar>
        <DockedToolbar aria-label="b" scrollBehavior="exitAlways">
          <Icon name="add" />
        </DockedToolbar>
      </>,
    );
    for (const root of container.querySelectorAll('.m3e-docked-toolbar')) {
      expect(root.getAttribute('data-scroll-behavior')).toBe('exit-always');
    }
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages).toEqual([
      '[m3exp-web] <DockedToolbar scrollBehavior="exitAlways"> is deprecated since 1.8 and will be removed in 2.0. Use <DockedToolbar scrollBehavior="exit-always">.',
    ]);
  });

  it("the deprecated BottomAppBar accepts 'exit-always' too", async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = await renderReact(
      <BottomAppBar aria-label="t" actions={<Icon name="check" />} scrollBehavior="exit-always" />,
    );
    expect(
      container.querySelector('.m3e-bottom-app-bar')!.getAttribute('data-scroll-behavior'),
    ).toBe('exit-always');
  });
});
