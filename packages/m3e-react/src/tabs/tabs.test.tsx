import '@kyralabs/m3e-elements/tabs.js';
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { Tab, type TabItem, TabPanel, Tabs } from './index.js';

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

/** happy-dom lays nothing out: every tab is 100px wide, its content 8px per label character. */
class FakeResizeObserver {
  constructor(private readonly cb: ResizeObserverCallback) {}
  observe(target: Element): void {
    const label = target.closest('.m3e-tab')?.querySelector('.m3e-tab__label')?.textContent ?? '';
    const w = target.classList.contains('m3e-tab__content')
      ? label.length * 8 || 24
      : target.classList.contains('m3e-tab')
        ? 100
        : 400;
    this.cb(
      [
        {
          target,
          borderBoxSize: [{ inlineSize: w, blockSize: 48 }],
          contentRect: { width: w, height: 48 },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  frames = [];
  now = 1000;
  document.head.innerHTML =
    '<style>.m3e-tabs { --m3e-comp-tabs-indicator-duration: 500ms; --m3e-comp-tabs-indicator-damping-ratio: 0.8; --m3e-comp-tabs-indicator-stiffness: 380; }</style>';
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ITEMS: TabItem[] = [
  { key: 'videos', label: 'Videos', icon: 'videocam' },
  { key: 'photos', label: 'Photos', icon: 'photo' },
  { key: 'audio', label: 'Audio', icon: 'music_note', isDisabled: true },
  { key: 'fav', label: 'Favorites', icon: 'favorite', isLabelHidden: true },
];
const ELEMENT_TABS = [
  '<m3e-tab value="videos" icon="videocam">Videos</m3e-tab>',
  '<m3e-tab value="photos" icon="photo">Photos</m3e-tab>',
  '<m3e-tab value="audio" icon="music_note" disabled>Audio</m3e-tab>',
  '<m3e-tab value="fav" icon="favorite" label-hidden>Favorites</m3e-tab>',
  '<m3e-tab-panel value="videos">V</m3e-tab-panel>',
  '<m3e-tab-panel value="photos">P</m3e-tab-panel>',
].join('');

/** The contract both layers render; React Aria's press marker is a runtime detail. */
const contract = (el: Element) => {
  const clone = el.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    node.removeAttribute('data-react-aria-pressable');
  }
  return canonical(clone);
};

/** A panel's APG wiring (the element's host keeps its own `value` attribute and tag). */
const panelWiring = (el: Element) =>
  ['class', 'role', 'id', 'aria-labelledby', 'tabindex', 'hidden'].map(
    (name) => `${name}=${String(el.getAttribute(name))}`,
  );

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  it.each([
    ['primary, fixed', '', {}],
    [
      'secondary, scrollable, leading icons',
      ' variant="secondary" scrollable icon-position="leading"',
      { variant: 'secondary', scrollable: true, iconPosition: 'leading' },
    ],
  ] as const)('%s', async (_name, attrs, props) => {
    const react = await renderReact(
      <Tabs id="media" aria-label="Media" items={ITEMS} selectedKey="photos" {...props}>
        <TabPanel id="videos">V</TabPanel>
        <TabPanel id="photos">P</TabPanel>
      </Tabs>,
    );
    const host = await renderElement(
      `<m3e-tabs id="media" label="Media" selected="photos"${attrs}>${ELEMENT_TABS}</m3e-tabs>`,
    );
    expect(contract(host.querySelector('.m3e-tabs')!)).toBe(
      contract(react.querySelector('.m3e-tabs')!),
    );
    const reactPanels = [...react.querySelectorAll('[role="tabpanel"]')].map(panelWiring);
    const elementPanels = [...host.querySelectorAll('[role="tabpanel"]')].map(panelWiring);
    expect(elementPanels).toEqual(reactPanels);
    expect(reactPanels[1]).toContain('hidden=null');
    expect(reactPanels[0]).toContain('hidden=');
  });
});

describe('<Tabs>', () => {
  it('<Tab> children work like items; the first enabled tab is the default selection', async () => {
    const container = await renderReact(
      <Tabs aria-label="Media">
        <Tab id="a" isDisabled>
          A
        </Tab>
        <Tab id="b" icon="photo">
          B
        </Tab>
        <TabPanel id="b">Panel B</TabPanel>
      </Tabs>,
    );
    const tabs = [...container.querySelectorAll('.m3e-tab')];
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect(tabs[1]!.getAttribute('aria-controls')).toBe(
      container.querySelector('[role="tabpanel"]')!.id,
    );
    expect(container.querySelector('[role="tabpanel"]')!.hasAttribute('hidden')).toBe(false);
  });

  it('a press selects (uncontrolled), calls onSelectionChange and slides the indicator', async () => {
    const changes: string[] = [];
    function Example() {
      const [key, setKey] = useState('videos');
      return (
        <Tabs
          aria-label="Media"
          items={ITEMS}
          selectedKey={key}
          onSelectionChange={(k) => {
            changes.push(k);
            setKey(k);
          }}
        />
      );
    }
    const container = await renderReact(<Example />);
    const root = container.querySelector<HTMLElement>('.m3e-tabs')!;
    const tabs = [...container.querySelectorAll<HTMLElement>('.m3e-tab')];
    await act(async () => {
      tabs[1]!.click();
      await Promise.resolve();
    });
    expect(changes).toEqual(['photos']);
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(root.hasAttribute('data-animating')).toBe(true);
    expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-tabs-indicator-shift'))).toBe(
      -100,
    );
    await runFrames(200);
    expect(root.hasAttribute('data-animating')).toBe(false);
    // Disabled tabs do not select.
    await act(async () => {
      tabs[2]!.click();
      await Promise.resolve();
    });
    expect(changes).toEqual(['photos']);
  });

  it('roving tab stop on the selected tab; arrows move focus without selecting', async () => {
    const container = await renderReact(
      <Tabs aria-label="Media" items={ITEMS} defaultSelectedKey="photos" />,
    );
    const tabs = [...container.querySelectorAll<HTMLElement>('.m3e-tab')];
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);
    tabs[1]!.focus();
    await act(async () => {
      tabs[1]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });
    expect(document.activeElement).toBe(tabs[2]);
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
  });
});
