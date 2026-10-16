import { twoRowsFrame } from '@kyralabs/m3e-motion';
import { afterEach, describe, expect, it } from 'vitest';
import { type AppBarScrollBehavior, attachTopAppBarScroll } from './top-app-bar.js';

// happy-dom has no layout: give the bar a height and the scroller a scroll range. Without motion
// tokens in the test document, snaps jump straight to their target.
function setup(behavior?: AppBarScrollBehavior) {
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

  it('exit-until-collapsed: collapses on scroll down, expands only near the content start', () => {
    const { scrollTo, offset } = setup('exit-until-collapsed');
    scrollTo(40);
    expect(offset()).toBe('-40px');
    scrollTo(300);
    expect(offset()).toBe('-64px');
    scrollTo(100); // the content takes the whole upward scroll
    expect(offset()).toBe('-64px');
    scrollTo(30);
    expect(offset()).toBe('-30px');
    scrollTo(0);
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

describe('attachTopAppBarScroll on a two-rows bar', () => {
  // A medium flexible bar: 64px top row (navigation, collapsed headline, actions) + a 48px
  // expanded row; only the expanded row collapses (TwoRowsTopAppBar).
  function setupTwoRows(behavior: AppBarScrollBehavior) {
    const scroller = document.createElement('div');
    scroller.innerHTML = `
      <header class="m3e-top-app-bar m3e-top-app-bar--medium-flexible">
        <div class="m3e-top-app-bar__navigation"><button>menu</button></div>
        <div class="m3e-top-app-bar__headline" aria-hidden="true"><h1 class="m3e-top-app-bar__title">Inbox</h1></div>
        <div class="m3e-top-app-bar__actions"><button>search</button></div>
        <div class="m3e-top-app-bar__expanded">
          <div class="m3e-top-app-bar__headline"><h1 class="m3e-top-app-bar__title">Inbox</h1></div>
        </div>
      </header>`;
    document.body.append(scroller);
    const bar = scroller.querySelector<HTMLElement>('.m3e-top-app-bar')!;
    const row = bar.querySelector<HTMLElement>('.m3e-top-app-bar__expanded')!;
    Object.defineProperty(bar, 'offsetHeight', { value: 112 });
    Object.defineProperty(row, 'offsetHeight', { value: 48 });
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 500 });
    const controller = new AbortController();
    attachTopAppBarScroll(bar, { behavior, target: scroller, signal: controller.signal });
    const scrollTo = (top: number) => {
      scroller.scrollTop = top;
      scroller.dispatchEvent(new Event('scroll'));
    };
    const prop = (name: string) => bar.style.getPropertyValue(`--_m3e-top-app-bar-${name}`);
    const [collapsed, expanded] = bar.querySelectorAll('.m3e-top-app-bar__headline');
    return {
      bar,
      scroller,
      controller,
      scrollTo,
      prop,
      collapsed: collapsed!,
      expanded: expanded!,
    };
  }

  it('collapses only the expanded row and interpolates from the collapsed fraction', () => {
    const { scrollTo, prop, collapsed, expanded } = setupTwoRows('exit-until-collapsed');
    expect(prop('offset')).toBe('0px');
    expect(prop('expanded-title-opacity')).toBe('1');
    expect(prop('collapsed-title-opacity')).toBe('0');
    expect(prop('color-fraction')).toBe('0');
    expect(collapsed.getAttribute('aria-hidden')).toBe('true');
    expect(expanded.hasAttribute('aria-hidden')).toBe(false);

    scrollTo(12); // fraction 0.25
    const quarter = twoRowsFrame(0.25);
    expect(prop('offset')).toBe('-12px');
    expect(prop('expanded-title-opacity')).toBe('0.75');
    expect(Number(prop('collapsed-title-opacity'))).toBeCloseTo(quarter.collapsedTitleAlpha, 12);
    expect(Number(prop('color-fraction'))).toBeCloseTo(quarter.containerColorFraction, 12);

    scrollTo(24); // fraction 0.5: the semantics swap
    expect(collapsed.hasAttribute('aria-hidden')).toBe(false);
    expect(expanded.getAttribute('aria-hidden')).toBe('true');

    scrollTo(400); // collapsed to the top row
    expect(prop('offset')).toBe('-48px');
    expect(prop('collapsed-title-opacity')).toBe('1');
    expect(prop('expanded-title-opacity')).toBe('0');
    expect(prop('color-fraction')).toBe('1');
  });

  it('pinned: never collapses, the color stays (TwoRowsTopAppBar follows collapsedFraction)', () => {
    const { bar, scrollTo, prop } = setupTwoRows('pinned');
    scrollTo(300);
    expect(prop('offset')).toBe('');
    expect(prop('color-fraction')).toBe('0');
    expect(bar.hasAttribute('data-scrolled')).toBe(true);
  });

  it('focus in the always-visible top row does not expand; abort restores the static contract', () => {
    const { bar, scrollTo, prop, controller, collapsed, expanded } =
      setupTwoRows('exit-until-collapsed');
    scrollTo(400);
    bar.querySelector('button')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(prop('offset')).toBe('-48px');
    controller.abort();
    expect(prop('offset')).toBe('');
    expect(prop('collapsed-title-opacity')).toBe('');
    expect(collapsed.getAttribute('aria-hidden')).toBe('true');
    expect(expanded.hasAttribute('aria-hidden')).toBe(false);
  });

  it('snaps a partly collapsed row when scrolling ends', () => {
    const { scroller, scrollTo, prop } = setupTwoRows('exit-until-collapsed');
    scrollTo(30); // fraction 0.625 → collapses
    scroller.dispatchEvent(new Event('scrollend'));
    expect(prop('offset')).toBe('-48px');
  });
});
