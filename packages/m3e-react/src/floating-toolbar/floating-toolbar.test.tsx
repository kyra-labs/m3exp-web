import '@kyralabs/m3e-elements/floating-toolbar.js';
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { FloatingToolbar, floatingToolbarClassName } from './FloatingToolbar.js';

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
const Icon = ({ name, slot }: { name: string; slot?: string }) => (
  <button type="button" className="m3e-icon-button" aria-label={name} slot={slot}>
    <span className="m3e-icon" aria-hidden="true">
      {name}
    </span>
  </button>
);
const iconHtml = (name: string, slot?: string) =>
  `<button type="button" class="m3e-icon-button" aria-label="${name}"${slot ? ` slot="${slot}"` : ''}><span class="m3e-icon" aria-hidden="true">${name}</span></button>`;

describe('floatingToolbarClassName', () => {
  it('builds the m3e-css modifiers', () => {
    expect(floatingToolbarClassName({})).toBe('m3e-floating-toolbar');
    expect(
      floatingToolbarClassName(
        {
          orientation: 'vertical',
          colorStyle: 'vibrant',
          expanded: false,
          withFab: true,
          fabPosition: 'start',
        },
        'x',
      ),
    ).toBe(
      'm3e-floating-toolbar m3e-floating-toolbar--vertical m3e-floating-toolbar--vibrant m3e-floating-toolbar--collapsed m3e-floating-toolbar--with-fab m3e-floating-toolbar--fab-start x',
    );
  });
});

describe('<FloatingToolbar>', () => {
  it('renders role="toolbar" with aria-orientation, its parts and a roving tab stop', async () => {
    const container = await renderReact(
      <FloatingToolbar
        aria-label="Formatting"
        leading={<Icon name="check" />}
        trailing={<Icon name="favorite" />}
      >
        <Icon name="format_bold" />
        <Icon name="format_italic" />
      </FloatingToolbar>,
    );
    const root = container.querySelector<HTMLElement>('.m3e-floating-toolbar')!;
    expect(root.getAttribute('role')).toBe('toolbar');
    expect(root.getAttribute('aria-orientation')).toBe('horizontal');
    expect(root.getAttribute('aria-label')).toBe('Formatting');
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    buttons[0]!.focus();
    await key(buttons[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(buttons[1]);
    await key(buttons[1]!, 'End');
    expect(document.activeElement).toBe(buttons[3]);
    await key(buttons[3]!, 'Home');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('collapsing (controlled) makes the leading / trailing parts inert', async () => {
    let set: (v: boolean) => void = () => undefined;
    function Demo() {
      const [expanded, setExpanded] = useState(true);
      set = setExpanded;
      return (
        <FloatingToolbar aria-label="t" isExpanded={expanded} leading={<Icon name="check" />}>
          <Icon name="format_bold" />
        </FloatingToolbar>
      );
    }
    const container = await renderReact(<Demo />);
    const root = container.querySelector<HTMLElement>('.m3e-floating-toolbar')!;
    const leading = root.querySelector<HTMLElement>('.m3e-floating-toolbar__leading')!;
    expect(leading.inert).toBe(false);
    await act(async () => {
      set(false);
      await Promise.resolve();
    });
    expect(root.classList.contains('m3e-floating-toolbar--collapsed')).toBe(true);
    expect(leading.inert).toBe(true);
  });

  it('the collapse scroll behavior reports through onExpandedChange (uncontrolled follows)', async () => {
    const scroller = document.createElement('div');
    document.body.append(scroller);
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 500 });
    const changes: boolean[] = [];
    const container = await renderReact(
      <FloatingToolbar
        aria-label="t"
        scrollBehavior="collapse"
        scrollTarget={{ current: scroller }}
        onExpandedChange={(e) => changes.push(e)}
        style={{
          ['--m3e-comp-floating-toolbar-defaults-scroll-distance-threshold' as string]: '40px',
        }}
        fab={<button type="button" className="m3e-fab" aria-label="Add" />}
      >
        <Icon name="person" />
      </FloatingToolbar>,
    );
    const root = container.querySelector<HTMLElement>('.m3e-floating-toolbar')!;
    await act(async () => {
      scroller.scrollTop = 50;
      scroller.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
    });
    expect(changes).toEqual([false]);
    expect(root.classList.contains('m3e-floating-toolbar--collapsed')).toBe(true);
  });
});

describe('<FloatingToolbar> ⇔ <m3e-floating-toolbar> DOM parity', () => {
  it.each([
    [
      'horizontal, standard, leading/trailing',
      <FloatingToolbar
        key="a"
        aria-label="Formatting"
        leading={<Icon name="check" slot="leading" />}
        trailing={<Icon name="favorite" slot="trailing" />}
      >
        <Icon name="format_bold" />
        <Icon name="format_italic" />
      </FloatingToolbar>,
      `<m3e-floating-toolbar expanded label="Formatting">
        ${iconHtml('check', 'leading')}${iconHtml('format_bold')}${iconHtml('format_italic')}${iconHtml('favorite', 'trailing')}
      </m3e-floating-toolbar>`,
    ],
    [
      'vertical, vibrant, collapsed, FAB at the start',
      <FloatingToolbar
        key="b"
        aria-label="Actions"
        orientation="vertical"
        colorStyle="vibrant"
        defaultExpanded={false}
        fabPosition="start"
        fab={
          <button type="button" className="m3e-fab" aria-label="Add" slot="fab">
            <span className="m3e-icon" aria-hidden="true">
              add
            </span>
          </button>
        }
      >
        <Icon name="person" />
        <Icon name="edit" />
      </FloatingToolbar>,
      `<m3e-floating-toolbar label="Actions" orientation="vertical" color-style="vibrant" fab-position="start">
        ${iconHtml('person')}${iconHtml('edit')}<button type="button" class="m3e-fab" aria-label="Add" slot="fab"><span class="m3e-icon" aria-hidden="true">add</span></button>
      </m3e-floating-toolbar>`,
    ],
  ])('%s', async (_, react, html) => {
    const fromReact = canonical((await renderReact(react)).querySelector('.m3e-floating-toolbar')!);
    const host = await renderElement(html);
    const fromElement = canonical(host.querySelector('.m3e-floating-toolbar')!);
    expect(fromElement).toBe(fromReact);
  });
});

describe('M11 API (D16 aliases)', () => {
  it('<FloatingToolbar expanded> still works, warns once in development; isExpanded wins', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = await renderReact(
      <>
        {/* eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias */}
        <FloatingToolbar aria-label="a" expanded={false} leading={<Icon name="check" />}>
          <Icon name="format_bold" />
        </FloatingToolbar>
        {/* eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias */}
        <FloatingToolbar aria-label="b" expanded={false} isExpanded leading={<Icon name="check" />}>
          <Icon name="format_bold" />
        </FloatingToolbar>
      </>,
    );
    const [a, b] = container.querySelectorAll('.m3e-floating-toolbar');
    expect(a!.classList.contains('m3e-floating-toolbar--collapsed')).toBe(true);
    expect(b!.classList.contains('m3e-floating-toolbar--collapsed')).toBe(false);
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages).toEqual([
      '[m3exp-web] <FloatingToolbar expanded> is deprecated since 1.8 and will be removed in 2.0. Use <FloatingToolbar isExpanded>.',
    ]);
  });

  it("scrollBehavior: 'exit-always'; the deprecated 'exitAlways' still works and warns once", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = await renderReact(
      <>
        <FloatingToolbar aria-label="a" scrollBehavior="exit-always">
          <Icon name="format_bold" />
        </FloatingToolbar>
        <FloatingToolbar aria-label="b" scrollBehavior="exitAlways">
          <Icon name="format_bold" />
        </FloatingToolbar>
      </>,
    );
    for (const root of container.querySelectorAll('.m3e-floating-toolbar')) {
      expect(root.getAttribute('data-scroll-behavior')).toBe('exit-always');
    }
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages).toEqual([
      '[m3exp-web] <FloatingToolbar scrollBehavior="exitAlways"> is deprecated since 1.8 and will be removed in 2.0. Use <FloatingToolbar scrollBehavior="exit-always">.',
    ]);
  });
});
