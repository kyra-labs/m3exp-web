import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachRipple } from '../base/ripple.js';
import { attachAutoRipple } from './ripple.js';

// happy-dom has no layout: give hosts a box.
function box(el: Element, left: number, top: number, width: number, height: number) {
  el.getBoundingClientRect = () => new DOMRect(left, top, width, height);
}

const down = (el: Element, x = 0, y = 0, pointerId = 1) =>
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      button: 0,
      clientX: x,
      clientY: y,
      pointerId,
    }),
  );
const up = (el: Element, pointerId = 1) =>
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId }));
const key = (el: Element, type: 'keydown' | 'keyup', k: string) =>
  el.dispatchEvent(new KeyboardEvent(type, { bubbles: true, composed: true, key: k }));

const ripple = (el: Element) => ({
  ripple: el.hasAttribute('data-ripple'),
  pressed: el.hasAttribute('data-pressed'),
  x: (el as HTMLElement).style.getPropertyValue('--_m3e-ripple-x'),
  y: (el as HTMLElement).style.getPropertyValue('--_m3e-ripple-y'),
});

describe('attachAutoRipple', () => {
  let controller: AbortController;
  beforeEach(() => {
    controller = new AbortController();
    attachAutoRipple(document, controller.signal);
  });
  afterEach(() => {
    controller.abort();
    document.body.replaceChildren();
  });

  const mount = (html: string) => {
    document.body.innerHTML = html;
    return document.body.firstElementChild as HTMLElement;
  };

  it('ripples a plain .m3e-button from the press point and releases on pointerup', () => {
    const button = mount(
      '<button class="m3e-button"><span class="m3e-button__label">Go</span></button>',
    );
    box(button, 10, 20, 100, 40);
    expect(ripple(button)).toMatchObject({ ripple: false, pressed: false });
    down(button.querySelector('span')!, 30, 30);
    expect(ripple(button)).toEqual({ ripple: true, pressed: true, x: '20px', y: '10px' });
    expect(button.style.getPropertyValue('--_m3e-ripple-radius')).toBe(
      `${String(Math.round(Math.hypot(80, 30) * 100) / 100)}px`,
    );
    up(button);
    // data-ripple stays, like attachRipple and m3e-react: m3e-css keeps hover and focus flat.
    expect(ripple(button)).toMatchObject({ ripple: true, pressed: false });
  });

  it('keeps handling its own hosts: a second press ripples from the new point', () => {
    const button = mount('<button class="m3e-button"></button>');
    box(button, 0, 0, 100, 40);
    down(button, 10, 10);
    up(button);
    down(button, 70, 30, 2);
    expect(ripple(button)).toEqual({ ripple: true, pressed: true, x: '70px', y: '30px' });
    up(button, 2);
    expect(ripple(button)).toMatchObject({ ripple: true, pressed: false });
    key(button, 'keydown', 'Enter');
    expect(ripple(button)).toEqual({ ripple: true, pressed: true, x: '50px', y: '20px' });
    key(button, 'keyup', 'Enter');
    expect(ripple(button)).toMatchObject({ ripple: true, pressed: false });
  });

  it.each(['m3e-icon-button', 'm3e-assist-chip', 'm3e-state-layer'])('ripples .%s', (cls) => {
    const host = mount(`<button class="${cls}"></button>`);
    box(host, 0, 0, 40, 40);
    down(host, 5, 5);
    expect(ripple(host)).toMatchObject({ ripple: true, pressed: true, x: '5px' });
  });

  it('ignores elements m3e-css draws no ripple for, and non-primary buttons', () => {
    const plain = mount('<button class="other"></button>');
    down(plain);
    expect(ripple(plain)).toMatchObject({ ripple: false, pressed: false });
    const button = mount('<button class="m3e-button"></button>');
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(button.hasAttribute('data-pressed')).toBe(false);
  });

  it('draws a card action press on the interactive card', () => {
    const card = mount(
      '<div class="m3e-card m3e-card--interactive"><button class="m3e-card__action">Open</button></div>',
    );
    box(card, 10, 20, 200, 100);
    const action = card.querySelector('.m3e-card__action')!;
    down(action, 60, 40);
    expect(ripple(card)).toEqual({ ripple: true, pressed: true, x: '50px', y: '20px' });
    expect(action.hasAttribute('data-pressed')).toBe(false);
    up(action);
    expect(ripple(card)).toMatchObject({ ripple: true, pressed: false });
    down(action, 20, 30, 2);
    expect(ripple(card)).toEqual({ ripple: true, pressed: true, x: '10px', y: '10px' });
  });

  it('draws a navigation item press on its indicator pill', () => {
    const item = mount(
      '<a class="m3e-navigation-item" href="#"><span class="m3e-navigation-item__content">' +
        '<span class="m3e-navigation-item__state" aria-hidden="true"></span></span></a>',
    );
    const state = item.querySelector('.m3e-navigation-item__state')!;
    box(state, 0, 0, 56, 32);
    down(item, 28, 16);
    expect(ripple(state)).toMatchObject({ ripple: true, pressed: true, x: '28px', y: '16px' });
    expect(item.hasAttribute('data-pressed')).toBe(false);
  });

  it('draws a checkbox press (label or input) on its state circle; Space only; not disabled', () => {
    const html =
      '<label class="m3e-checkbox"><input class="m3e-checkbox__input" type="checkbox"%>' +
      '<span class="m3e-checkbox__box"><span class="m3e-checkbox__mark"></span></span>' +
      '<span class="m3e-checkbox__state"></span><span class="m3e-checkbox__label">A</span></label>';
    const root = mount(html.replace('%', ''));
    const input = root.querySelector('input')!;
    const state = root.querySelector('.m3e-checkbox__state')!;
    box(state, 4, 4, 40, 40);
    down(root.querySelector('.m3e-checkbox__label')!, 100, 24);
    expect(ripple(state)).toMatchObject({ ripple: true, pressed: true });
    up(root);
    down(input, 24, 24, 2);
    expect(ripple(state)).toMatchObject({ ripple: true, pressed: true, x: '20px', y: '20px' });
    up(input, 2);
    key(input, 'keydown', 'Enter');
    expect(state.hasAttribute('data-pressed')).toBe(false);
    key(input, 'keydown', ' ');
    expect(state.hasAttribute('data-pressed')).toBe(true);
    key(input, 'keyup', ' ');
    expect(state.hasAttribute('data-pressed')).toBe(false);

    const disabled = mount(html.replace('%', ' disabled'));
    down(disabled.querySelector('.m3e-checkbox__label')!);
    down(disabled.querySelector('input')!, 0, 0, 3);
    expect(ripple(disabled.querySelector('.m3e-checkbox__state')!)).toMatchObject({
      ripple: false,
      pressed: false,
    });
  });

  it('ignores disabled triggers and hosts', () => {
    const disabled = mount('<button class="m3e-button" disabled></button>');
    down(disabled);
    expect(ripple(disabled)).toMatchObject({ ripple: false, pressed: false });
    const ariaDisabled = mount('<button class="m3e-icon-button" aria-disabled="true"></button>');
    down(ariaDisabled);
    expect(ripple(ariaDisabled)).toMatchObject({ ripple: false, pressed: false });
    const card = mount(
      '<div class="m3e-card m3e-card--interactive">' +
        '<button class="m3e-card__action" aria-disabled="true"></button></div>',
    );
    down(card.querySelector('.m3e-card__action')!);
    expect(ripple(card)).toMatchObject({ ripple: false, pressed: false });
  });

  it('skips hosts m3e-react drives (data-ripple rendered up front), on every press', () => {
    document.body.innerHTML =
      '<button class="m3e-button" data-ripple=""></button><button class="m3e-button"></button>';
    const [react, plain] = document.body.querySelectorAll<HTMLElement>('button');
    box(react!, 0, 0, 100, 40);
    box(plain!, 0, 0, 100, 40);
    for (const id of [1, 2]) {
      down(plain!, 10, 10, id);
      up(plain!, id);
      down(react!, 10, 10, id);
      expect(ripple(react!)).toMatchObject({ ripple: true, pressed: false, x: '' });
      up(react!, id);
    }
    expect(ripple(plain!)).toMatchObject({ ripple: true, pressed: false, x: '10px' });
    controller.abort();
    // Abort only resets hosts it owns.
    expect(react!.hasAttribute('data-ripple')).toBe(true);
    expect(plain!.hasAttribute('data-ripple')).toBe(false);
  });

  it('skips hosts with attachRipple (one press each, data-ripple left alone)', () => {
    const button = mount('<button class="m3e-button"></button>');
    box(button, 0, 0, 100, 40);
    const own = new AbortController();
    attachRipple(button, own.signal);
    const set = vi.spyOn(button, 'setAttribute');
    for (const id of [1, 2]) {
      down(button, 10, 10, id);
      expect(ripple(button)).toMatchObject({ ripple: true, pressed: true, x: '10px' });
      up(button, id);
      expect(ripple(button)).toMatchObject({ ripple: true, pressed: false });
    }
    // attachRipple's two presses and nothing from the auto ripple.
    expect(set.mock.calls.filter(([name]) => name.startsWith('data-'))).toEqual([
      ['data-pressed', ''],
      ['data-pressed', ''],
    ]);
    controller.abort();
    expect(button.hasAttribute('data-ripple')).toBe(true);
    own.abort();
  });

  it('does not double-handle hosts another attachAutoRipple owns', () => {
    const root = mount('<div><button class="m3e-button"></button></div>');
    const button = root.querySelector('button')!;
    box(button, 0, 0, 100, 40);
    const scoped = new AbortController();
    attachAutoRipple(root, scoped.signal);
    const set = vi.spyOn(button, 'setAttribute');
    for (const id of [1, 2]) {
      down(button, 10, 10, id);
      up(button, id);
    }
    // The document-level call (capture on document runs first) adopts it; the scoped one skips.
    expect(set.mock.calls.filter(([name]) => name === 'data-pressed')).toHaveLength(2);
    scoped.abort();
    expect(button.hasAttribute('data-ripple')).toBe(true);
  });

  it('resets owned hosts found disconnected and adopts them again when re-inserted', () => {
    const button = mount('<button class="m3e-button"></button>');
    box(button, 0, 0, 100, 40);
    down(button, 10, 10);
    up(button);
    button.remove();
    const other = mount('<button class="m3e-icon-button"></button>');
    down(other, 0, 0, 2);
    expect(ripple(button)).toEqual({ ripple: false, pressed: false, x: '', y: '' });
    document.body.append(button);
    down(button, 20, 20, 3);
    expect(ripple(button)).toEqual({ ripple: true, pressed: true, x: '20px', y: '20px' });
  });

  it('ends the press when the pointer leaves the trigger', () => {
    const button = mount('<button class="m3e-button"><span></span></button>');
    down(button);
    const inner = button.querySelector('span')!;
    button.dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, pointerId: 1, relatedTarget: inner }),
    );
    expect(button.hasAttribute('data-pressed')).toBe(true);
    button.dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, pointerId: 1, relatedTarget: document.body }),
    );
    expect(ripple(button)).toMatchObject({ ripple: true, pressed: false });
  });

  it('presses from the center on Enter and Space; links only on Enter', () => {
    const button = mount('<button class="m3e-button"></button>');
    box(button, 0, 0, 100, 40);
    key(button, 'keydown', ' ');
    expect(ripple(button)).toEqual({ ripple: true, pressed: true, x: '50px', y: '20px' });
    key(button, 'keyup', ' ');
    expect(ripple(button)).toMatchObject({ ripple: true, pressed: false });

    const link = mount('<a class="m3e-button" href="#"></a>');
    box(link, 0, 0, 100, 40);
    key(link, 'keydown', ' ');
    expect(link.hasAttribute('data-pressed')).toBe(false);
    key(link, 'keydown', 'Enter');
    expect(link.hasAttribute('data-pressed')).toBe(true);
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(link.hasAttribute('data-pressed')).toBe(false);
  });

  it('cleans up on abort: resets every owned host and stops listening', () => {
    document.body.innerHTML =
      '<button class="m3e-button"></button><button class="m3e-icon-button"></button>';
    const [pressed, released] = document.body.querySelectorAll<HTMLElement>('button');
    box(pressed!, 0, 0, 100, 40);
    box(released!, 0, 0, 40, 40);
    down(released!, 5, 5, 2);
    up(released!, 2);
    down(pressed!, 10, 10);
    controller.abort();
    for (const host of [pressed!, released!]) {
      expect(ripple(host)).toEqual({ ripple: false, pressed: false, x: '', y: '' });
      expect(host.style.getPropertyValue('--_m3e-ripple-radius')).toBe('');
    }
    down(pressed!, 0, 0, 3);
    expect(ripple(pressed!)).toMatchObject({ ripple: false, pressed: false });
  });

  it('scopes to a root element', () => {
    const scoped = new AbortController();
    const root = mount('<div><button class="m3e-button"></button></div>');
    controller.abort();
    attachAutoRipple(root, scoped.signal);
    const outside = document.createElement('button');
    outside.className = 'm3e-button';
    document.body.append(outside);
    down(outside);
    expect(outside.hasAttribute('data-pressed')).toBe(false);
    down(root.querySelector('button')!, 0, 0, 3);
    expect(root.querySelector('button')!.hasAttribute('data-pressed')).toBe(true);
    scoped.abort();
  });
});

describe("the 'ripple' entry", () => {
  it('enables the ripple for the whole document on import', async () => {
    await import('./index.js');
    document.body.innerHTML = '<button class="m3e-button"></button>';
    const button = document.body.firstElementChild!;
    down(button);
    expect(button.hasAttribute('data-pressed')).toBe(true);
    up(button);
    expect(button.hasAttribute('data-pressed')).toBe(false);
  });
});
