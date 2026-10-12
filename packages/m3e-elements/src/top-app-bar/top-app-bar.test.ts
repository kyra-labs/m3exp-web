import { afterEach, describe, expect, it } from 'vitest';
import { attachTopAppBarScroll } from './top-app-bar.js';

// happy-dom has no layout: give the bar a height and the scroller a scroll range. Without motion
// tokens in the test document, snaps jump straight to their target.
function setup(behavior?: 'pinned' | 'enter-always') {
  const scroller = document.createElement('div');
  const bar = document.createElement('header');
  bar.className = 'm3e-top-app-bar';
  const action = document.createElement('button');
  bar.append(action);
  scroller.append(bar);
  document.body.append(scroller);
  Object.defineProperty(bar, 'offsetHeight', { value: 64 });
  Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
  Object.defineProperty(scroller, 'clientHeight', { value: 500 });
  const controller = new AbortController();
  attachTopAppBarScroll(bar, {
    ...(behavior ? { behavior } : {}),
    target: scroller,
    signal: controller.signal,
  });
  const scrollTo = (top: number) => {
    scroller.scrollTop = top;
    scroller.dispatchEvent(new Event('scroll'));
  };
  const offset = () => bar.style.getPropertyValue('--_m3e-top-app-bar-offset');
  return { bar, action, scroller, controller, scrollTo, offset };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('attachTopAppBarScroll', () => {
  it('pinned: switches to the scrolled color only, never moves', () => {
    const { bar, scrollTo, offset } = setup();
    expect(bar.getAttribute('data-scroll-behavior')).toBe('pinned');
    expect(bar.hasAttribute('data-scrolled')).toBe(false);
    scrollTo(200);
    expect(bar.hasAttribute('data-scrolled')).toBe(true);
    expect(offset()).toBe('');
    scrollTo(0);
    expect(bar.hasAttribute('data-scrolled')).toBe(false);
  });

  it('enter-always: hides with the scroll and re-enters on any upward scroll', () => {
    const { bar, scrollTo, offset } = setup('enter-always');
    expect(offset()).toBe('0px');
    scrollTo(40);
    expect(offset()).toBe('-40px');
    scrollTo(300);
    expect(offset()).toBe('-64px');
    scrollTo(290);
    expect(offset()).toBe('-54px');
    expect(bar.hasAttribute('data-scrolled')).toBe(true);
  });

  it('enter-always: snaps a partly hidden bar when scrolling ends', () => {
    const { scroller, scrollTo, offset } = setup('enter-always');
    scrollTo(20); // collapsed 0.31 → expands
    scroller.dispatchEvent(new Event('scrollend'));
    expect(offset()).toBe('0px');
    scrollTo(60); // collapsed 0.63 → hides
    scroller.dispatchEvent(new Event('scrollend'));
    expect(offset()).toBe('-64px');
  });

  it('enter-always: focus moving into a hidden bar brings it back', () => {
    const { action, scrollTo, offset } = setup('enter-always');
    scrollTo(300);
    action.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(offset()).toBe('0px');
  });

  it('cleans up on abort', () => {
    const { bar, controller, scrollTo } = setup('enter-always');
    scrollTo(100);
    controller.abort();
    expect(bar.hasAttribute('data-scroll-behavior')).toBe(false);
    expect(bar.hasAttribute('data-scrolled')).toBe(false);
    expect(bar.style.getPropertyValue('--_m3e-top-app-bar-offset')).toBe('');
    scrollTo(0);
    expect(bar.hasAttribute('data-scrolled')).toBe(false);
  });
});
