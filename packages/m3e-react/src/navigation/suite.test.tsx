import '@kyralabs/m3e-elements/navigation-suite.js';
import type { NavigationSuiteType } from '@kyralabs/m3e-motion';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { NavigationSuiteScaffold, type NavigationSuiteDestination } from './index.js';

let frames: FrameRequestCallback[];
let now: number;
const runFrames = async (n: number) => {
  await act(async () => {
    for (let i = 0; i < n; i++) {
      now += 16;
      const run = frames;
      frames = [];
      for (const cb of run) cb(now);
    }
    await Promise.resolve();
  });
};

beforeEach(() => {
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

const ITEMS: NavigationSuiteDestination[] = [
  { key: 'home', icon: 'home', label: 'Home', href: '/home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'mail', icon: 'mail', label: 'Mail', badge: '3' },
  { key: 'off', icon: 'block', label: 'Off', isDisabled: true },
  { key: 'star', icon: 'star', label: 'Starred', href: '/star', isDisabled: true },
];
const ELEMENT_ITEMS = [
  '<m3e-navigation-item value="home" icon="home" href="/home">Home</m3e-navigation-item>',
  '<m3e-navigation-item value="search" icon="search">Search</m3e-navigation-item>',
  '<m3e-navigation-item value="mail" icon="mail" badge="3">Mail</m3e-navigation-item>',
  '<m3e-navigation-item value="off" icon="block" disabled>Off</m3e-navigation-item>',
  '<m3e-navigation-item value="star" icon="star" href="/star" disabled>Starred</m3e-navigation-item>',
].join('');

/** The contract both layers render; React Aria's press marker is a runtime detail. */
const contract = (el: Element) => {
  const clone = el.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    node.removeAttribute('data-react-aria-pressable');
  }
  return canonical(clone);
};

const TYPES: NavigationSuiteType[] = [
  'short-navigation-bar-compact',
  'short-navigation-bar-medium',
  'wide-navigation-rail-collapsed',
  'wide-navigation-rail-expanded',
  'navigation-drawer',
  'none',
];

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  it.each(TYPES)('NavigationSuiteScaffold, %s, with a primary action', async (type) => {
    const react = await renderReact(
      <NavigationSuiteScaffold
        aria-label="Main"
        items={ITEMS}
        selectedKey="search"
        layoutType={type}
        primaryAction={
          <button type="button" slot="primary-action">
            Compose
          </button>
        }
        primaryActionAlignment="center"
      >
        <p>Content</p>
      </NavigationSuiteScaffold>,
    );
    const host = await renderElement(
      `<m3e-navigation-suite label="Main" selected="search" layout-type="${type}" primary-action-alignment="center">${ELEMENT_ITEMS}<button type="button" slot="primary-action">Compose</button><p>Content</p></m3e-navigation-suite>`,
    );
    const suite = (root: Element) => root.querySelector('.m3e-navigation-suite')!;
    expect(contract(suite(host))).toBe(contract(suite(react)));
  });

  it('NavigationSuiteScaffold, adaptive (the default rule), hidden, no primary action', async () => {
    const react = await renderReact(
      <NavigationSuiteScaffold
        aria-label="Main"
        items={ITEMS}
        selectedKey="home"
        isNavigationHidden
      >
        <p>Content</p>
      </NavigationSuiteScaffold>,
    );
    const host = await renderElement(
      `<m3e-navigation-suite label="Main" selected="home" navigation-hidden>${ELEMENT_ITEMS}<p>Content</p></m3e-navigation-suite>`,
    );
    const suite = (root: Element) => root.querySelector('.m3e-navigation-suite')!;
    expect(suite(react).className).toContain('m3e-navigation-suite--navigation-hidden');
    expect(contract(suite(host))).toBe(contract(suite(react)));
  });
});

describe('<NavigationSuiteScaffold>', () => {
  function Harness({
    initialType,
    onType,
  }: {
    initialType: NavigationSuiteType;
    onType?: (t: NavigationSuiteType) => void;
  }) {
    const [type, setType] = useState(initialType);
    const [hidden, setHidden] = useState(false);
    return (
      <>
        <button
          type="button"
          data-testid="type"
          onClick={() => {
            setType(next(type));
          }}
        >
          next
        </button>
        <button
          type="button"
          data-testid="hide"
          onClick={() => {
            setHidden((h) => !h);
          }}
        >
          hide
        </button>
        <NavigationSuiteScaffold
          aria-label="Main"
          items={ITEMS}
          defaultSelectedKey="home"
          layoutType={type}
          isNavigationHidden={hidden}
          navigationSuiteType={() => type}
          onNavigationSuiteTypeChange={onType}
        >
          <input data-testid="content-input" />
        </NavigationSuiteScaffold>
      </>
    );
  }
  const next = (t: NavigationSuiteType): NavigationSuiteType =>
    t === 'short-navigation-bar-compact'
      ? 'wide-navigation-rail-collapsed'
      : t === 'wide-navigation-rail-collapsed'
        ? 'navigation-drawer'
        : 'short-navigation-bar-compact';
  const items = (root: Element) => [
    ...root.querySelectorAll<HTMLElement>('.m3e-navigation-item, .m3e-navigation-drawer-item'),
  ];
  const click = async (el: Element) => {
    await act(async () => {
      (el as HTMLElement).click();
      await Promise.resolve();
    });
  };

  it('keeps the item elements, the content and the selection from bar to rail; focus into the drawer', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const types: NavigationSuiteType[] = [];
    await act(async () => {
      root.render(
        <Harness initialType="short-navigation-bar-compact" onType={(t) => types.push(t)} />,
      );
      await Promise.resolve();
    });
    const input = container.querySelector('[data-testid="content-input"]')!;
    const before = items(container);
    await click(before[1]!);
    expect(before[1]!.getAttribute('aria-current')).toBe('page');
    before[1]!.focus();
    await click(container.querySelector('[data-testid="type"]')!);
    // Bar → rail: the same <nav> and item elements (focus stays where it was).
    expect(container.querySelector('nav')!.className).toBe('m3e-wide-navigation-rail');
    expect(items(container)).toEqual(before);
    expect(container.querySelector('[data-testid="content-input"]')).toBe(input);
    // Rail → drawer: new item elements; focus follows to the same item.
    before[1]!.focus();
    await act(async () => {
      container
        .querySelector<HTMLElement>('[data-testid="type"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    const drawerItems = items(container);
    expect(drawerItems[1]!.className).toBe('m3e-navigation-drawer-item');
    expect(drawerItems[1]!.getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('[data-testid="content-input"]')).toBe(input);
    expect(types).toEqual(['wide-navigation-rail-collapsed', 'navigation-drawer']);
    root.unmount();
  });

  it('restores focus to the same item when the drawer replaces the rail', async () => {
    function Switch() {
      const [type, setType] = useState<NavigationSuiteType>('wide-navigation-rail-collapsed');
      return (
        <NavigationSuiteScaffold
          aria-label="Main"
          items={ITEMS}
          layoutType={type}
          onSelectionChange={() => {
            setType('navigation-drawer');
          }}
        />
      );
    }
    const container = await renderReact(<Switch />);
    const rail = items(container);
    rail[2]!.focus();
    expect(document.activeElement).toBe(rail[2]);
    await click(rail[2]!);
    const drawer = items(container);
    expect(drawer[2]!.className).toBe('m3e-navigation-drawer-item');
    expect(document.activeElement).toBe(drawer[2]);
  });

  it('hides on Compose’s spring (NavigationSuiteLayout writes the offset)', async () => {
    const container = await renderReact(<Harness initialType="short-navigation-bar-compact" />);
    const suite = container.querySelector<HTMLElement>('.m3e-navigation-suite')!;
    suite.style.setProperty('--m3e-comp-navigation-suite-scaffold-visibility-duration', '228ms');
    suite.style.setProperty('--m3e-comp-navigation-suite-scaffold-visibility-damping-ratio', '0.9');
    suite.style.setProperty('--m3e-comp-navigation-suite-scaffold-visibility-stiffness', '700');
    await click(container.querySelector('[data-testid="hide"]')!);
    expect(suite.className).toContain('m3e-navigation-suite--navigation-hidden');
    expect(suite.hasAttribute('data-animating')).toBe(true);
    await runFrames(60);
    expect(suite.hasAttribute('data-animating')).toBe(false);
    expect(suite.style.getPropertyValue('--_m3e-ns-offset')).toBe('');
  });
});
