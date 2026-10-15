import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './index.js';
import type { M3eMenu, M3eMenuItem } from './menu.js';

// happy-dom has no layout or motion tokens: springs settle on the first frame, positions use the
// stubbed sizes below.
let frames: FrameRequestCallback[] = [];
const flushFrames = () => {
  for (let i = 0; i < 10 && frames.length > 0; i++) {
    const run = frames;
    frames = [];
    for (const cb of run) cb(performance.now() + 10_000);
  }
};
const settle = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function setup(html: string) {
  document.body.innerHTML = `<button id="trigger">More</button>${html}`;
  await settle();
  const trigger = document.getElementById('trigger') as HTMLButtonElement;
  const host = document.querySelector<M3eMenu>('m3e-menu')!;
  const menu = host.menuElement!;
  const items = () => [...menu.querySelectorAll<HTMLElement>('.m3e-menu__item')];
  const key = (k: string, target: Element = document.activeElement ?? menu) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  };
  return { trigger, host, menu, items, key };
}

const BASIC = `
  <m3e-menu anchor="trigger">
    <m3e-menu-item value="edit" icon="edit" supporting-text="Edit mode" trailing-text="⌘E">Edit</m3e-menu-item>
    <m3e-menu-item value="share">Share</m3e-menu-item>
    <m3e-menu-item value="off" disabled>Disabled</m3e-menu-item>
    <m3e-menu-item value="settings">Settings</m3e-menu-item>
  </m3e-menu>`;

describe('<m3e-menu> contract', () => {
  it('renders the .m3e-menu popover from its item children', async () => {
    const { menu, items, trigger } = await setup(BASIC);
    expect(menu.className).toBe('m3e-menu');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('popover')).toBe('manual');
    expect(menu.getAttribute('aria-labelledby')).toBe(trigger.id);
    const [edit, , off] = items();
    expect(items()).toHaveLength(4);
    expect(edit!.getAttribute('role')).toBe('menuitem');
    expect(edit!.querySelector('.m3e-menu__item-leading .m3e-icon')!.textContent).toBe('edit');
    expect(edit!.querySelector('.m3e-menu__item-label')!.textContent).toBe('Edit');
    const described = edit!.getAttribute('aria-describedby')!.split(' ');
    expect(described.map((id) => document.getElementById(id)!.textContent)).toEqual([
      'Edit mode',
      '⌘E',
    ]);
    expect(off!.getAttribute('aria-disabled')).toBe('true');
    expect(off!.hasAttribute('tabindex')).toBe(false);
    expect(edit!.hasAttribute('data-ripple')).toBe(true);
  });

  it('groups, variants, checkable and selectable items', async () => {
    const { menu, items } = await setup(`
      <m3e-menu anchor="trigger" variant="vibrant">
        <m3e-menu-group label="Style" divider>
          <m3e-menu-item type="checkbox" checked-icon="check">Bold</m3e-menu-item>
          <m3e-menu-item type="checkbox" icon="format_italic" checked-icon="check" checked>Italic</m3e-menu-item>
        </m3e-menu-group>
        <m3e-menu-group aria-label="Align">
          <m3e-menu-item type="radio" checked>Left</m3e-menu-item>
          <m3e-menu-item type="radio">Right</m3e-menu-item>
        </m3e-menu-group>
      </m3e-menu>`);
    expect(menu.className).toBe('m3e-menu m3e-menu--vibrant');
    const groups = menu.querySelectorAll('.m3e-menu__group');
    expect(groups).toHaveLength(2);
    const label = groups[0]!.querySelector('.m3e-menu__label')!;
    expect(groups[0]!.getAttribute('aria-labelledby')).toBe(label.id);
    expect(groups[0]!.querySelector('.m3e-menu__divider')!.getAttribute('role')).toBe('separator');
    expect(groups[1]!.getAttribute('aria-label')).toBe('Align');
    const [bold, italic, left, right] = items();
    expect(bold!.getAttribute('role')).toBe('menuitemcheckbox');
    expect(bold!.getAttribute('aria-checked')).toBe('false');
    expect(bold!.querySelector('.m3e-menu__item-leading--toggle .m3e-icon')!.textContent).toBe(
      'check',
    );
    // With both icons, the checked icon replaces the leading one.
    expect(italic!.querySelector('.m3e-icon')!.textContent).toBe('check');
    expect(left!.getAttribute('role')).toBe('menuitemradio');
    expect(left!.getAttribute('aria-checked')).toBe('true');
    expect(right!.getAttribute('aria-checked')).toBe('false');
  });
});

describe('<m3e-menu> behavior', () => {
  it('the anchor toggles the menu and reflects aria-expanded / aria-controls', async () => {
    const { host, menu, trigger } = await setup(BASIC);
    const changes: boolean[] = [];
    host.addEventListener('open-change', (e) =>
      changes.push((e as CustomEvent<{ open: boolean }>).detail.open),
    );
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await settle();
    expect(host.open).toBe(true);
    expect(host.hasAttribute('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(menu.hasAttribute('data-driven')).toBe(true);
    // A pointer open focuses the menu itself.
    expect(document.activeElement).toBe(menu);
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await settle();
    flushFrames();
    expect(host.open).toBe(false);
    expect(menu.hasAttribute('data-driven')).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  it('APG keys: ArrowDown opens on the first item, arrows wrap and skip disabled items', async () => {
    const { trigger, items, key } = await setup(BASIC);
    trigger.focus();
    key('ArrowDown', trigger);
    await settle();
    const [edit, share, , settings] = items();
    expect(document.activeElement).toBe(edit);
    expect(edit!.tabIndex).toBe(0);
    key('ArrowDown');
    expect(document.activeElement).toBe(share);
    key('ArrowDown');
    expect(document.activeElement).toBe(settings);
    key('ArrowDown');
    expect(document.activeElement).toBe(edit);
    key('ArrowUp');
    expect(document.activeElement).toBe(settings);
    key('Home');
    expect(document.activeElement).toBe(edit);
    key('End');
    expect(document.activeElement).toBe(settings);
  });

  it('ArrowUp on the trigger opens on the last item', async () => {
    const { trigger, items, key } = await setup(BASIC);
    key('ArrowUp', trigger);
    await settle();
    expect(document.activeElement).toBe(items()[3]);
  });

  it('typeahead focuses the next item whose label starts with the typed text', async () => {
    const { trigger, items, key } = await setup(BASIC);
    key('ArrowDown', trigger);
    await settle();
    key('s');
    expect(document.activeElement).toBe(items()[1]);
    key('e');
    // "se" → Settings (searching on from the focused item).
    expect(document.activeElement).toBe(items()[3]);
  });

  it('Enter activates an item, closes the menu and returns focus to the trigger', async () => {
    const { host, trigger, items, key } = await setup(BASIC);
    const actions: unknown[] = [];
    host.addEventListener('action', (e) => actions.push((e as CustomEvent).detail));
    key('ArrowDown', trigger);
    await settle();
    key('ArrowDown');
    key('Enter');
    await settle();
    expect(actions).toEqual([{ value: 'share', checked: null }]);
    expect(host.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(items()).toHaveLength(4);
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const { host, trigger, key } = await setup(BASIC);
    key('ArrowDown', trigger);
    await settle();
    key('Escape');
    await settle();
    expect(host.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('checkable items toggle aria-checked; Space keeps the menu open, a click too', async () => {
    const { host, trigger, items, key } = await setup(`
      <m3e-menu anchor="trigger">
        <m3e-menu-item type="checkbox" value="bold">Bold</m3e-menu-item>
        <m3e-menu-item type="checkbox" value="italic">Italic</m3e-menu-item>
      </m3e-menu>`);
    const actions: unknown[] = [];
    host.addEventListener('action', (e) => actions.push((e as CustomEvent).detail));
    key('ArrowDown', trigger);
    await settle();
    key(' ');
    await settle();
    expect(items()[0]!.getAttribute('aria-checked')).toBe('true');
    expect(host.querySelector<M3eMenuItem>('m3e-menu-item')!.checked).toBe(true);
    expect(host.open).toBe(true);
    expect(document.activeElement).toBe(items()[0]);
    items()[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await settle();
    expect(items()[1]!.getAttribute('aria-checked')).toBe('true');
    expect(host.open).toBe(true);
    key(' ');
    await settle();
    expect(items()[0]!.getAttribute('aria-checked')).toBe('false');
    expect(actions).toEqual([
      { value: 'bold', checked: true },
      { value: 'italic', checked: true },
      { value: 'bold', checked: false },
    ]);
  });

  it('radio items select one per group and close on click', async () => {
    const { host, trigger, items } = await setup(`
      <m3e-menu anchor="trigger">
        <m3e-menu-item type="radio" checked>Left</m3e-menu-item>
        <m3e-menu-item type="radio">Right</m3e-menu-item>
      </m3e-menu>`);
    trigger.click();
    await settle();
    items()[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await settle();
    expect(items().map((i) => i.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    expect(host.open).toBe(false);
  });

  it('a pointer down outside the menu and its trigger closes it (light dismiss)', async () => {
    const { host, trigger } = await setup(`${BASIC}<p id="outside">x</p>`);
    trigger.click();
    await settle();
    document
      .getElementById('outside')!
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await settle();
    expect(host.open).toBe(false);
  });

  it('submenus: ArrowRight opens on the first item, ArrowLeft closes back to the item', async () => {
    const { host, trigger, items, key } = await setup(`
      <m3e-menu anchor="trigger">
        <m3e-menu-item value="cut">Cut</m3e-menu-item>
        <m3e-menu-item submenu="align" trailing-icon="arrow_right">Align</m3e-menu-item>
      </m3e-menu>
      <m3e-menu id="align">
        <m3e-menu-item value="left">Left</m3e-menu-item>
        <m3e-menu-item value="right">Right</m3e-menu-item>
      </m3e-menu>`);
    const sub = document.getElementById('align') as M3eMenu;
    key('ArrowDown', trigger);
    await settle();
    key('ArrowDown');
    const alignItem = items()[1]!;
    expect(alignItem.getAttribute('aria-haspopup')).toBe('menu');
    expect(alignItem.getAttribute('aria-expanded')).toBe('false');
    key('ArrowRight');
    await settle();
    expect(sub.open).toBe(true);
    const subMenu = sub.menuElement!;
    expect(document.activeElement).toBe(subMenu.querySelector('.m3e-menu__item'));
    expect(subMenu.getAttribute('aria-labelledby')).toBe(alignItem.id);
    expect(alignItem.getAttribute('aria-expanded')).toBe('true');
    expect(alignItem.getAttribute('aria-controls')).toBe(subMenu.id);
    key('ArrowLeft');
    await settle();
    expect(sub.open).toBe(false);
    expect(document.activeElement).toBe(alignItem);
    // Activating a submenu item closes the whole chain.
    key('ArrowRight');
    await settle();
    key('Enter');
    await settle();
    expect(sub.open).toBe(false);
    expect(host.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
