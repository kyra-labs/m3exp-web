import { describe, expect, it } from 'vitest';
import { attachRipple, rippleStyle } from './ripple.js';

describe('rippleStyle', () => {
  it('reaches the farthest corner from the press point', () => {
    expect(rippleStyle(100, 40, { x: 10, y: 10 })).toEqual({
      '--_m3e-ripple-x': '10px',
      '--_m3e-ripple-y': '10px',
      '--_m3e-ripple-radius': `${String(Math.round(Math.hypot(90, 30) * 100) / 100)}px`,
    });
  });

  it('centers keyboard presses', () => {
    expect(rippleStyle(100, 40, null)).toMatchObject({
      '--_m3e-ripple-x': '50px',
      '--_m3e-ripple-y': '20px',
    });
  });
});

describe('attachRipple', () => {
  const setup = () => {
    const host = document.createElement('button');
    document.body.append(host);
    const controller = new AbortController();
    attachRipple(host, controller.signal);
    return { host, controller };
  };

  it('marks the host and tracks pointer presses', () => {
    const { host } = setup();
    expect(host.hasAttribute('data-ripple')).toBe(true);
    host.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 4, clientY: 6 }));
    expect(host.hasAttribute('data-pressed')).toBe(true);
    expect(host.style.getPropertyValue('--_m3e-ripple-x')).toBe('4px');
    host.dispatchEvent(new PointerEvent('pointerup'));
    expect(host.hasAttribute('data-pressed')).toBe(false);
  });

  it('presses from the center on Enter and Space', () => {
    const { host } = setup();
    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(host.hasAttribute('data-pressed')).toBe(true);
    host.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
    expect(host.hasAttribute('data-pressed')).toBe(false);
  });

  it('ignores disabled hosts and cleans up on abort', () => {
    const { host, controller } = setup();
    host.setAttribute('aria-disabled', 'true');
    host.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
    expect(host.hasAttribute('data-pressed')).toBe(false);
    controller.abort();
    expect(host.hasAttribute('data-ripple')).toBe(false);
  });
});
