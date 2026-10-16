import { springValue, springVelocity } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { M3eFloatingToolbar } from './floating-toolbar.js';
import './index.js';

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

// floating-toolbar-defaults.css as the expressive scheme resolves it.
const FAST_SPATIAL = { dampingRatio: 0.6, stiffness: 800 };
const DEFAULT_EFFECTS = { dampingRatio: 1, stiffness: 1600 };

/** happy-dom does not inherit custom properties: put the tokens on the rendered root. */
function setTokens(root: HTMLElement, reduced = false): void {
  const set = (name: string, value: string) => {
    root.style.setProperty(`--m3e-comp-floating-toolbar-defaults-${name}`, value);
  };
  set('animation-duration', reduced ? '0ms' : '350ms');
  set('animation-damping-ratio', String(FAST_SPATIAL.dampingRatio));
  set('animation-stiffness', String(FAST_SPATIAL.stiffness));
  set('snap-duration', reduced ? '0ms' : '200ms');
  set('snap-damping-ratio', String(DEFAULT_EFFECTS.dampingRatio));
  set('snap-stiffness', String(DEFAULT_EFFECTS.stiffness));
  set('scroll-distance-threshold', '40px');
}

const icon = (name: string, slot?: string) =>
  `<button class="m3e-icon-button" aria-label="${name}"${slot ? ` slot="${slot}"` : ''}><span class="m3e-icon" aria-hidden="true">${name}</span></button>`;

const MARKUP = `
  <m3e-floating-toolbar expanded label="Formatting">
    ${icon('check', 'leading')}
    ${icon('format_bold')}
    ${icon('format_italic')}
    ${icon('favorite', 'trailing')}
  </m3e-floating-toolbar>`;

const WITH_FAB = `
  <m3e-floating-toolbar expanded color-style="vibrant" label="Actions">
    ${icon('person')}
    ${icon('edit')}
    <button class="m3e-fab" slot="fab" aria-label="Add"><span class="m3e-icon" aria-hidden="true">add</span></button>
  </m3e-floating-toolbar>`;

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

async function mount(html = MARKUP, reduced = false) {
  document.body.innerHTML = html;
  await flush();
  const host = document.body.querySelector<M3eFloatingToolbar>('m3e-floating-toolbar')!;
  const root = host.toolbarElement!;
  setTokens(root, reduced);
  return { host, root, buttons: [...root.querySelectorAll<HTMLButtonElement>('button')] };
}

const progress = (root: HTMLElement) =>
  Number.parseFloat(root.style.getPropertyValue('--_m3e-floating-toolbar-progress'));

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

describe('<m3e-floating-toolbar>', () => {
  it('renders the m3e-css contract and moves its children into their parts', async () => {
    const { host, root } = await mount();
    expect(root.parentElement).toBe(host);
    expect(root.className).toBe('m3e-floating-toolbar');
    expect(root.getAttribute('role')).toBe('toolbar');
    expect(root.getAttribute('aria-orientation')).toBe('horizontal');
    expect(root.getAttribute('aria-label')).toBe('Formatting');
    expect(root.hasAttribute('data-spring')).toBe(true);
    const bar = root.querySelector(':scope > .m3e-floating-toolbar__bar')!;
    expect([...bar.children].map((el) => el.className)).toEqual([
      'm3e-floating-toolbar__leading',
      'm3e-icon-button',
      'm3e-icon-button',
      'm3e-floating-toolbar__trailing',
    ]);
    expect(bar.querySelector('.m3e-floating-toolbar__leading')!.textContent).toBe('check');
    expect(bar.querySelector('.m3e-floating-toolbar__trailing')!.textContent).toBe('favorite');
    expect(host.children).toHaveLength(1);
  });

  it('maps orientation, color style, collapsed, FAB and FAB position to modifiers', async () => {
    const { root, host } = await mount(WITH_FAB);
    expect(root.className).toBe(
      'm3e-floating-toolbar m3e-floating-toolbar--vibrant m3e-floating-toolbar--with-fab',
    );
    expect([...root.children].map((el) => el.className)).toEqual([
      'm3e-floating-toolbar__bar',
      'm3e-floating-toolbar__fab',
    ]);
    host.setAttribute('orientation', 'vertical');
    host.setAttribute('fab-position', 'start');
    host.removeAttribute('expanded');
    await flush();
    expect(root.className).toBe(
      'm3e-floating-toolbar m3e-floating-toolbar--vertical m3e-floating-toolbar--vibrant m3e-floating-toolbar--collapsed m3e-floating-toolbar--with-fab m3e-floating-toolbar--fab-start',
    );
    expect(root.getAttribute('aria-orientation')).toBe('vertical');
    expect([...root.children].map((el) => el.className)).toEqual([
      'm3e-floating-toolbar__fab',
      'm3e-floating-toolbar__bar',
    ]);
  });

  it('roving tabindex: one tab stop, arrows (no wrapping), Home/End', async () => {
    const { buttons } = await mount();
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    buttons[0]!.focus();
    key(buttons[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(buttons[1]);
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);
    key(buttons[1]!, 'End');
    expect(document.activeElement).toBe(buttons[3]);
    key(buttons[3]!, 'ArrowRight');
    expect(document.activeElement).toBe(buttons[3]);
    key(buttons[3]!, 'Home');
    expect(document.activeElement).toBe(buttons[0]);
    key(buttons[0]!, 'ArrowLeft');
    expect(document.activeElement).toBe(buttons[0]);
    // ArrowDown belongs to vertical toolbars.
    expect(key(buttons[0]!, 'ArrowDown')).toBe(true);
  });

  it('vertical toolbars use ArrowDown / ArrowUp', async () => {
    const { host, buttons } = await mount();
    host.orientation = 'vertical';
    await flush();
    buttons[1]!.focus();
    key(buttons[1]!, 'ArrowDown');
    expect(document.activeElement).toBe(buttons[2]);
    key(buttons[2]!, 'ArrowUp');
    expect(document.activeElement).toBe(buttons[1]);
    expect(key(buttons[1]!, 'ArrowRight')).toBe(true);
  });

  it('collapsing makes the leading/trailing parts inert and moves focus out of them', async () => {
    const { host, root, buttons } = await mount();
    buttons[3]!.focus();
    host.expanded = false;
    await flush();
    const leading = root.querySelector<HTMLElement>('.m3e-floating-toolbar__leading')!;
    const trailing = root.querySelector<HTMLElement>('.m3e-floating-toolbar__trailing')!;
    expect(leading.inert).toBe(true);
    expect(trailing.inert).toBe(true);
    expect(document.activeElement).toBe(buttons[1]);
    host.expanded = true;
    await flush();
    expect(leading.inert).toBe(false);
  });

  it('beside a FAB, the folded toolbar is inert and focus goes to the FAB', async () => {
    const { host, root, buttons } = await mount(WITH_FAB);
    buttons[0]!.focus();
    host.expanded = false;
    await flush();
    expect(root.querySelector<HTMLElement>('.m3e-floating-toolbar__bar')!.inert).toBe(true);
    expect(document.activeElement).toBe(buttons[2]);
    expect(buttons[2]!.getAttribute('tabindex')).toBe('0');
  });

  it('springs the expanded progress on fast spatial, then clears the inline styles', async () => {
    const { host, root } = await mount(WITH_FAB);
    host.expanded = false;
    await flush();
    expect(root.hasAttribute('data-animating')).toBe(true);
    expect(progress(root)).toBe(1);
    runFrames(5);
    expect(progress(root)).toBeCloseTo(springValue(FAST_SPATIAL, 80, 1, 0), 6);
    runFrames(60);
    expect(root.style.getPropertyValue('--_m3e-floating-toolbar-progress')).toBe('');
    expect(root.hasAttribute('data-animating')).toBe(false);
  });

  it('a reversal mid-flight keeps the velocity (interruptible)', async () => {
    const { host, root } = await mount(WITH_FAB);
    host.expanded = false;
    await flush();
    runFrames(4); // 64ms into the collapse
    const at = springValue(FAST_SPATIAL, 64, 1, 0);
    const velocity = springVelocity(FAST_SPATIAL, 64, 1, 0);
    expect(progress(root)).toBeCloseTo(at, 6);
    host.expanded = true;
    await flush();
    runFrames(1);
    // The new spring starts at the old value with the old velocity (still moving down).
    expect(progress(root)).toBeCloseTo(springValue(FAST_SPATIAL, 16, at, 1, velocity), 6);
    expect(progress(root)).toBeLessThan(at);
  });

  it('reduced motion: the spatial spring jumps', async () => {
    const { host, root } = await mount(WITH_FAB, true);
    host.expanded = false;
    await flush();
    expect(root.style.getPropertyValue('--_m3e-floating-toolbar-progress')).toBe('');
    expect(root.hasAttribute('data-animating')).toBe(false);
  });

  it('collapse scroll behavior: scrolling down 40px collapses, up 40px expands', async () => {
    document.body.innerHTML = `<div id="scroller"></div>${MARKUP.replace('expanded', 'expanded scroll-behavior="collapse" scroll-target="scroller"')}`;
    const scroller = document.getElementById('scroller')!;
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 500 });
    await flush();
    const host = document.querySelector<M3eFloatingToolbar>('m3e-floating-toolbar')!;
    setTokens(host.toolbarElement!);
    // Re-read the threshold from the tokens now on the root.
    host.scrollBehavior = 'exit-always';
    await flush();
    host.scrollBehavior = 'collapse';
    await flush();
    const changes: boolean[] = [];
    host.addEventListener('expanded-change', (e) => {
      changes.push((e as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    const scrollTo = (top: number) => {
      scroller.scrollTop = top;
      scroller.dispatchEvent(new Event('scroll'));
    };
    scrollTo(30);
    expect(changes).toEqual([]);
    scrollTo(45);
    expect(changes).toEqual([false]);
    await flush();
    expect(host.expanded).toBe(false);
    expect(host.hasAttribute('expanded')).toBe(false);
    scrollTo(6);
    expect(changes).toEqual([false]);
    scrollTo(5); // 40px up from where it collapsed
    expect(changes).toEqual([false, true]);
  });

  it('exit-always: hides by the scrolled distance, out of the tab order; snaps on scrollend', async () => {
    document.body.innerHTML = `<div id="scroller"></div>${MARKUP.replace('expanded', 'expanded scroll-behavior="exit-always" scroll-target="scroller"')}`;
    const scroller = document.getElementById('scroller')!;
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 500 });
    await flush();
    const host = document.querySelector<M3eFloatingToolbar>('m3e-floating-toolbar')!;
    const root = host.toolbarElement!;
    setTokens(root);
    expect(root.getAttribute('data-exit-direction')).toBe('bottom');
    expect(root.getAttribute('data-scroll-behavior')).toBe('exit-always');
    const offset = () =>
      Number.parseFloat(root.style.getPropertyValue('--_m3e-floating-toolbar-offset') || '0');
    scroller.scrollTop = 20;
    scroller.dispatchEvent(new Event('scroll'));
    expect(offset()).toBe(-20);
    expect(
      [...root.querySelectorAll('button')].every((b) => b.getAttribute('tabindex') === '-1'),
    ).toBe(true);
    // Mostly shown: snaps back to 0 on the snap spring when scrolling ends.
    scroller.dispatchEvent(new Event('scrollend'));
    runFrames(2);
    expect(offset()).toBeGreaterThan(-20);
    runFrames(60);
    expect(offset()).toBe(0);
    expect(root.querySelector('button')!.getAttribute('tabindex')).toBe('0');
  });
});
