import { springDurationMillis, springValue } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { M3eNavigationSuite } from './navigation-suite.js';
import './index.js';

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

/** A fake viewport: matchMedia answers `(min-width|min-height: Npx)` from `viewport`. */
const viewport = { width: 0, height: 0 };
const lists: FakeMediaQueryList[] = [];
class FakeMediaQueryList extends EventTarget {
  readonly feature: 'width' | 'height';
  readonly bound: number;
  constructor(readonly media: string) {
    super();
    const m = /^\(min-(width|height): (\d+)px\)$/.exec(media);
    if (!m) throw new Error(`unexpected query ${media}`);
    this.feature = m[1] as 'width' | 'height';
    this.bound = Number(m[2]);
  }
  get matches(): boolean {
    return viewport[this.feature] >= this.bound;
  }
}
function resize(width: number, height: number) {
  const before = lists.map((l) => l.matches);
  viewport.width = width;
  viewport.height = height;
  lists.forEach((l, i) => {
    if (l.matches !== before[i]) l.dispatchEvent(new Event('change'));
  });
}

/** ResizeObserver that reports the sizes tests give each element. */
const sizes = new Map<Element, [number, number]>();
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed = new Set<Element>();
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
    const size = sizes.get(el);
    if (size) this.report(el, size);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
  report(el: Element, [inline, block]: [number, number]) {
    this.callback(
      [
        {
          target: el,
          borderBoxSize: [{ inlineSize: inline, blockSize: block }],
          contentRect: { width: inline, height: block },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
}
function setSize(el: Element, inline: number, block: number) {
  sizes.set(el, [inline, block]);
  for (const ro of FakeResizeObserver.instances) {
    if (ro.observed.has(el)) ro.report(el, [inline, block]);
  }
}

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

// NavigationSuiteScaffold.kt AnimationSpec (the generated visibility spring).
const SPEC = { dampingRatio: 0.9, stiffness: 700 };

beforeEach(() => {
  lists.length = 0;
  sizes.clear();
  FakeResizeObserver.instances = [];
  viewport.width = 400;
  viewport.height = 800;
  vi.stubGlobal('matchMedia', (media: string) => {
    const list = new FakeMediaQueryList(media);
    lists.push(list);
    return list as unknown as MediaQueryList;
  });
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  frames = [];
  now = 1000;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ITEMS = [
  '<m3e-navigation-item value="home" icon="home" href="/home">Home</m3e-navigation-item>',
  '<m3e-navigation-item value="search" icon="search">Search</m3e-navigation-item>',
  '<m3e-navigation-item value="mail" icon="mail" badge="3">Mail</m3e-navigation-item>',
].join('');

async function mount(attributes = '', extra = ''): Promise<M3eNavigationSuite> {
  document.body.innerHTML = `<m3e-navigation-suite label="Main" selected="home" ${attributes}>${ITEMS}${extra}<p id="content">Content</p></m3e-navigation-suite>`;
  await flush();
  const host = document.querySelector<M3eNavigationSuite>('m3e-navigation-suite')!;
  host.suiteElement!.style.setProperty(
    '--m3e-comp-navigation-suite-scaffold-visibility-duration',
    '228ms',
  );
  host.suiteElement!.style.setProperty(
    '--m3e-comp-navigation-suite-scaffold-visibility-damping-ratio',
    String(SPEC.dampingRatio),
  );
  host.suiteElement!.style.setProperty(
    '--m3e-comp-navigation-suite-scaffold-visibility-stiffness',
    String(SPEC.stiffness),
  );
  return host;
}

const suite = (host: M3eNavigationSuite) => host.suiteElement!;
const nav = (host: M3eNavigationSuite) => suite(host).querySelector('nav')!;
const navItems = (host: M3eNavigationSuite) => [
  ...suite(host).querySelectorAll<HTMLElement>('.m3e-navigation-item, .m3e-navigation-drawer-item'),
];

describe('<m3e-navigation-suite>: the navigation for the window size class', () => {
  it('compact: a short navigation bar below the content', async () => {
    const host = await mount();
    expect(host.type).toBe('short-navigation-bar-compact');
    expect(suite(host).className).toBe('m3e-navigation-suite m3e-navigation-suite--bar');
    const children = [...suite(host).children].map((el) => el.className);
    expect(children).toEqual(['m3e-short-navigation-bar', 'm3e-navigation-suite__content']);
    expect(nav(host).getAttribute('aria-label')).toBe('Main');
    expect(navItems(host)).toHaveLength(3);
    expect(navItems(host)[0]!.getAttribute('aria-current')).toBe('page');
    // Other children are the content.
    expect(suite(host).querySelector('.m3e-navigation-suite__content > #content')).not.toBeNull();
  });

  it('switches bar → rail → expanded rail as the window grows, keeping the item elements', async () => {
    const host = await mount();
    const before = navItems(host);
    const types: string[] = [];
    host.addEventListener('navigation-suite-type-change', (e) => {
      types.push((e as CustomEvent<{ type: string }>).detail.type);
    });
    resize(700, 800);
    await flush();
    expect(host.type).toBe('wide-navigation-rail-collapsed');
    expect(suite(host).className).toBe('m3e-navigation-suite m3e-navigation-suite--rail');
    expect(nav(host).className).toBe('m3e-wide-navigation-rail');
    expect(navItems(host)).toEqual(before);
    resize(1200, 800);
    await flush();
    expect(nav(host).className).toBe('m3e-wide-navigation-rail m3e-wide-navigation-rail--expanded');
    expect(navItems(host)).toEqual(before);
    resize(1300, 400);
    await flush();
    // Compact height: the medium bar (horizontal items) comes before the expanded rail.
    expect(host.type).toBe('short-navigation-bar-medium');
    expect(nav(host).className).toBe(
      'm3e-short-navigation-bar m3e-short-navigation-bar--horizontal',
    );
    expect(navItems(host)).toEqual(before);
    expect(types).toEqual([
      'wide-navigation-rail-collapsed',
      'wide-navigation-rail-expanded',
      'short-navigation-bar-medium',
    ]);
  });

  it('keeps the selection across switches', async () => {
    const host = await mount();
    navItems(host)[1]!.click();
    await flush();
    expect(host.selected).toBe('search');
    resize(1400, 900);
    await flush();
    expect(navItems(host).map((el) => el.hasAttribute('aria-current'))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('expanded-from / expanded-type / layout-type / navigationSuiteType override the rule', async () => {
    viewport.width = 1400;
    const host = await mount('expanded-from="none"');
    expect(host.type).toBe('wide-navigation-rail-collapsed');
    host.setAttribute('expanded-from', 'expanded');
    await flush();
    expect(host.type).toBe('wide-navigation-rail-expanded');
    host.setAttribute('expanded-type', 'navigation-drawer');
    await flush();
    expect(host.type).toBe('navigation-drawer');
    expect(suite(host).className).toBe('m3e-navigation-suite m3e-navigation-suite--drawer');
    host.setAttribute('layout-type', 'short-navigation-bar-compact');
    await flush();
    expect(host.type).toBe('short-navigation-bar-compact');
    host.removeAttribute('layout-type');
    host.navigationSuiteType = () => 'none';
    await flush();
    expect(host.type).toBe('none');
    expect(suite(host).querySelector('nav')).toBeNull();
    expect(suite(host).className).toBe('m3e-navigation-suite m3e-navigation-suite--none');
  });

  it('drawer: the PermanentDrawerSheet contract with drawer items (badge shown)', async () => {
    const host = await mount('layout-type="navigation-drawer"');
    const drawer = suite(host).firstElementChild!;
    expect(drawer.className).toBe('m3e-navigation-drawer');
    const sheet = drawer.firstElementChild!;
    expect(sheet.localName).toBe('nav');
    expect(sheet.className).toBe('m3e-navigation-drawer__sheet');
    expect(sheet.getAttribute('aria-label')).toBe('Main');
    const [home, , mail] = navItems(host);
    expect(home!.className).toBe('m3e-navigation-drawer-item');
    expect([...mail!.children].map((el) => el.className)).toEqual([
      'm3e-icon m3e-navigation-drawer-item__icon',
      'm3e-navigation-drawer-item__label',
      'm3e-navigation-drawer-item__badge',
    ]);
    expect(home!.getAttribute('aria-current')).toBe('page');
    // Back to a bar: new bar items (the drawer item DOM differs).
    host.setAttribute('layout-type', 'short-navigation-bar-compact');
    await flush();
    expect(navItems(host)[0]!.className).toBe('m3e-navigation-item');
  });

  it('places the primary action above a bar, in the rail header, first in the drawer sheet', async () => {
    const host = await mount(
      'primary-action-alignment="start"',
      '<button slot="primary-action" id="fab">Compose</button>',
    );
    const fab = document.getElementById('fab')!;
    expect(suite(host).classList).toContain('m3e-navigation-suite--primary-action-start');
    expect(fab.parentElement!.className).toBe('m3e-navigation-suite__primary-action');
    expect(fab.parentElement!.parentElement).toBe(suite(host));
    expect([...suite(host).children].map((el) => el.className)).toEqual([
      'm3e-short-navigation-bar',
      'm3e-navigation-suite__primary-action',
      'm3e-navigation-suite__content',
    ]);
    resize(800, 800);
    await flush();
    expect(fab.parentElement!.className).toBe('m3e-wide-navigation-rail__header');
    expect(nav(host).firstElementChild).toBe(fab.parentElement);
    host.setAttribute('layout-type', 'navigation-drawer');
    await flush();
    expect(fab.parentElement!.className).toBe('m3e-navigation-suite__primary-action');
    expect(fab.parentElement!.parentElement!.className).toBe('m3e-navigation-drawer__sheet');
    host.setAttribute('layout-type', 'none');
    await flush();
    expect(fab.isConnected).toBe(false);
    host.removeAttribute('layout-type');
    await flush();
    expect(fab.parentElement!.className).toBe('m3e-wide-navigation-rail__header');
  });

  it('gives focus back to the same item when a switch replaces it', async () => {
    viewport.width = 1400;
    const host = await mount();
    navItems(host)[1]!.focus();
    expect(document.activeElement).toBe(navItems(host)[1]);
    host.setAttribute('layout-type', 'navigation-drawer');
    await flush();
    expect(navItems(host)[1]!.className).toBe('m3e-navigation-drawer-item');
    expect(document.activeElement).toBe(navItems(host)[1]);
    host.removeAttribute('layout-type');
    await flush();
    expect(document.activeElement).toBe(navItems(host)[1]);
    expect(navItems(host)[1]!.className).toBe('m3e-navigation-item');
  });

  it('keeps focus on a moved primary action', async () => {
    await mount('', '<button slot="primary-action" id="fab">Compose</button>');
    const fab = document.getElementById('fab')!;
    fab.focus();
    resize(800, 800);
    await flush();
    expect(fab.parentElement!.className).toBe('m3e-wide-navigation-rail__header');
    expect(document.activeElement).toBe(fab);
  });

  it('does not re-render for mutations inside the content', async () => {
    const host = await mount();
    const spy = vi.spyOn(host, 'requestUpdate');
    document.getElementById('content')!.textContent = 'Changed';
    document.getElementById('content')!.append(document.createElement('span'));
    await flush();
    expect(spy).not.toHaveBeenCalled();
    // Children added to the host later join the content.
    const late = document.createElement('section');
    host.append(late);
    await flush();
    expect(late.parentElement!.className).toBe('m3e-navigation-suite__content');
  });
});

describe('<m3e-navigation-suite>: show / hide (NavigationSuiteScaffoldState)', () => {
  it('hides on the scaffold spring: the bar leaves by (height × progress).toInt() per frame', async () => {
    const host = await mount();
    setSize(nav(host), 400, 80);
    host.hideNavigation();
    await flush();
    expect(host.navigationHidden).toBe(true);
    expect(suite(host).classList).toContain('m3e-navigation-suite--navigation-hidden');
    expect(suite(host).hasAttribute('data-animating')).toBe(true);
    // Frame 1: the state leaves Visible; the layout's spring starts (progress 1).
    runFrames(1);
    const start = now;
    runFrames(1);
    const p = springValue(SPEC, now - start, 1, 0, 0);
    expect(suite(host).style.getPropertyValue('--_m3e-ns-offset')).toBe(
      `${String(80 - Math.trunc(80 * p))}px`,
    );
    runFrames(60);
    expect(suite(host).hasAttribute('data-animating')).toBe(false);
    expect(suite(host).style.getPropertyValue('--_m3e-ns-offset')).toBe('');
  });

  it('shows after the state spring settles, then slides the rail in by its width', async () => {
    viewport.width = 800;
    const host = await mount('navigation-hidden');
    expect(suite(host).classList).toContain('m3e-navigation-suite--navigation-hidden');
    expect(suite(host).hasAttribute('data-animating')).toBe(false);
    setSize(nav(host), 96, 800);
    const events: boolean[] = [];
    host.addEventListener('navigation-hidden-change', (e) => {
      events.push((e as CustomEvent<{ hidden: boolean }>).detail.hidden);
    });
    host.showNavigation();
    await flush();
    expect(events).toEqual([false]);
    expect(suite(host).classList).not.toContain('m3e-navigation-suite--navigation-hidden');
    const wait = springDurationMillis(SPEC, 0, 1, 0, 0.01);
    const offsets: string[] = [];
    while (now < 1000 + wait + 800 && suite(host).hasAttribute('data-animating')) {
      runFrames(1);
      offsets.push(suite(host).style.getPropertyValue('--_m3e-ns-offset'));
    }
    const waiting = offsets.filter((o) => o === '96px').length;
    // Fully out while the state spring runs (~wait ms), then in.
    expect(waiting * 16).toBeGreaterThanOrEqual(wait - 32);
    expect(offsets.some((o) => o !== '96px' && o !== '')).toBe(true);
    expect(suite(host).hasAttribute('data-animating')).toBe(false);
  });

  it('jumps under reduced motion (visibility duration 0ms)', async () => {
    const host = await mount();
    suite(host).style.setProperty(
      '--m3e-comp-navigation-suite-scaffold-visibility-duration',
      '0ms',
    );
    host.toggleNavigation();
    await flush();
    expect(suite(host).classList).toContain('m3e-navigation-suite--navigation-hidden');
    expect(suite(host).hasAttribute('data-animating')).toBe(false);
  });
});
