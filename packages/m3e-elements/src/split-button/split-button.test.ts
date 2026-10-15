import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../menu/index.js';
import './index.js';
import type { M3eMenu } from '../menu/menu.js';
import type { M3eSplitButton } from './split-button.js';

// happy-dom has no layout and no m3e-css: spring targets are given as inline custom properties.
let frames: FrameRequestCallback[] = [];
const flushFrames = (at = 10_000) => {
  for (let i = 0; i < 10 && frames.length > 0; i++) {
    const run = frames;
    frames = [];
    for (const cb of run) cb(performance.now() + at);
  }
};
const settle = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function setup(attrs = '', menu = true) {
  document.body.innerHTML = `
    <m3e-split-button label="Save" icon="save" menu-label="More save options" ${attrs}>
      ${menu ? '<m3e-menu><m3e-menu-item value="draft">Save as draft</m3e-menu-item><m3e-menu-item value="copy">Save a copy</m3e-menu-item></m3e-menu>' : ''}
    </m3e-split-button>`;
  await settle();
  const host = document.querySelector<M3eSplitButton>('m3e-split-button')!;
  return {
    host,
    root: host.querySelector<HTMLElement>(':scope > .m3e-split-button')!,
    leading: host.leadingButton!,
    trailing: host.trailingButton!,
    menu: host.querySelector<M3eMenu>('m3e-menu'),
  };
}

const key = (k: string, target: Element) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
};

describe('<m3e-split-button> contract', () => {
  it('renders the .m3e-split-button contract: two .m3e-button parts', async () => {
    const { root, leading, trailing } = await setup('variant="tonal" size="m"');
    expect(root.className).toBe('m3e-split-button');
    expect([...root.children]).toEqual([leading, trailing]);
    expect(leading.className).toBe(
      'm3e-button m3e-button--tonal m3e-button--size-m m3e-button--round m3e-split-button__leading',
    );
    expect(trailing.className).toBe(
      'm3e-button m3e-button--tonal m3e-button--size-m m3e-button--round m3e-split-button__trailing',
    );
    expect(leading.type).toBe('button');
    expect(leading.innerHTML).toBe('<span class="m3e-icon" aria-hidden="true">save</span>Save');
    expect(trailing.getAttribute('aria-label')).toBe('More save options');
    expect(trailing.innerHTML).toBe(
      '<span class="m3e-icon" aria-hidden="true">keyboard_arrow_down</span>',
    );
    expect(leading.hasAttribute('data-ripple')).toBe(true);
    expect(trailing.hasAttribute('data-spring')).toBe(true);
  });

  it('falls back to filled / small and re-renders in place', async () => {
    const { host, leading, trailing } = await setup('variant="text" size="huge"');
    expect(leading.className).toContain('m3e-button--filled m3e-button--size-s');
    host.size = 'xl';
    host.trailingIcon = 'expand_more';
    host.disabled = true;
    await settle();
    expect(host.leadingButton).toBe(leading);
    expect(trailing.className).toContain('m3e-button--size-xl');
    expect(trailing.textContent).toBe('expand_more');
    expect(leading.disabled && trailing.disabled).toBe(true);
  });

  it('emits press for the leading button only', async () => {
    const { host, leading, trailing } = await setup('', false);
    const press = vi.fn();
    host.addEventListener('press', press);
    leading.click();
    trailing.click();
    expect(press).toHaveBeenCalledTimes(1);
  });
});

describe('<m3e-split-button> menu', () => {
  it('anchors the child menu to the trailing button (APG menu button)', async () => {
    const { trailing, menu } = await setup();
    expect(menu!.getAttribute('anchor')).toBe(trailing.id);
    await settle();
    expect(trailing.getAttribute('aria-haspopup')).toBe('true');
    expect(trailing.getAttribute('aria-expanded')).toBe('false');
    trailing.click();
    await settle();
    expect(menu!.open).toBe(true);
    expect(trailing.getAttribute('aria-expanded')).toBe('true');
    expect(trailing.getAttribute('aria-controls')).toBe(menu!.menuElement!.id);
    trailing.click();
    await settle();
    expect(menu!.open).toBe(false);
    expect(trailing.getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowDown opens on the first item; Escape closes and returns focus to the trailing button', async () => {
    const { trailing, menu } = await setup();
    await settle();
    trailing.focus();
    key('ArrowDown', trailing);
    await settle();
    const first = menu!.menuElement!.querySelector<HTMLElement>('.m3e-menu__item')!;
    expect(document.activeElement).toBe(first);
    key('Escape', first);
    await settle();
    expect(menu!.open).toBe(false);
    expect(document.activeElement).toBe(trailing);
    expect(trailing.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens a menu named by id', async () => {
    document.body.innerHTML = `
      <m3e-split-button label="Send" menu="send-menu" menu-label="More"></m3e-split-button>
      <m3e-menu id="send-menu"><m3e-menu-item>Schedule</m3e-menu-item></m3e-menu>`;
    await settle();
    const host = document.querySelector<M3eSplitButton>('m3e-split-button')!;
    expect(document.getElementById('send-menu')!.getAttribute('anchor')).toBe(
      host.trailingButton!.id,
    );
  });
});

describe('<m3e-split-button> springs', () => {
  const tokens = (el: HTMLElement) => {
    el.style.setProperty('--m3e-sys-motion-spring-default-effects-damping-ratio', '1');
    el.style.setProperty('--m3e-sys-motion-spring-default-effects-stiffness', '1600');
    el.style.setProperty('--m3e-sys-motion-spring-default-effects-duration', '200ms');
    el.style.setProperty('--m3e-comp-split-button-trailing-icon-rotation-damping-ratio', '1');
    el.style.setProperty('--m3e-comp-split-button-trailing-icon-rotation-stiffness', '1500');
    el.style.setProperty('--m3e-comp-split-button-trailing-icon-rotation-duration', '319ms');
  };

  it('springs the inner corner and icon to the resolved targets, then drops the inline values', async () => {
    const { host, trailing } = await setup('', false);
    const icon = trailing.querySelector<HTMLElement>('.m3e-icon')!;
    tokens(trailing);
    tokens(icon);
    trailing.style.setProperty('--_m3e-split-button-inner', '4px');
    icon.style.setProperty('--_m3e-split-button-rotation', '0deg');
    host.requestUpdate();
    await settle();
    // Open: m3e-css resolves the full inner corner and 180°.
    trailing.style.setProperty('--_m3e-split-button-inner', '20px');
    icon.style.setProperty('--_m3e-split-button-rotation', '180deg');
    trailing.setAttribute('aria-expanded', 'true');
    await settle();
    expect(trailing.style.getPropertyValue('--_m3e-split-button-inner-now')).toBe('4px');
    expect(icon.style.getPropertyValue('--_m3e-split-button-rotation-now')).toBe('0deg');
    flushFrames(40);
    const corner = Number.parseFloat(
      trailing.style.getPropertyValue('--_m3e-split-button-inner-now'),
    );
    const angle = Number.parseFloat(
      icon.style.getPropertyValue('--_m3e-split-button-rotation-now'),
    );
    expect(corner).toBeGreaterThan(4);
    expect(corner).toBeLessThan(20);
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(180);
    flushFrames();
    expect(trailing.style.getPropertyValue('--_m3e-split-button-inner-now')).toBe('');
    expect(icon.style.getPropertyValue('--_m3e-split-button-rotation-now')).toBe('');
  });

  it('jumps when the rotation duration resolves to 0ms (reduced motion)', async () => {
    const { host, trailing } = await setup('', false);
    const icon = trailing.querySelector<HTMLElement>('.m3e-icon')!;
    tokens(icon);
    icon.style.setProperty('--m3e-comp-split-button-trailing-icon-rotation-duration', '0ms');
    icon.style.setProperty('--_m3e-split-button-rotation', '0deg');
    host.requestUpdate();
    await settle();
    icon.style.setProperty('--_m3e-split-button-rotation', '180deg');
    trailing.setAttribute('aria-expanded', 'true');
    await settle();
    expect(icon.style.getPropertyValue('--_m3e-split-button-rotation-now')).toBe('180deg');
    flushFrames();
    expect(icon.style.getPropertyValue('--_m3e-split-button-rotation-now')).toBe('');
  });
});
