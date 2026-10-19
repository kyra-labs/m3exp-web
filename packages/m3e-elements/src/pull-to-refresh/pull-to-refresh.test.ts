import {
  PullToRefreshPull,
  pullToRefreshArrowGeometry,
  pullToRefreshArrowPaths,
} from '@kyralabs/m3e-motion';
import { afterEach, describe, expect, it } from 'vitest';
import './index.js';

// happy-dom has no layout and no m3e tokens: the state spring resolves to null (the indicator
// jumps) unless a test sets the spring tokens, and the threshold falls back to 80px.
const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

const mount = async (attrs = '', children = '<ul><li>One</li><li>Two</li></ul>') => {
  const container = document.createElement('div');
  container.innerHTML = `<m3e-pull-to-refresh${attrs}>${children}</m3e-pull-to-refresh>`;
  document.body.append(container);
  await flush();
  const host = container.querySelector('m3e-pull-to-refresh')!;
  const root = host.rootElement!;
  root.setPointerCapture = () => undefined;
  root.hasPointerCapture = () => false;
  root.releasePointerCapture = () => undefined;
  const content = root.querySelector<HTMLElement>('.m3e-pull-to-refresh__content')!;
  return { host, root, content };
};

const pointer = (target: Element, type: string, y: number, pointerType = 'touch') => {
  const e = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: 7,
    pointerType,
    clientX: 100,
    clientY: y,
  });
  target.dispatchEvent(e);
};

/** A pull from y 100 down by each of `moves` (px), after the 8px slop; optionally released. */
const pull = (target: Element, moves: readonly number[], release = true, pointerType = 'touch') => {
  let y = 100;
  pointer(target, 'pointerdown', y, pointerType);
  y += 9; // past the slop: the drag starts here (the slop itself is not pulled).
  pointer(target, 'pointermove', y, pointerType);
  for (const m of moves) {
    y += m;
    pointer(target, 'pointermove', y, pointerType);
  }
  if (release) pointer(target, 'pointerup', y, pointerType);
};

const fraction = (root: HTMLElement) =>
  Number(root.style.getPropertyValue('--_m3e-ptr-fraction') || 0);

/** The port's distanceFraction after the same moves. */
const expected = (moves: readonly number[], threshold = 80) => {
  const p = new PullToRefreshPull(threshold);
  for (const m of moves) p.consume(m, false);
  return p.distanceFraction;
};

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

describe('<m3e-pull-to-refresh> contract (COMPONENT_SPEC §38)', () => {
  it('default indicator: content, the arrow progress bar and the circular progress', async () => {
    const { host, root, content } = await mount();
    expect(host.style.display).toBe('contents');
    expect(root.className).toBe('m3e-pull-to-refresh');
    expect(content.innerHTML).toBe('<ul><li>One</li><li>Two</li></ul>');
    const box = root.querySelector('.m3e-pull-to-refresh__indicator > .m3e-pull-to-refresh__box')!;
    const [pullPart, busy] = [...box.children] as [HTMLElement, HTMLElement];
    expect(pullPart.className).toBe('m3e-pull-to-refresh__pull');
    expect(pullPart.getAttribute('role')).toBe('progressbar');
    expect(pullPart.getAttribute('aria-label')).toBe('Refresh');
    expect(pullPart.getAttribute('aria-valuemin')).toBe('0');
    expect(pullPart.getAttribute('aria-valuemax')).toBe('100');
    expect(pullPart.getAttribute('aria-valuenow')).toBe('0');
    expect(pullPart.getAttribute('aria-hidden')).toBe('true');
    const arrow = pullPart.querySelector('svg')!;
    expect(arrow.getAttribute('class')).toBe('m3e-pull-to-refresh__arrow');
    expect(arrow.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(arrow.getAttribute('aria-hidden')).toBe('true');
    expect([...arrow.children].map((c) => c.getAttribute('class'))).toEqual([
      'm3e-pull-to-refresh__arc',
      'm3e-pull-to-refresh__head',
    ]);
    expect(busy.className).toBe('m3e-pull-to-refresh__refreshing');
    expect(busy.getAttribute('aria-hidden')).toBe('true');
    const spinner = busy.firstElementChild!;
    expect(spinner.className).toBe('m3e-circular-progress');
    expect(spinner.getAttribute('role')).toBe('progressbar');
    expect(spinner.getAttribute('aria-label')).toBe('Refresh');
    expect(spinner.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.hasAttribute('data-pulled')).toBe(false);
    expect(root.hasAttribute('data-refreshing')).toBe(false);
    expect(root.hasAttribute('data-at-top')).toBe(true);
  });

  it('indicator="loading-indicator": contained loading indicators (owner decisions #27, #28)', async () => {
    const { root } = await mount(' indicator="loading-indicator" indicator-label="Reload"');
    expect(root.className).toBe('m3e-pull-to-refresh m3e-pull-to-refresh--loading-indicator');
    const pullPart = root.querySelector('.m3e-pull-to-refresh__pull')!;
    expect(pullPart.hasAttribute('role')).toBe(false);
    const [determinate, indeterminate] = [
      pullPart.firstElementChild!,
      root.querySelector('.m3e-pull-to-refresh__refreshing')!.firstElementChild!,
    ];
    expect(determinate.localName).toBe('m3e-loading-indicator');
    expect(determinate.hasAttribute('contained')).toBe(true);
    expect(determinate.getAttribute('progress')).toBe('0');
    expect(indeterminate.localName).toBe('m3e-loading-indicator');
    expect(indeterminate.hasAttribute('progress')).toBe(false);
    for (const li of [determinate, indeterminate]) {
      expect(
        li.getAttribute('label') ?? li.querySelector('[aria-label]')?.getAttribute('aria-label'),
      ).toBe('Reload');
    }
  });

  it('starts at the threshold when refreshing (Compose onAttach)', async () => {
    const { root, host } = await mount(' refreshing');
    expect(fraction(root)).toBe(1);
    expect(host.distanceFraction).toBe(1);
    expect(root.hasAttribute('data-refreshing')).toBe(true);
    expect(root.hasAttribute('data-at-top')).toBe(false);
    expect(
      root.querySelector('.m3e-pull-to-refresh__refreshing')!.hasAttribute('aria-hidden'),
    ).toBe(false);
  });
});

describe('pulls (owner decision M9 #28: touch and pen)', () => {
  it('a touch pull moves the indicator by the port (× 0.5, tension), drawing the arrow', async () => {
    const { root, content } = await mount();
    const moves = [40, 40, 40];
    pull(content.firstElementChild!, moves, false);
    const f = expected(moves);
    expect(fraction(root)).toBeCloseTo(f, 4);
    expect(root.hasAttribute('data-pulled')).toBe(true);
    expect(root.hasAttribute('data-armed')).toBe(false);
    const pullPart = root.querySelector('.m3e-pull-to-refresh__pull')!;
    expect(pullPart.getAttribute('aria-valuenow')).toBe(String(Math.round(f * 100)));
    expect(pullPart.hasAttribute('aria-hidden')).toBe(false);
    const paths = pullToRefreshArrowPaths(pullToRefreshArrowGeometry(f));
    expect(root.querySelector('.m3e-pull-to-refresh__arc')!.getAttribute('d')).toBe(paths.arc);
    expect(root.querySelector('.m3e-pull-to-refresh__head')!.getAttribute('d')).toBe(paths.arrow);
    expect(root.hasAttribute('data-dragging')).toBe(true);
  });

  it('a release past the threshold fires refresh; the app’s refreshing holds it at the threshold', async () => {
    const { host, root, content } = await mount();
    let refreshes = 0;
    host.addEventListener('refresh', () => {
      refreshes++;
      host.refreshing = true;
    });
    const moves = [60, 60, 60];
    pull(content, moves, false);
    expect(root.hasAttribute('data-armed')).toBe(true);
    expect(expected(moves)).toBeGreaterThan(1);
    pointer(content, 'pointerup', 289);
    expect(refreshes).toBe(1);
    await flush();
    expect(root.hasAttribute('data-refreshing')).toBe(true);
    expect(fraction(root)).toBe(1);
    expect(root.querySelector('.m3e-pull-to-refresh__pull')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
    // Done: back to hidden.
    host.refreshing = false;
    await flush();
    expect(fraction(root)).toBe(0);
    expect(root.hasAttribute('data-pulled')).toBe(false);
  });

  it('a release short of the threshold (or exactly at it) goes back without refreshing', async () => {
    const { host, root, content } = await mount();
    let refreshes = 0;
    host.addEventListener('refresh', () => refreshes++);
    pull(content, [80, 80]);
    expect(refreshes).toBe(0);
    expect(fraction(root)).toBe(0);
    pull(content, [100, 61]);
    expect(refreshes).toBe(1);
    expect(fraction(root)).toBe(0); // the app did not set refreshing
  });

  it('moving back up retracts the pull first, then scrolls the content', async () => {
    const { root, content } = await mount();
    pull(content, [60, -40], false);
    expect(fraction(root)).toBeCloseTo(expected([60, -40]), 4);
    expect(content.scrollTop).toBe(0);
    pointer(content, 'pointermove', 109 + 60 - 40 - 50);
    expect(fraction(root)).toBe(0);
    expect(content.scrollTop).toBe(30);
    pointer(content, 'pointerup', 79);
  });

  it('mouse drags never pull; neither do pulls below the top, disabled or while refreshing', async () => {
    const { host, root, content } = await mount();
    pull(content, [100, 100], true, 'mouse');
    expect(root.hasAttribute('data-pulled')).toBe(false);
    pull(content, [100, 100], false, 'pen');
    expect(root.hasAttribute('data-pulled')).toBe(true);
    pointer(content, 'pointercancel', 309, 'pen');
    expect(root.hasAttribute('data-pulled')).toBe(false);

    content.scrollTop = 40;
    content.dispatchEvent(new Event('scroll'));
    expect(root.hasAttribute('data-at-top')).toBe(false);
    pull(content, [100]);
    expect(root.hasAttribute('data-pulled')).toBe(false);
    content.scrollTop = 0;
    content.dispatchEvent(new Event('scroll'));
    expect(root.hasAttribute('data-at-top')).toBe(true);

    host.disabled = true;
    await flush();
    expect(root.hasAttribute('data-at-top')).toBe(false);
    pull(content, [100]);
    expect(root.hasAttribute('data-pulled')).toBe(false);
    host.disabled = false;
    host.refreshing = true;
    await flush();
    pull(content, [100]);
    expect(fraction(root)).toBe(1);
  });

  it('the threshold attribute moves the refresh point (Compose threshold)', async () => {
    const { host, content } = await mount(' threshold="120"');
    let refreshes = 0;
    host.addEventListener('refresh', () => refreshes++);
    pull(content, [100, 100, 40]);
    expect(refreshes).toBe(0);
    pull(content, [100, 100, 41]);
    expect(refreshes).toBe(1);
  });

  it('refresh() fires the same event (the visible Refresh button, the keyboard path)', async () => {
    const { host } = await mount();
    const events: Event[] = [];
    host.addEventListener('refresh', (e) => events.push(e));
    host.refresh();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(CustomEvent);
  });

  it('the loading indicator variant drives the determinate child’s progress', async () => {
    const { root, content } = await mount(' indicator="loading-indicator"');
    pull(content, [60, 60], false);
    const li = root.querySelector('.m3e-pull-to-refresh__pull > m3e-loading-indicator')!;
    expect(Number(li.getAttribute('progress'))).toBeCloseTo(Math.min(expected([60, 60]), 1), 4);
    pull(content, [200, 200], false);
    expect(li.getAttribute('progress')).toBe('1');
  });
});

describe('touch scrolling at the top', () => {
  const touch = (target: Element, type: string, y: number) => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'touches', { value: [{ clientY: y }] });
    target.dispatchEvent(e);
    return e;
  };

  it('keeps moves down from the browser at the top; moves up scroll', async () => {
    const { content } = await mount();
    touch(content, 'touchstart', 100);
    expect(touch(content, 'touchmove', 104).defaultPrevented).toBe(true);
    touch(content, 'touchstart', 100);
    expect(touch(content, 'touchmove', 96).defaultPrevented).toBe(false);
    expect(touch(content, 'touchmove', 120).defaultPrevented).toBe(false);
  });
});

describe('motion (PullToRefreshStateImpl: Animatable spring)', () => {
  it('springs to the threshold when refreshing starts, with data-animating until it rests', async () => {
    const { host, root } = await mount();
    // Set on the root itself: the element's own threshold / style writes keep other properties.
    root.style.setProperty('--m3e-comp-pull-to-refresh-state-duration', '238ms');
    root.style.setProperty('--m3e-comp-pull-to-refresh-state-damping-ratio', '1');
    root.style.setProperty('--m3e-comp-pull-to-refresh-state-stiffness', '1500');
    host.refreshing = true;
    await flush();
    expect(root.hasAttribute('data-animating')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const mid = fraction(root);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(root.hasAttribute('data-animating')).toBe(false);
    expect(fraction(root)).toBe(1);
  });
});
