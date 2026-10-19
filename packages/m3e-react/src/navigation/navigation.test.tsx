/* eslint-disable @typescript-eslint/no-deprecated -- the D4 legacy components are tested too */
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderReact } from '../test/parity.js';
import {
  type NavigationDestination,
  NavigationBar,
  NavigationRail,
  ShortNavigationBar,
  WideNavigationRail,
} from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const press = async (el: Element) => {
  await act(async () => {
    const init = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse' };
    el.dispatchEvent(new PointerEvent('pointerdown', init));
    el.dispatchEvent(new PointerEvent('pointerup', init));
    (el as HTMLElement).click();
    await Promise.resolve();
  });
};

const ITEMS: NavigationDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

const current = (root: Element) =>
  [...root.querySelectorAll('[aria-current]')].map(
    (el) => el.querySelector('.m3e-navigation-item__label')?.textContent,
  );

describe('navigation item contract', () => {
  it('renders the m3e-css DOM documented in navigation-item.css', async () => {
    const nav = (
      await renderReact(
        <ShortNavigationBar
          aria-label="Main"
          items={[{ key: 'home', icon: 'home', label: 'Home', href: '/' }]}
          selectedKey="home"
        />,
      )
    ).firstElementChild!;
    const template = document.createElement('template');
    template.innerHTML = [
      '<nav aria-label="Main" class="m3e-short-navigation-bar">',
      // React Aria adds its press marker and an explicit tabindex; the rest is the CSS contract.
      '<a aria-current="page" class="m3e-navigation-item" data-react-aria-pressable="true" href="/" tabindex="0">',
      '<span class="m3e-navigation-item__content">',
      '<span aria-hidden="true" class="m3e-navigation-item__indicator"></span>',
      '<span aria-hidden="true" class="m3e-navigation-item__state" data-ripple=""></span>',
      '<span aria-hidden="true" class="m3e-icon m3e-navigation-item__icon">home</span>',
      '<span class="m3e-navigation-item__label">Home</span>',
      '</span></a></nav>',
    ].join('');
    expect(canonical(nav)).toBe(canonical(template.content.firstElementChild!));
  });

  it('marks exactly one item aria-current and moves it on press (uncontrolled)', async () => {
    const onSelectionChange = vi.fn();
    const root = await renderReact(
      <ShortNavigationBar
        aria-label="Main"
        items={ITEMS}
        defaultSelectedKey="home"
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(current(root)).toEqual(['Home']);
    await press(root.querySelectorAll('button')[1]!);
    expect(onSelectionChange).toHaveBeenCalledWith('search');
    expect(current(root)).toEqual(['Search']);
  });

  it('follows selectedKey when controlled', async () => {
    const onSelectionChange = vi.fn();
    const root = await renderReact(
      <ShortNavigationBar
        aria-label="Main"
        items={ITEMS}
        selectedKey="settings"
        onSelectionChange={onSelectionChange}
      />,
    );
    await press(root.querySelectorAll('button')[0]!);
    expect(onSelectionChange).toHaveBeenCalledWith('home');
    expect(current(root)).toEqual(['Settings']);
  });

  it('drives the ripple on the indicator pill', async () => {
    const root = await renderReact(<ShortNavigationBar aria-label="Main" items={ITEMS} />);
    const item = root.querySelector('button')!;
    const state = item.querySelector('.m3e-navigation-item__state')!;
    await act(async () => {
      item.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
        }),
      );
      await Promise.resolve();
    });
    expect(state.hasAttribute('data-pressed')).toBe(true);
    expect((state as HTMLElement).style.getPropertyValue('--_m3e-ripple-radius')).not.toBe('');
  });

  it('disables items and hides labels on request', async () => {
    const root = await renderReact(
      <WideNavigationRail
        aria-label="Main"
        items={[
          { key: 'a', icon: 'inbox', label: 'Inbox', isDisabled: true },
          { key: 'b', icon: 'star', label: 'Starred', isLabelHidden: true, href: '/starred' },
        ]}
      />,
    );
    const [disabled, iconOnly] = [...root.querySelectorAll('.m3e-navigation-item')];
    expect(disabled!.getAttribute('aria-disabled')).toBe('true');
    expect(iconOnly!.getAttribute('aria-label')).toBe('Starred');
    expect(iconOnly!.querySelector('.m3e-navigation-item__label')).toBeNull();
  });
});

describe('badges (Compose BadgedBox in the item icon; owner decisions M9 #6, #7, #30)', () => {
  const name = (el: Element) =>
    [...el.querySelectorAll('.m3e-navigation-item__label, .m3e-badge__label')]
      .map((n) => n.textContent)
      .join(' ');

  it('renders the label, then the icon in a badged box with the badge contract', async () => {
    const nav = (
      await renderReact(
        <ShortNavigationBar
          aria-label="Main"
          items={[{ key: 'i', icon: 'inbox', label: 'Inbox', badge: 8 }]}
        />,
      )
    ).firstElementChild!;
    const template = document.createElement('template');
    template.innerHTML = [
      '<nav aria-label="Main" class="m3e-short-navigation-bar">',
      '<button class="m3e-navigation-item" data-react-aria-pressable="true" tabindex="0" type="button">',
      '<span class="m3e-navigation-item__content">',
      '<span aria-hidden="true" class="m3e-navigation-item__indicator"></span>',
      '<span aria-hidden="true" class="m3e-navigation-item__state" data-ripple=""></span>',
      '<span class="m3e-navigation-item__label">Inbox</span>',
      '<span class="m3e-badged-box">',
      '<span aria-hidden="true" class="m3e-icon m3e-navigation-item__icon">inbox</span>',
      '<span class="m3e-badge m3e-badge--large">',
      '<span aria-hidden="true" class="m3e-badge__text">8</span>',
      '<span class="m3e-badge__label">8</span>',
      '</span></span></span></button></nav>',
    ].join('');
    expect(canonical(nav)).toBe(canonical(template.content.firstElementChild!));
  });

  it('dot, 999+, text and custom labels; the name reads the badge after the label', async () => {
    const root = await renderReact(
      <WideNavigationRail
        aria-label="Main"
        items={[
          { key: 'a', icon: 'chat', label: 'Chat', badge: true },
          { key: 'b', icon: 'inbox', label: 'Inbox', badge: 1200 },
          { key: 'c', icon: 'mail', label: 'Mail', badge: '1000', badgeLabel: '1000 unread' },
          { key: 'd', icon: 'star', label: 'Starred', badge: 'New' },
          { key: 'e', icon: 'home', label: 'Home', badge: '', badgeLabel: '' },
          { key: 'f', icon: 'search', label: 'Search', badge: false },
        ]}
      />,
    );
    const [chat, inbox, mail, starred, home, search] = [
      ...root.querySelectorAll('.m3e-navigation-item'),
    ];
    expect(chat!.querySelector('.m3e-badge')!.className).toBe('m3e-badge');
    expect(chat!.querySelector('.m3e-badge__text')).toBeNull();
    expect(name(chat!)).toBe('Chat New notification');
    expect(inbox!.querySelector('.m3e-badge__text')!.textContent).toBe('999+');
    expect(name(inbox!)).toBe('Inbox 999+');
    expect(name(mail!)).toBe('Mail 1000 unread');
    expect(mail!.querySelector('.m3e-badge__text')!.textContent).toBe('999+');
    expect(name(starred!)).toBe('Starred New');
    expect(home!.querySelector('.m3e-badge')!.childElementCount).toBe(0);
    expect(name(home!)).toBe('Home');
    expect(search!.querySelector('.m3e-badged-box')).toBeNull();
    expect(
      search!.querySelector('.m3e-navigation-item__content > .m3e-navigation-item__icon'),
    ).not.toBeNull();
  });

  it('an icon-only item carries the badge text in its aria-label', async () => {
    const root = await renderReact(
      <ShortNavigationBar
        aria-label="Main"
        items={[{ key: 'i', icon: 'inbox', label: 'Inbox', isLabelHidden: true, badge: 3 }]}
      />,
    );
    const item = root.querySelector('.m3e-navigation-item')!;
    expect(item.getAttribute('aria-label')).toBe('Inbox 3');
    expect(item.querySelector('.m3e-badge__label')).toBeNull();
    expect(item.querySelector('.m3e-badge__text')!.textContent).toBe('3');
  });
});

describe('containers', () => {
  it('ShortNavigationBar horizontal layout', async () => {
    const nav = (
      await renderReact(<ShortNavigationBar aria-label="Main" items={ITEMS} layout="horizontal" />)
    ).firstElementChild!;
    expect(nav.className).toBe('m3e-short-navigation-bar m3e-short-navigation-bar--horizontal');
  });

  it('WideNavigationRail: header slot and expanded state', async () => {
    const nav = (
      await renderReact(
        <WideNavigationRail
          aria-label="Main"
          items={ITEMS}
          isExpanded
          header={<span>Menu</span>}
        />,
      )
    ).firstElementChild!;
    expect(nav.className).toBe('m3e-wide-navigation-rail m3e-wide-navigation-rail--expanded');
    expect(nav.firstElementChild!.className).toBe('m3e-wide-navigation-rail__header');
    expect(nav.querySelectorAll('.m3e-navigation-item')).toHaveLength(3);
  });

  it('legacy NavigationBar / NavigationRail warn once each (D4)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const root = await renderReact(
      <>
        <NavigationBar aria-label="Bar" items={ITEMS} defaultSelectedKey="home" />
        <NavigationBar aria-label="Bar 2" items={ITEMS} />
        <NavigationRail aria-label="Rail" items={ITEMS} header={<span>FAB</span>} />
      </>,
    );
    expect(root.querySelector('.m3e-navigation-bar')).not.toBeNull();
    expect(
      root.querySelector('.m3e-navigation-rail > .m3e-navigation-rail__header'),
    ).not.toBeNull();
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.filter((m) => m.includes('<NavigationBar>'))).toHaveLength(1);
    expect(messages.filter((m) => m.includes('<NavigationRail>'))).toHaveLength(1);
    expect(messages[0]).toContain('Use <ShortNavigationBar>');
  });

  // After the warn-once test: the warnings fire once per page.
  it('the legacy bar and rail take the same badge (Compose NavigationBarItem icon slot)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const root = await renderReact(
      <>
        <NavigationBar
          aria-label="Bar"
          items={[{ key: 'a', icon: 'inbox', label: 'Inbox', badge: 2 }]}
        />
        <NavigationRail
          aria-label="Rail"
          items={[{ key: 'a', icon: 'inbox', label: 'Inbox', badge: true }]}
        />
      </>,
    );
    expect(root.querySelectorAll('.m3e-navigation-item .m3e-badged-box > .m3e-badge')).toHaveLength(
      2,
    );
  });
});
