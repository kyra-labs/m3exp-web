import '@kyralabs/m3e-elements/fab-menu.js';
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { FabMenu, type FabMenuItem, fabMenuClassName } from './FabMenu.js';

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

const key = async (target: Element, k: string, shiftKey = false) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true }));
    await Promise.resolve();
  });
};

const ITEMS: FabMenuItem[] = [
  { icon: 'mail', label: 'Email' },
  { icon: 'chat', label: 'Message' },
  { label: 'Copy link' },
];

const parts = (container: HTMLElement) => ({
  root: container.querySelector<HTMLElement>('.m3e-fab-menu')!,
  toggle: container.querySelector<HTMLButtonElement>('.m3e-fab-menu__toggle')!,
  menu: container.querySelector<HTMLElement>('.m3e-fab-menu__items')!,
  items: [...container.querySelectorAll<HTMLButtonElement>('.m3e-fab-menu__item')],
});

describe('<FabMenu>', () => {
  it('renders the m3e-css contract', async () => {
    const { root, toggle, menu, items } = parts(
      await renderReact(<FabMenu aria-label="Share" icon="share" items={ITEMS} />),
    );
    expect(root.className).toBe('m3e-fab-menu');
    expect(toggle.className).toBe('m3e-fab m3e-fab-menu__toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(menu.id);
    expect(menu.getAttribute('aria-labelledby')).toBe(toggle.id);
    expect([...toggle.children].map((c) => c.textContent)).toEqual(['share', 'close']);
    expect(items.map((i) => i.getAttribute('role'))).toEqual(['menuitem', 'menuitem', 'menuitem']);
  });

  it('fabMenuClassName maps size, color, align and open', () => {
    expect(
      fabMenuClassName({ open: true, size: 'medium', color: 'secondary', align: 'center' }, 'x'),
    ).toBe(
      'm3e-fab-menu m3e-fab-menu--open m3e-fab-menu--size-medium m3e-fab-menu--secondary m3e-fab-menu--align-center x',
    );
  });

  it('the toggle opens it (uncontrolled), calls onOpenChange and focuses the top item', async () => {
    const onOpenChange = vi.fn();
    const container = await renderReact(
      <FabMenu aria-label="Share" items={ITEMS} onOpenChange={onOpenChange} />,
    );
    const { root, toggle, items } = parts(container);
    await press(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(root.classList.contains('m3e-fab-menu--open')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(items[0]);
  });

  it('controlled: follows `open`; keys move, Tab cycles, Escape closes and refocuses', async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return <FabMenu aria-label="Share" items={ITEMS} open={open} onOpenChange={setOpen} />;
    }
    const { root, toggle, items } = parts(await renderReact(<Controlled />));
    await press(toggle);
    expect(root.classList.contains('m3e-fab-menu--open')).toBe(true);
    await key(items[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    await key(items[1]!, 'End');
    expect(document.activeElement).toBe(items[2]);
    await key(items[2]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
    await key(items[0]!, 'Tab');
    expect(document.activeElement).toBe(toggle);
    await key(toggle, 'Tab', true);
    expect(document.activeElement).toBe(items[2]);
    await key(items[2]!, 'Escape');
    expect(root.classList.contains('m3e-fab-menu--open')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('pressing an item calls its onPress, closes the menu and refocuses the toggle', async () => {
    const onPress = vi.fn();
    const items: FabMenuItem[] = [
      { icon: 'mail', label: 'Email', onPress },
      { icon: 'chat', label: 'Message' },
    ];
    const container = await renderReact(<FabMenu aria-label="Share" items={items} defaultOpen />);
    const { root, toggle, items: buttons } = parts(container);
    await press(buttons[0]!);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(root.classList.contains('m3e-fab-menu--open')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('warns once without a label and once for fewer than 2 or more than 6 items', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await renderReact(<FabMenu items={[{ label: 'Only' }]} />);
    await renderReact(<FabMenu items={[{ label: 'Only' }]} />);
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.filter((m) => m.includes('aria-label'))).toHaveLength(1);
    expect(messages.filter((m) => m.includes('2–6 items'))).toHaveLength(1);
  });
});

/**
 * Ids differ between React (useId) and the element (a counter), so they are numbered by first
 * appearance; React Aria's runtime marker (data-react-aria-pressable) is not part of the contract.
 */
function normalizeIds(html: string): string {
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!);
  return ids
    .reduce((out, id, i) => out.split(`"${id}"`).join(`"id-${String(i)}"`), html)
    .replaceAll(' data-react-aria-pressable="true"', '');
}

describe('<FabMenu> ⇔ <m3e-fab-menu> DOM parity', () => {
  it.each([
    [
      'closed, defaults',
      <FabMenu aria-label="Share" icon="share" items={ITEMS} />,
      `<m3e-fab-menu label="Share" icon="share">
        <m3e-fab-menu-item icon="mail">Email</m3e-fab-menu-item>
        <m3e-fab-menu-item icon="chat">Message</m3e-fab-menu-item>
        <m3e-fab-menu-item>Copy link</m3e-fab-menu-item>
      </m3e-fab-menu>`,
    ],
    [
      'open, medium, tertiary, start',
      <FabMenu
        aria-label="Create"
        size="medium"
        color="tertiary"
        align="start"
        defaultOpen
        items={ITEMS.slice(0, 2)}
      />,
      `<m3e-fab-menu label="Create" size="medium" color="tertiary" align="start" open>
        <m3e-fab-menu-item icon="mail">Email</m3e-fab-menu-item>
        <m3e-fab-menu-item icon="chat">Message</m3e-fab-menu-item>
      </m3e-fab-menu>`,
    ],
  ])('%s', async (_, react, html) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fromReact = canonical((await renderReact(react)).querySelector('.m3e-fab-menu')!);
    const host = await renderElement(html);
    const fromElement = canonical(host.querySelector('.m3e-fab-menu')!);
    expect(normalizeIds(fromElement)).toBe(normalizeIds(fromReact));
  });
});
