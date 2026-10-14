import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
    down(button.querySelector('span')!, 30, 30);
    expect(ripple(button)).toEqual({ ripple: true, pressed: true, x: '20px', y: '10px' });
    expect(button.style.getPropertyValue('--_m3e-ripple-radius')).toBe(
      `${String(Math.round(Math.hypot(80, 30) * 100) / 100)}px`,
    );
    up(button);
    expect(ripple(button)).toMatchObject({ ripple: false, pressed: false });
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
    expect(ripple(card)).toMatchObject({ ripple: false, pressed: false });
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

  it('skips hosts m3e-react drives (data-ripple rendered up front)', () => {
    const button = mount('<button class="m3e-button" data-ripple=""></button>');
    box(button, 0, 0, 100, 40);
    down(button, 10, 10);
    expect(ripple(button)).toMatchObject({ ripple: true, pressed: false, x: '' });
    up(button);
    expect(button.hasAttribute('data-ripple')).toBe(true);
  });

  it('skips hosts with attachRipple (no second press, data-ripple left alone)', () => {
    const button = mount('<button class="m3e-button"></button>');
    box(button, 0, 0, 100, 40);
    const own = new AbortController();
    attachRipple(button, own.signal);
    down(button, 10, 10);
    expect(ripple(button)).toMatchObject({ ripple: true, pressed: true, x: '10px' });
    up(button);
    expect(ripple(button)).toMatchObject({ ripple: true, pressed: false });
    own.abort();
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
    expect(ripple(button)).toMatchObject({ ripple: false, pressed: false });
  });

  it('presses from the center on Enter and Space; links only on Enter', () => {
    const button = mount('<button class="m3e-button"></button>');
    box(button, 0, 0, 100, 40);
    key(button, 'keydown', ' ');
    expect(ripple(button)).toEqual({ ripple: true, pressed: true, x: '50px', y: '20px' });
    key(button, 'keyup', ' ');
    expect(ripple(button)).toMatchObject({ ripple: false, pressed: false });

    const link = mount('<a class="m3e-button" href="#"></a>');
    box(link, 0, 0, 100, 40);
    key(link, 'keydown', ' ');
    expect(link.hasAttribute('data-pressed')).toBe(false);
    key(link, 'keydown', 'Enter');
    expect(link.hasAttribute('data-pressed')).toBe(true);
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(link.hasAttribute('data-pressed')).toBe(false);
  });

  it('cleans up on abort: releases an active press and stops listening', () => {
    const button = mount('<button class="m3e-button"></button>');
    down(button);
    controller.abort();
    expect(ripple(button)).toMatchObject({ ripple: false, pressed: false });
    down(button, 0, 0, 2);
    expect(button.hasAttribute('data-pressed')).toBe(false);
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
