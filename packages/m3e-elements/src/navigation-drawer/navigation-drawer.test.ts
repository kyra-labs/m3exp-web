import { springValue } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { releaseVelocity } from '../navigation-drawer-layout/navigation-drawer-layout.js';
import type { M3eNavigationDrawer } from './navigation-drawer.js';
import './index.js';

describe('releaseVelocity (VelocityTracker approximation)', () => {
  it('averages the trailing samples within 100ms', () => {
    expect(releaseVelocity([])).toBe(0);
    expect(
      releaseVelocity([
        { t: 0, x: 0 },
        { t: 16, x: 10 },
        { t: 32, x: 20 },
      ]),
    ).toBeCloseTo(625, 6);
    expect(
      releaseVelocity(Array.from({ length: 20 }, (_, i) => ({ t: i * 10, x: i * 5 }))),
    ).toBeCloseTo(500, 6);
  });

  it('a 40ms pause before the release drops the movement (velocity 0)', () => {
    expect(
      releaseVelocity([
        { t: 0, x: 0 },
        { t: 16, x: 50 },
        { t: 200, x: 50 },
      ]),
    ).toBe(0);
  });
});

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

const W = 360;
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };
const FAST_EFFECTS = { dampingRatio: 1, stiffness: 3800 };

/** happy-dom lays nothing out: the sheet reports Compose's 360dp width. */
class FakeResizeObserver {
  constructor(private readonly cb: ResizeObserverCallback) {}
  observe(target: Element): void {
    this.cb(
      [
        {
          target,
          borderBoxSize: [{ inlineSize: W, blockSize: 800 }],
          contentRect: { width: W, height: 800 },
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

const CONTENT = [
  '<h2 class="m3e-navigation-drawer__headline">Mail</h2>',
  '<m3e-navigation-item value="inbox" icon="inbox" href="/inbox" badge="24">Inbox</m3e-navigation-item>',
  '<m3e-navigation-item value="sent" icon="send">Sent</m3e-navigation-item>',
  '<hr class="m3e-navigation-drawer__divider" />',
  '<m3e-navigation-item value="trash">Trash</m3e-navigation-item>',
].join('');

/** Mounts `html`; happy-dom does not inherit custom properties, so the root gets the tokens. */
async function mount(html: string): Promise<M3eNavigationDrawer> {
  document.body.innerHTML = html;
  const host = document.querySelector<M3eNavigationDrawer>('m3e-navigation-drawer')!;
  await flush();
  const style = host.drawerElement!.style;
  for (const [name, [damping, stiffness]] of Object.entries({
    open: [0.8, 380],
    close: [1, 3800],
  })) {
    style.setProperty(`--m3e-comp-navigation-drawer-${name}-duration`, '500ms');
    style.setProperty(`--m3e-comp-navigation-drawer-${name}-damping-ratio`, String(damping));
    style.setProperty(`--m3e-comp-navigation-drawer-${name}-stiffness`, String(stiffness));
  }
  style.setProperty('--m3e-comp-navigation-drawer-settle-duration', '256ms');
  style.setProperty('--m3e-comp-navigation-drawer-settle-easing', 'cubic-bezier(0.4, 0, 0.2, 1)');
  return host;
}

describe('<m3e-navigation-drawer>', () => {
  it('renders the permanent contract: items, headline and divider in order', async () => {
    const host = await mount(
      `<m3e-navigation-drawer label="Main" selected="inbox">${CONTENT}</m3e-navigation-drawer>`,
    );
    const root = host.drawerElement!;
    expect(root.className).toBe('m3e-navigation-drawer');
    const nav = root.querySelector('nav')!;
    expect(nav.className).toBe('m3e-navigation-drawer__sheet');
    expect(nav.getAttribute('aria-label')).toBe('Main');
    expect([...nav.children].map((c) => c.className)).toEqual([
      'm3e-navigation-drawer__headline',
      'm3e-navigation-drawer-item',
      'm3e-navigation-drawer-item',
      'm3e-navigation-drawer__divider',
      'm3e-navigation-drawer-item',
    ]);
    const [inbox, sent, trash] = [...nav.querySelectorAll('.m3e-navigation-drawer-item')];
    expect(inbox!.localName).toBe('a');
    expect(inbox!.getAttribute('aria-current')).toBe('page');
    expect(inbox!.getAttribute('href')).toBe('/inbox');
    expect([...inbox!.children].map((c) => c.className)).toEqual([
      'm3e-icon m3e-navigation-drawer-item__icon',
      'm3e-navigation-drawer-item__label',
      'm3e-navigation-drawer-item__badge',
    ]);
    expect(inbox!.querySelector('.m3e-navigation-drawer-item__badge')!.textContent).toBe('24');
    expect(sent!.localName).toBe('button');
    expect(sent!.getAttribute('aria-current')).toBeNull();
    // The icon is optional (NavigationDrawerItem icon = null).
    expect([...trash!.children].map((c) => c.className)).toEqual([
      'm3e-navigation-drawer-item__label',
    ]);
    expect(nav.querySelectorAll('[aria-current]')).toHaveLength(1);
  });

  it('presses select (cancelable selection-change) and new children keep their place', async () => {
    const host = await mount(
      `<m3e-navigation-drawer selected="inbox">${CONTENT}</m3e-navigation-drawer>`,
    );
    const events: unknown[] = [];
    host.addEventListener('selection-change', (e) => events.push((e as CustomEvent).detail));
    host.drawerElement!.querySelectorAll<HTMLElement>('.m3e-navigation-drawer-item')[1]!.click();
    await flush();
    expect(events).toEqual([{ value: 'sent' }]);
    expect(host.selected).toBe('sent');
    const extra = document.createElement('m3e-navigation-item');
    extra.setAttribute('value', 'spam');
    extra.textContent = 'Spam';
    host.append(extra);
    await flush();
    const texts = [...host.drawerElement!.querySelectorAll('nav > *')].map((c) =>
      c.textContent.replace(/\s/g, ''),
    );
    expect(texts).toEqual(['Mail', 'inboxInbox24', 'sendSent', '', 'Trash', 'Spam']);
  });

  it('modal: opens on the default spatial spring as a dialog over the scrim', async () => {
    const host = await mount(
      `<button id="opener">Menu</button><m3e-navigation-drawer variant="modal" label="Main">${CONTENT}</m3e-navigation-drawer>`,
    );
    const root = host.drawerElement!;
    expect(root.className).toBe('m3e-navigation-drawer m3e-navigation-drawer--modal');
    expect([...root.children].map((c) => c.className)).toEqual([
      'm3e-navigation-drawer__scrim',
      'm3e-navigation-drawer__sheet',
    ]);
    expect(root.hasAttribute('role')).toBe(false);
    const opener = document.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
    const events: unknown[] = [];
    host.addEventListener('open-change', (e) => events.push((e as CustomEvent).detail));
    host.show();
    await flush();
    expect(events).toEqual([{ open: true }]);
    expect(root.classList.contains('m3e-navigation-drawer--open')).toBe(true);
    expect(root.getAttribute('role')).toBe('dialog');
    expect(root.getAttribute('aria-modal')).toBe('true');
    expect(root.getAttribute('aria-label')).toBe('Navigation menu');
    expect(root.hasAttribute('data-open')).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.m3e-navigation-drawer-item'));
    for (let i = 1; i <= 4; i++) {
      runFrames(1);
      expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-nd-offset'))).toBeCloseTo(
        springValue(DEFAULT_SPATIAL, 16 * i, -W, 0),
        1,
      );
    }
    runFrames(200);
    expect(root.hasAttribute('data-animating')).toBe(false);
    expect(root.style.getPropertyValue('--_m3e-nd-offset')).toBe('');

    // Escape asks to close (cancelable), then the fast effects spring runs; focus returns.
    root
      .querySelector<HTMLElement>('.m3e-navigation-drawer-item')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    await flush();
    expect(events.at(-1)).toEqual({ open: false });
    expect(host.open).toBe(false);
    expect(document.activeElement).toBe(opener);
    runFrames(1);
    expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-nd-offset'))).toBeCloseTo(
      springValue(FAST_EFFECTS, 16, 0, -W),
      1,
    );
    runFrames(100);
    expect(root.hasAttribute('data-open')).toBe(false);
    expect(root.hasAttribute('role')).toBe(false);
  });

  it('a vetoed Escape keeps the drawer open', async () => {
    const host = await mount(
      `<m3e-navigation-drawer variant="dismissible" open>${CONTENT}</m3e-navigation-drawer>`,
    );
    host.addEventListener('open-change', (e) => {
      e.preventDefault();
    });
    const root = host.drawerElement!;
    root
      .querySelector('nav')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    await flush();
    expect(host.open).toBe(true);
    expect(root.hasAttribute('role')).toBe(false);
  });

  it('ArrowDown / ArrowUp move between items', async () => {
    const host = await mount(`<m3e-navigation-drawer>${CONTENT}</m3e-navigation-drawer>`);
    const items = [
      ...host.drawerElement!.querySelectorAll<HTMLElement>('.m3e-navigation-drawer-item'),
    ];
    items[0]!.focus();
    items[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    items[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
    items[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
    items[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
  });

  it('dismissible: animates the space it takes (width + offset)', async () => {
    const host = await mount(
      `<m3e-navigation-drawer variant="dismissible">${CONTENT}</m3e-navigation-drawer>`,
    );
    const root = host.drawerElement!;
    host.show();
    await flush();
    runFrames(1);
    const offset = springValue(DEFAULT_SPATIAL, 16, -W, 0);
    expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-nd-inline-size'))).toBeCloseTo(
      W + offset,
      1,
    );
    expect(root.hasAttribute('role')).toBe(false);
  });

  it('switching the variant starts over', async () => {
    const host = await mount(`<m3e-navigation-drawer open>${CONTENT}</m3e-navigation-drawer>`);
    expect(host.drawerElement!.className).toBe('m3e-navigation-drawer');
    host.variant = 'modal';
    await flush();
    expect(host.drawerElement!.className).toBe(
      'm3e-navigation-drawer m3e-navigation-drawer--modal m3e-navigation-drawer--open',
    );
    expect(host.drawerElement!.getAttribute('role')).toBe('dialog');
  });
});
