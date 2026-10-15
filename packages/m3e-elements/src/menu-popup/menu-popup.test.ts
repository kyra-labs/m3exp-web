import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuPopup } from './menu-popup.js';

// happy-dom has no layout: stub the anchor box, the menu size and the viewport, and feed the
// springs' tokens inline (happy-dom resolves custom properties set on the element itself).
let frames: FrameRequestCallback[] = [];
let now = 0;
const frame = (ms: number) => {
  now += ms;
  const run = frames;
  frames = [];
  for (const cb of run) cb(now);
};

function setup(tokens: Record<string, string> = {}) {
  const anchor = document.createElement('button');
  const menu = document.createElement('div');
  menu.className = 'm3e-menu';
  menu.setAttribute('popover', 'manual');
  for (const [name, value] of Object.entries({
    '--m3e-comp-menu-closed-scale': '0.8',
    '--m3e-comp-menu-closed-opacity': '0',
    '--_m3e-menu-margin-block': '48px',
    '--_m3e-menu-margin-inline': '8px',
    ...tokens,
  })) {
    menu.style.setProperty(name, value);
  }
  document.body.append(anchor, menu);
  anchor.getBoundingClientRect = () =>
    ({ left: 100, top: 600, right: 140, bottom: 640, width: 40, height: 40 }) as DOMRect;
  Object.defineProperty(menu, 'offsetWidth', { value: 200 });
  Object.defineProperty(menu, 'offsetHeight', { value: 300 });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: 1000,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: 800,
    configurable: true,
  });
  const read = (name: string) => menu.style.getPropertyValue(name);
  return { anchor, menu, read };
}

beforeEach(() => {
  frames = [];
  now = performance.now();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('MenuPopup', () => {
  it('places the menu with DropdownMenuPositionProvider (flipped above) and its origin', () => {
    const { anchor, menu, read } = setup();
    new MenuPopup(menu).open({ anchor });
    expect(menu.hasAttribute('data-positioned')).toBe(true);
    expect(read('--_m3e-menu-x')).toBe('100px');
    // No room below (640 + 300 > 800 - 48): bottom aligned to the anchor top.
    expect(read('--_m3e-menu-y')).toBe('300px');
    expect(read('--_m3e-menu-origin-x')).toBe('0.1');
    expect(read('--_m3e-menu-origin-y')).toBe('1');
  });

  it('springs scale and opacity open from the closed targets, and reverses mid-flight', () => {
    const { anchor, menu, read } = setup({
      '--m3e-sys-motion-spring-fast-spatial-damping-ratio': '0.6',
      '--m3e-sys-motion-spring-fast-spatial-stiffness': '800',
      '--m3e-sys-motion-spring-fast-spatial-duration': '350ms',
      '--m3e-sys-motion-spring-fast-effects-damping-ratio': '1',
      '--m3e-sys-motion-spring-fast-effects-stiffness': '3800',
      '--m3e-sys-motion-spring-fast-effects-duration': '150ms',
    });
    const popup = new MenuPopup(menu);
    popup.open({ anchor });
    expect(menu.hasAttribute('data-driven')).toBe(true);
    expect(read('--_m3e-menu-scale')).toBe('0.8');
    expect(read('--_m3e-menu-opacity')).toBe('0');
    frame(16);
    frame(16);
    const mid = Number(read('--_m3e-menu-scale'));
    expect(mid).toBeGreaterThan(0.8);
    expect(mid).toBeLessThan(1.2);
    // Reverse: the next value continues from the current one (no jump back to 1 or 0.8).
    const onClosed = vi.fn();
    popup.close(onClosed);
    frame(16);
    expect(Math.abs(Number(read('--_m3e-menu-scale')) - mid)).toBeLessThan(0.1);
    for (let i = 0; i < 100 && frames.length > 0; i++) frame(16);
    expect(onClosed).toHaveBeenCalledOnce();
    expect(menu.hasAttribute('data-driven')).toBe(false);
    expect(read('--_m3e-menu-scale')).toBe('');
  });

  it('reduced motion (spatial duration 0): the scale snaps, opacity still fades', () => {
    const { anchor, menu, read } = setup({
      '--m3e-sys-motion-spring-fast-spatial-damping-ratio': '0.6',
      '--m3e-sys-motion-spring-fast-spatial-stiffness': '800',
      '--m3e-sys-motion-spring-fast-spatial-duration': '0ms',
      '--m3e-sys-motion-spring-fast-effects-damping-ratio': '1',
      '--m3e-sys-motion-spring-fast-effects-stiffness': '3800',
      '--m3e-sys-motion-spring-fast-effects-duration': '150ms',
    });
    new MenuPopup(menu).open({ anchor });
    expect(read('--_m3e-menu-scale')).toBe('1');
    expect(read('--_m3e-menu-opacity')).toBe('0');
    frame(16);
    expect(Number(read('--_m3e-menu-opacity'))).toBeGreaterThan(0);
  });

  it('dismisses on a pointer down outside the menu and the anchor', () => {
    const { anchor, menu } = setup();
    const onDismiss = vi.fn();
    new MenuPopup(menu).open({ anchor, onDismiss });
    menu.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    anchor.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(onDismiss).not.toHaveBeenCalled();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
