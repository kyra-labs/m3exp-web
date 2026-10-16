import { springValue } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DockedToolbarLayout } from '../docked-toolbar-layout/docked-toolbar-layout.js';
import type { M3eDockedToolbar } from './docked-toolbar.js';
import './index.js';

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

// docked-toolbar-defaults.css as the expressive scheme resolves it (snap = fast spatial).
const FAST_SPATIAL = { dampingRatio: 0.6, stiffness: 800 };

/** happy-dom has no layout and does not inherit custom properties: fake both on the root. */
function setUp(root: HTMLElement, { reduced = false, height = 64 } = {}): void {
  root.style.setProperty(
    '--m3e-comp-docked-toolbar-defaults-snap-duration',
    reduced ? '0ms' : '350ms',
  );
  root.style.setProperty(
    '--m3e-comp-docked-toolbar-defaults-snap-damping-ratio',
    String(FAST_SPATIAL.dampingRatio),
  );
  root.style.setProperty(
    '--m3e-comp-docked-toolbar-defaults-snap-stiffness',
    String(FAST_SPATIAL.stiffness),
  );
  Object.defineProperty(root, 'offsetHeight', { value: height, configurable: true });
}

const icon = (name: string) =>
  `<button class="m3e-icon-button" aria-label="${name}"><span class="m3e-icon" aria-hidden="true">${name}</span></button>`;

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

const key = (el: Element, k: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

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

async function mountScrolling(attrs = '') {
  document.body.innerHTML = `<div id="scroller"></div><m3e-docked-toolbar label="Actions" scroll-behavior="exit-always" scroll-target="scroller" ${attrs}>${icon('arrow_back')}${icon('add')}${icon('edit')}</m3e-docked-toolbar>`;
  const scroller = document.getElementById('scroller')!;
  Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
  Object.defineProperty(scroller, 'clientHeight', { value: 500 });
  await flush();
  const host = document.querySelector<M3eDockedToolbar>('m3e-docked-toolbar')!;
  const root = host.toolbarElement!;
  const scrollTo = (top: number) => {
    scroller.scrollTop = top;
    scroller.dispatchEvent(new Event('scroll'));
  };
  const offset = () =>
    Number.parseFloat(root.style.getPropertyValue('--_m3e-docked-toolbar-offset') || '0');
  return { host, root, scroller, scrollTo, offset };
}

describe('<m3e-docked-toolbar>', () => {
  it('renders the m3e-css contract with role="toolbar" and moves its children into it', async () => {
    document.body.innerHTML = `<m3e-docked-toolbar label="Actions">${icon('a')}${icon('b')}</m3e-docked-toolbar>`;
    await flush();
    const host = document.querySelector<M3eDockedToolbar>('m3e-docked-toolbar')!;
    const root = host.toolbarElement!;
    expect(root.parentElement).toBe(host);
    expect(host.children).toHaveLength(1);
    expect(root.className).toBe('m3e-docked-toolbar');
    expect(root.getAttribute('role')).toBe('toolbar');
    expect(root.getAttribute('aria-label')).toBe('Actions');
    expect(root.querySelectorAll('.m3e-icon-button')).toHaveLength(2);
    // Children added later become items too.
    host.insertAdjacentHTML('beforeend', icon('c'));
    await flush();
    expect(root.querySelectorAll('.m3e-icon-button')).toHaveLength(3);
  });

  it('arrangement and color-style map to the m3e-css modifiers (spread has none)', async () => {
    document.body.innerHTML = `<m3e-docked-toolbar arrangement="center" color-style="vibrant">${icon('a')}</m3e-docked-toolbar>`;
    await flush();
    const host = document.querySelector<M3eDockedToolbar>('m3e-docked-toolbar')!;
    expect(host.toolbarElement!.className).toBe(
      'm3e-docked-toolbar m3e-docked-toolbar--center m3e-docked-toolbar--vibrant',
    );
    for (const [value, cls] of [
      ['space-around', 'm3e-docked-toolbar m3e-docked-toolbar--space-around'],
      ['space-evenly', 'm3e-docked-toolbar m3e-docked-toolbar--space-evenly'],
      ['spread', 'm3e-docked-toolbar'],
      ['bogus', 'm3e-docked-toolbar'],
    ]) {
      host.arrangement = value;
      host.colorStyle = null;
      await flush();
      expect(host.toolbarElement!.className).toBe(cls);
    }
  });

  it('roving focus: one tab stop, arrows without wrapping, Home / End', async () => {
    document.body.innerHTML = `<m3e-docked-toolbar label="t">${icon('a')}${icon('b')}${icon('c')}</m3e-docked-toolbar>`;
    await flush();
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    buttons[0]!.focus();
    key(buttons[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(buttons[1]);
    expect(buttons[1]!.getAttribute('tabindex')).toBe('0');
    key(buttons[1]!, 'End');
    expect(document.activeElement).toBe(buttons[2]);
    key(buttons[2]!, 'ArrowRight');
    expect(document.activeElement).toBe(buttons[2]);
    key(buttons[2]!, 'Home');
    expect(document.activeElement).toBe(buttons[0]);
  });
});

describe('exit-always (BottomAppBarDefaults.exitAlwaysScrollBehavior)', () => {
  it('follows every scroll delta between 0 and minus the bar height', async () => {
    const { root, scrollTo, offset } = await mountScrolling();
    setUp(root);
    expect(root.getAttribute('data-scroll-behavior')).toBe('exit-always');
    scrollTo(20);
    expect(offset()).toBe(-20);
    scrollTo(200);
    expect(offset()).toBe(-64);
    scrollTo(190);
    expect(offset()).toBe(-54);
    scrollTo(500);
    expect(offset()).toBe(-64);
    scrollTo(0);
    expect(offset()).toBe(0);
    expect(root.style.getPropertyValue('--_m3e-docked-toolbar-offset')).toBe('');
    // The bar stays in the tab order (Compose has no focus rule for it).
    scrollTo(100);
    expect(root.querySelector('button')!.getAttribute('tabindex')).toBe('0');
  });

  it('snaps a partly hidden bar on the fast spatial spring when scrolling ends', async () => {
    const { root, scroller, scrollTo, offset } = await mountScrolling();
    setUp(root);
    // Below half: back to shown.
    scrollTo(20);
    scroller.dispatchEvent(new Event('scrollend'));
    runFrames(1);
    expect(offset()).toBeCloseTo(springValue(FAST_SPATIAL, 16, -20, 0), 5);
    // The fast spatial spring (ζ 0.6) overshoots 0, but the offset is coerced like Compose's
    // BottomAppBarState.heightOffset setter: the bar never moves above its place.
    expect(
      Math.max(
        ...Array.from({ length: 30 }, (_, i) => springValue(FAST_SPATIAL, 16 * (i + 2), -20, 0)),
      ),
    ).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) {
      runFrames(1);
      expect(offset()).toBeLessThanOrEqual(0);
    }
    expect(offset()).toBe(0);
    // From half: hidden.
    scrollTo(60);
    expect(offset()).toBe(-40);
    scroller.dispatchEvent(new Event('scrollend'));
    runFrames(60);
    expect(offset()).toBe(-64);
    // Fully hidden: no snap.
    scroller.dispatchEvent(new Event('scrollend'));
    expect(frames).toHaveLength(0);
  });

  it('a scroll takes over from a running snap', async () => {
    const { root, scroller, scrollTo, offset } = await mountScrolling();
    setUp(root);
    scrollTo(20);
    scroller.dispatchEvent(new Event('scrollend'));
    runFrames(2);
    const mid = offset();
    expect(mid).toBeGreaterThan(-20);
    expect(mid).toBeLessThan(0);
    scrollTo(30);
    expect(offset()).toBeCloseTo(mid - 10, 5);
    runFrames(5);
    expect(offset()).toBeCloseTo(mid - 10, 5);
  });

  it('reduced motion (snap duration 0ms): the snap jumps', async () => {
    const { root, scroller, scrollTo, offset } = await mountScrolling();
    setUp(root, { reduced: true });
    scrollTo(40);
    scroller.dispatchEvent(new Event('scrollend'));
    expect(offset()).toBe(-64);
    expect(frames).toHaveLength(0);
  });

  it('does not hide while it holds focus, and focus brings a hidden bar back', async () => {
    const { root, scrollTo, offset } = await mountScrolling();
    setUp(root);
    const button = root.querySelector('button')!;
    button.focus();
    scrollTo(50);
    expect(offset()).toBe(0);
    button.blur();
    scrollTo(120);
    expect(offset()).toBe(-64);
    button.focus();
    runFrames(60);
    expect(offset()).toBe(0);
  });

  it('removing scroll-behavior detaches and puts the bar back', async () => {
    const { host, root, scrollTo, offset } = await mountScrolling();
    setUp(root);
    scrollTo(30);
    expect(offset()).toBe(-30);
    host.scrollBehavior = null;
    await flush();
    expect(offset()).toBe(0);
    expect(root.hasAttribute('data-scroll-behavior')).toBe(false);
    scrollTo(100);
    expect(offset()).toBe(0);
  });
});

describe('DockedToolbarLayout on a legacy .m3e-bottom-app-bar', () => {
  it('writes --_m3e-bottom-app-bar-offset', () => {
    const scroller = document.createElement('div');
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 500 });
    const root = document.createElement('div');
    root.className = 'm3e-bottom-app-bar';
    document.body.append(scroller, root);
    setUp(root, { height: 80 });
    const layout = new DockedToolbarLayout(root);
    layout.setScroll({ behavior: 'exit-always', target: scroller });
    scroller.scrollTop = 100;
    scroller.dispatchEvent(new Event('scroll'));
    expect(root.style.getPropertyValue('--_m3e-bottom-app-bar-offset')).toBe('-80px');
    layout.destroy();
    expect(root.style.getPropertyValue('--_m3e-bottom-app-bar-offset')).toBe('');
  });
});
