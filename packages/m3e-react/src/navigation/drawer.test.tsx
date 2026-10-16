import '@kyralabs/m3e-elements/navigation-drawer.js';
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { NavigationDrawer, type NavigationDrawerEntry } from './index.js';

let frames: FrameRequestCallback[];
let now: number;
const runFrames = async (n: number) => {
  await act(async () => {
    for (let i = 0; i < n; i++) {
      now += 16;
      const run = frames;
      frames = [];
      for (const cb of run) cb(now);
    }
    await Promise.resolve();
  });
};

/** happy-dom lays nothing out: the sheet reports Compose's 360dp width. */
class FakeResizeObserver {
  constructor(private readonly cb: ResizeObserverCallback) {}
  observe(target: Element): void {
    this.cb(
      [
        {
          target,
          borderBoxSize: [{ inlineSize: 360, blockSize: 800 }],
          contentRect: { width: 360, height: 800 },
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
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ITEMS: NavigationDrawerEntry[] = [
  { key: 'mail', type: 'headline', label: 'Mail' },
  { key: 'inbox', icon: 'inbox', label: 'Inbox', href: '/inbox', badge: '24' },
  { key: 'sent', icon: 'send', label: 'Sent' },
  { key: 'd1', type: 'divider' },
  { key: 'trash', label: 'Trash' },
];
const ELEMENT_ITEMS = [
  '<h2 class="m3e-navigation-drawer__headline">Mail</h2>',
  '<m3e-navigation-item value="inbox" icon="inbox" href="/inbox" badge="24">Inbox</m3e-navigation-item>',
  '<m3e-navigation-item value="sent" icon="send">Sent</m3e-navigation-item>',
  '<hr class="m3e-navigation-drawer__divider">',
  '<m3e-navigation-item value="trash">Trash</m3e-navigation-item>',
].join('');

/** The contract both layers render; React Aria's press marker is a runtime detail. */
const contract = (el: Element) => {
  const clone = el.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    node.removeAttribute('data-react-aria-pressable');
  }
  return canonical(clone);
};

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  for (const variant of ['permanent', 'dismissible', 'modal'] as const) {
    it(`NavigationDrawer (${variant}, closed; header, headline, badge, divider)`, async () => {
      const react = await renderReact(
        <NavigationDrawer
          variant={variant}
          aria-label="Main"
          items={ITEMS}
          selectedKey="inbox"
          header={<button type="button" aria-label="Menu" />}
        />,
      );
      const host = await renderElement(
        `<m3e-navigation-drawer variant="${variant}" label="Main" selected="inbox"><button type="button" aria-label="Menu"></button>${ELEMENT_ITEMS}</m3e-navigation-drawer>`,
      );
      expect(contract(host.querySelector('.m3e-navigation-drawer')!)).toBe(
        contract(react.firstElementChild!),
      );
    });
  }

  it('NavigationDrawer (modal, open: the dialog window)', async () => {
    const react = await renderReact(
      <NavigationDrawer
        variant="modal"
        aria-label="Main"
        items={ITEMS}
        selectedKey="sent"
        isOpen
      />,
    );
    const host = await renderElement(
      `<m3e-navigation-drawer variant="modal" label="Main" selected="sent" open>${ELEMENT_ITEMS}</m3e-navigation-drawer>`,
    );
    const root = react.firstElementChild!;
    expect(root.getAttribute('role')).toBe('dialog');
    expect(contract(host.querySelector('.m3e-navigation-drawer')!)).toBe(contract(root));
  });
});

describe('NavigationDrawer behavior', () => {
  it('opens with the shared layout, rests on the class; Escape asks to close', async () => {
    const changes: boolean[] = [];
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            id="opener"
            onClick={() => {
              setOpen(true);
            }}
          >
            Menu
          </button>
          <NavigationDrawer
            variant="modal"
            aria-label="Main"
            items={ITEMS}
            isOpen={open}
            onOpenChange={(next) => {
              changes.push(next);
              setOpen(next);
            }}
          />
        </>
      );
    }
    const container = await renderReact(<Demo />);
    const opener = container.querySelector<HTMLButtonElement>('#opener')!;
    const root = container.querySelector<HTMLElement>('.m3e-navigation-drawer')!;
    root.style.setProperty('--m3e-comp-navigation-drawer-open-duration', '500ms');
    root.style.setProperty('--m3e-comp-navigation-drawer-open-damping-ratio', '0.8');
    root.style.setProperty('--m3e-comp-navigation-drawer-open-stiffness', '380');
    opener.focus();
    await act(async () => {
      opener.click();
      await Promise.resolve();
    });
    expect(root.classList.contains('m3e-navigation-drawer--open')).toBe(true);
    expect(root.getAttribute('aria-modal')).toBe('true');
    expect(root.hasAttribute('data-animating')).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.m3e-navigation-drawer-item'));
    await runFrames(200);
    expect(root.hasAttribute('data-animating')).toBe(false);
    await act(async () => {
      root
        .querySelector('nav')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        );
      await Promise.resolve();
    });
    expect(changes).toEqual([false]);
    expect(root.classList.contains('m3e-navigation-drawer--open')).toBe(false);
    expect(document.activeElement).toBe(opener);
    await runFrames(200);
    expect(root.hasAttribute('role')).toBe(false);
    expect(root.hasAttribute('data-open')).toBe(false);
  });

  it('presses select (uncontrolled) and move aria-current', async () => {
    const onSelectionChange = vi.fn();
    const container = await renderReact(
      <NavigationDrawer
        aria-label="Main"
        items={ITEMS}
        defaultSelectedKey="inbox"
        onSelectionChange={onSelectionChange}
      />,
    );
    const sent = container.querySelectorAll<HTMLElement>('.m3e-navigation-drawer-item')[1]!;
    await act(async () => {
      sent.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
        }),
      );
      sent.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
        }),
      );
      sent.click();
      await Promise.resolve();
    });
    expect(onSelectionChange).toHaveBeenCalledWith('sent');
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(1);
    expect(sent.getAttribute('aria-current')).toBe('page');
  });
});
