import { springValue } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { M3eFabMenu } from './fab-menu.js';
import './index.js';

const flush = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

// The generated springs as the expressive scheme resolves them (fab-menu-defaults.css).
const SPRINGS = {
  'toggle-progress': ['350ms', '0.6', '800'],
  'item-width': ['350ms', '0.6', '800'],
  'item-opacity': ['150ms', '1', '3800'],
  stagger: ['300ms', '1', '800'],
} as const;
const FAST_SPATIAL = { dampingRatio: 0.6, stiffness: 800 };

/** happy-dom does not inherit custom properties: put the tokens on the rendered root. */
function setTokens(root: HTMLElement, reduced = false): void {
  for (const [name, [duration, dampingRatio, stiffness]] of Object.entries(SPRINGS)) {
    const prefix = `--m3e-comp-fab-menu-defaults-${name}`;
    const spatial = name === 'toggle-progress' || name === 'item-width';
    root.style.setProperty(`${prefix}-duration`, reduced && spatial ? '0ms' : duration);
    root.style.setProperty(`${prefix}-damping-ratio`, dampingRatio);
    root.style.setProperty(`${prefix}-stiffness`, stiffness);
  }
  root.style.setProperty('--m3e-comp-fab-menu-defaults-stagger-visibility-threshold', '1');
}

const MARKUP = `
  <m3e-fab-menu label="Share" icon="share">
    <m3e-fab-menu-item icon="mail" value="email">Email</m3e-fab-menu-item>
    <m3e-fab-menu-item icon="chat" value="message">Message</m3e-fab-menu-item>
    <m3e-fab-menu-item value="copy">Copy link</m3e-fab-menu-item>
  </m3e-fab-menu>`;

let frames: FrameRequestCallback[];
let now: number;

/** Runs `n` 16ms frames. */
const runFrames = (n: number) => {
  for (let i = 0; i < n; i++) {
    now += 16;
    const run = frames;
    frames = [];
    for (const cb of run) cb(now);
  }
};

async function mount(html = MARKUP, reduced = false) {
  document.body.innerHTML = html;
  await flush();
  const host = document.body.querySelector('m3e-fab-menu')!;
  setTokens(host.menuElement!, reduced);
  return {
    host,
    root: host.menuElement!,
    toggle: host.querySelector<HTMLButtonElement>('.m3e-fab-menu__toggle')!,
    menu: host.querySelector<HTMLElement>('.m3e-fab-menu__items')!,
    items: [...host.querySelectorAll<HTMLButtonElement>('.m3e-fab-menu__item')],
  };
}

const progress = (root: HTMLElement) =>
  Number.parseFloat(root.style.getPropertyValue('--_m3e-fab-menu-progress'));

beforeEach(() => {
  frames = [];
  now = 1000;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('<m3e-fab-menu>', () => {
  it('renders the m3e-css contract (toggle, menu, items; data children hidden)', async () => {
    const { host, root, toggle, menu, items } = await mount();
    expect(root.className).toBe('m3e-fab-menu');
    expect(root.hasAttribute('data-spring')).toBe(true);
    expect(toggle.className).toBe('m3e-fab m3e-fab-menu__toggle');
    expect(toggle.getAttribute('aria-label')).toBe('Share');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-haspopup')).toBe('menu');
    expect(toggle.getAttribute('aria-controls')).toBe(menu.id);
    expect([...toggle.children].map((c) => c.textContent)).toEqual(['share', 'close']);
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-labelledby')).toBe(toggle.id);
    expect(items.map((i) => i.getAttribute('role'))).toEqual(['menuitem', 'menuitem', 'menuitem']);
    expect(items.map((i) => i.textContent)).toEqual(['mailEmail', 'chatMessage', 'Copy link']);
    expect(items.every((i) => i.tabIndex === -1)).toBe(true);
    expect(
      [...host.querySelectorAll('m3e-fab-menu-item')].every((i) => (i as HTMLElement).hidden),
    ).toBe(true);
  });

  it('maps size, color and align to modifiers', async () => {
    const { root } = await mount(
      '<m3e-fab-menu open size="large" color="tertiary" align="start"></m3e-fab-menu>',
    );
    expect(root.className).toBe(
      'm3e-fab-menu m3e-fab-menu--open m3e-fab-menu--size-large m3e-fab-menu--tertiary m3e-fab-menu--align-start',
    );
  });

  it('the toggle opens it, fires open-change and keeps focus on the toggle (close button)', async () => {
    const { host, root, toggle, items } = await mount();
    const changes: boolean[] = [];
    host.addEventListener('open-change', (e) => {
      changes.push((e as CustomEvent<{ open: boolean }>).detail.open);
    });
    toggle.click();
    await flush();
    expect(host.open).toBe(true);
    expect(host.hasAttribute('open')).toBe(true);
    expect(root.classList.contains('m3e-fab-menu--open')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(changes).toEqual([true]);
    // m3.material.io › Initial focus / Compose: focus stays on the close button.
    expect(document.activeElement).toBe(toggle);
    expect(items).toHaveLength(3);
  });

  it('springs the progress and staggers the items in from the bottom, then clears the styles', async () => {
    const { host, root, items } = await mount();
    host.open = true;
    await flush();
    // Start: nothing visible yet, every item at zero width.
    expect(progress(root)).toBe(0);
    expect(items.map((i) => i.style.getPropertyValue('inline-size'))).toEqual([
      '0px',
      '0px',
      '0px',
    ]);
    runFrames(4);
    expect(progress(root)).toBeCloseTo(springValue(FAST_SPATIAL, 64, 0, 1), 5);
    // The bottom item appears first.
    const opacity = (i: number) => Number(items[i]!.style.getPropertyValue('opacity'));
    expect(opacity(2)).toBeGreaterThan(0);
    expect(opacity(0)).toBe(0);
    runFrames(60);
    expect(root.style.getPropertyValue('--_m3e-fab-menu-progress')).toBe('');
    expect(items.every((i) => i.getAttribute('style') === null)).toBe(true);
    expect(items.some((i) => i.hasAttribute('data-animating'))).toBe(false);
  });

  it('closing keeps the item column (data-closing) until every spring rests', async () => {
    const { host, root } = await mount(MARKUP.replace('<m3e-fab-menu ', '<m3e-fab-menu open '));
    host.open = false;
    await flush();
    expect(root.hasAttribute('data-closing')).toBe(true);
    expect(root.classList.contains('m3e-fab-menu--open')).toBe(false);
    runFrames(80);
    expect(root.hasAttribute('data-closing')).toBe(false);
  });

  it('reverses mid-flight from the current value and velocity (no jump)', async () => {
    const { host, root } = await mount();
    host.open = true;
    await flush();
    runFrames(4);
    const before = progress(root);
    host.open = false;
    await flush();
    expect(progress(root)).toBe(before);
    runFrames(1);
    // Still rising on its old velocity, then turning back down to 0.
    expect(progress(root)).toBeGreaterThan(before);
    let min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 60 && root.style.getPropertyValue('--_m3e-fab-menu-progress'); i++) {
      runFrames(1);
      const p = progress(root);
      if (Number.isFinite(p)) min = Math.min(min, p);
    }
    expect(min).toBeLessThan(before);
    expect(root.style.getPropertyValue('--_m3e-fab-menu-progress')).toBe('');
  });

  it('reduced motion: the spatial springs jump', async () => {
    const { host, root } = await mount(MARKUP, true);
    host.open = true;
    await flush();
    // Progress is at 1 immediately (the effects springs still run, so the var stays until rest).
    expect(progress(root)).toBe(1);
  });

  it('keys: arrows wrap, Home/End, Tab cycles to the toggle, Escape closes and refocuses', async () => {
    const { host, toggle, items } = await mount();
    toggle.click();
    await flush();
    const key = (target: Element, k: string, shiftKey = false) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true }));
    expect(document.activeElement).toBe(toggle);
    key(toggle, 'ArrowUp');
    expect(document.activeElement).toBe(items[2]);
    key(items[2]!, 'Tab');
    expect(document.activeElement).toBe(toggle);
    key(toggle, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    key(items[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    key(items[1]!, 'End');
    expect(document.activeElement).toBe(items[2]);
    key(items[2]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    key(items[0]!, 'ArrowUp');
    expect(document.activeElement).toBe(items[2]);
    key(items[2]!, 'Home');
    expect(document.activeElement).toBe(items[0]);
    key(items[0]!, 'Tab');
    expect(document.activeElement).toBe(toggle);
    key(toggle, 'Tab', true);
    expect(document.activeElement).toBe(items[2]);
    key(items[2]!, 'Tab', true);
    expect(document.activeElement).toBe(toggle);
    key(toggle, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    key(items[0]!, 'Escape');
    await flush();
    expect(host.open).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('activating an item fires action with its value, closes and refocuses the toggle', async () => {
    const { host, toggle, items } = await mount();
    toggle.click();
    await flush();
    const actions: unknown[] = [];
    host.addEventListener('action', (e) => {
      actions.push((e as CustomEvent<{ value: string }>).detail.value);
    });
    items[1]!.click();
    await flush();
    expect(actions).toEqual(['message']);
    expect(host.open).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('a press outside closes it', async () => {
    const outside = document.createElement('button');
    const { host, toggle } = await mount();
    document.body.append(outside);
    toggle.click();
    await flush();
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await flush();
    expect(host.open).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('re-renders when items change', async () => {
    const { host } = await mount();
    const item = document.createElement('m3e-fab-menu-item');
    item.textContent = 'Print';
    host.append(item);
    await flush();
    await flush();
    expect(host.querySelectorAll('.m3e-fab-menu__item')).toHaveLength(4);
    item.remove();
    await flush();
    await flush();
    expect(host.querySelectorAll('.m3e-fab-menu__item')).toHaveLength(3);
  });
});

describe('M3eFabMenu types', () => {
  it('is registered', () => {
    expect(customElements.get('m3e-fab-menu')).toBeDefined();
    const el: M3eFabMenu = document.createElement('m3e-fab-menu');
    expect(el.open).toBeUndefined();
  });
});

describe('<m3e-fab-menu>: M11 API', () => {
  it('action is typed and bubbles from the item (M1)', async () => {
    const { host, toggle, items } = await mount();
    toggle.click();
    await flush();
    const actions: unknown[] = [];
    host.addEventListener('action', (e) => actions.push(e.detail));
    items[0]!.click();
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveProperty('value');
  });
});
