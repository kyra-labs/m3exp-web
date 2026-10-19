import '@kyralabs/m3e-elements/modal-wide-navigation-rail.js';
import '@kyralabs/m3e-elements/short-navigation-bar.js';
import '@kyralabs/m3e-elements/wide-navigation-rail.js';
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import {
  ModalWideNavigationRail,
  type NavigationDestination,
  ShortNavigationBar,
  WideNavigationRail,
} from './index.js';

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

const ITEMS: NavigationDestination[] = [
  { key: 'home', icon: 'home', label: 'Home', href: '/home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'star', icon: 'star', label: 'Starred', href: '/star', isDisabled: true },
  { key: 'mail', icon: 'mail', label: 'Mail', isLabelHidden: true },
  { key: 'off', icon: 'block', label: 'Off', isDisabled: true },
];
const ELEMENT_ITEMS = [
  '<m3e-navigation-item value="home" icon="home" href="/home">Home</m3e-navigation-item>',
  '<m3e-navigation-item value="search" icon="search">Search</m3e-navigation-item>',
  '<m3e-navigation-item value="star" icon="star" href="/star" disabled>Starred</m3e-navigation-item>',
  '<m3e-navigation-item value="mail" icon="mail" label-hidden>Mail</m3e-navigation-item>',
  '<m3e-navigation-item value="off" icon="block" disabled>Off</m3e-navigation-item>',
].join('');

/** Badges: the dot, a count, 999+, a custom label, text, an icon-only item, none. */
const BADGE_ITEMS: NavigationDestination[] = [
  { key: 'chat', icon: 'chat', label: 'Chat', badge: true },
  { key: 'inbox', icon: 'inbox', label: 'Inbox', badge: 8, href: '/inbox' },
  { key: 'mail', icon: 'mail', label: 'Mail', badge: 1200, badgeLabel: '1200 unread' },
  { key: 'new', icon: 'star', label: 'Starred', badge: 'New', isDisabled: true },
  { key: 'fav', icon: 'favorite', label: 'Favorites', badge: 3, isLabelHidden: true },
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'off', icon: 'block', label: 'Off', badge: '', badgeLabel: '' },
];
const ELEMENT_BADGE_ITEMS = [
  '<m3e-navigation-item value="chat" icon="chat" badge>Chat</m3e-navigation-item>',
  '<m3e-navigation-item value="inbox" icon="inbox" badge="8" href="/inbox">Inbox</m3e-navigation-item>',
  '<m3e-navigation-item value="mail" icon="mail" badge="1200" badge-label="1200 unread">Mail</m3e-navigation-item>',
  '<m3e-navigation-item value="new" icon="star" badge="New" disabled>Starred</m3e-navigation-item>',
  '<m3e-navigation-item value="fav" icon="favorite" badge="3" label-hidden>Favorites</m3e-navigation-item>',
  '<m3e-navigation-item value="home" icon="home">Home</m3e-navigation-item>',
  '<m3e-navigation-item value="off" icon="block" badge="" badge-label="">Off</m3e-navigation-item>',
].join('');

/** The contract both layers render; React Aria's press marker is a runtime detail. */
const contract = (el: Element) => {
  const clone = el.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    node.removeAttribute('data-react-aria-pressable');
  }
  return canonical(clone);
};

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  it('ShortNavigationBar', async () => {
    const react = await renderReact(
      <ShortNavigationBar
        aria-label="Main"
        items={ITEMS}
        selectedKey="search"
        layout="horizontal"
      />,
    );
    const host = await renderElement(
      `<m3e-short-navigation-bar label="Main" selected="search" layout="horizontal">${ELEMENT_ITEMS}</m3e-short-navigation-bar>`,
    );
    expect(contract(host.querySelector('nav')!)).toBe(contract(react.querySelector('nav')!));
  });

  it('WideNavigationRail (header, expanded)', async () => {
    const react = await renderReact(
      <WideNavigationRail
        aria-label="Main"
        items={ITEMS}
        selectedKey="home"
        isExpanded
        header={<button type="button" aria-label="Menu" />}
      />,
    );
    const host = await renderElement(
      `<m3e-wide-navigation-rail label="Main" selected="home" expanded><button type="button" aria-label="Menu"></button>${ELEMENT_ITEMS}</m3e-wide-navigation-rail>`,
    );
    expect(contract(host.querySelector('nav')!)).toBe(contract(react.querySelector('nav')!));
  });

  it.each(['ShortNavigationBar', 'WideNavigationRail, expanded'])('badges: %s', async (name) => {
    const rail = name.startsWith('Wide');
    const react = await renderReact(
      rail ? (
        <WideNavigationRail aria-label="Main" items={BADGE_ITEMS} selectedKey="chat" isExpanded />
      ) : (
        <ShortNavigationBar aria-label="Main" items={BADGE_ITEMS} selectedKey="chat" />
      ),
    );
    const tag = rail ? 'm3e-wide-navigation-rail' : 'm3e-short-navigation-bar';
    const host = await renderElement(
      `<${tag} label="Main" selected="chat"${rail ? ' expanded' : ''}>${ELEMENT_BADGE_ITEMS}</${tag}>`,
    );
    expect(host.querySelectorAll('.m3e-badge')).toHaveLength(6);
    expect(contract(host.querySelector('nav')!)).toBe(contract(react.querySelector('nav')!));
  });

  it('badges follow attribute changes (added, changed, removed) as React re-renders', async () => {
    const host = await renderElement(
      `<m3e-short-navigation-bar label="Main">${ELEMENT_BADGE_ITEMS}</m3e-short-navigation-bar>`,
    );
    const items = [...host.querySelectorAll('m3e-navigation-item')];
    items[0]!.setAttribute('badge', '12');
    items[1]!.removeAttribute('badge');
    items[2]!.setAttribute('badge-label', '5 new');
    items[5]!.setAttribute('badge', '');
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    const next: NavigationDestination[] = BADGE_ITEMS.map((item, i) =>
      i === 0
        ? { ...item, badge: 12 }
        : i === 1
          ? { ...item, badge: undefined }
          : i === 2
            ? { ...item, badgeLabel: '5 new' }
            : i === 5
              ? { ...item, badge: true }
              : item,
    );
    const react = await renderReact(<ShortNavigationBar aria-label="Main" items={next} />);
    expect(contract(host.querySelector('nav')!)).toBe(contract(react.querySelector('nav')!));
  });

  it('ModalWideNavigationRail (collapsed and hide-on-collapse)', async () => {
    for (const hide of [false, true]) {
      const react = await renderReact(
        <ModalWideNavigationRail
          aria-label="Main"
          items={ITEMS}
          selectedKey="home"
          hideOnCollapse={hide}
          header={<button type="button" aria-label="Menu" />}
        />,
      );
      const host = await renderElement(
        `<m3e-modal-wide-navigation-rail label="Main" selected="home"${hide ? ' hide-on-collapse' : ''}><button type="button" aria-label="Menu"></button>${ELEMENT_ITEMS}</m3e-modal-wide-navigation-rail>`,
      );
      expect(contract(host.querySelector('.m3e-modal-wide-navigation-rail')!)).toBe(
        contract(react.firstElementChild!),
      );
    }
  });
});

describe('WideNavigationRail animation', () => {
  it('animates isExpanded with the shared layout and rests on the class', async () => {
    function Demo() {
      const [expanded, setExpanded] = useState(false);
      return (
        <WideNavigationRail
          aria-label="Main"
          items={ITEMS}
          isExpanded={expanded}
          header={
            <button
              type="button"
              aria-label="Menu"
              onClick={() => {
                setExpanded((v) => !v);
              }}
            />
          }
        />
      );
    }
    const root = await renderReact(<Demo />);
    const nav = root.querySelector('nav')!;
    for (const [name, value] of [
      ['--m3e-comp-wide-navigation-rail-width-duration', '500ms'],
      ['--m3e-comp-wide-navigation-rail-width-damping-ratio', '0.8'],
      ['--m3e-comp-wide-navigation-rail-width-stiffness', '380'],
      ['--m3e-comp-wide-navigation-rail-icon-position-duration', '500ms'],
      ['--m3e-comp-wide-navigation-rail-icon-position-damping-ratio', '0.8'],
      ['--m3e-comp-wide-navigation-rail-icon-position-stiffness', '380'],
      ['--m3e-comp-navigation-rail-collapsed-container-width', '96px'],
      ['--m3e-comp-navigation-rail-expanded-container-width-minimum', '220px'],
      ['--m3e-comp-navigation-rail-expanded-container-width-maximum', '360px'],
    ] as const) {
      nav.style.setProperty(name, value);
    }
    await act(async () => {
      nav.querySelector('button')!.click();
      await Promise.resolve();
    });
    expect(nav.classList.contains('m3e-wide-navigation-rail--expanded')).toBe(true);
    expect(nav.hasAttribute('data-animating')).toBe(true);
    await runFrames(2);
    const p = Number(nav.style.getPropertyValue('--_m3e-wnr-progress'));
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
    await runFrames(120);
    expect(nav.hasAttribute('data-animating')).toBe(false);
    expect(nav.style.getPropertyValue('--_m3e-wnr-progress')).toBe('');
  });
});

describe('ModalWideNavigationRail', () => {
  const escape = async (el: Element) => {
    await act(async () => {
      el.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });
  };

  it('uncontrolled: opens as a dialog; Escape collapses it and reports it', async () => {
    const onExpandedChange = vi.fn();
    const root = await renderReact(
      <ModalWideNavigationRail
        aria-label="Main"
        items={ITEMS}
        defaultExpanded
        onExpandedChange={onExpandedChange}
      />,
    );
    const modal = root.firstElementChild!;
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(modal.getAttribute('aria-label')).toBe('Navigation rail');
    expect(modal.hasAttribute('data-open')).toBe(true);
    expect(modal.querySelector('nav')!.getAttribute('aria-label')).toBe('Main');
    await escape(modal.querySelector('button')!);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(
      modal.querySelector('nav')!.classList.contains('m3e-wide-navigation-rail--expanded'),
    ).toBe(false);
  });

  it('controlled: stays open until isExpanded follows', async () => {
    const onExpandedChange = vi.fn();
    const root = await renderReact(
      <ModalWideNavigationRail
        aria-label="Main"
        items={ITEMS}
        isExpanded
        onExpandedChange={onExpandedChange}
        dialogLabel="Menu"
      />,
    );
    const modal = root.firstElementChild!;
    expect(modal.getAttribute('aria-label')).toBe('Menu');
    await act(async () => {
      modal.querySelector<HTMLElement>('.m3e-modal-wide-navigation-rail__scrim')!.click();
      await Promise.resolve();
    });
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(modal.hasAttribute('data-open')).toBe(true);
    expect(
      modal.querySelector('nav')!.classList.contains('m3e-wide-navigation-rail--expanded'),
    ).toBe(true);
  });
});
